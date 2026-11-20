package com.reactnativehce.apps.nfc;

import static org.junit.Assert.assertArrayEquals;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

import android.app.Application;

import com.reactnativehce.managers.HceViewModel;
import com.reactnativehce.managers.PrefManager;
import com.reactnativehce.utils.BinaryUtils;

import java.util.Arrays;

import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.RuntimeEnvironment;
import org.robolectric.annotation.Config;

@RunWith(RobolectricTestRunner.class)
@Config(manifest = Config.NONE, sdk = 28)
public class NFCTagType4Test {
  private static final String ORIGINAL = "tappay://tap/0x1111111111111111111111111111111111111111";
  private static final String REPLACEMENT = "tappay://tap/0x2222222222222222222222222222222222222222";
  private PrefManager preferences;
  private HceViewModel model;
  private NFCTagType4 tag;

  @Before
  public void setUp() {
    Application application = RuntimeEnvironment.getApplication();
    preferences = new PrefManager(application);
    preferences.setType("url");
    preferences.setContent(ORIGINAL);
    preferences.setWritable(false);
    model = new HceViewModel(application);
    tag = new NFCTagType4(preferences, model);
    connect();
  }

  @Test
  public void readOnlyRejectsReplacementAndPreservesContentAcrossReconnect() {
    byte[] originalData = tag.ndefDataBuffer.clone();
    byte[] originalCapabilities = tag.ccDataBuffer.clone();
    String originalState = model.getLastState().getValue();

    assertArrayEquals(hex("6982"), tag.processCommand(write(new NdefEntity("text", REPLACEMENT).getNdefContent())));

    assertArrayEquals(originalData, tag.ndefDataBuffer);
    assertArrayEquals(originalCapabilities, tag.ccDataBuffer);
    assertEquals(originalState, model.getLastState().getValue());
    assertEquals(ORIGINAL, preferences.getContent());
    assertEquals("url", preferences.getType());
    tag.onDestroy(0);
    connect();
    assertArrayEquals(originalData, tag.ndefDataBuffer);
    assertReadContent(new NdefEntity("url", ORIGINAL).getNdefContent());
  }

  @Test
  public void readOnlyRejectsEmptyPartialAndMalformedWritesWithoutMutation() {
    byte[] originalData = tag.ndefDataBuffer.clone();
    for (String command : new String[] {"00D6000000", "00D60000020000", "00D67FFF01FF", "00D6"}) {
      assertArrayEquals(hex("6982"), tag.processCommand(hex(command)));
      assertArrayEquals(originalData, tag.ndefDataBuffer);
      assertEquals(ORIGINAL, preferences.getContent());
      assertEquals("url", preferences.getType());
    }
  }

  @Test
  public void readOnlyRejectsWritesWithNoFileOrCapabilityFileSelected() {
    assertTrue(tag.assertSelectCommand(hex("00A4040007D276000085010100")));
    assertArrayEquals(hex("6982"), tag.processCommand(hex("00D60000020000")));
    assertArrayEquals(hex("9000"), tag.processCommand(hex("00A4000C02E103")));
    byte[] originalCapabilities = tag.ccDataBuffer.clone();
    assertArrayEquals(hex("6982"), tag.processCommand(hex("00D60000020000")));
    assertArrayEquals(originalCapabilities, tag.ccDataBuffer);
    assertEquals(ORIGINAL, preferences.getContent());
  }

  @Test
  public void writableStillPersistsReplacementAcrossReconnect() {
    preferences.setWritable(true);
    byte[] replacement = new NdefEntity("text", REPLACEMENT).getNdefContent();
    assertArrayEquals(hex("9000"), tag.processCommand(write(replacement)));
    assertEquals(REPLACEMENT, preferences.getContent());
    assertEquals("text", preferences.getType());
    assertEquals(HceViewModel.HCE_STATE_UPDATE_APPLICATION, model.getLastState().getValue());
    tag.onDestroy(0);
    connect();
    assertReadContent(replacement);
  }

  @Test
  public void writableStillRejectsWritesToCapabilityFile() {
    preferences.setWritable(true);
    assertArrayEquals(hex("9000"), tag.processCommand(hex("00A4000C02E103")));
    byte[] originalData = tag.ndefDataBuffer.clone();
    byte[] originalCapabilities = tag.ccDataBuffer.clone();
    assertArrayEquals(hex("6A82"), tag.processCommand(hex("00D60000020000")));
    assertArrayEquals(originalData, tag.ndefDataBuffer);
    assertArrayEquals(originalCapabilities, tag.ccDataBuffer);
    assertEquals(ORIGINAL, preferences.getContent());
  }

  private void connect() {
    assertTrue(tag.assertSelectCommand(hex("00A4040007D276000085010100")));
    assertArrayEquals(hex("9000"), tag.processCommand(hex("00A4000C02E104")));
  }

  private void assertReadContent(byte[] content) {
    byte[] response = tag.processCommand(new byte[] {0, (byte) 0xB0, 0, 0, (byte) content.length});
    byte[] expected = Arrays.copyOf(content, content.length + 2);
    expected[expected.length - 2] = (byte) 0x90;
    assertArrayEquals(expected, response);
  }

  private static byte[] write(byte[] content) {
    byte[] command = new byte[5 + content.length];
    command[1] = (byte) 0xD6;
    command[4] = (byte) content.length;
    System.arraycopy(content, 0, command, 5, content.length);
    return command;
  }

  private static byte[] hex(String value) {
    return BinaryUtils.HexStringToByteArray(value);
  }
}
