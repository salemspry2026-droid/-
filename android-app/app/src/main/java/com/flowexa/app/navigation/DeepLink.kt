package com.flowexa.app.navigation

/**
 * Deep links the app understands. Instances are compared by IDENTITY (plain classes, not data
 * classes) so opening the same link twice still re-triggers navigation under launchMode=singleTask.
 */
sealed class DeepLink {
    /** https://orderflow-topaz.vercel.app/c/{companyId} */
    class PublicCatalog(val companyId: String) : DeepLink()

    /** Firebase email sign-in link. [link] is a credential: never log it, never persist it. */
    class EmailSignIn(val link: String) : DeepLink() {
        override fun toString() = "EmailSignIn(link=<redacted>)"
    }
}

/** Pure (Android-free) classification so it can be unit-tested on the JVM. */
object DeepLinkParser {
    private const val CATALOG_PREFIX = "/c/"
    private const val MAX_COMPANY_ID_LENGTH = 128

    fun parse(
        scheme: String?,
        host: String?,
        decodedPath: String?,
        fullUrl: String,
        webHost: String,
        firebaseAuthHost: String
    ): DeepLink? {
        if (!"https".equals(scheme, ignoreCase = true) || host == null) return null
        val path = decodedPath ?: ""

        // Public catalog: ONLY on our web host. Never on the Firebase auth host.
        if (host.equals(webHost, ignoreCase = true) && path.startsWith(CATALOG_PREFIX)) {
            val id = path.removePrefix(CATALOG_PREFIX).substringBefore('/').trim()
            if (id.isNotEmpty() && id.length <= MAX_COMPANY_ID_LENGTH) return DeepLink.PublicCatalog(id)
            return null
        }

        // Firebase auth action links live under /__/auth/ on the Firebase domain.
        if (host.equals(firebaseAuthHost, ignoreCase = true) && path.startsWith("/__/auth/")) {
            return DeepLink.EmailSignIn(fullUrl)
        }
        return null
    }
}
