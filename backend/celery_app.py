"""
Celery Task Queue Setup
"""
from celery import Celery
from config import settings

celery_app = Celery(
    "raah",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["utils.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Kolkata",
    enable_utc=True,
    beat_schedule={
        "auto-escalate-complaints": {
            "task": "utils.tasks.auto_escalate_complaints",
            "schedule": 86400.0,  # Every 24 hours
        },
        "refresh-predictions": {
            "task": "utils.tasks.refresh_predictions",
            "schedule": 21600.0,  # Every 6 hours
        },
        "autonomous-discovery": {
            "task": "utils.tasks.autonomous_discovery",
            "schedule": 3600.0,  # Every hour (Global Ingestion)
            "args": (28.6139, 77.2090), # Starting at Delhi
        },
    },
)
