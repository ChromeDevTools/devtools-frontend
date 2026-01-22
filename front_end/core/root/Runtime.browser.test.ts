// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Root from './root.js';

describe('Runtime', () => {
  it('getChromeVersion result has the correct shape', () => {
    assert.isTrue(/^\d{3}\.0\.0\.0$/.test(Root.Runtime.getChromeVersion()));
  });
});
