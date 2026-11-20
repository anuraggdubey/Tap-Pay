package com.reactnativehce.apps.nfc;

import static org.junit.Assert.assertArrayEquals;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import android.app.Application;
import androidx.lifecycle.MutableLiveData;

import com.reactnativehce.managers.HceViewModel;
import com.reactnativehce.managers.PrefManager;
import com.reactnativehce.utils.ApduHelper;
import com.reactnativehce.utils.BinaryUtils;

import java.util.Arrays;
import java.util.Random;

import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.RuntimeEnvironment;
import org.robolectric.annotation.Config;

@RunWith(RobolectricTestRunner.class)
@Config(manifest = Config.NONE, sdk = 28)
public class NFCTagType4BoundsTest {
  private static final String ORIGINAL = "original recipient";
  private PrefManager preferences;
  private HceViewModel model;
  private NFCTagType4 tag;

  @Before
  public void setUp() {
    Application application = RuntimeEnvironment.getApplication();
    preferences = new PrefManager(application);
    preferences.setContent(ORIGINAL);
    preferences.setType("text");
    preferences.setWritable(true);
    model = new HceViewModel(application);
    tag = new NFCTagType4(preferences, model);
    assertTrue(tag.assertSelectCommand(hex("00A4040007D276000085010100")));
    select("E104");
  }

  @Test
  public void malformedLengthsDoNotChangeBuffersPreferencesOrState() {
    for (String command : new String[] {
      "", "00", "00B0", "00B000", "00B00000", "00B000000001", "00B00000000100",
      "00D6", "00D600", "00D60000", "00D6000000", "00D600000201", "00D60000010102",
      "00A4", "00A400", "00A4000C", "00A4000C02E1", "00A4000C01E104", "00A4000C02E10400"
    }) {
      assertRejectedWithoutMutation(command, "6700");
    }
    byte[] data = tag.ndefDataBuffer.clone();
    assertArrayEquals(hex("6700"), tag.processCommand(null));
    assertArrayEquals(data, tag.ndefDataBuffer);
  }

  @Test
  public void outOfRangeOffsetsFromIssueReturnStatusWords() {
    select("E103");
    assertRejectedWithoutMutation("00B0001001", "6B00");
    assertRejectedWithoutMutation("00B0000F01", "6B00");
    assertRejectedWithoutMutation("00B0FFFF01", "6B00");
    select("E104");
    assertRejectedWithoutMutation("00B07FFF01", "6B00");
    assertRejectedWithoutMutation("00B0800001", "6B00");
    assertRejectedWithoutMutation("00D67FFF01FF", "6B00");
    assertRejectedWithoutMutation("00D67FFE02FFFF", "6B00");
    assertRejectedWithoutMutation("00D6FFFF01FF", "6B00");
  }

  @Test
  public void readsLastByteAndReportsEofWithoutPadding() {
    tag.ndefDataBuffer[0x7FFE] = 0x42;
    assertArrayEquals(hex("429000"), tag.processCommand(hex("00B07FFE01")));
    assertArrayEquals(hex("426282"), tag.processCommand(hex("00B07FFE02")));
    select("E103");
    byte[] expected = Arrays.copyOf(tag.ccDataBuffer, tag.ccDataBuffer.length + 2);
    expected[expected.length - 2] = 0x62;
    expected[expected.length - 1] = (byte) 0x82;
    assertArrayEquals(expected, tag.processCommand(hex("00B0000010")));
  }

  @Test
  public void zeroLeMeans256BytesAndUnsignedLeIsSupported() {
    byte[] response = tag.processCommand(hex("00B0000000"));
    assertEquals(258, response.length);
    assertArrayEquals(Arrays.copyOf(tag.ndefDataBuffer, 256), Arrays.copyOf(response, 256));
    assertArrayEquals(hex("9000"), Arrays.copyOfRange(response, 256, 258));
    assertEquals(257, tag.processCommand(hex("00B00000FF")).length);
  }

  @Test
  public void writableBoundaryAndCompleteUpdatesStillWork() {
    assertArrayEquals(hex("9000"), tag.processCommand(hex("00D67FFE01FF")));
    assertEquals((byte) 0xFF, tag.ndefDataBuffer[0x7FFE]);
    byte[] content = new NdefEntity("text", "replacement recipient").getNdefContent();
    byte[] command = new byte[content.length + 5];
    command[1] = (byte) 0xD6;
    command[4] = (byte) content.length;
    System.arraycopy(content, 0, command, 5, content.length);
    assertArrayEquals(hex("9000"), tag.processCommand(command));
    assertEquals("replacement recipient", preferences.getContent());
    assertEquals(HceViewModel.HCE_STATE_UPDATE_APPLICATION, model.getLastState().getValue());
  }

