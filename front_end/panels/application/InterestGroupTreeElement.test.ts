// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import {createTarget} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';

import * as Resources from './application.js';

describeWithMockConnection('InterestGroupTreeElement', () => {
  const OWNER = 'OWNER';
  const NAME = 'NAME';
  const DETAILS = {
    ownerOrigin: OWNER,
    name: NAME,
    expirationTime: 42,
    joiningOrigin: 'JOINING_ORIGIN',
    trustedBiddingSignalsKeys: [],
    ads: [],
    adComponents: [],
  };

  it('reads details', async () => {
    const tabTarget = createTarget({type: SDK.Target.Type.TAB});
    const frameTarget = createTarget({parentTarget: tabTarget});
    createTarget({parentTarget: tabTarget, subtype: 'prerender'});
    const view =
        new Resources.InterestGroupTreeElement.InterestGroupTreeElement({} as Resources.ResourcesPanel.ResourcesPanel);
    sinon.stub(frameTarget.storageAgent(), 'invoke_getInterestGroupDetails')
        .withArgs({ownerOrigin: OWNER, name: NAME})
        .returns(Promise.resolve({details: DETAILS} as Protocol.Storage.GetInterestGroupDetailsResponse));
    const details = await view.getInterestGroupDetails(OWNER, NAME);
    assert.deepStrictEqual(details, DETAILS);
  });
});
