import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

import io
from PIL import Image
from ultralytics import YOLO

model_path = os.path.join(os.path.dirname(__file__), "ai_service", "pothole_best_backup.pt")
print(f"Loading model from: {model_path}")
model = YOLO(model_path)

# Find the latest JPG
upload_dir = os.path.join(os.path.dirname(__file__), "uploads")
jpgs = sorted(
    [f for f in os.listdir(upload_dir) if f.endswith('.jpg')],
    key=lambda f: os.path.getmtime(os.path.join(upload_dir, f)),
    reverse=True
)

if not jpgs:
    print("No jpg files found!")
    sys.exit(1)

image_path = os.path.join(upload_dir, jpgs[0])
print(f"Testing with: {image_path}")

img = Image.open(image_path).convert("RGB")
results = model(img, verbose=False)

print(f"Results type: {type(results)}")
print(f"Length of results: {len(results)}")

for i, result in enumerate(results):
    print(f"Result {i} boxes: {len(result.boxes) if result.boxes is not None else 'None'}")
    if result.boxes is not None:
        for j, box in enumerate(result.boxes):
            conf = float(box.conf[0])
            xyxy = box.xyxy[0].tolist()
            print(f"  Box {j}: conf={conf:.4f}, xyxy={xyxy}")
