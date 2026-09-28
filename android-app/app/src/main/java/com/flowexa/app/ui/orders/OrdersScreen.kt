package com.flowexa.app.ui.orders

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.flowexa.app.core.formatDateTime
import com.flowexa.app.data.local.entity.OrderEntity
import com.flowexa.app.ui.theme.*

@Composable
fun OrdersScreen(
    orders: List<OrderEntity>,
    selectedStatus: String,
    onStatusSelected: (String) -> Unit,
    onCreateOrderClick: () -> Unit,
    onOrderClick: (String) -> Unit
) {
    val statuses = listOf(
        "all" to "الكل",
        "pending" to "قيد الانتظار",
        "confirmed" to "معتمد",
        "processing" to "قيد التجهيز",
        "delivered" to "مكتمل",
        "cancelled" to "ملغي"
    )

    Scaffold(
        floatingActionButton = {
            FloatingActionButton(
                onClick = onCreateOrderClick,
                containerColor = FlowexaBlue,
                contentColor = Color.White
            ) {
                Icon(Icons.Default.Add, contentDescription = "إنشاء طلب")
            }
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(FlowexaBg)
                .padding(padding)
        ) {
            // Status Filters Row
            LazyRow(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(statuses) { (key, label) ->
                    FilterChip(
                        selected = selectedStatus == key,
                        onClick = { onStatusSelected(key) },
                        label = { Text(label, fontSize = 12.sp, fontWeight = if (selectedStatus == key) FontWeight.Bold else FontWeight.Normal) },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = FlowexaBlue,
                            selectedLabelColor = Color.White
                        )
                    )
                }
            }

            if (orders.isEmpty()) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    Text("لا توجد طلبات في هذا القسم", color = Color.Gray)
                }
            } else {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(horizontal = 16.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    items(orders, key = { it.id }) { order ->
                        OrderCardItem(order = order, onClick = { onOrderClick(order.id) })
                    }
                }
            }
        }
    }
}

@Composable
fun OrderCardItem(order: OrderEntity, onClick: () -> Unit) {
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
        Column(modifier = Modifier.padding(14.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = order.customerName,
                    fontWeight = FontWeight.Bold,
                    fontSize = 15.sp,
                    color = TextPrimary
                )
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(8.dp))
                        .background(statusColor.copy(alpha = 0.12f))
                        .padding(horizontal = 8.dp, vertical = 4.dp)
                ) {
                    Text(
                        text = statusLabel,
                        color = statusColor,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            Spacer(modifier = Modifier.height(4.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = order.createdAtMs?.formatDateTime() ?: "",
                    fontSize = 12.sp,
                    color = TextMuted
                )
                if (order.syncState != "SYNCED") {
                    Text(
                        text = "قيد المزامنة ↻",
                        fontSize = 11.sp,
                        color = StatusPending,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }
        }
    }
}
