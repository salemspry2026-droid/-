package com.flowexa.app.ui.admin

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.flowexa.app.core.formatAmount
import com.flowexa.app.core.formatDateTime
import com.flowexa.app.data.local.entity.OrderEntity
import com.flowexa.app.ui.theme.*

@Composable
fun AdminHomeScreen(
    companyName: String,
    todayOrdersCount: Int,
    totalSales: Double,
    currency: String,
    productsCount: Int,
    customersCount: Int,
    recentOrders: List<OrderEntity>,
    onCreateOrderClick: () -> Unit,
    onProductsClick: () -> Unit,
    onCustomersClick: () -> Unit,
    onOrderClick: (String) -> Unit,
    onAllOrdersClick: () -> Unit = {},
    onCompanySettingsClick: () -> Unit = {},
    onNotificationsClick: () -> Unit = {},
    onAdministrationClick: (() -> Unit)? = null,
    onCallRecordingsClick: () -> Unit = {},
    onLogoutClick: () -> Unit = {},
    displayName: String = "",
    roleLabel: String = "",
    stages: List<com.flowexa.app.data.local.entity.OrderStageEntity> = emptyList(),
    stageCounts: Map<String, Int> = emptyMap(),
    delegateCount: Int = 0,
    customerCount: Int = 0,
    unreadNotifications: Int = 0
) {
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(FlowexaBg)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Company card + logout (web HomeTab header)
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = FlowexaSurface)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(14.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(companyName, fontWeight = FontWeight.Bold, color = TextPrimary)
                        if (roleLabel.isNotEmpty()) Text(roleLabel, fontSize = 12.sp, color = TextSecondary)
                    }
                    IconButton(onClick = onLogoutClick) {
                        Icon(Icons.Default.Logout, contentDescription = "تسجيل الخروج", tint = Color(0xFFEF4444))
                    }
                }
            }
        }

        // Welcome Banner
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = FlowexaBlue)
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Text(
                        text = if (displayName.isNotEmpty()) "مرحباً $displayName" else "مرحباً بك في لوحة تحكم",
                        fontSize = 13.sp,
                        color = Color.White.copy(alpha = 0.8f)
                    )
                    Text(
                        text = companyName,
                        fontSize = 22.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White,
                        modifier = Modifier.padding(top = 2.dp, bottom = 16.dp)
                    )

                    Button(
                        onClick = onCreateOrderClick,
                        colors = ButtonDefaults.buttonColors(containerColor = FlowexaGreen),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth().height(48.dp)
                    ) {
                        Icon(Icons.Default.AddShoppingCart, contentDescription = null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("إنشاء طلب جديد فوري (Offline)", fontWeight = FontWeight.Bold)
                    }
                }
            }
        }

        // Sales summary card (web HomeTab: إجمالي مبيعات اليوم)
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFF2E5CA6))
            ) {
                Column(Modifier.padding(20.dp)) {
                    Text("إجمالي مبيعات اليوم", fontSize = 13.sp, color = Color.White.copy(alpha = 0.8f))
                    Row(verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("%,.0f".format(totalSales), fontSize = 34.sp, fontWeight = FontWeight.Bold, color = Color.White)
                        Text(currency, fontSize = 18.sp, color = Color.White)
                    }
                    Spacer(Modifier.height(12.dp))
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("$todayOrdersCount طلب ($delegateCount مندوب - $customerCount عميل)", fontSize = 12.sp, color = Color.White.copy(alpha = 0.85f))
                        val avg = if (todayOrdersCount > 0) totalSales / todayOrdersCount else 0.0
                        Text("متوسط ${"%,.0f".format(avg)} $currency", fontSize = 12.sp, color = Color.White.copy(alpha = 0.85f))
                    }
                }
            }
        }

        // Dynamic status cards (web: stagesToDisplay with per-status counts)
        item {
            val display: List<Pair<String, String>> =
                if (stages.isNotEmpty()) stages.sortedBy { it.stageIndex }.map { it.name to it.name }
                else listOf("pending" to "جديد", "processing" to "مراجعة", "completed" to "مؤكد", "delivered" to "مُسلّم")
            val palette = listOf(
                Color(0xFFEFF6FF) to Color(0xFF1E3A8A),
                Color(0xFFFFF7ED) to Color(0xFFEA580C),
                Color(0xFFF0FDF4) to Color(0xFF16A34A),
                Color(0xFFFAF5FF) to Color(0xFF7E22CE)
            )
            val scrollable = display.size > 5
            Row(
                modifier = Modifier.fillMaxWidth().let { if (scrollable) it.horizontalScroll(rememberScrollState()) else it },
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                display.forEachIndexed { idx, (statusKey, label) ->
                    val (bg, fg) = palette.getOrElse(idx) { Color(0xFFF9FAFB) to Color(0xFF1F2937) }
                    Card(
                        modifier = if (scrollable) Modifier.width(110.dp) else Modifier.weight(1f),
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = bg)
                    ) {
                        Column(Modifier.fillMaxWidth().padding(10.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("${stageCounts[statusKey] ?: 0}", fontSize = 22.sp, fontWeight = FontWeight.Bold, color = fg)
                            Text(label, fontSize = 11.sp, color = fg.copy(alpha = 0.85f), maxLines = 1)
                        }
                    }
                }
            }
        }

        item {
            ActionChip(title = "سجل المكالمات", icon = Icons.Default.Mic, onClick = onCallRecordingsClick, modifier = Modifier.fillMaxWidth())
        }

        // Action buttons (web: معلومات الشركة / الإشعارات)
        item {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                ActionChip(title = "معلومات الشركة", icon = Icons.Default.Business, onClick = onCompanySettingsClick, modifier = Modifier.weight(1f))
                if (onAdministrationClick != null) {
                    ActionChip(title = "الإدارة", icon = Icons.Default.Settings, onClick = onAdministrationClick, modifier = Modifier.weight(1f))
                }
                ActionChip(
                    title = if (unreadNotifications > 0) "الإشعارات (${if (unreadNotifications > 99) "99+" else unreadNotifications})" else "الإشعارات",
                    icon = Icons.Default.Notifications, onClick = onNotificationsClick, modifier = Modifier.weight(1f)
                )
            }
        }

        // Recent Orders Header
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "آخر الطلبات",
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp,
                    color = TextPrimary
                )
                TextButton(onClick = onAllOrdersClick) { Text("الكل", color = FlowexaBlue) }
            }
        }

        if (recentOrders.isEmpty()) {
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = FlowexaSurface)
                ) {
                    Box(
                        modifier = Modifier.fillMaxWidth().padding(32.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "لا توجد طلبات مسجلة بعد، اضغط على زر إنشاء طلب للبدء",
                            color = Color.Gray,
                            fontSize = 13.sp
                        )
                    }
                }
            }
        } else {
            items(recentOrders) { order ->
                OrderItemCard(order = order, onClick = { onOrderClick(order.id) })
            }
        }
    }
}

