// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as Resources from '../../../../../front_end/panels/application/application.js';
import type * as Protocol from '../../../../../front_end/generated/protocol.js';
import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import {describeWithMockConnection} from '../../helpers/MockConnection.js';
import {createTarget} from '../../helpers/EnvironmentHelpers.js';

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
  } as Protocol.Storage.InterestGroupDetails;

  it('reads details without tab target', async () => {
    const target = createTarget();
    const view =
        new Resources.InterestGroupTreeElement.InterestGroupTreeElement({} as Resources.ResourcesPanel.ResourcesPanel);
    sinon.stub(target.storageAgent(), 'invoke_getInterestGroupDetails')
        .withArgs({ownerOrigin: OWNER, name: NAME})
        .returns(Promise.resolve({details: DETAILS} as Protocol.Storage.GetInterestGroupDetailsResponse));
    const details = await view.getInterestGroupDetails(OWNER, NAME);
    assert.deepStrictEqual(details, DETAILS);
  });

  it('reads details with tab target', async () => {
    const tabTarget = createTarget({type: SDK.Target.Type.Tab});
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
