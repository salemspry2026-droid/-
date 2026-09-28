package com.flowexa.app.ui.staff

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.Group
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Security
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.flowexa.app.data.local.entity.UserProfileEntity
import com.flowexa.app.ui.theme.FlowexaBg
import com.flowexa.app.ui.theme.FlowexaBlue
import com.flowexa.app.ui.theme.FlowexaGreen
import com.flowexa.app.ui.theme.FlowexaSurface

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StaffScreen(
    joinCode: String?,
    staffList: List<UserProfileEntity>,
    pendingEmployees: List<UserProfileEntity>,
    onBackClick: () -> Unit,
    onApproveEmployee: (UserProfileEntity) -> Unit,
    onRejectEmployee: (UserProfileEntity) -> Unit
) {
    val clipboardManager = LocalClipboardManager.current

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = "إدارة فريق العمل",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        color = FlowexaBlue
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(
                            Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "رجوع",
                            tint = FlowexaBlue
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = FlowexaSurface)
            )
        },
        containerColor = FlowexaBg
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Join Code Section
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = FlowexaSurface),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(
                            text = "كود انضمام الموظفين للشركة",
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Medium,
                            color = Color.Gray
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.Center,
                            modifier = Modifier
                                .background(Color(0xFFEFF6FF), RoundedCornerShape(12.dp))
                                .padding(horizontal = 20.dp, vertical = 10.dp)
                        ) {
                            Text(
                                text = joinCode ?: "------",
                                fontSize = 24.sp,
                                fontWeight = FontWeight.Bold,
                                color = FlowexaBlue,
                                letterSpacing = 2.sp
                            )
                            if (!joinCode.isNullOrEmpty()) {
                                Spacer(modifier = Modifier.width(12.dp))
                                IconButton(
                                    onClick = { clipboardManager.setText(AnnotatedString(joinCode)) },
                                    modifier = Modifier.size(28.dp)
                                ) {
                                    Icon(
                                        Icons.Default.ContentCopy,
                                        contentDescription = "نسخ الكود",
                                        tint = FlowexaBlue,
                                        modifier = Modifier.size(18.dp)
                                    )
                                }
                            }
                        }
                        Spacer(modifier = Modifier.height(6.dp))
                        Text(
                            text = "شارك هذا الكود مع مندوبي وموظفي شركتك للانضمام فوراً للنظام.",
                            fontSize = 11.sp,
                            color = Color.Gray
                        )
                    }
                }
            }

            // Pending Approvals
            if (pendingEmployees.isNotEmpty()) {
                item {
                    Text(
                        text = "طلبات الانضمام بانتظار الموافقة (${pendingEmployees.size})",
                        fontWeight = FontWeight.Bold,
                        fontSize = 15.sp,
                        color = Color(0xFFD97706)
                    )
                }

                items(pendingEmployees, key = { it.id }) { emp ->
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(14.dp),
                        colors = CardDefaults.cardColors(containerColor = Color(0xFFFFFBEB)),
                        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(40.dp)
                                    .background(Color(0xFFFDE68A), CircleShape),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(Icons.Default.Person, contentDescription = null, tint = Color(0xFFB45309))
                            }
                            Spacer(modifier = Modifier.width(12.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = emp.displayName.ifEmpty { "موظف جديد" },
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 14.sp,
                                    color = FlowexaBlue
                                )
                                Text(
                                    text = emp.email,
                                    fontSize = 12.sp,
                                    color = Color.Gray
                                )
                            }
                            Row {
                                IconButton(
                                    onClick = { onApproveEmployee(emp) },
                                    colors = IconButtonDefaults.iconButtonColors(containerColor = Color(0xFFDCFCE7))
                                ) {
                                    Icon(Icons.Default.Check, contentDescription = "قبول", tint = FlowexaGreen)
                                }
                                Spacer(modifier = Modifier.width(6.dp))
                                IconButton(
                                    onClick = { onRejectEmployee(emp) },
                                    colors = IconButtonDefaults.iconButtonColors(containerColor = Color(0xFFFEE2E2))
                                ) {
                                    Icon(Icons.Default.Close, contentDescription = "رفض", tint = Color(0xFFDC2626))
                                }
                            }
                        }
                    }
                }
            }

            // Active Staff Section
            item {
                Text(
                    text = "أعضاء الفريق الحاليين (${staffList.size})",
                    fontWeight = FontWeight.Bold,
                    fontSize = 15.sp,
                    color = FlowexaBlue
                )
            }

            if (staffList.isEmpty()) {
                item {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(24.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(text = "لا يوجد موظفون مضافون حالياً", color = Color.Gray, fontSize = 13.sp)
                    }
                }
            } else {
                items(staffList, key = { it.id }) { staff ->
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(14.dp),
                        colors = CardDefaults.cardColors(containerColor = FlowexaSurface),
                        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(14.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(42.dp)
                                    .background(Color(0xFFE2E8F0), CircleShape),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(Icons.Default.Person, contentDescription = null, tint = FlowexaBlue)
                            }
                            Spacer(modifier = Modifier.width(12.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = staff.displayName.ifEmpty { "عضو فريق" },
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 14.sp,
                                    color = FlowexaBlue
                                )
                                Text(
                                    text = staff.email,
                                    fontSize = 12.sp,
                                    color = Color.Gray
                                )
                            }
                            Surface(
                                shape = RoundedCornerShape(8.dp),
                                color = when (staff.role) {
                                    "owner" -> Color(0xFFFEF3C7)
                                    "admin" -> Color(0xFFDBEAFE)
                                    else -> Color(0xFFF1F5F9)
                                }
                            ) {
                                Text(
                                    text = when (staff.role) {
                                        "owner" -> "المالك"
                                        "admin" -> "مدير"
                                        "sales" -> "مندوب مبيعات"
                                        else -> "موظف"
                                    },
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = when (staff.role) {
                                        "owner" -> Color(0xFFB45309)
                                        "admin" -> Color(0xFF1D4ED8)
                                        else -> Color(0xFF475569)
                                    },
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