@Composable
private fun StatCard(
    title: String,
    value: String,
    icon: ImageVector,
    color: Color,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = FlowexaSurface)
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(color.copy(alpha = 0.12f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(icon, contentDescription = null, tint = color, modifier = Modifier.size(20.dp))
            }
            Spacer(modifier = Modifier.height(10.dp))
            Text(text = title, fontSize = 12.sp, color = TextSecondary)
            Text(text = value, fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
        }
    }
}

@Composable
private fun ActionChip(
    title: String,
    icon: ImageVector,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier.clickable { onClick() },
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = FlowexaSurface)
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(icon, contentDescription = null, tint = FlowexaBlue, modifier = Modifier.size(20.dp))
            Spacer(modifier = Modifier.width(8.dp))
            Text(text = title, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary)
        }
    }
}

@Composable
fun OrderItemCard(
    order: OrderEntity,
    onClick: () -> Unit
) {
    val (statusLabel, statusColor) = when (order.status) {
        "confirmed", "approved" -> Pair("معتمد", StatusApproved)
        "delivered" -> Pair("مكتمل", StatusDelivered)
        "cancelled" -> Pair("ملغي", StatusCancelled)
        else -> Pair("قيد الانتظار", StatusPending)
    }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = FlowexaSurface)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = order.customerName,
                    fontWeight = FontWeight.Bold,
                    fontSize = 15.sp,
                    color = TextPrimary
                )
                Text(
                    text = order.createdAtMs?.formatDateTime() ?: "",
                    fontSize = 11.sp,
                    color = TextMuted,
                    modifier = Modifier.padding(top = 2.dp)
                )
                if (order.syncState != "SYNCED") {
                    Text(
                        text = "محفوظ محلياً (ينتظر المزامنة)",
                        fontSize = 10.sp,
                        color = StatusPending,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }

            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(8.dp))
                    .background(statusColor.copy(alpha = 0.12f))
                    .padding(horizontal = 10.dp, vertical = 5.dp)
            ) {
                Text(
                    text = statusLabel,
                    color = statusColor,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold
                )
            }
        }
    }
}
