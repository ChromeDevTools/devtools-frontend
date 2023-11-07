// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import {createTarget} from '../../helpers/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../helpers/MockConnection.js';
import type * as SDKModule from '../../../../../front_end/core/sdk/sdk.js';
import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';

describeWithMockConnection('AutofillModel', () => {
  let SDK: typeof SDKModule;
  before(async () => {
    SDK = await import('../../../../../front_end/core/sdk/sdk.js');
  });

  it('can enable and disable the Autofill CDP domain', () => {
    const target = createTarget();
    const autofillModel = target.model(SDK.AutofillModel.AutofillModel);
    assertNotNullOrUndefined(autofillModel);
    assertNotNullOrUndefined(autofillModel.agent);
    const enableSpy = sinon.spy(autofillModel.agent, 'invoke_enable');
    const disableSpy = sinon.spy(autofillModel.agent, 'invoke_disable');
    assert.isTrue(enableSpy.notCalled);
    assert.isTrue(disableSpy.notCalled);

    autofillModel.disable();
    assert.isTrue(enableSpy.notCalled);
    assert.isTrue(disableSpy.calledOnce);
    disableSpy.resetHistory();

    autofillModel.enable();
    assert.isTrue(enableSpy.calledOnce);
    assert.isTrue(disableSpy.notCalled);
  });
});
