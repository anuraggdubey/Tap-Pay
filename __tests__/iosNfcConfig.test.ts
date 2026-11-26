import fs from 'fs';
import path from 'path';

const read = (file: string) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

it('declares a meaningful NFC reader purpose and the ISO7816 application selected by the reader', () => {
  const plist = read('ios/TapPay/Info.plist');
  expect(plist).toMatch(/<key>NFCReaderUsageDescription<\/key>\s*<string>[^<]+wallet address[^<]+<\/string>/);
  const select = read('src/utils/type4Nfc.ts').match(/TYPE4_NDEF_APP_AID = \[([^\]]+)\]/)![1];
  const bytes = select.match(/0x[\da-f]+/gi)!.map(byte => parseInt(byte, 16));
  const aid = bytes.slice(5, 5 + bytes[4]).map(byte => byte.toString(16).padStart(2, '0')).join('').toUpperCase();
  expect(aid).toBe('D2760000850101');
  expect(plist).toMatch(new RegExp(`<key>com.apple.developer.nfc.readersession.iso7816.select-identifiers</key>\\s*<array>\\s*<string>${aid}</string>`));
});

it('signs both build configurations with the TAG reader entitlement', () => {
  expect(read('ios/TapPay/TapPay.entitlements')).toMatch(/<key>com.apple.developer.nfc.readersession.formats<\/key>\s*<array>\s*<string>TAG<\/string>/);
  const project = read('ios/TapPay.xcodeproj/project.pbxproj');
  expect(project.match(/CODE_SIGN_ENTITLEMENTS = TapPay\/TapPay.entitlements;/g)).toHaveLength(2);
  expect(project).toContain('com.apple.NearFieldCommunicationTagReading');
});
