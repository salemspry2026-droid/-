# Flowexa Android Native Architecture (v2.0.0)

## 1. Overview
Flowexa Android is a 100% genuine Native Android application written in **Kotlin**, **Jetpack Compose**, and **Material 3**. It operates on an **Offline-First** model where the local **Room Database** is the single source of truth for the UI, while **Firebase Firestore** (using custom Database ID: `ai-studio-c5fd0d2f-b8be-4e45-a37c-45e344ff21a9`) serves as the remote synchronization server.

```
┌────────────────────────────────────────────────────────┐
│                   Flowexa Compose UI                   │
│         (Arabic RTL, Material 3, Single Activity)      │
└───────────────────────────┬────────────────────────────┘
                            │ observes StateFlow / Flow
                            ▼
┌────────────────────────────────────────────────────────┐
│                      ViewModels                        │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│                     Repositories                       │
│    (AuthRepository, OrderRepository, ProductRepo, etc) │
└─────────────┬────────────────────────────┬─────────────┘
              │ writes / reads             │ writes Outbox
              ▼                            ▼
┌───────────────────────────┐   ┌────────────────────────┐
│    Local Room Database    │   │  sync_operations table │
│ (Single Source of Truth)  │   │     (Outbox Queue)     │
└───────────────────────────┘   └──────────┬─────────────┘
                                           │
                                           ▼
                                ┌────────────────────────┐
                                │   SyncEngine / Worker  │
                                │      (WorkManager)     │
                                └──────────┬─────────────┘
                                           │ when ONLINE
                                           ▼
                                ┌────────────────────────┐
                                │   Firebase Firestore   │
                                └────────────────────────┘
```

## 2. Key Architectural Decisions
- **No WebViews:** All interfaces (Auth, Dashboard, Products, Customers, Orders, Settings, Client Catalog) are native Jetpack Compose composables.
- **RTL Arabic First:** Top-level `CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Rtl)` guarantees native Arabic layout.
- **Named Firestore Database:** Connected specifically to `ai-studio-c5fd0d2f-b8be-4e45-a37c-45e344ff21a9` to ensure identical multi-tenant business data access between Web and Android.
- **Outbox Pattern for Mutations:** Any offline action (creating an order, editing a product, updating customer notes) immediately persists in Room and inserts a row in `sync_operations` with status `PENDING`. As soon as network connectivity is detected, `SyncWorker` executes and syncs pending changes in order.
- **Native Authentication:**
  - Email/Password authentication with separate Login and Register flows.
  - Google Authentication using Android Credential Manager API (no WebView popup hack).
  - Firebase Email Link deep-link handling.

## 3. Room Database Schema
- `user_profiles`: Cached user metadata, company association, permissions, and roles.
- `companies`: Company details, primary/secondary currencies, units, and contact info.
- `products`: Complete catalog with prices, stock status, and bonus rules (fixed percent / tiered).
- `customers`: Customer records with phone numbers, addresses, and CRM notes.
- `orders`: Master orders with multi-currency totals and lifecycle statuses.
- `order_items`: Line items with quantities, prices, and automated bonus units.
- `notifications`: Notifications for orders and system alerts.
- `call_recordings`: Local voice memo records and timestamps.
- `sync_operations`: Queue table for offline transactions.

## 4. Release and CI Pipeline
- Automated Gradle build via `.github/workflows/build-native-android.yml`
- JDK 17, AGP 8.7+, Gradle 8.7
- Outputs `Flowexa.apk` and releases to GitHub Releases.
