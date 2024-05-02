// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as SDK from '../../core/sdk/sdk.js';
import * as Application from './application.js';
import {createTarget} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';
import {assertNotNullOrUndefined} from '../../core/platform/platform.js';
import type * as Resources from './application.js';

describeWithMockConnection('PreloadingTreeElement', () => {
  it('shows view even if initialization happens after selection', () => {
    const target = createTarget();
    const model = target.model(SDK.PreloadingModel.PreloadingModel);
    assertNotNullOrUndefined(model);

    const spy = sinon.spy();
    const panel = {
      showView: spy,
    } as unknown as Resources.ResourcesPanel.ResourcesPanel;
    const preloadingRuleSetTreeElement = new Application.PreloadingTreeElement.PreloadingRuleSetTreeElement(panel);

    preloadingRuleSetTreeElement.onselect(false);
    assert.isTrue(spy.notCalled);

    preloadingRuleSetTreeElement.initialize(model);
    assert.isTrue(spy.calledOnce);
  });
});
