package com.tappay.nfc

import android.app.Activity
import android.nfc.NdefMessage
import android.nfc.NdefRecord
import android.nfc.NfcAdapter
import android.nfc.Tag
import android.nfc.tech.IsoDep
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

      adapter.enableReaderMode(activity, readerCallback, flags, null)
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

  private fun handleTag(tag: Tag) {
    try {
      val isoDep = IsoDep.get(tag) ?: run {
        emitError("Tag does not support ISO-DEP (required for Tap Pay HCE)")
        return
      }

      isoDep.connect()
      isoDep.timeout = 5000

      val text = readType4NdefText(isoDep)
      isoDep.close()

      if (text != null) {
        emitTagRead(text)
      } else {
        emitError("Could not read payment data from HCE card")
      }
    } catch (e: Exception) {
      Log.e(TAG, "handleTag failed", e)
      emitError(e.message ?: "NFC read failed")
    }
  }

  private fun readType4NdefText(isoDep: IsoDep): String? {
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
        return null
      }
    }

    val selectFile = byteArrayOf(0x00, 0xA4.toByte(), 0x00, 0x0C, 0x02, 0xE1.toByte(), 0x04)
    if (!isApduSuccess(isoDep.transceive(selectFile))) {
      return null
    }

    val lenResponse = isoDep.transceive(byteArrayOf(0x00, 0xB0.toByte(), 0x00, 0x00, 0x02))
    if (!isApduSuccess(lenResponse)) {
      return null
    }

    val lenData = lenResponse.copyOf(lenResponse.size - 2)
    val nlen = ((lenData[0].toInt() and 0xFF) shl 8) or (lenData[1].toInt() and 0xFF)
    if (nlen <= 0 || nlen > 0x7FFD) {
      return null
    }

    val readLength = nlen + 2
    val ndefResponse =
      isoDep.transceive(
        byteArrayOf(0x00, 0xB0.toByte(), 0x00, 0x00, readLength.toByte()),
      )
    if (!isApduSuccess(ndefResponse)) {
      return null
    }

    val ndefWithPrefix = ndefResponse.copyOf(ndefResponse.size - 2)
    val ndefMessageBytes = ndefWithPrefix.copyOfRange(2, 2 + nlen)

    val message = NdefMessage(ndefMessageBytes)
    if (message.records.isEmpty()) {
      return null
    }

    val record = message.records[0]
    if (
      record.tnf == NdefRecord.TNF_WELL_KNOWN &&
        record.type.contentEquals(NdefRecord.RTD_TEXT)
    ) {
      val payload = record.payload
      if (payload.size <= 3) {
        return null
      }
      return String(payload.copyOfRange(3, payload.size), Charsets.UTF_8)
    }

    return String(record.payload, Charsets.UTF_8)
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

  private fun emitError(message: String) {
    val params: WritableMap = Arguments.createMap()
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
    const val EVENT_TAG_READ = "TapNfcTagRead"
    const val EVENT_TAG_ERROR = "TapNfcTagError"
  }
}
