from models.base import Base
from models.user import User
from models.hospital import Hospital
from models.ambulance import Ambulance
from models.incident import EmergencyCase, Incident
from models.hospital_response import HospitalResponse
from models.audit_log import AuditLog
from models.patient import PatientHealthProfile
from models.broadcast import IncidentBroadcast
from models.resource import HospitalResourceUnit
from models.reservation import ResourceReservation
from models.prearrival import PreArrivalAlert
from models.sync import OfflineSyncEvent

class Dispatch(Base):
    __tablename__ = "dispatches"
    from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
    import datetime
    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(Integer, ForeignKey("emergency_cases.id"), nullable=True)
    ambulance_id = Column(Integer, ForeignKey("ambulances.id"), nullable=True)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=False)
    ambulance_eta = Column(Float, nullable=True, default=0.0)
    hospital_eta = Column(Float, nullable=False, default=0.0)
    dispatch_score = Column(Float, nullable=False, default=100.0)
    status = Column(String, default="CONFIRMED")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
