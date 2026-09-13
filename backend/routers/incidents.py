from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
from schemas import IncidentCreate, IncidentOut, IncidentUpdateStatus
from models import Incident
from database import get_db

router = APIRouter(prefix="/api/incidents", tags=["incidents"])

@router.post("", response_model=IncidentOut)
async def create_incident(incident: IncidentCreate, db: AsyncSession = Depends(get_db)):
    new_incident = Incident(**incident.model_dump())
    db.add(new_incident)
    await db.commit()
    await db.refresh(new_incident)
    return new_incident

@router.get("", response_model=List[IncidentOut])
async def get_incidents(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Incident).order_by(Incident.created_at.desc()))
    return result.scalars().all()

@router.get("/{id}", response_model=IncidentOut)
async def get_incident(id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Incident).where(Incident.id == id))
    inc = result.scalars().first()
    if not inc:
        raise HTTPException(status_code=404, detail="Not found")
    return inc

@router.patch("/{id}/status", response_model=IncidentOut)
async def update_status(id: int, status_update: IncidentUpdateStatus, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Incident).where(Incident.id == id))
    inc = result.scalars().first()
    if not inc:
        raise HTTPException(status_code=404, detail="Not found")
    inc.status = status_update.status
    await db.commit()
    await db.refresh(inc)
    return inc
