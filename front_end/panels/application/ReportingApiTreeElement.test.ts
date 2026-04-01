// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describeWithMockConnection} from '../../testing/MockConnection.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Application from './application.js';

describeWithMockConnection('ReportingApiTreeElement', () => {
  it('has children for reports and context', () => {
    const panel = {
      showView: () => {},
    } as unknown as Application.ResourcesPanel.ResourcesPanel;
    const treeElement = new Application.ReportingApiTreeElement.ReportingApiTreeElement(panel);
    const treeOutline = new UI.TreeOutline.TreeOutlineInShadow();
    treeOutline.appendChild(treeElement);

    assert.strictEqual(treeElement.childCount(), 1);
    assert.instanceOf(treeElement.childAt(0), Application.ReportingApiTreeElement.CrashReportContextTreeElement);
  });
});
