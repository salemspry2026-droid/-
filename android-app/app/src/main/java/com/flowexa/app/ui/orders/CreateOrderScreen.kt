package com.flowexa.app.ui.orders

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.flowexa.app.core.formatAmount
import com.flowexa.app.data.local.entity.CustomerEntity
import com.flowexa.app.data.local.entity.OrderItemEntity
import com.flowexa.app.data.local.entity.ProductEntity
import com.flowexa.app.domain.BonusCalculator
import com.flowexa.app.domain.OrderRules
import com.flowexa.app.ui.theme.*

data class CartItem(
    val product: ProductEntity,
    var quantity: Double = 1.0,
    var bonusQuantity: Double = 0.0,
    var note: String = ""
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CreateOrderScreen(
    customers: List<CustomerEntity>,
    products: List<ProductEntity>,
    onBackClick: () -> Unit,
    isClientMode: Boolean = false,
    preselectedCustomer: CustomerEntity? = null,
    initialProductId: String? = null,
    primaryCurrency: String = "SAR",
    onConfirmOrder: (
        customerId: String,
        customerName: String,
        customerPhone: String?,
        customerAddress: String?,
        invoiceType: String,
        notes: String,
        items: List<OrderItemEntity>,
        totalsByCurrency: Map<String, Double>
    ) -> Unit
) {
    var selectedCustomer by remember { mutableStateOf<CustomerEntity?>(preselectedCustomer) }
    var customerQuery by remember { mutableStateOf("") }
    var productQuery by remember { mutableStateOf("") }
    var invoiceType by remember { mutableStateOf("cash") }
    var orderNotes by remember { mutableStateOf("") }
    var showProductPicker by remember { mutableStateOf(false) }
    var validationError by remember { mutableStateOf<String?>(null) }

    val cart = remember { mutableStateListOf<CartItem>() }

    // Prepopulate initial product if passed from catalog
    LaunchedEffect(initialProductId, products) {
        if (!initialProductId.isNullOrEmpty() && cart.isEmpty()) {
            val prod = products.find { it.id == initialProductId }
            if (prod != null) {
                val bonus = BonusCalculator.calculateBonus(prod, 1.0, invoiceType)
                cart.add(CartItem(prod, 1.0, bonus))
            }
        }
    }

    // When client mode updates customer
    LaunchedEffect(preselectedCustomer) {
        if (preselectedCustomer != null && selectedCustomer == null) {
            selectedCustomer = preselectedCustomer
        }
    }

    // Totals calculation grouped by currency
    val totalsByCurrency = remember(cart.toList()) {
        val map = mutableMapOf<String, Double>()
        for (item in cart) {
            val curr = item.product.currency
            val subtotal = item.product.price * item.quantity
            map[curr] = (map[curr] ?: 0.0) + subtotal
        }
        map
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(if (isClientMode) "طلب أصناف جديدة" else "إنشاء طلب جديد (Offline)", fontWeight = FontWeight.Bold, color = Color.White) },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(Icons.Default.ArrowForward, contentDescription = "رجوع", tint = Color.White)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = FlowexaBlue)
            )
        },
        bottomBar = {
            if (cart.isNotEmpty() && (selectedCustomer != null || isClientMode)) {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp),
                    colors = CardDefaults.cardColors(containerColor = FlowexaSurface),
                    elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        if (validationError != null) {
                            Text(
                                text = validationError!!,
                                color = Color.Red,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(bottom = 8.dp)
                            )
                        }

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("الإجمالي:", fontWeight = FontWeight.Bold, fontSize = 15.sp)
                            Column(horizontalAlignment = Alignment.End) {
                                totalsByCurrency.forEach { (curr, total) ->
                                    Text(
                                        text = total.formatAmount(curr),
                                        fontWeight = FontWeight.Black,
                                        fontSize = 16.sp,
                                        color = FlowexaGreenDark
                                    )
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(12.dp))

                        Button(
                            onClick = {
                                validationError = null
                                // Validate all cart items against business rules
                                for (item in cart) {
                                    val valRes = OrderRules.validateProductOrder(
                                        product = item.product,
                                        quantity = item.quantity,
                                        invoiceType = invoiceType,
                                        selectedCurrency = item.product.currency,
                                        primaryCurrency = primaryCurrency
                                    )
                                    if (!valRes.isValid) {
                                        validationError = valRes.errorMessage
                                        return@Button
                                    }
                                }

                                val orderItems = cart.map { item ->
                                    OrderItemEntity(
                                        orderId = "",
                                        productId = item.product.id,
                                        productName = item.product.name,
                                        quantity = item.quantity,
                                        bonusQuantity = item.bonusQuantity,
                                        price = item.product.price,
                                        currency = item.product.currency,
                                        note = item.note.ifEmpty { null }
                                    )
                                }

                                val effectiveCustomer = selectedCustomer ?: preselectedCustomer
                                val custId = effectiveCustomer?.id ?: "client_direct"
                                val custName = effectiveCustomer?.name ?: "عميل"
                                val custPhone = effectiveCustomer?.phone
                                val custAddress = effectiveCustomer?.address

                                onConfirmOrder(
                                    custId,
                                    custName,
                                    custPhone,
                                    custAddress,
                                    invoiceType,
                                    orderNotes,
                                    orderItems,
                                    totalsByCurrency
                                )
                            },
                            modifier = Modifier.fillMaxWidth().height(52.dp),
                            shape = RoundedCornerShape(14.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = FlowexaGreen)
                        ) {
                            Icon(Icons.Default.CheckCircle, contentDescription = null)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("تأكيد وإرسال الطلب", fontSize = 16.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
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
            // Section 1: Customer Selection (Hidden for Clients)
            if (!isClientMode) {
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = FlowexaSurface)
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text("1. اختيار العميل", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = FlowexaBlue)
                            Spacer(modifier = Modifier.height(10.dp))

                            if (selectedCustomer != null) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clip(RoundedCornerShape(12.dp))
                                        .background(FlowexaBlueLight)
                                        .padding(12.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column {
                                        Text(selectedCustomer!!.name, fontWeight = FontWeight.Bold, color = FlowexaBlue)
                                        selectedCustomer!!.phone?.let { Text(it, fontSize = 12.sp, color = TextSecondary) }
                                    }
                                    TextButton(onClick = { selectedCustomer = null }) {
                                        Text("تغيير", color = FlowexaBlue, fontWeight = FontWeight.Bold)
                                    }
                                }
                            } else {
                                OutlinedTextField(
                                    value = customerQuery,
                                    onValueChange = { customerQuery = it },
                                    placeholder = { Text("ابحث عن العميل بالاسم أو الهاتف...") },
                                    leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(12.dp),
                                    singleLine = true
                                )

                                val filteredCustomers = customers.filter {
                                    it.name.contains(customerQuery, ignoreCase = true) ||
                                    (it.phone?.contains(customerQuery) == true)
                                }.take(5)

                                Column(modifier = Modifier.padding(top = 8.dp)) {
                                    filteredCustomers.forEach { cust ->
                                        Row(
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .clickable { selectedCustomer = cust }
                                                .padding(vertical = 8.dp),
                                            horizontalArrangement = Arrangement.SpaceBetween
                                        ) {
                                            Text(cust.name, fontWeight = FontWeight.Medium)
                                            cust.phone?.let { Text(it, color = Color.Gray, fontSize = 12.sp) }
                                        }
                                        HorizontalDivider(color = FlowexaBorder)
                                    }
                                }
                            }
                        }
                    }
                }
            } else if (preselectedCustomer != null) {
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = FlowexaSurface)
                    ) {
                        Row(
                            modifier = Modifier.padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Default.AccountCircle, contentDescription = null, tint = FlowexaBlue, modifier = Modifier.size(36.dp))
                            Spacer(modifier = Modifier.width(12.dp))
                            Column {
                                Text("طلب باسم: ${preselectedCustomer.name}", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = FlowexaBlue)
                                preselectedCustomer.phone?.let { Text("الهاتف: $it", fontSize = 12.sp, color = TextSecondary) }
                            }
                        }
                    }
                }
            }

            // Section 2: Items in Cart
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
                            Text("2. أصناف الطلب", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = FlowexaBlue)
                            Button(
                                onClick = { showProductPicker = true },
                                colors = ButtonDefaults.buttonColors(containerColor = FlowexaBlue),
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("إضافة صنف", fontSize = 12.sp)
                            }
                        }

                        Spacer(modifier = Modifier.height(10.dp))

                        if (cart.isEmpty()) {
                            Box(
                                modifier = Modifier.fillMaxWidth().padding(24.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Text("السلة فارغة، اضغط على إضافة صنف لاختيار الأصناف", color = Color.Gray, fontSize = 12.sp)
                            }
                        } else {
                            cart.forEachIndexed { index, item ->
                                Column(modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp)) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Column(modifier = Modifier.weight(1f)) {
                                            Text(item.product.name, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                            Text(
                                                "${item.product.price.formatAmount(item.product.currency)} × ${item.quantity.toInt()}",
                                                fontSize = 12.sp,
                                                color = FlowexaGreenDark
                                            )
                                            if (item.bonusQuantity > 0) {
                                                Text(
                                                    "بونص مجاني: +${item.bonusQuantity.toInt()} قطعة",
                                                    fontSize = 11.sp,
                                                    color = Color(0xFFD97706),
                                                    fontWeight = FontWeight.Bold
                                                )
                                            }
                                        }

                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            IconButton(onClick = {
                                                if (item.quantity > 1) {
                                                    val newQty = item.quantity - 1
                                                    cart[index] = item.copy(
                                                        quantity = newQty,
                                                        bonusQuantity = BonusCalculator.calculateBonus(item.product, newQty, invoiceType)
                                                    )
                                                } else {
                                                    cart.removeAt(index)
                                                }
                                            }) {
                                                Icon(Icons.Default.Remove, contentDescription = "نقص")
                                            }
                                            Text(item.quantity.toInt().toString(), fontWeight = FontWeight.Bold)
                                            IconButton(onClick = {
                                                val newQty = item.quantity + 1
                                                cart[index] = item.copy(
                                                    quantity = newQty,
                                                    bonusQuantity = BonusCalculator.calculateBonus(item.product, newQty, invoiceType)
                                                )
                                            }) {
                                                Icon(Icons.Default.Add, contentDescription = "زيادة")
                                            }
                                        }
                                    }
                                }
                                if (index < cart.size - 1) HorizontalDivider(color = FlowexaBorder)
                            }
                        }
                    }
                }
            }

            // Section 3: Invoice Options
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = FlowexaSurface)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text("3. تفاصيل الفاتورة والملاحظات", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = FlowexaBlue)
                        Spacer(modifier = Modifier.height(10.dp))

                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            FilterChip(
                                selected = invoiceType == "cash",
                                onClick = {
                                    invoiceType = "cash"
                                    // Recalculate bonuses with updated invoice type
                                    cart.forEachIndexed { i, itm ->
                                        cart[i] = itm.copy(bonusQuantity = BonusCalculator.calculateBonus(itm.product, itm.quantity, "cash"))
                                    }
                                },
                                label = { Text("نقدي (Cash)") }
                            )
                            FilterChip(
                                selected = invoiceType == "pending_cash",
                                onClick = {
                                    invoiceType = "pending_cash"
                                    cart.forEachIndexed { i, itm ->
                                        cart[i] = itm.copy(bonusQuantity = BonusCalculator.calculateBonus(itm.product, itm.quantity, "pending_cash"))
                                    }
                                },
                                label = { Text("نقدي مؤجل") }
                            )
                            FilterChip(
                                selected = invoiceType == "credit",
                                onClick = {
                                    invoiceType = "credit"
                                    cart.forEachIndexed { i, itm ->
                                        cart[i] = itm.copy(bonusQuantity = BonusCalculator.calculateBonus(itm.product, itm.quantity, "credit"))
                                    }
                                },
                                label = { Text("آجل (Credit)") }
                            )
                        }

                        Spacer(modifier = Modifier.height(10.dp))

                        OutlinedTextField(
                            value = orderNotes,
                            onValueChange = { orderNotes = it },
                            placeholder = { Text("ملاحظات إضافية على الطلب...") },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp)
                        )
                    }
                }
            }
        }
    }

    // Product Picker Dialog
    if (showProductPicker) {
        AlertDialog(
            onDismissRequest = { showProductPicker = false },
            title = { Text("اختر صنفاً للإضافة", fontWeight = FontWeight.Bold, color = FlowexaBlue) },
            text = {
                Column(modifier = Modifier.fillMaxWidth().height(360.dp)) {
                    OutlinedTextField(
                        value = productQuery,
                        onValueChange = { productQuery = it },
                        placeholder = { Text("ابحث في الأصناف...") },
                        leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(10.dp),
                        singleLine = true
                    )
                    Spacer(modifier = Modifier.height(10.dp))

                    val filteredProducts = products.filter {
                        (it.name.contains(productQuery, ignoreCase = true) ||
                         (it.scientificName?.contains(productQuery, ignoreCase = true) == true)) &&
                        it.inStock && !it.isDeleted
                    }

                    LazyColumn(modifier = Modifier.fillMaxSize()) {
                        items(filteredProducts) { prod ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable {
                                        val existingIndex = cart.indexOfFirst { it.product.id == prod.id }
                                        if (existingIndex >= 0) {
                                            val current = cart[existingIndex]
                                            val newQty = current.quantity + 1
                                            cart[existingIndex] = current.copy(
                                                quantity = newQty,
                                                bonusQuantity = BonusCalculator.calculateBonus(prod, newQty, invoiceType)
                                            )
                                        } else {
                                            cart.add(CartItem(prod, 1.0, BonusCalculator.calculateBonus(prod, 1.0, invoiceType)))
                                        }
                                        showProductPicker = false
                                    }
                                    .padding(vertical = 10.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(prod.name, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                                    Text(prod.price.formatAmount(prod.currency), fontSize = 12.sp, color = FlowexaGreenDark)
                                }
                                Icon(Icons.Default.AddCircle, contentDescription = null, tint = FlowexaBlue)
                            }
                            HorizontalDivider(color = FlowexaBorder)
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { showProductPicker = false }) { Text("إغلاق") }
            }
        )
    }
}
