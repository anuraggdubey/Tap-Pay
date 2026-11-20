/*
 * Copyright (c) 2020-2022 Mateusz Falkowski (appidea.pl) and contributors. All rights reserved.
 * This file is part of "react-native-hce" library: https://github.com/appidea/react-native-hce
 * Licensed under the MIT license. See LICENSE file in the project root for details.
 */

package com.reactnativehce.apps.nfc;

import android.util.Log;

import com.reactnativehce.utils.ApduHelper;
import com.reactnativehce.managers.HceViewModel;
import com.reactnativehce.managers.PrefManager;
import com.reactnativehce.utils.BinaryUtils;
import com.reactnativehce.IHCEApplication;

import java.util.Arrays;

public class NFCTagType4 implements IHCEApplication {
  private static final String TAG = "NFCTag";
  private static final byte[] C_APDU_SELECT = BinaryUtils.HexStringToByteArray("00A4040007D276000085010100");
  private static final byte[] FILENAME_CC = BinaryUtils.HexStringToByteArray("E103");
  private static final byte[] FILENAME_NDEF = BinaryUtils.HexStringToByteArray("E104");
  private static final byte[] CC_HEADER = BinaryUtils.HexStringToByteArray("000F20010000FF");
  private final PrefManager prefManager;
  private final HceViewModel hceModel;

  private SelectedFile selectedFile = null;
  public final byte[] ndefDataBuffer = new byte[0x7FFF];
  public final byte[] ccDataBuffer = new byte[0x000F];

  private enum SelectedFile {
    FILENAME_CC,
    FILENAME_NDEF
  }

  public NFCTagType4(PrefManager prefManager, HceViewModel model) {
    this.prefManager = prefManager;
    this.hceModel = model;

    this.setUpNdefContent();
    this.setUpCapabilityContainerContent();
  }

  private void setUpNdefContent() {
    try {
      String type = prefManager.getType();
      String content = prefManager.getContent();
      if (type == null || type.isEmpty()) type = "text";
      if (content == null || content.isEmpty()) content = "";
      byte[] ndef = (new NdefEntity(type, content)).getNdefContent();
      // Clear buffer before writing to avoid stale trailing bytes
      Arrays.fill(this.ndefDataBuffer, (byte) 0);
      System.arraycopy(ndef, 0, this.ndefDataBuffer, 0, ndef.length);
    } catch (Exception e) {
      Log.w(TAG, "setUpNdefContent failed: " + e.getMessage());
    }
  }

  private void setUpCapabilityContainerContent() {
    System.arraycopy(CC_HEADER, 0, this.ccDataBuffer, 0, CC_HEADER.length);
    byte[] controlTlv = BinaryUtils.HexStringToByteArray("0406E1047FFF00" + (prefManager.getWritable() ? "00":"FF"));
    System.arraycopy(controlTlv, 0, this.ccDataBuffer, CC_HEADER.length, controlTlv.length);
  }

  private byte[] getFullResponseByFile() {
    switch (selectedFile) {
      case FILENAME_CC:
        return this.ccDataBuffer;
      case FILENAME_NDEF:
        return this.ndefDataBuffer;
      default:
        throw new Error("Unknown file");
    }
  }

  public boolean assertSelectCommand(byte[] command) {
    boolean result = Arrays.equals(command, C_APDU_SELECT)
      || Arrays.equals(command, Arrays.copyOf(C_APDU_SELECT, C_APDU_SELECT.length - 1));

    if (result) {
      // Refresh NDEF content from SharedPreferences on every new reader connection
      // so the latest address set by JS is always served
      this.selectedFile = null;
      this.setUpNdefContent();
      this.setUpCapabilityContainerContent();
      this.hceModel.getLastState().setValue(HceViewModel.HCE_STATE_CONNECTED);
    }

    return result;
  }

  private byte[] respondSelectFile(byte[] command) {
    if (command.length != 7 || command[4] != 2) {
      return ApduHelper.R_APDU_WRONG_LENGTH;
    }
    byte[] file = Arrays.copyOfRange(command, 5, 7);

    if (Arrays.equals(file, FILENAME_CC)) {
      this.selectedFile = SelectedFile.FILENAME_CC;
    } else if (Arrays.equals(file, FILENAME_NDEF)) {
      this.selectedFile = SelectedFile.FILENAME_NDEF;
    } else {
      return ApduHelper.R_APDU_ERROR;
    }

    if (this.selectedFile != null) {
      return ApduHelper.R_APDU_OK;
    }

    return ApduHelper.R_APDU_ERROR;
  }

