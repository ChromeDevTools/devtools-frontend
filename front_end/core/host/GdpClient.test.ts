// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from './host.js';

describe('GdpClient', () => {
  let dispatchHttpRequestStub:
      sinon.SinonStub<Parameters<typeof Host.InspectorFrontendHost.InspectorFrontendHostInstance.dispatchHttpRequest>>;
  beforeEach(() => {
    dispatchHttpRequestStub =
        sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'dispatchHttpRequest')
            .callsFake((request, cb) => {
              cb({
                response: JSON.stringify({name: 'profiles/id'}),
                statusCode: 200,
              });
            });
    Host.GdpClient.GdpClient.instance({forceNew: true});
  });

  it('should cache requests to getProfile', async () => {
    await Host.GdpClient.GdpClient.instance().getProfile();
    await Host.GdpClient.GdpClient.instance().getProfile();

    sinon.assert.calledOnce(dispatchHttpRequestStub);
  });

  it('should cache requests to checkEligibility', async () => {
    await Host.GdpClient.GdpClient.instance().checkEligibility();
    await Host.GdpClient.GdpClient.instance().checkEligibility();

    sinon.assert.calledOnce(dispatchHttpRequestStub);
  });
});
