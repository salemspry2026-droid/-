package com.flowexa.app.ui.products

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
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
import com.flowexa.app.data.local.entity.ProductEntity
import com.flowexa.app.ui.theme.FlowexaBlue
import org.json.JSONArray
import org.json.JSONObject

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProductDetailScreen(
    product: ProductEntity?,
    categoryName: String? = null,
    brandName: String? = null,
    isFavorite: Boolean = false,
    onBackClick: () -> Unit,
    onToggleFavorite: (() -> Unit)? = null,
    onOrderClick: (productId: String) -> Unit
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(product?.name ?: "تفاصيل المنتج", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "رجوع")
                    }
                },
                actions = {
                    if (onToggleFavorite != null) {
                        IconButton(onClick = onToggleFavorite) {
                            Icon(
                                if (isFavorite) Icons.Default.Favorite else Icons.Default.FavoriteBorder,
                                contentDescription = "المفضلة",
                                tint = if (isFavorite) Color.Red else Color.White
                            )
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = FlowexaBlue,
                    titleContentColor = Color.White,
                    navigationIconContentColor = Color.White,
                    actionIconContentColor = Color.White
                )
            )
        }
    ) { padding ->
        if (product == null) {
            Box(modifier = Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = FlowexaBlue)
            }
            return@Scaffold
        }

        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Main Product Header
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    elevation = CardDefaults.cardElevation(2.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                            Text(product.name, fontWeight = FontWeight.Bold, fontSize = 20.sp, color = Color(0xFF1E293B))
                            // In Stock Badge
                            val stockColor = if (product.inStock) Color(0xFF16A34A) else Color.Red
                            val stockText = if (product.inStock) "متوفر" else "غير متوفر"
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(stockColor.copy(alpha = 0.1f))
                                    .padding(horizontal = 10.dp, vertical = 4.dp)
                            ) {
                                Text(stockText, color = stockColor, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                            }
                        }

                        if (!product.scientificName.isNullOrBlank()) {
                            Text(product.scientificName, fontSize = 14.sp, color = Color(0xFF64748B))
                        }

                        Spacer(modifier = Modifier.height(12.dp))
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                "%.2f %s".format(product.price, product.currency),
                                fontWeight = FontWeight.ExtraBold,
                                fontSize = 24.sp,
                                color = FlowexaBlue
                            )
                            if (!product.unit.isNullOrBlank()) {
                                Text(" / ${product.unit}", fontSize = 14.sp, color = Color.Gray, modifier = Modifier.padding(start = 4.dp))
                            }
                        }

                        if (!categoryName.isNullOrBlank() || !brandName.isNullOrBlank()) {
                            Spacer(modifier = Modifier.height(8.dp))
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                if (!categoryName.isNullOrBlank()) {
                                    AssistChip(onClick = {}, label = { Text("التصنيف: $categoryName") })
                                }
                                if (!brandName.isNullOrBlank()) {
                                    AssistChip(onClick = {}, label = { Text("الماركة: $brandName") })
                                }
                            }
                        }
                    }
                }
            }

            // Special Offer Card
            if (!product.specialOfferJson.isNullOrBlank() && product.specialOfferJson != "{}") {
                item {
                    val offerObj = try { JSONObject(product.specialOfferJson) } catch (_: Exception) { null }
                    if (offerObj != null && offerObj.optBoolean("isActive", true)) {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(containerColor = Color(0xFFFEF3C7)),
                            elevation = CardDefaults.cardElevation(2.dp)
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Default.LocalOffer, contentDescription = null, tint = Color(0xFFD97706))
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text("عرض خاص متوفر!", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color(0xFF92400E))
                                }
                                if (offerObj.has("offerPrice")) {
                                    Text("سعر العرض: %.2f %s".format(offerObj.optDouble("offerPrice"), product.currency), fontWeight = FontWeight.Bold, color = Color(0xFFB45309))
                                }
                                if (offerObj.has("offerBonus")) {
                                    Text("بونص العرض: +${offerObj.optDouble("offerBonus").toInt()}", fontWeight = FontWeight.Bold, color = Color(0xFF16A34A))
                                }
                                if (offerObj.has("endDate")) {
                                    Text("ينتهي في: ${offerObj.optString("endDate")}", fontSize = 12.sp, color = Color(0xFF78350F))
                                }
                            }
                        }
                    }
                }
            }

            // Bonus Rules Section
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    elevation = CardDefaults.cardElevation(2.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text("سياسة البونص والمكافأة", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = FlowexaBlue)
                        Spacer(modifier = Modifier.height(8.dp))

                        when (product.bonusType) {
                            "fixed" -> {
                                Text("بونص ثابت: ${(product.bonusFixedPercent ?: 0.0).toInt()}% مجاناً مع كل طلب.", fontSize = 14.sp)
                            }
                            "tiered" -> {
                                Text("بونص متدرج حسب الكمية المطلوبة:", fontSize = 14.sp)
                                Spacer(modifier = Modifier.height(6.dp))
                                val tiers = try { JSONArray(product.bonusTiersJson) } catch (_: Exception) { JSONArray() }
                                for (i in 0 until tiers.length()) {
                                    val t = tiers.getJSONObject(i)
                                    val minQ = t.optDouble("minQty", t.optDouble("quantity", 0.0)).toInt()
                                    val maxQ = if (t.has("maxQty") && !t.isNull("maxQty")) "${t.optDouble("maxQty").toInt()}" else "فأكثر"
                                    val pct = t.optDouble("percent", 0.0)
                                    val bQty = t.optDouble("bonus", t.optDouble("bonusQty", 0.0)).toInt()
                                    val bonusDesc = if (pct > 0.0) "$pct%" else "+$bQty قطعة"
                                    Text("• من $minQ إلى $maxQ قطعة ← بونص: $bonusDesc", fontSize = 13.sp, color = Color(0xFF334155))
                                }
                            }
                            else -> {
                                Text("لا يوجد بونص محدد لهذا الصنف.", fontSize = 14.sp, color = Color.Gray)
                            }
                        }
                    }
                }
            }

            // Description & Notes
            if (!product.description.isNullOrBlank() || !product.notes.isNullOrBlank()) {
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = Color.White),
                        elevation = CardDefaults.cardElevation(2.dp)
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            if (!product.description.isNullOrBlank()) {
                                Text("الوصف", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = FlowexaBlue)
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(product.description, fontSize = 14.sp, color = Color(0xFF334155))
                            }
                            if (!product.notes.isNullOrBlank()) {
                                Spacer(modifier = Modifier.height(12.dp))
                                Text("ملاحظات إضافية", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = FlowexaBlue)
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(product.notes, fontSize = 14.sp, color = Color(0xFF334155))
                            }
                        }
                    }
                }
            }

            // Bottom Order Action
            item {
                Spacer(modifier = Modifier.height(8.dp))
                Button(
                    onClick = { onOrderClick(product.id) },
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(containerColor = FlowexaBlue),
                    shape = RoundedCornerShape(12.dp),
                    enabled = product.inStock
                ) {
                    Icon(Icons.Default.AddShoppingCart, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(if (product.inStock) "طلب هذا الصنف الآن" else "الصنف غير متوفر حالياً", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                }
            }
        }
    }
}
