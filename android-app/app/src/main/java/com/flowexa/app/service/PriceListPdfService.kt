package com.flowexa.app.service

import android.content.Context
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Typeface
import android.graphics.pdf.PdfDocument
import com.flowexa.app.data.local.entity.CompanyEntity
import com.flowexa.app.data.local.entity.ProductEntity
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileOutputStream
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class PriceListPdfService(private val context: Context) {

    /**
     * Generates a printable PDF price list using native Android PdfDocument API completely offline.
     */
    suspend fun generatePriceListPdf(
        company: CompanyEntity?,
        products: List<ProductEntity>
    ): Result<File> = withContext(Dispatchers.IO) {
        try {
            val document = PdfDocument()
            val pageWidth = 595 // A4 standard point width
            val pageHeight = 842 // A4 standard point height
            var pageNumber = 1

            val paint = Paint().apply { isAntiAlias = true }
            val headerPaint = Paint().apply {
                isAntiAlias = true
                typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
            }

            var pageInfo = PdfDocument.PageInfo.Builder(pageWidth, pageHeight, pageNumber).create()
            var page = document.startPage(pageInfo)
            var canvas = page.canvas

            var y = 50f

            // Company Title Header
            headerPaint.color = Color.parseColor("#163C85")
            headerPaint.textSize = 20f
            headerPaint.textAlign = Paint.Align.CENTER
            canvas.drawText(company?.name ?: "قائمة الأسعار الرسمية - Flowexa", pageWidth / 2f, y, headerPaint)

            y += 24f
            paint.color = Color.DKGRAY
            paint.textSize = 10f
            paint.textAlign = Paint.Align.CENTER
            val phone = company?.phone ?: ""
            val address = company?.address ?: ""
            canvas.drawText("الهاتف: $phone   |   العنوان: $address", pageWidth / 2f, y, paint)

            y += 18f
            val dateStr = SimpleDateFormat("dd/MM/yyyy", Locale.getDefault()).format(Date())
            canvas.drawText("تاريخ الإصدار: $dateStr", pageWidth / 2f, y, paint)

            y += 30f
            // Table Header Bar
            paint.color = Color.parseColor("#163C85")
            canvas.drawRect(40f, y, pageWidth - 40f, y + 24f, paint)

            headerPaint.color = Color.WHITE
            headerPaint.textSize = 11f
            headerPaint.textAlign = Paint.Align.RIGHT

            // RTL column coordinates
            canvas.drawText("اسم الصنف", pageWidth - 50f, y + 16f, headerPaint)
            canvas.drawText("الوحدة", pageWidth - 240f, y + 16f, headerPaint)
            canvas.drawText("السعر", pageWidth - 320f, y + 16f, headerPaint)
            canvas.drawText("البونص", pageWidth - 400f, y + 16f, headerPaint)
            canvas.drawText("الحالة", pageWidth - 480f, y + 16f, headerPaint)

            y += 32f

            paint.color = Color.BLACK
            paint.textSize = 10f

            val rowHeight = 22f
            for (p in products) {
                if (y > pageHeight - 60f) {
                    document.finishPage(page)
                    pageNumber++
                    pageInfo = PdfDocument.PageInfo.Builder(pageWidth, pageHeight, pageNumber).create()
                    page = document.startPage(pageInfo)
                    canvas = page.canvas
                    y = 50f
                }

                // Alternating row background
                if (products.indexOf(p) % 2 == 1) {
                    val bgPaint = Paint().apply { color = Color.parseColor("#F8FAFC") }
                    canvas.drawRect(40f, y - 14f, pageWidth - 40f, y + 6f, bgPaint)
                }

                paint.textAlign = Paint.Align.RIGHT
                paint.color = Color.BLACK
                val name = if (p.name.length > 25) p.name.take(25) + "..." else p.name
                canvas.drawText(name, pageWidth - 50f, y, paint)

                paint.color = Color.DKGRAY
                canvas.drawText(p.unit ?: "قطعة", pageWidth - 240f, y, paint)

                paint.color = Color.parseColor("#15803D")
                canvas.drawText("${p.price} ${p.currency}", pageWidth - 320f, y, paint)

                val bonusText = when (p.bonusType) {
                    "fixed" -> "${p.bonusFixedPercent?.toInt() ?: 0}%"
                    "tiered" -> "متدرج"
                    else -> "-"
                }
                paint.color = Color.DKGRAY
                canvas.drawText(bonusText, pageWidth - 400f, y, paint)

                val stockText = if (p.inStock) "متوفر" else "غير متوفر"
                paint.color = if (p.inStock) Color.parseColor("#15803D") else Color.parseColor("#DC2626")
                canvas.drawText(stockText, pageWidth - 480f, y, paint)

                y += rowHeight
            }

            document.finishPage(page)

            // Save PDF to cache dir
            val outFile = File(context.cacheDir, "Flowexa_PriceList_${System.currentTimeMillis()}.pdf")
            val outputStream = FileOutputStream(outFile)
            document.writeTo(outputStream)
            outputStream.flush()
            outputStream.close()
            document.close()

            Result.success(outFile)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
