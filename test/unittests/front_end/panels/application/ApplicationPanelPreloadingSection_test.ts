// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as Application from '../../../../../front_end/panels/application/application.js';
import {createTarget} from '../../helpers/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../helpers/MockConnection.js';
import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';
import type * as Resources from '../../../../../front_end/panels/application/application.js';

describeWithMockConnection('ApplicationPanelPreloadingSection', () => {
  it('shows view even if initialization happens after selection', () => {
    const target = createTarget();
    const prerenderingModel = target.model(SDK.PrerenderingModel.PrerenderingModel);
    assertNotNullOrUndefined(prerenderingModel);

    const spy = sinon.spy();
    const panel = {
      showView: spy,
    } as unknown as Resources.ResourcesPanel.ResourcesPanel;
    const preloadingTreeElement = new Application.ApplicationPanelPreloadingSection.PreloadingTreeElement(panel);

    preloadingTreeElement.onselect(false);
    assert.isTrue(spy.notCalled);

    preloadingTreeElement.initialize(prerenderingModel);
    assert.isTrue(spy.calledOnce);
  });
});
