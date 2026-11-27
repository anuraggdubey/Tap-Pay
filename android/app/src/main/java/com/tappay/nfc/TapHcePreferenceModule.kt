package com.tappay.nfc

import android.app.Activity
import android.content.ComponentName
import android.nfc.NfcAdapter
import android.nfc.cardemulation.CardEmulation
import android.util.Log
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.reactnativehce.services.CardService
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Sets TapPay's HCE CardService as the foreground preferred service while Receive is open,
 * avoiding generic NDEF AID (D2760000850101) conflicts with other installed HCE apps.
 */
class TapHcePreferenceModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext), LifecycleEventListener {

  private val preferredRequested = AtomicBoolean(false)

  init {
    reactContext.addLifecycleEventListener(this)
  }

  override fun getName(): String = "TapHcePreference"

  @ReactMethod
  fun setPreferredService(promise: Promise) {
    val activity = reactContext.currentActivity
    if (activity == null) {
      promise.resolve(false)
      return
    }
    preferredRequested.set(true)
    val ok = setPreferredInternal(activity)
    promise.resolve(ok)
  }

  @ReactMethod
  fun unsetPreferredService(promise: Promise) {
    preferredRequested.set(false)
    val ok = unsetPreferredInternal(reactContext.currentActivity)
    promise.resolve(ok)
  }

  @ReactMethod
  fun isDefaultServiceForAid(promise: Promise) {
    val adapter = NfcAdapter.getDefaultAdapter(reactContext)
    if (adapter == null) {
      promise.resolve(false)
      return
    }
    try {
      val cardEmulation = CardEmulation.getInstance(adapter)
      val component = ComponentName(reactContext, CardService::class.java)
      promise.resolve(cardEmulation.isDefaultServiceForAid(component, NDEF_AID))
    } catch (e: Exception) {
      Log.w(TAG, "isDefaultServiceForAid failed: ${e.message}")
      promise.resolve(false)
    }
  }

  @ReactMethod
  fun categoryAllowsForegroundPreference(promise: Promise) {
    val adapter = NfcAdapter.getDefaultAdapter(reactContext)
    if (adapter == null) {
      promise.resolve(false)
      return
    }
    try {
      val cardEmulation = CardEmulation.getInstance(adapter)
      promise.resolve(cardEmulation.categoryAllowsForegroundPreference(CardEmulation.CATEGORY_OTHER))
    } catch (e: Exception) {
      Log.w(TAG, "categoryAllowsForegroundPreference failed: ${e.message}")
      promise.resolve(false)
    }
  }

  override fun onHostResume() {
    if (preferredRequested.get()) {
      reactContext.currentActivity?.let { setPreferredInternal(it) }
    }
  }

  override fun onHostPause() {
    if (preferredRequested.get()) {
      unsetPreferredInternal(reactContext.currentActivity)
    }
  }

  override fun onHostDestroy() {
    preferredRequested.set(false)
    unsetPreferredInternal(reactContext.currentActivity)
  }

  override fun invalidate() {
    preferredRequested.set(false)
    unsetPreferredInternal(reactContext.currentActivity)
    reactContext.removeLifecycleEventListener(this)
    super.invalidate()
  }

  private fun setPreferredInternal(activity: Activity): Boolean {
    val adapter = NfcAdapter.getDefaultAdapter(activity) ?: return false
    if (!adapter.isEnabled) return false
    return try {
      val cardEmulation = CardEmulation.getInstance(adapter)
      val component = ComponentName(activity, CardService::class.java)
      cardEmulation.setPreferredService(activity, component)
    } catch (e: Exception) {
      Log.w(TAG, "setPreferredService failed: ${e.message}")
      false
    }
  }

  private fun unsetPreferredInternal(activity: Activity?): Boolean {
    if (activity == null) return false
    val adapter = NfcAdapter.getDefaultAdapter(activity) ?: return false
    return try {
      CardEmulation.getInstance(adapter).unsetPreferredService(activity)
    } catch (e: Exception) {
      Log.w(TAG, "unsetPreferredService failed: ${e.message}")
      false
    }
  }

  companion object {
    private const val TAG = "TapHcePreference"
    private const val NDEF_AID = "D2760000850101"
  }
}