  private byte[] respondRead(byte[] command) {
    if (command.length != 5) {
      return ApduHelper.R_APDU_WRONG_LENGTH;
    }
    if (this.selectedFile == null) {
      return ApduHelper.R_APDU_ERROR;
    }

    int offset = ((command[2] & 0xFF) << 8) | (command[3] & 0xFF);
    int length = command[4] & 0xFF;
    if (length == 0) length = 256;

    byte[] fullResponse = getFullResponseByFile();
    if (offset >= fullResponse.length) {
      return ApduHelper.R_APDU_WRONG_OFFSET;
    }

    int realLength = Math.min(fullResponse.length - offset, length);
    byte[] status = realLength < length ? ApduHelper.R_APDU_EOF : ApduHelper.R_APDU_OK;
    byte[] response = new byte[realLength + status.length];

    System.arraycopy(fullResponse, offset, response, 0, realLength);
    System.arraycopy(status, 0, response, realLength, status.length);

    this.hceModel.getLastState()
      .setValue(HceViewModel.HCE_STATE_READ);

    return response;
  }

  private NdefEntity tryHandleSavedTag() {
    NdefEntity nm;

    try {
      int nlen = Integer.parseInt(BinaryUtils.ByteArrayToHexString(Arrays.copyOfRange(this.ndefDataBuffer, 0, 2)), 16);
      if (nlen > this.ndefDataBuffer.length - 2) return null;
      nm = NdefEntity.fromBytes(Arrays.copyOfRange(this.ndefDataBuffer, 2, 2 + nlen));
    } catch (Exception e) {
      return null;
    }

    return nm;
  }

  private byte[] respondWrite(byte[] command) {
    if (!this.prefManager.getWritable()) {
      return BinaryUtils.HexStringToByteArray("6982");
    }

    if (this.selectedFile != SelectedFile.FILENAME_NDEF) {
      return ApduHelper.R_APDU_ERROR;
    }

    if (command.length < 5) {
      return ApduHelper.R_APDU_WRONG_LENGTH;
    }
    int length = command[4] & 0xFF;
    if (length == 0 || command.length != 5 + length) {
      return ApduHelper.R_APDU_WRONG_LENGTH;
    }
    int offset = ((command[2] & 0xFF) << 8) | (command[3] & 0xFF);
    if (offset >= ndefDataBuffer.length || length > ndefDataBuffer.length - offset) {
      return ApduHelper.R_APDU_WRONG_OFFSET;
    }

    byte[] data = Arrays.copyOfRange(command, 5, 5 + length);
    System.arraycopy(data, 0, ndefDataBuffer, offset, length);

    NdefEntity nm = this.tryHandleSavedTag();

    if (nm != null) {
      this.prefManager.setContent(nm.getContent());
      this.prefManager.setType(nm.getType());
      this.hceModel.getLastState()
        .setValue(HceViewModel.HCE_STATE_WRITE_FULL);
      this.hceModel.getLastState()
        .setValue(HceViewModel.HCE_STATE_UPDATE_APPLICATION);
    } else {
      this.hceModel.getLastState()
        .setValue(HceViewModel.HCE_STATE_WRITE_PARTIAL);
    }

    return ApduHelper.R_APDU_OK;
  }

  public byte[] processCommand(byte[] command) {
    try {
      return dispatchCommand(command);
    } catch (Exception error) {
      Log.w(TAG, "Command failed", error);
      return ApduHelper.R_APDU_UNKNOWN_ERROR;
    }
  }

  private byte[] dispatchCommand(byte[] command) {
    if (command == null || command.length < 2) {
      return ApduHelper.R_APDU_WRONG_LENGTH;
    }
    if (ApduHelper.commandByRangeEquals(command, 0, 2, ApduHelper.C_APDU_READ)) {
      return this.respondRead(command);
    }

    if (ApduHelper.commandByRangeEquals(command, 0, 2, ApduHelper.C_APDU_WRITE)) {
      return this.respondWrite(command);
    }

    if (command.length < 4) {
      return ApduHelper.R_APDU_WRONG_LENGTH;
    }
    if (command[0] == 0 && command[1] == (byte) 0xA4) {
      if (command[2] != 0 || command[3] != 0x0C) {
        return ApduHelper.R_APDU_WRONG_PARAMETERS;
      }
      return this.respondSelectFile(command);
    }

    Log.i(TAG, "Unknown command.");

    return ApduHelper.R_APDU_ERROR;
  }

  @Override
  public void onDestroy(int reason) {
    this.selectedFile = null;
    this.hceModel.getLastState()
      .setValue(HceViewModel.HCE_STATE_DISCONNECTED);
  }
}
