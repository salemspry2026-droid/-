package com.flowexa.app.ui.catalog

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowForward
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.flowexa.app.core.formatAmount
import com.flowexa.app.data.local.entity.CompanyEntity
import com.flowexa.app.data.local.entity.ProductEntity
import com.flowexa.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PublicCatalogScreen(
    company: CompanyEntity?,
    products: List<ProductEntity>,
    onBackClick: () -> Unit
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = company?.name ?: "كتالوج الأصناف",
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(Icons.Default.ArrowForward, contentDescription = "رجوع", tint = Color.White)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = FlowexaBlue)
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(FlowexaBg)
                .padding(padding)
                .padding(16.dp)
        ) {
            if (company != null) {
                Card(
                    modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = FlowexaSurface)
                ) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Text(company.name, fontWeight = FontWeight.Bold, fontSize = 16.sp, color = FlowexaBlue)
                        company.aboutUs?.let { Text(it, fontSize = 12.sp, color = TextSecondary, modifier = Modifier.padding(top = 2.dp)) }
                        company.phone?.let { Text("للتواصل: $it", fontSize = 12.sp, color = TextMuted, modifier = Modifier.padding(top = 2.dp)) }
                    }
                }
            }

            if (products.isEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("لا توجد أصناف معروضة حالياً", color = Color.Gray)
                }
            } else {
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                    modifier = Modifier.fillMaxSize()
                ) {
                    items(products) { prod ->
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(containerColor = FlowexaSurface)
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth().padding(14.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column {
                                    Text(prod.name, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                    prod.scientificName?.let { Text(it, fontSize = 12.sp, color = FlowexaBlue) }
                                    Text(
                                        prod.price.formatAmount(prod.currency),
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 13.sp,
                                        color = FlowexaGreenDark
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
