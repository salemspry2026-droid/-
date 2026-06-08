# Project Architecture
This project is a multi-tenant SaaS application built with Next.js App Router, Tailwind CSS, and Firebase (Firestore & Auth).

## Directories
- `/app`: Next.js App Router pages and layouts.
- `/components`: React UI components. Features are somewhat monolithic within these files.
- `/lib`: Utility functions and Firebase configuration.
- `/hooks`: Custom React hooks (if any).

## Context / State
- Zustand is used for global state management (`lib/store.ts`).

## Services & Data Access
- Currently, logic and database queries are tightly coupled within UI components. 
- *Refactoring Plan:* Will be moved to `/src/repositories/` and `/src/services/`.

## Auth & Security
- Managed by Firebase Auth & Firestore rules.
- Multi-tenant data segregation using `companyId`.
