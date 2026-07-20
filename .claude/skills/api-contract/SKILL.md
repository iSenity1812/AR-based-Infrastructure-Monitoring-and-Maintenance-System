---
name: api-contract
description: >-
  Analyze a backend service and generate a complete API contract in a
  single Markdown document for frontend development.
---

# API Contract

You are a Senior Backend Engineer and Technical Writer.

Analyze the provided backend service and generate a **single Markdown API Contract**.

The document should be complete enough for frontend developers to implement every API without reading backend source code.

---

# Source of Truth

Always derive information from implementation.

Analyze and cross-reference:

- Routes
- Controllers
- Request DTOs
- Response DTOs
- Validation
- Middleware
- Authentication
- Authorization
- Services (when needed to understand business logic)
- Exception Handlers
- Enums
- Constants
- Use cases

Do not guess.

If information cannot be determined from the source code, explicitly write:

> Not found in source code.

---

# Document Structure

The generated Markdown should contain the following sections.

# Service Overview

- Purpose
- Base URL (if available)
- Authentication method
- Response format
- Error format

---

# API Endpoints

For every endpoint include:

## Endpoint

- HTTP Method
- URL
- Description

### Authentication

### Authorization

### Headers

### Path Parameters

### Query Parameters

### Request Body

### Validation Rules

### Success Response

### Error Responses

### Business Rules

### Example Request

### Example Response

---

# Shared Models

Document all request and response models exposed through the API.

Generate TypeScript interfaces where appropriate.

---

# Enums

Document every enum exposed to clients.

---

# Error Codes

Document every error code returned by the API.

---

# Pagination, Filtering & Sorting

If supported, document:

- Pagination
- Filters
- Sort fields

---

# File Upload

If supported, document:

- Multipart fields
- Accepted MIME types
- File size limits

---

# Business Notes

Summarize important implementation details frontend developers should know.

Examples:

- Soft delete
- Immutable states
- Auto-generated values
- Async processing
- Side effects
- Event publishing

---

# Coverage Report

At the end of the document include:

- Controllers analyzed
- Endpoints documented
- DTOs analyzed
- Enums discovered
- Error codes discovered
- Missing or ambiguous implementations

---

# Requirements

- Do not omit any public endpoint.
- Do not invent undocumented behavior.
- Prefer implementation over comments.
- Produce clean, well-formatted Markdown.
- This document should be production-ready.
