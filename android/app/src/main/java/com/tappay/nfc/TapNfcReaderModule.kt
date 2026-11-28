package com.tappay.nfc

import android.app.Activity
import android.nfc.NdefMessage
import android.nfc.NdefRecord
import android.nfc.NfcAdapter
import android.nfc.Tag
import android.nfc.TagLostException
import android.nfc.tech.IsoDep
import android.os.Bundle
import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Native NFC reader for phone-to-phone HCE Type 4 tag reading.
 * Uses Activity.enableReaderMode() which is required for reliable HCE detection.
 */
class TapNfcReaderModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  private val executor = Executors.newSingleThreadExecutor()
  private val readerActive = AtomicBoolean(false)
  private var readerCallback: NfcAdapter.ReaderCallback? = null

  override fun getName(): String = "TapNfcReader"

  @ReactMethod
  fun startReaderMode(promise: Promise) {
    val activity = reactContext.currentActivity
    if (activity == null) {
      promise.reject("NO_ACTIVITY", "App must be in foreground to scan NFC")
      return
    }

    val adapter = NfcAdapter.getDefaultAdapter(activity)
    if (adapter == null || !adapter.isEnabled) {
      promise.reject("NFC_DISABLED", "NFC is disabled on this device")
      return
    }

    try {
      stopReaderModeInternal(activity, adapter)

      val flags =
        NfcAdapter.FLAG_READER_NFC_A or
          NfcAdapter.FLAG_READER_NFC_B or
          NfcAdapter.FLAG_READER_SKIP_NDEF_CHECK or
          NfcAdapter.FLAG_READER_NO_PLATFORM_SOUNDS

      readerCallback = NfcAdapter.ReaderCallback { tag ->
        if (!readerActive.get()) {
          return@ReaderCallback
        }
        executor.execute { handleTag(tag) }
      }

      val extras = buildReaderModeExtras()
      adapter.enableReaderMode(activity, readerCallback, flags, extras)
      readerActive.set(true)
      promise.resolve(true)
    } catch (e: Exception) {
      Log.e(TAG, "startReaderMode failed", e)
      promise.reject("READER_START_FAILED", e.message, e)
    }
  }

  @ReactMethod
  fun stopReaderMode(promise: Promise) {
    val activity = reactContext.currentActivity
    val adapter = activity?.let { NfcAdapter.getDefaultAdapter(it) }
    if (activity != null && adapter != null) {
      stopReaderModeInternal(activity, adapter)
    } else {
      readerActive.set(false)
      readerCallback = null
    }
    promise.resolve(true)
  }

  @ReactMethod
  fun isReaderModeActive(promise: Promise) {
    promise.resolve(readerActive.get())
  }

  private fun stopReaderModeInternal(activity: Activity, adapter: NfcAdapter) {
    try {
      adapter.disableReaderMode(activity)
    } catch (e: Exception) {
      Log.w(TAG, "disableReaderMode: ${e.message}")
    }
    readerActive.set(false)
    readerCallback = null
  }

  private sealed class Type4ReadOutcome {
    data class Success(val text: String) : Type4ReadOutcome()
    data class Failure(val code: String, val message: String) : Type4ReadOutcome()
  }

  private fun handleTag(tag: Tag) {
    val isoDep = IsoDep.get(tag)
    if (isoDep == null) {
      emitError(ERR_NOT_ISO_DEP, "Tag does not support ISO-DEP (required for Tap Pay HCE)")
      return
    }

    try {
      isoDep.connect()
      isoDep.timeout = 5000

      when (val outcome = readType4NdefText(isoDep)) {
        is Type4ReadOutcome.Success -> emitTagRead(outcome.text)
        is Type4ReadOutcome.Failure -> emitError(outcome.code, outcome.message)
      }
    } catch (e: TagLostException) {
      Log.w(TAG, "Tag lost during NFC read", e)
      emitError(ERR_TAG_LOST, e.message ?: "Phone moved too fast")
    } catch (e: Exception) {
      Log.e(TAG, "handleTag failed", e)
      val code =
        if (e.message?.contains("Tag was lost", ignoreCase = true) == true) {
          ERR_TAG_LOST
        } else {
          ERR_READ_FAILED
        }
      emitError(code, e.message ?: "NFC read failed")
    } finally {
      runCatching { isoDep.close() }
    }
  }

  private fun readMaxReadLength(isoDep: IsoDep): Int {
    val selectCc = byteArrayOf(0x00, 0xA4.toByte(), 0x00, 0x0C, 0x02, 0xE1.toByte(), 0x03)
    if (!isApduSuccess(isoDep.transceive(selectCc))) {
      return MAX_SHORT_APDU_LE
    }
    val ccResponse = isoDep.transceive(byteArrayOf(0x00, 0xB0.toByte(), 0x00, 0x00, 0x0F))
    if (!isApduSuccess(ccResponse) || ccResponse.size < 7) {
      return MAX_SHORT_APDU_LE
    }
    val mle = ((ccResponse[3].toInt() and 0xFF) shl 8) or (ccResponse[4].toInt() and 0xFF)
    return if (mle > 0) minOf(mle, MAX_SHORT_APDU_LE) else MAX_SHORT_APDU_LE
  }

  private fun readType4NdefText(isoDep: IsoDep): Type4ReadOutcome {
    val selectApp =
      byteArrayOf(
        0x00,
        0xA4.toByte(),
        0x04,
        0x00,
        0x07,
        0xD2.toByte(),
        0x76,
        0x00,
        0x00,
        0x85.toByte(),
        0x01,
        0x01,
        0x00,
      )

    if (!isApduSuccess(isoDep.transceive(selectApp))) {
      // Some devices omit Le — retry without trailing 0x00
      val selectAppNoLe =
        byteArrayOf(
          0x00,
          0xA4.toByte(),
          0x04,
          0x00,
          0x07,
          0xD2.toByte(),
          0x76,
          0x00,
          0x00,
          0x85.toByte(),
          0x01,
          0x01,
        )
      if (!isApduSuccess(isoDep.transceive(selectAppNoLe))) {
        return Type4ReadOutcome.Failure(
          ERR_APP_NOT_FOUND,
          "TapPay Receive screen is not open on the other phone",
        )
      }
    }

    val selectFile = byteArrayOf(0x00, 0xA4.toByte(), 0x00, 0x0C, 0x02, 0xE1.toByte(), 0x04)
    if (!isApduSuccess(isoDep.transceive(selectFile))) {
      return Type4ReadOutcome.Failure(ERR_READ_FAILED, "Could not select NDEF file on HCE card")
    }

    val lenResponse = isoDep.transceive(byteArrayOf(0x00, 0xB0.toByte(), 0x00, 0x00, 0x02))
    if (!isApduSuccess(lenResponse) || lenResponse.size < 4) {
      return Type4ReadOutcome.Failure(ERR_READ_FAILED, "Could not read NDEF length from HCE card")
    }

    val nlen = ((lenResponse[0].toInt() and 0xFF) shl 8) or (lenResponse[1].toInt() and 0xFF)
    if (nlen <= 0 || nlen > 0x7FFD) {
      return Type4ReadOutcome.Failure(ERR_READ_FAILED, "Invalid NDEF length on HCE card")
    }

    val ndefMessageBytes = ByteArray(nlen)
    var offset = 2
    var copied = 0

    // Fast path (#136): skip SELECT CC + READ BINARY CC (2 RF round-trips) when the payload
    // fits in a single short READ BINARY. Fall back to CC/MLe chunking if the card requires it.
    var maxChunk = MAX_SHORT_APDU_LE
    if (nlen <= MAX_SHORT_APDU_LE) {
      val fastResponse =
        isoDep.transceive(
          byteArrayOf(
            0x00,
            0xB0.toByte(),
            0x00,
            0x02,
            nlen.toByte(),
          ),
        )
      if (isApduSuccess(fastResponse) && fastResponse.size > 2) {
        val dataLen = fastResponse.size - 2
        val take = minOf(dataLen, nlen)
        System.arraycopy(fastResponse, 0, ndefMessageBytes, 0, take)
        copied = take
        offset = 2 + take
      }
    }

    if (copied < nlen) {
      maxChunk = readMaxReadLength(isoDep)
      if (!isApduSuccess(isoDep.transceive(selectFile))) {
        return Type4ReadOutcome.Failure(ERR_READ_FAILED, "Could not re-select NDEF file on HCE card")
      }
    }

    while (copied < nlen) {
      val toRead = minOf(maxChunk, nlen - copied)
      val chunkResponse =
        isoDep.transceive(
          byteArrayOf(
            0x00,
            0xB0.toByte(),
            ((offset shr 8) and 0xFF).toByte(),
            (offset and 0xFF).toByte(),
            toRead.toByte(),
          ),
        )
      if (!isApduSuccess(chunkResponse)) {
        return Type4ReadOutcome.Failure(ERR_READ_FAILED, "Could not read payment data from HCE card")
      }
      val dataLen = chunkResponse.size - 2
      if (dataLen <= 0) {
        return Type4ReadOutcome.Failure(ERR_READ_FAILED, "Truncated NDEF payload from HCE card")
      }
      val take = minOf(dataLen, nlen - copied)
      System.arraycopy(chunkResponse, 0, ndefMessageBytes, copied, take)
      copied += take
      offset += take
    }
    val message = NdefMessage(ndefMessageBytes)
    if (message.records.isEmpty()) {
      return Type4ReadOutcome.Failure(ERR_READ_FAILED, "Empty NDEF message on HCE card")
    }

    val text = decodeNdefRecord(message.records[0])
      ?: return Type4ReadOutcome.Failure(ERR_READ_FAILED, "Unsupported NDEF record on HCE card")
    return Type4ReadOutcome.Success(text)
  }

  private fun isApduSuccess(response: ByteArray): Boolean {
    return response.size >= 2 &&
      response[response.size - 2] == 0x90.toByte() &&
      response[response.size - 1] == 0x00.toByte()
  }

  private fun emitTagRead(text: String) {
    val params: WritableMap = Arguments.createMap()
    params.putString("text", text)
    sendEvent(EVENT_TAG_READ, params)
  }

  private fun emitError(code: String, message: String) {
    val params: WritableMap = Arguments.createMap()
    params.putString("code", code)
    params.putString("error", message)
    sendEvent(EVENT_TAG_ERROR, params)
  }

  private fun sendEvent(event: String, params: WritableMap) {
    try {
      reactContext
        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
        .emit(event, params)
    } catch (e: Exception) {
      Log.w(TAG, "sendEvent($event) failed: ${e.message}")
    }
  }

  // Required by React Native 0.65+ for modules that emit events
  @ReactMethod
  fun addListener(@Suppress("UNUSED_PARAMETER") eventName: String) {
    // No-op: required by NativeEventEmitter
  }

  @ReactMethod
  fun removeListeners(@Suppress("UNUSED_PARAMETER") count: Int) {
    // No-op: required by NativeEventEmitter
  }

  override fun invalidate() {
    val activity = reactContext.currentActivity
    val adapter = activity?.let { NfcAdapter.getDefaultAdapter(it) }
    if (activity != null && adapter != null) {
      stopReaderModeInternal(activity, adapter)
    }
    executor.shutdownNow()
    super.invalidate()
  }

  companion object {
    private const val TAG = "TapNfcReader"
    private const val MAX_SHORT_APDU_LE = 0xFF
    const val PRESENCE_CHECK_DELAY_MS = 250
    const val EVENT_TAG_READ = "TapNfcTagRead"
    const val EVENT_TAG_ERROR = "TapNfcTagError"
    const val ERR_NOT_ISO_DEP = "NOT_ISO_DEP"
    const val ERR_APP_NOT_FOUND = "APP_NOT_FOUND"
    const val ERR_TAG_LOST = "TAG_LOST"
    const val ERR_READ_FAILED = "READ_FAILED"

    internal fun buildReaderModeExtras(delayMs: Int = PRESENCE_CHECK_DELAY_MS): Bundle {
      return Bundle().apply {
        putInt(NfcAdapter.EXTRA_READER_PRESENCE_CHECK_DELAY, delayMs)
      }
    }

    private val URI_PREFIXES = arrayOf(
      "",
      "http://www.",
      "https://www.",
      "http://",
      "https://",
      "tel:",
      "mailto:",
      "ftp://anonymous:anonymous@",
      "ftp://ftp.",
      "ftps://",
      "sftp://",
      "smb://",
      "nfs://",
      "ftp://",
      "dav://",
      "news:",
      "telnet://",
      "imap:",
      "rtsp://",
      "urn:",
      "pop:",
      "sip:",
      "sips:",
      "tftp:",
      "btspp://",
      "btl2cap://",
      "btgoep://",
      "tcpobex://",
      "irdaobex://",
      "file://",
      "urn:epc:id:",
      "urn:epc:tag:",
      "urn:epc:pat:",
      "urn:epc:raw:",
      "urn:epc:",
      "urn:nfc:",
    )

    internal fun decodeNdefRecord(record: NdefRecord): String? {
      if (record.tnf == NdefRecord.TNF_WELL_KNOWN && record.type.contentEquals(NdefRecord.RTD_URI)) {
        val payload = record.payload
        if (payload.isEmpty()) {
          return null
        }
        val prefix = URI_PREFIXES.getOrNull(payload[0].toInt() and 0xFF) ?: return null
        return prefix + String(payload.copyOfRange(1, payload.size), Charsets.UTF_8)
      }

      if (
        record.tnf == NdefRecord.TNF_WELL_KNOWN &&
          record.type.contentEquals(NdefRecord.RTD_TEXT)
      ) {
        val payload = record.payload
        if (payload.isEmpty()) {
          return null
        }
        val status = payload[0].toInt() and 0xFF
        val isUtf16 = (status and 0x80) != 0
        val langLen = status and 0x3F
        val textStart = 1 + langLen
        if (textStart >= payload.size) {
          return null
        }
        val charset = if (isUtf16) Charsets.UTF_16 else Charsets.UTF_8
        return String(payload.copyOfRange(textStart, payload.size), charset)
      }

      return String(record.payload, Charsets.UTF_8)
    }
  }
}
