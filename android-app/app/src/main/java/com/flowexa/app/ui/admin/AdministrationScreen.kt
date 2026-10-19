package com.flowexa.app.ui.admin

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.flowexa.app.data.local.entity.*
import com.flowexa.app.ui.theme.*
import org.json.JSONArray
import org.json.JSONObject

/** Web parity: components/AdministrationDialog.tsx (tabs: العملات / العناوين / الأصناف / المراحل). */
private val CURRENCIES = listOf(
    "SAR" to "الريال السعودي (SAR)", "AED" to "الدرهم الإماراتي (AED)", "QAR" to "الريال القطري (QAR)",
    "KWD" to "الدينار الكويتي (KWD)", "BHD" to "الدينار البحريني (BHD)", "OMR" to "الريال العماني (OMR)",
    "YER" to "الريال اليمني (YER)", "EGP" to "الجنيه المصري (EGP)", "JOD" to "الدينار الأردني (JOD)",
    "LBP" to "الليرة اللبنانية (LBP)", "SYP" to "الليرة السورية (SYP)", "IQD" to "الدينار العراقي (IQD)",
    "MAD" to "الدرهم المغربي (MAD)", "DZD" to "الدينار الجزائري (DZD)", "TND" to "الدينار التونسي (TND)",
    "LYD" to "الدينار الليبي (LYD)", "SDG" to "الجنيه السوداني (SDG)", "USD" to "الدولار الأمريكي (USD)",
    "EUR" to "اليورو (EUR)"
)
private val LOCATION_TYPES = listOf("country" to "بلد", "governorate" to "محافظة", "region" to "مدينة / منطقة", "neighborhood" to "حي")
private val ROLE_LABELS = listOf("owner" to "مالك", "admin" to "مدير", "sales" to "مبيعات", "client" to "عميل")

@Composable
fun AdministrationScreen(
    isAdmin: Boolean,
    company: CompanyEntity?,
    locations: List<LocationEntity>,
    categories: List<ProductCategoryEntity>,
    brands: List<ProductBrandEntity>,
    stages: List<OrderStageEntity>,
    onSaveCurrencies: (primary: String, secondary: List<String>, rates: Map<String, Double>) -> Unit,
    onAddLocation: (name: String, type: String, parentId: String?) -> Unit,
    onDeleteLocation: (String) -> Unit,
    onAddCategory: (String) -> Unit,
    onDeleteCategory: (String) -> Unit,
    onAddBrand: (String) -> Unit,
    onDeleteBrand: (String) -> Unit,
    onAddStage: (name: String, roles: List<String>) -> Unit,
    onDeleteStage: (String) -> Unit
) {
    if (!isAdmin) {
        Box(Modifier.fillMaxSize().background(FlowexaBg), contentAlignment = Alignment.Center) {
            Text("عذراً، ليس لديك صلاحية للوصول إلى هذه الصفحة.", color = Color(0xFFDC2626), fontWeight = FontWeight.Bold)
        }
        return
    }
    var tab by remember { mutableIntStateOf(0) }
    val titles = listOf("العملات", "العناوين", "الأصناف", "المراحل")
    Column(Modifier.fillMaxSize().background(FlowexaBg)) {
        ScrollableTabRow(selectedTabIndex = tab, containerColor = FlowexaSurface, edgePadding = 8.dp) {
            titles.forEachIndexed { i, t -> Tab(selected = tab == i, onClick = { tab = i }, text = { Text(t) }) }
        }
        when (tab) {
            0 -> CurrenciesTab(company, onSaveCurrencies)
            1 -> LocationsTab(locations, onAddLocation, onDeleteLocation)
            2 -> ProductMetaTab(categories, brands, onAddCategory, onDeleteCategory, onAddBrand, onDeleteBrand)
            else -> StagesTab(stages, onAddStage, onDeleteStage)
        }
    }
}

