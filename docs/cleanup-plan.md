# Cleanup & Refactoring Plan

## Phase 1: Code Review & ESLint Fixes
- [x] Identify unescaped entities
- [x] Fix ESLint warnings for image tags and hooks
- [x] Generate initial documentation

## Phase 2: Structural Refactoring (Repository Pattern)
- [ ] Create `repositories/` folder
- [ ] Implement `CompanyRepository`, `CustomerRepository`, `ProductRepository`, `OrderRepository`
- [ ] Move direct Firebase calls from UI components into repositories
- [ ] Implement `services/` layer to handle business logic (e.g., join requests, order confirmation)

## Phase 3: Performance & Caching
- [ ] Introduce pagination/infinite scroll for large lists (Orders, Customers)
- [ ] Add basic client-side caching (SWR or React Query) for static-like data (settings, metadata)
- [ ] Review and apply Firestore composite indexes

## Phase 4: UI/UX & Metrics
- [ ] Ensure aggregate queries are used for dashboard analytics instead of client-side filtering of large datasets
- [ ] Refine table views and add filtering/sorting abstractions
