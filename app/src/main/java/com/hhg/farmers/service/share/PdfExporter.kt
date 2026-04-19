package com.hhg.farmers.service.share

import android.content.Context
import android.content.Intent
import android.graphics.Paint
import android.graphics.Typeface
import android.graphics.pdf.PdfDocument
import androidx.core.content.FileProvider
import com.hhg.farmers.R
import com.hhg.farmers.data.model.FarmerDataPage
import dagger.hilt.android.qualifiers.ApplicationContext
import java.io.File
import java.io.FileOutputStream
import java.text.NumberFormat
import java.util.Locale
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Generates a simple, printable PDF of a farmer's patti and launches the system share sheet.
 *
 * Uses Android's native [PdfDocument] — no extra library. Rendering is intentionally basic
 * (monochrome, text-only) to keep APK size down and generation fast on 2018-era phones.
 */
@Singleton
class PdfExporter @Inject constructor(@ApplicationContext private val context: Context) {

    fun shareFarmerPatti(page: FarmerDataPage) {
        val file = renderPdf(page)
        val uri = FileProvider.getUriForFile(
            context,
            "${context.packageName}.fileprovider",
            file
        )
        val intent = Intent(Intent.ACTION_SEND).apply {
            type = "application/pdf"
            putExtra(Intent.EXTRA_STREAM, uri)
            putExtra(Intent.EXTRA_SUBJECT, context.getString(R.string.share_patti_subject))
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        context.startActivity(Intent.createChooser(intent, null).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        })
    }

    private fun renderPdf(page: FarmerDataPage): File {
        val doc = PdfDocument()
        val pageInfo = PdfDocument.PageInfo.Builder(595, 842, 1).create() // A4 @ 72 dpi
        val pdfPage = doc.startPage(pageInfo)
        val canvas = pdfPage.canvas

        val title = Paint().apply {
            textSize = 18f; isAntiAlias = true; typeface = Typeface.DEFAULT_BOLD
        }
        val body = Paint().apply { textSize = 11f; isAntiAlias = true }
        val fmt = NumberFormat.getNumberInstance(Locale("mr", "IN"))

        var y = 40f
        canvas.drawText("हनुमान हुंडेकरी — पट्टी", 40f, y, title); y += 24f
        canvas.drawText("शेतकरी: ${page.farmer.farmername}", 40f, y, body); y += 16f
        canvas.drawText("आधार: ${page.farmer.uid}", 40f, y, body); y += 16f
        canvas.drawText("मोबाईल: ${page.farmer.mobilenumber ?: "-"}", 40f, y, body); y += 24f

        canvas.drawText("दिनांक      माल         व्हेंडर          वजन     दर     देय", 40f, y, body); y += 14f
        canvas.drawLine(40f, y, 555f, y, body); y += 14f

        page.entries.take(30).forEach { e ->
            val line = "%-10s  %-10s  %-12s  %6s  %5s  %7s".format(
                e.date, e.item.take(10), e.vendorname.take(12),
                fmt.format(e.weight), fmt.format(e.rate), fmt.format(e.payable ?: 0.0)
            )
            canvas.drawText(line, 40f, y, body); y += 14f
            if (y > 800f) return@forEach
        }

        doc.finishPage(pdfPage)

        val dir = File(context.cacheDir, "shared_pdfs").apply { mkdirs() }
        val file = File(dir, "patti_${page.farmer.uid}.pdf")
        FileOutputStream(file).use { doc.writeTo(it) }
        doc.close()
        return file
    }
}
