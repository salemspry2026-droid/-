package com.flowexa.app.data.remote

import com.flowexa.app.core.AppConfig
import com.google.firebase.Firebase
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.auth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.firestore
import com.google.firebase.storage.FirebaseStorage
import com.google.firebase.storage.storage

object FirebaseProvider {
    val auth: FirebaseAuth
        get() = Firebase.auth

    val firestore: FirebaseFirestore
        get() = Firebase.firestore(AppConfig.FIRESTORE_DATABASE_ID)

    val storage: FirebaseStorage
        get() = Firebase.storage
}
