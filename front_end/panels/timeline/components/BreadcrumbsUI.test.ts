// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Trace from '../../../models/trace/trace.js';
import {renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import * as RenderCoordinator from '../../../ui/components/render_coordinator/render_coordinator.js';

import * as TimelineComponents from './components.js';

function milliToMicro(x: number): Trace.Types.Timing.Micro {
  return Trace.Helpers.Timing.milliToMicro(
      Trace.Types.Timing.Milli(x),
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

  function queryActiveBreadcrumb(component: HTMLElement): (string)[] {
    assert.isNotNull(component.shadowRoot);
    const breadcrumbsRanges = component.shadowRoot.querySelectorAll<HTMLElement>('.active-breadcrumb');
    return Array.from(breadcrumbsRanges).map(row => {
      return row.textContent?.trim() || '';
    });
  }

  it('renders one breadcrumb', async () => {
    const component = new BreadcrumbsUI();
    renderElementIntoDOM(component);

    const traceWindow: Trace.Types.Timing.TraceWindowMicro = {
      min: milliToMicro(1),
      max: milliToMicro(10),
      range: milliToMicro(9),
    };

    const breadcrumb: Trace.Types.File.Breadcrumb = {
      window: traceWindow,
      child: null,
    };

    component.data = {initialBreadcrumb: breadcrumb, activeBreadcrumb: breadcrumb};

    await RenderCoordinator.done();

    const breadcrumbsRanges = queryBreadcrumbs(component);

    assert.lengthOf(breadcrumbsRanges, 1);
    assert.deepEqual(breadcrumbsRanges, ['Full range (9.00 ms)']);
  });

  it('renders all the breadcrumbs provided', async () => {
    const component = new BreadcrumbsUI();
    renderElementIntoDOM(component);

    const traceWindow2: Trace.Types.Timing.TraceWindowMicro = {
      min: milliToMicro(2),
      max: milliToMicro(9),
      range: milliToMicro(7),
    };

    const traceWindow: Trace.Types.Timing.TraceWindowMicro = {
      min: milliToMicro(1),
      max: milliToMicro(10),
      range: milliToMicro(9),
    };

    const breadcrumb2: Trace.Types.File.Breadcrumb = {
      window: traceWindow2,
      child: null,
    };

    const breadcrumb: Trace.Types.File.Breadcrumb = {
      window: traceWindow,
      child: breadcrumb2,
    };

    component.data = {initialBreadcrumb: breadcrumb, activeBreadcrumb: breadcrumb2};

    await RenderCoordinator.done();

    const breadcrumbsRanges = queryBreadcrumbs(component);

    assert.lengthOf(breadcrumbsRanges, 2);
    assert.deepEqual(breadcrumbsRanges, ['Full range (9.00 ms)', '7.00 ms']);

    // There should always be one active breadcrumb
    const activeRange = queryActiveBreadcrumb(component);
    assert.lengthOf(activeRange, 1);
  });
});
