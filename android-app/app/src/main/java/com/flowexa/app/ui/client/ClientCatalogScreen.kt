package com.flowexa.app.ui.client

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.flowexa.app.core.formatAmount
import com.flowexa.app.data.local.entity.ProductCategoryEntity
import com.flowexa.app.data.local.entity.ProductEntity
import com.flowexa.app.ui.theme.*

@Composable
fun ClientCatalogScreen(
    products: List<ProductEntity>,
    categories: List<ProductCategoryEntity> = emptyList(),
    favoriteProductIds: List<String> = emptyList(),
    searchQuery: String,
    onSearchChange: (String) -> Unit,
    onProductClick: (String) -> Unit,
    onToggleFavorite: (String) -> Unit,
    onOrderProduct: (ProductEntity) -> Unit
) {
    var selectedCategoryId by remember { mutableStateOf<String?>(null) }
    var onlyOffers by remember { mutableStateOf(false) }

    val activeProducts = remember(products, searchQuery, selectedCategoryId, onlyOffers) {
        products.filter { prod ->
            prod.isActive && !prod.isDeleted &&
            (searchQuery.isBlank() || prod.name.contains(searchQuery, ignoreCase = true) ||
             (prod.scientificName?.contains(searchQuery, ignoreCase = true) == true)) &&
            (selectedCategoryId == null || prod.categoryId == selectedCategoryId) &&
            (!onlyOffers || (!prod.specialOfferJson.isNullOrBlank() && prod.specialOfferJson != "{}"))
        }
    }

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

        Spacer(modifier = Modifier.height(10.dp))

        // Categories & Filter Chips
        LazyRow(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            item {
                FilterChip(
                    selected = selectedCategoryId == null && !onlyOffers,
                    onClick = {
                        selectedCategoryId = null
                        onlyOffers = false
                    },
                    label = { Text("الكل") }
                )
            }
            item {
                FilterChip(
                    selected = onlyOffers,
                    onClick = { onlyOffers = !onlyOffers },
                    leadingIcon = { Icon(Icons.Default.LocalOffer, contentDescription = null, modifier = Modifier.size(16.dp)) },
                    label = { Text("عروض خاصة") }
                )
            }
            items(categories) { cat ->
                FilterChip(
                    selected = selectedCategoryId == cat.id,
                    onClick = {
                        selectedCategoryId = if (selectedCategoryId == cat.id) null else cat.id
                    },
                    label = { Text(cat.name) }
                )
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        if (activeProducts.isEmpty()) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text("لا توجد أصناف مطابقة للبحث", color = Color.Gray)
            }
        } else {
            LazyColumn(
                verticalArrangement = Arrangement.spacedBy(10.dp),
                modifier = Modifier.fillMaxSize()
            ) {
                items(activeProducts, key = { it.id }) { product ->
                    val isFav = favoriteProductIds.contains(product.id)
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { onProductClick(product.id) },
                        shape = RoundedCornerShape(14.dp),
                        colors = CardDefaults.cardColors(containerColor = FlowexaSurface)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(14.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text(product.name, fontWeight = FontWeight.Bold, fontSize = 15.sp, color = TextPrimary)
                                    if (product.isNewProduct) {
                                        Spacer(modifier = Modifier.width(6.dp))
                                        Surface(
                                            color = Color(0xFFEFF6FF),
                                            shape = RoundedCornerShape(6.dp)
                                        ) {
                                            Text("جديد", color = FlowexaBlue, fontSize = 10.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                                        }
                                    }
                                }
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
                                        text = if (product.bonusType == "fixed") "بونص مجاني %${product.bonusFixedPercent ?: 0.0}" else "بونص تصاعدي متوفر",
                                        fontSize = 11.sp,
                                        color = Color(0xFFD97706),
                                        fontWeight = FontWeight.SemiBold
                                    )
                                }
                            }

                            Row(verticalAlignment = Alignment.CenterVertically) {
                                IconButton(onClick = { onToggleFavorite(product.id) }) {
                                    Icon(
                                        if (isFav) Icons.Default.Favorite else Icons.Default.FavoriteBorder,
                                        contentDescription = "المفضلة",
                                        tint = if (isFav) Color.Red else Color.Gray
                                    )
                                }
                                Spacer(modifier = Modifier.width(4.dp))
                                Button(
                                    onClick = { onOrderProduct(product) },
                                    colors = ButtonDefaults.buttonColors(containerColor = FlowexaGreen),
                                    shape = RoundedCornerShape(10.dp),
                                    enabled = product.inStock
                                ) {
                                    Icon(Icons.Default.AddShoppingCart, contentDescription = null, modifier = Modifier.size(16.dp))
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text(if (product.inStock) "طلب" else "نفذ", fontSize = 12.sp)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
