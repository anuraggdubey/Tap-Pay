# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:

# NFC host card emulation and the native tap reader are looked up by the Android framework
# and React Native by name; R8 must not rename or strip them.
-keep class com.reactnativehce.** { *; }
-keep class com.tappay.** { *; }
-keep class community.revteltech.nfc.** { *; }
-keep class com.oblador.keychain.** { *; }
-dontwarn com.reactnativehce.**
-dontwarn community.revteltech.nfc.**
