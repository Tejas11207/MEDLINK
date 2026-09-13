from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from models import OfflineSyncEvent
from database import get_db
from pydantic import BaseModel
from typing import Any, Dict

router = APIRouter(prefix="/api/sync", tags=["sync"])

class SyncRequest(BaseModel):
    local_id: str
    operation: str
    payload: Dict[str, Any]

@router.post("")
async def sync_offline(req: SyncRequest, db: AsyncSession = Depends(get_db)):
    # Very basic sync endpoint
    evt = OfflineSyncEvent(
        local_id=req.local_id,
        operation=req.operation,
        payload=req.payload,
        status="SYNCED"
    )
    db.add(evt)
    await db.commit()
    return {"status": "success", "synced_id": evt.id}
