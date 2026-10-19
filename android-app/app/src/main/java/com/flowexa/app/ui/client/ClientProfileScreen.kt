package com.flowexa.app.ui.client

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Store
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch
import com.flowexa.app.data.local.entity.OrderEntity
import com.flowexa.app.data.local.entity.OrderItemEntity
import com.flowexa.app.data.local.entity.UserProfileEntity
import com.flowexa.app.data.repository.ProfileRepository.ClientProfileForm
import com.flowexa.app.ui.theme.*
import org.json.JSONObject

private val activityTypes = listOf(
    "pharmacy" to "صيدلية",
    "supermarket" to "سوبر ماركت / بقالة",
    "clinic" to "عيادة طبية / مستشفى",
    "wholesaler" to "تاجر جملة",
    "other" to "أخرى"
)

private fun activityLabel(type: String?, other: String?): String = when {
    type == "other" -> other.orEmpty().ifBlank { "لم يحدد نوع النشاط" }
    else -> activityTypes.firstOrNull { it.first == type }?.second ?: "لم يحدد نوع النشاط"
}

/** Web parity: components/ClientProfile.tsx (tabs: معلومات الحساب / التقارير والتحليلات). */
@Composable
fun ClientProfileScreen(
    profile: UserProfileEntity?,
    orders: List<OrderEntity>,
    loadItems: suspend (String) -> List<OrderItemEntity>,
    onSave: suspend (ClientProfileForm) -> Unit,
    onLogout: () -> Unit
) {
    var tab by remember { mutableIntStateOf(0) }
    Column(Modifier.fillMaxSize().background(FlowexaBg)) {
        TabRow(selectedTabIndex = tab, containerColor = FlowexaSurface) {
            Tab(selected = tab == 0, onClick = { tab = 0 }, text = { Text("معلومات الحساب") })
            Tab(selected = tab == 1, onClick = { tab = 1 }, text = { Text("التقارير والتحليلات") })
        }
        if (tab == 0) InfoTab(profile, onSave, onLogout) else ReportsTab(orders, loadItems)
    }
}

