package com.flowexa.app.ui.client

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.ShoppingBag
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.flowexa.app.data.local.entity.ProductEntity
import com.flowexa.app.ui.theme.FlowexaBg
import com.flowexa.app.ui.theme.FlowexaBlue
import com.flowexa.app.ui.theme.FlowexaGreen
import com.flowexa.app.ui.theme.FlowexaSurface

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FavoritesScreen(
    favoriteProducts: List<ProductEntity>,
    onBackClick: () -> Unit,
    onOrderProduct: (ProductEntity) -> Unit,
    onToggleFavorite: (String) -> Unit
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = "الأصناف المفضلة",
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
        if (favoriteProducts.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(
                        Icons.Default.FavoriteBorder,
                        contentDescription = null,
                        modifier = Modifier.size(64.dp),
                        tint = Color.LightGray
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    Text(
                        text = "لم تقم بإضافة أي أصناف للمفضلة بعد",
                        fontSize = 14.sp,
                        color = Color.Gray,
                        fontWeight = FontWeight.Medium
                    )
                }
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(favoriteProducts, key = { it.id }) { product ->
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = FlowexaSurface),
                        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
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
                                    color = FlowexaBlue
                                )
                                if (!product.scientificName.isNullOrEmpty()) {
                                    Text(
                                        text = product.scientificName,
                                        fontSize = 12.sp,
                                        color = Color.Gray
                                    )
                                }
                                Spacer(modifier = Modifier.height(6.dp))
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text(
                                        text = "${product.price} ${product.currency}",
                                        fontWeight = FontWeight.Bold,
                                        color = FlowexaGreen,
                                        fontSize = 14.sp
                                    )
                                    if (product.unit != null) {
                                        Text(
                                            text = " / ${product.unit}",
                                            fontSize = 12.sp,
                                            color = Color.Gray
                                        )
                                    }
                                }
                            }

                            Row(verticalAlignment = Alignment.CenterVertically) {
                                IconButton(onClick = { onToggleFavorite(product.id) }) {
                                    Icon(
                                        Icons.Default.Favorite,
                                        contentDescription = "إزالة من المفضلة",
                                        tint = Color(0xFFEF4444)
                                    )
                                }
                                Spacer(modifier = Modifier.width(4.dp))
                                Button(
                                    onClick = { onOrderProduct(product) },
                                    colors = ButtonDefaults.buttonColors(containerColor = FlowexaGreen),
                                    shape = MaterialTheme.shapes.small
                                ) {
                                    Icon(
                                        Icons.Default.ShoppingBag,
                                        contentDescription = null,
                                        modifier = Modifier.size(16.dp)
                                    )
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
}
