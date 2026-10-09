import asyncio
import os
import sys

# Add the parent directory to sys.path so we can import 'app'
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.database import AsyncSessionLocal
from app.models.ambulance import Ambulance
from app.core.security import get_password_hash

async def provision_ambulances(password: str = "password123"):
    """
    Sets a default password for all existing ambulances if they don't have one.
    This enables testing the Ambulance Portal without rebuilding the DB.
    """
    async with AsyncSessionLocal() as db:
        query = select(Ambulance)
        result = await db.execute(query)
        ambulances = result.scalars().all()
        
        hashed_pw = get_password_hash(password)
        count = 0
        
        for amb in ambulances:
            amb.operator_password_hash = hashed_pw
            db.add(amb)
            count += 1
            
        await db.commit()
        print(f"Provisioned {count} ambulances with the default operator password '{password}'.")

if __name__ == "__main__":
    asyncio.run(provision_ambulances())
