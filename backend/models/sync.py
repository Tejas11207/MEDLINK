from sqlalchemy import Column, Integer, String, DateTime, JSON
import datetime
from models.base import Base

class OfflineSyncEvent(Base):
    __tablename__ = "offline_sync_events"
    id = Column(Integer, primary_key=True, index=True)
    local_id = Column(String, unique=True, index=True, nullable=False)
    operation = Column(String, nullable=False)
    payload = Column(JSON, nullable=False)
    status = Column(String, default="QUEUED") # QUEUED, SYNCING, SYNCED, FAILED
    retry_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
