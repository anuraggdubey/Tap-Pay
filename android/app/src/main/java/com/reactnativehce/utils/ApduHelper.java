/*
 * Copyright (c) 2020-2022 Mateusz Falkowski (appidea.pl) and contributors. All rights reserved.
 * This file is part of "react-native-hce" library: https://github.com/appidea/react-native-hce
 * Licensed under the MIT license. See LICENSE file in the project root for details.
 */

package com.reactnativehce.utils;

import com.reactnativehce.utils.BinaryUtils;

import java.util.Arrays;

public class ApduHelper {
  public static final byte[] C_APDU_SELECT_APP = BinaryUtils.HexStringToByteArray("00A40400");
  public static final byte[] C_APDU_SELECT_FILE = BinaryUtils.HexStringToByteArray("00A4000C02");
  public static final byte[] C_APDU_READ = BinaryUtils.HexStringToByteArray("00B0");
  public static final byte[] C_APDU_WRITE = BinaryUtils.HexStringToByteArray("00D6");
  public static final byte[] R_APDU_OK = BinaryUtils.HexStringToByteArray("9000");
  public static final byte[] R_APDU_ERROR = BinaryUtils.HexStringToByteArray("6A82");
  public static final byte[] R_APDU_WRONG_LENGTH = BinaryUtils.HexStringToByteArray("6700");
  public static final byte[] R_APDU_WRONG_OFFSET = BinaryUtils.HexStringToByteArray("6B00");
  public static final byte[] R_APDU_WRONG_PARAMETERS = BinaryUtils.HexStringToByteArray("6A86");
  public static final byte[] R_APDU_EOF = BinaryUtils.HexStringToByteArray("6282");
  public static final byte[] R_APDU_UNKNOWN_ERROR = BinaryUtils.HexStringToByteArray("6F00");

  public static Boolean commandByRangeEquals(byte[] command, Integer from, Integer to, byte[] expectedCommand) {
    return command != null && expectedCommand != null && from != null && to != null
      && from >= 0 && to >= from && to <= command.length
      && Arrays.equals(Arrays.copyOfRange(command, from, to), expectedCommand);
  }
}
