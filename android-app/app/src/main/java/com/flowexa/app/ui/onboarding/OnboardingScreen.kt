package com.flowexa.app.ui.onboarding

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Business
import androidx.compose.material.icons.filled.Group
import androidx.compose.material.icons.filled.ShoppingBag
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.flowexa.app.ui.components.AppLogoView
import com.flowexa.app.ui.theme.FlowexaBg
import com.flowexa.app.ui.theme.FlowexaBlue
import com.flowexa.app.ui.theme.FlowexaGreen
import com.flowexa.app.ui.theme.FlowexaSurface

@Composable
fun OnboardingScreen(
    onCreateCompany: (name: String, phone: String) -> Unit,
    onJoinAsEmployee: (joinCode: String) -> Unit,
    onJoinAsClient: (clientJoinCode: String) -> Unit,
    isLoading: Boolean,
    errorMessage: String? = null
) {
    var selectedTab by remember { mutableIntStateOf(0) }
    var companyName by remember { mutableStateOf("") }
    var companyPhone by remember { mutableStateOf("") }
    var joinCode by remember { mutableStateOf("") }
    var clientCode by remember { mutableStateOf("") }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(FlowexaBg)
            .padding(16.dp),
        contentAlignment = Alignment.Center
    ) {
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = FlowexaSurface),
            elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
        ) {
            Column(
                modifier = Modifier
                    .padding(20.dp)
                    .verticalScroll(rememberScrollState()),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                AppLogoView(size = 48)
                Spacer(modifier = Modifier.height(16.dp))

                Text(
                    text = "مرحباً بك في Flowexa",
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    color = FlowexaBlue
                )
                Text(
                    text = "اختر كيف ترغب في استخدام النظام للبدء",
                    fontSize = 13.sp,
                    color = Color.Gray,
                    modifier = Modifier.padding(top = 4.dp, bottom = 16.dp)
                )

                if (errorMessage != null) {
                    Card(
                        colors = CardDefaults.cardColors(containerColor = Color(0xFFFEE2E2)),
                        modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Text(
                            text = errorMessage,
                            color = Color(0xFFDC2626),
                            fontSize = 13.sp,
                            modifier = Modifier.padding(10.dp)
                        )
                    }
                }

                TabRow(
                    selectedTabIndex = selectedTab,
                    containerColor = FlowexaBg,
                    modifier = Modifier.padding(bottom = 20.dp)
                ) {
                    Tab(
                        selected = selectedTab == 0,
                        onClick = { selectedTab = 0 },
                        text = { Text("إنشاء شركة", fontSize = 12.sp, fontWeight = FontWeight.Bold) },
                        icon = { Icon(Icons.Default.Business, contentDescription = null, modifier = Modifier.size(18.dp)) }
                    )
                    Tab(
                        selected = selectedTab == 1,
                        onClick = { selectedTab = 1 },
                        text = { Text("كموظف", fontSize = 12.sp, fontWeight = FontWeight.Bold) },
                        icon = { Icon(Icons.Default.Group, contentDescription = null, modifier = Modifier.size(18.dp)) }
                    )
                    Tab(
                        selected = selectedTab == 2,
                        onClick = { selectedTab = 2 },
                        text = { Text("كعميل", fontSize = 12.sp, fontWeight = FontWeight.Bold) },
                        icon = { Icon(Icons.Default.ShoppingBag, contentDescription = null, modifier = Modifier.size(18.dp)) }
                    )
                }

                when (selectedTab) {
                    0 -> {
                        OutlinedTextField(
                            value = companyName,
                            onValueChange = { companyName = it },
                            label = { Text("اسم الشركة أو المؤسسة") },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp),
                            singleLine = true
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        OutlinedTextField(
                            value = companyPhone,
                            onValueChange = { companyPhone = it },
                            label = { Text("رقم هاتف الشركة") },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp),
                            singleLine = true
                        )
                        Spacer(modifier = Modifier.height(20.dp))
                        Button(
                            onClick = { onCreateCompany(companyName, companyPhone) },
                            modifier = Modifier.fillMaxWidth().height(50.dp),
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = FlowexaBlue),
                            enabled = !isLoading && companyName.isNotBlank()
                        ) {
                            Text("تأسيس الشركة والدخول", fontWeight = FontWeight.Bold)
                        }
                    }
                    1 -> {
                        OutlinedTextField(
                            value = joinCode,
                            onValueChange = { joinCode = it },
                            label = { Text("كود انضمام الموظف للشركة") },
                            placeholder = { Text("أدخل الكود الذي استلمته من الإدارة") },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp),
                            singleLine = true
                        )
                        Spacer(modifier = Modifier.height(20.dp))
                        Button(
                            onClick = { onJoinAsEmployee(joinCode) },
                            modifier = Modifier.fillMaxWidth().height(50.dp),
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = FlowexaBlue),
                            enabled = !isLoading && joinCode.isNotBlank()
                        ) {
                            Text("إرسال طلب الانضمام", fontWeight = FontWeight.Bold)
                        }
                    }
                    2 -> {
                        OutlinedTextField(
                            value = clientCode,
                            onValueChange = { clientCode = it },
                            label = { Text("كود الشركة الخاص بالعملاء") },
                            placeholder = { Text("أدخل كود عملاء الشركة للوصول لكتالوجها") },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp),
                            singleLine = true
                        )
                        Spacer(modifier = Modifier.height(20.dp))
                        Button(
                            onClick = { onJoinAsClient(clientCode) },
                            modifier = Modifier.fillMaxWidth().height(50.dp),
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = FlowexaGreen),
                            enabled = !isLoading && clientCode.isNotBlank()
                        ) {
                            Text("دخول كعميل معتمد", fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }
}
