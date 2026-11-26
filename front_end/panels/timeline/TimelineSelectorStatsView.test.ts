// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {afterEach, beforeEach, describe, it} from 'mocha';
import sinon from 'sinon';

import * as Host from '../../core/host/host.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Bindings from '../../models/bindings/bindings.js';
import {assertScreenshot, raf, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {createTarget, registerTestTeardown, setupActionRegistry} from '../../testing/EnvironmentHelpers.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {setupRuntimeHooks} from '../../testing/RuntimeHelpers.js';
import {setupSettingsHooks} from '../../testing/SettingsHelpers.js';
import {TestUniverse} from '../../testing/TestUniverse.js';
import {setupIgnoreListManagerEnvironment} from '../../testing/TraceHelpers.js';
import {TraceLoader} from '../../testing/TraceLoader.js';
import * as RenderCoordinator from '../../ui/components/render_coordinator/render_coordinator.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Timeline from './timeline.js';

describe('TimelineSelectorStatsView', function() {
  setupLocaleHooks();
  setupSettingsHooks();
  setupRuntimeHooks();
  setupActionRegistry();

  const activeWidgets: UI.Widget.Widget[] = [];

  beforeEach(() => {
    const universe = new TestUniverse();
    UI.ZoomManager.ZoomManager.instance({
      forceNew: true,
      win: window,
      frontendHost: Host.InspectorFrontendHost.InspectorFrontendHostInstance,
    });
    registerTestTeardown(() => UI.ZoomManager.ZoomManager.removeInstance());
    sinon.stub(SDK.TargetManager.TargetManager, 'instance').returns(universe.targetManager);
    sinon.stub(Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding, 'instance')
        .returns(universe.debuggerWorkspaceBinding);
    sinon.stub(Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding, 'instance').returns(universe.cssWorkspaceBinding);
    setupIgnoreListManagerEnvironment();
    const target = createTarget({targetManager: universe.targetManager});
    registerTestTeardown(() => target.dispose('test teardown'));
  });

  afterEach(async () => {
    for (const widget of activeWidgets.splice(0)) {
      widget.detach(/* overrideHideOnDetach= */ true);
    }
    await UI.Widget.Widget.allUpdatesComplete;
  });

  it('renders selector stats table inside the details view tab', async function() {
    const parsedTrace = await TraceLoader.traceEngine(this, 'selector-stats.json.gz');
    const [recalcStyleEvent] = parsedTrace.data.SelectorStats.dataForRecalcStyleEvent.keys();
    assert.isOk(recalcStyleEvent);

    const detailsView = new Timeline.TimelineDetailsView.TimelineDetailsPane({highlightEvent: () => {}});
    activeWidgets.push(detailsView);
    renderElementIntoDOM(detailsView, {includeCommonStyles: true, width: 600, height: 250});

    await detailsView.setModel({
      parsedTrace,
      selectedEvents: null,
      eventToRelatedInsightsMap: null,
      entityMapper: null,
    });
    await detailsView.setSelection(Timeline.TimelineSelection.selectionFromEvent(recalcStyleEvent));
    detailsView.selectTab(Timeline.TimelineDetailsView.Tab.SelectorStats, null);
    await detailsView.updateComplete;

    // Wait for TimelineSelectorStatsView.#aggregateEvents() and DataGrid rendering.
    let dataGrid: Element|null = null;
    for (let i = 0; i < 30; ++i) {
      await RenderCoordinator.done({waitForWork: true});
      await UI.Widget.Widget.allUpdatesComplete;
      await raf();
      dataGrid = detailsView.element.querySelector('devtools-data-grid');
      if ((dataGrid?.shadowRoot?.querySelectorAll('tbody tr.data-grid-data-grid-node').length ?? 0) > 0) {
        break;
      }
    }
    assert.isNotNull(dataGrid);
    assert.isAbove(dataGrid.shadowRoot?.querySelectorAll('tbody tr.data-grid-data-grid-node').length ?? 0, 0);

    (document.activeElement as HTMLElement | null)?.blur();
    await assertScreenshot('timeline/selector_stats_view.png');
  });
});
