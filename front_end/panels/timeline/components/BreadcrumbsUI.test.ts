// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TraceEngine from '../../../models/trace/trace.js';
import {renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import * as Coordinator from '../../../ui/components/render_coordinator/render_coordinator.js';

import * as TimelineComponents from './components.js';

function milliToMicro(x: number): TraceEngine.Types.Timing.MicroSeconds {
  return TraceEngine.Helpers.Timing.millisecondsToMicroseconds(
      TraceEngine.Types.Timing.MilliSeconds(x),
  );
}

describeWithEnvironment('BreadcrumbsUI', () => {
  const {BreadcrumbsUI} = TimelineComponents.BreadcrumbsUI;

  function queryBreadcrumbs(component: HTMLElement): (string)[] {
    assert.isNotNull(component.shadowRoot);
    const breadcrumbsRanges = component.shadowRoot.querySelectorAll<HTMLElement>('.range');
    return Array.from(breadcrumbsRanges).map(row => {
      return row.textContent?.trim() || '';
    });
  }

  it('renders one breadcrumb', async () => {
    const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();
    const component = new BreadcrumbsUI();
    renderElementIntoDOM(component);

    const traceWindow: TraceEngine.Types.Timing.TraceWindowMicroSeconds = {
      min: milliToMicro(1),
      max: milliToMicro(10),
      range: milliToMicro(9),
    };

    const breadcrumb: TraceEngine.Types.File.Breadcrumb = {
      window: traceWindow,
      child: null,
    };

    component.data = {breadcrumb};

    await coordinator.done();

    const breadcrumbsRanges = queryBreadcrumbs(component);

    assert.deepStrictEqual(breadcrumbsRanges.length, 1);
    assert.deepStrictEqual(breadcrumbsRanges, ['Full range (9.00 ms)']);
  });

  it('renders all the breadcrumbs provided', async () => {
    const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();
    const component = new BreadcrumbsUI();
    renderElementIntoDOM(component);

    const traceWindow2: TraceEngine.Types.Timing.TraceWindowMicroSeconds = {
      min: milliToMicro(2),
      max: milliToMicro(9),
      range: milliToMicro(7),
    };

    const traceWindow: TraceEngine.Types.Timing.TraceWindowMicroSeconds = {
      min: milliToMicro(1),
      max: milliToMicro(10),
      range: milliToMicro(9),
    };

    const breadcrumb2: TraceEngine.Types.File.Breadcrumb = {
      window: traceWindow2,
      child: null,
    };

    const breadcrumb: TraceEngine.Types.File.Breadcrumb = {
      window: traceWindow,
      child: breadcrumb2,
    };

    component.data = {breadcrumb};

    await coordinator.done();

    const breadcrumbsRanges = queryBreadcrumbs(component);

    assert.deepStrictEqual(breadcrumbsRanges.length, 2);
    assert.deepStrictEqual(breadcrumbsRanges, ['Full range (9.00 ms)', '7.00 ms']);
  });
});
