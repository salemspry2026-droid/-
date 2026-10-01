package com.flowexa.app.ui.customers

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.flowexa.app.data.local.entity.CustomerEntity
import com.flowexa.app.data.local.entity.CustomerPhoneEntity
import com.flowexa.app.data.local.entity.OrderEntity
import com.flowexa.app.data.repository.CustomerInsights
import com.flowexa.app.ui.theme.FlowexaBlue
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CustomerDetailScreen(
    customer: CustomerEntity?,
    phones: List<CustomerPhoneEntity>,
    insights: CustomerInsights,
    orders: List<OrderEntity>,
    onBackClick: () -> Unit,
    onCreateOrderClick: (customerId: String) -> Unit,
    onOrderClick: (orderId: String) -> Unit,
    onEditCustomerClick: (CustomerEntity) -> Unit,
    onMergeClick: (CustomerEntity) -> Unit
) {
    val context = LocalContext.current
    val dateFormat = remember { SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(customer?.name ?: "تفاصيل العميل", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "رجوع")
                    }
                },
                actions = {
                    if (customer != null) {
                        IconButton(onClick = { onEditCustomerClick(customer) }) {
                            Icon(Icons.Default.Edit, contentDescription = "تعديل")
                        }
                        IconButton(onClick = { onMergeClick(customer) }) {
                            Icon(Icons.Default.MergeType, contentDescription = "دمج")
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = FlowexaBlue,
                    titleContentColor = Color.White,
                    navigationIconContentColor = Color.White,
                    actionIconContentColor = Color.White
                )
            )
        }
    ) { padding ->
        if (customer == null) {
            Box(modifier = Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = FlowexaBlue)
            }
            return@Scaffold
        }

        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Customer Header Card
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    elevation = CardDefaults.cardElevation(2.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                modifier = Modifier
                                    .size(54.dp)
                                    .clip(RoundedCornerShape(27.dp))
                                    .background(FlowexaBlue.copy(alpha = 0.1f)),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(Icons.Default.Person, contentDescription = null, tint = FlowexaBlue, modifier = Modifier.size(32.dp))
                            }
                            Spacer(modifier = Modifier.width(16.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(customer.name, fontWeight = FontWeight.Bold, fontSize = 20.sp, color = Color(0xFF1E293B))
                                if (!customer.address.isNullOrBlank()) {
                                    Text(customer.address, fontSize = 14.sp, color = Color(0xFF64748B))
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(16.dp))

                        // Action button: Quick Create Order
                        Button(
                            onClick = { onCreateOrderClick(customer.id) },
                            modifier = Modifier.fillMaxWidth(),
                            colors = ButtonDefaults.buttonColors(containerColor = FlowexaBlue),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Icon(Icons.Default.ShoppingCart, contentDescription = null)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("إنشاء طلب جديد لهذا العميل", fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }

            // Phones Section with Call buttons
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    elevation = CardDefaults.cardElevation(2.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text("أرقام الاتصال", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = FlowexaBlue)
                        Spacer(modifier = Modifier.height(8.dp))

                        val displayPhones = phones.ifEmpty {
                            if (!customer.phone.isNullOrBlank()) {
                                listOf(CustomerPhoneEntity(id = "p", companyId = customer.companyId, customerId = customer.id, phoneRaw = customer.phone, phoneNormalized = customer.phone, isPrimary = true))
                            } else emptyList()
                        }

                        if (displayPhones.isEmpty()) {
                            Text("لا توجد أرقام مسجلة", fontSize = 14.sp, color = Color.Gray)
                        } else {
                            displayPhones.forEach { ph ->
                                Row(
                                    modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Column {
                                        Text(ph.phoneRaw, fontWeight = FontWeight.Medium, fontSize = 15.sp)
                                        Text(if (ph.isPrimary) "الرقم الأساسي" else ph.label, fontSize = 12.sp, color = Color.Gray)
                                    }
                                    IconButton(
                                        onClick = {
                                            val intent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:${ph.phoneRaw}"))
                                            context.startActivity(intent)
                                        }
                                    ) {
                                        Icon(Icons.Default.Phone, contentDescription = "اتصال", tint = FlowexaBlue)
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // Insights & Statistics Section
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    elevation = CardDefaults.cardElevation(2.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text("إحصائيات العميل", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = FlowexaBlue)
                        Spacer(modifier = Modifier.height(12.dp))

                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text("إجمالي الطلبات", fontSize = 12.sp, color = Color.Gray)
                                Text("${insights.totalOrders}", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = FlowexaBlue)
                            }
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text("إجمالي المشتريات", fontSize = 12.sp, color = Color.Gray)
                                Text("%.2f".format(insights.totalSales), fontWeight = FontWeight.Bold, fontSize = 18.sp, color = FlowexaBlue)
                            }
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text("متوسط الطلب", fontSize = 12.sp, color = Color.Gray)
                                Text("%.2f".format(insights.averageOrderValue), fontWeight = FontWeight.Bold, fontSize = 18.sp, color = FlowexaBlue)
                            }
                        }

                        if (insights.topProducts.isNotEmpty()) {
                            Spacer(modifier = Modifier.height(16.dp))
                            Text("أكثر المنتجات طلباً:", fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(insights.topProducts.joinToString(" • "), fontSize = 13.sp, color = Color(0xFF475569))
                        }
                    }
                }
            }

            // Order History Header
            item {
                Text("سجل الطلبات (${orders.size})", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color(0xFF1E293B))
            }

            if (orders.isEmpty()) {
                item {
                    Text("لا توجد طلبات سابقة لهذا العميل.", fontSize = 14.sp, color = Color.Gray, modifier = Modifier.padding(vertical = 8.dp))
                }
            } else {
                items(orders) { ord ->
                    Card(
                        onClick = { onOrderClick(ord.id) },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = Color.White),
                        elevation = CardDefaults.cardElevation(1.dp)
                    ) {
                        Row(
                            modifier = Modifier.padding(12.dp).fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text("طلب #${ord.id.takeLast(6)}", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                val dateStr = ord.createdAtMs?.let { dateFormat.format(Date(it)) } ?: ""
                                Text(dateStr, fontSize = 12.sp, color = Color.Gray)
                            }
                            Column(horizontalAlignment = Alignment.End) {
                                Text(ord.status, fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = FlowexaBlue)
                                Text(ord.invoiceType ?: "cash", fontSize = 12.sp, color = Color.Gray)
                            }
                        }
                    }
                }
            }
        }
    }
}
