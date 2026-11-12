
import os
from pathlib import Path
from uuid import uuid4

from fastapi import (
    FastAPI,
    Depends,
    HTTPException,
    UploadFile,
    File
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from database import get_db, engine, Base
from models import User, Document, AuditLog
from schemas import UserRegister, UserResponse
from auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
    get_current_admin
)

import models


# -------------------------------
# Application Configuration
# -------------------------------

app = FastAPI(
    title="SecureDoc - Secure Document Management",
    description="A secure document management platform with authentication, role-based access control, and audit logging.",
    version="1.0.0"
)

Base.metadata.create_all(bind=engine)


# -------------------------------
# CORS Configuration
# -------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv(
        "FRONTEND_URL",
        "http://localhost:5173"
    ).split(","),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Content-Type", "Authorization"],
)


# -------------------------------
# File Storage Configuration
# -------------------------------

MAX_FILE_SIZE = 5 * 1024 * 1024

UPLOAD_DIR = (
    Path(__file__).resolve().parent
    / "storage"
    / "documents"
)

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


# -------------------------------
# Home and Health Endpoints
# -------------------------------

@app.get("/")
def home():
    return {
        "message": "Welcome to SecureDoc API",
        "status": "running"
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "application": "SecureDoc"
    }


# -------------------------------
# User Registration
# -------------------------------

@app.post("/register", response_model=UserResponse)
def register_user(
    data: UserRegister,
    db: Session = Depends(get_db)
):
    existing_user = db.query(User).filter(
        User.email == data.email
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    new_user = User(
        email=data.email,
        hashed_password=hash_password(data.password),
        role="user"
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user


# -------------------------------
# User Login
# -------------------------------

@app.post("/login")
def login_user(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(
        User.email == form_data.username
    ).first()

    if not user or not verify_password(
        form_data.password,
        user.hashed_password
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=403,
            detail="Account is disabled"
        )

    access_token = create_access_token({
        "sub": str(user.id),
        "role": user.role
    })

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


# -------------------------------
# Current User Profile
# -------------------------------

@app.get("/me")
def get_my_profile(
    current_user: User = Depends(get_current_user)
):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "role": current_user.role,
        "is_active": current_user.is_active
    }


# -------------------------------
# Upload Document
# -------------------------------

@app.post("/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    allowed_types = {
        ".pdf": ("application/pdf", b"%PDF-"),
        ".jpg": ("image/jpeg", b"\xff\xd8\xff"),
        ".jpeg": ("image/jpeg", b"\xff\xd8\xff"),
        ".png": ("image/png", b"\x89PNG\r\n\x1a\n")
    }

    original_name = (
        (file.filename or "")
        .replace("\\", "/")
        .split("/")[-1]
    )

    extension = Path(original_name).suffix.lower()

    if extension not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail="Only PDF, JPG, JPEG and PNG files are allowed"
        )

    expected_type, signature = allowed_types[extension]

    if file.content_type != expected_type:
        raise HTTPException(
            status_code=400,
            detail="File content type does not match its extension"
        )

    content = await file.read(MAX_FILE_SIZE + 1)

    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail="File size must not exceed 5 MB"
        )

    if not content.startswith(signature):
        raise HTTPException(
            status_code=400,
            detail="Invalid file content"
        )

    stored_name = f"{uuid4().hex}{extension}"
    file_path = UPLOAD_DIR / stored_name

    document = Document(
        filename=original_name,
        stored_filename=stored_name,
        content_type=expected_type,
        file_size=len(content),
        owner_id=current_user.id
    )

    try:
        file_path.write_bytes(content)

        db.add(document)
        db.flush()

        db.add(AuditLog(
            actor_id=current_user.id,
            action="DOCUMENT_UPLOADED",
            resource_type="document",
            resource_id=document.id,
            details="Document uploaded successfully"
        ))

        db.commit()
        db.refresh(document)

    except Exception:
        db.rollback()

        if file_path.exists():
            file_path.unlink()

        raise HTTPException(
            status_code=500,
            detail="Document upload failed"
        )

    return {
        "message": "Document uploaded successfully",
        "document_id": document.id,
        "filename": document.filename,
        "file_size": document.file_size
    }


