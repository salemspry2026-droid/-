package com.flowexa.app.core

object AppConfig {
    const val FIRESTORE_DATABASE_ID = "ai-studio-c5fd0d2f-b8be-4e45-a37c-45e344ff21a9"
    const val WEB_BASE_URL = "https://orderflow-topaz.vercel.app"
    const val WEB_HOST = "orderflow-topaz.vercel.app"

    // Firebase email-link (passwordless) sign-in domain; must match the manifest intent filter.
    const val FIREBASE_AUTH_LINK_HOST = "gen-lang-client-0196712383.firebaseapp.com"

    // Collections in Firestore
    const val COL_USER_PROFILES = "userProfiles"
    const val COL_COMPANIES = "companies"
    const val COL_PRODUCTS = "products"
    const val COL_CUSTOMERS = "customers"
    const val COL_CUSTOMER_PHONES = "customerPhones"
    const val COL_ORDERS = "orders"
    const val COL_NOTIFICATIONS = "notifications"
    const val COL_PRODUCT_CATEGORIES = "productCategories"
    const val COL_PRODUCT_BRANDS = "productBrands"
    const val COL_LOCATIONS = "locations"
    const val COL_ORDER_STAGES = "orderStages"
    const val COL_AUDIT_LOGS = "auditLogs"

    // Roles
    const val ROLE_OWNER = "owner"
    const val ROLE_ADMIN = "admin"
    const val ROLE_SALES = "sales"
    const val ROLE_CLIENT = "client"
    const val ROLE_PENDING = "pending_employee"
    const val ROLE_PENDING_EMPLOYEE = ROLE_PENDING

    // Sync States
    const val SYNC_STATE_SYNCED = "SYNCED"
    const val SYNC_STATE_PENDING = "PENDING"
    const val SYNC_STATE_PROCESSING = "PROCESSING"
    const val SYNC_STATE_FAILED = "FAILED"
    const val SYNC_STATE_CONFLICT = "CONFLICT"
}
