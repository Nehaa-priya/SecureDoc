# SecureDoc – Threat Model

## 1. Overview

SecureDoc is a document management application that allows users to upload, view, download, and delete their documents. It includes administrator functions and audit logging.

This document identifies important security threats, their possible impact, and the protections implemented in the application.

## 2. Important Assets

- User email addresses and password hashes
- JWT authentication tokens
- Uploaded documents
- User roles and account status
- Audit log records
- Database records

## 3. Potential Threats and Mitigations

| Threat | Possible Impact | Protection |
|---|---|---|
| Unauthorized login | Access to user accounts | Password hashing and JWT authentication |
| Password exposure | Account compromise | Argon2 password hashing |
| Role escalation | Normal user gains admin access | Public registration assigns the user role on the server |
| Unauthorized admin access | Access to admin functions | Admin-only authorization checks |
| Cross-user document access (IDOR) | Exposure of another user's files | Document queries check ownership |
| Malicious file upload | Unsafe files stored on server | Extension, content type, signature, and size validation |
| Oversized file upload | Excessive storage or resource use | 5 MB upload limit |
| Disabled account login | Unauthorized account use | Login and authentication check account status |
| Unauthorized data modification | Loss of document or account integrity | Authentication and ownership checks |

## 4. Trust Boundaries

- The frontend is treated as untrusted input.
- Authentication and authorization are enforced by the backend.
- Users must not be able to choose their own roles during registration.
- Document ownership is checked on the server.
- Uploaded files are stored outside the frontend public directory.
- Administrative actions are restricted to authorized administrators.

## 5. Security Testing

The following checks were performed during development:

- Verified that unauthenticated requests are rejected.
- Verified that normal users receive HTTP 403 when accessing admin-only endpoints.
- Verified that users cannot download another user's document.
- Verified that invalid file types are rejected.
- Verified that files larger than 5 MB are rejected.
- Verified that disabled accounts cannot log in.
- Verified that document and user-management activities appear in audit logs.

## 6. Known Limitations and Future Improvements

- Add malware scanning for uploaded files.
- Add login and upload rate limiting.
- Use a production database and persistent cloud file storage.
- Add automated security tests for authorization and file handling.
- Configure HTTPS and production CORS settings.
- Improve audit log protection and monitoring.
- Consider token revocation and stronger session management.

## 7. Conclusion

SecureDoc implements basic authentication, role-based authorization, document ownership checks, file validation, and audit logging. Further security hardening and independent security testing are required before production use.
