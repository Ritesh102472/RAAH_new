"""
Celery Background Tasks
"""
import datetime
from celery_app import celery_app


@celery_app.task(name="utils.tasks.auto_escalate_complaints")
def auto_escalate_complaints():
    """
    Auto-escalate complaints that have been pending for more than 7 days.
    Runs daily via Celery Beat.
    """
    from database.connection import SessionLocal
    from database.models import Complaint, Pothole, ComplaintStatus, PotholeStatus
    db = SessionLocal()
    try:
        cutoff = datetime.datetime.utcnow() - datetime.timedelta(days=7)
        pending = db.query(Complaint).filter(
            Complaint.status.in_([ComplaintStatus.filed, ComplaintStatus.pending]),
            Complaint.created_at < cutoff,
        ).all()

        count = 0
        for c in pending:
            c.status = ComplaintStatus.escalated
            c.escalated_at = datetime.datetime.utcnow()
            c.updated_at = datetime.datetime.utcnow()
            if c.pothole:
                c.pothole.status = PotholeStatus.escalated
            count += 1
        db.commit()
        print(f"[Celery] Auto-escalated {count} complaints")
        return {"escalated": count}
    except Exception as e:
        db.rollback()
        print(f"[Celery] Escalation failed: {e}")
        return {"error": str(e)}
    finally:
        db.close()


@celery_app.task(name="utils.tasks.refresh_predictions")
def refresh_predictions():
    """Refresh PVI predictions every 6 hours."""
    import asyncio
    from database.connection import SessionLocal
    from database.models import Prediction
    from prediction_service.pvi import compute_predictions_for_grid

    db = SessionLocal()
    try:
        predictions = asyncio.run(compute_predictions_for_grid())
        db.query(Prediction).delete()
        for pred in predictions:
            p = Prediction(
                lat=pred["lat"],
                lng=pred["lng"],
                pvi_score=pred["pvi_score"],
                risk_level=pred["risk_level"],
                road_type=pred["road_type"],
                rainfall_mm=pred["rainfall_mm"],
                temperature_c=pred["temperature_c"],
                computed_at=datetime.datetime.utcnow(),
            )
            db.add(p)
        db.commit()
        print(f"[Celery] Refreshed {len(predictions)} predictions")
        return {"count": len(predictions)}
    except Exception as e:
        db.rollback()
        print(f"[Celery] Prediction refresh failed: {e}")
        return {"error": str(e)}
    finally:
        db.close()

