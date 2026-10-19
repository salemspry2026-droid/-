package com.flowexa.app.ui.calls

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Call
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.PersonAdd
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.flowexa.app.data.local.entity.CallRecordingEntity
import com.flowexa.app.data.local.entity.CustomerEntity
import com.flowexa.app.data.local.entity.ProductEntity
import com.flowexa.app.ui.theme.FlowexaBg
import com.flowexa.app.ui.theme.FlowexaBlue
import com.flowexa.app.ui.theme.FlowexaBlueLight
import com.flowexa.app.ui.theme.FlowexaGreen
import com.flowexa.app.ui.theme.TextSecondary
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Call recordings management screen. Shows saved call recordings and saved contacts,
 * and lets the owner create an order from a customer/product pair.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CallRecordingsScreen(
    recordings: List<CallRecordingEntity>,
    contacts: List<CallContact>,
    customers: List<CustomerEntity>,
    products: List<ProductEntity>,
    onDeleteRecording: (CallRecordingEntity) -> Unit,
    onAddContact: (CallContact) -> Unit,
    onDeleteContact: (Int) -> Unit,
    onSimulateCall: (CallContact) -> Unit,
    onCreateOrder: (CustomerEntity, ProductEntity, Int, (Boolean) -> Unit) -> Unit
) {
    var showAddContact by remember { mutableStateOf(false) }
    var orderTarget by remember { mutableStateOf<CallRecordingEntity?>(null) }
    var showCustomerPicker by remember { mutableStateOf(false) }
    var showProductPicker by remember { mutableStateOf(false) }
    var selectedCustomer by remember { mutableStateOf<CustomerEntity?>(null) }
    var selectedProduct by remember { mutableStateOf<ProductEntity?>(null) }
    var qty by remember { mutableStateOf(1) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text("التسجيلات والمكالمات", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = FlowexaBlue)
                },
                navigationIcon = {
                    IconButton(onClick = { orderTarget = null }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "رجوع", tint = FlowexaBlue)
                    }
                }
            )
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(padding).padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // ---- Saved recordings ----
            item {
                Text("التسجيلات المحفوظة", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = FlowexaBlue, modifier = Modifier.padding(top = 12.dp))
            }
            if (recordings.isEmpty()) {
                item {
                    EmptyHint("لا توجد تسجيلات محفوظة بعد.")
                }
            } else {
                items(recordings, key = { it.id }) { rec ->
                    RecordingCard(
                        recording = rec,
                        onDelete = { onDeleteRecording(rec) },
                        onCreateOrder = { orderTarget = rec; selectedCustomer = null; selectedProduct = null; qty = 1 }
                    )
                }
            }

            // ---- Contacts ----
            item {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("جهات الاتصال", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = FlowexaBlue)
                    TextButton(onClick = { showAddContact = true }) {
                        Icon(Icons.Default.PersonAdd, contentDescription = null, tint = FlowexaGreen)
                        Spacer(Modifier.width(4.dp))
                        Text("إضافة", color = FlowexaGreen, fontSize = 13.sp)
                    }
                }
            }
            if (contacts.isEmpty()) {
                item {
                    EmptyHint("لا توجد جهات اتصال محفوظة.")
                }
            } else {
                itemsIndexed(contacts) { index, c ->
                    Card(colors = CardDefaults.cardColors(containerColor = Color.White), shape = RoundedCornerShape(12.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(12.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(c.name, fontSize = 15.sp, fontWeight = FontWeight.Bold, color = FlowexaBlue)
                                if (c.tel.isNotBlank()) {
                                    Text(c.tel, fontSize = 13.sp, color = TextSecondary)
                                }
                            }
                            IconButton(onClick = { onSimulateCall(c) }) {
                                Icon(Icons.Default.Call, contentDescription = "محاكاة مكالمة", tint = FlowexaGreen)
                            }
                            IconButton(onClick = { onDeleteContact(index) }) {
                                Icon(Icons.Default.Delete, contentDescription = "حذف", tint = Color(0xFFDC2626))
                            }
                        }
                    }
                }
            }

            item { Spacer(Modifier.height(24.dp)) }
        }
    }

    // ---- Add contact dialog ----
    if (showAddContact) {
        AddContactDialog(
            onDismiss = { showAddContact = false },
            onConfirm = { name, tel ->
                showAddContact = false
                if (name.isNotBlank()) onAddContact(CallContact(name.trim(), tel.trim()))
            }
        )
    }

    // ---- Create order from recording ----
    if (orderTarget != null) {
        AlertDialog(
            onDismissRequest = { orderTarget = null },
            title = { Text("إنشاء طلب", fontWeight = FontWeight.Bold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text("من تسجيل: ${orderTarget?.contactName ?: ""}", fontSize = 13.sp, color = TextSecondary)
                    OutlinedButton(onClick = { showCustomerPicker = true }, modifier = Modifier.fillMaxWidth()) {
                        Text(selectedCustomer?.name ?: "اختر العميل", color = FlowexaBlue)
                    }
                    OutlinedButton(onClick = { showProductPicker = true }, modifier = Modifier.fillMaxWidth()) {
                        Text(selectedProduct?.name ?: "اختر المنتج", color = FlowexaBlue)
                    }
                    OutlinedTextField(
                        value = qty.toString(),
                        onValueChange = { qty = it.filter(Char::isDigit).toIntOrNull() ?: 1 },
                        label = { Text("الكمية") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                TextButton(
                    enabled = selectedCustomer != null && selectedProduct != null && qty > 0,
                    onClick = {
                        val customer = selectedCustomer!!
                        val product = selectedProduct!!
                        onCreateOrder(customer, product, qty) { _ -> orderTarget = null }
                    }
                ) {
                    Text("إنشاء", color = FlowexaGreen, fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { orderTarget = null }) { Text("إلغاء", color = TextSecondary) }
            }
        )
    }

    // ---- Customer picker ----
    if (showCustomerPicker) {
        AlertDialog(
            onDismissRequest = { showCustomerPicker = false },
            title = { Text("اختر العميل", fontWeight = FontWeight.Bold) },
            text = {
                LazyColumn(modifier = Modifier.heightIn(max = 320.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(customers, key = { it.id }) { c ->
                        Surface(
                            onClick = { selectedCustomer = c; showCustomerPicker = false },
                            shape = RoundedCornerShape(10.dp),
                            color = FlowexaBlueLight
                        ) {
                            Column(modifier = Modifier.fillMaxWidth().padding(12.dp)) {
                                Text(c.name, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                                if (!c.phone.isNullOrBlank()) {
                                    Text(c.phone, fontSize = 12.sp, color = TextSecondary)
                                }
                            }
                        }
                    }
                    if (customers.isEmpty()) {
                        item { EmptyHint("لا توجد عملاء.") }
                    }
                }
            },
            confirmButton = {},
            dismissButton = {
                TextButton(onClick = { showCustomerPicker = false }) { Text("إلغاء") }
            }
        )
    }

    // ---- Product picker ----
    if (showProductPicker) {
        AlertDialog(
            onDismissRequest = { showProductPicker = false },
            title = { Text("اختر المنتج", fontWeight = FontWeight.Bold) },
            text = {
                LazyColumn(modifier = Modifier.heightIn(max = 320.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(products, key = { it.id }) { p ->
                        Surface(
                            onClick = { selectedProduct = p; showProductPicker = false },
                            shape = RoundedCornerShape(10.dp),
                            color = FlowexaBlueLight
                        ) {
                            Text(
                                "${p.name} — ${p.price} ${p.currency}",
                                fontSize = 14.sp,
                                modifier = Modifier.fillMaxWidth().padding(12.dp)
                            )
                        }
                    }
                    if (products.isEmpty()) {
                        item { EmptyHint("لا توجد منتجات.") }
                    }
                }
            },
            confirmButton = {},
            dismissButton = {
                TextButton(onClick = { showProductPicker = false }) { Text("إلغاء") }
            }
        )
    }
}

@Composable
private fun RecordingCard(
    recording: CallRecordingEntity,
    onDelete: () -> Unit,
    onCreateOrder: () -> Unit
) {
    Card(colors = CardDefaults.cardColors(containerColor = Color.White), shape = RoundedCornerShape(12.dp)) {
        Column(modifier = Modifier.fillMaxWidth().padding(12.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.Mic, contentDescription = null, tint = FlowexaBlue)
                Spacer(Modifier.width(8.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        recording.contactName.ifBlank { "تسجيل " + recording.phone },
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold,
                        color = FlowexaBlue
                    )
                    Text(
                        "${recording.phone} • ${formatDuration(recording.durationSeconds)} • ${formatDate(recording.createdAtMs)}",
                        fontSize = 12.sp,
                        color = TextSecondary
                    )
                }
            }
            Spacer(Modifier.height(8.dp))
            Row(horizontalArrangement = Arrangement.End, modifier = Modifier.fillMaxWidth()) {
                TextButton(onClick = onCreateOrder) { Text("إنشاء طلب", color = FlowexaGreen, fontSize = 13.sp) }
                IconButton(onClick = onDelete) {
                    Icon(Icons.Default.Delete, contentDescription = "حذف التسجيل", tint = Color(0xFFDC2626))
                }
            }
        }
    }
}

@Composable
private fun AddContactDialog(
    onDismiss: () -> Unit,
    onConfirm: (String, String) -> Unit
) {
    var name by remember { mutableStateOf("") }
    var tel by remember { mutableStateOf("") }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("إضافة جهة اتصال", fontWeight = FontWeight.Bold) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("الاسم") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                OutlinedTextField(
                    value = tel,
                    onValueChange = { tel = it },
                    label = { Text("رقم الهاتف") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
            }
        },
        confirmButton = {
            TextButton(
                enabled = name.isNotBlank() && tel.isNotBlank(),
                onClick = { onConfirm(name, tel) }
            ) { Text("حفظ", color = FlowexaGreen, fontWeight = FontWeight.Bold) }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("إلغاء", color = TextSecondary) }
        }
    )
}

@Composable
private fun EmptyHint(text: String) {
    Card(colors = CardDefaults.cardColors(containerColor = FlowexaBg), shape = RoundedCornerShape(12.dp)) {
        Text(
            text,
            fontSize = 13.sp,
            color = TextSecondary,
            textAlign = TextAlign.Center,
            modifier = Modifier.fillMaxWidth().padding(16.dp)
        )
    }
}

private fun formatDuration(secs: Long): String {
    val m = secs / 60
    val s = secs % 60
    return "${m}:${s.toString().padStart(2, '0')}"
}

private fun formatDate(ms: Long): String =
    SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.US).format(Date(ms))