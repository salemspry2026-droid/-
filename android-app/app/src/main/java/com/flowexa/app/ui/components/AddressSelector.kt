package com.flowexa.app.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.flowexa.app.data.local.entity.LocationEntity

/** Web parity: components/AddressSelector.tsx (بلد > محافظة > مدينة/منطقة > حي) -> "A - B - C - D". */
@Composable
fun AddressSelector(locations: List<LocationEntity>, value: String, onChange: (String) -> Unit) {
    var country by remember { mutableStateOf("") }
    var gov by remember { mutableStateOf("") }
    var region by remember { mutableStateOf("") }
    var hood by remember { mutableStateOf("") }

    // Restore selection from an existing "A - B - C" value (deepest name wins), like the web.
    LaunchedEffect(value, locations) {
        if (value.contains(" - ") && country.isEmpty()) {
            val last = value.split(" - ").last()
            val m = locations.firstOrNull { it.name == last || it.id == last } ?: return@LaunchedEffect
            fun byId(id: String?) = locations.firstOrNull { it.id == id }
            when (m.type) {
                "neighborhood" -> { hood = m.id; val r = byId(m.parentId); r?.let { region = it.id; val g = byId(it.parentId); g?.let { x -> gov = x.id; byId(x.parentId)?.let { c -> country = c.id } } } }
                "region" -> { region = m.id; val g = byId(m.parentId); g?.let { gov = it.id; byId(it.parentId)?.let { c -> country = c.id } } }
                "governorate" -> { gov = m.id; byId(m.parentId)?.let { country = it.id } }
                "country" -> country = m.id
            }
        }
    }

    fun emit(c: String, g: String, r: String, h: String) {
        onChange(listOf(c, g, r, h).mapNotNull { id -> locations.firstOrNull { it.id == id }?.name }.joinToString(" - "))
    }

    val countries = locations.filter { it.type == "country" }
    val govs = locations.filter { it.type == "governorate" && it.parentId == country }
    val regions = locations.filter { it.type == "region" && it.parentId == gov }
    val hoods = locations.filter { it.type == "neighborhood" && it.parentId == region }

    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Level("البلد", countries, country) { country = it; gov = ""; region = ""; hood = ""; emit(it, "", "", "") }
        Level("المحافظة", govs, gov, enabled = country.isNotEmpty()) { gov = it; region = ""; hood = ""; emit(country, it, "", "") }
        Level("المدينة / المنطقة", regions, region, enabled = gov.isNotEmpty()) { region = it; hood = ""; emit(country, gov, it, "") }
        Level("الحي", hoods, hood, enabled = region.isNotEmpty()) { hood = it; emit(country, gov, region, it) }
    }
}

@Composable
private fun Level(label: String, options: List<LocationEntity>, selected: String, enabled: Boolean = true, onSelect: (String) -> Unit) {
    var open by remember { mutableStateOf(false) }
    Column {
        Text(label, fontSize = 12.sp, color = androidx.compose.ui.graphics.Color.Gray)
        Box {
            OutlinedButton(onClick = { open = true }, enabled = enabled && options.isNotEmpty(), modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp)) {
                Text(options.firstOrNull { it.id == selected }?.name ?: "بدون", modifier = Modifier.weight(1f), maxLines = 1)
            }
            DropdownMenu(expanded = open, onDismissRequest = { open = false }) {
                DropdownMenuItem(text = { Text("بدون") }, onClick = { onSelect(""); open = false })
                options.forEach { l -> DropdownMenuItem(text = { Text(l.name) }, onClick = { onSelect(l.id); open = false }) }
            }
        }
    }
}
