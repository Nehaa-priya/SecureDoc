# SecureDoc

A secure document management application with user authentication, role-based access control, and audit logging.

## Features

- User registration and login
- Secure password hashing using Argon2
- JWT-based authentication
- Role-based access control
- Secure document upload (PDF, JPG, JPEG, PNG)
- Maximum file upload size of 5 MB
- View, download, and delete documents
- Users can access only their own documents
- Admin dashboard to view and manage users
- Activate and deactivate user accounts
- Audit logs for document and user-management activities

## Technology Stack

| Component | Technology |
|---|---|
| Frontend | React, Vite, CSS |
| Backend | Python, FastAPI |
| Database | SQLite |
| ORM | SQLAlchemy |
| Authentication | JWT |
| Password Hashing | Argon2 |

## Project Structure

```text
SecureDoc/
├── backend/
│   ├── auth.py
│   ├── database.py
│   ├── main.py
│   ├── models.py
│   ├── schemas.py
│   └── requirements.txt
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   └── main.jsx
│   └── package.json
├── .gitignore
├── README.md
├── THREATS.md
└── PROMPTS.md
```

## Installation and Setup

### 1. Clone the repository

```powershell
git clone https://github.com/Nehaa-priya/SecureDoc.git
cd SecureDoc
```

### 2. Start the Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Set a secret key:

```powershell
$env:SECRET_KEY = python -c "import secrets; print(secrets.token_urlsafe(32))"
```

Start the API:

```powershell
python -m uvicorn main:app
```

Backend URL: http://127.0.0.1:8000

API documentation: http://127.0.0.1:8000/docs

### 3. Start the Frontend

Open another PowerShell terminal:

```powershell
cd SecureDoc\frontend
npm install
npm run dev
```

Frontend URL: http://localhost:5173

## Security Measures

- Passwords are hashed before database storage.
- JWT tokens protect authenticated endpoints.
- Administrator endpoints require administrator privileges.
- Public registration assigns the standard user role.
- Documents are restricted to their owners.
- Uploaded files are validated by extension, content type, file signature, and size.
- Uploaded documents are stored outside the frontend public directory.
- Important document and user-management activities are recorded in audit logs.

## Current Limitations

- SQLite is currently used for local development.
- Production database and persistent cloud file storage require configuration.
- The application has not undergone an independent security audit.

## Project Status

Core authentication, document management, administrator functions, and audit logging have been implemented and tested locally.

**Repository:** https://github.com/Nehaa-priya/SecureDoc
