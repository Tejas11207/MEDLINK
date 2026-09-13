from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from models import HospitalResourceUnit, ResourceReservation, Hospital
from database import get_db
from pydantic import BaseModel
from datetime import datetime, timedelta

router = APIRouter(prefix="/api/resources", tags=["resources"])

class ReserveRequest(BaseModel):
    hospital_id: int
    resource_type: str
    resource_id: int
    incident_id: int

@router.post("/reserve")
async def reserve_resource(req: ReserveRequest, db: AsyncSession = Depends(get_db)):
    # ROW-LEVEL LOCKING
    try:
        stmt = select(HospitalResourceUnit).where(HospitalResourceUnit.id == req.resource_id).with_for_update()
        result = await db.execute(stmt)
        resource = result.scalar_one_or_none()
        
        if not resource:
            raise HTTPException(status_code=404, detail="Resource not found")
            
        if resource.status != "AVAILABLE":
            raise HTTPException(status_code=409, detail="RESOURCE_ALREADY_RESERVED")
            
        # Update resource status
        resource.status = "RESERVED"
        resource.current_incident_id = req.incident_id
        
        # Create Reservation
        res = ResourceReservation(
            hospital_id=req.hospital_id,
            resource_type=req.resource_type,
            resource_id=req.resource_id,
            incident_id=req.incident_id,
            status="HELD",
            expires_at=datetime.utcnow() + timedelta(minutes=15)
        )
        db.add(res)
        
        # Update aggregate counters (consistency invariant)
        if req.resource_type == "ICU_BED":
            hosp_res = await db.execute(select(Hospital).where(Hospital.id == req.hospital_id))
            hosp = hosp_res.scalar_one_or_none()
            if hosp and hosp.available_icu > 0:
                hosp.available_icu -= 1
                
        await db.commit()
        return {"status": "success", "reservation_id": res.id}
        
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

class ReleaseRequest(BaseModel):
    resource_id: int

@router.post("/{resource_id}/release")
async def release_resource(resource_id: int, db: AsyncSession = Depends(get_db)):
    try:
        stmt = select(HospitalResourceUnit).where(HospitalResourceUnit.id == resource_id).with_for_update()
        result = await db.execute(stmt)
        resource = result.scalar_one_or_none()
        
        if not resource:
            raise HTTPException(status_code=404, detail="Resource not found")
            
        if resource.status != "RESERVED":
            raise HTTPException(status_code=400, detail="Resource is not currently reserved")
            
        resource.status = "AVAILABLE"
        resource.current_incident_id = None
        
        res_stmt = select(ResourceReservation).where(ResourceReservation.resource_id == resource_id).where(ResourceReservation.status == "HELD")
        res_result = await db.execute(res_stmt)
        reservation = res_result.scalar_one_or_none()
        if reservation:
            reservation.status = "RELEASED"
            
        # Update aggregate
        if resource.resource_type == "ICU_BED":
            hosp_res = await db.execute(select(Hospital).where(Hospital.id == resource.hospital_id))
            hosp = hosp_res.scalar_one_or_none()
            if hosp:
                hosp.available_icu += 1
                
        await db.commit()
        return {"status": "success"}
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