@Composable
private fun Dropdown(label: String, options: List<Pair<String, String>>, selected: String, enabledOf: (String) -> Boolean = { true }, onSelect: (String) -> Unit) {
    var open by remember { mutableStateOf(false) }
    Box {
        OutlinedButton(onClick = { open = true }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp)) {
            Text(options.firstOrNull { it.first == selected }?.second ?: label, modifier = Modifier.weight(1f), maxLines = 1)
        }
        DropdownMenu(expanded = open, onDismissRequest = { open = false }) {
            options.forEach { (k, v) ->
                DropdownMenuItem(text = { Text(v) }, enabled = enabledOf(k), onClick = { onSelect(k); open = false })
            }
        }
    }
}

@Composable
private fun CurrenciesTab(company: CompanyEntity?, onSave: (String, List<String>, Map<String, Double>) -> Unit) {
    var primary by remember(company?.id, company?.primaryCurrency) { mutableStateOf(company?.primaryCurrency ?: "SAR") }
    var secondary by remember(company?.id, company?.secondaryCurrenciesJson) {
        mutableStateOf(runCatching { JSONArray(company?.secondaryCurrenciesJson ?: "[]").let { a -> List(a.length()) { a.getString(it) } } }.getOrDefault(emptyList()))
    }
    var rates by remember(company?.id, company?.exchangeRatesJson) {
        mutableStateOf(runCatching { JSONObject(company?.exchangeRatesJson ?: "{}").let { o -> o.keys().asSequence().associateWith { o.optDouble(it, 1.0) } } }.getOrDefault(emptyMap()))
    }
    var newCurrency by remember { mutableStateOf("") }
    var saved by remember { mutableStateOf(false) }
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        Text("العملة الرئيسية", fontWeight = FontWeight.Bold)
        Dropdown("اختر العملة الرئيسية", CURRENCIES, primary) { primary = it }
        Text("العملة الافتراضية التي سيتم استخدامها في التطبيق.", fontSize = 12.sp, color = TextSecondary)
        Text("العملات الإضافية", fontWeight = FontWeight.Bold)
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.weight(1f)) {
                Dropdown("اختر عملة إضافية", CURRENCIES, newCurrency, enabledOf = { it != primary && it !in secondary }) { newCurrency = it }
            }
            FilledTonalButton(onClick = {
                if (newCurrency.isNotEmpty() && newCurrency !in secondary && newCurrency != primary) {
                    secondary = secondary + newCurrency; rates = rates + (newCurrency to 1.0); newCurrency = ""
                }
            }) { Text("إضافة") }
        }
        secondary.forEach { cur ->
            var text by remember(cur) { mutableStateOf((rates[cur] ?: 1.0).let { if (it == it.toLong().toDouble()) it.toLong().toString() else it.toString() }) }
            Card(shape = RoundedCornerShape(14.dp), colors = CardDefaults.cardColors(containerColor = FlowexaSurface)) {
                Row(Modifier.fillMaxWidth().padding(12.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Column(Modifier.weight(1f)) {
                        Text(cur, fontWeight = FontWeight.Bold, color = FlowexaBlue)
                        Text(CURRENCIES.firstOrNull { it.first == cur }?.second ?: cur, fontSize = 11.sp, color = TextSecondary)
                    }
                    Text("= ", fontSize = 12.sp)
                    OutlinedTextField(
                        value = text, onValueChange = { text = it; rates = rates + (cur to (it.toDoubleOrNull() ?: 0.0)) },
                        modifier = Modifier.width(90.dp), singleLine = true, placeholder = { Text("1.0") }
                    )
                    Text(primary, fontSize = 12.sp)
                    IconButton(onClick = { secondary = secondary - cur; rates = rates - cur }) { Icon(Icons.Default.Close, "حذف") }
                }
            }
        }
        if (secondary.isEmpty()) Text("لم يتم إضافة عملات إضافية", fontSize = 12.sp, color = TextMuted)
        Button(
            onClick = { onSave(primary, secondary, rates.filterKeys { it in secondary }); saved = true },
            modifier = Modifier.fillMaxWidth().height(50.dp), colors = ButtonDefaults.buttonColors(containerColor = FlowexaBlue)
        ) { Text("حفظ التغييرات", fontWeight = FontWeight.Bold) }
        if (saved) Text("تم حفظ إعدادات العملات بنجاح", color = FlowexaGreenDark, fontSize = 12.sp)
    }
}

