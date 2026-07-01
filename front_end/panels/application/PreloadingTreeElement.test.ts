// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as SDK from '../../core/sdk/sdk.js';
import {createTarget, describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';

import type * as Resources from './application.js';
import * as Application from './application.js';

describeWithEnvironment('PreloadingTreeElement', () => {
  it('shows view even if initialization happens after selection', () => {
    const target = createTarget();
    const model = target.model(SDK.PreloadingModel.PreloadingModel);
    assert.exists(model);

    const spy = sinon.spy();
    const panel = {
      showView: spy,
    } as unknown as Resources.ResourcesPanel.ResourcesPanel;
    const preloadingRuleSetTreeElement = new Application.PreloadingTreeElement.PreloadingRuleSetTreeElement(panel);

    preloadingRuleSetTreeElement.onselect(false);
    sinon.assert.notCalled(spy);

    preloadingRuleSetTreeElement.initialize(model);
    sinon.assert.calledOnce(spy);
  });
});
