import uuid
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc
from app.models.emergency_case import EmergencyCase
from app.schemas.emergency_case import EmergencyCaseCreate, EmergencyCaseUpdate

class EmergencyCaseService:
    
    @staticmethod
    def generate_case_id() -> str:
        date_str = datetime.now(timezone.utc).strftime("%Y%m%d")
        unique_segment = str(uuid.uuid4())[:4].upper()
        return f"ER-{date_str}-{unique_segment}"

    @staticmethod
    async def create_case(db: AsyncSession, case_data: EmergencyCaseCreate) -> EmergencyCase:
        new_case_id = EmergencyCaseService.generate_case_id()
        
        db_case = EmergencyCase(
            case_id=new_case_id,
            status="OPEN",
            **case_data.model_dump()
        )
        
        db.add(db_case)
        await db.commit()
        await db.refresh(db_case)
        return db_case

    @staticmethod
    async def get_case_by_id(db: AsyncSession, case_id: str) -> EmergencyCase | None:
        result = await db.execute(select(EmergencyCase).where(EmergencyCase.case_id == case_id))
        return result.scalars().first()

    @staticmethod
    async def list_cases(
        db: AsyncSession, 
        limit: int = 50,
        search: str | None = None,
        status: str | None = None,
        sort_by: str = "newest"
    ) -> list[EmergencyCase]:
        from sqlalchemy import or_, asc
        
        query = select(EmergencyCase)
        
        if status:
            query = query.where(EmergencyCase.status == status)
            
        if search:
            search_term = f"%{search}%"
            query = query.where(
                or_(
                    EmergencyCase.case_id.ilike(search_term),
                    EmergencyCase.patient_name.ilike(search_term),
                    EmergencyCase.reporter_phone.ilike(search_term)
                )
            )
            
        if sort_by == "oldest":
            query = query.order_by(asc(EmergencyCase.created_at))
        else:
            query = query.order_by(desc(EmergencyCase.created_at))
            
        query = query.limit(limit)
        
        result = await db.execute(query)
        return list(result.scalars().all())
    @staticmethod
    async def update_case(db: AsyncSession, case_id: str, update_data: EmergencyCaseUpdate) -> EmergencyCase | None:
        db_case = await EmergencyCaseService.get_case_by_id(db, case_id)
        if not db_case:
            return None
            
        update_dict = update_data.model_dump(exclude_unset=True)
        for key, value in update_dict.items():
            setattr(db_case, key, value)
            
        db.add(db_case)
        await db.commit()
        await db.refresh(db_case)
        return db_case

    @staticmethod
    async def verify_case(db: AsyncSession, case_id: str, reporter_phone: str) -> EmergencyCase | None:
        db_case = await EmergencyCaseService.get_case_by_id(db, case_id)
        if not db_case:
            return None
            
        # Secure verification: phone number must match. 
        # If no phone was provided initially, we should reject or accept depending on policy.
        # Here we require an exact match if a phone was provided.
        if db_case.reporter_phone and db_case.reporter_phone != reporter_phone:
            return None
            
        return db_case
