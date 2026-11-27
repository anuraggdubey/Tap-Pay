package com.tappay.nfc

import android.nfc.NdefMessage
import android.nfc.NdefRecord
import com.reactnativehce.apps.nfc.NdefEntity
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(manifest = Config.NONE, sdk = [28])
class TapNfcReaderModuleTest {
  private val recipient = "tappay://tap/0x1111111111111111111111111111111111111111"

  @Test
  fun prefixZeroDoesNotBecomePartOfTheRecipient() {
    assertEquals(recipient, TapNfcReaderModule.decodeNdefRecord(uriRecord(0, recipient)))
  }

  @Test
  fun expandsNonzeroPrefix() {
    assertEquals("https://example.com", TapNfcReaderModule.decodeNdefRecord(uriRecord(4, "example.com")))
    assertEquals("urn:nfc:example", TapNfcReaderModule.decodeNdefRecord(uriRecord(0x23, "example")))
  }

  @Test
  fun allStandardPrefixesMatchAndroidUriRtdDecoding() {
    for (code in 0..0x23) {
      val record = uriRecord(code, "example")
      assertEquals("URI prefix $code", record.toUri().toString(), TapNfcReaderModule.decodeNdefRecord(record))
    }
  }

  @Test
  fun rejectsEveryUnknownPrefixWithoutTreatingItAsText() {
    for (code in 0x24..0xFF) {
      assertNull("URI prefix $code", TapNfcReaderModule.decodeNdefRecord(uriRecord(code, recipient)))
    }
  }

  @Test
  fun rejectsUriWithNoIdentifierByte() {
    val record = NdefRecord(NdefRecord.TNF_WELL_KNOWN, NdefRecord.RTD_URI, byteArrayOf(), byteArrayOf())
    assertNull(TapNfcReaderModule.decodeNdefRecord(record))
  }

  @Test
  fun decodesUtf8AfterThePrefix() {
    assertEquals("https://example.com/é", TapNfcReaderModule.decodeNdefRecord(uriRecord(4, "example.com/é")))
  }

  @Test
  fun decodesActualHceEncoderOutput() {
    val encoded = NdefEntity("url", recipient).ndefContent
    val record = NdefMessage(encoded.copyOfRange(2, encoded.size)).records[0]
    assertEquals(0, record.payload[0].toInt())
    assertEquals(recipient, TapNfcReaderModule.decodeNdefRecord(record))
  }

  @Test
  fun decodesNfcManagerEncoderOutput() {
    // Ndef.encodeMessage([Ndef.uriRecord(recipient)]) from react-native-nfc-manager.
    val encoded = "d1013855007461707061793a2f2f7461702f307831313131313131313131313131313131313131313131313131313131313131313131313131313131"
      .chunked(2).map { it.toInt(16).toByte() }.toByteArray()
    val record = NdefMessage(encoded).records[0]
    assertEquals(0, record.payload[0].toInt())
    assertEquals(recipient, TapNfcReaderModule.decodeNdefRecord(record))
  }

  @Test
  fun preservesTextRecordDecoding() {
    val encoded = NdefEntity("text", recipient).ndefContent
    val record = NdefMessage(encoded.copyOfRange(2, encoded.size)).records[0]
    assertEquals(recipient, TapNfcReaderModule.decodeNdefRecord(record))
  }

  @Test
  fun preservesShortTextRecordRejection() {
    val record = NdefRecord(NdefRecord.TNF_WELL_KNOWN, NdefRecord.RTD_TEXT, byteArrayOf(), byteArrayOf(2, 101, 110))
    assertNull(TapNfcReaderModule.decodeNdefRecord(record))
  }

  @Test
  fun decodesTextRecordWithVariousLanguageCodeLengths() {
    val noLang = textRecord("", "hello", utf16 = false)
    assertEquals("hello", TapNfcReaderModule.decodeNdefRecord(noLang))

    val longLang = textRecord("en-US", recipient, utf16 = false)
    assertEquals(recipient, TapNfcReaderModule.decodeNdefRecord(longLang))
  }

  @Test
  fun decodesUtf16TextRecord() {
    val record = textRecord("en", recipient, utf16 = true)
    assertEquals(recipient, TapNfcReaderModule.decodeNdefRecord(record))
  }

  @Test
  fun rejectsTextRecordWithLanguageLengthExceedingPayload() {
    val record = NdefRecord(NdefRecord.TNF_WELL_KNOWN, NdefRecord.RTD_TEXT, byteArrayOf(), byteArrayOf(10, 101, 110))
    assertNull(TapNfcReaderModule.decodeNdefRecord(record))
  }

  private fun textRecord(lang: String, text: String, utf16: Boolean): NdefRecord {
    val langBytes = lang.toByteArray(Charsets.US_ASCII)
    val status = ((if (utf16) 0x80 else 0x00) or (langBytes.size and 0x3F)).toByte()
    val textBytes = text.toByteArray(if (utf16) Charsets.UTF_16 else Charsets.UTF_8)
    return NdefRecord(
      NdefRecord.TNF_WELL_KNOWN,
      NdefRecord.RTD_TEXT,
      byteArrayOf(),
      byteArrayOf(status) + langBytes + textBytes,
    )
  }

  private fun uriRecord(code: Int, suffix: String): NdefRecord {
    return NdefRecord(
      NdefRecord.TNF_WELL_KNOWN,
      NdefRecord.RTD_URI,
      byteArrayOf(),
      byteArrayOf(code.toByte()) + suffix.toByteArray(Charsets.UTF_8),
    )
  }
}
