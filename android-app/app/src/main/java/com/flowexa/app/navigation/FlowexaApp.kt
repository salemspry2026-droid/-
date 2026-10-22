package com.flowexa.app.navigation

import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.sp
import androidx.navigation.NavType
import androidx.navigation.compose.*
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.navArgument
import com.flowexa.app.domain.LogoutCoordinator
import com.flowexa.app.domain.LogoutDependencies
import com.flowexa.app.domain.LogoutPreparation
import com.flowexa.app.domain.LogoutResult
import com.flowexa.app.domain.OutboxCounts
import com.flowexa.app.ui.auth.EmailLinkDialog
import com.flowexa.app.ui.auth.ProfileRetryScreen
import com.flowexa.app.auth.GoogleAuthManager
import com.flowexa.app.core.AppConfig
import com.flowexa.app.data.local.FlowexaDatabase
import com.flowexa.app.data.local.entity.SyncOperationEntity
import com.flowexa.app.data.repository.*
import com.flowexa.app.domain.PermissionManager
import com.flowexa.app.sync.SyncActivity
import com.flowexa.app.sync.SyncEngine
import com.flowexa.app.sync.SyncScheduler
import com.flowexa.app.ui.admin.AdminHomeScreen
import com.flowexa.app.ui.auth.ForgotPasswordScreen
import com.flowexa.app.ui.auth.LandingScreen
import com.flowexa.app.ui.auth.LoginScreen
import com.flowexa.app.ui.auth.RegisterScreen
import com.flowexa.app.ui.catalog.PublicCatalogScreen
import com.flowexa.app.ui.client.ClientCatalogScreen
import com.flowexa.app.ui.client.ClientHomeScreen
import com.flowexa.app.ui.client.FavoritesScreen
import com.flowexa.app.ui.client.ClientProfileScreen
import com.flowexa.app.ui.admin.AdministrationScreen
import com.flowexa.app.ui.calls.ActiveCallOverlay
import com.flowexa.app.ui.calls.CallContact
import com.flowexa.app.ui.calls.CallRecordingsScreen
import com.flowexa.app.data.local.entity.*
import com.flowexa.app.ui.components.FlowexaBottomBar
import com.flowexa.app.ui.components.FlowexaTopBar
import com.flowexa.app.ui.customers.CustomerDetailScreen
import com.flowexa.app.ui.customers.CustomersScreen
import com.flowexa.app.ui.notifications.NotificationsScreen
import com.flowexa.app.ui.onboarding.OnboardingScreen
import com.flowexa.app.ui.orders.CreateOrderScreen
import com.flowexa.app.ui.orders.OrderDetailScreen
import com.flowexa.app.ui.orders.OrdersScreen
import com.flowexa.app.ui.orders.SalesQuickOrderScreen
import com.flowexa.app.ui.products.ProductDetailScreen
import com.flowexa.app.ui.products.ProductsScreen
import com.flowexa.app.ui.settings.CompanySettingsScreen
import com.flowexa.app.ui.staff.StaffScreen
import com.flowexa.app.ui.theme.FlowexaBlue
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineStart
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.util.Calendar
import java.util.UUID

