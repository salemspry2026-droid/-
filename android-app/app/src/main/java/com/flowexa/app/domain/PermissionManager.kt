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
