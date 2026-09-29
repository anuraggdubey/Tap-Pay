module.exports = {
  createPasskeyWithPrfOutput: jest.fn().mockResolvedValue({
    credentialId: 'test-credential',
    prfOutput: new Uint8Array(32),
  }),
  getPasskeyPrfOutput: jest.fn().mockResolvedValue({
    credentialId: 'test-credential',
    prfOutput: new Uint8Array(32),
  }),
};
