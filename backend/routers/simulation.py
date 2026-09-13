from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
import datetime
import random

from database import get_db
from models import EmergencyCase, Hospital, HospitalResponse, AuditLog
from schemas import EmergencyCaseOut, DecisionEngineResult
from services.dispatch import evaluate_decision_engine

router = APIRouter(prefix="/api/simulation", tags=["simulation"])

@router.post("/golden-path", response_model=EmergencyCaseOut)
async def trigger_golden_path_simulation(db: AsyncSession = Depends(get_db)):
    """
    Executes the exact MedLink Golden Path Demo Scenario (Sections 8 & 18 of Spec):
    1. Creates emergency case ML-1042 (Severe breathing difficulty, Emergency stabilization, High Priority, Self Transport).
    2. Identifies nearby hospitals: Apex Hospital, Fortis Escorts, SMS Hospital.
    3. Hospital A (Apex Hospital) -> REJECTED (Reason: Required capability/resource unavailable).
    4. Hospital B (Fortis Escorts) -> ACCEPTED (ETA 8 min).
    5. Hospital C (SMS Hospital) -> ACCEPTED (ETA 13 min).
    6. System marks case as ACCEPTED with Hospital B as fastest accepted feasible option.
    """
    # 1. Clean up or archive old ML-1042 if exists
    old_cases = await db.execute(select(EmergencyCase).where(EmergencyCase.case_code == "ML-1042"))
    for old in old_cases.scalars().all():
        await db.delete(old)
    await db.flush()
    
    # 2. Create the Golden Path Emergency Case
    jaipur_user_loc = (26.8500, 75.7950) # Near Tonk Road / Jawahar Circle
    golden_case = EmergencyCase(
        case_code="ML-1042",
        transport_mode="SELF_TRANSPORT",
        patient_name="Rajesh Sharma",
        patient_age=58,
        condition="Severe breathing difficulty",
        priority="HIGH",
        requirements="Emergency stabilization",
        vitals="Heart Rate: 112 bpm, SpO2: 89%, BP: 145/95",
        latitude=jaipur_user_loc[0],
        longitude=jaipur_user_loc[1],
        address="Malviya Nagar, Jaipur, Rajasthan",
        status="ACCEPTED",
        description="Patient with acute respiratory distress transported by personal vehicle."
    )
    db.add(golden_case)
    await db.flush()
    
    # 3. Fetch specific hospitals or top 3 Jaipur hospitals
    hosp_query = await db.execute(
        select(Hospital).where(Hospital.verified == True).order_by(Hospital.id.asc())
    )
    hospitals = hosp_query.scalars().all()
    
    if len(hospitals) < 3:
        raise HTTPException(status_code=500, detail="Not enough hospitals seeded in database. Please run seed.py.")
        
    hosp_map = {h.name.lower(): h for h in hospitals}
    
    # Identify Hospital A (Reject), Hospital B (Accept 8m), Hospital C (Accept 13m)
    # Default fallback to first three if names differ
    hosp_apex = next((h for h in hospitals if "apex" in h.name.lower()), hospitals[2])
    hosp_fortis = next((h for h in hospitals if "fortis" in h.name.lower()), hospitals[1])
    hosp_sms = next((h for h in hospitals if "sms" in h.name.lower()), hospitals[0])
    
    # Response A: REJECTED
    resp_a = HospitalResponse(
        case_id=golden_case.id,
        hospital_id=hosp_apex.id,
        response="REJECTED",
        rejection_reason="Required capability/resource unavailable — Emergency ICU at capacity",
        distance_km=2.4,
        eta=6.0,
        responded_at=datetime.datetime.utcnow() - datetime.timedelta(seconds=45)
    )
    db.add(resp_a)
    
    # Response B: ACCEPTED (ETA 8 min)
    resp_b = HospitalResponse(
        case_id=golden_case.id,
        hospital_id=hosp_fortis.id,
        response="ACCEPTED",
        rejection_reason=None,
        distance_km=3.8,
        eta=8.0,
        responded_at=datetime.datetime.utcnow() - datetime.timedelta(seconds=30)
    )
    db.add(resp_b)
    
    # Response C: ACCEPTED (ETA 13 min)
    resp_c = HospitalResponse(
        case_id=golden_case.id,
        hospital_id=hosp_sms.id,
        response="ACCEPTED",
        rejection_reason=None,
        distance_km=5.2,
        eta=13.0,
        responded_at=datetime.datetime.utcnow() - datetime.timedelta(seconds=20)
    )
    db.add(resp_c)
    
    # Any other hospitals: PENDING or ACCEPTED
    for h in hospitals:
        if h.id not in [hosp_apex.id, hosp_fortis.id, hosp_sms.id]:
            resp_other = HospitalResponse(
                case_id=golden_case.id,
                hospital_id=h.id,
                response="PENDING",
                distance_km=random.uniform(6.0, 15.0),
                eta=random.uniform(15.0, 30.0)
            )
            db.add(resp_other)
            
    # Audit log
    audit = AuditLog(
        case_id=golden_case.id,
        performed_by="DEMO_SIMULATOR",
        action="GOLDEN_PATH_SIMULATED",
        details="Simulated Golden Path scenario: Apex (REJECTED), Fortis (ACCEPTED 8m), SMS (ACCEPTED 13m). Ready for fastest-accepted hospital selection."
    )
    db.add(audit)
    
    await db.commit()
    
    result = await db.execute(
        select(EmergencyCase)
        .options(selectinload(EmergencyCase.responses).selectinload(HospitalResponse.hospital), selectinload(EmergencyCase.selected_hospital))
        .where(EmergencyCase.id == golden_case.id)
    )
    return result.scalar_one()

