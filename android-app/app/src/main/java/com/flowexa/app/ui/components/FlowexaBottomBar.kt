package com.flowexa.app.ui.components

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Dashboard
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.Inventory2
import androidx.compose.material.icons.filled.People
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.ReceiptLong
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.ShoppingBag
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import com.flowexa.app.navigation.Routes
import com.flowexa.app.ui.theme.FlowexaBlue
import com.flowexa.app.ui.theme.FlowexaSurface

data class BottomNavItem(
    val route: String,
    val title: String,
    val icon: ImageVector
)

/**
 * Mirrors the web dashboards:
 *  - Staff (AdminDashboard.tsx): الرئيسية | الطلبات | الأصناف | العملاء | الموظفين
 *    (each tab only when the permission allows; الموظفين only for owner/admin).
 *  - Client (ClientDashboard.tsx): الرئيسية | المفضلة | المنتجات | طلباتي (| حسابي when available).
 */
@Composable
fun FlowexaBottomBar(
    currentRoute: String,
    onNavigate: (String) -> Unit,
    isClient: Boolean = false,
    canViewOrders: Boolean = true,
    canViewProducts: Boolean = true,
    canViewCustomers: Boolean = true,
    canViewStaff: Boolean = false
) {
    val items = if (isClient) {
        listOf(
            BottomNavItem(Routes.ClientHome.route, "الرئيسية", Icons.Default.Dashboard),
            BottomNavItem(Routes.ClientFavorites.route, "المفضلة", Icons.Default.Favorite),
            BottomNavItem(Routes.ClientCatalog.route, "المنتجات", Icons.Default.ShoppingBag),
            BottomNavItem(Routes.ClientOrders.route, "طلباتي", Icons.Default.ReceiptLong),
            BottomNavItem(Routes.ClientProfile.route, "حسابي", Icons.Default.Person)
        )
    } else {
        buildList {
            add(BottomNavItem(Routes.AdminHome.route, "الرئيسية", Icons.Default.Dashboard))
            if (canViewOrders) add(BottomNavItem(Routes.Orders.route, "الطلبات", Icons.Default.ReceiptLong))
            if (canViewProducts) add(BottomNavItem(Routes.Products.route, "الأصناف", Icons.Default.Inventory2))
            if (canViewCustomers) add(BottomNavItem(Routes.Customers.route, "العملاء", Icons.Default.People))
            if (canViewStaff) add(BottomNavItem(Routes.Staff.route, "الموظفين", Icons.Default.Security))
        }
    }

    NavigationBar(
        containerColor = FlowexaSurface,
        tonalElevation = 8.dp
    ) {
        items.forEach { item ->
            val selected = currentRoute == item.route
            NavigationBarItem(
                selected = selected,
                onClick = { if (!selected) onNavigate(item.route) },
                icon = {
                    Icon(
                        imageVector = item.icon,
                        contentDescription = item.title,
                        tint = if (selected) FlowexaBlue else Color.Gray
                    )
                },
                label = {
                    Text(
                        text = item.title,
                        color = if (selected) FlowexaBlue else Color.Gray
                    )
                },
                colors = NavigationBarItemDefaults.colors(
                    indicatorColor = FlowexaBlue.copy(alpha = 0.12f)
                )
            )
        }
    }
}
