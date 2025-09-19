// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {updateHostConfig} from '../../testing/EnvironmentHelpers.js';
import * as Root from '../root/root.js';

import * as Host from './host.js';

describe('GdpClient', () => {
  let dispatchHttpRequestStub:
      sinon.SinonStub<Parameters<typeof Host.InspectorFrontendHost.InspectorFrontendHostInstance.dispatchHttpRequest>>;
  beforeEach(() => {
    updateHostConfig({
      devToolsGdpProfiles: {
        enabled: true,
      },
      devToolsGdpProfilesAvailability: {
        enabled: true,
        enterprisePolicyValue: Root.Runtime.GdpProfilesEnterprisePolicyValue.ENABLED,
      },
    });

    dispatchHttpRequestStub =
        sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'dispatchHttpRequest')
            .callsFake((_, cb) => {
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

  it('should clear cache after creating a profile', async () => {
    await Host.GdpClient.GdpClient.instance().getProfile();
    await Host.GdpClient.GdpClient.instance().createProfile(
        {user: 'test', emailPreference: Host.GdpClient.EmailPreference.ENABLED});
    await Host.GdpClient.GdpClient.instance().getProfile();
    await Host.GdpClient.GdpClient.instance().getProfile();

    sinon.assert.calledThrice(dispatchHttpRequestStub);
  });

  it('`getAwardedBadgeNames` should normalize the badge names', async () => {
    dispatchHttpRequestStub.callsFake((_, cb) => {
      cb({
        response: JSON.stringify({
          awards: [{
            name: '/profiles/some-obfuscated-id/awards/some-badge',
          }],
        }),
        statusCode: 200,
      });
    });
    const result = await Host.GdpClient.GdpClient.instance().getAwardedBadgeNames({names: []});
    assert.deepEqual(result, new Set(['/profiles/me/awards/some-badge']));
  });

  describe('when the integration is disabled', () => {
    it('should not make a request', async () => {
      updateHostConfig({
        devToolsGdpProfiles: {
          enabled: false,
        },
      });

      const profile = await Host.GdpClient.GdpClient.instance({forceNew: true}).getProfile();

      assert.isNull(profile);
      sinon.assert.notCalled(dispatchHttpRequestStub);
    });
  });
});
