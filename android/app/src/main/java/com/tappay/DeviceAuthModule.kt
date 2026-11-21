package com.tappay

import android.app.KeyguardManager
import android.content.Context
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class DeviceAuthModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "DeviceAuth"

  @ReactMethod
  fun isDeviceSecure(promise: Promise) {
    try {
      val keyguard = reactApplicationContext.getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager
      promise.resolve(keyguard.isDeviceSecure)
    } catch (error: Exception) {
      promise.reject("DEVICE_AUTH_UNAVAILABLE", "Could not check device authentication", error)
    }
  }
}
