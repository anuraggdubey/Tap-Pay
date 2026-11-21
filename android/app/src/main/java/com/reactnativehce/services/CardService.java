/*
 * Copyright (c) 2020-2022 Mateusz Falkowski (appidea.pl) and contributors. All rights reserved.
 * This file is part of "react-native-hce" library: https://github.com/appidea/react-native-hce
 * Licensed under the MIT license. See LICENSE file in the project root for details.
 */

package com.reactnativehce.services;

import android.content.Context;
import android.nfc.cardemulation.HostApduService;
import android.os.Bundle;
import android.util.Log;

import com.reactnativehce.utils.ApduHelper;
import com.reactnativehce.managers.HceViewModel;
import com.reactnativehce.IHCEApplication;
import com.reactnativehce.managers.PrefManager;
import com.reactnativehce.apps.nfc.NFCTagType4;

import java.util.ArrayList;

public class CardService extends HostApduService {
    private static final String TAG = "CardService";

    private final ArrayList<IHCEApplication> registeredHCEApplications = new ArrayList<>();
    private IHCEApplication currentHCEApplication = null;

    @Override
    public byte[] processCommandApdu(byte[] command, Bundle extras) {
      try {
        return dispatchCommand(command);
      } catch (Exception error) {
        Log.w(TAG, "Command failed", error);
        return ApduHelper.R_APDU_UNKNOWN_ERROR;
      }
    }

    private byte[] dispatchCommand(byte[] command) {
      if (currentHCEApplication != null) {
        return currentHCEApplication.processCommand(command);
      }

      if (command == null || command.length < 4) {
        return ApduHelper.R_APDU_WRONG_LENGTH;
      }
      if (ApduHelper.commandByRangeEquals(command, 0, 4, ApduHelper.C_APDU_SELECT_APP)) {
        if (command.length < 5) {
          return ApduHelper.R_APDU_WRONG_LENGTH;
        }
        int length = command[4] & 0xFF;
        if (length == 0 || (command.length != 5 + length && command.length != 6 + length)) {
          return ApduHelper.R_APDU_WRONG_LENGTH;
        }
        for (IHCEApplication app : registeredHCEApplications) {
          if (app.assertSelectCommand(command)) {
            currentHCEApplication = app;
            return ApduHelper.R_APDU_OK;
          }
        }
      }

      return ApduHelper.R_APDU_ERROR;
    }

    @Override
    public void onCreate() {
      Log.d(TAG, "Starting service");
      Context context = getApplicationContext();

      registeredHCEApplications.add(new NFCTagType4(
        PrefManager.getInstance(context),
        HceViewModel.getInstance(context)
      ));
    }

    @Override
    public void onDeactivated(int reason) {
      Log.d(TAG, "Deactivated: reason=" + reason);
      if (this.currentHCEApplication != null) {
        this.currentHCEApplication.onDestroy(reason);
        this.currentHCEApplication = null;
      }
    }
}