@Composable
private fun InfoTab(
    profile: UserProfileEntity?,
    onSave: suspend (ClientProfileForm) -> Unit,
    onLogout: () -> Unit
) {
    val incomplete = profile?.phone.isNullOrBlank() || profile?.storeName.isNullOrBlank()
    var editing by remember(profile?.id) { mutableStateOf(incomplete) }
    var saving by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var storeName by remember(profile) { mutableStateOf(profile?.storeName?.ifBlank { null } ?: profile?.displayName.orEmpty()) }
    var phone by remember(profile) { mutableStateOf(profile?.phone.orEmpty()) }
    var email by remember(profile) { mutableStateOf(profile?.email.orEmpty()) }
    var country by remember(profile) { mutableStateOf(profile?.addressCountry.orEmpty()) }
    var gov by remember(profile) { mutableStateOf(profile?.addressGov.orEmpty()) }
    var city by remember(profile) { mutableStateOf(profile?.addressCity.orEmpty()) }
    var hood by remember(profile) { mutableStateOf(profile?.addressNeighborhood.orEmpty()) }
    var activity by remember(profile) { mutableStateOf(profile?.activityType.orEmpty()) }
    var activityOther by remember(profile) { mutableStateOf(profile?.activityTypeOther.orEmpty()) }
    var notes by remember(profile) { mutableStateOf(profile?.notes.orEmpty()) }
    val scope = rememberCoroutineScope()

    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Text("معلومات الحساب", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = TextPrimary)
            if (!editing) OutlinedButton(onClick = { editing = true }) { Text("تعديل البيانات") }
        }
        if (incomplete) {
            Card(colors = CardDefaults.cardColors(containerColor = Color(0xFFFFF7ED)), shape = RoundedCornerShape(12.dp)) {
                Column(Modifier.padding(12.dp)) {
                    Text("البيانات غير مكتملة", fontWeight = FontWeight.Bold, color = Color(0xFFC2410C))
                    Text("يرجى إكمال إدخال رقم الهاتف واسم المحل/العميل لتتمكن من رفع الطلبات للشركات.", fontSize = 12.sp, color = Color(0xFFC2410C))
                }
            }
        }
        Card(shape = RoundedCornerShape(16.dp), colors = CardDefaults.cardColors(containerColor = FlowexaSurface)) {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                if (!editing) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        Icon(Icons.Default.Store, null, tint = FlowexaBlue, modifier = Modifier.size(40.dp))
                        Column {
                            Text(storeName.ifBlank { "غير محدد" }, fontWeight = FontWeight.Bold, fontSize = 17.sp)
                            Text(activityLabel(activity, activityOther), fontSize = 12.sp, color = TextSecondary)
                        }
                    }
                    InfoRow("رقم الهاتف", phone.ifBlank { "—" })
                    InfoRow("البريد الإلكتروني", email.ifBlank { "—" })
                    InfoRow("العنوان التفصيلي", listOf(country, gov, city, hood).filter { it.isNotBlank() }.joinToString(" - ").ifBlank { "—" })
                    if (notes.isNotBlank()) InfoRow("نبذة / ملاحظات", notes)
                } else {
                    Field("اسم المحل / العميل *", storeName) { storeName = it }
                    Field("رقم الهاتف *", phone) { phone = it }
                    Field("البريد الإلكتروني", email) { email = it }
                    Field("الدولة", country) { country = it }
                    Field("المحافظة", gov) { gov = it }
                    Field("المدينة", city) { city = it }
                    Field("الحي", hood) { hood = it }
                    Text("نوع النشاط", fontSize = 12.sp, color = TextSecondary)
                    activityTypes.chunked(2).forEach { row ->
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            row.forEach { (key, label) ->
                                FilterChip(selected = activity == key, onClick = { activity = key }, label = { Text(label, fontSize = 12.sp) })
                            }
                        }
                    }
                    if (activity == "other") Field("حدد نوع النشاط", activityOther) { activityOther = it }
                    Field("نبذة / ملاحظات", notes, singleLine = false) { notes = it }
                    error?.let { Text(it, color = Color(0xFFDC2626), fontSize = 12.sp) }
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Button(
                            enabled = !saving,
                            onClick = {
                                if (phone.isBlank() || storeName.isBlank()) {
                                    error = "يرجى إكمال رقم الهاتف واسم المحل / العميل"
                                    return@Button
                                }
                                error = null
                                saving = true
                                scope.launch {
                                    try {
                                        onSave(ClientProfileForm(storeName, phone, country, gov, city, hood, activity, activityOther, notes, email))
                                        editing = false
                                    } catch (e: Exception) {
                                        error = "حدث خطأ أثناء تحديث البيانات"
                                    } finally { saving = false }
                                }
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = FlowexaBlue)
                        ) { Text(if (saving) "جارٍ الحفظ..." else "حفظ") }
                        if (!incomplete) OutlinedButton(onClick = { editing = false }) { Text("إلغاء") }
                    }
                }
            }
        }
        OutlinedButton(onClick = onLogout, modifier = Modifier.fillMaxWidth()) {
            Text("تسجيل الخروج", color = Color(0xFFEF4444))
        }
    }
}

@Composable
private fun InfoRow(label: String, value: String) {
    Column {
        Text(label, fontSize = 12.sp, color = TextSecondary)
        Text(value, fontSize = 14.sp, fontWeight = FontWeight.Medium, color = TextPrimary)
    }
}

@Composable
private fun Field(label: String, value: String, singleLine: Boolean = true, onChange: (String) -> Unit) {
    OutlinedTextField(
        value = value, onValueChange = onChange, label = { Text(label) },
        modifier = Modifier.fillMaxWidth(), singleLine = singleLine,
        shape = RoundedCornerShape(12.dp), minLines = if (singleLine) 1 else 3
    )
}

