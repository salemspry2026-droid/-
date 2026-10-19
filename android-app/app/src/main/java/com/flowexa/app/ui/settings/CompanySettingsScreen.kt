package com.flowexa.app.ui.settings

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.util.Base64
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.flowexa.app.core.AppConfig
import com.flowexa.app.data.local.entity.CompanyEntity
import com.flowexa.app.data.local.entity.LocationEntity
import com.flowexa.app.ui.components.AddressSelector
import com.flowexa.app.ui.theme.*
import org.json.JSONArray
import org.json.JSONObject
import java.io.ByteArrayOutputStream

private val COUNTRY_CODES = listOf(
    "+966" to "السعودية", "+971" to "الإمارات", "+965" to "الكويت", "+974" to "قطر", "+973" to "البحرين",
    "+968" to "عمان", "+20" to "مصر", "+962" to "الأردن", "+961" to "لبنان", "+964" to "العراق",
    "+963" to "سوريا", "+967" to "اليمن", "+249" to "السودان", "+212" to "المغرب", "+213" to "الجزائر",
    "+216" to "تونس", "+218" to "ليبيا", "+970" to "فلسطين", "+1" to "أمريكا / كندا", "+44" to "بريطانيا"
).map { it.first to "${it.second} (${it.first})" }

private val COMPANY_TYPES = listOf(
    "pharmaceuticals" to "للأدوية والصناعات الدوائية", "food" to "المواد الغذائية",
    "medical_equipment" to "المستلزمات الطبية", "cosmetics" to "مستحضرات التجميل", "other" to "آخر"
)
private val CURRENCY_SYMBOLS = listOf(
    "ر.س" to "ر.س (ريال سعودي)", "د.إ" to "د.إ (درهم إماراتي)", "د.ك" to "د.ك (دينار كويتي)",
    "ر.ع." to "ر.ع. (ريال عماني)", "ج.م" to "ج.م (جنيه مصري)", "USD" to "$ (دولار أمريكي)", "EUR" to "€ (يورو)"
)

private data class ContactNumber(val name: String, val countryCode: String, val number: String)

private fun typeLabel(type: String?, other: String?) = when (type) {
    "other" -> other.orEmpty().ifBlank { "غير محدد" }
    null, "" -> "غير محدد"
    else -> COMPANY_TYPES.firstOrNull { it.first == type }?.second ?: type
}

