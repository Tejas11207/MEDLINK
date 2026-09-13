from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List, Optional
import random

from database import get_db
from models import EmergencyCase, Hospital, HospitalResponse, AuditLog
from schemas import EmergencyCaseCreate, EmergencyCaseOut, EmergencyCaseUpdateStatus, SelectHospitalRequest, DecisionEngineResult
from services.dispatch import evaluate_decision_engine, calculate_haversine_distance, estimate_eta_minutes

router = APIRouter(prefix="/api/emergency", tags=["emergency"])

@router.post("/new", response_model=EmergencyCaseOut)
async def create_emergency_case(
    case_in: EmergencyCaseCreate,
    user_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db)
):
    # Generate unique Case Code e.g. ML-1042
    case_number = random.randint(1000, 9999)
    case_code = f"ML-{case_number}"
    
    new_case = EmergencyCase(
        case_code=case_code,
        user_id=user_id,
        abha_id=case_in.abha_id,
        transport_mode=case_in.transport_mode.upper(),
        patient_name=case_in.patient_name,
        patient_age=case_in.patient_age,
        condition=case_in.condition,
        priority=case_in.priority.upper(),
        requirements=case_in.requirements,
        vitals=case_in.vitals,
        latitude=case_in.latitude,
        longitude=case_in.longitude,
        address=case_in.address,
        ambulance_details=case_in.ambulance_details,
        status="SEARCHING",
        description=case_in.description
    )
    db.add(new_case)
    await db.flush()
    
    # 1. Discover nearby verified hospitals within ~25km
    hosp_query = await db.execute(
        select(Hospital).where(Hospital.verified == True)
    )
    hospitals = hosp_query.scalars().all()
    
    # 2. Broadcast to hospitals (create HospitalResponse records)
    for hosp in hospitals:
        dist = calculate_haversine_distance(new_case.latitude, new_case.longitude, hosp.latitude, hosp.longitude)
        eta = estimate_eta_minutes(dist)
        
        resp = HospitalResponse(
            case_id=new_case.id,
            hospital_id=hosp.id,
            response="PENDING",
            distance_km=dist,
            eta=eta
        )
        db.add(resp)
        
    # 3. Create Audit Log
    audit = AuditLog(
        case_id=new_case.id,
        performed_by=case_in.patient_name,
        action="EMERGENCY_CREATED",
        details=f"Case {case_code} created with transport mode {new_case.transport_mode} and priority {new_case.priority}. Broadcast to {len(hospitals)} verified hospitals."
    )
    db.add(audit)
    
    # Transition status to AWAITING_RESPONSE
    new_case.status = "AWAITING_RESPONSE"
    await db.commit()
    
    # Re-fetch with loaded responses
    result = await db.execute(
        select(EmergencyCase)
        .options(selectinload(EmergencyCase.responses).selectinload(HospitalResponse.hospital), selectinload(EmergencyCase.selected_hospital))
        .where(EmergencyCase.id == new_case.id)
    )
    fetched_case = result.scalar_one()
    return fetched_case

@router.get("/active/current", response_model=Optional[EmergencyCaseOut])
async def get_active_emergency_case(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(EmergencyCase)
        .options(selectinload(EmergencyCase.responses).selectinload(HospitalResponse.hospital), selectinload(EmergencyCase.selected_hospital))
        .where(EmergencyCase.status.in_(["SEARCHING", "AWAITING_RESPONSE", "ACCEPTED", "HOSPITAL_SELECTED", "EN_ROUTE"]))
        .order_by(EmergencyCase.created_at.desc())
    )
    case = result.scalars().first()
    return case

@router.get("/history/all", response_model=List[EmergencyCaseOut])
async def get_emergency_history(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(EmergencyCase)
        .options(selectinload(EmergencyCase.responses).selectinload(HospitalResponse.hospital), selectinload(EmergencyCase.selected_hospital))
        .order_by(EmergencyCase.created_at.desc())
        .limit(50)
    )
    cases = result.scalars().all()
    return cases