@Composable
private fun LocationsTab(locations: List<LocationEntity>, onAdd: (String, String, String?) -> Unit, onDelete: (String) -> Unit) {
    var name by remember { mutableStateOf("") }
    var type by remember { mutableStateOf("country") }
    var parentId by remember { mutableStateOf("") }
    fun label(t: String) = LOCATION_TYPES.firstOrNull { it.first == t }?.second ?: t
    val roots = locations.filter { it.parentId.isNullOrEmpty() || it.type == "country" }
    LazyColumn(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        item {
            Card(shape = RoundedCornerShape(16.dp), colors = CardDefaults.cardColors(containerColor = FlowexaSurface)) {
                Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("إضافة عنوان جديد", fontWeight = FontWeight.Bold)
                    Dropdown("النوع", LOCATION_TYPES, type) { type = it; parentId = "" }
                    if (type != "country") {
                        val parents = locations.filter { it.type != type && it.type != "neighborhood" }
                            .map { it.id to "${it.name} (${label(it.type)})" }
                        Dropdown("التابع لـ", listOf("" to "بدون تابع") + parents, parentId) { parentId = it }
                    }
                    OutlinedTextField(name, { name = it }, label = { Text("اسم العنوان") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                    Button(onClick = {
                        if (name.isNotBlank()) { onAdd(name.trim(), type, parentId.ifEmpty { null }); name = "" }
                    }, colors = ButtonDefaults.buttonColors(containerColor = FlowexaBlue)) {
                        Icon(Icons.Default.Add, null); Spacer(Modifier.width(6.dp)); Text("إضافة")
                    }
                }
            }
        }
        item { Text("خريطة العناوين المضافة", fontWeight = FontWeight.Bold) }
        if (roots.isEmpty()) item {
            Text("لا توجد عناوين مضافة بعد. أضف \"بلد\" للبدء بتكوين هيكل العناوين.", fontSize = 12.sp, color = TextMuted)
        }
        fun flatten(l: LocationEntity, level: Int, out: MutableList<Pair<LocationEntity, Int>>) {
            out += l to level
            locations.filter { it.parentId == l.id }.forEach { flatten(it, level + 1, out) }
        }
        val flat = mutableListOf<Pair<LocationEntity, Int>>().also { o -> roots.forEach { flatten(it, 0, o) } }
        items(flat, key = { it.first.id }) { (loc, level) ->
            Card(Modifier.padding(start = (level * 16).dp), shape = RoundedCornerShape(12.dp), colors = CardDefaults.cardColors(containerColor = FlowexaSurface)) {
                Row(Modifier.fillMaxWidth().padding(start = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text(loc.name, Modifier.weight(1f), fontWeight = FontWeight.Medium)
                    Text("(${label(loc.type)})", fontSize = 11.sp, color = TextSecondary)
                    IconButton(onClick = { onDelete(loc.id) }) { Icon(Icons.Default.Delete, "حذف", tint = Color(0xFFEF4444)) }
                }
            }
        }
    }
}

@Composable
private fun ProductMetaTab(
    categories: List<ProductCategoryEntity>, brands: List<ProductBrandEntity>,
    onAddCategory: (String) -> Unit, onDeleteCategory: (String) -> Unit,
    onAddBrand: (String) -> Unit, onDeleteBrand: (String) -> Unit
) {
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        NameList("الفئات", "اسم الفئة الجديدة", categories.map { it.id to it.name }, onAddCategory, onDeleteCategory)
        NameList("العلامات التجارية", "اسم العلامة الجديدة", brands.map { it.id to it.name }, onAddBrand, onDeleteBrand)
    }
}

@Composable
private fun NameList(title: String, hint: String, items: List<Pair<String, String>>, onAdd: (String) -> Unit, onDelete: (String) -> Unit) {
    var text by remember { mutableStateOf("") }
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(title, fontWeight = FontWeight.Bold, fontSize = 16.sp)
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
            OutlinedTextField(text, { text = it }, placeholder = { Text(hint) }, modifier = Modifier.weight(1f), singleLine = true)
            FilledTonalButton(onClick = { if (text.isNotBlank()) { onAdd(text.trim()); text = "" } }) { Text("إضافة") }
        }
        items.forEach { (id, n) ->
            Card(shape = RoundedCornerShape(12.dp), colors = CardDefaults.cardColors(containerColor = FlowexaSurface)) {
                Row(Modifier.fillMaxWidth().padding(start = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text(n, Modifier.weight(1f))
                    IconButton(onClick = { onDelete(id) }) { Icon(Icons.Default.Delete, "حذف", tint = Color(0xFFEF4444)) }
                }
            }
        }
    }
}

