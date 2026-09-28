package com.flowexa.app.navigation

import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavType
import androidx.navigation.compose.*
import androidx.navigation.navArgument
import com.flowexa.app.auth.GoogleAuthManager
import com.flowexa.app.core.AppConfig
import com.flowexa.app.data.local.FlowexaDatabase
import com.flowexa.app.data.repository.*
import com.flowexa.app.sync.SyncEngine
import com.flowexa.app.sync.SyncScheduler
import com.flowexa.app.ui.admin.AdminHomeScreen
import com.flowexa.app.ui.auth.ForgotPasswordScreen
import com.flowexa.app.ui.auth.LoginScreen
import com.flowexa.app.ui.auth.RegisterScreen
import com.flowexa.app.ui.catalog.PublicCatalogScreen
import com.flowexa.app.ui.client.ClientCatalogScreen
import com.flowexa.app.ui.client.ClientHomeScreen
import com.flowexa.app.ui.components.FlowexaBottomBar
import com.flowexa.app.ui.components.FlowexaTopBar
import com.flowexa.app.ui.customers.CustomersScreen
import com.flowexa.app.ui.onboarding.OnboardingScreen
import com.flowexa.app.ui.orders.CreateOrderScreen
import com.flowexa.app.ui.orders.OrderDetailScreen
import com.flowexa.app.ui.orders.OrdersScreen
import com.flowexa.app.ui.products.ProductsScreen
import com.flowexa.app.ui.settings.CompanySettingsScreen
import com.flowexa.app.ui.theme.FlowexaBlue
import kotlinx.coroutines.launch
import java.util.UUID

