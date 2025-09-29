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

  it('should cache requests to getProfile when profile exists', async () => {
    dispatchHttpRequestStub.callsFake((_, cb) => {
      cb({
        response: JSON.stringify({name: 'profiles/id'}),
        statusCode: 200,
      });
    });
    await Host.GdpClient.GdpClient.instance().getProfile();
    await Host.GdpClient.GdpClient.instance().getProfile();

    sinon.assert.calledOnce(dispatchHttpRequestStub);
  });

  it('should cache requests in getProfile when profile doesn\'t exist', async () => {
    dispatchHttpRequestStub.callsFake((request, cb) => {
      if (request.path === '/v1beta1/profile:get') {
        cb({statusCode: 404, error: ''});
        return;
      }
      cb({
        response: JSON.stringify({
          createProfile: Host.GdpClient.EligibilityStatus.ELIGIBLE,
        }),
        statusCode: 200,
      });
    });
    await Host.GdpClient.GdpClient.instance().getProfile();
    await Host.GdpClient.GdpClient.instance().getProfile();

    sinon.assert.calledTwice(dispatchHttpRequestStub);
  });

  it('should clear cache after creating a profile', async () => {
    dispatchHttpRequestStub.callsFake((_, cb) => {
      cb({
        error: '',
        statusCode: 404,
      });
    });
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

      const profileResult = await Host.GdpClient.GdpClient.instance({forceNew: true}).getProfile();

      assert.isNull(profileResult);
      sinon.assert.notCalled(dispatchHttpRequestStub);
    });
  });

  describe('getProfile', () => {
    it('should return null when there is an HTTP_RESPONSE_UNAVAILABLE error in the getProfile request', async () => {
      dispatchHttpRequestStub.callsFake((request, cb) => {
        if (request.path === '/v1beta1/profile:get') {
          cb({statusCode: 503, error: ''});
          return;
        }
      });
      const result = await Host.GdpClient.GdpClient.instance().getProfile();

      assert.isNull(result);
      sinon.assert.calledOnce(dispatchHttpRequestStub);
    });

    it('should return null when the endpoint returns non-parseable response', async () => {
      dispatchHttpRequestStub.callsFake((_, cb) => {
        cb({
          statusCode: 200,
          response: 'this is not a json',
        });
      });
      const result = await Host.GdpClient.GdpClient.instance().getProfile();
      assert.isNull(result);
    });

    it('should return null when there isn\'t a profile and checkEligibility call returned an error', async () => {
      dispatchHttpRequestStub.callsFake((request, cb) => {
        if (request.path === '/v1beta1/profile:get') {
          cb({statusCode: 404, error: ''});
          return;
        }

        cb({statusCode: 503, error: ''});
      });
      const result = await Host.GdpClient.GdpClient.instance().getProfile();

      assert.isNull(result);
      sinon.assert.calledTwice(dispatchHttpRequestStub);
    });

    it('should return profile and isEligible if a profile exists without calling checkEligibility', async () => {
      dispatchHttpRequestStub.callsFake((request, cb) => {
        if (request.path === '/v1beta1/profile:get') {
          cb({statusCode: 200, response: JSON.stringify({name: 'test/profile-id'})});
          return;
        }
      });
      const result = await Host.GdpClient.GdpClient.instance().getProfile();

      assert.deepEqual(result, {
        profile: {name: 'test/profile-id'},
        isEligible: true,
      });
      sinon.assert.calledOnce(dispatchHttpRequestStub);
    });

    it('should check eligibility if no profile exists', async () => {
      dispatchHttpRequestStub.callsFake((request, cb) => {
        if (request.path === '/v1beta1/profile:get') {
          cb({statusCode: 404, error: ''});
          return;
        }
        cb({
          response: JSON.stringify({
            createProfile: Host.GdpClient.EligibilityStatus.ELIGIBLE,
          }),
          statusCode: 200,
        });
      });

      const result = await Host.GdpClient.GdpClient.instance({forceNew: true}).getProfile();

      assert.deepEqual(result, {
        profile: null,
        isEligible: true,
      });
      sinon.assert.calledTwice(dispatchHttpRequestStub);
    });
  });

  describe('isBadgesEnabled', () => {
    it('should return true when the flag is enabled and the enterprise policy is enabled', () => {
      updateHostConfig({
        devToolsGdpProfiles: {
          badgesEnabled: true,
        },
        devToolsGdpProfilesAvailability: {
          enterprisePolicyValue: Root.Runtime.GdpProfilesEnterprisePolicyValue.ENABLED,
        },
      });
      assert.isTrue(Host.GdpClient.isBadgesEnabled());
    });

    it('should return false when the badgesEnabled feature param is false', () => {
      updateHostConfig({
        devToolsGdpProfiles: {
          badgesEnabled: false,
        },
        devToolsGdpProfilesAvailability: {
          enterprisePolicyValue: Root.Runtime.GdpProfilesEnterprisePolicyValue.ENABLED,
        },
      });
      assert.isFalse(Host.GdpClient.isBadgesEnabled());
    });

    it('should return false when the enterprise setting is ENABLED_WITHOUT_BADGES', () => {
      updateHostConfig({
        devToolsGdpProfiles: {
          badgesEnabled: true,
        },
        devToolsGdpProfilesAvailability: {
          enterprisePolicyValue: Root.Runtime.GdpProfilesEnterprisePolicyValue.ENABLED_WITHOUT_BADGES,
        },
      });
      assert.isFalse(Host.GdpClient.isBadgesEnabled());
    });

    it('should return false when the enterprise setting is DISABLED', () => {
      updateHostConfig({
        devToolsGdpProfiles: {
          badgesEnabled: true,
        },
        devToolsGdpProfilesAvailability: {
          enterprisePolicyValue: Root.Runtime.GdpProfilesEnterprisePolicyValue.DISABLED,
        },
      });
      assert.isFalse(Host.GdpClient.isBadgesEnabled());
    });
  });
});
