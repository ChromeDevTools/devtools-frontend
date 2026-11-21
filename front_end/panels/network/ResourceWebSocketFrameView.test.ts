// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {it} from 'mocha';

import * as SDK from '../../core/sdk/sdk.js';
import {getAllRows} from '../../testing/DataGridHelpers.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {createNetworkRequest} from '../../testing/NetworkRequestHelpers.js';
import * as RenderCoordinator from '../../ui/components/render_coordinator/render_coordinator.js';

import * as Network from './network.js';

describeWithEnvironment('ResourceWebSocketFrameView', () => {
  it('shows the oldest message first by default', async () => {
    const request = createNetworkRequest();
    const midnight = new Date('2026-01-02T00:00:00').getTime() / 1000;
    const frame = {type: SDK.NetworkRequest.WebSocketFrameType.Receive, opCode: 1, mask: false};
    request.addFrame({...frame, time: midnight + 1, text: 'after midnight'});
    request.addFrame({...frame, time: midnight - 1, text: 'before midnight'});

    const view = new Network.ResourceWebSocketFrameView.ResourceWebSocketFrameView(request);
    renderElementIntoDOM(view, {includeCommonStyles: true, height: 400});
    await view.updateComplete;
    await RenderCoordinator.done({waitForWork: true});

    const gridRoot = view.contentElement.querySelector('devtools-data-grid')?.shadowRoot;
    assert.exists(gridRoot);
    const rows = getAllRows(gridRoot);
    assert.lengthOf(rows, 2);
    assert.include(rows[0].innerText, 'before midnight');
    assert.include(rows[1].innerText, 'after midnight');
  });

  for (const {name,
              text,
              length} of [{name: 'ASCII text', text: 'hello', length: '5\xA0B'},
                          {name: 'non-ASCII text 1', text: 'é', length: '2\xA0B'},
                          {name: 'non-ASCII text 2', text: '🚀', length: '4\xA0B'},
                          {name: 'non-ASCII text in kilobytes', text: 'é'.repeat(1000), length: '2.0\xA0kB'},
  ]) {
    it(`reports the UTF-8 byte length of ${name}`, () => {
      const view = new Network.ResourceWebSocketFrameView.ResourceWebSocketFrameView(createNetworkRequest());
      const item = view.createGridItem({
        text,
        type: SDK.NetworkRequest.WebSocketFrameType.Receive,
        opCode: 1,
        mask: false,
        time: 0,
      });

      assert.strictEqual(item.data.length, length, text);
    });
  }
});
