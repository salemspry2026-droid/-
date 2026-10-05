package com.flowexa.app.navigation

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotSame
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class DeepLinkParserTest {
    private val web = "orderflow-topaz.vercel.app"
    private val fb = "gen-lang-client-0196712383.firebaseapp.com"

    private fun parse(scheme: String?, host: String?, path: String?, url: String = "https://$host$path") =
        DeepLinkParser.parse(scheme, host, path, url, web, fb)

    @Test
    fun catalogLink_isParsed() {
        val link = parse("https", web, "/c/abc123") as DeepLink.PublicCatalog
        assertEquals("abc123", link.companyId)
    }

    @Test
    fun catalogLink_trailingSlashAndExtraSegments_areIgnored() {
        assertEquals("abc", (parse("https", web, "/c/abc/") as DeepLink.PublicCatalog).companyId)
        assertEquals("abc", (parse("https", web, "/c/abc/products/1") as DeepLink.PublicCatalog).companyId)
    }

    @Test
    fun catalogLink_emptyOrOverlongId_isRejected() {
        assertNull(parse("https", web, "/c/"))
        assertNull(parse("https", web, "/c/" + "x".repeat(129)))
    }

    @Test
    fun catalogPath_onForeignHost_isRejected() {
        assertNull(parse("https", "evil.example.com", "/c/abc"))
        assertNull(parse("http", web, "/c/abc"))
    }

    @Test
    fun firebaseAuthLink_isNeverTreatedAsCatalog() {
        // Even a hostile path that starts with /c/ on the Firebase host must not become a catalog.
        assertNull(parse("https", fb, "/c/abc"))
        val auth = parse("https", fb, "/__/auth/links", "https://$fb/__/auth/links?link=x")
        assertTrue(auth is DeepLink.EmailSignIn)
    }

    @Test
    fun emailSignIn_toString_redactsCredential() {
        val auth = DeepLink.EmailSignIn("https://$fb/__/auth/links?oobCode=SECRET")
        assertTrue(!auth.toString().contains("SECRET"))
    }

    @Test
    fun repeatedIdenticalLinks_areDistinctInstances() {
        val a = parse("https", web, "/c/same")
        val b = parse("https", web, "/c/same")
        assertNotSame(a, b) // identity equality => LaunchedEffect re-fires under singleTask
    }
}