@Composable
fun FlowexaApp(
    deepLink: DeepLink? = null,
    onDeepLinkHandled: () -> Unit = {}
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    val navController = rememberNavController()

    // Local DB & Repositories
    val db = remember { FlowexaDatabase.getInstance(context) }
    val authRepo = remember { AuthRepository(db) }
    val companyRepo = remember { CompanyRepository(db, context) }
    val productRepo = remember { ProductRepository(db, context) }
    val customerRepo = remember { CustomerRepository(db, context) }
    val orderRepo = remember { OrderRepository(db, context) }
    val stageRepo = remember { OrderStageRepository(db, context) }
    val notificationRepo = remember { NotificationRepository(db, context) }
    val favoritesRepo = remember { FavoritesRepository(db, context) }
    val syncEngine = remember { SyncEngine(db) }
    val googleAuthManager = remember { GoogleAuthManager(context) }

    // Safe logout state: never discard unsynchronized outbox work silently.
    var logoutBusy by remember { mutableStateOf(false) }
    var logoutPrompt by remember { mutableStateOf<LogoutPreparation.NeedsConfirmation?>(null) }
    var logoutError by remember { mutableStateOf<String?>(null) }

    val logoutCoordinator = remember {
        LogoutCoordinator(object : LogoutDependencies {
            override suspend fun outboxCounts(): OutboxCounts = withContext(Dispatchers.IO) {
                val dao = db.syncOperationDao()
                OutboxCounts(
                    pending = dao.countByState(AppConfig.SYNC_STATE_PENDING),
                    processing = dao.countByState(AppConfig.SYNC_STATE_PROCESSING),
                    failed = dao.countByState(AppConfig.SYNC_STATE_FAILED)
                )
            }

            override suspend fun syncOutbox(): Result<Unit> {
                SyncEngine.resume()
                return syncEngine.syncOutbox().fold(
                    onSuccess = { Result.success(Unit) },
                    onFailure = { Result.failure(it) }
                )
            }

            override suspend fun stopBackgroundSync(): Boolean {
                if (!SyncEngine.suspendAndAwaitIdle(10_000L)) return false
                SyncScheduler.cancelSyncWork(context)
                return SyncActivity.awaitIdle(10_000L)
            }

            override suspend fun clearLocalData() {
                withContext(Dispatchers.IO) { db.clearAllTables() }
            }

            override suspend fun signOut() {
                authRepo.logout()
            }

            override fun allowSync() {
                SyncEngine.resume()
            }

            override fun resumeSync() {
                SyncEngine.resume()
                if (authRepo.currentUser != null) {
                    SyncScheduler.schedulePeriodicSync(context)
                    SyncScheduler.scheduleImmediateSync(context)
                }
            }
        })
    }

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

    // Auth state loading
    var isAuthLoading by remember { mutableStateOf(false) }
    var authError by remember { mutableStateOf<String?>(null) }
    var resetSuccess by remember { mutableStateOf(false) }
    var emailLinkSent by remember { mutableStateOf(false) }
    var isProfileRetrying by remember { mutableStateOf(false) }

    suspend fun finishLogout() {
        logoutPrompt = null
        logoutBusy = true
        logoutError = null
        val result = logoutCoordinator.finalize()
        logoutBusy = false
        logoutCoordinator.finish()
        when (result) {
            is LogoutResult.Success -> {
                navController.navigate(Routes.Login.route) {
                    popUpTo(0) { inclusive = true }
                }
            }
            is LogoutResult.CleanupFailed -> {
                // Authentication was not cleared, so stale rows cannot leak to another tenant.
                logoutError = "تعذر حذف البيانات المحلية، ولم يتم تسجيل الخروج. لم تُحذف أي بيانات إضافية. حاول مرة أخرى."
            }
            is LogoutResult.SignOutFailed -> {
                if (authRepo.currentUser == null) {
                    navController.navigate(Routes.Login.route) {
                        popUpTo(0) { inclusive = true }
                    }
                } else {
                    logoutError = "تم حذف البيانات المحلية لكن تعذر إكمال تسجيل الخروج. حاول مرة أخرى."
                }
            }
        }
    }

    fun performLogout() {
        if (logoutBusy) return
        logoutPrompt = null
        logoutBusy = true
        coroutineScope.launch(start = CoroutineStart.UNDISPATCHED) { finishLogout() }
    }

    suspend fun handlePreparation(preparation: LogoutPreparation) {
        logoutBusy = false
        when (preparation) {
            is LogoutPreparation.Ready -> finishLogout()
            is LogoutPreparation.NeedsConfirmation -> logoutPrompt = preparation
            is LogoutPreparation.Blocked -> {
                logoutPrompt = null
                logoutCoordinator.abort()
                logoutError = "تعذر إيقاف المزامنة الجارية بأمان، لذلك لم تُحذف أي بيانات. حاول مرة أخرى."
            }
        }
    }

    fun cancelLogoutPrompt() {
        logoutPrompt = null
        logoutCoordinator.abort()
    }

    fun retryLogout() {
        if (logoutBusy) return
        logoutPrompt = null
        logoutBusy = true
        logoutError = null
        coroutineScope.launch(start = CoroutineStart.UNDISPATCHED) {
            val preparation = try {
                logoutCoordinator.prepare()
            } catch (e: CancellationException) {
                logoutCoordinator.abort()
                logoutBusy = false
                throw e
            } catch (e: Exception) {
                logoutPrompt = null
                logoutCoordinator.abort()
                logoutBusy = false
                logoutError = "تعذر التحقق من التغييرات غير المتزامنة. لم تُحذف أي بيانات. حاول مرة أخرى."
                return@launch
            }
            handlePreparation(preparation)
        }
    }

    fun beginLogout() {
        if (logoutBusy || logoutPrompt != null) return
        if (!logoutCoordinator.tryBegin()) return
        logoutBusy = true
        logoutError = null
        coroutineScope.launch(start = CoroutineStart.UNDISPATCHED) {
            val preparation = try {
                logoutCoordinator.prepare()
            } catch (e: CancellationException) {
                logoutCoordinator.abort()
                logoutBusy = false
                throw e
            } catch (e: Exception) {
                logoutCoordinator.abort()
                logoutBusy = false
                logoutError = "تعذر التحقق من التغييرات غير المتزامنة. لم تُحذف أي بيانات. حاول مرة أخرى."
                return@launch
            }
            handlePreparation(preparation)
        }
    }

    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route ?: ""

    /**
     * Single place that routes a signed-in user. A network failure is NEVER interpreted as
     * "user has no profile": that case goes to ProfileRetry, not Onboarding.
     */
    suspend fun routeAfterAuth(uid: String) {
        val target: String = when (val r = authRepo.loadProfile(uid)) {
            is ProfileLoadResult.Found -> {
                val profile = r.profile
                when {
                    profile.role == AppConfig.ROLE_PENDING_EMPLOYEE -> Routes.PendingApproval.route
                    profile.companyId.isNullOrEmpty() && profile.role != AppConfig.ROLE_CLIENT -> Routes.Onboarding.route
                    profile.role == AppConfig.ROLE_CLIENT -> Routes.ClientHome.route
                    else -> Routes.AdminHome.route
                }
            }
            ProfileLoadResult.NotFound -> Routes.Onboarding.route
            is ProfileLoadResult.Unavailable -> Routes.ProfileRetry.route
        }
        navController.navigate(target) {
            // Clear Splash / Login / Register / retry from the back stack without a redirect loop.
            popUpTo(navController.graph.findStartDestination().id) { inclusive = true }
            launchSingleTop = true
        }
    }

    // ---- Deep links ---------------------------------------------------------------------
    // Public catalog: wait until the start-up routing left Splash, otherwise Splash's own
    // popUpTo(inclusive) would also remove the catalog destination.
    LaunchedEffect(deepLink, currentRoute) {
        val link = deepLink
        if (link is DeepLink.PublicCatalog && currentRoute.isNotEmpty() && currentRoute != Routes.Splash.route) {
            navController.navigate(Routes.PublicCatalog.createRoute(link.companyId)) {
                launchSingleTop = true
            }
            onDeepLinkHandled()
        }
    }

    // Firebase email-link sign-in (kept separate from catalog links).
    var emailLinkPending by remember { mutableStateOf<String?>(null) }
    var emailLinkError by remember { mutableStateOf<String?>(null) }
    var emailLinkLoading by remember { mutableStateOf(false) }
    LaunchedEffect(deepLink) {
        val link = deepLink
        if (link is DeepLink.EmailSignIn) {
            if (authRepo.isEmailSignInLink(link.link)) {
                emailLinkPending = link.link
                emailLinkError = null
            } else {
                emailLinkPending = ""   // shows the dialog in an error state (invalid/expired link)
                emailLinkError = "رابط تسجيل الدخول غير صالح أو منتهي الصلاحية."
            }
            onDeepLinkHandled()
        }
    }
    if (emailLinkPending != null) {
        val link = emailLinkPending!!
        if (link.isEmpty()) {
            AlertDialog(
                onDismissRequest = { emailLinkPending = null; emailLinkError = null },
                title = { Text("تعذر تسجيل الدخول") },
                text = { Text(emailLinkError ?: "رابط غير صالح") },
                confirmButton = {
                    TextButton(onClick = { emailLinkPending = null; emailLinkError = null }) { Text("حسنًا") }
                }
            )
        } else {
            EmailLinkDialog(
                isLoading = emailLinkLoading,
                errorMessage = emailLinkError,
                onConfirm = { email ->
                    coroutineScope.launch {
                        emailLinkLoading = true
                        emailLinkError = null
                        val res = authRepo.completeEmailLinkSignIn(email, link)
                        emailLinkLoading = false
                        res.onSuccess {
                            emailLinkPending = null
                            authRepo.currentUser?.uid?.let { uid -> routeAfterAuth(uid) }
                        }.onFailure { err ->
                            emailLinkError = when (err) {
                                is com.google.firebase.auth.FirebaseAuthActionCodeException ->
                                    "الرابط منتهي الصلاحية أو سبق استخدامه. اطلب رابطًا جديدًا."
                                is com.google.firebase.auth.FirebaseAuthInvalidUserException,
                                is com.google.firebase.auth.FirebaseAuthInvalidCredentialsException ->
                                    "البريد الإلكتروني لا يطابق الرابط."
                                else -> "تعذر إكمال تسجيل الدخول. تحقق من الاتصال وحاول مجددًا."
                            }
                        }
                    }
                },
                onDismiss = { emailLinkPending = null; emailLinkError = null }
            )
        }
    }

    val showBars = currentRoute in listOf(
        Routes.AdminHome.route,
        Routes.Products.route,
        Routes.Customers.route,
        Routes.Orders.route,
        Routes.Settings.route,
        Routes.Administration.route,
        Routes.CallRecordings.route,
        Routes.ClientHome.route,
        Routes.ClientCatalog.route,
        Routes.ClientOrders.route,
        Routes.ClientFavorites.route,
        Routes.ClientProfile.route,
        Routes.Staff.route,
        Routes.Notifications.route
    )

    val isClient = userProfile?.role == AppConfig.ROLE_CLIENT

    // Active / incoming call overlay (web: ActiveCallOverlay, mounted globally)
    var incomingCall by remember { mutableStateOf<CallContact?>(null) }
    incomingCall?.let { c ->
        ActiveCallOverlay(
            contact = c,
            onSaveRecording = { file, secs ->
                coroutineScope.launch {
                    db.callRecordingDao().insert(
                        CallRecordingEntity(
                            id = "rec_${System.currentTimeMillis()}",
                            companyId = currentCompanyId,
                            contactName = c.name,
                            phone = c.tel,
                            filePath = file.absolutePath,
                            durationSeconds = secs
                        )
                    )
                }
            },
            onClose = { incomingCall = null }
        )
    }

    logoutPrompt?.let { preparation ->
        val counts = preparation.counts
        val message = buildString {
            when (preparation.reason) {
                LogoutPreparation.Reason.SYNC_FAILED -> append("تعذرت مزامنة بعض التغييرات. ")
                LogoutPreparation.Reason.INSPECTION_FAILED -> append("تعذر التحقق من التغييرات غير المتزامنة. ")
                else -> Unit
            }
            if (counts != null) {
                append("لديك ${counts.total} عملية غير متزامنة (قيد الانتظار: ${counts.pending}، قيد المعالجة: ${counts.processing}، فاشلة: ${counts.failed}). ")
            } else {
                append("قد توجد تغييرات محلية لم تتم مزامنتها. ")
            }
            append("إذا أكدت الخروج، ستُحذف هذه التغييرات المحلية نهائيًا. يمكنك إعادة المحاولة أو إلغاء الخروج بأمان.")
        }
        AlertDialog(
            onDismissRequest = { cancelLogoutPrompt() },
            title = { Text("تغييرات غير متزامنة") },
            text = { Text(message) },
            confirmButton = {
                TextButton(onClick = { performLogout() }) { Text("تأكيد الخروج وحذف التغييرات") }
            },
            dismissButton = {
                Row {
                    TextButton(onClick = { retryLogout() }) { Text("إعادة المحاولة") }
                    TextButton(onClick = { cancelLogoutPrompt() }) { Text("إلغاء") }
                }
            }
        )
    }

    if (logoutBusy) {
        AlertDialog(
            onDismissRequest = {},
            title = { Text("تسجيل الخروج") },
            text = { Text("جارٍ إيقاف المزامنة والتحقق من التغييرات غير المتزامنة...") },
            confirmButton = {}
        )
    }

    logoutError?.let { message ->
        AlertDialog(
            onDismissRequest = { logoutError = null },
            title = { Text("تعذر إكمال تسجيل الخروج") },
            text = { Text(message) },
            confirmButton = {
                TextButton(onClick = { logoutError = null }) { Text("حسنًا") }
            }
        )
    }

    Scaffold(
        topBar = {
            if (showBars) {
                FlowexaTopBar(
                    title = "Flowexa",
                    companyName = company?.name ?: userProfile?.storeName ?: "Flowexa",
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
            if (showBars && currentRoute != Routes.Notifications.route) {
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
                    isClient = isClient,
                    canViewOrders = PermissionManager.hasPermission(userProfile, PermissionManager.Module.ORDERS, PermissionManager.Action.VIEW),
                    canViewProducts = PermissionManager.hasPermission(userProfile, PermissionManager.Module.PRODUCTS, PermissionManager.Action.VIEW),
                    canViewCustomers = PermissionManager.hasPermission(userProfile, PermissionManager.Module.CUSTOMERS, PermissionManager.Action.VIEW),
                    canViewStaff = userProfile?.role == AppConfig.ROLE_OWNER || userProfile?.role == AppConfig.ROLE_ADMIN
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
                        navController.navigate(Routes.Landing.route) {
                            popUpTo(Routes.Splash.route) { inclusive = true }
                        }
                    } else {
                        // Refresh in the background when a cached profile exists (offline-first).
                        if (authRepo.getCachedProfile(user.uid) != null) {
                            coroutineScope.launch { authRepo.refreshUserProfile(user.uid) }
                        }
                        routeAfterAuth(user.uid)
                    }
                }
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = FlowexaBlue)
                }
            }

            composable(Routes.Landing.route) {
                LandingScreen(
                    onLoginClick = { navController.navigate(Routes.Login.route) },
                    onRegisterClick = { navController.navigate(Routes.Register.route) }
                )
            }


            composable(Routes.ProfileRetry.route) {
                ProfileRetryScreen(
                    isRetrying = isProfileRetrying,
                    onRetry = {
                        coroutineScope.launch {
                            val uid = authRepo.currentUser?.uid
                            if (uid == null) {
                                navController.navigate(Routes.Login.route) {
                                    popUpTo(navController.graph.findStartDestination().id) { inclusive = true }
                                }
                            } else {
                                isProfileRetrying = true
                                routeAfterAuth(uid)
                                isProfileRetrying = false
                            }
                        }
                    },
                    onLogout = { beginLogout() }
                )
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
                                authRepo.currentUser?.uid?.let { uid -> routeAfterAuth(uid) }
                            }.onFailure { err ->
                                if (err is ProfileUnavailableException) {
                                    navController.navigate(Routes.ProfileRetry.route) {
                                        popUpTo(navController.graph.findStartDestination().id) { inclusive = true }
                                    }
                                } else if (err is ProfileNotFoundException) {
                                    navController.navigate(Routes.Onboarding.route) {
                                        popUpTo(navController.graph.findStartDestination().id) { inclusive = true }
                                    }
                                } else {
                                    authError = authErrorMessage(err, "فشل تسجيل الدخول")
                                }
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
                                authRepo.currentUser?.uid?.let { uid -> routeAfterAuth(uid) }
                            }.onFailure { err ->
                                authError = authErrorMessage(err, "فشل تسجيل الدخول عبر Google")
                            }
                        }
                    },
                    onRegisterNavigate = {
                        authError = null
                        resetSuccess = false
                        emailLinkSent = false
                        navController.navigate(Routes.Register.route)
                    },
                    onForgotPasswordNavigate = {
                        authError = null
                        resetSuccess = false
                        navController.navigate(Routes.ForgotPassword.route)
                    },
                    onSendEmailLinkClick = { email ->
                        coroutineScope.launch {
                            isAuthLoading = true
                            authError = null
                            val res = authRepo.sendSignInLinkToEmail(email)
                            isAuthLoading = false
                            res.onSuccess {
                                emailLinkSent = true
                            }.onFailure { err ->
                                authError = authErrorMessage(err, "فشل إرسال رابط الدخول")
                            }
                        }
                    },
                    isLoading = isAuthLoading,
                    errorMessage = authError
                )
                if (emailLinkSent) {
                    AlertDialog(
                        onDismissRequest = { emailLinkSent = false },
                        title = { Text("تم إرسال الرابط") },
                        text = { Text("تم إرسال رابط الدخول إلى بريدك الإلكتروني. افتح الرابط في تطبيق Flowexa لإكمال الدخول.") },
                        confirmButton = {
                            TextButton(onClick = { emailLinkSent = false }) {
                                Text("حسنًا")
                            }
                        }
                    )
                }
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
                                if (err is ProfileUnavailableException || err is ProfileNotFoundException) {
                                    // Account + profile document were just created; only the local read failed.
                                    authRepo.currentUser?.uid?.let { uid -> routeAfterAuth(uid) }
                                } else {
                                    authError = authErrorMessage(err, "فشل إنشاء الحساب")
                                }
                            }
                        }
                    },
                    onLoginNavigate = {
                        authError = null
                        navController.navigate(Routes.Login.route)
                    },
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
                                .onFailure { err -> authError = authErrorMessage(err, "فشل إرسال رابط الاستعادة") }
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

                val primaryCurr = company?.primaryCurrency ?: "SAR"
                val totalSales = todayOrders.sumOf { order ->
                    try {
                        val json = JSONObject(order.totalAmountByCurrencyJson)
                        json.optDouble(primaryCurr, 0.0)
                    } catch (_: Exception) {
                        0.0
                    }
                }

                val stages by stageRepo.observeOrderStages(currentCompanyId).collectAsState(initial = emptyList())
                val stageCounts = orders.groupingBy { it.status }.eachCount()
                val notifs by notificationRepo.observeNotifications(currentCompanyId).collectAsState(initial = emptyList())
                val unread = notifs.count { !it.isRead }

                AdminHomeScreen(
                    stages = stages,
                    stageCounts = stageCounts,
                    delegateCount = todayOrders.count { it.source != "customer" },
                    customerCount = todayOrders.count { it.source == "customer" },
                    unreadNotifications = unread,
                    companyName = company?.name ?: "Flowexa",
                    todayOrdersCount = todayOrdersCount,
                    totalSales = totalSales,
                    currency = primaryCurr,
                    productsCount = products.size,
                    customersCount = customers.size,
                    recentOrders = orders.take(5),
                    onCreateOrderClick = { navController.navigate(Routes.CreateOrder.route) },
                    onProductsClick = { navController.navigate(Routes.Products.route) },
                    onCustomersClick = { navController.navigate(Routes.Customers.route) },
                    onOrderClick = { orderId -> navController.navigate(Routes.OrderDetail.createRoute(orderId)) },
                    onAllOrdersClick = { navController.navigate(Routes.Orders.route) },
                    onCompanySettingsClick = { navController.navigate(Routes.Settings.route) },
                    onNotificationsClick = { navController.navigate(Routes.Notifications.route) },
                    onCallRecordingsClick = { navController.navigate(Routes.CallRecordings.route) },
                    onAdministrationClick = if (userProfile?.role == AppConfig.ROLE_OWNER || userProfile?.role == AppConfig.ROLE_ADMIN) {
                        { navController.navigate(Routes.Administration.route) }
                    } else null,
                    onLogoutClick = { beginLogout() },
                    displayName = userProfile?.displayName ?: "",
                    roleLabel = when (userProfile?.role) {
                        AppConfig.ROLE_OWNER -> "مالك"
                        AppConfig.ROLE_ADMIN -> "مدير"
                        else -> "مبيعات"
                    }
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
                        coroutineScope.launch { productRepo.saveProduct(p, isNew, currentUserId = currentUser?.uid ?: "") }
                    },
                    onDeleteProduct = { id ->
                        coroutineScope.launch { productRepo.deleteProduct(id, currentUserId = currentUser?.uid ?: "") }
                    },
                    companyId = currentCompanyId,
                    primaryCurrency = company?.primaryCurrency ?: "SAR",
                    userProfile = userProfile
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
                        coroutineScope.launch { customerRepo.saveCustomer(c, isNew, currentUserId = currentUser?.uid ?: "") }
                    },
                    onDeleteCustomer = { id ->
                        coroutineScope.launch { customerRepo.deleteCustomer(id, currentUserId = currentUser?.uid ?: "") }
                    },
                    companyId = currentCompanyId,
                    onCustomerClick = { custId ->
                        navController.navigate(Routes.CustomerDetail.createRoute(custId))
                    },
                    userProfile = userProfile
                )
            }

            composable(
                route = Routes.CustomerDetail.route,
                arguments = listOf(navArgument("customerId") { type = NavType.StringType })
            ) { backStackEntry ->
                val customerId = backStackEntry.arguments?.getString("customerId") ?: ""
                var customer by remember { mutableStateOf<com.flowexa.app.data.local.entity.CustomerEntity?>(null) }
                val phones by customerRepo.observeCustomerPhones(customerId).collectAsState(initial = emptyList())
                var insights by remember { mutableStateOf(com.flowexa.app.data.repository.CustomerInsights()) }
                val customerOrders by orderRepo.observeOrders(currentCompanyId).collectAsState(initial = emptyList())
                val filteredOrders = customerOrders.filter { it.customerId == customerId }

                LaunchedEffect(customerId) {
                    customer = customerRepo.getCustomer(customerId)
                    insights = customerRepo.getCustomerInsights(customerId)
                }

                CustomerDetailScreen(
                    customer = customer,
                    phones = phones,
                    insights = insights,
                    orders = filteredOrders,
                    onBackClick = { navController.popBackStack() },
                    onCreateOrderClick = { navController.navigate(Routes.CreateOrder.route) },
                    onOrderClick = { ordId -> navController.navigate(Routes.OrderDetail.createRoute(ordId)) },
                    onEditCustomerClick = {},
                    onMergeClick = {}
                )
            }

            composable(Routes.SalesQuickOrder.route) {
                val products by productRepo.observeProducts(currentCompanyId).collectAsState(initial = emptyList())

                SalesQuickOrderScreen(
                    products = products,
                    onBackClick = { navController.popBackStack() },
                    onLookupCustomerByPhone = { phone ->
                        customerRepo.findCustomerByPhone(currentCompanyId, phone)
                    },
                    onLoadCustomerInsights = { custId ->
                        customerRepo.getCustomerInsights(custId)
                    },
                    onConfirmOrder = { custId, custName, custPhone, custAddress, invType, notes, items, totals ->
                        coroutineScope.launch {
                            val initialStatus = stageRepo.getFirstStageName(currentCompanyId) ?: "pending"
                            orderRepo.createOrder(
                                companyId = currentCompanyId,
                                customerId = custId,
                                customerName = custName,
                                customerPhone = custPhone,
                                customerAddress = custAddress,
                                invoiceType = invType,
                                dueDate = null,
                                notes = notes,
                                source = "phone",
                                clientUid = null,
                                createdBy = currentUser?.uid ?: "",
                                createdByName = userProfile?.displayName ?: "موظف المبيعات",
                                items = items,
                                totalAmountByCurrency = totals,
                                initialStatus = initialStatus
                            )
                            navController.popBackStack()
                        }
                    }
                )
            }

            composable(
                route = Routes.ProductDetail.route,
                arguments = listOf(navArgument("productId") { type = NavType.StringType })
            ) { backStackEntry ->
                val productId = backStackEntry.arguments?.getString("productId") ?: ""
                var product by remember { mutableStateOf<com.flowexa.app.data.local.entity.ProductEntity?>(null) }
                val favoriteIds by favoritesRepo.observeFavoriteProductIds(currentUser?.uid ?: "").collectAsState(initial = emptyList())
                val isFav = favoriteIds.contains(productId)

                LaunchedEffect(productId) {
                    product = productRepo.getProduct(productId)
                }

                ProductDetailScreen(
                    product = product,
                    isFavorite = isFav,
                    onBackClick = { navController.popBackStack() },
                    onToggleFavorite = {
                        coroutineScope.launch {
                            currentUser?.uid?.let { uid -> favoritesRepo.toggleFavorite(uid, productId) }
                        }
                    },
                    onOrderClick = { prodId ->
                        if (isClient) {
                            navController.navigate(Routes.ClientCreateOrder.createRoute(prodId))
                        } else {
                            navController.navigate(Routes.CreateOrder.createRoute(prodId))
                        }
                    }
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

            composable(
                route = Routes.CreateOrder.route,
                arguments = listOf(navArgument("productId") {
                    type = NavType.StringType
                    nullable = true
                    defaultValue = null
                })
            ) { backStackEntry ->
                val prodId = backStackEntry.arguments?.getString("productId")
                val customers by customerRepo.observeCustomers(currentCompanyId).collectAsState(initial = emptyList())
                val products by productRepo.observeProducts(currentCompanyId).collectAsState(initial = emptyList())

                CreateOrderScreen(
                    customers = customers,
                    products = products,
                    initialProductId = prodId,
                    primaryCurrency = company?.primaryCurrency ?: "SAR",
                    onBackClick = { navController.popBackStack() },
                    onConfirmOrder = { custId, custName, custPhone, custAddress, invType, notes, items, totals ->
                        coroutineScope.launch {
                            val initialStatus = stageRepo.getFirstStageName(currentCompanyId) ?: "pending"
                            orderRepo.createOrder(
                                companyId = currentCompanyId,
                                customerId = custId,
                                customerName = custName,
                                customerPhone = custPhone,
                                customerAddress = custAddress,
                                invoiceType = invType,
                                dueDate = null,
                                notes = notes,
                                source = if (userProfile?.role == AppConfig.ROLE_SALES) "sales" else "admin",
                                clientUid = null,
                                createdBy = currentUser?.uid ?: "",
                                createdByName = userProfile?.displayName ?: "المدير",
                                items = items,
                                totalAmountByCurrency = totals,
                                initialStatus = initialStatus
                            )
                            navController.popBackStack()
                        }
                    }
                )
            }

            composable(
                route = Routes.ClientCreateOrder.route,
                arguments = listOf(navArgument("productId") {
                    type = NavType.StringType
                    nullable = true
                    defaultValue = null
                })
            ) { backStackEntry ->
                val prodId = backStackEntry.arguments?.getString("productId")
                val products by productRepo.observeProducts(currentCompanyId).collectAsState(initial = emptyList())
                val customers by customerRepo.observeCustomers(currentCompanyId).collectAsState(initial = emptyList())

                val clientUid = currentUser?.uid ?: ""
                val clientCustomer = customers.find { it.appUserId == clientUid }
                    ?: com.flowexa.app.data.local.entity.CustomerEntity(
                        id = "crm_client_$clientUid",
                        companyId = currentCompanyId,
                        name = userProfile?.displayName ?: "عميل",
                        phone = userProfile?.phone,
                        address = userProfile?.address,
                        appUserId = clientUid
                    )

                CreateOrderScreen(
                    customers = listOf(clientCustomer),
                    products = products,
                    isClientMode = true,
                    preselectedCustomer = clientCustomer,
                    initialProductId = prodId,
                    primaryCurrency = company?.primaryCurrency ?: "SAR",
                    onBackClick = { navController.popBackStack() },
                    onConfirmOrder = { custId, custName, custPhone, custAddress, invType, notes, items, totals ->
                        coroutineScope.launch {
                            val initialStatus = stageRepo.getFirstStageName(currentCompanyId) ?: "pending"
                            orderRepo.createOrder(
                                companyId = currentCompanyId,
                                customerId = custId,
                                customerName = custName,
                                customerPhone = custPhone,
                                customerAddress = custAddress,
                                invoiceType = invType,
                                dueDate = null,
                                notes = notes,
                                source = "customer",
                                clientUid = clientUid,
                                createdBy = clientUid,
                                createdByName = userProfile?.displayName ?: "العميل",
                                items = items,
                                totalAmountByCurrency = totals,
                                initialStatus = initialStatus
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

                val detailStages by stageRepo.observeOrderStages(currentCompanyId).collectAsState(initial = emptyList())
                val detailNotifRepo = remember { NotificationRepository(db, context) }

                OrderDetailScreen(
                    order = order,
                    items = items,
                    stages = detailStages,
                    isClient = isClient,
                    onBackClick = { navController.popBackStack() },
                    onMoveToNextStage = { nextName, isFinal ->
                        coroutineScope.launch {
                            val o = order
                            orderRepo.updateStatus(orderId, nextName, currentUser?.uid ?: "")
                            if (o != null && !isFinal) {
                                val cUid = o.clientUid ?: if (o.source == "customer") o.createdBy else null
                                detailNotifRepo.createNotification(
                                    companyId = o.companyId,
                                    title = "تحديث حالة الطلب",
                                    message = "تم تحديث حالة الطلب للعميل ${o.customerName} إلى: $nextName",
                                    type = "status_update", orderId = o.id, clientUid = cUid,
                                    createdBy = currentUser?.uid ?: ""
                                )
                            }
                            navController.popBackStack()
                        }
                    },
                    onExcludeItems = { indexes, hours, onResult ->
                        coroutineScope.launch {
                            val o = order
                            if (o == null) { onResult(false); return@launch }
                            val first = stageRepo.getFirstStageName(currentCompanyId) ?: "pending"
                            val ok = orderRepo.excludeItems(o, items, indexes, first, currentUser?.uid ?: "", userProfile?.displayName)
                            if (ok) {
                                detailNotifRepo.createNotification(
                                    companyId = o.companyId,
                                    title = "تذكير باستكمال صنف مستثنى",
                                    message = "طلب مجدول: العميل ${o.customerName} يحتاج لتوفير أصناف نفذت.",
                                    type = "reminder", orderId = o.id, clientUid = null,
                                    createdBy = currentUser?.uid ?: "",
                                    remindAtMs = System.currentTimeMillis() + hours * 3600_000L
                                )
                                order = orderRepo.getOrder(orderId)
                            }
                            onResult(ok)
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
                    },
                    onUpdateStaffPermissions = { emp, newRole, permsJson ->
                        coroutineScope.launch {
                            val updatedEmp = emp.copy(
                                role = newRole,
                                permissionsJson = permsJson,
                                updatedAtMs = System.currentTimeMillis(),
                                syncState = AppConfig.SYNC_STATE_PENDING
                            )
                            db.userProfileDao().insert(updatedEmp)
                            val syncDao = db.syncOperationDao()
                            val payload = JSONObject().apply {
                                put("role", newRole)
                                put("permissions", JSONObject(permsJson))
                                put("updatedBy", currentUser?.uid ?: "")
                            }
                            syncDao.enqueueWithCoalescing(
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
                            val uid = currentUser?.uid ?: ""
                            notificationRepo.markAsRead(notif.id, uid)
                            if (!notif.orderId.isNullOrEmpty()) {
                                navController.navigate(Routes.OrderDetail.createRoute(notif.orderId))
                            }
                        }
                    },
                    onMarkAllAsRead = {
                        coroutineScope.launch {
                            val uid = currentUser?.uid ?: ""
                            notifications.forEach { notificationRepo.markAsRead(it.id, uid) }
                        }
                    }
                )
            }

            composable(Routes.CallRecordings.route) {
                val prefs = remember { context.getSharedPreferences("flowexa_calls", android.content.Context.MODE_PRIVATE) }
                val prefKey = "company_contacts_$currentCompanyId"
                var contacts by remember(currentCompanyId) {
                    mutableStateOf(runCatching {
                        val a = org.json.JSONArray(prefs.getString(prefKey, "[]"))
                        List(a.length()) { CallContact(a.getJSONObject(it).getString("name"), a.getJSONObject(it).getString("tel")) }
                    }.getOrDefault(emptyList()))
                }
                fun persist(list: List<CallContact>) {
                    contacts = list
                    val a = org.json.JSONArray(); list.forEach { a.put(org.json.JSONObject().put("name", it.name).put("tel", it.tel)) }
                    prefs.edit().putString(prefKey, a.toString()).apply()
                }
                val recordings by db.callRecordingDao().observeRecordings(currentCompanyId).collectAsState(initial = emptyList())
                val callCustomers by customerRepo.observeCustomers(currentCompanyId).collectAsState(initial = emptyList())
                val callProducts by productRepo.observeProducts(currentCompanyId).collectAsState(initial = emptyList())
                CallRecordingsScreen(
                    recordings = recordings,
                    contacts = contacts,
                    customers = callCustomers,
                    products = callProducts,
                    onDeleteRecording = { r ->
                        coroutineScope.launch {
                            try { java.io.File(r.filePath).delete() } catch (_: Exception) {}
                            db.callRecordingDao().delete(r.id)
                        }
                    },
                    onAddContact = { persist(contacts + it) },
                    onDeleteContact = { i -> persist(contacts.filterIndexed { idx, _ -> idx != i }) },
                    onSimulateCall = { c ->
                        navController.popBackStack()
                        coroutineScope.launch { kotlinx.coroutines.delay(1500); incomingCall = c }
                    },
                    onCreateOrder = { customer, product, qty, onDone ->
                        coroutineScope.launch {
                            try {
                                val initialStatus = stageRepo.getFirstStageName(currentCompanyId) ?: "pending"
                                orderRepo.createOrder(
                                    companyId = currentCompanyId,
                                    customerId = customer.id,
                                    customerName = customer.name,
                                    customerPhone = customer.phone,
                                    customerAddress = customer.address ?: "غير محدد",
                                    invoiceType = null,
                                    dueDate = null,
                                    notes = null,
                                    source = "company",
                                    clientUid = customer.appUserId,
                                    createdBy = currentUser?.uid ?: "",
                                    createdByName = userProfile?.displayName,
                                    items = listOf(OrderItemEntity(orderId = "", productId = product.id, productName = product.name, quantity = qty.toDouble(), price = product.price, currency = product.currency)),
                                    totalAmountByCurrency = mapOf(product.currency to product.price * qty),
                                    initialStatus = initialStatus
                                )
                                onDone(true)
                            } catch (e: Exception) { onDone(false) }
                        }
                    }
                )
            }

            composable(Routes.Administration.route) {
                val locationRepo = remember { LocationRepository(db, context) }
                val categoryRepo = remember { ProductCategoryRepository(db, context) }
                val brandRepo = remember { ProductBrandRepository(db, context) }
                val locations by locationRepo.observeLocations(currentCompanyId).collectAsState(initial = emptyList())
                val categories by categoryRepo.observeCategories(currentCompanyId).collectAsState(initial = emptyList())
                val brands by brandRepo.observeBrands(currentCompanyId).collectAsState(initial = emptyList())
                val adminStages by stageRepo.observeOrderStages(currentCompanyId).collectAsState(initial = emptyList())
                val uid = currentUser?.uid ?: ""
                AdministrationScreen(
                    isAdmin = userProfile?.role == AppConfig.ROLE_OWNER || userProfile?.role == AppConfig.ROLE_ADMIN,
                    company = company,
                    locations = locations,
                    categories = categories,
                    brands = brands,
                    stages = adminStages,
                    onSaveCurrencies = { primary, secondary, rates ->
                        company?.let { c ->
                            coroutineScope.launch {
                                companyRepo.updateCompany(c.copy(
                                    primaryCurrency = primary,
                                    secondaryCurrenciesJson = org.json.JSONArray(secondary).toString(),
                                    exchangeRatesJson = org.json.JSONObject(rates as Map<*, *>).toString()
                                ), uid)
                            }
                        }
                    },
                    onAddLocation = { name, type, parentId ->
                        coroutineScope.launch { locationRepo.saveLocation(LocationEntity(id = UUID.randomUUID().toString(), companyId = currentCompanyId, type = type, name = name, parentId = parentId), true, uid) }
                    },
                    onDeleteLocation = { id -> coroutineScope.launch { locationRepo.deleteLocation(id, uid) } },
                    onAddCategory = { n -> coroutineScope.launch { categoryRepo.saveCategory(ProductCategoryEntity(id = UUID.randomUUID().toString(), companyId = currentCompanyId, name = n), true, uid) } },
                    onDeleteCategory = { id -> coroutineScope.launch { categoryRepo.deleteCategory(id, uid) } },
                    onAddBrand = { n -> coroutineScope.launch { brandRepo.saveBrand(ProductBrandEntity(id = UUID.randomUUID().toString(), companyId = currentCompanyId, name = n), true, uid) } },
                    onDeleteBrand = { id -> coroutineScope.launch { brandRepo.deleteBrand(id, uid) } },
                    onAddStage = { n, roles ->
                        coroutineScope.launch {
                            stageRepo.saveOrderStage(OrderStageEntity(
                                id = UUID.randomUUID().toString(), companyId = currentCompanyId, name = n,
                                stageIndex = adminStages.size, allowedRolesJson = org.json.JSONArray(roles).toString()
                            ), true, uid)
                        }
                    },
                    onDeleteStage = { id -> coroutineScope.launch { stageRepo.deleteOrderStage(id, uid) } }
                )
            }

            composable(Routes.Settings.route) {
                val settingsLocations by remember { LocationRepository(db, context) }.observeLocations(currentCompanyId).collectAsState(initial = emptyList())
                CompanySettingsScreen(
                    locations = settingsLocations,
                    canEdit = userProfile?.role == AppConfig.ROLE_OWNER || userProfile?.role == AppConfig.ROLE_ADMIN,
                    company = company,
                    pendingSyncCount = pendingSyncCount,
                    onSaveCompany = { updated ->
                        coroutineScope.launch { companyRepo.updateCompany(updated, currentUser?.uid ?: "") }
                    },
                    onManualSync = {
                        coroutineScope.launch {
                            syncEngine.syncOutbox()
                            if (currentCompanyId.isNotEmpty() && currentUser != null) {
                                syncEngine.syncCompanyData(currentCompanyId, currentUser.uid)
                            }
                        }
                    },
                    onLogout = { beginLogout() }
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

            composable(Routes.ClientProfile.route) {
                val clientOrders by orderRepo.observeClientOrders(currentUser?.uid ?: "").collectAsState(initial = emptyList())
                val profileRepo = remember { ProfileRepository(db, context) }
                ClientProfileScreen(
                    profile = userProfile,
                    orders = clientOrders,
                    loadItems = { id -> orderRepo.getOrderItems(id) },
                    onSave = { form -> currentUser?.uid?.let { profileRepo.updateClientProfile(it, form) } },
                    onLogout = { beginLogout() }
                )
            }

            composable(Routes.ClientCatalog.route) {
                var query by remember { mutableStateOf("") }
                val products by productRepo.searchProducts(currentCompanyId, query).collectAsState(initial = emptyList())
                val categories by remember { ProductCategoryRepository(db, context) }.observeCategories(currentCompanyId).collectAsState(initial = emptyList())
                val favoriteIds by favoritesRepo.observeFavoriteProductIds(currentUser?.uid ?: "").collectAsState(initial = emptyList())

                ClientCatalogScreen(
                    products = products,
                    categories = categories,
                    favoriteProductIds = favoriteIds,
                    searchQuery = query,
                    onSearchChange = { query = it },
                    onProductClick = { prodId -> navController.navigate(Routes.ProductDetail.createRoute(prodId)) },
                    onToggleFavorite = { prodId ->
                        coroutineScope.launch {
                            currentUser?.uid?.let { uid -> favoritesRepo.toggleFavorite(uid, prodId) }
                        }
                    },
                    onOrderProduct = { prod ->
                        navController.navigate(Routes.ClientCreateOrder.createRoute(prod.id))
                    }
                )
            }

            composable(Routes.ClientOrders.route) {
                val clientOrders by orderRepo.observeClientOrders(currentUser?.uid ?: "").collectAsState(initial = emptyList())
                OrdersScreen(
                    orders = clientOrders,
                    selectedStatus = "all",
                    onStatusSelected = {},
                    onCreateOrderClick = { navController.navigate(Routes.ClientCreateOrder.createRoute(null)) },
                    onOrderClick = { orderId -> navController.navigate(Routes.OrderDetail.createRoute(orderId)) }
                )
            }

            composable(Routes.ClientFavorites.route) {
                val favoriteIds by favoritesRepo.observeFavoriteProductIds(currentUser?.uid ?: "").collectAsState(initial = emptyList())
                val allProducts by productRepo.observeProducts(currentCompanyId).collectAsState(initial = emptyList())
                val favoriteProducts = allProducts.filter { favoriteIds.contains(it.id) }

                FavoritesScreen(
                    favoriteProducts = favoriteProducts,
                    onBackClick = { navController.popBackStack() },
                    onOrderProduct = { navController.navigate(Routes.ClientCreateOrder.createRoute(null)) },
                    onToggleFavorite = { productId ->
                        coroutineScope.launch {
                            val uid = currentUser?.uid ?: ""
                            favoritesRepo.toggleFavorite(uid, productId)
                        }
                    }
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
                val pdfService = remember { com.flowexa.app.service.PriceListPdfService(context) }

                LaunchedEffect(compId) {
                    publicCompany = companyRepo.getCompany(compId)
                    productRepo.loadPublicCatalog(compId)
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
                    },
                    onExportPdfClick = {
                        coroutineScope.launch {
                            val res = pdfService.generatePriceListPdf(publicCompany, products)
                            res.onSuccess { pdfFile ->
                                val uri = androidx.core.content.FileProvider.getUriForFile(
                                    context,
                                    "${context.packageName}.fileprovider",
                                    pdfFile
                                )
                                val shareIntent = android.content.Intent(android.content.Intent.ACTION_SEND).apply {
                                    type = "application/pdf"
                                    putExtra(android.content.Intent.EXTRA_STREAM, uri)
                                    addFlags(android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION)
                                }
                                context.startActivity(android.content.Intent.createChooser(shareIntent, "مشاركة لائحة الأسعار"))
                            }
                        }
                    }
                )
            }
        }
    }
}
