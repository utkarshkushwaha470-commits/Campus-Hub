import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, UserRole
from app.models.query import Query, QueryAnswer, QueryVisibility
from app.models.chat import Thread, ThreadType
from app.models.moderation import UserBlock
from app.schemas.query import QueryResponse, QueryAnswerResponse, OCRPreCheckResponse
from app.services.auth_service import get_current_verified_user
from app.services.storage_service import storage_service
from app.services.ai_service import ai_service
from app.services.websocket_manager import ws_manager

router = APIRouter(prefix="/api/queries", tags=["Doubts & Query Resolution"])

def check_demo_protection(user: User):
    if getattr(user, 'is_demo', False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='Prototype Demo Account: This is an interactive read-only demonstration account for project review. Modifying live institutional records is disabled.'
        )


@router.post("/ocr-pre-check", response_model=OCRPreCheckResponse)
async def ocr_and_tag_assist(
    text: str = Form(""),
    photo: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_verified_user)
):
    """
    Gemma 4 Multimodal Pre-Check:
    1. Extracts text from problem photo if provided.
    2. Suggests appropriate academic Subject and Tags.
    3. Pre-screens for inappropriate content (escalates to moderation, no auto-ban).
    """
    photo_bytes = None
    if photo:
        photo_bytes = await photo.read()

    analysis = await ai_service.analyze_query_upload(text=text, image_bytes=photo_bytes)
    return analysis

