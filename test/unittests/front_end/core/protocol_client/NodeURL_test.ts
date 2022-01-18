// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as ProtocolClient from '../../../../../front_end/core/protocol_client/protocol_client.js';
import * as Host from '../../../../../front_end/core/host/host.js';

describe('NodeURL', () => {
  describe('platform detection for paths', () => {
    it('works correctly on windows', () => {
      const isWindows = true;
      assert.isTrue(ProtocolClient.NodeURL.NodeURL.isPlatformPath('c:\\prog\\foobar.js', isWindows));
      assert.isFalse(ProtocolClient.NodeURL.NodeURL.isPlatformPath('/usr/local/foobar.js', isWindows));
    });

    it('works correctly on linux', () => {
      const isWindows = false;
      assert.isFalse(ProtocolClient.NodeURL.NodeURL.isPlatformPath('c:\\prog\\foobar.js', isWindows));
      assert.isTrue(ProtocolClient.NodeURL.NodeURL.isPlatformPath('/usr/local/foobar.js', isWindows));
    });
  });

  describe('patch', () => {
    const url = Host.Platform.isWin() ? 'c:\\prog\\foobar.js' : '/usr/local/home/prog/foobar.js';
    const patchedUrl = Host.Platform.isWin() ? 'file:///c:/prog/foobar.js' : 'file:///usr/local/home/prog/foobar.js';

    it('does patch url fields', () => {
      const object = {url, result: null};

      ProtocolClient.NodeURL.NodeURL.patch(object);

      assert.strictEqual(object.url, patchedUrl);
    });

    it('does not patch the url of the result', () => {
      const object = {
        url: '',
        result: {
          result: {
            value: {url},
          },
        },
      };

      ProtocolClient.NodeURL.NodeURL.patch(object);

      assert.strictEqual(object.result.result.value.url, url);
    });

    it('does patch all urls in an example protocol message', () => {
      const object = {
        exceptionDetails: {
          url,
          stackTrace: {
            callFrames: [{
              columnNumber: 0,
              functionName: '',
              lineNumber: 0,
              scriptId: '0',
              url,
            }],
          },
        },
      };

      ProtocolClient.NodeURL.NodeURL.patch(object as unknown as {url: string});

      assert.strictEqual(object.exceptionDetails.url, patchedUrl);
      assert.strictEqual(object.exceptionDetails.stackTrace.callFrames[0].url, patchedUrl);
    });
  });
});
