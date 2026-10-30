import uuid
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, UserRole
from app.models.group import CampusGroup, GroupMember, GroupMessage, GroupCategory
from app.models.admin_audit_log import AuditActionType
from app.services.auth_service import get_current_verified_user, require_roles
from app.services.audit_service import audit_service

router = APIRouter(prefix="/api/groups", tags=["Purpose Groups"])

def check_demo_protection(user: User):
    # Allow demo personas to test interactively
    pass


class CreateGroupRequest(BaseModel):
    name: str
    purpose: str
    category: Optional[str] = GroupCategory.SPECIAL_PURPOSE
    member_ids: Optional[List[str]] = []

class AddMemberRequest(BaseModel):
    user_id: str
    role_in_group: Optional[str] = "MEMBER"

class SendGroupMessageRequest(BaseModel):
    content_text: str
    attachment_url: Optional[str] = None

@router.get("")
@router.get("/")
async def list_groups(
    category: Optional[str] = None,
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """
    Returns groups.
    - Admins see all college groups.
    - Students see groups they are enrolled in.
    """
    if current_user.role == UserRole.ADMIN:
        query = db.query(CampusGroup).filter(CampusGroup.is_active == True)
    else:
        # Enrolled groups for the student
        member_group_ids = db.query(GroupMember.group_id).filter(GroupMember.user_id == current_user.id).all()
        group_ids = [gid[0] for gid in member_group_ids]
        query = db.query(CampusGroup).filter(CampusGroup.id.in_(group_ids), CampusGroup.is_active == True)

    if category:
        query = query.filter(CampusGroup.category == category)

    groups = query.order_by(CampusGroup.created_at.desc()).all()

    results = []
    for g in groups:
        member_count = db.query(GroupMember).filter(GroupMember.group_id == g.id).count()
        creator = db.query(User).filter(User.id == g.created_by_admin_id).first()
        is_member = db.query(GroupMember).filter(
            GroupMember.group_id == g.id,
            GroupMember.user_id == current_user.id
        ).first() is not None

        results.append({
            "id": g.id,
            "name": g.name,
            "purpose": g.purpose,
            "category": g.category,
            "created_by_name": creator.full_name if creator else "College Administration",
            "member_count": member_count,
            "is_member": is_member or (current_user.role == UserRole.ADMIN),
            "created_at": g.created_at
        })

    return results

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_group(
    req: CreateGroupRequest,
    request: Request,
    current_admin: User = Depends(require_roles([UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    """
    Admin-only endpoint to create a new purpose group.
    Sets explicit institutional purpose, assigns students, and logs action.
    """
    if not req.name.strip():
        raise HTTPException(status_code=400, detail="Group name is required.")
    if not req.purpose.strip():
        raise HTTPException(status_code=400, detail="Specific purpose description is required.")

    new_group = CampusGroup(
        id=str(uuid.uuid4()),
        name=req.name.strip(),
        purpose=req.purpose.strip(),
        category=req.category or GroupCategory.SPECIAL_PURPOSE,
        created_by_admin_id=current_admin.id,
        is_active=True
    )
    db.add(new_group)
    db.commit()

    # Add admin as ADMIN member
    admin_member = GroupMember(
        id=str(uuid.uuid4()),
        group_id=new_group.id,
        user_id=current_admin.id,
        role_in_group="ADMIN"
    )
    db.add(admin_member)

    # Add specified student members
    added_count = 0
    if req.member_ids:
        for uid in set(req.member_ids):
            if uid == current_admin.id:
                continue
            student = db.query(User).filter(User.id == uid).first()
            if student:
                member = GroupMember(
                    id=str(uuid.uuid4()),
                    group_id=new_group.id,
                    user_id=student.id,
                    role_in_group="MEMBER"
                )
                db.add(member)
                added_count += 1
    
    db.commit()

    client_ip = request.client.host if request.client else "127.0.0.1"
    audit_service.log_action(
        db=db,
        admin_id=current_admin.id,
        action_type=AuditActionType.CREATE_GROUP,
        target_entity="CAMPUS_GROUP",
        target_id=new_group.id,
        ip_address=client_ip,
        details={
            "group_name": new_group.name,
            "purpose": new_group.purpose,
            "category": new_group.category,
            "initial_member_count": added_count + 1
        }
    )

    return {
        "id": new_group.id,
        "name": new_group.name,
        "purpose": new_group.purpose,
        "category": new_group.category,
        "members_added": added_count,
        "message": f"Purpose group '{new_group.name}' successfully created with {added_count} student(s)."
    }

@router.get("/{group_id}")
async def get_group_details(
    group_id: str,
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """Returns group details, purpose, and roster of members."""
    group = db.query(CampusGroup).filter(CampusGroup.id == group_id, CampusGroup.is_active == True).first()
    if not group:
        raise HTTPException(status_code=404, detail="Campus group not found.")

    is_member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id
    ).first() is not None

    if not is_member and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="You are not a member of this purpose group.")

    # Fetch members with profiles
    memberships = db.query(GroupMember).filter(GroupMember.group_id == group_id).all()
    members_data = []
    for m in memberships:
        u = db.query(User).filter(User.id == m.user_id).first()
        if u:
            members_data.append({
                "membership_id": m.id,
                "user_id": u.id,
                "full_name": u.full_name,
                "email": u.email,
                "role": u.role,
                "locked_year": u.locked_year,
                "crn_or_roll_number": u.crn_or_roll_number,
                "role_in_group": m.role_in_group,
                "joined_at": m.joined_at
            })

    creator = db.query(User).filter(User.id == group.created_by_admin_id).first()

    return {
        "id": group.id,
        "name": group.name,
        "purpose": group.purpose,
        "category": group.category,
        "created_by_name": creator.full_name if creator else "College Administration",
        "created_at": group.created_at,
        "members": members_data,
        "is_admin_viewer": current_user.role == UserRole.ADMIN
    }

@router.post("/{group_id}/members")
async def add_group_member(
    group_id: str,
    req: AddMemberRequest,
    current_admin: User = Depends(require_roles([UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    """Admin-only: Add a student or faculty to a specific purpose group."""
    group = db.query(CampusGroup).filter(CampusGroup.id == group_id, CampusGroup.is_active == True).first()
    if not group:
        raise HTTPException(status_code=404, detail="Campus group not found.")

    target_user = db.query(User).filter(User.id == req.user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found.")

    existing = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == req.user_id
    ).first()
    if existing:
        return {"message": f"{target_user.full_name} is already a member of this group."}

    new_member = GroupMember(
        id=str(uuid.uuid4()),
        group_id=group_id,
        user_id=target_user.id,
        role_in_group=req.role_in_group or "MEMBER"
    )
    db.add(new_member)
    db.commit()

    return {
        "message": f"Added {target_user.full_name} ({target_user.crn_or_roll_number}) to '{group.name}'.",
        "user_id": target_user.id
    }

@router.delete("/{group_id}/members/{user_id}")
async def remove_group_member(
    group_id: str,
    user_id: str,
    current_admin: User = Depends(require_roles([UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    """Admin-only: Remove a user from a purpose group."""
    group = db.query(CampusGroup).filter(CampusGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Campus group not found.")

    membership = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == user_id
    ).first()
    if not membership:
        raise HTTPException(status_code=404, detail="Membership record not found.")

    db.delete(membership)
    db.commit()

    return {"message": "Member removed from group successfully."}

@router.get("/{group_id}/messages")
async def get_group_messages(
    group_id: str,
    limit: int = 100,
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """Returns messages and updates within a purpose group."""
    group = db.query(CampusGroup).filter(CampusGroup.id == group_id, CampusGroup.is_active == True).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found.")

    is_member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id
    ).first() is not None

    if not is_member and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Access denied. Must be a group member.")

    messages = db.query(GroupMessage).filter(
        GroupMessage.group_id == group_id
    ).order_by(GroupMessage.created_at.asc()).limit(limit).all()

    return [
        {
            "id": m.id,
            "group_id": m.group_id,
            "sender_id": m.sender_id,
            "sender_name": m.sender_name,
            "sender_role": m.sender_role,
            "content_text": m.content_text,
            "attachment_url": m.attachment_url,
            "is_me": m.sender_id == current_user.id,
            "created_at": m.created_at
        }
        for m in messages
    ]

@router.post("/{group_id}/messages")
async def post_group_message(
    group_id: str,
    req: SendGroupMessageRequest,
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """Post an update, instruction, or discussion message to the group."""
    group = db.query(CampusGroup).filter(CampusGroup.id == group_id, CampusGroup.is_active == True).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found.")

    is_member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id
    ).first() is not None

    if not is_member and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="You must be a group member to post.")

    if not req.content_text.strip():
        raise HTTPException(status_code=400, detail="Message content cannot be empty.")

    msg = GroupMessage(
        id=str(uuid.uuid4()),
        group_id=group_id,
        sender_id=current_user.id,
        sender_name=current_user.full_name,
        sender_role=current_user.role,
        content_text=req.content_text.strip(),
        attachment_url=req.attachment_url
    )
    db.add(msg)
    db.commit()

    return {
        "id": msg.id,
        "group_id": msg.group_id,
        "sender_id": msg.sender_id,
        "sender_name": msg.sender_name,
        "sender_role": msg.sender_role,
        "content_text": msg.content_text,
        "attachment_url": msg.attachment_url,
        "is_me": True,
        "created_at": msg.created_at
    }

@router.delete("/{group_id}")
async def delete_group(
    group_id: str,
    request: Request,
    current_admin: User = Depends(require_roles([UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    """Admin-only: Deactivate / delete a purpose group."""
    group = db.query(CampusGroup).filter(CampusGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found.")

    group.is_active = False
    db.commit()

    client_ip = request.client.host if request.client else "127.0.0.1"
    audit_service.log_action(
        db=db,
        admin_id=current_admin.id,
        action_type=AuditActionType.DELETE_GROUP,
        target_entity="CAMPUS_GROUP",
        target_id=group.id,
        ip_address=client_ip,
        details={"group_name": group.name}
    )

    return {"message": f"Purpose group '{group.name}' deactivated."}
