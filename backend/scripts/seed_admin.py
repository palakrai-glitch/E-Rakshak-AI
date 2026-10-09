import asyncio
import os
import sys

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import AsyncSessionLocal
from app.models.admin import AdminUser
from app.core.security import get_password_hash

async def seed_admin():
    async with AsyncSessionLocal() as session:
        # Check if admin exists
        result = await session.execute(select(AdminUser).where(AdminUser.username == "admin"))
        existing_admin = result.scalar_one_or_none()
        
        if existing_admin:
            print("Admin user already exists.")
            return

        password = os.getenv("ADMIN_INITIAL_PASSWORD", "admin123")
        
        admin = AdminUser(
            username="admin",
            password_hash=get_password_hash(password)
        )
        session.add(admin)
        await session.commit()
        print(f"Created admin user 'admin' with initial password.")

if __name__ == "__main__":
    asyncio.run(seed_admin())
