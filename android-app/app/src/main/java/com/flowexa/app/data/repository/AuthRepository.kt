package com.flowexa.app.data.repository

import com.flowexa.app.core.AppConfig
import com.flowexa.app.data.local.FlowexaDatabase
import com.flowexa.app.data.local.entity.UserProfileEntity
import com.flowexa.app.data.remote.FirebaseProvider
import com.flowexa.app.data.remote.FirestoreMappers
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseUser
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withContext

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
            val profile = fetchAndCacheUserProfile(user.uid)
            Result.success(profile)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun register(email: String, pass: String, displayName: String): Result<UserProfileEntity> = withContext(Dispatchers.IO) {
        try {
            val authResult = auth.createUserWithEmailAndPassword(email.trim(), pass).await()
            val user = authResult.user ?: throw Exception("فشل إنشاء الحساب")
            
            // Create user profile in Firestore
            val profileMap = hashMapOf(
                "email" to email.trim(),
                "displayName" to displayName.trim(),
                "role" to AppConfig.ROLE_CLIENT,
                "companyId" to "",
                "createdBy" to user.uid,
                "updatedBy" to user.uid,
                "createdAt" to com.google.firebase.firestore.FieldValue.serverTimestamp(),
                "updatedAt" to com.google.firebase.firestore.FieldValue.serverTimestamp(),
                "isDeleted" to false
            )
            firestore.collection(AppConfig.COL_USER_PROFILES).document(user.uid).set(profileMap).await()

            val profile = fetchAndCacheUserProfile(user.uid)
            Result.success(profile)
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

    suspend fun refreshUserProfile(uid: String): Result<UserProfileEntity> = withContext(Dispatchers.IO) {
        try {
            val doc = firestore.collection(AppConfig.COL_USER_PROFILES).document(uid).get().await()
            val profile = if (doc.exists()) {
                FirestoreMappers.docToUserProfile(doc)
            } else {
                UserProfileEntity(
                    id = uid,
                    email = auth.currentUser?.email ?: "",
                    displayName = auth.currentUser?.displayName ?: "مستخدم Flowexa"
                )
            }
            database.userProfileDao().insert(profile)
            Result.success(profile)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getCachedOrRemoteProfile(uid: String): Result<UserProfileEntity> = withContext(Dispatchers.IO) {
        val cached = getCachedProfile(uid)
        if (cached != null) {
            return@withContext Result.success(cached)
        }
        refreshUserProfile(uid)
    }

    suspend fun fetchAndCacheUserProfile(uid: String): UserProfileEntity = withContext(Dispatchers.IO) {
        val cached = getCachedProfile(uid)
        if (cached != null) return@withContext cached

        val refreshed = refreshUserProfile(uid)
        refreshed.getOrElse {
            UserProfileEntity(
                id = uid,
                email = auth.currentUser?.email ?: "",
                displayName = auth.currentUser?.displayName ?: "مستخدم Flowexa"
            )
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
