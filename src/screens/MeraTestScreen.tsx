/**
 * MeraTestScreen — Debug Screen for Passkey Testing
 *
 * This screen is for DEVELOPMENT ONLY. It lets you test:
 *   1. Mera passkey registration (Face ID / Fingerprint)
 *   2. Mera passkey login (recover existing account)
 *   3. Message signing via Mera-derived wallet
 *   4. Balance fetching with the Mera address
 *
 * This is Aditya's file (Rule 4). It does NOT modify any existing screen.
 * To use: Import this in App.tsx temporarily for testing, or have Anurag
 * add a hidden debug button to navigate here.
 *
 * HOW TO TEST:
 *   1. In App.tsx, temporarily wrap this component as the main screen
 *   2. Build and run on a physical Android device with biometrics
 *   3. Tap "Register" → Face ID / Fingerprint prompt
 *   4. Note the address returned
 *   5. Kill app → reopen → tap "Login" → should recover same address
 */

import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as meraAuth from '../services/mera/meraAuth';
import {getMeraSigner, signMessageWithMera} from '../services/mera/meraSigner';

// ─── Types ────────────────────────────────────────────────────────

interface LogEntry {
  id: number;
  timestamp: string;
  type: 'info' | 'success' | 'error' | 'warn';
  message: string;
}

// ─── Component ────────────────────────────────────────────────────