@router.get("/{id}", response_model=EmergencyCaseOut)
async def get_emergency_case(id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(EmergencyCase)
        .options(selectinload(EmergencyCase.responses).selectinload(HospitalResponse.hospital), selectinload(EmergencyCase.selected_hospital))
        .where(EmergencyCase.id == id)
    )
    case = result.scalars().first()
    if not case:
        raise HTTPException(status_code=404, detail="Emergency case not found")
    return case

@router.get("/{id}/recommendation", response_model=DecisionEngineResult)
async def get_case_recommendation(id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(EmergencyCase).where(EmergencyCase.id == id)
    )
    case = result.scalars().first()
    if not case:
        raise HTTPException(status_code=404, detail="Emergency case not found")
        
    engine_result = await evaluate_decision_engine(db, case)
    return engine_result

@router.post("/{id}/select-hospital", response_model=EmergencyCaseOut)
async def select_hospital(
    id: int,
    req: SelectHospitalRequest,
    db: AsyncSession = Depends(get_db)
):
    case_query = await db.execute(
        select(EmergencyCase)
        .options(selectinload(EmergencyCase.responses), selectinload(EmergencyCase.selected_hospital))
        .where(EmergencyCase.id == id)
    )
    case = case_query.scalars().first()
    if not case:
        raise HTTPException(status_code=404, detail="Emergency case not found")
        
    hosp_query = await db.execute(
        select(Hospital).where(Hospital.id == req.hospital_id)
    )
    hospital = hosp_query.scalars().first()
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital not found")
        
    # Calculate ETA to selected hospital
    dist = calculate_haversine_distance(case.latitude, case.longitude, hospital.latitude, hospital.longitude)
    eta = estimate_eta_minutes(dist)
    
    # Update case
    case.selected_hospital_id = hospital.id
    case.selected_hospital_eta = eta
    case.status = "HOSPITAL_SELECTED"
    
    # Mark response as SELECTED
    for r in case.responses:
        if r.hospital_id == hospital.id:
            r.response = "SELECTED"
            
    # Add Audit Log
    audit = AuditLog(
        case_id=case.id,
        performed_by="USER",
        action="HOSPITAL_SELECTED",
        details=f"Hospital '{hospital.name}' selected for case {case.case_code}. ETA: {eta} mins ({dist} km)."
    )
    db.add(audit)
    
    await db.commit()
    
    result = await db.execute(
        select(EmergencyCase)
        .options(selectinload(EmergencyCase.responses).selectinload(HospitalResponse.hospital), selectinload(EmergencyCase.selected_hospital))
        .where(EmergencyCase.id == id)
    )
    return result.scalar_one()

@router.post("/{id}/status", response_model=EmergencyCaseOut)
async def update_case_status(
    id: int,
    status_in: EmergencyCaseUpdateStatus,
    db: AsyncSession = Depends(get_db)
):
    case_query = await db.execute(
        select(EmergencyCase)
        .options(selectinload(EmergencyCase.responses), selectinload(EmergencyCase.selected_hospital))
        .where(EmergencyCase.id == id)
    )
    case = case_query.scalars().first()
    if not case:
        raise HTTPException(status_code=404, detail="Emergency case not found")
        
    case.status = status_in.status.upper()
    
    audit = AuditLog(
        case_id=case.id,
        performed_by="SYSTEM",
        action="STATUS_UPDATED",
        details=f"Case {case.case_code} status transitioned to {case.status}."
    )
    db.add(audit)
    await db.commit()
    
    result = await db.execute(
        select(EmergencyCase)
        .options(selectinload(EmergencyCase.responses).selectinload(HospitalResponse.hospital), selectinload(EmergencyCase.selected_hospital))
        .where(EmergencyCase.id == id)
    )
    return result.scalar_one()
