// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import * as Host from './host.js';

describe('Platform', () => {
  describe('isRemoteDevtoolsFrontend', () => {
    afterEach(() => {
      Host.Platform.setLocationForTest(undefined);
    });

    it('returns true for devtools://devtools-remote/ URLs', () => {
      Host.Platform.setLocationForTest('devtools://devtools-remote/remote/serve_rev/@12345/inspector.html');
      assert.isTrue(Host.Platform.isRemoteDevtoolsFrontend());
    });

    it('returns false for bundled DevTools URLs', () => {
      Host.Platform.setLocationForTest('devtools://devtools/bundled/devtools_app.html');
      assert.isFalse(Host.Platform.isRemoteDevtoolsFrontend());
    });
  });
});
