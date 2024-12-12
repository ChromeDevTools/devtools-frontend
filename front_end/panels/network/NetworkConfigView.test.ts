// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Network from './network.js';

describe('userAgentGroups', () => {
  it('Chrome UAs all have placeholder for major version patching', () => {
    const {userAgentGroups} = Network.NetworkConfigView;
    const chromeUAs = userAgentGroups.map(g => g.values).flat().filter(v => v.value.includes(' Chrome/'));
    assert.isAtLeast(chromeUAs.length, 10);
    // We should not add any new UAs without the %s that gets patched via `patchUserAgentWithChromeVersion`
    assert.isTrue(chromeUAs.every(v => v.value.includes('Chrome/%s')));
  });
});