export default function MeraTestScreen() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState('');
  const [address, setAddress] = useState<string | null>(null);

  let logId = 0;

  function addLog(type: LogEntry['type'], message: string) {
    const entry: LogEntry = {
      id: ++logId,
      timestamp: new Date().toLocaleTimeString(),
      type,
      message,
    };
    setLogs(prev => [entry, ...prev]);
  }

  // ── Test 1: Register ──────────────────────────────────────────

  async function testRegister() {
    setIsLoading(true);
    setLoadingAction('Registering passkey...');
    addLog('info', '🔑 Starting passkey registration...');
    addLog('info', 'Waiting for Face ID / Fingerprint prompt...');

    try {
      const result = await meraAuth.register('TapPay Test User');

      if (result.error) {
        addLog('error', `❌ Registration failed: ${result.error}`);
      } else {
        setAddress(result.address);
        addLog('success', `✅ Registration successful!`);
        addLog('success', `📍 Address: ${result.address}`);
        addLog('info', `🆕 New account: ${result.isNewAccount}`);
      }
    } catch (err: any) {
      addLog('error', `💥 Unexpected error: ${err.message}`);
    } finally {
      setIsLoading(false);
      setLoadingAction('');
    }
  }

  // ── Test 2: Login ─────────────────────────────────────────────

  async function testLogin() {
    setIsLoading(true);
    setLoadingAction('Logging in with passkey...');
    addLog('info', '🔐 Starting passkey login...');
    addLog('info', 'Waiting for Face ID / Fingerprint prompt...');

    try {
      const result = await meraAuth.login();

      if (result.error) {
        addLog('error', `❌ Login failed: ${result.error}`);
      } else {
        setAddress(result.address);
        addLog('success', `✅ Login successful!`);
        addLog('success', `📍 Address: ${result.address}`);
        addLog('info', `🔄 Existing account recovered`);
      }
    } catch (err: any) {
      addLog('error', `💥 Unexpected error: ${err.message}`);
    } finally {
      setIsLoading(false);
      setLoadingAction('');
    }
  }

  // ── Test 3: Sign Message ──────────────────────────────────────

  async function testSignMessage() {
    if (!meraAuth.isAuthenticated()) {
      addLog('warn', '⚠️ Not authenticated. Register or login first.');
      return;
    }

    setIsLoading(true);
    setLoadingAction('Signing message...');
    addLog('info', '✍️ Signing test message: "Hello TapPay"');

    try {
      const signature = await signMessageWithMera('Hello TapPay');
      if (signature) {
        addLog('success', `✅ Message signed!`);
        addLog('success', `📝 Signature: ${signature.slice(0, 30)}...`);
      } else {
        addLog('error', '❌ Signing returned null — session may have expired.');
      }
    } catch (err: any) {
      addLog('error', `💥 Signing error: ${err.message}`);
    } finally {
      setIsLoading(false);
      setLoadingAction('');
    }
  }

  // ── Test 4: Get Signer ────────────────────────────────────────

  async function testGetSigner() {
    if (!meraAuth.isAuthenticated()) {
      addLog('warn', '⚠️ Not authenticated. Register or login first.');
      return;
    }

    addLog('info', '🔧 Creating ethers.js Signer from Mera session...');

    try {
      const signer = getMeraSigner();
      if (signer) {
        const signerAddress = await signer.getAddress();
        addLog('success', `✅ Signer created!`);
        addLog('success', `📍 Signer address: ${signerAddress}`);

        // Check balance
        const balance = await signer.provider!.getBalance(signerAddress);
        const balanceMon = (Number(balance) / 1e18).toFixed(6);
        addLog('info', `💰 MON Balance: ${balanceMon}`);
      } else {
        addLog('error', '❌ getMeraSigner() returned null');
      }
    } catch (err: any) {
      addLog('error', `💥 Signer error: ${err.message}`);
    }
  }

  // ── Test 5: Check State ───────────────────────────────────────

  function testCheckState() {
    addLog('info', '📊 Current Mera State:');
    addLog('info', `  Authenticated: ${meraAuth.isAuthenticated()}`);
    addLog('info', `  Address: ${meraAuth.getAddress() || 'none'}`);
    addLog('info', `  Session: ${meraAuth.getSession() ? 'active' : 'none'}`);
  }

  // ── Test 6: Logout ────────────────────────────────────────────

  function testLogout() {
    meraAuth.logout();
    setAddress(null);
    addLog('info', '🚪 Logged out. Session cleared.');
  }

  // ── Render ────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔑 Mera Passkey Test</Text>
      <Text style={styles.subtitle}>
        {address
          ? `Connected: ${address.slice(0, 8)}...${address.slice(-6)}`
          : 'Not authenticated'}
      </Text>

      {isLoading && (
        <View style={styles.loadingBar}>
          <ActivityIndicator color="#7C3AED" />
          <Text style={styles.loadingText}>{loadingAction}</Text>
        </View>
      )}

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.btn, styles.btnPrimary]}
          onPress={testRegister}
          disabled={isLoading}>
          <Text style={styles.btnText}>🆕 Register</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, styles.btnPrimary]}
          onPress={testLogin}
          disabled={isLoading}>
          <Text style={styles.btnText}>🔐 Login</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.btn, styles.btnSecondary]}
          onPress={testSignMessage}
          disabled={isLoading}>
          <Text style={styles.btnText}>✍️ Sign</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, styles.btnSecondary]}
          onPress={testGetSigner}
          disabled={isLoading}>
          <Text style={styles.btnText}>🔧 Signer</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.btn, styles.btnMuted]}
          onPress={testCheckState}>
          <Text style={styles.btnText}>📊 State</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, styles.btnDanger]}
          onPress={testLogout}>
          <Text style={styles.btnText}>🚪 Logout</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.logHeader}>📋 Logs</Text>
      <ScrollView style={styles.logContainer}>
        {logs.map((entry, i) => (
          <Text
            key={`${entry.timestamp}-${i}`}
            style={[
              styles.logEntry,
              entry.type === 'success' && styles.logSuccess,
              entry.type === 'error' && styles.logError,
              entry.type === 'warn' && styles.logWarn,
            ]}>
            [{entry.timestamp}] {entry.message}
          </Text>
        ))}
        {logs.length === 0 && (
          <Text style={styles.logEmpty}>
            No logs yet. Tap a button above to start testing.
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F14',
    padding: 20,
    paddingTop: 50,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: 'monospace',
  },
  loadingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a2e',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  loadingText: {
    color: '#C4B5FD',
    marginLeft: 10,
    fontSize: 14,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  btn: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnPrimary: {
    backgroundColor: '#7C3AED',
  },
  btnSecondary: {
    backgroundColor: '#1E3A5F',
  },
  btnMuted: {
    backgroundColor: '#2A2A3D',
  },
  btnDanger: {
    backgroundColor: '#991B1B',
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  logHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  logContainer: {
    flex: 1,
    backgroundColor: '#0A0A10',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1F1F2E',
  },
  logEntry: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 4,
    fontFamily: 'monospace',
    lineHeight: 18,
  },
  logSuccess: {
    color: '#34D399',
  },
  logError: {
    color: '#F87171',
  },
  logWarn: {
    color: '#FBBF24',
  },
  logEmpty: {
    color: '#4B5563',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 20,
  },
});
