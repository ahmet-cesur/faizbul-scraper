package com.acesur.faizbul.util

import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.net.Uri
import android.view.View
import androidx.core.content.FileProvider
import java.io.File
import java.io.FileOutputStream
import java.io.IOException

object ShareUtils {

    fun captureContentAndShare(context: Context, view: View) {
        // Post to view hook to ensure layout passes if necessary, but usually direct call works if drawn
        // Using view.post { ... } can be safer
        view.post {
            try {
                // 1. Capture Bitmap
                val originalBitmap = captureBitmap(view)
                
                // 2. Add Watermark
                val watermarkedBitmap = addWatermark(context, originalBitmap)
                
                // 3. Save and Share
                val uri = saveBitmap(context, watermarkedBitmap)
                if (uri != null) {
                    shareImage(context, uri)
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    private fun captureBitmap(view: View): Bitmap {
        // Create a bitmap with the same dimensions as the view
        val bitmap = Bitmap.createBitmap(
            view.width,
            view.height,
            Bitmap.Config.ARGB_8888
        )
        // Draw the view onto the bitmap
        val canvas = Canvas(bitmap)
        val bgDrawable = view.background
        if (bgDrawable != null) {
            bgDrawable.draw(canvas)
        } else {
            // Default background color if none set
            canvas.drawColor(Color.WHITE) // or Theme color
        }
        view.draw(canvas)
        return bitmap
    }

    private fun addWatermark(context: Context, src: Bitmap): Bitmap {
        val w = src.width
        val h = src.height
        val result = Bitmap.createBitmap(w, h, src.config ?: Bitmap.Config.ARGB_8888)
        val canvas = Canvas(result)
        canvas.drawBitmap(src, 0f, 0f, null)

        val paint = Paint()
        paint.color = Color.parseColor("#444444") // Dark Gray
        paint.alpha = 150 // Semi-transparent
        paint.textSize = (w * 0.05).toFloat() // 5% of width
        paint.isAntiAlias = true
        paint.isUnderlineText = false
        paint.textAlign = Paint.Align.RIGHT

        val watermarkText = "FaizBul ile Oluşturuldu"
        // Draw bottom right
        canvas.drawText(watermarkText, (w - 20).toFloat(), (h - 20).toFloat(), paint)

        return result
    }

    private fun saveBitmap(context: Context, bitmap: Bitmap): Uri? {
        val imagesFolder = File(context.cacheDir, "images")
        try {
            imagesFolder.mkdirs()
            val file = File(imagesFolder, "faizbul_share.png")
            val stream = FileOutputStream(file)
            bitmap.compress(Bitmap.CompressFormat.PNG, 90, stream)
            stream.flush()
            stream.close()
            return FileProvider.getUriForFile(
                context,
                "${context.packageName}.provider",
                file
            )
        } catch (e: IOException) {
            e.printStackTrace()
        }
        return null
    }

    private fun shareImage(context: Context, contentUri: Uri) {
        val shareIntent = Intent().apply {
            action = Intent.ACTION_SEND
            putExtra(Intent.EXTRA_STREAM, contentUri)
            type = "image/png"
            flags = Intent.FLAG_GRANT_READ_URI_PERMISSION
        }
        context.startActivity(Intent.createChooser(shareIntent, "FaizBul Sonucu Paylaş"))
    }
}
