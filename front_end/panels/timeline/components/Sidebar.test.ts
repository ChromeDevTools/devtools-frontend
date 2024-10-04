// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Root from '../../../core/root/root.js';
import type * as Trace from '../../../models/trace/trace.js';
import {raf, renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {describeWithEnvironment, enableFeatureForTest} from '../../../testing/EnvironmentHelpers.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';

import * as Components from './components.js';

describeWithEnvironment('Sidebar', () => {
  async function renderSidebar(
      parsedTrace: Trace.Handlers.Types.ParsedTrace,
      insights: Trace.Insights.Types.TraceInsightSets|null,
      ): Promise<Components.Sidebar.SidebarWidget> {
    const container = document.createElement('div');
    renderElementIntoDOM(container);
    const sidebar = new Components.Sidebar.SidebarWidget();
    sidebar.markAsRoot();
    sidebar.setParsedTrace(parsedTrace);
    sidebar.setInsights(insights);
    sidebar.show(container);
    await raf();
    return sidebar;
  }

  beforeEach(() => {
    enableFeatureForTest(Root.Runtime.ExperimentName.TIMELINE_INSIGHTS);
    enableFeatureForTest(Root.Runtime.ExperimentName.TIMELINE_ANNOTATIONS);
  });

  it('renders with two tabs for insights & annotations', async function() {
    const {parsedTrace, insights} = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');

    const sidebar = await renderSidebar(parsedTrace, insights);
    const tabbedPane = sidebar.element.querySelector('.tabbed-pane')?.shadowRoot;
    assert.isOk(tabbedPane);
    const tabs = Array.from(tabbedPane.querySelectorAll('[role="tab"]'));
    assert.lengthOf(tabs, 2);
    const labels = tabs.map(elem => elem.getAttribute('aria-label'));
    assert.deepEqual(labels, ['Insights', 'Annotations']);
  });

  it('selects the insights tab by default', async function() {
    const {parsedTrace, insights} = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');

    const sidebar = await renderSidebar(parsedTrace, insights);
    const tabbedPane = sidebar.element.querySelector('.tabbed-pane')?.shadowRoot;
    assert.isOk(tabbedPane);

    const tabs = Array.from(tabbedPane.querySelectorAll('[role="tab"]'));
    const selectedTabLabels =
        tabs.filter(tab => tab.classList.contains('selected')).map(elem => elem.getAttribute('aria-label'));
    assert.deepEqual(selectedTabLabels, ['Insights']);
  });

  it('disables the insights tab if there are no insights', async function() {
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
    const sidebar = await renderSidebar(parsedTrace, null);
    const tabbedPane = sidebar.element.querySelector('.tabbed-pane')?.shadowRoot;
    assert.isOk(tabbedPane);
    const tabs = Array.from(tabbedPane.querySelectorAll('[role="tab"]'));

    const disabledTabLabels =
        tabs.filter(tab => tab.classList.contains('disabled')).map(elem => elem.getAttribute('aria-label'));
    assert.deepEqual(disabledTabLabels, ['Insights']);

    const selectedTabLabels =
        tabs.filter(tab => tab.classList.contains('selected')).map(elem => elem.getAttribute('aria-label'));
    assert.deepEqual(selectedTabLabels, ['Annotations']);
  });
});