@router.post("/ambulance-demo", response_model=EmergencyCaseOut)
async def trigger_ambulance_simulation(db: AsyncSession = Depends(get_db)):
    """
    Executes the Ambulance Transport Mode demonstration with telemetry and vitals.
    """
    amb_case = EmergencyCase(
        case_code="ML-2099",
        transport_mode="AMBULANCE",
        patient_name="Anita Mehra",
        patient_age=45,
        condition="Acute Cardiac Episode",
        priority="CRITICAL",
        requirements="Cardiac ICU, Cath Lab Ready",
        vitals="Heart Rate: 135 bpm, SpO2: 92%, BP: 85/55, ECG: ST-Elevation",
        latitude=26.8920,
        longitude=75.8100,
        address="JLN Marg, Jaipur, Rajasthan",
        ambulance_details="ALS Unit RJ14-AMB-04 • Paramedic Team Lead: Dr. Verma • Defibrillator Onboard",
        status="ACCEPTED",
        description="Ambulance en route with ALS monitoring team."
    )
    db.add(amb_case)
    await db.flush()
    
    hosp_query = await db.execute(select(Hospital).where(Hospital.verified == True))
    hospitals = hosp_query.scalars().all()
    
    for i, h in enumerate(hospitals[:4]):
        resp_type = "ACCEPTED" if i in [0, 1] else ("REJECTED" if i == 2 else "PENDING")
        resp = HospitalResponse(
            case_id=amb_case.id,
            hospital_id=h.id,
            response=resp_type,
            rejection_reason="Cath Lab occupied" if resp_type == "REJECTED" else None,
            distance_km=round(2.5 + i * 1.8, 1),
            eta=round(5.0 + i * 4.0, 1),
            responded_at=datetime.datetime.utcnow()
        )
        db.add(resp)
        
    await db.commit()
    result = await db.execute(
        select(EmergencyCase)
        .options(selectinload(EmergencyCase.responses).selectinload(HospitalResponse.hospital), selectinload(EmergencyCase.selected_hospital))
        .where(EmergencyCase.id == amb_case.id)
    )
    return result.scalar_one()
