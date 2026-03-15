
import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database.models import Prediction
from config import settings

engine = create_engine(settings.DATABASE_URL)
Session = sessionmaker(bind=engine)
session = Session()

count = session.query(Prediction).count()
print(f"Prediction count: {count}")

if count > 0:
    p = session.query(Prediction).first()
    print(f"First prediction: {p.lat}, {p.lng}, {p.pvi_score}, {p.risk_level}, {p.rainfall_mm}")
else:
    print("Predictions table is empty.")

session.close()
