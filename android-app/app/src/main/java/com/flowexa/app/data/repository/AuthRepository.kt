package com.flowexa.app.data.repository

import com.flowexa.app.core.AppConfig
import com.flowexa.app.data.local.FlowexaDatabase
import com.flowexa.app.data.local.entity.UserProfileEntity
import com.flowexa.app.data.remote.FirebaseProvider
import com.flowexa.app.data.remote.FirestoreMappers
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseAuthException
import com.google.firebase.auth.UserProfileChangeRequest
import com.google.firebase.auth.FirebaseUser
import com.google.firebase.firestore.FirebaseFirestoreException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withContext

/**
 * Outcome of loading the signed-in user's profile. The four cases the app must NEVER confuse:
 *  A. [Found]        - authenticated and the profile document exists (cached or remote)
 *  B. [NotFound]     - authenticated and the profile document CONFIRMED not to exist -> onboarding
 *  C. [Unavailable]  - authenticated but the profile could not be loaded (offline / error) and
 *                      there is no cached copy -> show retry, NEVER route to onboarding
 *  D. not authenticated is handled by the caller (FirebaseAuth.currentUser == null)
 */
sealed class ProfileLoadResult {
    data class Found(val profile: UserProfileEntity) : ProfileLoadResult()
    data object NotFound : ProfileLoadResult()
    data class Unavailable(val cause: Throwable?) : ProfileLoadResult()
}

class ProfileNotFoundException : Exception("ملف المستخدم غير موجود")
class ProfileUnavailableException(cause: Throwable?) :
    Exception("تم تسجيل الدخول لكن تعذر تحميل ملفك الشخصي. تحقق من الاتصال ثم أعد المحاولة.", cause)

