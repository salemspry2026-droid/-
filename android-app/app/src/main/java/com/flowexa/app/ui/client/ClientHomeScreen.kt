package com.flowexa.app.ui.client

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Inventory2
import androidx.compose.material.icons.filled.ShoppingBag
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.flowexa.app.data.local.entity.OrderEntity
import com.flowexa.app.ui.admin.OrderItemCard
import com.flowexa.app.ui.theme.*

@Composable
fun ClientHomeScreen(
    clientName: String,
    companyName: String,
    orders: List<OrderEntity>,
    onCatalogClick: () -> Unit,
    onOrdersClick: () -> Unit,
    onOrderClick: (String) -> Unit
) {
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(FlowexaBg)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Welcome Card
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = FlowexaBlue)
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Text(
                        text = "مرحباً بك، $clientName",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                    Text(
                        text = "عميل معتمد لدى: $companyName",
                        fontSize = 13.sp,
                        color = Color.White.copy(alpha = 0.8f),
                        modifier = Modifier.padding(top = 2.dp, bottom = 16.dp)
                    )

                    Button(
                        onClick = onCatalogClick,
                        colors = ButtonDefaults.buttonColors(containerColor = FlowexaGreen),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth().height(48.dp)
                    ) {
                        Icon(Icons.Default.Inventory2, contentDescription = null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("تصفح كتالوج الأصناف واطلب الآن", fontWeight = FontWeight.Bold)
                    }
                }
            }
        }

        // Quick Links
        item {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Card(
                    modifier = Modifier.weight(1f).clickable { onCatalogClick() },
                    shape = RoundedCornerShape(14.dp),
                    colors = CardDefaults.cardColors(containerColor = FlowexaSurface)
                ) {
                    Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Inventory2, contentDescription = null, tint = FlowexaBlue)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("كتالوج الأصناف", fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                    }
                }

                Card(
                    modifier = Modifier.weight(1f).clickable { onOrdersClick() },
                    shape = RoundedCornerShape(14.dp),
                    colors = CardDefaults.cardColors(containerColor = FlowexaSurface)
                ) {
                    Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.ShoppingBag, contentDescription = null, tint = FlowexaGreen)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("طلباتي السابقة", fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                    }
                }
            }
        }

        // Recent Orders Header
        item {
            Text("أحدث طلباتي", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = TextPrimary)
        }

        if (orders.isEmpty()) {
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = FlowexaSurface)
                ) {
                    Box(modifier = Modifier.fillMaxWidth().padding(28.dp), contentAlignment = Alignment.Center) {
                        Text("لم تقم بإنشاء أي طلبات بعد", color = Color.Gray, fontSize = 13.sp)
                    }
                }
            }
        } else {
            items(orders) { order ->
                OrderItemCard(order = order, onClick = { onOrderClick(order.id) })
            }
        }
    }
}
