// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';
import sinon from 'sinon';

import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';

import * as Emulation from './emulation.js';

function findGooglebookPreset(): Emulation.UserAgentGroups.UserAgentPreset {
  const preset = Emulation.UserAgentGroups.userAgentGroups.flatMap(g => g.values)
                     .find(v => v.title === 'Chrome \u2014 Googlebook');
  assert.isOk(preset);
  return preset;
}

describe('UserAgentGroups', () => {
  it('includes a major-version placeholder in every Chrome preset', () => {
    const {userAgentGroups} = Emulation.UserAgentGroups;
    const chromeUAs = userAgentGroups.flatMap(g => g.values).filter(v => v.value.includes(' Chrome/'));

    assert.isAtLeast(chromeUAs.length, 10);
    assert.isTrue(chromeUAs.every(v => v.value.includes('Chrome/%s')));
  });

  it('uses valid Chrome or CriOS version placeholders in all presets', () => {
    const invalidPresets = Emulation.UserAgentGroups.userAgentGroups.flatMap(g => g.values).filter(v => {
      const parts = v.value.split('%s');
      return parts.length > 3 || (parts.length > 1 && !parts[0].endsWith('Chrome/') && !parts[0].endsWith('CriOS/'));
    });

    assert.isEmpty(invalidPresets);
  });

  it('has unique user agent strings across all presets', () => {
    const values = Emulation.UserAgentGroups.userAgentGroups.flatMap(g => g.values).map(v => v.value);

    assert.lengthOf(new Set(values), values.length);
  });

  it('configures desktop Android client hints for the Googlebook preset', () => {
    const googlebook = findGooglebookPreset();

    assert.strictEqual(
        googlebook.value,
        'Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Safari/537.36');
    assert.strictEqual(googlebook.metadata?.platform, 'Android');
    assert.strictEqual(googlebook.metadata?.architecture, 'x86');
    assert.strictEqual(googlebook.metadata?.bitness, '64');
    assert.strictEqual(googlebook.metadata?.model, '');
    assert.isFalse(googlebook.metadata?.mobile);
  });

  it('computes the Googlebook Android version dynamically when reading its client hints', () => {
    const clock = sinon.useFakeTimers({now: new Date(2026, 8, 1), toFake: ['Date']});
    const googlebook = findGooglebookPreset();

    assert.strictEqual(googlebook.metadata?.platformVersion, '15.0.0');

    clock.setSystemTime(new Date(2026, 9, 1));
    assert.strictEqual(googlebook.metadata?.platformVersion, '16.0.0');
  });

  it('finds a preset matching a patched user agent string', () => {
    sinon.stub(Platform.HostRuntime.HOST_RUNTIME, 'getUserAgent').returns('Mozilla/5.0 Chrome/999.0.0.0');

    const preset = Emulation.UserAgentGroups.findUserAgentPreset(
        'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Googlebot/2.1; +http://www.google.com/bot.html) Chrome/999.0.0.0 Safari/537.36');

    assert.strictEqual(preset?.title, 'Googlebot Desktop');
  });

  it('returns null when no preset matches the user agent string', () => {
    assert.isNull(Emulation.UserAgentGroups.findUserAgentPreset('CustomBot/1.0'));
  });

  it('returns Chrome-patched metadata for a matching preset', () => {
    sinon.stub(Platform.HostRuntime.HOST_RUNTIME, 'getUserAgent').returns('Mozilla/5.0 Chrome/999.0.0.0');
    const ua =
        'Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/999.0.0.0 Mobile Safari/537.36';

    const metadata = Emulation.UserAgentGroups.getUserAgentMetadata(ua);

    assert.isOk(metadata);
    assert.strictEqual(metadata.model, 'Pixel 10');
    assert.strictEqual(metadata.fullVersion, '999.0.0.0');
  });

  it('does not mutate preset metadata when patching Chrome version', () => {
    sinon.stub(Platform.HostRuntime.HOST_RUNTIME, 'getUserAgent').returns('Mozilla/5.0 Chrome/999.0.0.0');
    const ua =
        'Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/999.0.0.0 Mobile Safari/537.36';

    const metadata = Emulation.UserAgentGroups.getUserAgentMetadata(ua);
    const preset = Emulation.UserAgentGroups.findUserAgentPreset(ua);

    assert.isOk(metadata);
    assert.isOk(preset?.metadata);
    assert.notStrictEqual(metadata, preset.metadata);
    assert.strictEqual(preset.metadata.fullVersion, '%s');
    assert.deepEqual(preset.metadata.brands, [
      {brand: 'Not A;Brand', version: '99'},
      {brand: 'Chromium', version: '%s'},
      {brand: 'Google Chrome', version: '%s'},
    ]);
  });

  it('formats all user agent presets against a fixed Chrome version', () => {
    sinon.stub(Platform.HostRuntime.HOST_RUNTIME, 'getUserAgent').returns('Mozilla/5.0 Chrome/999.0.0.0');
    const patchedPresets = Emulation.UserAgentGroups.userAgentGroups.flatMap(
        userAgentDescriptor => userAgentDescriptor.values.map(
            userAgentVersion => ({
              title: userAgentVersion.title,
              value:
                  SDK.NetworkManager.MultitargetNetworkManager.patchUserAgentWithChromeVersion(userAgentVersion.value),
            })));

    assert.deepEqual(patchedPresets, [
      {
        title: 'Android (4.0.2) Browser \u2014 Galaxy Nexus',
        value:
            'Mozilla/5.0 (Linux; U; Android 4.0.2; en-us; Galaxy Nexus Build/ICL53F) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30',
      },
      {
        title: 'Android (2.3) Browser \u2014 Nexus S',
        value:
            'Mozilla/5.0 (Linux; U; Android 2.3.6; en-us; Nexus S Build/GRK39F) AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0 Mobile Safari/533.1',
      },
      {
        title: 'BlackBerry \u2014 BB10',
        value:
            'Mozilla/5.0 (BB10; Touch) AppleWebKit/537.1+ (KHTML, like Gecko) Version/10.0.0.1337 Mobile Safari/537.1+',
      },
      {
        title: 'BlackBerry \u2014 PlayBook 2.1',
        value:
            'Mozilla/5.0 (PlayBook; U; RIM Tablet OS 2.1.0; en-US) AppleWebKit/536.2+ (KHTML, like Gecko) Version/7.2.1.0 Safari/536.2+',
      },
      {
        title: 'BlackBerry \u2014 9900',
        value:
            'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+',
      },
      {
        title: 'Chrome \u2014 Android Mobile',
        value:
            'Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/999.0.0.0 Mobile Safari/537.36',
      },
      {
        title: 'Chrome \u2014 Android Mobile (high-end)',
        value:
            'Mozilla/5.0 (Linux; Android 16; Pixel 10 Pro XL) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/999.0.0.0 Mobile Safari/537.36',
      },
      {
        title: 'Chrome \u2014 Android Tablet',
        value:
            'Mozilla/5.0 (Linux; Android 16; Pixel Tablet) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/999.0.0.0 Safari/537.36',
      },
      {
        title: 'Chrome \u2014 iPhone',
        value:
            'Mozilla/5.0 (iPhone; CPU iPhone OS 26_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/999.0.0.0 Mobile/15E148 Safari/604.1',
      },
      {
        title: 'Chrome \u2014 iPad',
        value:
            'Mozilla/5.0 (iPad; CPU OS 26_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/999.0.0.0 Mobile/15E148 Safari/604.1',
      },
      {
        title: 'Chrome \u2014 Chrome OS',
        value:
            'Mozilla/5.0 (X11; CrOS x86_64 10066.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/999.0.0.0 Safari/537.36',
      },
      {
        title: 'Chrome \u2014 Googlebook',
        value:
            'Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/999.0.0.0 Safari/537.36',
      },
      {
        title: 'Chrome \u2014 Mac',
        value:
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/999.0.0.0 Safari/537.36',
      },
      {
        title: 'Chrome \u2014 Windows',
        value:
            'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/999.0.0.0 Safari/537.36',
      },
      {
        title: 'Firefox \u2014 Android Mobile',
        value: 'Mozilla/5.0 (Android 4.4; Mobile; rv:70.0) Gecko/70.0 Firefox/70.0',
      },
      {
        title: 'Firefox \u2014 Android Tablet',
        value: 'Mozilla/5.0 (Android 4.4; Tablet; rv:70.0) Gecko/70.0 Firefox/70.0',
      },
      {
        title: 'Firefox \u2014 iPhone',
        value:
            'Mozilla/5.0 (iPhone; CPU iPhone OS 8_3 like Mac OS X) AppleWebKit/600.1.4 (KHTML, like Gecko) FxiOS/1.0 Mobile/12F69 Safari/600.1.4',
      },
      {
        title: 'Firefox \u2014 iPad',
        value:
            'Mozilla/5.0 (iPad; CPU iPhone OS 8_3 like Mac OS X) AppleWebKit/600.1.4 (KHTML, like Gecko) FxiOS/1.0 Mobile/12F69 Safari/600.1.4',
      },
      {
        title: 'Firefox \u2014 Mac',
        value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.14; rv:70.0) Gecko/20100101 Firefox/70.0',
      },
      {
        title: 'Firefox \u2014 Windows',
        value: 'Mozilla/5.0 (Windows NT 10.0; WOW64; rv:70.0) Gecko/20100101 Firefox/70.0',
      },
      {
        title: 'Googlebot',
        value: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      },
      {
        title: 'Googlebot Desktop',
        value:
            'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Googlebot/2.1; +http://www.google.com/bot.html) Chrome/999.0.0.0 Safari/537.36',
      },
      {
        title: 'Googlebot Smartphone',
        value:
            'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/999.0.0.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      },
      {
        title: 'Internet Explorer 11',
        value: 'Mozilla/5.0 (Windows NT 10.0; WOW64; Trident/7.0; rv:11.0) like Gecko',
      },
      {
        title: 'Internet Explorer 10',
        value: 'Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.1; WOW64; Trident/6.0)',
      },
      {
        title: 'Internet Explorer 9',
        value: 'Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; Trident/5.0)',
      },
      {
        title: 'Internet Explorer 8',
        value: 'Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 6.0; Trident/4.0)',
      },
      {
        title: 'Internet Explorer 7',
        value: 'Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 6.0)',
      },
      {
        title: 'Microsoft Edge (Chromium) \u2014 Windows',
        value:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/999.0.0.0 Safari/537.36 Edg/999.0.100.0',
      },
      {
        title: 'Microsoft Edge (Chromium) \u2014 Mac',
        value:
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Chrome/999.0.0.0 Safari/604.1 Edg/999.0.100.0',
      },
      {
        title: 'Microsoft Edge \u2014 iPhone',
        value:
            'Mozilla/5.0 (iPhone; CPU iPhone OS 12_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.1.1 EdgiOS/44.5.0.10 Mobile/15E148 Safari/604.1',
      },
      {
        title: 'Microsoft Edge \u2014 iPad',
        value:
            'Mozilla/5.0 (iPad; CPU OS 12_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.0 EdgiOS/44.5.2 Mobile/15E148 Safari/605.1.15',
      },
      {
        title: 'Microsoft Edge \u2014 Android Mobile',
        value:
            'Mozilla/5.0 (Linux; Android 8.1.0; Pixel Build/OPM4.171019.021.D1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/999.0.0.0 Mobile Safari/537.36 EdgA/42.0.0.2057',
      },
      {
        title: 'Microsoft Edge \u2014 Android Tablet',
        value:
            'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 7 Build/MOB30X) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/999.0.0.0 Safari/537.36 EdgA/42.0.0.2057',
      },
      {
        title: 'Microsoft Edge (EdgeHTML) \u2014 Windows',
        value:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/999.0.0.0 Safari/537.36 Edge/18.19042',
      },
      {
        title: 'Microsoft Edge (EdgeHTML) \u2014 XBox',
        value:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; Xbox; Xbox One) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/999.0.0.0 Safari/537.36 Edge/18.19041',
      },
      {
        title: 'Opera \u2014 Mac',
        value:
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/999.0.0.0 Safari/537.36 OPR/65.0.3467.48',
      },
      {
        title: 'Opera \u2014 Windows',
        value:
            'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/999.0.0.0 Safari/537.36 OPR/65.0.3467.48',
      },
      {
        title: 'Opera (Presto) \u2014 Mac',
        value: 'Opera/9.80 (Macintosh; Intel Mac OS X 10.9.1) Presto/2.12.388 Version/12.16',
      },
      {
        title: 'Opera (Presto) \u2014 Windows',
        value: 'Opera/9.80 (Windows NT 6.1) Presto/2.12.388 Version/12.16',
      },
      {
        title: 'Opera Mobile \u2014 Android Mobile',
        value: 'Opera/12.02 (Android 4.1; Linux; Opera Mobi/ADR-1111101157; U; en-US) Presto/2.9.201 Version/12.02',
      },
      {
        title: 'Opera Mini \u2014 iOS',
        value: 'Opera/9.80 (iPhone; Opera Mini/8.0.0/34.2336; U; en) Presto/2.8.119 Version/11.10',
      },
      {
        title: 'Safari \u2014 iPad iOS 13.2',
        value:
            'Mozilla/5.0 (iPad; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1',
      },
      {
        title: 'Safari \u2014 iPhone iOS 13.2',
        value:
            'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1',
      },
      {
        title: 'Safari \u2014 Mac',
        value:
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Safari/605.1.15',
      },
      {
        title: 'UC Browser \u2014 Android Mobile',
        value:
            'Mozilla/5.0 (Linux; U; Android 8.1.0; en-US; Nexus 6P Build/OPM7.181205.001) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/999.0.0.0 UCBrowser/12.11.1.1197 Mobile Safari/537.36',
      },
      {
        title: 'UC Browser \u2014 iOS',
        value:
            'Mozilla/5.0 (iPhone; CPU iPhone OS 12_1 like Mac OS X; zh-CN) AppleWebKit/537.51.1 (KHTML, like Gecko) Mobile/16B92 UCBrowser/12.1.7.1109 Mobile AliApp(TUnionSDK/0.1.20.3)',
      },
      {
        title: 'UC Browser \u2014 Windows Phone',
        value:
            'Mozilla/5.0 (compatible; MSIE 10.0; Windows Phone 8.0; Trident/6.0; IEMobile/10.0; ARM; Touch; NOKIA; Lumia 920) UCBrowser/10.1.0.563 Mobile',
      },
    ]);
  });
});
