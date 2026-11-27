/*
 * Copyright (c) 2020-2022 Mateusz Falkowski (appidea.pl) and contributors. All rights reserved.
 * This file is part of "react-native-hce" library: https://github.com/appidea/react-native-hce
 * Licensed under the MIT license. See LICENSE file in the project root for details.
 */

package com.reactnativehce.apps.nfc;

import android.nfc.NdefMessage;
import android.nfc.NdefRecord;

import java.math.BigInteger;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;

import com.reactnativehce.utils.ByteArrayOperations;

public class NdefEntity {
  private final NdefMessage message;
  private final String type;
  private final String content;

  public NdefEntity(String type, String content) {
    this.type = type;
    this.content = content;

    NdefRecord record;

    if (type.equals("text")) {
      record = NdefRecord.createTextRecord("en", content);
    } else if (type.equals("url")) {
      record = NdefRecord.createUri(content);
    } else {
      throw new IllegalArgumentException("Wrong NFC tag content type");
    }

    this.message = new NdefMessage(record);
  }

  public String getType() {
    return this.type;
  }

  public String getContent() {
    return this.content;
  }

  public byte[] getNdefContent() {
    byte[] payload = this.message.toByteArray();
    byte[] messageLength = ByteArrayOperations.fillByteArrayToFixedDimension(
      BigInteger.valueOf(this.message.getByteArrayLength()).toByteArray(),
      2
    );

    byte[] fullResponse = new byte[messageLength.length + payload.length];
    System.arraycopy(messageLength, 0, fullResponse, 0, messageLength.length);
    System.arraycopy(payload,0, fullResponse, messageLength.length, payload.length);

    return fullResponse;
  }

  public static NdefEntity fromBytes(byte[] bytes) throws Exception {
    NdefMessage message = new NdefMessage(bytes);
    NdefRecord record = message.getRecords()[0];

    byte[] payload = record.getPayload();

    if (record.getTnf() == NdefRecord.TNF_WELL_KNOWN && Arrays.equals(record.getType(), NdefRecord.RTD_TEXT)) {
      if (payload == null || payload.length == 0) {
        throw new Exception("Invalid NDEF text record");
      }
      int status = payload[0] & 0xFF;
      boolean isUtf16 = (status & 0x80) != 0;
      int langLen = status & 0x3F;
      int textStart = 1 + langLen;
      if (textStart > payload.length) {
        throw new Exception("Invalid NDEF text language length");
      }
      String content = new String(
        Arrays.copyOfRange(payload, textStart, payload.length),
        isUtf16 ? StandardCharsets.UTF_16 : StandardCharsets.UTF_8
      );
      return new NdefEntity("text", content);
    } else if (record.getTnf() == NdefRecord.TNF_WELL_KNOWN && Arrays.equals(record.getType(), NdefRecord.RTD_URI)) {
      String content = record.toUri().toString();
      return new NdefEntity("url", content);
    }

    throw new Exception("Unexpected NDEF type");
  }
}
