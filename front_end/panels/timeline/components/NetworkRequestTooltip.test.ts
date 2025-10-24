// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../../core/sdk/sdk.js';
import * as Protocol from '../../../generated/protocol.js';
import * as Trace from '../../../models/trace/trace.js';
import {assertScreenshot, renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {describeWithMockConnection} from '../../../testing/MockConnection.js';

import * as TimelineComponents from './components.js';

describeWithMockConnection('NetworkRequestTooltip', () => {
  it('shows a throttling indicator', async () => {
    const networkRequest = sinon.createStubInstance(SDK.NetworkRequest.NetworkRequest);
    sinon.stub(SDK.TraceObject.RevealableNetworkRequest, 'create')
        .returns(new SDK.TraceObject.RevealableNetworkRequest(networkRequest));
    sinon.stub(SDK.NetworkManager.MultitargetNetworkManager.instance(), 'appliedRequestConditions').returns({
      conditions: SDK.NetworkManager.Slow3GConditions,
      urlPattern: 'https://example.com',
    });
    const tooltip = new TimelineComponents.NetworkRequestTooltip.NetworkRequestTooltip();
    renderElementIntoDOM(tooltip, {includeCommonStyles: true});
    const data: TimelineComponents.NetworkRequestTooltip.NetworkTooltipData = {
      networkRequest: {
        ts: 0,
        dur: 120,
        args: {
          data: {
            syntheticData: {sendStartTime: 100},
            url: 'https://example.com',
            mimeType: Protocol.Network.ResourceType.Document,
            redirects: []
          }
        }
      } as unknown as Trace.Types.Events.SyntheticNetworkRequest,
      entityMapper: sinon.createStubInstance(Trace.EntityMapper.EntityMapper),
    };
    tooltip.data = data;

    await assertScreenshot('timeline/network-request-tooltip-throttling.png');
  });
});
