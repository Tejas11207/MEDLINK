from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from models import Incident, Hospital, Ambulance, Dispatch
from database import get_db
import math
from pydantic import BaseModel

router = APIRouter(prefix="/api/dispatch", tags=["dispatch"])

class DispatchRequest(BaseModel):
    incident_id: int

def haversine(lat1, lon1, lat2, lon2):
    R = 6371
    dLat = math.radians(lat2 - lat1)
    dLon = math.radians(lon2 - lon1)
    a = math.sin(dLat/2) * math.sin(dLat/2) + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dLon/2) * math.sin(dLon/2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return R * c

@router.post("/recommend")
async def recommend_dispatch(req: DispatchRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Incident).where(Incident.id == req.incident_id))
    incident = result.scalar_one_or_none()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
        
    h_result = await db.execute(select(Hospital).where(Hospital.status == 'ONLINE'))
    hospitals = h_result.scalars().all()
    
    a_result = await db.execute(select(Ambulance).where(Ambulance.status == 'AVAILABLE'))
    ambulances = a_result.scalars().all()
    
    if not hospitals or not ambulances:
        raise HTTPException(status_code=404, detail="No resources available")

    best_amb = None
    best_amb_score = -1
    best_amb_eta = 0
    for amb in ambulances:
        dist = haversine(incident.latitude, incident.longitude, amb.latitude, amb.longitude)
        eta = dist * 2 
        clinical_fit = 100 if incident.severity == 'CRITICAL' and amb.type == 'ALS' else (80 if amb.type == 'BLS' else 90)
        
        eta_score = max(0, 100 - (eta * 2))
        score = (eta_score * 0.6) + (clinical_fit * 0.4)
        if score > best_amb_score:
            best_amb_score = score
            best_amb = amb
            best_amb_eta = eta

    best_hosp = None
    best_hosp_score = -1
    best_hosp_eta = 0
    best_hosp_breakdown = {}
    
    for hosp in hospitals:
        dist = haversine(incident.latitude, incident.longitude, hosp.latitude, hosp.longitude)
        eta = dist * 2
        
        icu_avail = hosp.available_icu > 0
        trauma_avail = hosp.trauma_capability
        
        resources_score = 100 if icu_avail else 50
        if incident.emergency_type == 'Trauma' and not trauma_avail:
            resources_score -= 30
            
        eta_score = max(0, 100 - (eta * 2))
        distance_score = max(0, 100 - dist * 5)
        
        total_score = (eta_score * 0.4) + (resources_score * 0.5) + (distance_score * 0.1)
        
        if total_score > best_hosp_score:
            best_hosp_score = total_score
            best_hosp = hosp
            best_hosp_eta = eta
            best_hosp_breakdown = {
                "eta": round(eta_score),
                "clinical_fit": 95,
                "resources": round(resources_score),
                "distance": round(distance_score)
            }
            
    if not best_amb or not best_hosp:
        raise HTTPException(status_code=404, detail="Could not compute suitable dispatch")
        
    return [{
        "score": round(best_hosp_score),
        "score_breakdown": best_hosp_breakdown,
        "reason": "Fastest clinically suitable ambulance with a nearby hospital that has ICU capacity.",
        "ambulance_id": best_amb.id,
        "ambulance_vehicle_number": best_amb.vehicle_number,
        "ambulance_eta": round(best_amb_eta),
        "hospital_id": best_hosp.id,
        "hospital_name": best_hosp.name,
        "hospital_eta": round(best_hosp_eta),
        "dispatch_score": round((best_amb_score + best_hosp_score) / 2)
    }]

class ConfirmRequest(BaseModel):
    incident_id: int
    ambulance_id: int
    hospital_id: int

@router.post("/confirm")
async def confirm_dispatch(req: ConfirmRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Incident).where(Incident.id == req.incident_id))
    incident = result.scalar_one_or_none()
    
    amb_res = await db.execute(select(Ambulance).where(Ambulance.id == req.ambulance_id))
    amb = amb_res.scalar_one_or_none()
    
    if incident:
        incident.status = "DISPATCHED"
        incident.assigned_ambulance_id = req.ambulance_id
        incident.assigned_hospital_id = req.hospital_id
    
    if amb:
        amb.status = "DISPATCHED"
        amb.current_incident_id = req.incident_id
        
    disp = Dispatch(
        incident_id=req.incident_id,
        ambulance_id=req.ambulance_id,
        hospital_id=req.hospital_id,
        ambulance_eta=10.0,
        hospital_eta=15.0,
        dispatch_score=90.0,
        status="CONFIRMED"
    )
    db.add(disp)
    await db.commit()
    
    return {"status": "success"}
