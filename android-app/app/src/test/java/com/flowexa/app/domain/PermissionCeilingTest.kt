package com.flowexa.app.domain

import com.flowexa.app.core.AppConfig
import com.flowexa.app.data.local.entity.UserProfileEntity
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/** Explicit permissionsJson must never grant more than the Firestore rules allow. */
class PermissionCeilingTest {

    private fun profile(role: String, permissionsJson: String = "{}") = UserProfileEntity(
        id = "u", email = "u@test.com", displayName = "U", role = role, permissionsJson = permissionsJson
    )

    @Test
    fun salesWithExplicitProductEdit_isStillDenied() {
        val p = profile(AppConfig.ROLE_SALES, """{"products":{"edit":true,"delete":true,"create":true}}""")
        assertFalse(PermissionManager.hasPermission(p, PermissionManager.Module.PRODUCTS, PermissionManager.Action.EDIT))
        assertFalse(PermissionManager.hasPermission(p, PermissionManager.Module.PRODUCTS, PermissionManager.Action.DELETE))
        assertTrue(PermissionManager.hasPermission(p, PermissionManager.Module.PRODUCTS, PermissionManager.Action.VIEW))
    }

    @Test
    fun salesCannotDeleteCustomersOrOrders_evenIfExplicitlyGranted() {
        val p = profile(AppConfig.ROLE_SALES, """{"customers":{"delete":true},"orders":{"delete":true}}""")
        assertFalse(PermissionManager.hasPermission(p, PermissionManager.Module.CUSTOMERS, PermissionManager.Action.DELETE))
        assertFalse(PermissionManager.hasPermission(p, PermissionManager.Module.ORDERS, PermissionManager.Action.DELETE))
    }

    @Test
    fun adminCannotEditCompanySettings_butCanManageStaffAndProducts() {
        val p = profile(AppConfig.ROLE_ADMIN)
        assertFalse(PermissionManager.hasPermission(p, PermissionManager.Module.SETTINGS, PermissionManager.Action.EDIT))
        assertTrue(PermissionManager.hasPermission(p, PermissionManager.Module.STAFF, PermissionManager.Action.EDIT))
        assertTrue(PermissionManager.hasPermission(p, PermissionManager.Module.PRODUCTS, PermissionManager.Action.DELETE))
        assertTrue(PermissionManager.hasPermission(p, PermissionManager.Module.CUSTOMERS, PermissionManager.Action.DELETE))
    }

    @Test
    fun ownerKeepsFullAccess() {
        val p = profile(AppConfig.ROLE_OWNER)
        assertTrue(PermissionManager.hasPermission(p, PermissionManager.Module.SETTINGS, PermissionManager.Action.EDIT))
    }
}
