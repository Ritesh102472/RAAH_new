
import sys
import os
import math
import datetime

# Add parent directory to path to import database modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy.orm import Session
from database.connection import SessionLocal
from database.models import Pothole, Complaint, Report, ComplaintStatus, PotholeStatus

def haversine_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate distance in meters between two GPS coordinates."""
    R = 6371000  # Earth radius in meters
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))

def merge_potholes():
    db = SessionLocal()
    try:
        # 1. Fetch all active complaints
        complaints = db.query(Complaint).filter(
            Complaint.status != ComplaintStatus.resolved
        ).order_by(Complaint.created_at).all()

        print(f"Found {len(complaints)} active complaints to check.")

        processed_ids = set()
        deleted_ids = set()
        merged_count = 0

        for i, c1 in enumerate(complaints):
            if c1.id in deleted_ids:
                continue
            
            p1 = c1.pothole
            if not p1:
                continue
            
            p1_id = p1.id # Capture ID before any potential session weirdness

            # Look for other complaints near c1
            for j in range(i + 1, len(complaints)):
                c2 = complaints[j]
                if c2.id in deleted_ids:
                    continue
                
                p2 = c2.pothole
                if not p2:
                    continue
                
                p2_id = p2.id

                dist = haversine_distance(p1.lat, p1.lng, p2.lat, p2.lng)
                if dist <= 500.0:
                    print(f"Merging {c2.complaint_number} into {c1.complaint_number} (distance: {dist:.1f}m)")
                    
                    # Move reports from p2 to p1
                    db.query(Report).filter(Report.pothole_id == p2_id).update({"pothole_id": p1_id})
                    
                    # Move admin actions
                    from database.models import AdminAction
                    db.query(AdminAction).filter(AdminAction.pothole_id == p2_id).update({"pothole_id": p1_id})

                    # Update master complaint
                    c1.number_of_reports += c2.number_of_reports
                    c1.updated_at = datetime.datetime.utcnow()
                    
                    # Mark c2 and p2 for deletion
                    deleted_ids.add(c2.id)
                    db.delete(c2)
                    db.delete(p2)
                    merged_count += 1
                    
                    # Flush after each merge to keep DB state consistent
                    db.flush()

        db.commit()
        print(f"Merge complete. Consolidated {merged_count} duplicates.")

    except Exception as e:
        db.rollback()
        print(f"Merge failed: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    merge_potholes()
