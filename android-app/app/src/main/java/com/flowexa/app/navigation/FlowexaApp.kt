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
import androidx.navigation.NavType
import androidx.navigation.compose.*
import androidx.navigation.navArgument
import com.flowexa.app.auth.GoogleAuthManager
import com.flowexa.app.core.AppConfig
import com.flowexa.app.data.local.FlowexaDatabase
import com.flowexa.app.data.local.entity.SyncOperationEntity
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
import com.flowexa.app.ui.client.FavoritesScreen
import com.flowexa.app.ui.components.FlowexaBottomBar
import com.flowexa.app.ui.components.FlowexaTopBar
import com.flowexa.app.ui.customers.CustomersScreen
import com.flowexa.app.ui.notifications.NotificationsScreen
import com.flowexa.app.ui.onboarding.OnboardingScreen
import com.flowexa.app.ui.orders.CreateOrderScreen
import com.flowexa.app.ui.orders.OrderDetailScreen
import com.flowexa.app.ui.orders.OrdersScreen
import com.flowexa.app.ui.products.ProductsScreen
import com.flowexa.app.ui.settings.CompanySettingsScreen
import com.flowexa.app.ui.staff.StaffScreen
import com.flowexa.app.ui.theme.FlowexaBlue
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.util.Calendar
import java.util.UUID

