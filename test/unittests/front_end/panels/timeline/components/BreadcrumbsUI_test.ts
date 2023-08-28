// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TraceEngine from '../../../../../../front_end/models/trace/trace.js';
import * as TimelineComponents from '../../../../../../front_end/panels/timeline/components/components.js';
import * as Coordinator from '../../../../../../front_end/ui/components/render_coordinator/render_coordinator.js';
import {assertShadowRoot, renderElementIntoDOM} from '../../../helpers/DOMHelpers.js';

describe('BreadcrumbsUI', async () => {
  const {BreadcrumbsUI} = TimelineComponents.BreadcrumbsUI;

  function queryBreadcrumbs(component: HTMLElement): (string)[] {
    assertShadowRoot(component.shadowRoot);
    const breadcrumbs = component.shadowRoot.querySelectorAll<HTMLElement>('.breadcrumb');
    return Array.from(breadcrumbs).map(row => {
      return row.querySelector('.range')?.textContent || '';
    });
  }

  it('renders one breadcrumb', async () => {
    const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();
    const component = new BreadcrumbsUI();
    renderElementIntoDOM(component);

    const traceWindow: TraceEngine.Types.Timing.TraceWindow = {
      min: TraceEngine.Types.Timing.MicroSeconds(1),
      max: TraceEngine.Types.Timing.MicroSeconds(10),
      range: TraceEngine.Types.Timing.MicroSeconds(9),
    };

    const breadcrumb: TimelineComponents.Breadcrumbs.Breadcrumb = {
      window: traceWindow,
      child: null,
    };

    component.data = {breadcrumb};

    await coordinator.done();

    const breadcrumbsRanges = queryBreadcrumbs(component);

    assert.deepStrictEqual(breadcrumbsRanges.length, 1);
    assert.deepStrictEqual(breadcrumbsRanges, ['9.00 ms']);
  });

  it('renders all the breadcrumbs provided', async () => {
    const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();
    const component = new BreadcrumbsUI();
    renderElementIntoDOM(component);

    const traceWindow2: TraceEngine.Types.Timing.TraceWindow = {
      min: TraceEngine.Types.Timing.MicroSeconds(2),
      max: TraceEngine.Types.Timing.MicroSeconds(9),
      range: TraceEngine.Types.Timing.MicroSeconds(7),
    };

    const traceWindow: TraceEngine.Types.Timing.TraceWindow = {
      min: TraceEngine.Types.Timing.MicroSeconds(1),
      max: TraceEngine.Types.Timing.MicroSeconds(10),
      range: TraceEngine.Types.Timing.MicroSeconds(9),
    };

    const breadcrumb2: TimelineComponents.Breadcrumbs.Breadcrumb = {
      window: traceWindow2,
      child: null,
    };

    const breadcrumb: TimelineComponents.Breadcrumbs.Breadcrumb = {
      window: traceWindow,
      child: breadcrumb2,
    };

    component.data = {breadcrumb};

    await coordinator.done();

    const breadcrumbsRanges = queryBreadcrumbs(component);

    assert.deepStrictEqual(breadcrumbsRanges.length, 2);
    assert.deepStrictEqual(breadcrumbsRanges, ['9.00 ms', '7.00 ms']);
  });
});
