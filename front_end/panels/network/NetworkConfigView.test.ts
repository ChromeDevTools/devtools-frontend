// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Protocol from '../../generated/protocol.js';
import {createTarget} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection, setMockConnectionResponseHandler} from '../../testing/MockConnection.js';

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

describeWithMockConnection('NetworkConfigView', () => {
  it('supports enabling data saver emulation', async () => {
    createTarget();
    const saveDataSpy = Promise.withResolvers<Protocol.Emulation.SetDataSaverOverrideRequest>();
    setMockConnectionResponseHandler('Emulation.setDataSaverOverride', request => {
      saveDataSpy.resolve(request);
      const {promise, resolve} = Promise.withResolvers<Protocol.Emulation.SetDataSaverOverrideRequest>();
      saveDataSpy.promise = promise;
      saveDataSpy.resolve = resolve;
      return {};
    });

    const networkConfigView = Network.NetworkConfigView.NetworkConfigView.instance();
    const saveDataSelect = networkConfigView.contentElement.querySelector(
        'select[aria-label="Override the value reported by navigator.connection.saveData on the page"]');
    assert.exists(saveDataSelect);
    assert.instanceOf(saveDataSelect, HTMLSelectElement);

    const select = (index: number): Promise<Protocol.Emulation.SetDataSaverOverrideRequest> => {
      const {promise} = saveDataSpy;
      saveDataSelect.selectedIndex = index;
      saveDataSelect.dispatchEvent(new Event('change'));
      return promise;
    };

    assert.deepEqual(await select(1), {dataSaverEnabled: true});
    assert.deepEqual(await select(2), {dataSaverEnabled: false});
    assert.deepEqual(await select(0), {});
  });
});