# -------------------------------
# List User Documents
# -------------------------------

@app.get("/documents")
def list_documents(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    documents = db.query(Document).filter(
        Document.owner_id == current_user.id
    ).order_by(
        Document.uploaded_at.desc()
    ).all()

    return [
        {
            "id": doc.id,
            "filename": doc.filename,
            "content_type": doc.content_type,
            "file_size": doc.file_size,
            "uploaded_at": doc.uploaded_at
        }
        for doc in documents
    ]


# -------------------------------
# Download Document
# -------------------------------

@app.get("/documents/{document_id}/download")
def download_document(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.owner_id == current_user.id
    ).first()

    if not document:
        raise HTTPException(
            status_code=404,
            detail="Document not found"
        )

    file_path = UPLOAD_DIR / document.stored_filename

    if not file_path.is_file():
        raise HTTPException(
            status_code=404,
            detail="Stored file not found"
        )

    db.add(AuditLog(
        actor_id=current_user.id,
        action="DOCUMENT_DOWNLOADED",
        resource_type="document",
        resource_id=document.id,
        details="Document downloaded"
    ))

    db.commit()

    return FileResponse(
        path=file_path,
        media_type=document.content_type,
        filename=document.filename
    )


# -------------------------------
# Delete Document
# -------------------------------

@app.delete("/documents/{document_id}")
def delete_document(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.owner_id == current_user.id
    ).first()

    if not document:
        raise HTTPException(
            status_code=404,
            detail="Document not found"
        )

    file_path = UPLOAD_DIR / document.stored_filename

    db.add(AuditLog(
        actor_id=current_user.id,
        action="DOCUMENT_DELETED",
        resource_type="document",
        resource_id=document.id,
        details="Document deleted"
    ))

    db.delete(document)
    db.commit()

    if file_path.is_file():
        file_path.unlink()

    return {
        "message": "Document deleted successfully",
        "document_id": document_id
    }


# -------------------------------
# Admin - View All Users
# -------------------------------

@app.get("/admin/users")
def get_all_users(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    users = db.query(User).order_by(User.id).all()

    return [
        {
            "id": user.id,
            "email": user.email,
            "role": user.role,
            "is_active": user.is_active,
            "created_at": user.created_at
        }
        for user in users
    ]


# -------------------------------
# Admin - Activate / Deactivate
# -------------------------------

@app.put("/admin/users/{user_id}/status")
def update_user_status(
    user_id: int,
    is_active: bool,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(
        User.id == user_id
    ).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    if user.id == admin.id and not is_active:
        raise HTTPException(
            status_code=400,
            detail="Admin cannot deactivate their own account"
        )

    user.is_active = is_active

    db.add(AuditLog(
        actor_id=admin.id,
        action="USER_ACTIVATED" if is_active else "USER_DEACTIVATED",
        resource_type="user",
        resource_id=user.id,
        details="User account status changed by admin"
    ))

    db.commit()
    db.refresh(user)

    return {
        "message": "User status updated successfully",
        "user_id": user.id,
        "is_active": user.is_active
    }


# -------------------------------
# Admin - View Audit Logs
# -------------------------------

@app.get("/admin/audit-logs")
def get_audit_logs(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    logs = db.query(AuditLog).order_by(
        AuditLog.created_at.desc()
    ).all()

    return [
        {
            "id": log.id,
            "actor_id": log.actor_id,
            "action": log.action,
            "resource_type": log.resource_type,
            "resource_id": log.resource_id,
            "details": log.details,
            "created_at": log.created_at
        }
        for log in logs
    ]