/** Web parity: components/CompanySettings.tsx (ملف الشركة: عرض/تعديل + كود الانضمام + رابط المشاركة + الظهور للعملاء + الشعار). */
@Composable
fun CompanySettingsScreen(
    company: CompanyEntity?,
    pendingSyncCount: Int,
    onSaveCompany: (CompanyEntity) -> Unit,
    onManualSync: () -> Unit,
    onLogout: () -> Unit,
    locations: List<LocationEntity> = emptyList(),
    canEdit: Boolean = true
) {
    val context = LocalContext.current
    var editing by remember { mutableStateOf(false) }
    var name by remember(company) { mutableStateOf(company?.name ?: "") }
    var type by remember(company) { mutableStateOf(company?.companyType ?: "") }
    var typeOther by remember(company) { mutableStateOf(company?.companyTypeOther ?: "") }
    var phone by remember(company) { mutableStateOf(company?.phone ?: "") }
    var contacts by remember(company) {
        mutableStateOf(runCatching {
            val a = JSONArray(company?.contactNumbersJson ?: "[]")
            List(a.length()) { val o = a.getJSONObject(it); ContactNumber(o.optString("name"), o.optString("countryCode", "+966"), o.optString("number")) }
        }.getOrDefault(emptyList()))
    }
    var email by remember(company) { mutableStateOf(company?.email ?: "") }
    var address by remember(company) { mutableStateOf(company?.address ?: "") }
    var taxId by remember(company) { mutableStateOf(company?.taxId ?: "") }
    var about by remember(company) { mutableStateOf(company?.aboutUs ?: "") }
    var hours by remember(company) { mutableStateOf(company?.workingHours ?: "") }
    var notes by remember(company) { mutableStateOf(company?.notes ?: "") }
    var currency by remember(company) { mutableStateOf(company?.primaryCurrency ?: "ر.س") }
    var visible by remember(company) { mutableStateOf(company?.isVisibleToClients ?: false) }
    var message by remember { mutableStateOf<String?>(null) }

    fun copy(label: String, text: String) {
        (context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager).setPrimaryClip(ClipData.newPlainText(label, text))
        message = "تم النسخ بنجاح!"
    }
    val logoPicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri: Uri? ->
        if (uri != null && company != null) {
            val data = compressToBase64(context, uri)
            if (data != null) { onSaveCompany(company.copy(logoUrl = data)); message = "تم تحديث شعار الشركة بنجاح" }
            else message = "حدث خطأ أثناء رفع الصورة"
        }
    }

    if (company == null) {
        Box(Modifier.fillMaxSize().background(FlowexaBg), contentAlignment = Alignment.Center) { Text("الشركة غير موجودة") }
        return
    }

    Column(Modifier.fillMaxSize().background(FlowexaBg).padding(16.dp).verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        // Header: logo + name + type
        Card(Modifier.fillMaxWidth(), shape = RoundedCornerShape(20.dp), colors = CardDefaults.cardColors(containerColor = FlowexaSurface)) {
            Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                Box(Modifier.size(72.dp).clip(RoundedCornerShape(18.dp)).background(FlowexaBlueLight).clickable(enabled = canEdit) { logoPicker.launch("image/*") }, contentAlignment = Alignment.Center) {
                    val bmp = remember(company.logoUrl) { decodeDataUrl(company.logoUrl) }
                    if (bmp != null) Image(bmp.asImageBitmap(), null, Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
                    else Icon(Icons.Default.Business, null, tint = FlowexaBlue, modifier = Modifier.size(32.dp))
                }
                Column(Modifier.weight(1f)) {
                    Text(company.name.ifBlank { "اسم الشركة" }, fontSize = 18.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                    Text(typeLabel(company.companyType, company.companyTypeOther), fontSize = 12.sp, color = TextSecondary)
                    if (canEdit) Text("اضغط على الشعار لتغييره", fontSize = 10.sp, color = TextMuted)
                }
            }
        }
        message?.let { Text(it, color = FlowexaGreenDark, fontSize = 12.sp) }

        if (!editing) {
            Card(Modifier.fillMaxWidth(), shape = RoundedCornerShape(20.dp), colors = CardDefaults.cardColors(containerColor = FlowexaSurface)) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                        Text("المعلومات الأساسية", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                        if (canEdit) OutlinedButton(onClick = { editing = true }) { Icon(Icons.Default.Edit, null, Modifier.size(16.dp)); Spacer(Modifier.width(4.dp)); Text("تعديل البيانات") }
                    }
                    InfoItem("الهاتف الرئيسي", phone)
                    Text("أرقام تواصل إضافية", fontSize = 12.sp, color = TextSecondary)
                    if (contacts.isEmpty()) Text("لا يوجد أرقام إضافية مسجلة.", fontSize = 12.sp, color = TextMuted)
                    contacts.forEach { Text("${it.name.ifBlank { "رقم تواصل" }}:  ${it.countryCode} ${it.number}", fontSize = 13.sp) }
                    InfoItem("البريد الإلكتروني", email)
                    InfoItem("الرقم الضريبي", taxId)
                    InfoItem("العملة الرئيسية", currency)
                    InfoItem("العنوان", address)
                    InfoItem("أوقات الدوام", hours)
                    if (about.isNotBlank()) { Text("نبذة عنا", fontWeight = FontWeight.Bold, fontSize = 13.sp); Text(about, fontSize = 13.sp, color = TextSecondary) }
                    if (notes.isNotBlank()) { Text("ملاحظات", fontWeight = FontWeight.Bold, fontSize = 13.sp); Text(notes, fontSize = 13.sp, color = TextSecondary) }
                }
            }
            // Join code
            Card(Modifier.fillMaxWidth(), shape = RoundedCornerShape(20.dp), colors = CardDefaults.cardColors(containerColor = FlowexaSurface)) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("كود انضمام الموظفين", fontWeight = FontWeight.Bold)
                    Text("(فريق المبيعات والإدارة)", fontSize = 11.sp, color = TextSecondary)
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(company.joinCode ?: "—", Modifier.weight(1f), fontSize = 20.sp, fontWeight = FontWeight.Black, color = FlowexaBlue)
                        company.joinCode?.let { code -> IconButton(onClick = { copy("joinCode", code) }) { Icon(Icons.Default.ContentCopy, "نسخ") } }
                    }
                    Text("شارك هذا الكود مع موظفيك بصلاحيات المبيعات أو فريق الإدارة.", fontSize = 11.sp, color = TextSecondary)
                }
            }
            // Share link + visibility
            val link = "${AppConfig.WEB_BASE_URL}/c/${company.id}"
            Card(Modifier.fillMaxWidth(), shape = RoundedCornerShape(20.dp), colors = CardDefaults.cardColors(containerColor = FlowexaSurface)) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("رابط مشاركة الشركة للعملاء", fontWeight = FontWeight.Bold)
                    Text("(للنشر والمشاركة)", fontSize = 11.sp, color = TextSecondary)
                    Text(link, fontSize = 12.sp, color = FlowexaBlue)
                    OutlinedButton(onClick = { copy("link", link); message = "تم نسخ رابط الشركة بنجاح!" }) { Text("نسخ الرابط") }
                    Text("شارك هذا الرابط مع عملائك ليتمكنوا من تصفح منتجاتك بسهولة وطلبها.", fontSize = 11.sp, color = TextSecondary)
                    HorizontalDivider()
                    Text("حالة ظهور الشركة للعملاء", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                    Text(if (company.isVisibleToClients) "شركتك ظاهرة حالياً للعملاء ويمكنهم الشراء." else "شركتك مخفية، لا تظهر في قائمة الشركات المتاحة للعملاء.", fontSize = 12.sp, color = if (company.isVisibleToClients) FlowexaGreenDark else StatusPending)
                }
            }
        } else {
            Card(Modifier.fillMaxWidth(), shape = RoundedCornerShape(20.dp), colors = CardDefaults.cardColors(containerColor = FlowexaSurface)) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("تعديل معلومات الشركة", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text("ظهور الشركة للعملاء", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                            Text("حين تفعيل هذا الخيار، ستظهر الشركة في القائمة العامة للعملاء. (سيتم إخفاؤها تلقائياً إذا لم تكن تحتوي على أصناف متاحة للبيع)", fontSize = 11.sp, color = TextSecondary)
                        }
                        Switch(checked = visible, onCheckedChange = { visible = it })
                    }
                    Field("اسم الشركة", name) { name = it }
                    Pick("نوع الشركة/الوكالة", COMPANY_TYPES, type) { type = it }
                    if (type == "other") Field("حدد نوع العمل", typeOther) { typeOther = it }
                    Field("رقم الهاتف الرئيسي", phone) { phone = it }
                    Text("أرقام تواصل إضافية", fontSize = 12.sp, color = TextSecondary)
                    contacts.forEachIndexed { idx, c ->
                        Card(colors = CardDefaults.cardColors(containerColor = Color(0xFFF8FAFC)), shape = RoundedCornerShape(12.dp)) {
                            Column(Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                Field("الاسم التعريفي (مثال: مستودع)", c.name) { v -> contacts = contacts.toMutableList().also { it[idx] = c.copy(name = v) } }
                                Pick("رمز البلد", COUNTRY_CODES, c.countryCode) { v -> contacts = contacts.toMutableList().also { it[idx] = c.copy(countryCode = v) } }
                                Field("رقم الهاتف (أرقام فقط)", c.number) { v -> contacts = contacts.toMutableList().also { it[idx] = c.copy(number = v.filter(Char::isDigit)) } }
                                TextButton(onClick = { contacts = contacts.filterIndexed { i, _ -> i != idx } }) { Text("حذف", color = Color(0xFFEF4444)) }
                            }
                        }
                    }
                    OutlinedButton(onClick = { contacts = contacts + ContactNumber("", "+966", "") }) { Icon(Icons.Default.Add, null); Spacer(Modifier.width(4.dp)); Text("إضافة رقم تواصل جديد") }
                    Field("البريد الإلكتروني", email) { email = it }
                    Field("الرقم الضريبي", taxId) { taxId = it }
                    Pick("العملة الرئيسية", CURRENCY_SYMBOLS, currency) { currency = it }
                    Text("تفاصيل العنوان", fontSize = 12.sp, color = TextSecondary)
                    AddressSelector(locations, address) { address = it }
                    if (address.isNotBlank()) Text(address, fontSize = 12.sp, color = FlowexaBlue)
                    Field("نبذة عنا", about, singleLine = false) { about = it }
                    Field("أوقات الدوام (اختياري)", hours) { hours = it }
                    Field("ملاحظات (اختياري)", notes, singleLine = false) { notes = it }
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Button(
                            onClick = {
                                val arr = JSONArray(); contacts.filter { it.number.isNotBlank() }.forEach { arr.put(JSONObject().put("name", it.name).put("countryCode", it.countryCode).put("number", it.number)) }
                                onSaveCompany(company.copy(
                                    name = name, companyType = type.ifEmpty { null }, companyTypeOther = if (type == "other") typeOther else "",
                                    phone = phone, contactNumbersJson = arr.toString(), email = email, address = address, taxId = taxId,
                                    aboutUs = about, workingHours = hours, notes = notes, primaryCurrency = currency, isVisibleToClients = visible
                                ))
                                message = "تم حفظ معلومات الشركة بنجاح"; editing = false
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = FlowexaBlue)
                        ) { Icon(Icons.Default.Save, null); Spacer(Modifier.width(6.dp)); Text("حفظ التغييرات") }
                        OutlinedButton(onClick = { editing = false }) { Text("إلغاء") }
                    }
                }
            }
        }

        // Android-only: sync status (offline-first) and logout
        Card(Modifier.fillMaxWidth(), shape = RoundedCornerShape(16.dp), colors = CardDefaults.cardColors(containerColor = FlowexaSurface)) {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("حالة المزامنة والبيانات المحلية", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = FlowexaBlue)
                Text(if (pendingSyncCount > 0) "$pendingSyncCount عملية تنتظر المزامنة مع السيرفر" else "جميع البيانات المحلية متزامنة ومطابقة للسيرفر", fontSize = 13.sp, color = if (pendingSyncCount > 0) StatusPending else FlowexaGreen)
                OutlinedButton(onClick = onManualSync, modifier = Modifier.fillMaxWidth()) { Icon(Icons.Default.Sync, null); Spacer(Modifier.width(6.dp)); Text("مزامنة التغييرات الآن (Sync Now)") }
            }
        }
        OutlinedButton(onClick = onLogout, modifier = Modifier.fillMaxWidth()) { Text("تسجيل الخروج من الحساب", fontWeight = FontWeight.Bold, color = StatusCancelled) }
    }
}

