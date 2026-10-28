from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.user import User, RoleEnum
from app.schemas.auth import UserOut
from app.routers.auth import get_current_authenticated_user, build_user_out

router = APIRouter(prefix="/users", tags=["Users & Faculty"])

@router.get("/faculty-and-seniors", response_model=List[UserOut])
async def list_faculty_and_seniors(
    current_user: User = Depends(get_current_authenticated_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns verified Faculty, Passouts (Alumni), and 3rd/4th year Seniors
    for direct guidance / private doubt selection.
    """
    res = await db.execute(
        select(User).where(
            User.is_verified == True,
            User.role.in_([RoleEnum.FACULTY, RoleEnum.PASSOUT, RoleEnum.STUDENT_3, RoleEnum.STUDENT_4])
        )
    )
    users = res.scalars().all()
    return [build_user_out(u) for u in users]
