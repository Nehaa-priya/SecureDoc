# SecureDoc – AI Prompt Log

AI tool used: ChatGPT

Date: 12 November 2026

The following records summarize the AI assistance used during SecureDoc development.

## Prompt 1 – Authentication Implementation

**Date:** 12 November 2026

**Request summary:** Get step-by-step guidance to implement user registration, login, password hashing, and JWT authentication using FastAPI.

**AI assistance:** Provided guidance for authentication schemas, password hashing with Argon2, token creation, and protected endpoints.

**Outcome:** Registration and login were implemented and tested locally.

## Prompt 2 – Role-Based Access Control

**Date:** 12 November 2026

**Request summary:** Implement administrator-only access and verify that normal users cannot access administrator endpoints.

**AI assistance:** Helped implement an administrator dependency and protect user-management APIs.

**Outcome:** A normal user received HTTP 403 when attempting to access the admin users endpoint.

## Prompt 3 – Document Ownership and Access Control

**Date:** 12 November 2026

**Request summary:** Implement secure document listing, downloading, and deletion so users can access only their own documents.

**AI assistance:** Provided endpoint implementation guidance using the authenticated user's ID to filter document records.

**Outcome:** Cross-user document download was tested and rejected with HTTP 404.

## Prompt 4 – Audit Logging

**Date:** 12 November 2026

**Request summary:** Add audit logs for document operations and administrator user-management activities.

**AI assistance:** Helped implement audit log database records and an administrator-only audit log endpoint.

**Outcome:** Upload, download, delete, activation, and deactivation events were visible in the audit logs.

## Prompt 5 – File Upload Validation

**Date:** 12 November 2026

**Request summary:** Validate uploaded document types and restrict file size to 5 MB.

**AI assistance:** Helped implement extension, content-type, file-signature, and file-size checks.

**Outcome:** Invalid file types and files larger than 5 MB were rejected during testing.

## AI Usage Reflection

AI was used as a development assistant for implementation guidance, debugging, and testing ideas. The generated code was integrated and tested locally. The developer reviewed the implementation and performed manual API and frontend checks.

AI assistance did not replace application testing or independent security review.
