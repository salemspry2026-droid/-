package com.flowexa.app.ui.products

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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.flowexa.app.core.formatAmount
import com.flowexa.app.data.local.entity.ProductEntity
import com.flowexa.app.data.local.entity.UserProfileEntity
import com.flowexa.app.domain.PermissionManager
import com.flowexa.app.ui.theme.*
import java.util.UUID

@Composable
fun ProductsScreen(
    products: List<ProductEntity>,
    searchQuery: String,
    onSearchChange: (String) -> Unit,
    onSaveProduct: (ProductEntity, isNew: Boolean) -> Unit,
    onDeleteProduct: (String) -> Unit,
    companyId: String,
    primaryCurrency: String,
    userProfile: UserProfileEntity? = null
) {
    var showDialog by remember { mutableStateOf(false) }
    var editingProduct by remember { mutableStateOf<ProductEntity?>(null) }

    val canCreate = PermissionManager.hasPermission(userProfile, PermissionManager.Module.PRODUCTS, PermissionManager.Action.CREATE)
    val canEdit = PermissionManager.hasPermission(userProfile, PermissionManager.Module.PRODUCTS, PermissionManager.Action.EDIT)
    val canDelete = PermissionManager.hasPermission(userProfile, PermissionManager.Module.PRODUCTS, PermissionManager.Action.DELETE)

    Scaffold(
        floatingActionButton = {
            if (canCreate) {
                FloatingActionButton(
                    onClick = {
                        editingProduct = null
                        showDialog = true
                    },
                    containerColor = FlowexaBlue,
                    contentColor = Color.White
                ) {
                    Icon(Icons.Default.Add, contentDescription = "إضافة صنف")
                }
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

            // Search Bar
            OutlinedTextField(
                value = searchQuery,
                onValueChange = onSearchChange,
                placeholder = { Text("ابحث في الأصناف بالاسم أو الاسم العلمي...") },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = FlowexaBlue) },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(14.dp),
                singleLine = true
            )

            Spacer(modifier = Modifier.height(12.dp))

            if (products.isEmpty()) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    Text("لا توجد أصناف مطابقة", color = Color.Gray)
                }
            } else {
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                    modifier = Modifier.fillMaxSize()
                ) {
                    items(products, key = { it.id }) { product ->
                        ProductCard(
                            product = product,
                            canEdit = canEdit,
                            canDelete = canDelete,
                            onEdit = {
                                editingProduct = product
                                showDialog = true
                            },
                            onDelete = { onDeleteProduct(product.id) }
                        )
                    }
                }
            }
        }
    }

    if (showDialog) {
        ProductFormDialog(
            product = editingProduct,
            companyId = companyId,
            primaryCurrency = primaryCurrency,
            onDismiss = { showDialog = false },
            onSave = { product, isNew ->
                onSaveProduct(product, isNew)
                showDialog = false
            }
        )
    }
}

@Composable
fun ProductCard(
    product: ProductEntity,
    canEdit: Boolean,
    canDelete: Boolean,
    onEdit: () -> Unit,
    onDelete: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(enabled = canEdit) { onEdit() },
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
                    text = product.name,
                    fontWeight = FontWeight.Bold,
                    fontSize = 15.sp,
                    color = TextPrimary
                )
                if (!product.scientificName.isNullOrEmpty()) {
                    Text(
                        text = product.scientificName,
                        fontSize = 12.sp,
                        color = FlowexaBlue,
                        fontWeight = FontWeight.Medium
                    )
                }
                Spacer(modifier = Modifier.height(4.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = product.price.formatAmount(product.currency),
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp,
                        color = FlowexaGreenDark
                    )
                    if (product.bonusType != "none") {
                        Spacer(modifier = Modifier.width(8.dp))
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(6.dp))
                                .background(FlowexaGreenLight)
                                .padding(horizontal = 6.dp, vertical = 2.dp)
                        ) {
                            Text(
                                text = if (product.bonusType == "fixed") "بونص ثابت %${product.bonusFixedPercent ?: 0.0}" else "بونص تصاعدي",
                                fontSize = 10.sp,
                                color = FlowexaGreenDark,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            }

            if (canEdit) {
                IconButton(onClick = onEdit) {
                    Icon(Icons.Default.Edit, contentDescription = "تعديل", tint = FlowexaBlue)
                }
            }
        }
    }
}

