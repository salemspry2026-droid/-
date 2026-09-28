package com.flowexa.app.ui.client

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AddShoppingCart
import androidx.compose.material.icons.filled.Search
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
import com.flowexa.app.data.local.entity.ProductEntity
import com.flowexa.app.ui.theme.*

@Composable
fun ClientCatalogScreen(
    products: List<ProductEntity>,
    searchQuery: String,
    onSearchChange: (String) -> Unit,
    onOrderProduct: (ProductEntity) -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(FlowexaBg)
            .padding(16.dp)
    ) {
        OutlinedTextField(
            value = searchQuery,
            onValueChange = onSearchChange,
            placeholder = { Text("ابحث في الأصناف المتاحة...") },
            leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = FlowexaBlue) },
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(14.dp),
            singleLine = true
        )

        Spacer(modifier = Modifier.height(14.dp))

        if (products.isEmpty()) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text("لا توجد أصناف متوفرة", color = Color.Gray)
            }
        } else {
            LazyColumn(
                verticalArrangement = Arrangement.spacedBy(10.dp),
                modifier = Modifier.fillMaxSize()
            ) {
                items(products, key = { it.id }) { product ->
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(14.dp),
                        colors = CardDefaults.cardColors(containerColor = FlowexaSurface)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(14.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(product.name, fontWeight = FontWeight.Bold, fontSize = 15.sp, color = TextPrimary)
                                if (!product.scientificName.isNullOrEmpty()) {
                                    Text(product.scientificName, fontSize = 12.sp, color = FlowexaBlue)
                                }
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    product.price.formatAmount(product.currency),
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 14.sp,
                                    color = FlowexaGreenDark
                                )
                                if (product.bonusType != "none") {
                                    Text(
                                        text = if (product.bonusType == "fixed") "بونص مجاني %${product.bonusFixedPercent ?: 0.0}" else "بونص تصاعدي",
                                        fontSize = 11.sp,
                                        color = Color(0xFFD97706),
                                        fontWeight = FontWeight.SemiBold
                                    )
                                }
                            }

                            Button(
                                onClick = { onOrderProduct(product) },
                                colors = ButtonDefaults.buttonColors(containerColor = FlowexaGreen),
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                Icon(Icons.Default.AddShoppingCart, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("طلب", fontSize = 12.sp)
                            }
                        }
                    }
                }
            }
        }
    }
}