@Composable
private fun ReportsTab(orders: List<OrderEntity>, loadItems: suspend (String) -> List<OrderItemEntity>) {
    var period by remember { mutableStateOf("all") }
    val now = System.currentTimeMillis()
    val day = 24L * 3600 * 1000
    val cutoff = when (period) { "week" -> now - 7 * day; "month" -> now - 30 * day; "year" -> now - 365 * day; else -> 0L }
    val filtered = orders.filter {
        it.status != "cancelled" && it.status != "rejected" && (it.createdAtMs ?: now) >= cutoff
    }
    var items by remember { mutableStateOf<List<OrderItemEntity>>(emptyList()) }
    LaunchedEffect(filtered.map { it.id }) { items = filtered.flatMap { loadItems(it.id) } }

    // amounts per currency split by invoice type (same buckets as web: cash / pending_cash / credit)
    val amounts = remember(filtered) {
        val m = linkedMapOf<String, DoubleArray>() // [cash, pendingCash, credit]
        filtered.forEach { o ->
            val json = try { JSONObject(o.totalAmountByCurrencyJson) } catch (_: Exception) { JSONObject() }
            json.keys().forEach { cur ->
                val v = json.optDouble(cur, 0.0)
                val a = m.getOrPut(cur) { DoubleArray(3) }
                when (o.invoiceType) { "pending_cash" -> a[1] += v; "credit" -> a[2] += v; else -> a[0] += v }
            }
        }
        m
    }
    val byProduct = items.groupBy { it.productName }.map { (n, l) -> Triple(n, l.sumOf { it.quantity }, l.sumOf { it.bonusQuantity }) }
        .sortedByDescending { it.second }

    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf("all" to "الكل", "week" to "أسبوع", "month" to "شهر", "year" to "سنة").forEach { (k, l) ->
                FilterChip(selected = period == k, onClick = { period = k }, label = { Text(l) })
            }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Stat("عدد الطلبات", filtered.size.toString(), Modifier.weight(1f))
            Stat("عدد الأصناف", items.size.toString(), Modifier.weight(1f))
        }
        amounts.forEach { (cur, a) ->
            Card(shape = RoundedCornerShape(16.dp), colors = CardDefaults.cardColors(containerColor = FlowexaSurface)) {
                Column(Modifier.padding(14.dp)) {
                    Text("المبالغ ($cur)", fontWeight = FontWeight.Bold)
                    Text("نقدي: ${"%,.0f".format(a[0])}", fontSize = 13.sp)
                    Text("نقدي معلّق: ${"%,.0f".format(a[1])}", fontSize = 13.sp)
                    Text("آجل: ${"%,.0f".format(a[2])}", fontSize = 13.sp)
                }
            }
        }
        if (byProduct.isNotEmpty()) {
            Text("تفاصيل الأصناف المطلوبة", fontWeight = FontWeight.Bold)
            byProduct.forEach { (n, q, b) ->
                Card(shape = RoundedCornerShape(12.dp), colors = CardDefaults.cardColors(containerColor = FlowexaSurface)) {
                    Row(Modifier.fillMaxWidth().padding(12.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text(n, fontSize = 13.sp, modifier = Modifier.weight(1f))
                        Text("${"%,.0f".format(q)}" + if (b > 0) " + ${"%,.0f".format(b)} بونص" else "", fontSize = 13.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        } else if (filtered.isEmpty()) {
            Text("لا توجد بيانات للفترة المحددة", color = Color.Gray, fontSize = 13.sp)
        }
    }
}

@Composable
private fun Stat(title: String, value: String, modifier: Modifier) {
    Card(modifier, shape = RoundedCornerShape(16.dp), colors = CardDefaults.cardColors(containerColor = FlowexaSurface)) {
        Column(Modifier.padding(14.dp)) {
            Text(title, fontSize = 12.sp, color = TextSecondary)
            Text(value, fontSize = 20.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
        }
    }
}
