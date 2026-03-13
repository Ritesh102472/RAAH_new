from fastapi import APIRouter, UploadFile, File
from ai_service.model import run_detection

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/detect-pothole")
async def detect_pothole(file: UploadFile = File(...)):
    """
    Expected interface for the YOLO model.
    Currently uses stub if AI_MODEL_ENABLED=false.
    """
    file_bytes = await file.read()
    result = await run_detection(file_bytes, file.filename)
    return result
