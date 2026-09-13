from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from models import PreArrivalAlert, Incident, PatientHealthProfile
from database import get_db
import datetime

router = APIRouter(prefix="/api/hospital/er", tags=["er"])

@router.get("/incoming")
async def get_incoming(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PreArrivalAlert).where(PreArrivalAlert.status.in_(["PENDING", "ACKNOWLEDGED", "PREPARED"])))
    alerts = result.scalars().all()
    
    response = []
    for alert in alerts:
        inc_res = await db.execute(select(Incident).where(Incident.id == alert.incident_id))
        inc = inc_res.scalar_one_or_none()
        
        prof = None
        if inc and inc.patient_id:
            p_res = await db.execute(select(PatientHealthProfile).where(PatientHealthProfile.patient_id == inc.patient_id))
            prof = p_res.scalar_one_or_none()
            
        response.append({
            "id": alert.id,
            "incident_id": alert.incident_id,
            "status": alert.status,
            "eta_minutes": alert.eta_minutes,
            "incident": inc,
            "patient_profile": prof
        })
    return response

@router.post("/{id}/acknowledge")
async def ack_incoming(id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PreArrivalAlert).where(PreArrivalAlert.id == id))
    alert = result.scalar_one_or_none()
    if alert:
        alert.status = "ACKNOWLEDGED"
        alert.acknowledged_at = datetime.datetime.utcnow()
        await db.commit()
    return {"status": "success"}
    
@router.post("/{id}/prepare")
async def prepare_incoming(id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PreArrivalAlert).where(PreArrivalAlert.id == id))
    alert = result.scalar_one_or_none()
    if alert:
        alert.status = "PREPARED"
        alert.prepared_at = datetime.datetime.utcnow()
        await db.commit()
    return {"status": "success"}

@router.post("/{id}/arrived")
async def arrive_incoming(id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PreArrivalAlert).where(PreArrivalAlert.id == id))
    alert = result.scalar_one_or_none()
    if alert:
        alert.status = "ARRIVED"
        alert.arrived_at = datetime.datetime.utcnow()
        
        inc_res = await db.execute(select(Incident).where(Incident.id == alert.incident_id))
        inc = inc_res.scalar_one_or_none()
        if inc:
            inc.status = "ARRIVED"
            
        await db.commit()
    return {"status": "success"}
