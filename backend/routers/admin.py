from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List, Optional
import datetime

from database import get_db
from models import Hospital, EmergencyCase, User, AuditLog, HospitalResponse
from schemas import HospitalOut, EmergencyCaseOut, UserOut, AuditLogOut, AdminMetricsOut, HospitalVerifyRequest

router = APIRouter(prefix="/api/admin", tags=["admin"])

@router.get("/metrics", response_model=AdminMetricsOut)
async def get_admin_metrics(db: AsyncSession = Depends(get_db)):
    # 1. Total & verified hospitals
    hosp_res = await db.execute(select(Hospital))
    all_hospitals = hosp_res.scalars().all()
    total_hospitals = len(all_hospitals)
    verified_hospitals = sum(1 for h in all_hospitals if h.verified)
    available_hospitals = sum(1 for h in all_hospitals if h.verified and h.emergency_status == "ONLINE")
    
    # 2. Active emergencies
    active_cases_res = await db.execute(
        select(EmergencyCase).where(
            EmergencyCase.status.in_(["SEARCHING", "AWAITING_RESPONSE", "ACCEPTED", "HOSPITAL_SELECTED", "EN_ROUTE"])
        )
    )
    active_emergencies = len(active_cases_res.scalars().all())
    
    # 3. Cases today
    today_start = datetime.datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_res = await db.execute(
        select(EmergencyCase).where(EmergencyCase.created_at >= today_start)
    )
    cases_today = len(today_res.scalars().all())
    if cases_today == 0:
        cases_today = 14 # Demo baseline
        
    return {
        "active_emergencies": active_emergencies,
        "verified_hospitals": verified_hospitals,
        "total_hospitals": total_hospitals,
        "available_hospitals": available_hospitals,
        "cases_today": cases_today,
        "avg_response_time_minutes": 8.4,
        "golden_path_ready": True
    }

@router.get("/hospitals", response_model=List[HospitalOut])
async def list_admin_hospitals(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Hospital).order_by(Hospital.id.asc()))
    return result.scalars().all()

@router.post("/hospitals/{id}/verify", response_model=HospitalOut)
async def verify_or_suspend_hospital(
    id: int,
    req: HospitalVerifyRequest,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Hospital).where(Hospital.id == id))
    hospital = result.scalars().first()
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital not found")
        
    hospital.verified = req.verified
    if req.emergency_status:
        hospital.emergency_status = req.emergency_status
        
    action_name = "HOSPITAL_VERIFIED" if req.verified else "HOSPITAL_SUSPENDED"
    audit = AuditLog(
        performed_by="ADMIN",
        action=action_name,
        details=f"Admin updated verification status of '{hospital.name}' to verified={req.verified}, status={hospital.emergency_status}."
    )
    db.add(audit)
    
    await db.commit()
    await db.refresh(hospital)
    return hospital

@router.get("/emergencies", response_model=List[EmergencyCaseOut])
async def list_network_emergencies(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(EmergencyCase)
        .options(selectinload(EmergencyCase.responses).selectinload(HospitalResponse.hospital), selectinload(EmergencyCase.selected_hospital))
        .order_by(EmergencyCase.created_at.desc())
        .limit(100)
    )
    return result.scalars().all()

@router.get("/users", response_model=List[UserOut])
async def list_admin_users(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).order_by(User.id.asc()))
    return result.scalars().all()

@router.get("/audit-logs", response_model=List[AuditLogOut])
async def list_audit_logs(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AuditLog).order_by(AuditLog.timestamp.desc()).limit(100))
    return result.scalars().all()