@Composable
fun ProductFormDialog(
    product: ProductEntity?,
    companyId: String,
    primaryCurrency: String,
    onDismiss: () -> Unit,
    onSave: (ProductEntity, isNew: Boolean) -> Unit
) {
    val isNew = product == null
    var name by remember { mutableStateOf(product?.name ?: "") }
    var scientificName by remember { mutableStateOf(product?.scientificName ?: "") }
    var priceText by remember { mutableStateOf(product?.price?.toString() ?: "0.0") }
    var currency by remember { mutableStateOf(product?.currency ?: primaryCurrency) }
    var unit by remember { mutableStateOf(product?.unit ?: "قطعة") }
    var inStock by remember { mutableStateOf(product?.inStock ?: true) }
    var bonusType by remember { mutableStateOf(product?.bonusType ?: "none") }
    var bonusFixedPercentText by remember { mutableStateOf(product?.bonusFixedPercent?.toString() ?: "0.0") }
    var bonusTiersJson by remember { mutableStateOf(product?.bonusTiersJson ?: "") }

    Dialog(onDismissRequest = onDismiss) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .fillMaxHeight(0.85f),
            shape = RoundedCornerShape(18.dp),
            colors = CardDefaults.cardColors(containerColor = FlowexaSurface)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Text(
                    text = if (isNew) "إضافة صنف جديد" else "تعديل الصنف",
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    color = FlowexaBlue
                )

                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("الاسم التجاري *") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )

                OutlinedTextField(
                    value = scientificName,
                    onValueChange = { scientificName = it },
                    label = { Text("الاسم العلمي") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )

                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = priceText,
                        onValueChange = { priceText = it },
                        label = { Text("السعر *") },
                        modifier = Modifier.weight(1f),
                        singleLine = true
                    )
                    OutlinedTextField(
                        value = currency,
                        onValueChange = { currency = it },
                        label = { Text("العملة") },
                        modifier = Modifier.weight(0.6f),
                        singleLine = true
                    )
                }

                OutlinedTextField(
                    value = unit,
                    onValueChange = { unit = it },
                    label = { Text("الوحدة") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )

                Row(verticalAlignment = Alignment.CenterVertically) {
                    Checkbox(checked = inStock, onCheckedChange = { inStock = it })
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("متوفر في المخزون", fontSize = 14.sp)
                }

                Text("نوع البونص:", fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                Row(verticalAlignment = Alignment.CenterVertically) {
                    RadioButton(selected = bonusType == "none", onClick = { bonusType = "none" })
                    Text("بدون بونص")
                    Spacer(modifier = Modifier.width(12.dp))
                    RadioButton(selected = bonusType == "fixed", onClick = { bonusType = "fixed" })
                    Text("ثابت")
                    Spacer(modifier = Modifier.width(12.dp))
                    RadioButton(selected = bonusType == "tiered", onClick = { bonusType = "tiered" })
                    Text("تصاعدي")
                }

                if (bonusType == "fixed") {
                    OutlinedTextField(
                        value = bonusFixedPercentText,
                        onValueChange = { bonusFixedPercentText = it },
                        label = { Text("نسبة البونص الثابت %") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )
                }

                if (bonusType == "tiered") {
                    OutlinedTextField(
                        value = bonusTiersJson,
                        onValueChange = { bonusTiersJson = it },
                        label = { Text("شرائح البونص (JSON)") },
                        modifier = Modifier.fillMaxWidth(),
                        minLines = 3
                    )
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    TextButton(
                        onClick = onDismiss,
                        modifier = Modifier.weight(1f)
                    ) {
                        Text("إلغاء")
                    }
                    Button(
                        onClick = {
                            if (name.isBlank()) return@Button
                            val price = priceText.toDoubleOrNull() ?: 0.0
                            val bonusFixedPercent = if (bonusType == "fixed") bonusFixedPercentText.toDoubleOrNull() else null
                            val newProduct = ProductEntity(
                                id = product?.id ?: "prod_${UUID.randomUUID()}",
                                companyId = companyId,
                                name = name.trim(),
                                scientificName = scientificName.trim().ifEmpty { null },
                                price = price,
                                currency = currency.trim(),
                                unit = unit.trim(),
                                inStock = inStock,
                                bonusType = bonusType,
                                bonusFixedPercent = bonusFixedPercent,
                                bonusTiersJson = if (bonusType == "tiered") bonusTiersJson.trim() else "",
                                createdAtMs = product?.createdAtMs ?: System.currentTimeMillis(),
                                isDeleted = false
                            )
                            onSave(newProduct, isNew)
                        },
                        modifier = Modifier.weight(1f),
                        colors = ButtonDefaults.buttonColors(containerColor = FlowexaBlue)
                    ) {
                        Text(if (isNew) "إضافة" else "حفظ")
                    }
                }
            }
        }
    }
}