@Composable
private fun StagesTab(stages: List<OrderStageEntity>, onAdd: (String, List<String>) -> Unit, onDelete: (String) -> Unit) {
    var name by remember { mutableStateOf("") }
    var roles by remember { mutableStateOf(listOf("owner", "admin")) }
    fun roleLabel(r: String) = ROLE_LABELS.firstOrNull { it.first == r }?.second ?: r
    val sorted = stages.sortedBy { it.stageIndex }
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Card(shape = RoundedCornerShape(16.dp), colors = CardDefaults.cardColors(containerColor = FlowexaSurface)) {
            Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text("إضافة مرحلة جديدة", fontWeight = FontWeight.Bold)
                OutlinedTextField(name, { name = it }, label = { Text("اسم المرحلة") }, placeholder = { Text("مثال: قيد التجهيز") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                Text("الصلاحيات المسموحة للتأكيد", fontSize = 12.sp, color = TextSecondary)
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    ROLE_LABELS.forEach { (k, l) ->
                        FilterChip(selected = k in roles, onClick = { roles = if (k in roles) roles - k else roles + k }, label = { Text(l, fontSize = 12.sp) })
                    }
                }
                Button(onClick = { if (name.isNotBlank()) { onAdd(name.trim(), roles); name = "" } }, colors = ButtonDefaults.buttonColors(containerColor = FlowexaBlue)) {
                    Icon(Icons.Default.Add, null); Spacer(Modifier.width(6.dp)); Text("إضافة المرحلة")
                }
            }
        }
        Text("المراحل الحالية (حسب الترتيب)", fontWeight = FontWeight.Bold)
        sorted.forEachIndexed { idx, st ->
            val r = runCatching { JSONArray(st.allowedRolesJson).let { a -> List(a.length()) { a.getString(it) } } }.getOrDefault(emptyList())
            Card(shape = RoundedCornerShape(12.dp), colors = CardDefaults.cardColors(containerColor = FlowexaSurface)) {
                Row(Modifier.fillMaxWidth().padding(start = 12.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Box(Modifier.size(28.dp).background(FlowexaBlueLight, RoundedCornerShape(50)), contentAlignment = Alignment.Center) { Text("${idx + 1}", fontSize = 12.sp, color = FlowexaBlue, fontWeight = FontWeight.Bold) }
                    Column(Modifier.weight(1f)) {
                        Text(st.name, fontWeight = FontWeight.Bold)
                        Text("الصلاحيات: " + r.joinToString("، ") { roleLabel(it) }, fontSize = 11.sp, color = TextSecondary)
                    }
                    IconButton(onClick = { onDelete(st.id) }) { Icon(Icons.Default.Delete, "حذف", tint = Color(0xFFEF4444)) }
                }
            }
        }
        if (sorted.isEmpty()) Text("لا توجد مراحل مخصصة بعد.", fontSize = 12.sp, color = TextMuted)
    }
}