@celery_app.task(name="utils.tasks.scan_mapillary_area")
def scan_mapillary_area(lat: float, lng: float, radius: int = 50, user_id: int = None):
    """
    Fetch Mapillary images in the area, run inference on them, and record potholes.
    """
    import asyncio
    from database.connection import SessionLocal
    from database.models import Pothole, Report, Severity, PotholeStatus, ReportSource
    from map_service.mapillary import fetch_nearby_images, get_image_by_id
    from map_service.geocoding import reverse_geocode
    from ai_service.model import run_detection, classify_severity_from_detection
    from citizen_service.router import find_nearby_pothole
    import datetime
    import json
    import redis
    from config import settings
    from utils.broadcast import broadcast_event

    db = SessionLocal()
    try:
        # Run async fetches in the synchronous celery worker
        images = asyncio.run(fetch_nearby_images(lat, lng, radius))
        if not images:
            print(f"[Mapillary] No images found near {lat}, {lng}")
            return {"status": "no_images", "count": 0}

        print(f"[Mapillary] Found {len(images)} images to process")
        total_potholes = 0
        handled_pothole_ids = []

        for p_img in images:
            img_id = p_img.get("id")
            if not img_id:
                continue
                
            geom = p_img.get("geometry", {})
            coords = geom.get("coordinates")
            if not coords or len(coords) < 2:
                # Default to requested coordinate if imagery lacks exact point
                img_lng, img_lat = lng, lat
            else:
                img_lng, img_lat = coords[0], coords[1]

            # Fetch actual bytes
            img_bytes = asyncio.run(get_image_by_id(img_id))
            if not img_bytes:
                continue

            # Run detection
            detection_result = asyncio.run(run_detection(img_bytes, f"mapillary_{img_id}.jpg"))
            potholes_detected = detection_result.get("potholes", [])
            
            if not potholes_detected:
                continue

            # Reverse geocode for location text
            geo = asyncio.run(reverse_geocode(img_lat, img_lng))

            for det in potholes_detected:
                bbox = det.get("bbox", [0, 0, 0, 0])
                confidence = det.get("confidence", 0.0)
                sev_str = classify_severity_from_detection(bbox, confidence)
                try:
                    severity = Severity(sev_str)
                except ValueError:
                    severity = Severity.medium

                # Check if this pothole was already reported / detected nearby
                nearby = find_nearby_pothole(db, img_lat, img_lng, exclude_ids=handled_pothole_ids)

                if nearby:
                    handled_pothole_ids.append(nearby.id)
                    # Add report
                    try:
                        report = Report(
                            pothole_id=nearby.id,
                            user_id=user_id,
                            source=ReportSource.mapillary,
                            image_path=f"mapillary://{img_id}",  # Storing mapillary ID as path
                            lat=img_lat, lng=img_lng,
                            location_source="mapillary_api",
                        )
                        db.add(report)
                        if nearby.complaint:
                            nearby.complaint.number_of_reports += 1
                            nearby.complaint.updated_at = datetime.datetime.utcnow()
                    except Exception as report_e:
                        print(f"Failed to add report: {report_e}")
                else:
                    # New pothole
                    try:
                        pothole = Pothole(
                            lat=img_lat, lng=img_lng,
                            road_name=geo.get("road", "Unknown Road"),
                            city=geo.get("city", "Unknown City"),
                            state=geo.get("state"),
                            country=geo.get("country", "India"),
                            full_address=geo.get("full_address"),
                            location_source="mapillary_api",
                            image_path=f"mapillary://{img_id}",
                            severity=severity,
                            confidence=confidence,
                            bbox_x=bbox[0] if len(bbox) > 0 else None,
                            bbox_y=bbox[1] if len(bbox) > 1 else None,
                            bbox_w=bbox[2] if len(bbox) > 2 else None,
                            bbox_h=bbox[3] if len(bbox) > 3 else None,
                            status=PotholeStatus.detected,
                            source=ReportSource.mapillary,
                            reporter_id=user_id,
                        )
                        db.add(pothole)
                        db.commit() # Commit right away to get the ID
                        handled_pothole_ids.append(pothole.id)
                    except Exception as pothole_e:
                        db.rollback()
                        print(f"Failed to add new pothole: {pothole_e}")

                total_potholes += 1

        db.commit()
        print(f"[Mapillary] Scan complete. Found {total_potholes} potholes.")
        if total_potholes > 0:
            try:
                broadcast_event("new_pothole", {
                    "count": total_potholes,
                    "source": "mapillary",
                    "potholes_found": total_potholes
                })
            except Exception as rb_e:
                print(f"Failed to broadcast Mapillary event: {rb_e}")

        return {"status": "success", "potholes_found": total_potholes}

    except Exception as e:
        db.rollback()
        import traceback
        print(f"[Mapillary] Scan task failed: {e}\n{traceback.format_exc()}")
        return {"error": str(e)}
    finally:
        db.close()


@celery_app.task(name="utils.tasks.autonomous_discovery")
def autonomous_discovery(lat: float = 28.6139, lng: float = 77.2090, depth: int = 1):
    """
    Autonomous Mapillary Discovery.
    Starting from a point, it scans for Mapillary's own AI-detected potholes.
    'depth' can be used to crawl adjacent areas.
    """
    import asyncio
    from database.connection import SessionLocal
    from database.models import Pothole, Severity, PotholeStatus, ReportSource
    from map_service.mapillary import fetch_map_features
    from map_service.geocoding import reverse_geocode
    import json
    import redis
    from config import settings
    from utils.broadcast import broadcast_event

    db = SessionLocal()
    try:
        print(f"[Discovery] Starting autonomous scan at {lat}, {lng} (depth={depth})")
        features = asyncio.run(fetch_map_features(lat, lng, radius=0.05)) # ~5km radius
        
        if not features:
            print("[Discovery] No Mapillary features found in this area.")
            try:
                broadcast_event("discovery_complete", {
                    "count": 0, 
                    "message": "Global discovery scan complete. No new potholes detected in this area."
                })
            except: pass
            return {"count": 0}

        new_count = 0
        for feat in features:
            feat_id = feat.get("id")
            geom = feat.get("geometry", {})
            coords = geom.get("coordinates")
            if not coords or len(coords) < 2:
                continue
            
            f_lng, f_lat = coords[0], coords[1]
            
            # Check if we already have this Mapillary feature
            existing_feat = db.query(Pothole).filter(Pothole.image_path == f"mapillary_feat://{feat_id}").first()
            if existing_feat:
                continue

            # Check if this pothole was already reported / detected nearby (500m radius)
            from citizen_service.router import find_nearby_pothole
            nearby = find_nearby_pothole(db, f_lat, f_lng)

            if nearby:
                # Add report to existing pothole
                from database.models import Report
                report = Report(
                    pothole_id=nearby.id,
                    user_id=None,
                    source=ReportSource.mapillary,
                    image_path=f"mapillary_feat://{feat_id}",
                    lat=f_lat, lng=f_lng,
                    location_source="mapillary_global_ai",
                )
                db.add(report)
                if nearby.complaint:
                    nearby.complaint.number_of_reports += 1
                    nearby.complaint.updated_at = datetime.datetime.utcnow()
                new_count += 1
            else:
                # New pothole
                p = Pothole(
                    lat=f_lat, lng=f_lng,
                    road_name="Mapillary Discovered Road",
                    location_source="mapillary_global_ai",
                    image_path=f"mapillary_feat://{feat_id}",
                    severity=Severity.medium,
                    confidence=0.85, # Mapillary's detections are generally reliable
                    status=PotholeStatus.detected,
                    source=ReportSource.mapillary,
                )
                db.add(p)
                db.flush()
                
                # Auto-generate complaint for discovered pothole
                from database.models import Complaint, ComplaintStatus
                from citizen_service.router import generate_complaint_number, assign_agency
                agency = assign_agency("Unknown State", "Mapillary Discovered Road")
                complaint = Complaint(
                    complaint_number=generate_complaint_number(p.id),
                    pothole_id=p.id,
                    lat=f_lat,
                    lng=f_lng,
                    location_text=f"Mapillary Discovered, lat: {f_lat}, lng: {f_lng}",
                    road_name="Mapillary Discovered Road",
                    severity=Severity.medium,
                    number_of_reports=1,
                    status=ComplaintStatus.reported,
                    agency=agency,
                )
                db.add(complaint)
                p.status = PotholeStatus.complaint_filed
                new_count += 1

        db.commit()
        print(f"[Discovery] Successfully ingested {new_count} new potholes from Mapillary Global.")

        if new_count > 0:
            try:
                broadcast_event("new_pothole", {
                    "count": new_count,
                    "source": "mapillary_autonomous",
                    "autonomous": True
                })
            except Exception as rb_e:
                print(f"Failed to broadcast discovery event: {rb_e}")

        return {"new_detected": new_count}
    except Exception as e:
        db.rollback()
        print(f"[Discovery] Task failed: {e}")
        return {"error": str(e)}
    finally:
        db.close()

