# Cleanup & Refactoring Plan

## Phase 1: Code Review & ESLint Fixes
- [x] Identify unescaped entities
- [x] Fix ESLint warnings for image tags and hooks
- [x] Generate initial documentation

## Phase 2: Structural Refactoring (Repository Pattern)
- [x] Create `repositories/` folder
- [x] Implement `CompanyRepository`, `CustomerRepository`, `ProductRepository`, `OrderRepository`
- [x] Move direct Firebase calls from UI components into repositories
- [x] Implement `services/` layer to handle business logic (e.g., join requests, order confirmation)

## Phase 3: Performance & Caching
- [x] Introduce pagination/infinite scroll for large lists (Orders, Customers)
- [x] Add basic client-side caching (SWR or React Query) for static-like data (settings, metadata)
- [x] Review and apply Firestore composite indexes

## Phase 4: UI/UX & Metrics
- [x] Ensure aggregate queries are used for dashboard analytics instead of client-side filtering of large datasets
- [x] Refine table views and add filtering/sorting abstractions
