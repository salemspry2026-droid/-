package com.flowexa.app.domain

import com.flowexa.app.core.AppConfig
import com.flowexa.app.data.local.entity.UserProfileEntity
import org.json.JSONObject

object PermissionManager {

    enum class Module(val key: String) {
        CUSTOMERS("customers"),
        PRODUCTS("products"),
        ORDERS("orders"),
        STAFF("staff"),
        SETTINGS("companySettings")
    }

    enum class Action(val key: String) {
        VIEW("view"),
        CREATE("create"),
        EDIT("edit"),
        DELETE("delete")
    }

    /**
     * The CEILING enforced by firestore.rules (the real security boundary). The UI must never offer
     * an action the backend will reject, whatever `permissionsJson` says:
     *  - company document (SETTINGS): only the owner may update it
     *  - products: only admin/owner may create/edit/delete
     *  - customers: sales may view/create/edit but not delete
     *  - orders: sales may view/create/edit but not delete
     *  - staff management: admin/owner only
     * Owner never reaches this function (handled earlier); clients/pending never reach it either.
     */
    internal fun backendAllows(role: String?, module: Module, action: Action): Boolean {
        return when (role) {
            AppConfig.ROLE_ADMIN -> when (module) {
                Module.SETTINGS -> action == Action.VIEW
                else -> true
            }
            AppConfig.ROLE_SALES -> when (module) {
                Module.CUSTOMERS, Module.ORDERS -> action != Action.DELETE
                Module.PRODUCTS -> action == Action.VIEW
                Module.STAFF, Module.SETTINGS -> false
            }
            else -> false
        }
    }

    /**
     * Checks if a user has permission to perform an action on a specific module.
     * Evaluates explicit profile permissions first, then falls back to role-based defaults.
     */
    fun hasPermission(profile: UserProfileEntity?, module: Module, action: Action): Boolean {
        if (profile == null) return false

        // Owner has absolute unrestricted access
        if (profile.role == AppConfig.ROLE_OWNER) return true

        // Client cannot access admin back-office modules
        if (profile.role == AppConfig.ROLE_CLIENT) {
            return false
        }

        // Pending employees have no access until approved
        if (profile.role == AppConfig.ROLE_PENDING_EMPLOYEE) return false

        // Explicit per-user permissions can never exceed what firestore.rules enforce.
        if (!backendAllows(profile.role, module, action)) return false

        // 1. Check explicit permissions in profile if configured
        if (profile.permissionsJson.isNotBlank() && profile.permissionsJson != "{}") {
            try {
                val json = JSONObject(profile.permissionsJson)
                val moduleObj = json.optJSONObject(module.key)
                if (moduleObj != null && moduleObj.has(action.key)) {
                    return moduleObj.optBoolean(action.key, false)
                }
            } catch (_: Exception) {}
        }

        // 2. Role-based standard defaults matching Web implementation
        return when (profile.role) {
            AppConfig.ROLE_ADMIN -> true
            AppConfig.ROLE_SALES -> {
                when (module) {
                    Module.CUSTOMERS -> action in listOf(Action.VIEW, Action.CREATE, Action.EDIT)
                    Module.ORDERS -> action in listOf(Action.VIEW, Action.CREATE, Action.EDIT)
                    Module.PRODUCTS -> action == Action.VIEW
                    Module.STAFF -> false
                    Module.SETTINGS -> false
                }
            }
            else -> false
        }
    }
}
