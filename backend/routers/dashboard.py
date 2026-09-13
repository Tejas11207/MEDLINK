from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func
from sqlalchemy.future import select
from models import Incident, Ambulance, Hospital
from database import get_db

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

@router.get("/stats")
async def get_stats(db: AsyncSession = Depends(get_db)):
    # Active Emergencies
    active_incidents = await db.execute(select(func.count(Incident.id)).where(Incident.status != "RESOLVED"))
    
    # Available Ambulances
    available_ambulances = await db.execute(select(func.count(Ambulance.id)).where(Ambulance.status == "AVAILABLE"))
    
    # ICU Beds
    hosp_res = await db.execute(select(func.sum(Hospital.available_icu)))
    icu_beds = hosp_res.scalar() or 0
    
    # Online Hospitals
    online_hospitals = await db.execute(select(func.count(Hospital.id)).where(Hospital.status == "ONLINE"))
    
    return {
        "active_emergencies": active_incidents.scalar(),
        "available_ambulances": available_ambulances.scalar(),
        "icu_beds_available": icu_beds,
        "hospitals_online": online_hospitals.scalar(),
        "average_response_time": "4.2 min" # Mocked for MVP
    }
    
@router.get("/live")
async def get_live_data(db: AsyncSession = Depends(get_db)):
    incidents = await db.execute(select(Incident).where(Incident.status != "RESOLVED"))
    ambulances = await db.execute(select(Ambulance))
    hospitals = await db.execute(select(Hospital))
    
    return {
        "incidents": incidents.scalars().all(),
        "ambulances": ambulances.scalars().all(),
        "hospitals": hospitals.scalars().all()
    }
