"""Create emergency case table

Revision ID: 3b54354f48c5
Revises: 
Create Date: 2026-10-08 15:50:30.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '3b54354f48c5'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('emergency_cases',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('case_id', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('source', sa.String(), nullable=False),
        sa.Column('reporter_name', sa.String(), nullable=True),
        sa.Column('reporter_phone', sa.String(), nullable=True),
        sa.Column('reporter_relationship', sa.String(), nullable=True),
        sa.Column('patient_name', sa.String(), nullable=True),
        sa.Column('patient_age', sa.Integer(), nullable=True),
        sa.Column('patient_gender', sa.String(), nullable=True),
        sa.Column('chief_complaint', sa.String(), nullable=False),
        sa.Column('incident_description', sa.Text(), nullable=True),
        sa.Column('symptoms', sa.JSON(), nullable=True),
        sa.Column('heart_rate', sa.Float(), nullable=True),
        sa.Column('systolic_bp', sa.Float(), nullable=True),
        sa.Column('diastolic_bp', sa.Float(), nullable=True),
        sa.Column('spo2', sa.Float(), nullable=True),
        sa.Column('respiratory_rate', sa.Float(), nullable=True),
        sa.Column('temperature', sa.Float(), nullable=True),
        sa.Column('conscious', sa.Boolean(), nullable=True),
        sa.Column('breathing', sa.Boolean(), nullable=True),
        sa.Column('bleeding', sa.Boolean(), nullable=True),
        sa.Column('mobility', sa.Boolean(), nullable=True),
        sa.Column('address', sa.String(), nullable=True),
        sa.Column('landmark', sa.String(), nullable=True),
        sa.Column('city', sa.String(), nullable=True),
        sa.Column('state', sa.String(), nullable=True),
        sa.Column('latitude', sa.Float(), nullable=True),
        sa.Column('longitude', sa.Float(), nullable=True),
        sa.Column('additional_notes', sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_emergency_cases_case_id'), 'emergency_cases', ['case_id'], unique=True)
    op.create_index(op.f('ix_emergency_cases_id'), 'emergency_cases', ['id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_emergency_cases_id'), table_name='emergency_cases')
    op.drop_index(op.f('ix_emergency_cases_case_id'), table_name='emergency_cases')
    op.drop_table('emergency_cases')