@celery_app.task(name="utils.tasks.check_pothole_resolution")
def check_pothole_resolution():
    """
    Checks if reported potholes have been resolved after 7 days.
    1. Fetches complaints older than 7 days with status 'reported'.
    2. Runs a fresh rescan for that location.
    3. If pothole persists -> escalate.
    4. If pothole gone -> resolve.
    """
    import asyncio
    from database.connection import SessionLocal
    from database.models import Complaint, Pothole, ComplaintStatus, PotholeStatus
    from map_service.mapillary import fetch_nearby_images, get_image_by_id
    from ai_service.model import run_detection

    db = SessionLocal()
    try:
        cutoff = datetime.datetime.utcnow() - datetime.timedelta(days=7)
        complaints = db.query(Complaint).filter(
            Complaint.status == ComplaintStatus.reported,
            Complaint.reported_at < cutoff
        ).all()

        results = {"processed": len(complaints), "resolved": 0, "escalated": 0}
        
        for c in complaints:
            p = c.pothole
            if not p:
                continue

            # Attempt to fetch fresh imagery for this location
            # In a real scenario, we'd look for images taken AFTER c.reported_at
            fresh_images = asyncio.run(fetch_nearby_images(p.lat, p.lng, radius=10))
            if not fresh_images:
                # If no fresh imagery is available, we can't verify yet.
                # In a more advanced version, we might trigger a drone or citizen request.
                continue

            # Sort images by captured_at if available to get the newest one
            # For this hackathon, we'll just take the first one returned
            img_id = fresh_images[0].get("id")
            img_bytes = asyncio.run(get_image_by_id(img_id))
            
            if not img_bytes:
                continue

            # Run detection on newest image
            detection = asyncio.run(run_detection(img_bytes, f"verify_{p.id}_{img_id}.jpg"))
            potholes_found = detection.get("potholes", [])

            if len(potholes_found) > 0:
                # Still there! ESCALATE
                c.status = ComplaintStatus.escalated
                c.escalated_at = datetime.datetime.utcnow()
                p.status = PotholeStatus.escalated
                results["escalated"] += 1
            else:
                # Pothole gone! RESOLVE
                c.status = ComplaintStatus.resolved
                p.status = PotholeStatus.resolved
                results["resolved"] += 1
            
            c.updated_at = datetime.datetime.utcnow()
            p.updated_at = datetime.datetime.utcnow()

        db.commit()
        print(f"[Celery] Resolution check complete. Results: {results}")
        return results
    except Exception as e:
        db.rollback()
        import traceback
        print(f"[Celery] Resolution check failed: {e}\n{traceback.format_exc()}")
        return {"error": str(e)}
    finally:
        db.close()
