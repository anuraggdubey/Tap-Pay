const mockRpc = jest.fn();
jest.mock('../../src/config/supabase', () => ({
  supabase: {rpc: (...args: unknown[]) => mockRpc(...args), from: jest.fn(), functions: {invoke: jest.fn()}},
}));
jest.mock('../../src/services/wallet', () => ({loadPrivateKey: jest.fn()}));

import {resolveUsername, reverseResolveAddress} from '../../src/services/registry';
import {supabase} from '../../src/config/supabase';

const ADDRESS = '0x1111111111111111111111111111111111111111';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('username lookups use exact-match RPCs', () => {
  it('resolves a username through resolve_username with the normalized name', async () => {
    mockRpc.mockResolvedValue({data: ADDRESS, error: null});
    await expect(resolveUsername('Al1ce')).resolves.toBe(ADDRESS);
    // normalizeUsername: lowercase, 1 -> l, 0 -> o
    expect(mockRpc).toHaveBeenCalledWith('resolve_username', {p_username: 'allce'});
  });

  it('reverse-resolves a lower-cased address through reverse_resolve_address', async () => {
    mockRpc.mockResolvedValue({data: 'alice', error: null});
    await expect(reverseResolveAddress(ADDRESS.toUpperCase().replace('0X', '0x'))).resolves.toBe('alice');
    expect(mockRpc).toHaveBeenCalledWith('reverse_resolve_address', {p_address: ADDRESS});
  });

  it('returns null for unknown names, errors and unexpected shapes', async () => {
    mockRpc.mockResolvedValueOnce({data: null, error: null});
    await expect(resolveUsername('nobody')).resolves.toBeNull();
    mockRpc.mockResolvedValueOnce({data: null, error: {message: 'boom'}});
    await expect(resolveUsername('alice')).resolves.toBeNull();
    mockRpc.mockResolvedValueOnce({data: [{wallet_address: ADDRESS}], error: null});
    await expect(reverseResolveAddress(ADDRESS)).resolves.toBeNull();
    mockRpc.mockRejectedValueOnce(new Error('network'));
    await expect(resolveUsername('alice')).resolves.toBeNull();
  });

  it('never selects from the usernames table', async () => {
    mockRpc.mockResolvedValue({data: null, error: null});
    await resolveUsername('alice');
    await reverseResolveAddress(ADDRESS);
    expect(supabase.from).not.toHaveBeenCalled();
  });
});
