// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as ElementsModule from '../../../../../front_end/panels/elements/elements.js';
import * as Host from '../../../../../front_end/core/host/host.js';
import {describeWithRealConnection} from '../../helpers/RealConnection.js';
import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';
import {recordedMetricsContain} from '../../helpers/UserMetricsHelpers.js';

const {assert} = chai;

describeWithRealConnection('ElementsPanel', () => {
  let Elements: typeof ElementsModule;
  before(async () => {
    Elements = await import('../../../../../front_end/panels/elements/elements.js');
  });

  it('records metrics when the styles and computed tabs are selected', () => {
    // We need to use the global instance, as some auxiliary code always uses the global instance.
    const panel = Elements.ElementsPanel.ElementsPanel.instance();
    assertNotNullOrUndefined(panel.sidebarPaneView);
    const tabbedPane = panel.sidebarPaneView.tabbedPane();

    tabbedPane.selectTab(Elements.ElementsPanel.SidebarPaneTabId.Computed);
    assert.isTrue(
        recordedMetricsContain(
            Host.InspectorFrontendHostAPI.EnumeratedHistogram.SidebarPaneShown,
            Host.UserMetrics.SidebarPaneCodes.Computed),
        'Expected "Computed" tab to show up in metrics');
    assert.isFalse(
        recordedMetricsContain(
            Host.InspectorFrontendHostAPI.EnumeratedHistogram.SidebarPaneShown,
            Host.UserMetrics.SidebarPaneCodes.Styles),
        'Expected "Styles" tab to not show up in metrics');

    tabbedPane.selectTab(Elements.ElementsPanel.SidebarPaneTabId.Styles);
    assert.isTrue(
        recordedMetricsContain(
            Host.InspectorFrontendHostAPI.EnumeratedHistogram.SidebarPaneShown,
            Host.UserMetrics.SidebarPaneCodes.Styles),
        'Expected "Styles" tab to show up in metrics');
  });
});
