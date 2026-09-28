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
    primaryCurrency: String
) {
    var showDialog by remember { mutableStateOf(false) }
    var editingProduct by remember { mutableStateOf<ProductEntity?>(null) }

    Scaffold(
        floatingActionButton = {
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
    onEdit: () -> Unit,
    onDelete: () -> Unit
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

            IconButton(onClick = onEdit) {
                Icon(Icons.Default.Edit, contentDescription = "تعديل", tint = FlowexaBlue)
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
    var bonusPercentText by remember { mutableStateOf(product?.bonusFixedPercent?.toString() ?: "0.0") }
    var description by remember { mutableStateOf(product?.description ?: "") }

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
                    text = if (isNew) "إضافة صنف جديد" else "تعديل الصنف",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    color = FlowexaBlue
                )

                Spacer(modifier = Modifier.height(14.dp))

                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("اسم الصنف التجاري *") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )

                Spacer(modifier = Modifier.height(10.dp))

                OutlinedTextField(
                    value = scientificName,
                    onValueChange = { scientificName = it },
                    label = { Text("الاسم العلمي (اختياري)") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )

                Spacer(modifier = Modifier.height(10.dp))

                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = priceText,
                        onValueChange = { priceText = it },
                        label = { Text("السعر *") },
                        modifier = Modifier.weight(1.5f),
                        shape = RoundedCornerShape(12.dp)
                    )
                    OutlinedTextField(
                        value = currency,
                        onValueChange = { currency = it },
                        label = { Text("العملة") },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(12.dp)
                    )
                }

                Spacer(modifier = Modifier.height(10.dp))

                OutlinedTextField(
                    value = unit,
                    onValueChange = { unit = it },
                    label = { Text("الوحدة (كرتون، باكت، علبة..)") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )

                Spacer(modifier = Modifier.height(10.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("متوفر في المخزون", fontSize = 14.sp)
                    Switch(checked = inStock, onCheckedChange = { inStock = it })
                }

                Spacer(modifier = Modifier.height(10.dp))

                // Bonus system selector
                Text("نظام البونص المجاني", fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = FlowexaBlue)
                Row(
                    modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    FilterChip(
                        selected = bonusType == "none",
                        onClick = { bonusType = "none" },
                        label = { Text("بدون", fontSize = 11.sp) }
                    )
                    FilterChip(
                        selected = bonusType == "fixed",
                        onClick = { bonusType = "fixed" },
                        label = { Text("نسبة مئوية", fontSize = 11.sp) }
                    )
                    FilterChip(
                        selected = bonusType == "tiered",
                        onClick = { bonusType = "tiered" },
                        label = { Text("شرائح كميات", fontSize = 11.sp) }
                    )
                }

                if (bonusType == "fixed") {
                    Spacer(modifier = Modifier.height(8.dp))
                    OutlinedTextField(
                        value = bonusPercentText,
                        onValueChange = { bonusPercentText = it },
                        label = { Text("نسبة البونص المئوية %") },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp)
                    )
                }

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
                            val priceVal = priceText.toDoubleOrNull() ?: 0.0
                            val bonusVal = bonusPercentText.toDoubleOrNull()
                            val prodId = product?.id ?: "prod_${UUID.randomUUID()}"
                            val newProd = ProductEntity(
                                id = prodId,
                                companyId = companyId,
                                name = name.trim(),
                                scientificName = scientificName.trim().ifEmpty { null },
                                price = priceVal,
                                currency = currency.trim(),
                                unit = unit.trim(),
                                inStock = inStock,
                                bonusType = bonusType,
                                bonusFixedPercent = bonusVal,
                                description = description.trim().ifEmpty { null }
                            )
                            onSave(newProd, isNew)
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
