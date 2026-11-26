package com.tappay;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.fail;

import android.app.KeyguardManager;
import android.content.Context;
import com.facebook.react.bridge.BridgeReactContext;
import com.facebook.react.bridge.PromiseImpl;
import com.facebook.react.bridge.ReactApplicationContext;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.RuntimeEnvironment;
import org.robolectric.Shadows;
import org.robolectric.annotation.Config;
import org.robolectric.shadows.ShadowKeyguardManager;

@RunWith(RobolectricTestRunner.class)
@Config(manifest = Config.NONE, sdk = {28, 30})
public class DeviceAuthModuleTest {
  private DeviceAuthModule module;
  private ShadowKeyguardManager keyguard;

  @Before
  public void setUp() {
    ReactApplicationContext context = new BridgeReactContext(RuntimeEnvironment.getApplication());
    module = new DeviceAuthModule(context);
    keyguard = Shadows.shadowOf((KeyguardManager) context.getSystemService(Context.KEYGUARD_SERVICE));
  }

  @Test
  public void configuredScreenLockIsAvailableEvenWithoutBiometrics() {
    keyguard.setIsDeviceSecure(true);
    assertEquals(Boolean.TRUE, checkDeviceSecure());
  }

  @Test
  public void unsecuredDeviceIsUnavailableEvenIfLockScreenIsPresent() {
    keyguard.setIsKeyguardSecure(true);
    keyguard.setIsDeviceSecure(false);
    assertEquals(Boolean.FALSE, checkDeviceSecure());
  }

  private Object checkDeviceSecure() {
    AtomicReference<Object> result = new AtomicReference<>();
    module.isDeviceSecure(new PromiseImpl(
      args -> result.set(args[0]),
      args -> fail("Device authentication check rejected")));
    return result.get();
  }
}
