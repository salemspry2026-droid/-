package com.flowexa.app.ui.components

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
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

@Composable
fun FlowexaBottomBar(
    currentRoute: String,
    onNavigate: (String) -> Unit,
    isClient: Boolean = false
) {
    val items = if (isClient) {
        listOf(
            BottomNavItem(Routes.ClientHome.route, "الرئيسية", Icons.Default.Home),
            BottomNavItem(Routes.ClientCatalog.route, "الأصناف", Icons.Default.Inventory2),
            BottomNavItem(Routes.ClientOrders.route, "طلباتي", Icons.Default.ShoppingBag)
        )
    } else {
        listOf(
            BottomNavItem(Routes.AdminHome.route, "الرئيسية", Icons.Default.Dashboard),
            BottomNavItem(Routes.Products.route, "الأصناف", Icons.Default.Inventory2),
            BottomNavItem(Routes.Customers.route, "العملاء", Icons.Default.People),
            BottomNavItem(Routes.Orders.route, "الطلبات", Icons.Default.ReceiptLong),
            BottomNavItem(Routes.Settings.route, "الإعدادات", Icons.Default.Settings)
        )
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
