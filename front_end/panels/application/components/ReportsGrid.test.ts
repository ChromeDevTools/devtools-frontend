// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Protocol from '../../../generated/protocol.js';
import {assertScreenshot, renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {createViewFunctionStub} from '../../../testing/ViewFunctionHelpers.js';
import * as UI from '../../../ui/legacy/legacy.js';

import * as ApplicationComponents from './components.js';

const body = {
  columnNumber: 8,
  id: 'PrefixedStorageInfo',
  lineNumber: 15,
  message: '\'window.webkitStorageInfo\' is deprecated. Please use \'navigator.webkitTemporaryStorage\' ' +
      'or \'navigator.webkitPersistentStorage\' instead.',
  sourceFile: 'https://example.com/script.js',
};
const reports = [{
  id: 'some_id' as Protocol.Network.ReportId,
  initiatorUrl: 'https://example.com/script.js',
  destination: 'main-endpoint',
  type: 'deprecation',
  timestamp: 1632747042.12696,
  depth: 1,
  completedAttempts: 0,
  body: JSON.stringify(body),
  status: Protocol.Network.ReportStatus.Queued,
}];

describeWithEnvironment('ReportsGrid', () => {
  describe('view', () => {
    let target!: HTMLElement;

    beforeEach(async () => {
      const container = document.createElement('div');
      renderElementIntoDOM(container);
      const widget = new UI.Widget.Widget();
      widget.markAsRoot();
      widget.show(container);
      target = widget.element;
      target.style.display = 'flex';
      target.style.width = '780px';
      target.style.height = '400px';
    });

    it('looks fine with no reports', async () => {
      ApplicationComponents.ReportsGrid.DEFAULT_VIEW(
          {reports: [], protocolMonitorExperimentEnabled: true, onSelect: () => {}}, undefined, target);
      await assertScreenshot('application/reports_grid_empty.png');
    });

    it('looks fine with report', async () => {
      ApplicationComponents.ReportsGrid.DEFAULT_VIEW(
          {reports, protocolMonitorExperimentEnabled: true, onSelect: () => {}}, undefined, target);
      await assertScreenshot('application/reports_grid.png');
    });
  });

  it('calls selection-handler on selection', async () => {
    const selectedSpy = sinon.spy();
    const view = createViewFunctionStub(ApplicationComponents.ReportsGrid.ReportsGrid);
    const widget = new ApplicationComponents.ReportsGrid.ReportsGrid(undefined, view);
    widget.onReportSelected = selectedSpy;
    await view.nextInput;

    widget.reports = reports;
    widget.requestUpdate();
    const viewInput = await view.nextInput;

    viewInput.onSelect('some_id');
    sinon.assert.calledWith(selectedSpy, 'some_id');
  });
});
