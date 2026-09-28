package com.flowexa.app.navigation

sealed class Routes(val route: String) {
    data object Splash : Routes("splash")
    data object Login : Routes("login")
    data object Register : Routes("register")
    data object ForgotPassword : Routes("forgot_password")
    data object Onboarding : Routes("onboarding")
    data object PendingApproval : Routes("pending_approval")

    // Admin / Staff Routes
    data object AdminHome : Routes("admin_home")
    data object Products : Routes("products")
    data object Customers : Routes("customers")
    data object Orders : Routes("orders")
    data object CreateOrder : Routes("create_order")
    data object OrderDetail : Routes("order_detail/{orderId}") {
        fun createRoute(orderId: String) = "order_detail/$orderId"
    }
    data object Staff : Routes("staff")
    data object Settings : Routes("settings")
    data object Notifications : Routes("notifications")

    // Client Routes
    data object ClientHome : Routes("client_home")
    data object ClientCatalog : Routes("client_catalog")
    data object ClientOrders : Routes("client_orders")

    // Public Catalog
    data object PublicCatalog : Routes("public_catalog/{companyId}") {
        fun createRoute(companyId: String) = "public_catalog/$companyId"
    }
}