@Composable
fun FlowexaApp(
    initialCompanyId: String? = null
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    val navController = rememberNavController()

    // Local DB & Repositories
    val db = remember { FlowexaDatabase.getInstance(context) }
    val authRepo = remember { AuthRepository(db, context) }
    val companyRepo = remember { CompanyRepository(db, context) }
    val productRepo = remember { ProductRepository(db, context) }
    val customerRepo = remember { CustomerRepository(db, context) }
    val orderRepo = remember { OrderRepository(db, context) }
    val syncEngine = remember { SyncEngine(db) }
    val googleAuthManager = remember { GoogleAuthManager(context, authRepo) }

    // Network Connectivity State
    var isOnline by remember { mutableStateOf(true) }
    DisposableEffect(context) {
        val cm = context.getSystemService(ConnectivityManager::class.java)
        val callback = object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) {
                isOnline = true
                coroutineScope.launch {
                    syncEngine.syncOutbox()
                }
            }
            override fun onLost(network: Network) {
                isOnline = false
            }
        }
        val request = NetworkRequest.Builder()
            .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            .build()
        cm?.registerNetworkCallback(request, callback)

        val active = cm?.activeNetwork
        val caps = cm?.getNetworkCapabilities(active)
        isOnline = caps?.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) == true

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
        Routes.ClientOrders.route,
        Routes.Staff.route,
        Routes.Notifications.route
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
                    onNotificationsClick = { navController.navigate(Routes.Notifications.route) },
                    onSyncClick = {
                        coroutineScope.launch {
                            syncEngine.syncOutbox()
                            if (currentCompanyId.isNotEmpty() && currentUser != null) {
                                syncEngine.syncCompanyData(currentCompanyId, currentUser.uid)
                            }
                        }
                    }
                )
            }
        },
        bottomBar = {
            if (showBars && currentRoute != Routes.Notifications.route && currentRoute != Routes.Staff.route) {
                FlowexaBottomBar(
                    currentRoute = currentRoute,
                    onNavigate = { targetRoute ->
                        navController.navigate(targetRoute) {
                            popUpTo(if (isClient) Routes.ClientHome.route else Routes.AdminHome.route) {
                                saveState = true
                            }
                            launchSingleTop = true
                            restoreState = true
                        }
                    },
                    isClient = isClient
                )
            }
        }
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = Routes.Splash.route,
            modifier = Modifier.padding(innerPadding)
        ) {
            // Splash / Initial Auth check
            composable(Routes.Splash.route) {
                LaunchedEffect(Unit) {
                    val user = authRepo.currentUser
                    if (user == null) {
                        navController.navigate(Routes.Login.route) {
                            popUpTo(Routes.Splash.route) { inclusive = true }
                        }
                    } else {
                        val profile = authRepo.fetchAndCacheUserProfile(user.uid)
                        when {
                            profile.role == AppConfig.ROLE_PENDING_EMPLOYEE -> {
                                navController.navigate(Routes.PendingApproval.route) {
                                    popUpTo(Routes.Splash.route) { inclusive = true }
                                }
                            }
                            profile.companyId.isNullOrEmpty() && profile.role != AppConfig.ROLE_CLIENT -> {
                                navController.navigate(Routes.Onboarding.route) {
                                    popUpTo(Routes.Splash.route) { inclusive = true }
                                }
                            }
                            profile.role == AppConfig.ROLE_CLIENT -> {
                                navController.navigate(Routes.ClientHome.route) {
                                    popUpTo(Routes.Splash.route) { inclusive = true }
                                }
                            }
                            else -> {
                                navController.navigate(Routes.AdminHome.route) {
                                    popUpTo(Routes.Splash.route) { inclusive = true }
                                }
                            }
                        }
                    }
                }
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = FlowexaBlue)
                }
            }

            composable(Routes.Login.route) {
                LoginScreen(
                    onLoginClick = { email, pass ->
                        coroutineScope.launch {
                            isAuthLoading = true
                            authError = null
                            val res = authRepo.login(email, pass)
                            isAuthLoading = false
                            res.onSuccess {
                                val user = authRepo.currentUser
                                if (user != null) {
                                    val profile = authRepo.fetchAndCacheUserProfile(user.uid)
                                    if (profile.role == AppConfig.ROLE_PENDING_EMPLOYEE) {
                                        navController.navigate(Routes.PendingApproval.route) {
                                            popUpTo(Routes.Login.route) { inclusive = true }
                                        }
                                    } else if (profile.companyId.isNullOrEmpty() && profile.role != AppConfig.ROLE_CLIENT) {
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
                                    if (profile.companyId.isNullOrEmpty() && profile.role != AppConfig.ROLE_CLIENT) {
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
                    onCreateCompany = { name, _ ->
                        coroutineScope.launch {
                            val user = authRepo.currentUser ?: return@launch
                            isAuthLoading = true
                            authError = null
                            val res = companyRepo.createCompany(
                                name = name,
                                primaryCurrency = "SAR",
                                ownerId = user.uid,
                                ownerEmail = user.email ?: "",
                                ownerDisplayName = user.displayName ?: "المدير"
                            )
                            isAuthLoading = false
                            res.onSuccess {
                                navController.navigate(Routes.AdminHome.route) {
                                    popUpTo(Routes.Onboarding.route) { inclusive = true }
                                }
                            }.onFailure { err ->
                                authError = err.message ?: "فشل إنشاء الشركة"
                            }
                        }
                    },
                    onJoinAsEmployee = { code ->
                        coroutineScope.launch {
                            val user = authRepo.currentUser ?: return@launch
                            isAuthLoading = true
                            authError = null
                            val res = companyRepo.joinAsEmployee(
                                joinCode = code,
                                userUid = user.uid,
                                userEmail = user.email ?: "",
                                userDisplayName = user.displayName ?: "موظف"
                            )
                            isAuthLoading = false
                            res.onSuccess {
                                navController.navigate(Routes.PendingApproval.route) {
                                    popUpTo(Routes.Onboarding.route) { inclusive = true }
                                }
                            }.onFailure { err ->
                                authError = err.message ?: "فشل الانضمام بالرمز المدخل"
                            }
                        }
                    },
                    onJoinAsClient = { code ->
                        coroutineScope.launch {
                            val user = authRepo.currentUser ?: return@launch
                            isAuthLoading = true
                            authError = null
                            val res = companyRepo.joinAsClient(
                                clientJoinCode = code,
                                userUid = user.uid,
                                userEmail = user.email ?: "",
                                userDisplayName = user.displayName ?: "عميل"
                            )
                            isAuthLoading = false
                            res.onSuccess {
                                navController.navigate(Routes.ClientHome.route) {
                                    popUpTo(Routes.Onboarding.route) { inclusive = true }
                                }
                            }.onFailure { err ->
                                authError = err.message ?: "فشل الانضمام كعميل"
                            }
                        }
                    },
                    isLoading = isAuthLoading,
                    errorMessage = authError
                )
            }

            // Pending Approval Screen
            composable(Routes.PendingApproval.route) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    androidx.compose.material3.Text(
                        text = "طلب انضمامك قيد المراجعة والموافقة من قبل إدارة الشركة.",
                        color = FlowexaBlue,
                        fontWeight = androidx.compose.ui.text.font.FontWeight.Bold,
                        fontSize = 16.sp
                    )
                }
            }

            // Admin Screens
            composable(Routes.AdminHome.route) {
                val orders by orderRepo.observeOrders(currentCompanyId).collectAsState(initial = emptyList())
                val products by productRepo.observeProducts(currentCompanyId).collectAsState(initial = emptyList())
                val customers by customerRepo.observeCustomers(currentCompanyId).collectAsState(initial = emptyList())

                val calendar = Calendar.getInstance().apply {
                    set(Calendar.HOUR_OF_DAY, 0)
                    set(Calendar.MINUTE, 0)
                    set(Calendar.SECOND, 0)
                    set(Calendar.MILLISECOND, 0)
                }
                val startOfTodayMs = calendar.timeInMillis
                val todayOrders = orders.filter { (it.createdAtMs ?: 0L) >= startOfTodayMs }
                val todayOrdersCount = todayOrders.size

                val totalSales = todayOrders.sumOf { order ->
                    try {
                        val json = JSONObject(order.totalAmountByCurrencyJson)
                        var sum = 0.0
                        val keys = json.keys()
                        while (keys.hasNext()) {
                            sum += json.optDouble(keys.next(), 0.0)
                        }
                        sum
                    } catch (_: Exception) {
                        0.0
                    }
                }

                AdminHomeScreen(
                    companyName = company?.name ?: "Flowexa",
                    todayOrdersCount = todayOrdersCount,
                    totalSales = totalSales,
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
                    onSaveProduct = { p, isNew ->
                        coroutineScope.launch { productRepo.saveProduct(p, isNew) }
                    },
                    onDeleteProduct = { id ->
                        coroutineScope.launch { productRepo.deleteProduct(id) }
                    },
                    companyId = currentCompanyId
                )
            }

            composable(Routes.Customers.route) {
                var query by remember { mutableStateOf("") }
                val customers by customerRepo.searchCustomers(currentCompanyId, query).collectAsState(initial = emptyList())

                CustomersScreen(
                    customers = customers,
                    searchQuery = query,
                    onSearchChange = { query = it },
                    onSaveCustomer = { c, isNew ->
                        coroutineScope.launch { customerRepo.saveCustomer(c, isNew) }
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

            composable(Routes.Staff.route) {
                val staffList by db.userProfileDao().observeStaff(currentCompanyId).collectAsState(initial = emptyList())
                val pendingEmployees by db.userProfileDao().observePendingStaff(currentCompanyId).collectAsState(initial = emptyList())

                StaffScreen(
                    joinCode = company?.joinCode,
                    staffList = staffList,
                    pendingEmployees = pendingEmployees,
                    onBackClick = { navController.popBackStack() },
                    onApproveEmployee = { emp ->
                        coroutineScope.launch {
                            db.userProfileDao().updateRole(emp.id, AppConfig.ROLE_SALES)
                            val syncDao = db.syncOperationDao()
                            val payload = JSONObject().apply {
                                put("role", AppConfig.ROLE_SALES)
                                put("updatedBy", currentUser?.uid ?: "")
                            }
                            syncDao.insert(
                                SyncOperationEntity(
                                    id = UUID.randomUUID().toString(),
                                    collectionName = AppConfig.COL_USER_PROFILES,
                                    documentId = emp.id,
                                    operation = "UPDATE",
                                    payloadJson = payload.toString()
                                )
                            )
                            SyncScheduler.scheduleImmediateSync(context)
                        }
                    },
                    onRejectEmployee = { emp ->
                        coroutineScope.launch {
                            db.userProfileDao().softDelete(emp.id)
                            val syncDao = db.syncOperationDao()
                            syncDao.insert(
                                SyncOperationEntity(
                                    id = UUID.randomUUID().toString(),
                                    collectionName = AppConfig.COL_USER_PROFILES,
                                    documentId = emp.id,
                                    operation = "DELETE",
                                    payloadJson = "{}"
                                )
                            )
                            SyncScheduler.scheduleImmediateSync(context)
                        }
                    }
                )
            }

            composable(Routes.Notifications.route) {
                val notifications by db.notificationDao().observeNotifications(currentCompanyId).collectAsState(initial = emptyList())

                NotificationsScreen(
                    notifications = notifications,
                    onBackClick = { navController.popBackStack() },
                    onNotificationClick = { notif ->
                        coroutineScope.launch {
                            db.notificationDao().markAsRead(notif.id)
                            if (!notif.orderId.isNullOrEmpty()) {
                                navController.navigate(Routes.OrderDetail.createRoute(notif.orderId))
                            }
                        }
                    },
                    onMarkAllAsRead = {
                        coroutineScope.launch {
                            notifications.forEach { db.notificationDao().markAsRead(it.id) }
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
