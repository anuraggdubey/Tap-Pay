const mockRpc = jest.fn();
const mockInvoke = jest.fn();
jest.mock('../../src/config/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: jest.fn(),
    functions: {invoke: (...args: unknown[]) => mockInvoke(...args)},
  },
}));
const mockLoadPrivateKey = jest.fn();
jest.mock('../../src/services/wallet', () => ({
  loadPrivateKey: (...args: unknown[]) => mockLoadPrivateKey(...args),
}));

import {registerUsername, resolveUsername, reverseResolveAddress} from '../../src/services/registry';
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

describe('registerUsername error handling', () => {
  const TEST_KEY = '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  it('surfaces gateway JSON message when body.error is absent', async () => {
    mockLoadPrivateKey.mockResolvedValue(TEST_KEY);
    mockInvoke.mockResolvedValue({
      data: null,
      error: {
        message: 'Edge Function returned a non-2xx status code',
        context: {
          json: async () => ({code: 'NOT_FOUND', message: 'Requested function was not found'}),
        },
      },
    });

    const result = await registerUsername('alice');
    expect(result.error).toBe('Requested function was not found');
  });

  it('prefers body.error over body.message when both are present', async () => {
    mockLoadPrivateKey.mockResolvedValue(TEST_KEY);
    mockInvoke.mockResolvedValue({
      data: null,
      error: {
        message: 'Edge Function returned a non-2xx status code',
        context: {
          json: async () => ({error: 'That username is reserved.', message: 'Bad Request'}),
        },
      },
    });

    const result = await registerUsername('admin');
    expect(result.error).toBe('That username is reserved.');
  });
});
