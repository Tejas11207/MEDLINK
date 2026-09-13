import os

files = {
    'models/base.py': '''from sqlalchemy.orm import declarative_base
Base = declarative_base()
''',

    'models/user.py': '''from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
import datetime
from models.base import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    hospital = relationship("Hospital")
''',

    'models/patient.py': '''from sqlalchemy import Column, Integer, String, Text, DateTime, JSON
import datetime
from models.base import Base

class PatientHealthProfile(Base):
    __tablename__ = "patient_health_profiles"
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(String, unique=True, index=True, nullable=False) # e.g., ABHA ID
    full_name = Column(String, nullable=False)
    blood_group = Column(String)
    allergies = Column(JSON, default=list)
    current_medications = Column(JSON, default=list)
    chronic_conditions = Column(JSON, default=list)
    emergency_contacts = Column(JSON, default=list)
    medical_history = Column(Text)
    vitals_summary = Column(JSON, default=dict)
    last_updated = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
''',

    'models/hospital.py': '''from sqlalchemy import Column, Integer, String, Float, Boolean
from sqlalchemy.orm import relationship
from models.base import Base

class Hospital(Base):
    __tablename__ = "hospitals"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    address = Column(String, nullable=False)
    emergency_capacity = Column(Integer, default=0)
    available_beds = Column(Integer, default=0)
    available_icu = Column(Integer, default=0)
    oxygen_available = Column(Boolean, default=True)
    blood_units = Column(Integer, default=0)
    trauma_capability = Column(Boolean, default=False)
    status = Column(String, default="ONLINE")
''',

    'models/ambulance.py': '''from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
import datetime
from models.base import Base

class Ambulance(Base):
    __tablename__ = "ambulances"
    id = Column(Integer, primary_key=True, index=True)
    vehicle_number = Column(String, unique=True, index=True, nullable=False)
    type = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    status = Column(String, default="AVAILABLE")
    crew_status = Column(String, default="READY")
    equipment_level = Column(String, default="BASIC")
    current_incident_id = Column(Integer, ForeignKey("incidents.id"), nullable=True)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
''',

    'models/incident.py': '''from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
import datetime
from models.base import Base

class Incident(Base):
    __tablename__ = "incidents"
    id = Column(Integer, primary_key=True, index=True)
    patient_name = Column(String, nullable=False)
    patient_id = Column(String, nullable=True) # links to ABHA
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    severity = Column(String, nullable=False)
    emergency_type = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String, default="PENDING") # PENDING, DISPATCHED, ON_SCENE, ARRIVED, RESOLVED
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    assigned_ambulance_id = Column(Integer, ForeignKey("ambulances.id"), nullable=True)
    assigned_hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=True)
    
    ambulance = relationship("Ambulance", foreign_keys=[assigned_ambulance_id])
    hospital = relationship("Hospital", foreign_keys=[assigned_hospital_id])
''',

    'models/broadcast.py': '''from sqlalchemy import Column, Integer, Float, String, DateTime, ForeignKey
import datetime
from models.base import Base

class IncidentBroadcast(Base):
    __tablename__ = "incident_broadcasts"
    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(Integer, ForeignKey("incidents.id"), nullable=False)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=False)
    distance_km = Column(Float)
    status = Column(String, default="NOTIFIED") # NOTIFIED, ACKNOWLEDGED, ACCEPTED, DECLINED, EXPIRED
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    acknowledged_at = Column(DateTime, nullable=True)
''',

    'models/resource.py': '''from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
import datetime
from models.base import Base

class HospitalResourceUnit(Base):
    __tablename__ = "hospital_resource_units"
    id = Column(Integer, primary_key=True, index=True)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=False)
    resource_type = Column(String, nullable=False) # e.g., ICU_BED, ER_BED
    unit_identifier = Column(String, nullable=False) # e.g., BED-042
    status = Column(String, default="AVAILABLE") # AVAILABLE, RESERVED, OCCUPIED, MAINTENANCE
    current_incident_id = Column(Integer, ForeignKey("incidents.id"), nullable=True)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
''',

    'models/reservation.py': '''from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
import datetime
from models.base import Base

class ResourceReservation(Base):
    __tablename__ = "resource_reservations"
    id = Column(Integer, primary_key=True, index=True)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=False)
    resource_type = Column(String, nullable=False)
    resource_id = Column(Integer, ForeignKey("hospital_resource_units.id"), nullable=False)
    incident_id = Column(Integer, ForeignKey("incidents.id"), nullable=False)
    status = Column(String, default="HELD") # HELD, CONFIRMED, RELEASED, EXPIRED
    reserved_at = Column(DateTime, default=datetime.datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)
''',

    'models/prearrival.py': '''from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON
import datetime
from models.base import Base

class PreArrivalAlert(Base):
    __tablename__ = "prearrival_alerts"
    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(Integer, ForeignKey("incidents.id"), nullable=False, unique=True)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=False)
    status = Column(String, default="PENDING") # PENDING, ACKNOWLEDGED, PREPARED, ARRIVED
    eta_minutes = Column(Integer)
    patient_summary = Column(JSON, default=dict)
    case_summary = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    acknowledged_at = Column(DateTime, nullable=True)
    prepared_at = Column(DateTime, nullable=True)
    arrived_at = Column(DateTime, nullable=True)
''',

    'models/sync.py': '''from sqlalchemy import Column, Integer, String, DateTime, JSON
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
''',

    'models/__init__.py': '''from models.base import Base
from models.user import User
from models.hospital import Hospital
from models.ambulance import Ambulance
from models.incident import Incident
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
    incident_id = Column(Integer, ForeignKey("incidents.id"), nullable=False)
    ambulance_id = Column(Integer, ForeignKey("ambulances.id"), nullable=False)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=False)
    ambulance_eta = Column(Float, nullable=False)
    hospital_eta = Column(Float, nullable=False)
    dispatch_score = Column(Float, nullable=False)
    status = Column(String, default="CONFIRMED")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
'''
}

for filepath, content in files.items():
    with open(filepath, 'w') as f:
        f.write(content)

print("Models generated.")
