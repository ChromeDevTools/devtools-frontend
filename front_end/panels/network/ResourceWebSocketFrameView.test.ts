// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {it} from 'mocha';

import * as SDK from '../../core/sdk/sdk.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {createNetworkRequest} from '../../testing/NetworkRequestHelpers.js';

import * as Network from './network.js';

describeWithEnvironment('ResourceWebSocketFrameView', () => {
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
