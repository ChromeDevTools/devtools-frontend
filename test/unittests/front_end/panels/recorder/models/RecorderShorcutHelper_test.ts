// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as Host from '../../../../../../front_end/core/host/host.js';
import * as Models from '../../../../../../front_end/panels/recorder/models/models.js';

describe('RecorderShortcutHelper', () => {
  function waitFor(time: number) {
    return new Promise(resolve => setTimeout(resolve, time));
  }

  function dispatchShortcut() {
    const event = new KeyboardEvent('keyup', {
      key: 'E',
      ctrlKey: Host.Platform.isMac() ? false : true,
      metaKey: Host.Platform.isMac() ? true : false,
      bubbles: true,
      composed: true,
    });

    document.dispatchEvent(event);
  }

  it('should wait for timeout', async () => {
    const time = 10;
    const helper = new Models.RecorderShortcutHelper.RecorderShortcutHelper(
        time,
    );
    const stub = sinon.stub();

    helper.handleShortcut(stub);
    await waitFor(time + 10);

    assert.strictEqual(stub.callCount, 1);

    dispatchShortcut();

    assert.strictEqual(stub.callCount, 1);
  });

  it('should stop on click', async () => {
    const time = 100;
    const helper = new Models.RecorderShortcutHelper.RecorderShortcutHelper(
        time,
    );
    const stub = sinon.stub();

    helper.handleShortcut(stub);
    dispatchShortcut();

    await waitFor(time / 2);
    assert.strictEqual(stub.callCount, 1);

    await waitFor(time);
    assert.strictEqual(stub.callCount, 1);
  });
});
