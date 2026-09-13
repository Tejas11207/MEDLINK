from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from models import IncidentBroadcast, Hospital, Incident
from database import get_db
import math
from pydantic import BaseModel
import datetime

router = APIRouter(prefix="/api/incidents", tags=["broadcast"])

def haversine(lat1, lon1, lat2, lon2):
    R = 6371
    dLat = math.radians(lat2 - lat1)
    dLon = math.radians(lon2 - lon1)
    a = math.sin(dLat/2) * math.sin(dLat/2) + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dLon/2) * math.sin(dLon/2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return R * c

class BroadcastRequest(BaseModel):
    radius_km: float = 10.0

@router.post("/{incident_id}/broadcast")
async def broadcast_incident(incident_id: int, req: BroadcastRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Incident).where(Incident.id == incident_id))
    incident = result.scalar_one_or_none()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
        
    h_result = await db.execute(select(Hospital).where(Hospital.status == 'ONLINE'))
    hospitals = h_result.scalars().all()
    
    broadcasts = []
    for hosp in hospitals:
        dist = haversine(incident.latitude, incident.longitude, hosp.latitude, hosp.longitude)
        if dist <= req.radius_km:
            b = IncidentBroadcast(
                incident_id=incident.id,
                hospital_id=hosp.id,
                distance_km=dist,
                status="NOTIFIED"
            )
            db.add(b)
            broadcasts.append(b)
            
    await db.commit()
    return {"status": "success", "notified_hospitals": len(broadcasts)}

@router.get("/{incident_id}/broadcast-status")
async def get_broadcast_status(incident_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(IncidentBroadcast).where(IncidentBroadcast.incident_id == incident_id))
    broadcasts = result.scalars().all()
    return broadcasts
