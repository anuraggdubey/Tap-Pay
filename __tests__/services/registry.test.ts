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

import {
  registerUsername,
  resolveUsername,
  resolveUsernameDetails,
  reverseResolveAddress,
} from '../../src/services/registry';
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

  it('ignores non-string gateway message values and falls back to error.message', async () => {
    mockLoadPrivateKey.mockResolvedValue(TEST_KEY);
    mockInvoke.mockResolvedValue({
      data: null,
      error: {
        message: 'Edge Function returned a non-2xx status code',
        context: {
          json: async () => ({code: 'ERR', message: {nested: 'object'}}),
        },
      },
    });

    const result = await registerUsername('alice');
    expect(result.error).toBe('Edge Function returned a non-2xx status code');
  });
});

describe('resolveUsernameDetails (#129)', () => {
  it('returns the wallet and registration time from resolve_username_details', async () => {
    mockRpc.mockResolvedValue({data: [{wallet_address: ADDRESS, registered_at: '2026-01-02T03:04:05+00:00'}], error: null});
    await expect(resolveUsernameDetails('Al1ce')).resolves.toEqual({
      address: ADDRESS,
      registeredAt: '2026-01-02T03:04:05+00:00',
    });
    expect(mockRpc).toHaveBeenCalledWith('resolve_username_details', {p_username: 'allce'});
    expect(mockRpc).toHaveBeenCalledTimes(1);
  });

  it('returns null for an unknown handle without a second lookup', async () => {
    mockRpc.mockResolvedValue({data: [], error: null});
    await expect(resolveUsernameDetails('nobody')).resolves.toBeNull();
    expect(mockRpc).toHaveBeenCalledTimes(1);
  });

  it('falls back to resolve_username on backends without migration 011', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockRpc
      .mockResolvedValueOnce({data: null, error: {code: 'PGRST202', message: 'function not found'}})
      .mockResolvedValueOnce({data: ADDRESS, error: null});
    await expect(resolveUsernameDetails('alice')).resolves.toEqual({address: ADDRESS, registeredAt: null});
    expect(mockRpc).toHaveBeenLastCalledWith('resolve_username', {p_username: 'alice'});
  });
});

describe('registerUsername cooldown (#129)', () => {
  const TEST_KEY = '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  it('explains a recently released handle and suggests others', async () => {
    mockLoadPrivateKey.mockResolvedValue(TEST_KEY);
    const body = {error: 'This username was released recently and cannot be registered yet. Please choose another.', reason: 'released_recently'};
    mockInvoke.mockResolvedValue({data: null, error: {message: 'non-2xx', context: {json: async () => body}}});
    mockRpc.mockResolvedValue({data: null, error: null});
    const result = await registerUsername('alice');
    expect(result.error).toMatch(/released recently/);
    expect(Array.isArray(result.suggestions)).toBe(true);
  });
});
