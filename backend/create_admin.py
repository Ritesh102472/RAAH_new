"""
Admin user creation script.
Usage: python create_admin.py --email admin@raah.gov.in --password secret --role admin
"""
import argparse
from passlib.context import CryptContext
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database.connection import SessionLocal, engine
from database.models import Base, User, UserRole

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def create_admin(email: str, password: str, name: str, role: str):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            existing.role = UserRole(role)
            existing.password_hash = pwd_context.hash(password)
            db.commit()
            print(f"✅ Updated existing user {email} → role={role}")
        else:
            user = User(
                name=name,
                email=email,
                phone="0000000000",
                dob="2000-01-01",
                password_hash=pwd_context.hash(password),
                role=UserRole(role),
            )
            db.add(user)
            db.commit()
            print(f"✅ Created {role} user: {email}")
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Create admin user")
    parser.add_argument("--email", required=True)
    parser.add_argument("--password", required=True)
    parser.add_argument("--name", default="System Admin")
    parser.add_argument("--role", default="admin", choices=["admin", "superadmin"])
    args = parser.parse_args()
    create_admin(args.email, args.password, args.name, args.role)
