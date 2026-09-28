package com.flowexa.app.core

import java.text.NumberFormat
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

fun Double.formatAmount(currency: String = ""): String {
    val formatter = NumberFormat.getNumberInstance(Locale.US).apply {
        maximumFractionDigits = 2
        minimumFractionDigits = 0
    }
    val formatted = formatter.format(this)
    return if (currency.isNotEmpty()) "$formatted $currency" else formatted
}

fun Long.formatDateTime(): String {
    if (this <= 0) return ""
    val sdf = SimpleDateFormat("yyyy/MM/dd HH:mm", Locale("ar"))
    return sdf.format(Date(this))
}

fun Long.formatDate(): String {
    if (this <= 0) return ""
    val sdf = SimpleDateFormat("yyyy/MM/dd", Locale("ar"))
    return sdf.format(Date(this))
}
