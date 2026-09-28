package com.flowexa.app.ui.settings

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ExitToApp
import androidx.compose.material.icons.filled.Save
import androidx.compose.material.icons.filled.Sync
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.flowexa.app.data.local.entity.CompanyEntity
import com.flowexa.app.ui.theme.*

@Composable
fun CompanySettingsScreen(
    company: CompanyEntity?,
    pendingSyncCount: Int,
    onSaveCompany: (CompanyEntity) -> Unit,
    onManualSync: () -> Unit,
    onLogout: () -> Unit
) {
    var name by remember(company) { mutableStateOf(company?.name ?: "") }
    var phone by remember(company) { mutableStateOf(company?.phone ?: "") }
    var address by remember(company) { mutableStateOf(company?.address ?: "") }
    var taxId by remember(company) { mutableStateOf(company?.taxId ?: "") }
    var primaryCurrency by remember(company) { mutableStateOf(company?.primaryCurrency ?: "SAR") }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(FlowexaBg)
            .padding(16.dp)
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Sync Status Card
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = FlowexaSurface)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text("حالة المزامنة والبيانات المحلية", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = FlowexaBlue)
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = if (pendingSyncCount > 0) "$pendingSyncCount عملية تنتظر المزامنة مع السيرفر" else "جميع البيانات المحلية متزامنة ومطابقة للسيرفر",
                    fontSize = 13.sp,
                    color = if (pendingSyncCount > 0) StatusPending else FlowexaGreen
                )
                Spacer(modifier = Modifier.height(12.dp))
                Button(
                    onClick = onManualSync,
                    colors = ButtonDefaults.buttonColors(containerColor = FlowexaBlue),
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.fillMaxWidth().height(44.dp)
                ) {
                    Icon(Icons.Default.Sync, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("مزامنة التغييرات الآن (Sync Now)")
                }
            }
        }

        // Company Details Card
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = FlowexaSurface)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text("بيانات المنشأة والعملة", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = FlowexaBlue)
                Spacer(modifier = Modifier.height(12.dp))

                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("اسم المنشأة / الشركة") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )

                Spacer(modifier = Modifier.height(10.dp))

                OutlinedTextField(
                    value = phone,
                    onValueChange = { phone = it },
                    label = { Text("رقم الهاتف للتواصل") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )

                Spacer(modifier = Modifier.height(10.dp))

                OutlinedTextField(
                    value = address,
                    onValueChange = { address = it },
                    label = { Text("العنوان الرئيسي") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )

                Spacer(modifier = Modifier.height(10.dp))

                OutlinedTextField(
                    value = taxId,
                    onValueChange = { taxId = it },
                    label = { Text("الرقم الضريبي (اختياري)") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )

                Spacer(modifier = Modifier.height(10.dp))

                OutlinedTextField(
                    value = primaryCurrency,
                    onValueChange = { primaryCurrency = it },
                    label = { Text("العملة الأساسية (SAR, USD, YER..)") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )

                Spacer(modifier = Modifier.height(16.dp))

                Button(
                    onClick = {
                        if (company != null) {
                            onSaveCompany(
                                company.copy(
                                    name = name,
                                    phone = phone,
                                    address = address,
                                    taxId = taxId,
                                    primaryCurrency = primaryCurrency
                                )
                            )
                        }
                    },
                    modifier = Modifier.fillMaxWidth().height(48.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = FlowexaBlue)
                ) {
                    Icon(Icons.Default.Save, contentDescription = null)
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("حفظ التعديلات")
                }
            }
        }

        // Account / Logout Card
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = FlowexaSurface)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                OutlinedButton(
                    onClick = onLogout,
                    modifier = Modifier.fillMaxWidth().height(48.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = StatusCancelled)
                ) {
                    Icon(Icons.Default.ExitToApp, contentDescription = null, tint = StatusCancelled)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("تسجيل الخروج من الحساب", fontWeight = FontWeight.Bold, color = StatusCancelled)
                }
            }
        }
    }
}
