from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, cast, Float
from sqlalchemy.future import select
from models import Incident, Dispatch, Ambulance
from database import get_db
from datetime import datetime, timedelta

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

@router.get("/incidents")
async def get_analytics_incidents(time_filter: str = "7D", db: AsyncSession = Depends(get_db)):
    
    # Calculate time bound
    now = datetime.utcnow()
    if time_filter == "24H":
        bound = now - timedelta(days=1)
    elif time_filter == "7D":
        bound = now - timedelta(days=7)
    elif time_filter == "30D":
        bound = now - timedelta(days=30)
    else:
        bound = now - timedelta(days=3650) # ALL TIME
        
    # Total incidents
    total_res = await db.execute(select(func.count(Incident.id)).where(Incident.created_at >= bound))
    total = total_res.scalar() or 0
    
    # Critical incidents
    critical_res = await db.execute(select(func.count(Incident.id)).where(Incident.severity == "CRITICAL", Incident.created_at >= bound))
    critical = critical_res.scalar() or 0
    
    # Average response time from Dispatch
    avg_res = await db.execute(select(func.avg(Dispatch.ambulance_eta)).where(Dispatch.created_at >= bound))
    avg_response = avg_res.scalar()
    avg_response = round(avg_response, 1) if avg_response else 0.0

    # Ambulance Utilization
    amb_total = await db.execute(select(func.count(Ambulance.id)))
    amb_total = amb_total.scalar() or 1
    amb_used = await db.execute(select(func.count(Ambulance.id)).where(Ambulance.status != "AVAILABLE"))
    amb_used = amb_used.scalar() or 0
    amb_utilization = round((amb_used / amb_total) * 100)

    # Group by severity
    sev_res = await db.execute(select(Incident.severity, func.count(Incident.id)).where(Incident.created_at >= bound).group_by(Incident.severity))
    by_severity = [{"name": s, "value": c} for s, c in sev_res.all()]
    
    # Group by type
    type_res = await db.execute(select(Incident.emergency_type, func.count(Incident.id)).where(Incident.created_at >= bound).group_by(Incident.emergency_type))
    by_type = [{"name": t, "value": c} for t, c in type_res.all()]
    
    # Over time (Group by date)
    time_res = await db.execute(select(func.date(Incident.created_at).label("dt"), func.count(Incident.id)).where(Incident.created_at >= bound).group_by("dt").order_by("dt"))
    over_time_raw = time_res.all()
    
    over_time = []
    for dt, count in over_time_raw:
        # Format date safely across OSes
        dt_obj = datetime.strptime(str(dt), "%Y-%m-%d")
        over_time.append({"date": dt_obj.strftime("%b %d"), "value": count})
    
    return {
        "kpis": {
            "total": total,
            "critical": critical,
            "avg_response": str(avg_response),
            "amb_utilization": str(amb_utilization)
        },
        "over_time": over_time,
        "by_severity": by_severity,
        "by_type": by_type
    }