  @Test
  public void unsignedLcCanFillLast255Bytes() {
    byte[] command = new byte[260];
    Arrays.fill(command, (byte) 0xFF);
    command[0] = 0;
    command[1] = (byte) 0xD6;
    command[2] = 0x7F;
    command[3] = 0;
    assertArrayEquals(hex("9000"), tag.processCommand(command));
    assertArrayEquals(Arrays.copyOfRange(command, 5, 260), Arrays.copyOfRange(tag.ndefDataBuffer, 0x7F00, 0x7FFF));
  }

  @Test
  public void oversizedNlenRemainsAnIncompleteWrite() {
    assertArrayEquals(hex("9000"), tag.processCommand(hex("00D6000002FFFF")));
    assertEquals(ORIGINAL, preferences.getContent());
    assertEquals(HceViewModel.HCE_STATE_WRITE_PARTIAL, model.getLastState().getValue());
  }

  @Test
  public void selectionValidatesLengthParametersAndFileId() {
    assertRejectedWithoutMutation("00A4010C02E104", "6A86");
    assertRejectedWithoutMutation("00A4000C02FFFF", "6A82");
    assertTrue(tag.assertSelectCommand(hex("00A4040007D2760000850101")));
    assertArrayEquals(hex("6A82"), tag.processCommand(hex("00B0000001")));
    assertArrayEquals(hex("6A82"), tag.processCommand(hex("00D600000101")));
    select("E103");
    assertRejectedWithoutMutation("00D600000101", "6A82");
    assertRejectedWithoutMutation("00FF0000", "6A82");
  }

  @Test
  public void applicationSelectionRejectsTruncatedOrExtraBytesSafely() {
    byte[] command = hex("00A4040007D276000085010100");
    for (int length = 0; length < command.length - 1; length++) {
      assertFalse(tag.assertSelectCommand(Arrays.copyOf(command, length)));
    }
    assertFalse(tag.assertSelectCommand(null));
    assertFalse(tag.assertSelectCommand(Arrays.copyOf(command, command.length + 1)));
    assertTrue(tag.assertSelectCommand(command));
  }

  @Test
  public void rangeComparisonDoesNotPadOrThrowOnInvalidInput() {
    assertFalse(ApduHelper.commandByRangeEquals(null, 0, 2, hex("00B0")));
    assertFalse(ApduHelper.commandByRangeEquals(hex("00"), 0, 2, hex("0000")));
    assertFalse(ApduHelper.commandByRangeEquals(hex("00"), 2, 3, hex("00")));
    assertFalse(ApduHelper.commandByRangeEquals(hex("00"), -1, 1, hex("00")));
    assertFalse(ApduHelper.commandByRangeEquals(hex("00"), 1, 0, hex("00")));
  }

  @Test
  public void malformedCommandMatrixNeverFallsThroughToUnexpectedError() {
    Random random = new Random(53);
    for (int instruction : new int[] {0xA4, 0xB0, 0xD6}) {
      for (int length = 0; length <= 270; length++) {
        byte[] command = new byte[length];
        random.nextBytes(command);
        if (length > 0) command[0] = 0;
        if (length > 1) command[1] = (byte) instruction;
        byte[] response = tag.processCommand(command);
        assertTrue(response.length >= 2);
        assertFalse(Arrays.equals(hex("6F00"), Arrays.copyOfRange(response, response.length - 2, response.length)));
      }
    }
  }

  @Test
  public void unexpectedDispatchExceptionBecomes6f00() {
    boolean[] fail = {false};
    HceViewModel flakyModel = new HceViewModel(RuntimeEnvironment.getApplication()) {
      @Override
      public MutableLiveData<String> getLastState() {
        if (fail[0]) throw new IllegalStateException("Unavailable state observer");
        return super.getLastState();
      }
    };
    NFCTagType4 flakyTag = new NFCTagType4(preferences, flakyModel);
    assertTrue(flakyTag.assertSelectCommand(hex("00A4040007D276000085010100")));
    assertArrayEquals(hex("9000"), flakyTag.processCommand(hex("00A4000C02E104")));
    fail[0] = true;
    assertArrayEquals(hex("6F00"), flakyTag.processCommand(hex("00B0000001")));
  }

  private void assertRejectedWithoutMutation(String command, String status) {
    byte[] data = tag.ndefDataBuffer.clone();
    byte[] capabilities = tag.ccDataBuffer.clone();
    String state = model.getLastState().getValue();
    String content = preferences.getContent();
    assertArrayEquals(command, hex(status), tag.processCommand(hex(command)));
    assertArrayEquals(command, data, tag.ndefDataBuffer);
    assertArrayEquals(command, capabilities, tag.ccDataBuffer);
    assertEquals(command, content, preferences.getContent());
    assertEquals(command, state, model.getLastState().getValue());
  }

  private void select(String file) {
    assertArrayEquals(hex("9000"), tag.processCommand(hex("00A4000C02" + file)));
  }

  private static byte[] hex(String value) {
    return BinaryUtils.HexStringToByteArray(value);
  }
}
