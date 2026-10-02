package com.flowexa.app.ui.orders

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.flowexa.app.data.local.entity.CustomerEntity
import com.flowexa.app.data.local.entity.OrderItemEntity
import com.flowexa.app.data.local.entity.ProductEntity
import com.flowexa.app.data.repository.CustomerInsights
import com.flowexa.app.domain.BonusCalculator
import com.flowexa.app.domain.OrderRules
import com.flowexa.app.ui.theme.FlowexaBlue

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SalesQuickOrderScreen(
    products: List<ProductEntity>,
    onBackClick: () -> Unit,
    onLookupCustomerByPhone: suspend (String) -> CustomerEntity?,
    onLoadCustomerInsights: suspend (String) -> CustomerInsights?,
    onConfirmOrder: (
        customerId: String,
        customerName: String,
        customerPhone: String?,
        customerAddress: String?,
        invoiceType: String,
        notes: String?,
        items: List<OrderItemEntity>,
        totals: Map<String, Double>
    ) -> Unit
) {
    var phoneQuery by remember { mutableStateOf("") }
    var matchedCustomer by remember { mutableStateOf<CustomerEntity?>(null) }
    var customerInsights by remember { mutableStateOf<CustomerInsights?>(null) }
    var isSearchingCustomer by remember { mutableStateOf(false) }

    var invoiceType by remember { mutableStateOf("cash") }
    var notes by remember { mutableStateOf("") }
    var productQuery by remember { mutableStateOf("") }

    val orderItems = remember { mutableStateListOf<OrderItemEntity>() }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    // Instant phone lookup
    LaunchedEffect(phoneQuery) {
        val clean = phoneQuery.trim()
        if (clean.length >= 7) {
            isSearchingCustomer = true
            val cust = onLookupCustomerByPhone(clean)
            matchedCustomer = cust
            if (cust != null) {
                customerInsights = onLoadCustomerInsights(cust.id)
            } else {
                customerInsights = null
            }
            isSearchingCustomer = false
        } else {
            matchedCustomer = null
            customerInsights = null
        }
    }

    // Totals calculation
    val totalsByCurrency = remember(orderItems.toList()) {
        val map = mutableMapOf<String, Double>()
        orderItems.forEach { item ->
            val sub = item.quantity * item.price
            map[item.currency] = (map[item.currency] ?: 0.0) + sub
        }
        map
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("طلب مبيعات سريع", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "رجوع")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = FlowexaBlue,
                    titleContentColor = Color.White,
                    navigationIconContentColor = Color.White
                )
            )
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Phone Lookup Card
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    elevation = CardDefaults.cardElevation(2.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text("1. العثور على العميل عبر الهاتف", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = FlowexaBlue)
                        Spacer(modifier = Modifier.height(8.dp))

                        OutlinedTextField(
                            value = phoneQuery,
                            onValueChange = { phoneQuery = it },
                            label = { Text("أدخل رقم هاتف العميل") },
                            placeholder = { Text("مثال: 771234567") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                            leadingIcon = { Icon(Icons.Default.Phone, contentDescription = null, tint = FlowexaBlue) },
                            trailingIcon = {
                                if (isSearchingCustomer) {
                                    CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp, color = FlowexaBlue)
                                }
                            },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true
                        )

                        if (matchedCustomer != null) {
                            Spacer(modifier = Modifier.height(12.dp))
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(Color(0xFFF0FDF4))
                                    .padding(12.dp)
                            ) {
                                Column {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Icon(Icons.Default.CheckCircle, contentDescription = null, tint = Color(0xFF16A34A), modifier = Modifier.size(20.dp))
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Text(matchedCustomer!!.name, fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color(0xFF166534))
                                    }
                                    if (!matchedCustomer!!.address.isNullOrBlank()) {
                                        Text("العنوان: ${matchedCustomer!!.address}", fontSize = 13.sp, color = Color(0xFF334155))
                                    }
                                    if (customerInsights != null) {
                                        Spacer(modifier = Modifier.height(6.dp))
                                        val avgSummary = if (customerInsights!!.averageByCurrency.isEmpty()) {
                                            "لا توجد مشتريات سابقة"
                                        } else {
                                            customerInsights!!.averageByCurrency.entries
                                                .joinToString(" • ") { (currency, average) -> "%.2f %s".format(average, currency) }
                                        }
                                        Text(
                                            "إجمالي الطلبات: ${customerInsights!!.totalOrders} • متوسط الشراء: $avgSummary",
                                            fontSize = 12.sp,
                                            fontWeight = FontWeight.SemiBold,
                                            color = Color(0xFF0F766E)
                                        )
                                        if (customerInsights!!.topProducts.isNotEmpty()) {
                                            Text("المنتجات المفضلة: ${customerInsights!!.topProducts.take(3).joinToString(", ")}", fontSize = 11.sp, color = Color.Gray)
                                        }
                                    }
                                }
                            }
                        } else if (phoneQuery.length >= 7 && !isSearchingCustomer) {
                            Spacer(modifier = Modifier.height(8.dp))
                            Text("لم يتم العثور على عميل مسجل بهذا الرقم.", fontSize = 13.sp, color = Color.Red)
                        }
                    }
                }
            }

            // Invoice Type & Options
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    elevation = CardDefaults.cardElevation(2.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text("2. نوع الفاتورة والملاحظات", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = FlowexaBlue)
                        Spacer(modifier = Modifier.height(8.dp))

                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            FilterChip(
                                selected = invoiceType == "cash",
                                onClick = { invoiceType = "cash" },
                                label = { Text("نقداً (Cash)") }
                            )
                            FilterChip(
                                selected = invoiceType == "pending_cash",
                                onClick = { invoiceType = "pending_cash" },
                                label = { Text("معلق نقداً") }
                            )
                            FilterChip(
                                selected = invoiceType == "credit",
                                onClick = { invoiceType = "credit" },
                                label = { Text("آجل (Credit)") }
                            )
                        }

                        Spacer(modifier = Modifier.height(8.dp))
                        OutlinedTextField(
                            value = notes,
                            onValueChange = { notes = it },
                            label = { Text("ملاحظات الطلب (اختياري)") },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true
                        )
                    }
                }
            }

            // Product Selection & Live Bonus
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    elevation = CardDefaults.cardElevation(2.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text("3. إضافة الأصناف للطلب", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = FlowexaBlue)
                        Spacer(modifier = Modifier.height(8.dp))

                        OutlinedTextField(
                            value = productQuery,
                            onValueChange = { productQuery = it },
                            placeholder = { Text("ابحث عن صنف لإضافته...") },
                            leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true
                        )

                        val filteredProducts = if (productQuery.isNotBlank()) {
                            products.filter { it.name.contains(productQuery, ignoreCase = true) || (it.scientificName ?: "").contains(productQuery, ignoreCase = true) }.take(4)
                        } else emptyList()

                        if (filteredProducts.isNotEmpty()) {
                            Spacer(modifier = Modifier.height(8.dp))
                            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                filteredProducts.forEach { p ->
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .clip(RoundedCornerShape(8.dp))
                                            .background(Color(0xFFF8FAFC))
                                            .clickable {
                                                val validation = OrderRules.validateProductOrder(p, 1.0, invoiceType, p.currency, "SAR")
                                                if (!validation.isValid) {
                                                    errorMessage = validation.errorMessage
                                                } else {
                                                    val bonus = BonusCalculator.calculateBonus(p, 1.0, invoiceType)
                                                    orderItems.add(
                                                        OrderItemEntity(
                                                            orderId = "",
                                                            productId = p.id,
                                                            productName = p.name,
                                                            quantity = 1.0,
                                                            bonusQuantity = bonus,
                                                            price = p.price,
                                                            currency = p.currency
                                                        )
                                                    )
                                                    productQuery = ""
                                                    errorMessage = null
                                                }
                                            }
                                            .padding(8.dp),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text(p.name, fontWeight = FontWeight.Medium, fontSize = 14.sp)
                                        Text("${p.price} ${p.currency}", fontWeight = FontWeight.Bold, color = FlowexaBlue)
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // Current Order Items
            item {
                Text("الأصناف المختارة (${orderItems.size})", fontWeight = FontWeight.Bold, fontSize = 16.sp)
            }

            if (orderItems.isEmpty()) {
                item {
                    Text("لم يتم إضافة أصناف بعد.", fontSize = 14.sp, color = Color.Gray)
                }
            } else {
                items(orderItems) { item ->
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = Color.White),
                        elevation = CardDefaults.cardElevation(1.dp)
                    ) {
                        Column(modifier = Modifier.padding(12.dp)) {
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                Text(item.productName, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                                IconButton(onClick = { orderItems.remove(item) }, modifier = Modifier.size(24.dp)) {
                                    Icon(Icons.Default.Close, contentDescription = "حذف", tint = Color.Red)
                                }
                            }
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    IconButton(
                                        onClick = {
                                            val idx = orderItems.indexOf(item)
                                            if (idx >= 0 && item.quantity > 1.0) {
                                                val prod = products.find { it.id == item.productId }
                                                val newQty = item.quantity - 1.0
                                                val newBonus = prod?.let { BonusCalculator.calculateBonus(it, newQty, invoiceType) } ?: 0.0
                                                orderItems[idx] = item.copy(quantity = newQty, bonusQuantity = newBonus)
                                            }
                                        }
                                    ) {
                                        Icon(Icons.Default.Remove, contentDescription = null)
                                    }
                                    Text("${item.quantity.toInt()}", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                                    IconButton(
                                        onClick = {
                                            val idx = orderItems.indexOf(item)
                                            if (idx >= 0) {
                                                val prod = products.find { it.id == item.productId }
                                                val newQty = item.quantity + 1.0
                                                val newBonus = prod?.let { BonusCalculator.calculateBonus(it, newQty, invoiceType) } ?: 0.0
                                                orderItems[idx] = item.copy(quantity = newQty, bonusQuantity = newBonus)
                                            }
                                        }
                                    ) {
                                        Icon(Icons.Default.Add, contentDescription = null)
                                    }
                                }

                                if (item.bonusQuantity > 0.0) {
                                    Text("بونص: +${item.bonusQuantity.toInt()}", fontWeight = FontWeight.Bold, color = Color(0xFF16A34A), fontSize = 13.sp)
                                }

                                Text("%.2f %s".format(item.quantity * item.price, item.currency), fontWeight = FontWeight.Bold, fontSize = 14.sp, color = FlowexaBlue)
                            }
                        }
                    }
                }
            }

            // Error display
            if (errorMessage != null) {
                item {
                    Text(errorMessage!!, color = Color.Red, fontSize = 13.sp)
                }
            }

            // Totals & Submit
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = FlowexaBlue.copy(alpha = 0.05f))
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text("الإجمالي الكلي للطلب:", fontWeight = FontWeight.Bold, fontSize = 15.sp)
                        totalsByCurrency.forEach { (curr, total) ->
                            Text("%.2f %s".format(total, curr), fontWeight = FontWeight.ExtraBold, fontSize = 22.sp, color = FlowexaBlue)
                        }

                        Spacer(modifier = Modifier.height(16.dp))
                        Button(
                            onClick = {
                                if (matchedCustomer == null) {
                                    errorMessage = "يرجى اختيار عميل مسجل بالهاتف أولاً."
                                    return@Button
                                }
                                if (orderItems.isEmpty()) {
                                    errorMessage = "يرجى إضافة أصناف إلى الطلب."
                                    return@Button
                                }
                                onConfirmOrder(
                                    matchedCustomer!!.id,
                                    matchedCustomer!!.name,
                                    matchedCustomer!!.phone,
                                    matchedCustomer!!.address,
                                    invoiceType,
                                    notes.ifBlank { null },
                                    orderItems.toList(),
                                    totalsByCurrency
                                )
                            },
                            modifier = Modifier.fillMaxWidth(),
                            colors = ButtonDefaults.buttonColors(containerColor = FlowexaBlue),
                            shape = RoundedCornerShape(12.dp),
                            enabled = matchedCustomer != null && orderItems.isNotEmpty()
                        ) {
                            Icon(Icons.Default.Check, contentDescription = null)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("تأكيد وإنشاء الطلب السريع", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                        }
                    }
                }
            }
        }
    }
}