@Composable
private fun InfoItem(label: String, value: String) {
    Column { Text(label, fontSize = 12.sp, color = TextSecondary); Text(value.ifBlank { "—" }, fontSize = 14.sp, fontWeight = FontWeight.Medium, color = TextPrimary) }
}

@Composable
private fun Field(label: String, value: String, singleLine: Boolean = true, onChange: (String) -> Unit) {
    OutlinedTextField(value, onChange, label = { Text(label) }, modifier = Modifier.fillMaxWidth(), singleLine = singleLine, minLines = if (singleLine) 1 else 3, shape = RoundedCornerShape(12.dp))
}

@Composable
private fun Pick(label: String, options: List<Pair<String, String>>, selected: String, onSelect: (String) -> Unit) {
    var open by remember { mutableStateOf(false) }
    Column {
        Text(label, fontSize = 12.sp, color = TextSecondary)
        Box {
            OutlinedButton(onClick = { open = true }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp)) {
                Text(options.firstOrNull { it.first == selected }?.second ?: "اختر", Modifier.weight(1f), maxLines = 1)
            }
            DropdownMenu(expanded = open, onDismissRequest = { open = false }) {
                options.forEach { (k, v) -> DropdownMenuItem(text = { Text(v) }, onClick = { onSelect(k); open = false }) }
            }
        }
    }
}

private fun decodeDataUrl(url: String?): Bitmap? {
    if (url.isNullOrBlank() || !url.startsWith("data:image")) return null
    return try {
        val bytes = Base64.decode(url.substringAfter("base64,"), Base64.DEFAULT)
        BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
    } catch (_: Exception) { null }
}

/** Same approach as the web: max 400x400 JPEG stored as a base64 data URL (no Firebase Storage). */
private fun compressToBase64(context: Context, uri: Uri): String? = try {
    val src = context.contentResolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it) } ?: return null
    val scale = minOf(1f, 400f / maxOf(src.width, src.height))
    val bmp = if (scale < 1f) Bitmap.createScaledBitmap(src, (src.width * scale).toInt(), (src.height * scale).toInt(), true) else src
    val out = ByteArrayOutputStream()
    bmp.compress(Bitmap.CompressFormat.JPEG, 70, out)
    "data:image/jpeg;base64," + Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP)
} catch (_: Exception) { null }
