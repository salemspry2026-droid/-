package com.flowexa.app.ui.orders

import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.ArrowForward
import androidx.compose.material.icons.filled.Check
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
import com.flowexa.app.core.formatDateTime
import com.flowexa.app.data.local.entity.OrderEntity
import com.flowexa.app.data.local.entity.OrderItemEntity
import com.flowexa.app.data.local.entity.OrderStageEntity
import com.flowexa.app.ui.theme.*
import org.json.JSONObject

private val invoiceTypeLabels = mapOf("cash" to "نقدي", "pending_cash" to "نقدي معلق", "credit" to "آجل", "other" to "آخر")

/**
 * Web parity: components/OrderDetailsDialog.tsx
 * stage progress, customer, order info, items (+ exclusion), summary and "إرسال لـ {nextStage}".
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OrderDetailScreen(
    order: OrderEntity?,
    items: List<OrderItemEntity>,
    stages: List<OrderStageEntity>,
    isClient: Boolean,
    onBackClick: () -> Unit,
    onMoveToNextStage: (nextStageName: String, isFinal: Boolean) -> Unit,
    onExcludeItems: (indexes: Set<Int>, reminderHours: Int, onResult: (Boolean) -> Unit) -> Unit
) {
    if (order == null) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = FlowexaBlue) }
        return
    }
    val sortedStages = remember(stages) { stages.sortedBy { it.stageIndex } }
    val currentIdx = sortedStages.indexOfFirst { it.name == order.status || it.id == order.status }
    val isPending = order.status == "pending"
    val activeIndex = if (currentIdx != -1) currentIdx else if (isPending) -1 else 0
    val nextStage = if (activeIndex < sortedStages.size - 1) sortedStages.getOrNull(activeIndex + 1) else null

    var selected by remember { mutableStateOf(setOf<Int>()) }
    var showExclude by remember { mutableStateOf(false) }
    var reminderHours by remember { mutableIntStateOf(24) }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }

    val totals = remember(order.totalAmountByCurrencyJson) {
        runCatching { JSONObject(order.totalAmountByCurrencyJson).let { o -> o.keys().asSequence().associateWith { o.optDouble(it, 0.0) } } }.getOrDefault(emptyMap())
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("تفاصيل الطلب", fontWeight = FontWeight.Bold, color = Color.White) },
                navigationIcon = { IconButton(onClick = onBackClick) { Icon(Icons.Default.ArrowForward, "رجوع", tint = Color.White) } },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = FlowexaBlue)
            )
        },
        bottomBar = {
            if (!isClient) {
                Surface(shadowElevation = 8.dp, color = FlowexaSurface) {
                    Column(Modifier.fillMaxWidth().padding(14.dp).navigationBarsPadding()) {
                        error?.let { Text(it, color = Color(0xFFDC2626), fontSize = 12.sp, modifier = Modifier.padding(bottom = 6.dp)) }
                        if (nextStage != null) {
                            Button(
                                enabled = !busy,
                                onClick = {
                                    busy = true
                                    onMoveToNextStage(nextStage.name, activeIndex + 1 == sortedStages.size - 1)
                                },
                                modifier = Modifier.fillMaxWidth().height(52.dp), shape = RoundedCornerShape(14.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEFF6FF), contentColor = Color(0xFF1D4ED8))
                            ) {
                                Icon(Icons.Default.ArrowBack, null); Spacer(Modifier.width(8.dp))
                                Text(if (busy) "..." else "إرسال لـ ${nextStage.name}", fontWeight = FontWeight.Bold)
                            }
                        } else {
                            Box(Modifier.fillMaxWidth().height(52.dp).clip(RoundedCornerShape(14.dp)).background(Color(0xFFF9FAFB)), contentAlignment = Alignment.Center) {
                                Text("الطلب في المرحلة النهائية", color = TextMuted, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }
        }
    ) { padding ->
        LazyColumn(
            Modifier.fillMaxSize().background(FlowexaBg).padding(padding).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            // Stage progress
            if (sortedStages.isNotEmpty()) item {
                Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                    sortedStages.forEachIndexed { idx, st ->
                        val done = idx < activeIndex
                        val current = idx == activeIndex
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Box(
                                Modifier.size(32.dp).clip(CircleShape).background(
                                    when { done -> FlowexaGreen; current -> FlowexaBlue; else -> Color(0xFFE5E7EB) }
                                ),
                                contentAlignment = Alignment.Center
                            ) {
                                if (done) Icon(Icons.Default.Check, null, tint = Color.White, modifier = Modifier.size(16.dp))
                                else Text("${idx + 1}", color = if (current) Color.White else TextMuted, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                            }
                            Text(st.name, fontSize = 11.sp, color = if (current) FlowexaBlue else TextSecondary, fontWeight = if (current) FontWeight.Bold else FontWeight.Normal)
                        }
                    }
                }
            }

            // Customer
            item {
                Card(Modifier.fillMaxWidth(), shape = RoundedCornerShape(16.dp), colors = CardDefaults.cardColors(containerColor = FlowexaSurface)) {
                    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text("العميل", fontSize = 12.sp, color = TextSecondary)
                        Text(order.customerName, fontWeight = FontWeight.Bold, fontSize = 18.sp, color = FlowexaBlue)
                        Text(order.customerPhone ?: "بدون رقم", fontSize = 13.sp, color = TextSecondary)
                        Text(order.customerAddress ?: "بدون عنوان", fontSize = 13.sp, color = TextMuted)
                    }
                }
            }

            // Order info
            item {
                Card(Modifier.fillMaxWidth(), shape = RoundedCornerShape(16.dp), colors = CardDefaults.cardColors(containerColor = FlowexaSurface)) {
                    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text("معلومات الطلب", fontWeight = FontWeight.Bold)
                        InfoRow("التاريخ", order.createdAtMs?.formatDateTime() ?: "")
                        order.createdByName?.takeIf { it.isNotBlank() }?.let { InfoRow("الموظف", it) }
                        if (!order.notes.isNullOrBlank() || order.invoiceType != null) {
                            val inv = order.invoiceType?.let { "[نوع الفاتورة: ${invoiceTypeLabels[it] ?: invoiceTypeLabels["other"]}]" } ?: ""
                            InfoRow("ملاحظات", listOfNotNull(order.notes?.takeIf { it.isNotBlank() }, inv.ifEmpty { null }).joinToString(" "))
                        }
                    }
                }
            }

            // Items
            item {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text("الأصناف (${items.size})", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = FlowexaBlue)
                    if (!isClient && selected.isNotEmpty()) {
                        OutlinedButton(onClick = { showExclude = true; error = null }) { Text("استثناء المحدد (${selected.size})", color = Color(0xFFEA580C)) }
                    }
                }
            }
            itemsIndexed(items) { idx, item ->
                Card(Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp), colors = CardDefaults.cardColors(containerColor = FlowexaSurface)) {
                    Row(Modifier.fillMaxWidth().padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text(item.productName, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                            Text("${item.price.formatAmount(item.currency)} × ${item.quantity.toInt()} = ${(item.price * item.quantity).formatAmount(item.currency)}", fontSize = 12.sp, color = FlowexaGreenDark)
                            if (item.bonusQuantity > 0) Text("${item.bonusQuantity.toInt()} : ${item.quantity.toInt()}  مجاني", fontSize = 11.sp, color = Color(0xFFD97706), fontWeight = FontWeight.Bold)
                        }
                        if (!isClient && items.size > 1) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Checkbox(checked = idx in selected, onCheckedChange = { selected = if (it) selected + idx else selected - idx })
                                Text("استثناء", fontSize = 10.sp, color = TextSecondary)
                            }
                        }
                    }
                }
            }

            // Summary
            item {
                Card(Modifier.fillMaxWidth(), shape = RoundedCornerShape(16.dp), colors = CardDefaults.cardColors(containerColor = FlowexaSurface)) {
                    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("ملخص الطلب", fontWeight = FontWeight.Bold)
                        totals.forEach { (curr, amount) ->
                            val sub = items.filter { it.currency == curr }.sumOf { it.price * it.quantity }
                            if (sub > amount + 0.0001) {
                                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text("الخصم", color = Color(0xFFEF4444), fontSize = 13.sp)
                                    Text("-${(sub - amount).formatAmount(curr)}", color = Color(0xFFEF4444), fontSize = 13.sp, fontWeight = FontWeight.Bold)
                                }
                            }
                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("المجموع الفرعي", color = TextSecondary, fontSize = 13.sp)
                                Text(sub.formatAmount(curr), fontSize = 13.sp, fontWeight = FontWeight.Bold)
                            }
                            HorizontalDivider()
                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("الإجمالي", fontWeight = FontWeight.Bold)
                                Text(amount.formatAmount(curr), fontWeight = FontWeight.Bold, color = FlowexaBlue, fontSize = 17.sp)
                            }
                        }
                    }
                }
            }
            item { Spacer(Modifier.height(8.dp)) }
        }
    }

    if (showExclude) {
        AlertDialog(
            onDismissRequest = { if (!busy) showExclude = false },
            title = { Text("تأكيد استثناء الأصناف") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("سيتم إزالة الأصناف المحددة من هذا الطلب وإدراجها كطلب جديد مستقل. يمكنك تعيين تذكير لمتابعة توفير هذه الأصناف وإتمامها.", fontSize = 13.sp)
                    Text("ذكرني بعد", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        listOf(24 to "24 ساعة", 48 to "48 ساعة", 168 to "اسبوع").forEach { (h, l) ->
                            FilterChip(selected = reminderHours == h, onClick = { reminderHours = h }, label = { Text(l, fontSize = 12.sp) })
                        }
                    }
                    error?.let { Text(it, color = Color(0xFFDC2626), fontSize = 12.sp) }
                }
            },
            confirmButton = {
                Button(enabled = !busy, colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEA580C)), onClick = {
                    busy = true
                    onExcludeItems(selected, reminderHours) { ok ->
                        busy = false
                        if (ok) { showExclude = false; selected = emptySet() }
                        else error = "لا يمكن استثناء جميع عناصر الطلب، قم بإلغاء الطلب بدلاً من ذلك."
                    }
                }) { Text("تأكيد واستثناء") }
            },
            dismissButton = { OutlinedButton(enabled = !busy, onClick = { showExclude = false }) { Text("إلغاء") } }
        )
    }
}

@Composable
private fun InfoRow(label: String, value: String) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, fontSize = 12.sp, color = TextSecondary)
        Text(value, fontSize = 13.sp, fontWeight = FontWeight.Medium, color = TextPrimary, modifier = Modifier.weight(1f).padding(start = 12.dp), textAlign = androidx.compose.ui.text.style.TextAlign.End)
    }
}