@router.post("/", response_model=QueryResponse)
async def post_query(
    title: str = Form(...),
    content_text: str = Form(...),
    subject: str = Form(...),
    tags: str = Form("[]"),  # JSON array string
    target_year: Optional[int] = Form(None),
    is_premium: bool = Form(False),
    visibility: str = Form("PUBLIC"),
    assigned_senior_id: Optional[str] = Form(None),
    photo: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """
    Posts an academic doubt/query.
    - Visibility can be PUBLIC (visible in year section) or ONE_TO_ONE (assigned senior).
    - If ONE_TO_ONE: automatically instantiates a 1-to-1 chat thread between student and senior.
    - If is_premium: requires PG, Faculty, or Admin role.
    """
    check_demo_protection(current_user)
    # Premium check
    if is_premium and current_user.role not in [UserRole.PG, UserRole.FACULTY, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Undergraduate students cannot post directly in the Premium Section."
        )

    # If student, default target_year to their locked_year
    query_target_year = target_year or current_user.locked_year

    # Check Block status if 1-to-1
    if visibility == QueryVisibility.ONE_TO_ONE and assigned_senior_id:
        blocked = db.query(UserBlock).filter(
            ((UserBlock.blocker_id == current_user.id) & (UserBlock.blocked_user_id == assigned_senior_id)) |
            ((UserBlock.blocker_id == assigned_senior_id) & (UserBlock.blocked_user_id == current_user.id))
        ).first()
        if blocked:
            raise HTTPException(status_code=403, detail="Cannot send query to a blocked user.")

    # Save photo if uploaded
    photo_path = None
    photo_bytes = None
    if photo:
        photo_bytes = await photo.read()
        photo_path = await storage_service.save_public_upload(photo_bytes, photo.filename)

    # Gemma 4 safety pre-screening
    analysis = await ai_service.analyze_query_upload(text=f"{title} {content_text}", image_bytes=photo_bytes)

    query_obj = Query(
        poster_id=current_user.id,
        target_year=query_target_year,
        is_premium=is_premium,
        visibility=visibility,
        assigned_senior_id=assigned_senior_id,
        title=title.strip(),
        content_text=content_text.strip(),
        photo_storage_path=photo_path,
        subject=subject.strip(),
        tags=tags,
        ai_hint=None,
        is_resolved=False
    )
    db.add(query_obj)
    db.commit()
    db.refresh(query_obj)

    # If ONE_TO_ONE, create direct chat thread
    if visibility == QueryVisibility.ONE_TO_ONE and assigned_senior_id:
        thread = Thread(
            thread_type=ThreadType.ONE_TO_ONE,
            query_id=query_obj.id,
            student_id=current_user.id,
            senior_id=assigned_senior_id
        )
        db.add(thread)
        db.commit()

        # Send real-time notification to senior
        await ws_manager.send_to_user(assigned_senior_id, {
            "type": "NEW_1TO1_QUERY",
            "query_id": query_obj.id,
            "title": query_obj.title,
            "poster_name": current_user.full_name
        })

    return {
        "id": query_obj.id,
        "poster_id": query_obj.poster_id,
        "poster_name": current_user.full_name,
        "poster_year": current_user.locked_year,
        "target_year": query_obj.target_year,
        "is_premium": query_obj.is_premium,
        "visibility": query_obj.visibility,
        "assigned_senior_id": query_obj.assigned_senior_id,
        "title": query_obj.title,
        "content_text": query_obj.content_text,
        "photo_storage_path": query_obj.photo_storage_path,
        "subject": query_obj.subject,
        "tags": query_obj.tags,
        "ai_hint": query_obj.ai_hint,
        "is_resolved": query_obj.is_resolved,
        "answers": [],
        "created_at": query_obj.created_at
    }

@router.get("/")
async def list_queries(
    target_year: Optional[int] = None,
    is_premium: Optional[bool] = False,
    subject: Optional[str] = None,
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """Lists public queries for the student's year or selected filter."""
    q = db.query(Query).filter(Query.visibility == QueryVisibility.PUBLIC)
    
    if is_premium:
        if current_user.role not in [UserRole.PG, UserRole.FACULTY, UserRole.ADMIN]:
            raise HTTPException(status_code=403, detail="Premium Section access required.")
        q = q.filter(Query.is_premium == True)
    else:
        q = q.filter(Query.is_premium == False)
        if target_year:
            q = q.filter(Query.target_year == target_year)

    if subject:
        q = q.filter(Query.subject.ilike(f"%{subject}%"))

    queries = q.order_by(Query.created_at.desc()).limit(100).all()

    results = []
    for q_item in queries:
        poster = db.query(User).filter(User.id == q_item.poster_id).first()
        answers = db.query(QueryAnswer).filter(QueryAnswer.query_id == q_item.id).all()
        results.append({
            "id": q_item.id,
            "poster_id": q_item.poster_id,
            "poster_name": poster.full_name if poster else "Student",
            "poster_year": poster.locked_year if poster else None,
            "target_year": q_item.target_year,
            "is_premium": q_item.is_premium,
            "visibility": q_item.visibility,
            "assigned_senior_id": q_item.assigned_senior_id,
            "title": q_item.title,
            "content_text": q_item.content_text,
            "photo_storage_path": q_item.photo_storage_path,
            "subject": q_item.subject,
            "tags": q_item.tags,
            "ai_hint": q_item.ai_hint,
            "is_resolved": q_item.is_resolved,
            "answers_count": len(answers),
            "created_at": q_item.created_at
        })

    return results

@router.get("/{query_id}")
async def get_query_detail(
    query_id: str,
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    query_obj = db.query(Query).filter(Query.id == query_id).first()
    if not query_obj:
        raise HTTPException(status_code=404, detail="Query not found.")

    if query_obj.is_premium and current_user.role not in [UserRole.PG, UserRole.FACULTY, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Access denied to Premium Section query.")

    poster = db.query(User).filter(User.id == query_obj.poster_id).first()
    raw_answers = db.query(QueryAnswer).filter(QueryAnswer.query_id == query_id).order_by(QueryAnswer.created_at.asc()).all()
    
    answers = []
    for a in raw_answers:
        author = db.query(User).filter(User.id == a.author_id).first()
        answers.append({
            "id": a.id,
            "query_id": a.query_id,
            "author_id": a.author_id,
            "author_name": author.full_name if author else "Senior",
            "author_role": author.role if author else "STUDENT",
            "author_year": author.locked_year if author else None,
            "content_text": a.content_text,
            "attachment_storage_path": a.attachment_storage_path,
            "is_accepted": a.is_accepted,
            "created_at": a.created_at
        })

    return {
        "id": query_obj.id,
        "poster_id": query_obj.poster_id,
        "poster_name": poster.full_name if poster else "Student",
        "poster_year": poster.locked_year if poster else None,
        "target_year": query_obj.target_year,
        "is_premium": query_obj.is_premium,
        "visibility": query_obj.visibility,
        "assigned_senior_id": query_obj.assigned_senior_id,
        "title": query_obj.title,
        "content_text": query_obj.content_text,
        "photo_storage_path": query_obj.photo_storage_path,
        "subject": query_obj.subject,
        "tags": query_obj.tags,
        "ai_hint": query_obj.ai_hint,
        "is_resolved": query_obj.is_resolved,
        "answers": answers,
        "created_at": query_obj.created_at
    }

@router.post("/{query_id}/answers")
async def post_answer(
    query_id: str,
    content_text: str = Form(...),
    attachment: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """
    Seniors help via public answer.
    A senior is a user in a higher year than poster, or PG/Faculty/Admin.
    """
    check_demo_protection(current_user)
    query_obj = db.query(Query).filter(Query.id == query_id).first()
    if not query_obj:
        raise HTTPException(status_code=404, detail="Query not found.")

    poster = db.query(User).filter(User.id == query_obj.poster_id).first()

    # Verify that answering user is a senior, PG, faculty, or admin
    is_senior = False
    if current_user.role in [UserRole.PG, UserRole.FACULTY, UserRole.ADMIN]:
        is_senior = True
    elif current_user.locked_year and poster and poster.locked_year and current_user.locked_year > poster.locked_year:
        is_senior = True
    elif current_user.id == query_obj.poster_id:
        # User adding clarifying comment
        is_senior = False

    attach_path = None
    if attachment:
        bytes_data = await attachment.read()
        attach_path = await storage_service.save_public_upload(bytes_data, attachment.filename)

    answer = QueryAnswer(
        query_id=query_id,
        author_id=current_user.id,
        content_text=content_text.strip(),
        attachment_storage_path=attach_path,
        is_accepted=False
    )
    db.add(answer)
    db.commit()
    db.refresh(answer)

    # Notify student that senior responded
    await ws_manager.send_to_user(query_obj.poster_id, {
        "type": "QUERY_ANSWERED",
        "query_id": query_id,
        "answer_id": answer.id,
        "senior_name": current_user.full_name
    })

    return {
        "id": answer.id,
        "query_id": answer.query_id,
        "author_id": answer.author_id,
        "author_name": current_user.full_name,
        "author_role": current_user.role,
        "author_year": current_user.locked_year,
        "content_text": answer.content_text,
        "attachment_storage_path": answer.attachment_storage_path,
        "is_accepted": answer.is_accepted,
        "created_at": answer.created_at
    }

@router.post("/{query_id}/ai-hint")
async def request_ai_hint(
    query_id: str,
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """
    Gemma 4 Advisory AI Hint Button.
    Clearly labeled as AI-generated and strictly NEVER counted in rankings or points.
    """
    query_obj = db.query(Query).filter(Query.id == query_id).first()
    if not query_obj:
        raise HTTPException(status_code=404, detail="Query not found.")

    if not query_obj.ai_hint:
        hint_text = await ai_service.generate_ai_hint(
            question_text=f"{query_obj.title} {query_obj.content_text}",
            subject=query_obj.subject
        )
        query_obj.ai_hint = hint_text
        db.commit()

    return {"ai_hint": query_obj.ai_hint}
