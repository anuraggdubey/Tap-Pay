package com.reactnativehce.services;

import static org.junit.Assert.assertArrayEquals;

import com.reactnativehce.IHCEApplication;
import com.reactnativehce.managers.PrefManager;
import com.reactnativehce.utils.BinaryUtils;

import java.lang.reflect.Field;
import java.util.ArrayList;
import java.util.Arrays;

import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.Robolectric;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.RuntimeEnvironment;
import org.robolectric.annotation.Config;

@RunWith(RobolectricTestRunner.class)
@Config(manifest = Config.NONE, sdk = 28)
public class CardServiceTest {
  private CardService service;

  @Before
  public void setUp() {
    PrefManager preferences = new PrefManager(RuntimeEnvironment.getApplication());
    preferences.setType("text");
    preferences.setContent("recipient");
    preferences.setWritable(true);
    service = Robolectric.buildService(CardService.class).create().get();
  }

  @Test
  public void emptyAndMalformedSelectionsReturnWrongLength() {
    assertArrayEquals(hex("6700"), service.processCommandApdu(null, null));
    for (String command : new String[] {
      "", "00", "00A4", "00A404", "00A40400", "00A4040000",
      "00A4040007D27600008501", "00A4040008D2760000850101", "00A4040007D27600008501010000"
    }) {
      assertArrayEquals(command, hex("6700"), service.processCommandApdu(hex(command), null));
    }
  }

  @Test
  public void selectsWithOrWithoutLeAndRejectsUnknownAid() {
    assertArrayEquals(hex("6A82"), service.processCommandApdu(hex("00A404000101"), null));
    assertArrayEquals(hex("9000"), service.processCommandApdu(hex("00A4040007D2760000850101"), null));
    service.onDeactivated(0);
    assertArrayEquals(hex("9000"), service.processCommandApdu(hex("00A4040007D276000085010100"), null));
  }

  @Test
  public void issueApdusReturnStatusWordsThroughServiceDispatch() {
    connect();
    assertArrayEquals(hex("6700"), service.processCommandApdu(hex("00B0"), null));
    assertArrayEquals(hex("6A82"), service.processCommandApdu(hex("00D6"), null));
    assertArrayEquals(hex("6B00"), service.processCommandApdu(hex("00B0001001"), null));
    assertArrayEquals(hex("9000"), service.processCommandApdu(hex("00A4000C02E104"), null));
    assertArrayEquals(hex("6700"), service.processCommandApdu(hex("00D6"), null));
    assertArrayEquals(hex("6B00"), service.processCommandApdu(hex("00D67FFF01FF"), null));
    assertArrayEquals(hex("6700"), service.processCommandApdu(null, null));
  }

  @Test
  public void normalReadAndDeactivationStillWork() {
    connect();
    byte[] response = service.processCommandApdu(hex("00B000000F"), null);
    assertArrayEquals(hex("000F20010000FF0406E1047FFF00009000"), response);
    service.onDeactivated(0);
    assertArrayEquals(hex("6A82"), service.processCommandApdu(hex("00B0000001"), null));
    connect();
  }

  @Test
  public void unexpectedApplicationExceptionReturns6f00() throws Exception {
    Field current = CardService.class.getDeclaredField("currentHCEApplication");
    current.setAccessible(true);
    current.set(service, throwingApplication());
    assertArrayEquals(hex("6F00"), service.processCommandApdu(hex("00B0000001"), null));
  }

  @Test
  @SuppressWarnings("unchecked")
  public void unexpectedSelectionExceptionReturns6f00() throws Exception {
    Field registered = CardService.class.getDeclaredField("registeredHCEApplications");
    registered.setAccessible(true);
    ArrayList<IHCEApplication> applications = (ArrayList<IHCEApplication>) registered.get(service);
    applications.clear();
    applications.add(throwingApplication());
    assertArrayEquals(hex("6F00"), service.processCommandApdu(hex("00A4040007D276000085010100"), null));
  }

  @Test
  public void everyTruncatedApplicationSelectionIsSafe() {
    byte[] command = hex("00A4040007D276000085010100");
    for (int length = 0; length < 12; length++) {
      assertArrayEquals(hex("6700"), service.processCommandApdu(Arrays.copyOf(command, length), null));
    }
  }

  private void connect() {
    assertArrayEquals(hex("9000"), service.processCommandApdu(hex("00A4040007D276000085010100"), null));
    assertArrayEquals(hex("9000"), service.processCommandApdu(hex("00A4000C02E103"), null));
  }

  private static IHCEApplication throwingApplication() {
    return new IHCEApplication() {
      public byte[] processCommand(byte[] command) { throw new IllegalStateException("Dispatch failed"); }
      public boolean assertSelectCommand(byte[] command) { throw new IllegalStateException("Selection failed"); }
      public void onDestroy(int reason) {}
    };
  }

  private static byte[] hex(String value) {
    return BinaryUtils.HexStringToByteArray(value);
  }
}
