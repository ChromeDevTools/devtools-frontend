// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Trace from '../../../models/trace/trace.js';
import {getEventPromise, raf, renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {getFirstOrError, getInsightOrError} from '../../../testing/InsightHelpers.js';
import {allThreadEntriesInTrace} from '../../../testing/TraceHelpers.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';
import * as RenderCoordinator from '../../../ui/components/render_coordinator/render_coordinator.js';

import * as Components from './components.js';
import * as Insights from './insights/insights.js';

describeWithEnvironment('Sidebar', () => {
  async function renderSidebar(
      parsedTrace: Trace.Handlers.Types.ParsedTrace,
      metadata: Trace.Types.File.MetaData|null,
      insights: Trace.Insights.Types.TraceInsightSets|null,
      ): Promise<Components.Sidebar.SidebarWidget> {
    const container = document.createElement('div');
    renderElementIntoDOM(container);
    const sidebar = new Components.Sidebar.SidebarWidget();
    sidebar.markAsRoot();
    sidebar.setParsedTrace(parsedTrace, metadata);
    sidebar.setInsights(insights);
    sidebar.show(container);
    await raf();
    return sidebar;
  }

  it('renders with two tabs for insights & annotations', async function() {
    const {parsedTrace, metadata, insights} = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');

    const sidebar = await renderSidebar(parsedTrace, metadata, insights);
    const tabbedPane = sidebar.element.querySelector('.tabbed-pane')?.shadowRoot;
    assert.isOk(tabbedPane);
    const tabs = Array.from(tabbedPane.querySelectorAll('[role="tab"]'));
    assert.lengthOf(tabs, 2);
    const labels = tabs.map(elem => elem.getAttribute('aria-label'));
    assert.deepEqual(labels, ['Insights', 'Annotations']);
  });

  it('selects the insights tab by default', async function() {
    const {parsedTrace, metadata, insights} = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');

    const sidebar = await renderSidebar(parsedTrace, metadata, insights);
    const tabbedPane = sidebar.element.querySelector('.tabbed-pane')?.shadowRoot;
    assert.isOk(tabbedPane);

    const tabs = Array.from(tabbedPane.querySelectorAll('[role="tab"]'));
    const selectedTabLabels =
        tabs.filter(tab => tab.classList.contains('selected')).map(elem => elem.getAttribute('aria-label'));
    assert.deepEqual(selectedTabLabels, ['Insights']);
  });

  it('collapses the active insight when the sidebar is closed', async function() {
    const {parsedTrace, metadata, insights} = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
    assert.isOk(insights);
    const firstNav = getFirstOrError(parsedTrace.Meta.navigationsByNavigationId.values());
    assert.isOk(firstNav.args.data?.navigationId);
    const insight = getInsightOrError('LCPBreakdown', insights, firstNav);
    const sidebar = await renderSidebar(parsedTrace, metadata, insights);
    sidebar.setActiveInsight({model: insight, insightSetKey: firstNav.args.data.navigationId}, {highlight: false});

    const deactivateEvent = getEventPromise(sidebar.element, Insights.SidebarInsight.InsightDeactivated.eventName);
    sidebar.hideWidget();
    await deactivateEvent;
  });

  it('restores the active insight when it is opened again', async function() {
    const {parsedTrace, metadata, insights} = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
    assert.isOk(insights);
    const firstNav = getFirstOrError(parsedTrace.Meta.navigationsByNavigationId.values());
    assert.isOk(firstNav.args.data?.navigationId);
    const insight = getInsightOrError('LCPBreakdown', insights, firstNav);
    const sidebar = await renderSidebar(parsedTrace, metadata, insights);
    sidebar.setActiveInsight({model: insight, insightSetKey: firstNav.args.data.navigationId}, {highlight: false});

    const deactivateEvent = getEventPromise(sidebar.element, Insights.SidebarInsight.InsightDeactivated.eventName);
    sidebar.hideWidget();
    await deactivateEvent;

    const activateEvent = getEventPromise<Insights.SidebarInsight.InsightActivated>(
        sidebar.element, Insights.SidebarInsight.InsightActivated.eventName);
    sidebar.showWidget();

    const event = await activateEvent;
    assert.strictEqual(event.model, insight);
    assert.strictEqual(event.insightSetKey, firstNav.args.data.navigationId);
  });

  it('disables the insights tab if there are no insights', async function() {
    const {parsedTrace, metadata} = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
    const sidebar = await renderSidebar(parsedTrace, metadata, null);
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

  it('shows the count for the active annotations', async function() {
    const {parsedTrace, metadata} = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
    const events = allThreadEntriesInTrace(parsedTrace);
    const annotation1: Trace.Types.File.Annotation = {
      type: 'ENTRY_LABEL',
      entry: events[0],
      label: 'Entry Label 1',
    };

    const annotation2: Trace.Types.File.Annotation = {
      type: 'ENTRY_LABEL',
      entry: events[1],
      label: 'Entry Label 2',
    };

    const sidebar = await renderSidebar(parsedTrace, metadata, null);
    sidebar.setAnnotations([annotation1, annotation2], new Map());
    const tabbedPane = sidebar.element.querySelector('.tabbed-pane')?.shadowRoot;
    assert.isOk(tabbedPane);
    const annotationsTab = tabbedPane.querySelector('#tab-annotations');
    assert.isOk(annotationsTab);
    const countBadge = annotationsTab.querySelector<HTMLElement>('.badge');
    assert.strictEqual(countBadge?.innerText, '2');
  });

  it('de-duplicates annotations that are pending to not show an incorrect count', async function() {
    const {parsedTrace, metadata} = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
    const events = allThreadEntriesInTrace(parsedTrace);

    // Create Empty Entry Label Annotation (considered not started)
    const entryLabelAnnotation: Trace.Types.File.Annotation = {
      type: 'ENTRY_LABEL',
      entry: events[0],
      label: '',
    };

    // Create Entries link that only has 'to' entry (considered not started)
    const entriesLink: Trace.Types.File.Annotation = {
      type: 'ENTRIES_LINK',
      entryFrom: events[0],
      state: Trace.Types.File.EntriesLinkState.CREATION_NOT_STARTED,
    };

    const sidebar = await renderSidebar(parsedTrace, metadata, null);
    sidebar.setAnnotations([entryLabelAnnotation, entriesLink], new Map());
    const tabbedPane = sidebar.element.querySelector('.tabbed-pane')?.shadowRoot;
    assert.isOk(tabbedPane);
    const annotationsTab = tabbedPane.querySelector('#tab-annotations');
    assert.isOk(annotationsTab);
    const countBadge = annotationsTab.querySelector<HTMLElement>('.badge');
    assert.strictEqual(countBadge?.innerText, '1');
  });

  it('removes the annotations badge when the user deletes the final annotation', async function() {
    const {parsedTrace, metadata} = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
    const entryLabelAnnotation: Trace.Types.File.Annotation = {
      type: 'ENTRY_LABEL',
      entry: allThreadEntriesInTrace(parsedTrace)[0],  // random event, doesn't matter
      label: 'hello world',
    };

    const sidebar = await renderSidebar(parsedTrace, metadata, null);
    sidebar.setAnnotations([entryLabelAnnotation], new Map());
    await RenderCoordinator.done();
    const tabbedPane = sidebar.element.querySelector('.tabbed-pane')?.shadowRoot;
    assert.isOk(tabbedPane);
    const annotationsTab = tabbedPane.querySelector('#tab-annotations');
    assert.isOk(annotationsTab);
    const countBadge = annotationsTab.querySelector<HTMLElement>('.badge');
    assert.strictEqual(countBadge?.innerText, '1');

    sidebar.setAnnotations([], new Map());  // delete the annotations
    const updatedCountBadge = annotationsTab.querySelector<HTMLElement>('.badge');
    assert.isNull(updatedCountBadge);  // No badge is shown when the count is 0.
  });
});
