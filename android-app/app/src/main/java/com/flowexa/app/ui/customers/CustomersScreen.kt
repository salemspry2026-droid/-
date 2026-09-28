package com.flowexa.app.ui.customers

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.flowexa.app.data.local.entity.CustomerEntity
import com.flowexa.app.ui.theme.*
import java.util.UUID

@Composable
fun CustomersScreen(
    customers: List<CustomerEntity>,
    searchQuery: String,
    onSearchChange: (String) -> Unit,
    onSaveCustomer: (CustomerEntity, isNew: Boolean) -> Unit,
    onDeleteCustomer: (String) -> Unit,
    companyId: String
) {
    val context = LocalContext.current
    var showDialog by remember { mutableStateOf(false) }
    var editingCustomer by remember { mutableStateOf<CustomerEntity?>(null) }

    Scaffold(
        floatingActionButton = {
            FloatingActionButton(
                onClick = {
                    editingCustomer = null
                    showDialog = true
                },
                containerColor = FlowexaBlue,
                contentColor = Color.White
            ) {
                Icon(Icons.Default.PersonAdd, contentDescription = "إضافة عميل")
            }
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(FlowexaBg)
                .padding(padding)
                .padding(horizontal = 16.dp)
        ) {
            Spacer(modifier = Modifier.height(12.dp))

            OutlinedTextField(
                value = searchQuery,
                onValueChange = onSearchChange,
                placeholder = { Text("ابحث في العملاء بالاسم أو رقم الهاتف...") },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = FlowexaBlue) },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(14.dp),
                singleLine = true
            )

            Spacer(modifier = Modifier.height(12.dp))

            if (customers.isEmpty()) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    Text("لا يوجد عملاء مسجلين بعد", color = Color.Gray)
                }
            } else {
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                    modifier = Modifier.fillMaxSize()
                ) {
                    items(customers, key = { it.id }) { customer ->
                        CustomerCard(
                            customer = customer,
                            onEdit = {
                                editingCustomer = customer
                                showDialog = true
                            },
                            onCall = {
                                customer.phone?.let { phone ->
                                    val intent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:$phone"))
                                    context.startActivity(intent)
                                }
                            }
                        )
                    }
                }
            }
        }
    }

    if (showDialog) {
        CustomerFormDialog(
            customer = editingCustomer,
            companyId = companyId,
            onDismiss = { showDialog = false },
            onSave = { customer, isNew ->
                onSaveCustomer(customer, isNew)
                showDialog = false
            }
        )
    }
}

@Composable
fun CustomerCard(
    customer: CustomerEntity,
    onEdit: () -> Unit,
    onCall: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onEdit() },
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = FlowexaSurface)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = customer.name,
                    fontWeight = FontWeight.Bold,
                    fontSize = 15.sp,
                    color = TextPrimary
                )
                if (!customer.phone.isNullOrEmpty()) {
                    Text(
                        text = customer.phone,
                        fontSize = 13.sp,
                        color = TextSecondary,
                        modifier = Modifier.padding(top = 2.dp)
                    )
                }
                if (!customer.address.isNullOrEmpty()) {
                    Text(
                        text = customer.address,
                        fontSize = 12.sp,
                        color = TextMuted,
                        modifier = Modifier.padding(top = 1.dp)
                    )
                }
            }

            if (!customer.phone.isNullOrEmpty()) {
                IconButton(onClick = onCall) {
                    Icon(Icons.Default.Phone, contentDescription = "اتصال", tint = FlowexaGreen)
                }
            }

            IconButton(onClick = onEdit) {
                Icon(Icons.Default.Edit, contentDescription = "تعديل", tint = FlowexaBlue)
            }
        }
    }
}

@Composable
fun CustomerFormDialog(
    customer: CustomerEntity?,
    companyId: String,
    onDismiss: () -> Unit,
    onSave: (CustomerEntity, isNew: Boolean) -> Unit
) {
    val isNew = customer == null
    var name by remember { mutableStateOf(customer?.name ?: "") }
    var phone by remember { mutableStateOf(customer?.phone ?: "") }
    var address by remember { mutableStateOf(customer?.address ?: "") }
    var notes by remember { mutableStateOf(customer?.notes ?: "") }

    Dialog(onDismissRequest = onDismiss) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .wrapContentHeight(),
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(containerColor = FlowexaSurface)
        ) {
            Column(
                modifier = Modifier
                    .padding(20.dp)
                    .verticalScroll(rememberScrollState())
            ) {
                Text(
                    text = if (isNew) "إضافة عميل جديد" else "تعديل بيانات العميل",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    color = FlowexaBlue
                )

                Spacer(modifier = Modifier.height(14.dp))

                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("اسم العميل أو الصيدلية / المحل *") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )

                Spacer(modifier = Modifier.height(10.dp))

                OutlinedTextField(
                    value = phone,
                    onValueChange = { phone = it },
                    label = { Text("رقم الهاتف") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )

                Spacer(modifier = Modifier.height(10.dp))

                OutlinedTextField(
                    value = address,
                    onValueChange = { address = it },
                    label = { Text("العنوان / المدينة / الحي") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )

                Spacer(modifier = Modifier.height(10.dp))

                OutlinedTextField(
                    value = notes,
                    onValueChange = { notes = it },
                    label = { Text("ملاحظات") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )

                Spacer(modifier = Modifier.height(16.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    OutlinedButton(
                        onClick = onDismiss,
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Text("إلغاء")
                    }

                    Button(
                        onClick = {
                            val custId = customer?.id ?: "cust_${UUID.randomUUID()}"
                            val newCust = CustomerEntity(
                                id = custId,
                                companyId = companyId,
                                name = name.trim(),
                                phone = phone.trim().ifEmpty { null },
                                address = address.trim().ifEmpty { null },
                                notes = notes.trim().ifEmpty { null }
                            )
                            onSave(newCust, isNew)
                        },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = FlowexaBlue),
                        enabled = name.isNotBlank()
                    ) {
                        Text("حفظ")
                    }
                }
            }
        }
    }
}
