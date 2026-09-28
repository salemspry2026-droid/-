package com.flowexa.app.ui.admin

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
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
    onOrderClick: (String) -> Unit
) {
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(FlowexaBg)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Welcome Banner
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = FlowexaBlue)
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Text(
                        text = "مرحباً بك في لوحة تحكم",
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

        // Stats Grid
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                StatCard(
                    title = "مبيعات اليوم",
                    value = totalSales.formatAmount(currency),
                    icon = Icons.Default.Payments,
                    color = FlowexaBlue,
                    modifier = Modifier.weight(1f)
                )
                StatCard(
                    title = "طلبات اليوم",
                    value = "$todayOrdersCount طلب",
                    icon = Icons.Default.ReceiptLong,
                    color = FlowexaGreen,
                    modifier = Modifier.weight(1f)
                )
            }
        }

        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                StatCard(
                    title = "الأصناف المتوفرة",
                    value = "$productsCount صنف",
                    icon = Icons.Default.Inventory2,
                    color = Color(0xFF6366F1),
                    modifier = Modifier.weight(1f)
                )
                StatCard(
                    title = "إجمالي العملاء",
                    value = "$customersCount عميل",
                    icon = Icons.Default.People,
                    color = Color(0xFFD97706),
                    modifier = Modifier.weight(1f)
                )
            }
        }

        // Quick Actions
        item {
            Text(
                text = "الإجراءات السريعة",
                fontWeight = FontWeight.Bold,
                fontSize = 16.sp,
                color = TextPrimary
            )
        }

        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                ActionChip(
                    title = "إدارة الأصناف",
                    icon = Icons.Default.Inventory2,
                    onClick = onProductsClick,
                    modifier = Modifier.weight(1f)
                )
                ActionChip(
                    title = "إدارة العملاء",
                    icon = Icons.Default.People,
                    onClick = onCustomersClick,
                    modifier = Modifier.weight(1f)
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
                    text = "أحدث الطلبات",
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp,
                    color = TextPrimary
                )
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
