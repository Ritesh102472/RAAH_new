import json
import redis
from config import settings

def broadcast_event(event_name: str, data: dict):
    """
    Centralized utility to broadcast events to all connected WebSockets via Redis.
    Works for both sync (Celery) and async (FastAPI) contexts.
    """
    try:
        r = redis.from_url(settings.REDIS_URL)
        event_data = {
            "event": event_name,
            "data": data
        }
        r.publish("raah_events", json.dumps(event_data))
        print(f"📡 Broadcasted event: {event_name}")
    except Exception as e:
        print(f"❌ Failed to broadcast event {event_name}: {e}")

async def broadcast_event_async(event_name: str, data: dict):
    """
    Async version of the broadcaster for use inside FastAPI endpoints.
    """
    import redis.asyncio as aioredis
    try:
        r = await aioredis.from_url(settings.REDIS_URL)
        event_data = {
            "event": event_name,
            "data": data
        }
        await r.publish("raah_events", json.dumps(event_data))
        print(f"📡 Broadcasted event (async): {event_name}")
    except Exception as e:
        print(f"❌ Failed to broadcast event async {event_name}: {e}")
