"""
File Storage Utility
Handles saving uploaded files locally (or optionally to S3).
"""
import os
import uuid
import aiofiles
from pathlib import Path
from config import settings


def ensure_upload_dir():
    Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)


async def save_file(file_bytes: bytes, original_filename: str) -> str:
    """
    Save file bytes to local storage.
    Returns the relative path to the saved file.
    """
    ensure_upload_dir()
    ext = Path(original_filename).suffix.lower()
    unique_name = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, unique_name)
    async with aiofiles.open(file_path, "wb") as f:
        await f.write(file_bytes)
    return file_path


def get_file_url(file_path: str) -> str:
    """Returns a URL path for serving the uploaded file."""
    if file_path and file_path.startswith("./"):
        file_path = file_path[2:]
    return f"/static/{file_path}"
