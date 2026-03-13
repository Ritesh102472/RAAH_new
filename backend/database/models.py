import enum
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Text, DateTime,
    ForeignKey, Enum, Boolean, func
)
from sqlalchemy.orm import relationship
from database.connection import Base


class UserRole(str, enum.Enum):
    citizen = "citizen"
    admin = "admin"
    superadmin = "superadmin"


class PotholeStatus(str, enum.Enum):
    detected = "detected"
    complaint_filed = "complaint_filed"
    repair_in_progress = "repair_in_progress"
    resolved = "resolved"
    escalated = "escalated"


class Severity(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"


class ComplaintStatus(str, enum.Enum):
    filed = "filed"
    pending = "pending"
    resolved = "resolved"
    escalated = "escalated"


class ReportSource(str, enum.Enum):
    citizen_upload = "citizen_upload"
    mapillary = "mapillary"
    dashcam = "dashcam"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    dob = Column(String(20), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    phone = Column(String(20), nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.citizen, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())

    potholes = relationship("Pothole", back_populates="reporter", foreign_keys="Pothole.reporter_id")
    reports = relationship("Report", back_populates="user")
    admin_actions = relationship("AdminAction", back_populates="admin")


class Pothole(Base):
    __tablename__ = "potholes"

    id = Column(Integer, primary_key=True, index=True)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    road_name = Column(String(500), default="Unknown Road")
    city = Column(String(255), default="Unknown City")
    state = Column(String(255), default="Unknown State")
    image_path = Column(Text, nullable=True)
    severity = Column(Enum(Severity), default=Severity.medium, nullable=False)
    confidence = Column(Float, default=0.0)
    bbox_x = Column(Float, nullable=True)
    bbox_y = Column(Float, nullable=True)
    bbox_w = Column(Float, nullable=True)
    bbox_h = Column(Float, nullable=True)
    status = Column(Enum(PotholeStatus), default=PotholeStatus.detected, nullable=False)
    source = Column(Enum(ReportSource), default=ReportSource.citizen_upload)
    reporter_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    reporter = relationship("User", back_populates="potholes", foreign_keys=[reporter_id])
    complaint = relationship("Complaint", back_populates="pothole", uselist=False)
    reports = relationship("Report", back_populates="pothole")
    admin_actions = relationship("AdminAction", back_populates="pothole")


class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(Integer, primary_key=True, index=True)
    complaint_number = Column(String(50), unique=True, index=True)
    pothole_id = Column(Integer, ForeignKey("potholes.id"), nullable=False)
    location_text = Column(Text, default="")
    road_name = Column(String(500), default="")
    severity = Column(Enum(Severity), default=Severity.medium)
    number_of_reports = Column(Integer, default=1)
    status = Column(Enum(ComplaintStatus), default=ComplaintStatus.filed)
    agency = Column(String(255), default="PWD")
    maintenance_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    escalated_at = Column(DateTime, nullable=True)

    pothole = relationship("Pothole", back_populates="complaint")


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    pothole_id = Column(Integer, ForeignKey("potholes.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    source = Column(Enum(ReportSource), default=ReportSource.citizen_upload)
    image_path = Column(Text, nullable=True)
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    created_at = Column(DateTime, default=func.now())

    pothole = relationship("Pothole", back_populates="reports")
    user = relationship("User", back_populates="reports")


class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    pvi_score = Column(Float, default=0.0)
    risk_level = Column(String(20), default="low")  # low, medium, high
    road_type = Column(String(50), nullable=True)
    rainfall_mm = Column(Float, nullable=True)
    temperature_c = Column(Float, nullable=True)
    computed_at = Column(DateTime, default=func.now())


class AdminAction(Base):
    __tablename__ = "admin_actions"

    id = Column(Integer, primary_key=True, index=True)
    admin_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    pothole_id = Column(Integer, ForeignKey("potholes.id"), nullable=False)
    action_type = Column(String(100), nullable=False)  # mark_repaired, escalate, add_note
    note = Column(Text, nullable=True)
    created_at = Column(DateTime, default=func.now())

    admin = relationship("User", back_populates="admin_actions")
    pothole = relationship("Pothole", back_populates="admin_actions")
