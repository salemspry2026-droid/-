package com.flowexa.app.auth

import android.content.Context
import androidx.credentials.CredentialManager
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialException
import com.flowexa.app.data.remote.FirebaseProvider
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.google.firebase.auth.GoogleAuthProvider
import kotlinx.coroutines.tasks.await

class GoogleAuthManager(private val context: Context) {
    private val credentialManager = CredentialManager.create(context)
    private val auth = FirebaseProvider.auth

    private fun getWebClientId(): String {
        val resId = context.resources.getIdentifier("default_web_client_id", "string", context.packageName)
        return if (resId != 0) context.getString(resId) else ""
    }

    suspend fun signInWithGoogle(): Result<Unit> {
        return try {
            val clientId = getWebClientId()
            if (clientId.isEmpty()) {
                return Result.failure(Exception("Google Sign-In configuration (default_web_client_id) was not found in resources."))
            }

            val googleIdOption = GetGoogleIdOption.Builder()
                .setFilterByAuthorizedAccounts(false)
                .setServerClientId(clientId)
                .setAutoSelectEnabled(false)
                .build()

            val request = GetCredentialRequest.Builder()
                .addCredentialOption(googleIdOption)
                .build()

            val response = credentialManager.getCredential(context, request)
            val credential = response.credential

            if (credential.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL) {
                val googleIdTokenCredential = GoogleIdTokenCredential.createFrom(credential.data)
                val idToken = googleIdTokenCredential.idToken

                val firebaseCredential = GoogleAuthProvider.getCredential(idToken, null)
                auth.signInWithCredential(firebaseCredential).await()
                Result.success(Unit)
            } else {
                Result.failure(Exception("نوع الاعتماد غير مدعوم"))
            }
        } catch (e: GetCredentialException) {
            Result.failure(e)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
