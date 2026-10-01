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
    data object CustomerDetail : Routes("customer_detail/{customerId}") {
        fun createRoute(customerId: String) = "customer_detail/$customerId"
    }
    data object Orders : Routes("orders")
    data object CreateOrder : Routes("create_order?productId={productId}") {
        fun createRoute(productId: String? = null) = if (!productId.isNullOrEmpty()) "create_order?productId=$productId" else "create_order"
    }
    data object ClientCreateOrder : Routes("client_create_order?productId={productId}") {
        fun createRoute(productId: String? = null) = if (!productId.isNullOrEmpty()) "client_create_order?productId=$productId" else "client_create_order"
    }
    data object SalesQuickOrder : Routes("sales_quick_order")
    data object OrderDetail : Routes("order_detail/{orderId}") {
        fun createRoute(orderId: String) = "order_detail/$orderId"
    }
    data object Staff : Routes("staff")
    data object Settings : Routes("settings")
    data object Notifications : Routes("notifications")

    // Product Detail
    data object ProductDetail : Routes("product_detail/{productId}") {
        fun createRoute(productId: String) = "product_detail/$productId"
    }

    // Client Routes
    data object ClientHome : Routes("client_home")
    data object ClientCatalog : Routes("client_catalog")
    data object ClientOrders : Routes("client_orders")
    data object ClientFavorites : Routes("client_favorites")

    // Public Catalog
    data object PublicCatalog : Routes("public_catalog/{companyId}") {
        fun createRoute(companyId: String) = "public_catalog/$companyId"
    }
}
