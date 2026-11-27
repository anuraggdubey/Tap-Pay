import {NativeModules, Platform} from 'react-native';
import {HCESession, NFCTagType4} from 'react-native-hce';
import {createHceReceiverLease, stopHceSession} from '../../src/services/hce';
import {SESSION_TIMEOUT_MS} from '../../src/config/monad';

const A = '0x1111111111111111111111111111111111111111';
const B = '0x2222222222222222222222222222222222222222';
const session = {enabled: false, setApplication: jest.fn(), setEnabled: jest.fn()};
let content = '';
let releases: Array<() => void>;

function deferred() {
  let resolve: () => void = () => {};
  const promise = new Promise<void>(done => { resolve = done; });
  releases.push(resolve);
  return {promise, resolve};
}
async function advance(ms: number) {
  await jest.advanceTimersByTimeAsync(ms);
}

beforeEach(() => {
  jest.useFakeTimers({doNotFake: ['queueMicrotask']});
  jest.setSystemTime(0);
  jest.clearAllMocks();
  releases = [];
  content = '';
  session.enabled = false;
  session.setApplication.mockReset().mockImplementation(async tag => { content = tag.content.content; });
  session.setEnabled.mockReset().mockImplementation(async enabled => { session.enabled = enabled; });
  (HCESession.getInstance as jest.Mock).mockResolvedValue(session);
  (NFCTagType4 as unknown as jest.Mock).mockImplementation(props => ({content: props}));
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(async () => {
  try {
    releases.forEach(resolve => resolve());
    await stopHceSession();
    await advance(600);
    expect(session.enabled).toBe(false);
    expect(jest.getTimerCount()).toBe(0);
  } finally {
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  }
});

it('invalidates a lease synchronously before async initialization starts', async () => {
  const a = createHceReceiverLease();
  await a.stop();
  expect(await a.start(A)).toBe(false);
  expect(session.setApplication).not.toHaveBeenCalled();
  expect(session.setEnabled).not.toHaveBeenCalledWith(true);
});

it('does not let a late initialization claim ownership back from B', async () => {
  const a = createHceReceiverLease();
  const b = createHceReceiverLease();
  const started = b.start(B);
  await advance(600);
  expect(await started).toBe(true);
  expect(await a.start(A)).toBe(false);
  await a.stop();
  expect(content).toBe(`tappay://tap/${B}`);
  expect(session.enabled).toBe(true);
});

it('never enables a start cancelled during the SharedPreferences delay', async () => {
  const a = createHceReceiverLease();
  const started = a.start(A);
  await advance(0);
  expect(content).toBe(`tappay://tap/${A}`);
  await a.stop();
  await advance(600);
  expect(await started).toBe(false);
  expect(session.setEnabled).not.toHaveBeenCalledWith(true);
});

it('serializes a pending application write before B configures and enables', async () => {
  const pending = deferred();
  session.setApplication.mockImplementationOnce(async tag => {
    await pending.promise;
    content = tag.content.content;
  });
  const a = createHceReceiverLease();
  const oldStart = a.start(A);
  await advance(0);
  const oldStop = a.stop();
  const b = createHceReceiverLease();
  const newStart = b.start(B);
  await advance(600);
  expect(session.setApplication).toHaveBeenCalledTimes(1);
  expect(session.setEnabled).not.toHaveBeenCalledWith(true);
  pending.resolve();
  await advance(600);
  expect(await oldStart).toBe(false);
  await oldStop;
  expect(await newStart).toBe(true);
  expect(content).toBe(`tappay://tap/${B}`);
  expect(session.enabled).toBe(true);
});

it('serializes an in-flight enable and disables it before enabling B', async () => {
  const pending = deferred();
  let firstEnable = true;
  session.setEnabled.mockImplementation(async enabled => {
    if (enabled && firstEnable) {
      firstEnable = false;
      await pending.promise;
    }
    session.enabled = enabled;
  });
  const a = createHceReceiverLease();
  const oldStart = a.start(A);
  await advance(100);
  const oldStop = a.stop();
  const b = createHceReceiverLease();
  const newStart = b.start(B);
  await advance(600);
  expect(session.setApplication).toHaveBeenCalledTimes(1);
  pending.resolve();
  await advance(600);
  expect(await oldStart).toBe(false);
  await oldStop;
  expect(await newStart).toBe(true);
  expect(content).toBe(`tappay://tap/${B}`);
  expect(session.enabled).toBe(true);
  expect(session.setEnabled.mock.calls.map(([enabled]) => enabled)).toEqual([false, true, false, true]);
});

it('serializes an in-flight stop before B can enable', async () => {
  const a = createHceReceiverLease();
  const oldStart = a.start(A);
  await advance(600);
  expect(await oldStart).toBe(true);
  const pending = deferred();
  session.setEnabled.mockImplementationOnce(async enabled => {
    await pending.promise;
    session.enabled = enabled;
  });
  const oldStop = a.stop();
  await advance(0);
  const b = createHceReceiverLease();
  const newStart = b.start(B);
  await advance(600);
  expect(content).toBe(`tappay://tap/${A}`);
  pending.resolve();
  await advance(600);
  await oldStop;
  expect(await newStart).toBe(true);
  expect(content).toBe(`tappay://tap/${B}`);
  expect(session.enabled).toBe(true);
});

it('does not let A\'s expiry or repeated cleanup stop B', async () => {
  const a = createHceReceiverLease();
  const oldStart = a.start(A, 1000);
  await advance(600);
  expect(await oldStart).toBe(true);
  const b = createHceReceiverLease();
  const newStart = b.start(B);
  await advance(600);
  expect(await newStart).toBe(true);
  const writes = session.setEnabled.mock.calls.length;
  await a.stop();
  await a.stop();
  await advance(1000);
  expect(session.setEnabled).toHaveBeenCalledTimes(writes);
  expect(session.enabled).toBe(true);
  expect(content).toBe(`tappay://tap/${B}`);
});

it.each([0, -1])('refuses to enable after an elapsed deadline (%s)', async deadline => {
  const started = createHceReceiverLease().start(A, deadline);
  await advance(600);
  expect(await started).toBe(false);
  expect(session.setEnabled).not.toHaveBeenCalledWith(true);
});

it('expires only the owner at its explicit deadline', async () => {
  const started = createHceReceiverLease().start(A, 1000);
  await advance(600);
  expect(await started).toBe(true);
  await advance(400);
  expect(session.enabled).toBe(false);
  expect(jest.getTimerCount()).toBe(0);
});

it('retains the default timeout after registration without an explicit deadline', async () => {
  const started = createHceReceiverLease().start(A);
  await advance(600);
  expect(await started).toBe(true);
  await advance(SESSION_TIMEOUT_MS - 1);
  expect(session.enabled).toBe(true);
  await advance(1);
  expect(session.enabled).toBe(false);
});

it('contains application errors without poisoning B\'s native queue', async () => {
  session.setApplication.mockRejectedValueOnce(new Error('native write failed'));
  expect(await createHceReceiverLease().start(A)).toBe(false);
  const started = createHceReceiverLease().start(B);
  await advance(600);
  expect(await started).toBe(true);
  expect(content).toBe(`tappay://tap/${B}`);
  expect(session.enabled).toBe(true);
});

it('contains stop errors without poisoning B\'s native queue', async () => {
  const a = createHceReceiverLease();
  const started = a.start(A);
  await advance(600);
  expect(await started).toBe(true);
  session.setEnabled.mockRejectedValueOnce(new Error('native stop failed'));
  await a.stop();
  const next = createHceReceiverLease().start(B);
  await advance(600);
  expect(await next).toBe(true);
  expect(session.enabled).toBe(true);
  expect(content).toBe(`tappay://tap/${B}`);
});

it('sets and unsets TapHcePreference on Android start and stop (#119)', async () => {
  const originalOs = Platform.OS;
  const originalModule = NativeModules.TapHcePreference;
  const setPreferredService = jest.fn().mockResolvedValue(true);
  const unsetPreferredService = jest.fn().mockResolvedValue(true);
  Object.defineProperty(Platform, 'OS', {value: 'android', configurable: true});
  NativeModules.TapHcePreference = {setPreferredService, unsetPreferredService};

  try {
    const lease = createHceReceiverLease();
    const started = lease.start(A);
    await advance(600);
    expect(await started).toBe(true);
    expect(setPreferredService).toHaveBeenCalledTimes(1);

    await lease.stop();
    expect(unsetPreferredService).toHaveBeenCalledTimes(1);
  } finally {
    Object.defineProperty(Platform, 'OS', {value: originalOs, configurable: true});
    NativeModules.TapHcePreference = originalModule;
  }
});
