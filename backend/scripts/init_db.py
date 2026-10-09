import asyncio
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import engine, Base
# Import all models so Base knows about them
from app.models.admin import AdminUser
from app.models.ambulance import Ambulance
from app.models.doctor import Doctor
from app.models.hospital import Hospital
from app.models.emergency_case import EmergencyCase

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    print("Database tables created successfully.")

if __name__ == "__main__":
    asyncio.run(init_db())
