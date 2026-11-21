/**
 * Client for the `passkey-recovery` Edge Function. The server only ever sees ciphertext, the
 * credential id, the wallet address and a wallet signature. Never keys, phrases or PRF output.
 */

import {supabase} from '../../config/supabase';
import {PASSKEY_FUNCTION} from '../../config/passkey';
import {PasskeyRecoveryError, RecoveryBlob} from './crypto';
import {PasskeyProofAction} from './message';

export type StoredBlob = RecoveryBlob & {walletAddress: string; updatedAt?: string};

export type WriteParams = {
  action: PasskeyProofAction;
  credentialId: string;
  walletAddress: string;
  digest: string;
  issuedAt: string;
  signature: string;
  blob?: RecoveryBlob;
};

export interface PasskeyRecoveryApi {
  put(params: WriteParams): Promise<void>;
  remove(params: WriteParams): Promise<void>;
  get(credentialId: string): Promise<StoredBlob>;
}

async function invoke(body: Record<string, unknown>): Promise<any> {
  const {data, error} = await supabase.functions.invoke(PASSKEY_FUNCTION, {body});
  if (error) {
    let status: number | undefined;
    try {
      status = (error as any).context?.status;
    } catch {
      status = undefined;
    }
    if (status === 404) {
      throw new PasskeyRecoveryError('NOT_FOUND', 'No recovery data was found for this passkey.');
    }
    if (status === 401) {
      throw new PasskeyRecoveryError('AUTH_FAILED', 'Could not verify this wallet.');
    }
    throw new PasskeyRecoveryError('NETWORK', 'Could not reach the recovery service. Try again.');
  }
  return data;
}

export const supabasePasskeyApi: PasskeyRecoveryApi = {
  async put(params) {
    await invoke({...params});
  },
  async remove(params) {
    await invoke({...params});
  },
  async get(credentialId) {
    const data = await invoke({action: 'get', credentialId});
    if (
      !data ||
      typeof data.ciphertext !== 'string' ||
      typeof data.nonce !== 'string' ||
      typeof data.walletAddress !== 'string' ||
      typeof data.version !== 'number'
    ) {
      throw new PasskeyRecoveryError('NOT_FOUND', 'No recovery data was found for this passkey.');
    }
    return {
      ciphertext: data.ciphertext,
      nonce: data.nonce,
      version: data.version,
      walletAddress: data.walletAddress,
      updatedAt: data.updatedAt,
    };
  },
};
