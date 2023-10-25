// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';
import type * as SDKModule from '../../../../../front_end/core/sdk/sdk.js';
import {createTarget} from '../../helpers/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../helpers/MockConnection.js';

const {assert} = chai;

describeWithMockConnection('DOMModel', () => {
  let SDK: typeof SDKModule;
  before(async () => {
    SDK = await import('../../../../../front_end/core/sdk/sdk.js');
  });
  it('updates the document on an documentUpdate event', () => {
    const parentTarget = createTarget();
    const target = createTarget({parentTarget});
    const domModel = target.model(SDK.DOMModel.DOMModel);
    assertNotNullOrUndefined(domModel);
    assertNotNullOrUndefined(domModel.agent);

    const spy = sinon.spy(domModel.agent, 'invoke_getDocument');

    assert.isTrue(spy.notCalled);
    assert.isNull(domModel.existingDocument());

    domModel.documentUpdated();
    assert.isTrue(spy.calledOnce);
  });
});