@Composable
fun FlowexaApp(
    initialCompanyId: String? = null
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    val navController = rememberNavController()

    // Database & Repositories
    val db = remember { FlowexaDatabase.getInstance(context) }
    val authRepo = remember { AuthRepository(db) }
    val productRepo = remember { ProductRepository(db, context) }
    val customerRepo = remember { CustomerRepository(db, context) }
    val orderRepo = remember { OrderRepository(db, context) }
    val companyRepo = remember { CompanyRepository(db, context) }
    val googleAuthManager = remember { GoogleAuthManager(context) }
    val syncEngine = remember { SyncEngine(db) }

    // Network connectivity monitoring
    var isOnline by remember { mutableStateOf(true) }
    DisposableEffect(context) {
        val cm = context.getSystemService(ConnectivityManager::class.java)
        val callback = object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) {
                isOnline = true
                SyncScheduler.scheduleImmediateSync(context)
            }
            override fun onLost(network: Network) {
                isOnline = false
            }
        }
        val request = NetworkRequest.Builder().addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET).build()
        cm?.registerNetworkCallback(request, callback)
        onDispose {
            cm?.unregisterNetworkCallback(callback)
        }
    }

    // Pending sync count from local outbox
    val pendingSyncCount by db.syncOperationDao().observePendingCount().collectAsState(initial = 0)

    // Current User & Profile
    val currentUser = authRepo.currentUser
    val userProfile by if (currentUser != null) {
        authRepo.observeCurrentProfile(currentUser.uid).collectAsState(initial = null)
    } else {
        remember { mutableStateOf(null) }
    }

    val currentCompanyId = userProfile?.companyId ?: ""
    val company by companyRepo.observeCompany(currentCompanyId).collectAsState(initial = null)

    // Periodic sync on startup
    LaunchedEffect(currentUser?.uid) {
        if (currentUser != null) {
            SyncScheduler.schedulePeriodicSync(context)
            SyncScheduler.scheduleImmediateSync(context)
        }
    }

    // Deep link redirect
    LaunchedEffect(initialCompanyId) {
        if (!initialCompanyId.isNullOrEmpty()) {
            navController.navigate(Routes.PublicCatalog.createRoute(initialCompanyId))
        }
    }

    // Auth state loading
    var isAuthLoading by remember { mutableStateOf(false) }
    var authError by remember { mutableStateOf<String?>(null) }
    var resetSuccess by remember { mutableStateOf(false) }

    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route ?: ""

    val showBars = currentRoute in listOf(
        Routes.AdminHome.route,
        Routes.Products.route,
        Routes.Customers.route,
        Routes.Orders.route,
        Routes.Settings.route,
        Routes.ClientHome.route,
        Routes.ClientCatalog.route,
        Routes.ClientOrders.route
    )

    val isClient = userProfile?.role == AppConfig.ROLE_CLIENT

    Scaffold(
        topBar = {
            if (showBars) {
                FlowexaTopBar(
                    title = "Flowexa",
                    companyName = company?.name ?: userProfile?.companyName,
                    isOnline = isOnline,
                    pendingSyncCount = pendingSyncCount,
                    onNotificationsClick = {
                        navController.navigate(Routes.Notifications.route)
                    }
                )
            }
        },
        bottomBar = {
            if (showBars) {
                FlowexaBottomBar(
                    currentRoute = currentRoute,
                    onNavigate = { route -> navController.navigate(route) },
                    isClient = isClient
                )
            }
        }
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = when {
                currentUser == null -> Routes.Login.route
                userProfile?.companyId.isNullOrEmpty() -> Routes.Onboarding.route
                isClient -> Routes.ClientHome.route
                else -> Routes.AdminHome.route
            },
            modifier = Modifier.padding(innerPadding)
        ) {
            // Auth Routes
            composable(Routes.Login.route) {
                LoginScreen(
                    onLoginClick = { email, pass ->
                        coroutineScope.launch {
                            isAuthLoading = true
                            authError = null
                            val res = authRepo.login(email, pass)
                            isAuthLoading = false
                            res.onSuccess { profile ->
                                if (profile.companyId.isNullOrEmpty()) {
                                    navController.navigate(Routes.Onboarding.route) {
                                        popUpTo(Routes.Login.route) { inclusive = true }
                                    }
                                } else if (profile.role == AppConfig.ROLE_CLIENT) {
                                    navController.navigate(Routes.ClientHome.route) {
                                        popUpTo(Routes.Login.route) { inclusive = true }
                                    }
                                } else {
                                    navController.navigate(Routes.AdminHome.route) {
                                        popUpTo(Routes.Login.route) { inclusive = true }
                                    }
                                }
                            }.onFailure { err ->
                                authError = err.message ?: "فشل تسجيل الدخول"
                            }
                        }
                    },
                    onGoogleClick = {
                        coroutineScope.launch {
                            isAuthLoading = true
                            authError = null
                            val res = googleAuthManager.signInWithGoogle()
                            isAuthLoading = false
                            res.onSuccess {
                                val user = authRepo.currentUser
                                if (user != null) {
                                    val profile = authRepo.fetchAndCacheUserProfile(user.uid)
                                    if (profile.companyId.isNullOrEmpty()) {
                                        navController.navigate(Routes.Onboarding.route) {
                                            popUpTo(Routes.Login.route) { inclusive = true }
                                        }
                                    } else {
                                        navController.navigate(Routes.AdminHome.route) {
                                            popUpTo(Routes.Login.route) { inclusive = true }
                                        }
                                    }
                                }
                            }.onFailure { err ->
                                authError = err.message ?: "فشل تسجيل الدخول عبر Google"
                            }
                        }
                    },
                    onRegisterNavigate = { navController.navigate(Routes.Register.route) },
                    onForgotPasswordNavigate = { navController.navigate(Routes.ForgotPassword.route) },
                    isLoading = isAuthLoading,
                    errorMessage = authError
                )
            }

            composable(Routes.Register.route) {
                RegisterScreen(
                    onRegisterClick = { email, pass, name ->
                        coroutineScope.launch {
                            isAuthLoading = true
                            authError = null
                            val res = authRepo.register(email, pass, name)
                            isAuthLoading = false
                            res.onSuccess {
                                navController.navigate(Routes.Onboarding.route) {
                                    popUpTo(Routes.Register.route) { inclusive = true }
                                }
                            }.onFailure { err ->
                                authError = err.message ?: "فشل إنشاء الحساب"
                            }
                        }
                    },
                    onLoginNavigate = { navController.navigate(Routes.Login.route) },
                    isLoading = isAuthLoading,
                    errorMessage = authError
                )
            }

            composable(Routes.ForgotPassword.route) {
                ForgotPasswordScreen(
                    onSendResetClick = { email ->
                        coroutineScope.launch {
                            isAuthLoading = true
                            authError = null
                            resetSuccess = false
                            val res = authRepo.sendPasswordReset(email)
                            isAuthLoading = false
                            res.onSuccess { resetSuccess = true }
                                .onFailure { err -> authError = err.message }
                        }
                    },
                    onBackClick = { navController.popBackStack() },
                    isLoading = isAuthLoading,
                    isSuccess = resetSuccess,
                    errorMessage = authError
                )
            }

            // Onboarding
            composable(Routes.Onboarding.route) {
                OnboardingScreen(
                    onCreateCompany = { name, phone ->
                        coroutineScope.launch {
                            val user = authRepo.currentUser ?: return@launch
                            val companyId = "comp_${UUID.randomUUID()}"
                            val joinCode = UUID.randomUUID().toString().take(6).uppercase()
                            val clientCode = UUID.randomUUID().toString().take(6).uppercase()

                            val newCompany = com.flowexa.app.data.local.entity.CompanyEntity(
                                id = companyId,
                                name = name,
                                ownerId = user.uid,
                                phone = phone,
                                joinCode = joinCode,
                                clientJoinCode = clientCode
                            )
                            companyRepo.updateCompany(newCompany)

                            // Update user profile
                            val updatedProfile = userProfile?.copy(
                                companyId = companyId,
                                companyName = name,
                                role = AppConfig.ROLE_OWNER
                            ) ?: com.flowexa.app.data.local.entity.UserProfileEntity(
                                id = user.uid,
                                email = user.email ?: "",
                                displayName = user.displayName ?: "المدير",
                                companyId = companyId,
                                companyName = name,
                                role = AppConfig.ROLE_OWNER
                            )
                            db.userProfileDao().insert(updatedProfile)

                            navController.navigate(Routes.AdminHome.route) {
                                popUpTo(Routes.Onboarding.route) { inclusive = true }
                            }
                        }
                    },
                    onJoinAsEmployee = { code ->
                        // Query or handle join code
                        navController.navigate(Routes.AdminHome.route)
                    },
                    onJoinAsClient = { code ->
                        navController.navigate(Routes.ClientHome.route)
                    },
                    isLoading = isAuthLoading
                )
            }

            // Admin Screens
            composable(Routes.AdminHome.route) {
                val orders by orderRepo.observeOrders(currentCompanyId).collectAsState(initial = emptyList())
                val products by productRepo.observeProducts(currentCompanyId).collectAsState(initial = emptyList())
                val customers by customerRepo.observeCustomers(currentCompanyId).collectAsState(initial = emptyList())

                AdminHomeScreen(
                    companyName = company?.name ?: "Flowexa",
                    todayOrdersCount = orders.size,
                    totalSales = orders.sumOf { 0.0 }, // Dynamic totals
                    currency = company?.primaryCurrency ?: "SAR",
                    productsCount = products.size,
                    customersCount = customers.size,
                    recentOrders = orders.take(5),
                    onCreateOrderClick = { navController.navigate(Routes.CreateOrder.route) },
                    onProductsClick = { navController.navigate(Routes.Products.route) },
                    onCustomersClick = { navController.navigate(Routes.Customers.route) },
                    onOrderClick = { orderId -> navController.navigate(Routes.OrderDetail.createRoute(orderId)) }
                )
            }

            composable(Routes.Products.route) {
                var query by remember { mutableStateOf("") }
                val products by productRepo.searchProducts(currentCompanyId, query).collectAsState(initial = emptyList())

                ProductsScreen(
                    products = products,
                    searchQuery = query,
                    onSearchChange = { query = it },
                    onSaveProduct = { prod, isNew ->
                        coroutineScope.launch {
                            productRepo.saveProduct(prod, isNew)
                        }
                    },
                    onDeleteProduct = { id ->
                        coroutineScope.launch { productRepo.deleteProduct(id) }
                    },
                    companyId = currentCompanyId,
                    primaryCurrency = company?.primaryCurrency ?: "SAR"
                )
            }

            composable(Routes.Customers.route) {
                var query by remember { mutableStateOf("") }
                val customers by customerRepo.searchCustomers(currentCompanyId, query).collectAsState(initial = emptyList())

                CustomersScreen(
                    customers = customers,
                    searchQuery = query,
                    onSearchChange = { query = it },
                    onSaveCustomer = { cust, isNew ->
                        coroutineScope.launch {
                            customerRepo.saveCustomer(cust, isNew)
                        }
                    },
                    onDeleteCustomer = { id ->
                        coroutineScope.launch { customerRepo.deleteCustomer(id) }
                    },
                    companyId = currentCompanyId
                )
            }

            composable(Routes.Orders.route) {
                var statusFilter by remember { mutableStateOf("all") }
                val orders by (if (statusFilter == "all") {
                    orderRepo.observeOrders(currentCompanyId)
                } else {
                    orderRepo.observeOrdersByStatus(currentCompanyId, statusFilter)
                }).collectAsState(initial = emptyList())

                OrdersScreen(
                    orders = orders,
                    selectedStatus = statusFilter,
                    onStatusSelected = { statusFilter = it },
                    onCreateOrderClick = { navController.navigate(Routes.CreateOrder.route) },
                    onOrderClick = { orderId -> navController.navigate(Routes.OrderDetail.createRoute(orderId)) }
                )
            }

            composable(Routes.CreateOrder.route) {
                val customers by customerRepo.observeCustomers(currentCompanyId).collectAsState(initial = emptyList())
                val products by productRepo.observeProducts(currentCompanyId).collectAsState(initial = emptyList())

                CreateOrderScreen(
                    customers = customers,
                    products = products,
                    onBackClick = { navController.popBackStack() },
                    onConfirmOrder = { custId, custName, custPhone, custAddress, invType, notes, items, totals ->
                        coroutineScope.launch {
                            orderRepo.createOrder(
                                companyId = currentCompanyId,
                                customerId = custId,
                                customerName = custName,
                                customerPhone = custPhone,
                                customerAddress = custAddress,
                                invoiceType = invType,
                                dueDate = null,
                                notes = notes,
                                source = "admin",
                                clientUid = null,
                                createdBy = currentUser?.uid ?: "",
                                createdByName = userProfile?.displayName ?: "المدير",
                                items = items,
                                totalAmountByCurrency = totals
                            )
                            navController.popBackStack()
                        }
                    }
                )
            }

            composable(
                route = Routes.OrderDetail.route,
                arguments = listOf(navArgument("orderId") { type = NavType.StringType })
            ) { backStackEntry ->
                val orderId = backStackEntry.arguments?.getString("orderId") ?: ""
                var order by remember { mutableStateOf<com.flowexa.app.data.local.entity.OrderEntity?>(null) }
                val items by orderRepo.observeOrderItems(orderId).collectAsState(initial = emptyList())

                LaunchedEffect(orderId) {
                    order = orderRepo.getOrder(orderId)
                }

                OrderDetailScreen(
                    order = order,
                    items = items,
                    onBackClick = { navController.popBackStack() },
                    onUpdateStatus = { newStatus ->
                        coroutineScope.launch {
                            orderRepo.updateStatus(orderId, newStatus, currentUser?.uid ?: "")
                            order = orderRepo.getOrder(orderId)
                        }
                    }
                )
            }

            composable(Routes.Settings.route) {
                CompanySettingsScreen(
                    company = company,
                    pendingSyncCount = pendingSyncCount,
                    onSaveCompany = { updated ->
                        coroutineScope.launch { companyRepo.updateCompany(updated) }
                    },
                    onManualSync = {
                        coroutineScope.launch {
                            syncEngine.syncOutbox()
                            if (currentCompanyId.isNotEmpty() && currentUser != null) {
                                syncEngine.syncCompanyData(currentCompanyId, currentUser.uid)
                            }
                        }
                    },
                    onLogout = {
                        coroutineScope.launch {
                            authRepo.logout()
                            navController.navigate(Routes.Login.route) {
                                popUpTo(0) { inclusive = true }
                            }
                        }
                    }
                )
            }

            // Client Screens
            composable(Routes.ClientHome.route) {
                val clientOrders by orderRepo.observeClientOrders(currentUser?.uid ?: "").collectAsState(initial = emptyList())
                ClientHomeScreen(
                    clientName = userProfile?.displayName ?: "عميل عزيز",
                    companyName = company?.name ?: "Flowexa",
                    orders = clientOrders,
                    onCatalogClick = { navController.navigate(Routes.ClientCatalog.route) },
                    onOrdersClick = { navController.navigate(Routes.ClientOrders.route) },
                    onOrderClick = { orderId -> navController.navigate(Routes.OrderDetail.createRoute(orderId)) }
                )
            }

            composable(Routes.ClientCatalog.route) {
                var query by remember { mutableStateOf("") }
                val products by productRepo.searchProducts(currentCompanyId, query).collectAsState(initial = emptyList())

                ClientCatalogScreen(
                    products = products,
                    searchQuery = query,
                    onSearchChange = { query = it },
                    onOrderProduct = { navController.navigate(Routes.CreateOrder.route) }
                )
            }

            composable(Routes.ClientOrders.route) {
                val clientOrders by orderRepo.observeClientOrders(currentUser?.uid ?: "").collectAsState(initial = emptyList())
                OrdersScreen(
                    orders = clientOrders,
                    selectedStatus = "all",
                    onStatusSelected = {},
                    onCreateOrderClick = { navController.navigate(Routes.CreateOrder.route) },
                    onOrderClick = { orderId -> navController.navigate(Routes.OrderDetail.createRoute(orderId)) }
                )
            }

            // Deep-linked Public Catalog Screen
            composable(
                route = Routes.PublicCatalog.route,
                arguments = listOf(navArgument("companyId") { type = NavType.StringType })
            ) { backStackEntry ->
                val compId = backStackEntry.arguments?.getString("companyId") ?: ""
                var publicCompany by remember { mutableStateOf<com.flowexa.app.data.local.entity.CompanyEntity?>(null) }
                val products by productRepo.observeProducts(compId).collectAsState(initial = emptyList())

                LaunchedEffect(compId) {
                    publicCompany = companyRepo.getCompany(compId)
                }

                PublicCatalogScreen(
                    company = publicCompany,
                    products = products,
                    onBackClick = {
                        if (navController.previousBackStackEntry != null) {
                            navController.popBackStack()
                        } else {
                            navController.navigate(Routes.Login.route)
                        }
                    }
                )
            }
        }
    }
}
