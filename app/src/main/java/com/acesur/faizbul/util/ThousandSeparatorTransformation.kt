package com.acesur.faizbul.util

import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.input.OffsetMapping
import androidx.compose.ui.text.input.TransformedText
import androidx.compose.ui.text.input.VisualTransformation
import java.text.DecimalFormat
import java.text.DecimalFormatSymbols
import java.util.*

class ThousandSeparatorTransformation : VisualTransformation {
    override fun filter(text: AnnotatedString): TransformedText {
        val symbols = DecimalFormatSymbols(Locale.getDefault())
        val separator = symbols.groupingSeparator
        
        val originalText = text.text
        if (originalText.isEmpty()) return TransformedText(text, OffsetMapping.Identity)
        
        val formattedBuilder = StringBuilder()
        var separatorCount = 0
        
        // Reverse original length to place separators correctly from right to left
        val reversedText = originalText.reversed()
        for (i in reversedText.indices) {
            formattedBuilder.append(reversedText[i])
            if ((i + 1) % 3 == 0 && i != reversedText.lastIndex) {
                formattedBuilder.append(separator)
            }
        }
        
        val out = formattedBuilder.reverse().toString()
        
        val offsetMapping = object : OffsetMapping {
            override fun originalToTransformed(offset: Int): Int {
                if (offset <= 0) return 0
                val sub = originalText.substring(0, offset)
                val sepCount = (sub.length - 1) / 3
                // This is a simplified logic. Let's make it more robust.
                
                var transformedOffset = offset
                var remainingOriginal = offset
                var currentPosFromRight = originalText.length - 1
                
                // Count how many separators are to the left of the current offset
                // Total separators is (originalText.length - 1) / 3
                // Separators to the right of offset: (originalText.length - offset) / 3
                val totalSeps = (originalText.length - 1) / 3
                val sepsToRight = (originalText.length - offset) / 3
                val sepsToLeft = totalSeps - sepsToRight
                
                return offset + sepsToLeft
            }

            override fun transformedToOriginal(offset: Int): Int {
                var originalOffset = offset
                var separatorsCount = 0
                val transformedChars = out.toCharArray()
                
                for (i in 0 until offset.coerceAtMost(out.length)) {
                    if (transformedChars[i] == separator) {
                        separatorsCount++
                    }
                }
                return (offset - separatorsCount).coerceAtLeast(0)
            }
        }
        
        return TransformedText(AnnotatedString(out), offsetMapping)
    }
}