class AuthRepository(
    private val database: FlowexaDatabase
) {
    private val auth: FirebaseAuth = FirebaseProvider.auth
    private val firestore = FirebaseProvider.firestore

    val currentUser: FirebaseUser?
        get() = auth.currentUser

    fun observeCurrentProfile(uid: String): Flow<UserProfileEntity?> {
        return database.userProfileDao().observeProfile(uid)
    }

    suspend fun getCachedProfile(uid: String): UserProfileEntity? = withContext(Dispatchers.IO) {
        database.userProfileDao().getProfile(uid)
    }

    suspend fun login(email: String, pass: String): Result<UserProfileEntity> = withContext(Dispatchers.IO) {
        try {
            val authResult = auth.signInWithEmailAndPassword(email.trim(), pass).await()
            val user = authResult.user ?: throw Exception("تعذر العثور على المستخدم")
            when (val r = loadProfile(user.uid)) {
                is ProfileLoadResult.Found -> Result.success(r.profile)
                ProfileLoadResult.NotFound -> Result.failure(ProfileNotFoundException())
                is ProfileLoadResult.Unavailable -> Result.failure(ProfileUnavailableException(r.cause))
            }
        } catch (e: Exception) {
            // Web parity (app/page.tsx): invalid credential / unknown user -> try to create the account
            // seamlessly; if the e-mail already exists the password was simply wrong.
            val code = (e as? FirebaseAuthException)?.errorCode
            if (code == "ERROR_INVALID_CREDENTIAL" || code == "ERROR_USER_NOT_FOUND") {
                return@withContext try {
                    val created = auth.createUserWithEmailAndPassword(email.trim(), pass).await()
                    val user = created.user ?: throw Exception("فشل إنشاء الحساب")
                    user.updateProfile(
                        UserProfileChangeRequest.Builder()
                            .setDisplayName(email.trim().substringBefore('@'))
                            .build()
                    ).await()
                    when (val r = loadProfile(user.uid)) {
                        is ProfileLoadResult.Found -> Result.success(r.profile)
                        ProfileLoadResult.NotFound -> Result.failure(ProfileNotFoundException())
                        is ProfileLoadResult.Unavailable -> Result.failure(ProfileUnavailableException(r.cause))
                    }
                } catch (ce: Exception) {
                    when ((ce as? FirebaseAuthException)?.errorCode) {
                        "ERROR_EMAIL_ALREADY_IN_USE" -> Result.failure(Exception(
                            "كلمة المرور غير صحيحة لهذا الحساب. يرجى التأكد من كلمة المرور أو استخدام \"نسيت كلمة المرور؟\"."))
                        "ERROR_WEAK_PASSWORD" -> Result.failure(Exception(
                            "كلمة المرور يجب أن تكون 6 أحرف أو أرقام على الأقل."))
                        else -> Result.failure(ce)
                    }
                }
            }
            Result.failure(e)
        }
    }

    suspend fun register(email: String, pass: String, displayName: String): Result<UserProfileEntity> = withContext(Dispatchers.IO) {
        try {
            val authResult = auth.createUserWithEmailAndPassword(email.trim(), pass).await()
            val user = authResult.user ?: throw Exception("فشل إنشاء الحساب")

            // NOTE: We intentionally do NOT create a user profile here.
            // The profile is created during onboarding (createCompany / joinAsEmployee / joinAsClient).
            // Pre-creating a client profile caused new email-registered users to route to ClientHome
            // instead of Onboarding, and the self-role-change Firestore rule made that role permanent.
            // See: C-09, KI-008.

            when (val r = loadProfile(user.uid)) {
                is ProfileLoadResult.Found -> Result.success(r.profile)
                ProfileLoadResult.NotFound -> Result.failure(ProfileNotFoundException())
                is ProfileLoadResult.Unavailable -> Result.failure(ProfileUnavailableException(r.cause))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun sendPasswordReset(email: String): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            auth.sendPasswordResetEmail(email.trim()).await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Reads the profile from Firestore and caches it. NEVER fabricates a profile:
     *  - document exists            -> success(profile) and cached
     *  - document confirmed missing -> failure(ProfileNotFoundException)
     *  - anything else (offline...) -> failure(original error)
     */
    suspend fun refreshUserProfile(uid: String): Result<UserProfileEntity> = withContext(Dispatchers.IO) {
        try {
            val doc = firestore.collection(AppConfig.COL_USER_PROFILES).document(uid).get().await()
            if (doc.exists()) {
                val profile = FirestoreMappers.docToUserProfile(doc)
                database.userProfileDao().insert(profile)
                Result.success(profile)
            } else if (doc.metadata.isFromCache) {
                // "Missing" according to the local cache only - not proof that it does not exist.
                Result.failure(FirebaseFirestoreException(
                    "Profile not confirmed (served from cache)",
                    FirebaseFirestoreException.Code.UNAVAILABLE
                ))
            } else {
                Result.failure(ProfileNotFoundException())
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /** Cache first (offline-first); falls back to a remote read only when nothing is cached. */
    suspend fun loadProfile(uid: String): ProfileLoadResult = withContext(Dispatchers.IO) {
        val cached = getCachedProfile(uid)
        if (cached != null) return@withContext ProfileLoadResult.Found(cached)

        val remote = refreshUserProfile(uid)
        remote.fold(
            onSuccess = { ProfileLoadResult.Found(it) },
            onFailure = { e ->
                if (e is ProfileNotFoundException) ProfileLoadResult.NotFound
                else ProfileLoadResult.Unavailable(e)
            }
        )
    }

    /**
     * Completes Firebase email-link sign-in. [emailLink] is used only for this call; it is never
     * logged or stored. Returns the profile load outcome so the caller can route correctly.
     */
    suspend fun completeEmailLinkSignIn(email: String, emailLink: String): Result<ProfileLoadResult> =
        withContext(Dispatchers.IO) {
            try {
                if (!auth.isSignInWithEmailLink(emailLink)) {
                    return@withContext Result.failure(IllegalArgumentException("رابط تسجيل الدخول غير صالح"))
                }
                val result = auth.signInWithEmailLink(email.trim(), emailLink).await()
                val user = result.user ?: return@withContext Result.failure(Exception("تعذر العثور على المستخدم"))
                Result.success(loadProfile(user.uid))
            } catch (e: Exception) {
                Result.failure(e)
            }
        }

    fun isEmailSignInLink(link: String): Boolean = try {
        auth.isSignInWithEmailLink(link)
    } catch (_: Exception) {
        false
    }

    /**
     * Sends a passwordless sign-in link to [email] with Android deep-link settings
     * so the app can handle the link when opened.
     */
    suspend fun sendSignInLinkToEmail(email: String): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            val actionCodeSettings = com.google.firebase.auth.ActionCodeSettings.newBuilder()
                .setUrl("https://orderflow-topaz.vercel.app/")
                .setHandleCodeInApp(true)
                .setAndroidPackageName(
                    "com.flowexa.app",
                    false,  // installIfNotAvailable (same as web)
                    "1"     // minimumVersion
                )
                .build()
            auth.sendSignInLinkToEmail(email.trim(), actionCodeSettings).await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun logout(): Unit = withContext(Dispatchers.IO) {
        val uid = auth.currentUser?.uid
        auth.signOut()
        if (uid != null) {
            database.userProfileDao().delete(uid)
        }
    }
}


/** Arabic auth messages identical to the web login screen (app/page.tsx). */
fun authErrorMessage(e: Throwable, fallback: String): String {
    val code = (e as? FirebaseAuthException)?.errorCode
    return when (code) {
        "ERROR_INVALID_CREDENTIAL", "ERROR_WRONG_PASSWORD", "ERROR_USER_NOT_FOUND", "ERROR_INVALID_EMAIL" ->
            "البريد الإلكتروني أو كلمة المرور غير صحيحة"
        "ERROR_EMAIL_ALREADY_IN_USE" -> "هذا البريد الإلكتروني مسجل مسبقاً، يرجى تسجيل الدخول."
        "ERROR_WEAK_PASSWORD" -> "كلمة المرور ضعيفة جداً، يجب أن تكون 6 أحرف على الأقل."
        "ERROR_OPERATION_NOT_ALLOWED" -> "طريقة تسجيل الدخول هذه غير مفعلة في إعدادات Firebase Authentication."
        "ERROR_NETWORK_REQUEST_FAILED" -> "فشل الاتصال بالخادم. يرجى التأكد من اتصال الإنترنت."
        "ERROR_TOO_MANY_REQUESTS" -> "تم حظر الحساب مؤقتاً بسبب محاولات تسجيل دخول خاطئة كثيرة. يرجى إعادة المحاولة لاحقاً أو استعادة كلمة المرور."
        else -> if (e is com.google.firebase.FirebaseNetworkException)
            "فشل الاتصال بالخادم. يرجى التأكد من اتصال الإنترنت."
        else e.message?.takeIf { it.isNotBlank() } ?: fallback
    }
}
