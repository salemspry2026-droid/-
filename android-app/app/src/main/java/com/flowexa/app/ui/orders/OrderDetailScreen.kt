package com.flowexa.app.ui.orders

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowForward
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.flowexa.app.core.formatAmount
import com.flowexa.app.core.formatDateTime
import com.flowexa.app.data.local.entity.OrderEntity
import com.flowexa.app.data.local.entity.OrderItemEntity
import com.flowexa.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OrderDetailScreen(
    order: OrderEntity?,
    items: List<OrderItemEntity>,
    onBackClick: () -> Unit,
    onUpdateStatus: (String) -> Unit
) {
    if (order == null) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator(color = FlowexaBlue)
        }
        return
    }

    val (statusLabel, statusColor) = when (order.status) {
        "confirmed", "approved" -> Pair("معتمد", StatusApproved)
        "delivered" -> Pair("مكتمل", StatusDelivered)
        "cancelled" -> Pair("ملغي", StatusCancelled)
        else -> Pair("قيد الانتظار", StatusPending)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("تفاصيل الطلب", fontWeight = FontWeight.Bold, color = Color.White) },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(Icons.Default.ArrowForward, contentDescription = "رجوع", tint = Color.White)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = FlowexaBlue)
            )
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .background(FlowexaBg)
                .padding(padding)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            // Customer & Status Card
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = FlowexaSurface)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(order.customerName, fontWeight = FontWeight.Bold, fontSize = 18.sp, color = FlowexaBlue)
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(statusColor.copy(alpha = 0.12f))
                                    .padding(horizontal = 10.dp, vertical = 5.dp)
                            ) {
                                Text(statusLabel, color = statusColor, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                            }
                        }

                        Spacer(modifier = Modifier.height(6.dp))
                        order.customerPhone?.let { Text("الهاتف: $it", fontSize = 13.sp, color = TextSecondary) }
                        order.customerAddress?.let { Text("العنوان: $it", fontSize = 13.sp, color = TextMuted) }
                        Text("التاريخ: ${order.createdAtMs?.formatDateTime() ?: ""}", fontSize = 12.sp, color = TextMuted)

                        if (!order.notes.isNullOrEmpty()) {
                            Spacer(modifier = Modifier.height(8.dp))
                            Text("ملاحظات: ${order.notes}", fontSize = 13.sp, color = TextSecondary)
                        }
                    }
                }
            }

            // Items List
            item {
                Text("الأصناف (${items.size})", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = FlowexaBlue)
            }

            items(items) { item ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = FlowexaSurface)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(12.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(item.productName, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                            Text(
                                "${item.price.formatAmount(item.currency)} × ${item.quantity.toInt()} = ${(item.price * item.quantity).formatAmount(item.currency)}",
                                fontSize = 12.sp,
                                color = FlowexaGreenDark
                            )
                            if (item.bonusQuantity > 0) {
                                Text(
                                    "بونص إضافي: +${item.bonusQuantity.toInt()}",
                                    fontSize = 11.sp,
                                    color = Color(0xFFD97706),
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                    }
                }
            }

            // Status Action Buttons
            item {
                Spacer(modifier = Modifier.height(8.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    if (order.status != "confirmed") {
                        Button(
                            onClick = { onUpdateStatus("confirmed") },
                            modifier = Modifier.weight(1f).height(46.dp),
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = StatusApproved)
                        ) {
                            Icon(Icons.Default.CheckCircle, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("اعتماد الطلب")
                        }
                    }

                    if (order.status != "delivered") {
                        Button(
                            onClick = { onUpdateStatus("delivered") },
                            modifier = Modifier.weight(1f).height(46.dp),
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = StatusDelivered)
                        ) {
                            Text("اكتمال التسليم")
                        }
                    }

                    if (order.status != "cancelled") {
                        OutlinedButton(
                            onClick = { onUpdateStatus("cancelled") },
                            modifier = Modifier.weight(1f).height(46.dp),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Icon(Icons.Default.Close, contentDescription = null, tint = StatusCancelled, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("إلغاء", color = StatusCancelled)
                        }
                    }
                }
            }
        }
    }
}
