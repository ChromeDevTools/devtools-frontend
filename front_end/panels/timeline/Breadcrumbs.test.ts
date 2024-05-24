// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TraceEngine from '../../models/trace/trace.js';
import * as TraceBounds from '../../services/trace_bounds/trace_bounds.js';

import * as TimelineComponents from './components/components.js';

describe('Timeline breadcrumbs', () => {
  it('can create breadcrumbs', () => {
    const initialTraceWindow: TraceEngine.Types.Timing.TraceWindowMicroSeconds = {
      min: TraceEngine.Types.Timing.MicroSeconds(1),
      max: TraceEngine.Types.Timing.MicroSeconds(10),
      range: TraceEngine.Types.Timing.MicroSeconds(9),
    };
    TraceBounds.TraceBounds.BoundsManager.instance({forceNew: true}).resetWithNewBounds(initialTraceWindow);

    const crumbs = new TimelineComponents.Breadcrumbs.Breadcrumbs(initialTraceWindow);

    const traceWindow1: TraceEngine.Types.Timing.TraceWindowMicroSeconds = {
      min: TraceEngine.Types.Timing.MicroSeconds(3),
      max: TraceEngine.Types.Timing.MicroSeconds(9),
      range: TraceEngine.Types.Timing.MicroSeconds(6),
    };

    const traceWindow2: TraceEngine.Types.Timing.TraceWindowMicroSeconds = {
      min: TraceEngine.Types.Timing.MicroSeconds(4),
      max: TraceEngine.Types.Timing.MicroSeconds(6),
      range: TraceEngine.Types.Timing.MicroSeconds(2),
    };

    crumbs.add(traceWindow1);
    crumbs.add(traceWindow2);

    const breadcrumb2: TraceEngine.Types.File.Breadcrumb = {
      window: traceWindow2,
      child: null,
    };

    const breadcrumb1: TraceEngine.Types.File.Breadcrumb = {
      window: traceWindow1,
      child: breadcrumb2,
    };

    const initialBreadcrumb: TraceEngine.Types.File.Breadcrumb = {
      window: initialTraceWindow,
      child: breadcrumb1,
    };

    assert.deepEqual(
        TimelineComponents.Breadcrumbs.flattenBreadcrumbs(initialBreadcrumb),
        [initialBreadcrumb, breadcrumb1, breadcrumb2]);

    assert.deepEqual(crumbs.lastBreadcrumb, breadcrumb2);
  });

  it('can remove breadcrumbs', () => {
    const initialTraceWindow: TraceEngine.Types.Timing.TraceWindowMicroSeconds = {
      min: TraceEngine.Types.Timing.MicroSeconds(1),
      max: TraceEngine.Types.Timing.MicroSeconds(10),
      range: TraceEngine.Types.Timing.MicroSeconds(9),
    };
    TraceBounds.TraceBounds.BoundsManager.instance({forceNew: true}).resetWithNewBounds(initialTraceWindow);

    const crumbs = new TimelineComponents.Breadcrumbs.Breadcrumbs(initialTraceWindow);

    const traceWindow1: TraceEngine.Types.Timing.TraceWindowMicroSeconds = {
      min: TraceEngine.Types.Timing.MicroSeconds(3),
      max: TraceEngine.Types.Timing.MicroSeconds(9),
      range: TraceEngine.Types.Timing.MicroSeconds(6),
    };

    const traceWindow2: TraceEngine.Types.Timing.TraceWindowMicroSeconds = {
      min: TraceEngine.Types.Timing.MicroSeconds(4),
      max: TraceEngine.Types.Timing.MicroSeconds(6),
      range: TraceEngine.Types.Timing.MicroSeconds(2),
    };

    crumbs.add(traceWindow1);
    crumbs.add(traceWindow2);

    const breadcrumb2: TraceEngine.Types.File.Breadcrumb = {
      window: traceWindow2,
      child: null,
    };

    const breadcrumb1: TraceEngine.Types.File.Breadcrumb = {
      window: traceWindow1,
      child: breadcrumb2,
    };

    const initialBreadcrumb: TraceEngine.Types.File.Breadcrumb = {
      window: initialTraceWindow,
      child: breadcrumb1,
    };

    assert.deepEqual(
        TimelineComponents.Breadcrumbs.flattenBreadcrumbs(initialBreadcrumb),
        [initialBreadcrumb, breadcrumb1, breadcrumb2]);
    assert.deepEqual(crumbs.lastBreadcrumb, breadcrumb2);
    crumbs.setLastBreadcrumb(breadcrumb1);

    breadcrumb1.child = null;

    assert.deepEqual(
        TimelineComponents.Breadcrumbs.flattenBreadcrumbs(initialBreadcrumb), [initialBreadcrumb, breadcrumb1]);
    assert.deepEqual(crumbs.lastBreadcrumb, breadcrumb1);
  });

  it('can not create a breadcrumb equal to the parent breadcrumb', () => {
    assert.throws(() => {
      const initialTraceWindow: TraceEngine.Types.Timing.TraceWindowMicroSeconds = {
        min: TraceEngine.Types.Timing.MicroSeconds(1),
        max: TraceEngine.Types.Timing.MicroSeconds(10),
        range: TraceEngine.Types.Timing.MicroSeconds(9),
      };
      TraceBounds.TraceBounds.BoundsManager.instance({forceNew: true}).resetWithNewBounds(initialTraceWindow);

      const crumbs = new TimelineComponents.Breadcrumbs.Breadcrumbs(initialTraceWindow);

      const traceWindow1: TraceEngine.Types.Timing.TraceWindowMicroSeconds = {
        min: TraceEngine.Types.Timing.MicroSeconds(1),
        max: TraceEngine.Types.Timing.MicroSeconds(10),
        range: TraceEngine.Types.Timing.MicroSeconds(9),
      };

      crumbs.add(traceWindow1);
    }, 'Can not add a breadcrumb that is equal to or is outside of the parent breadcrumb TimeWindow');
  });

  it('can create breadcrumbs with equal start or end as the parent breadcrumb', () => {
    const initialTraceWindow: TraceEngine.Types.Timing.TraceWindowMicroSeconds = {
      min: TraceEngine.Types.Timing.MicroSeconds(1),
      max: TraceEngine.Types.Timing.MicroSeconds(10),
      range: TraceEngine.Types.Timing.MicroSeconds(9),
    };
    TraceBounds.TraceBounds.BoundsManager.instance({forceNew: true}).resetWithNewBounds(initialTraceWindow);

    const crumbs = new TimelineComponents.Breadcrumbs.Breadcrumbs(initialTraceWindow);

    const traceWindow1: TraceEngine.Types.Timing.TraceWindowMicroSeconds = {
      min: TraceEngine.Types.Timing.MicroSeconds(1),
      max: TraceEngine.Types.Timing.MicroSeconds(9),
      range: TraceEngine.Types.Timing.MicroSeconds(8),
    };

    const traceWindow2: TraceEngine.Types.Timing.TraceWindowMicroSeconds = {
      min: TraceEngine.Types.Timing.MicroSeconds(3),
      max: TraceEngine.Types.Timing.MicroSeconds(9),
      range: TraceEngine.Types.Timing.MicroSeconds(6),
    };

    crumbs.add(traceWindow1);
    crumbs.add(traceWindow2);

    const breadcrumb2: TraceEngine.Types.File.Breadcrumb = {
      window: traceWindow2,
      child: null,
    };

    const breadcrumb1: TraceEngine.Types.File.Breadcrumb = {
      window: traceWindow1,
      child: breadcrumb2,
    };

    const initialBreadcrumb: TraceEngine.Types.File.Breadcrumb = {
      window: initialTraceWindow,
      child: breadcrumb1,
    };

    assert.deepEqual(
        TimelineComponents.Breadcrumbs.flattenBreadcrumbs(initialBreadcrumb),
        [initialBreadcrumb, breadcrumb1, breadcrumb2]);
    assert.deepEqual(crumbs.lastBreadcrumb, breadcrumb2);
  });

  it('correctly sets the last breadrumb and trace bound window when a new initial breadcrumb is provided', () => {
    const initialTraceWindow: TraceEngine.Types.Timing.TraceWindowMicroSeconds = {
      min: TraceEngine.Types.Timing.MicroSeconds(1000),
      max: TraceEngine.Types.Timing.MicroSeconds(10000),
      range: TraceEngine.Types.Timing.MicroSeconds(9000),
    };
    TraceBounds.TraceBounds.BoundsManager.instance({forceNew: true}).resetWithNewBounds(initialTraceWindow);

    const crumbs = new TimelineComponents.Breadcrumbs.Breadcrumbs(initialTraceWindow);

    const traceWindow1: TraceEngine.Types.Timing.TraceWindowMicroSeconds = {
      min: TraceEngine.Types.Timing.MicroSeconds(1000),
      max: TraceEngine.Types.Timing.MicroSeconds(9000),
      range: TraceEngine.Types.Timing.MicroSeconds(8000),
    };

    const traceWindow2: TraceEngine.Types.Timing.TraceWindowMicroSeconds = {
      min: TraceEngine.Types.Timing.MicroSeconds(3000),
      max: TraceEngine.Types.Timing.MicroSeconds(9000),
      range: TraceEngine.Types.Timing.MicroSeconds(6000),
    };

    const breadcrumb2: TraceEngine.Types.File.Breadcrumb = {
      window: traceWindow2,
      child: null,
    };

    const breadcrumb1: TraceEngine.Types.File.Breadcrumb = {
      window: traceWindow1,
      child: breadcrumb2,
    };

    const initialBreadcrumb: TraceEngine.Types.File.Breadcrumb = {
      window: initialTraceWindow,
      child: breadcrumb1,
    };

    crumbs.setInitialBreadcrumbFromLoadedModifications(initialBreadcrumb);

    assert.deepEqual(
        TimelineComponents.Breadcrumbs.flattenBreadcrumbs(initialBreadcrumb),
        [initialBreadcrumb, breadcrumb1, breadcrumb2]);
    assert.deepEqual(crumbs.lastBreadcrumb, breadcrumb2);

    // Make sure the trace bounds were correctly set to the last breadcrumb bounds
    assert.deepEqual(TraceBounds.TraceBounds.BoundsManager.instance().state()?.micro.minimapTraceBounds.min, 3000);
    assert.deepEqual(TraceBounds.TraceBounds.BoundsManager.instance().state()?.micro.minimapTraceBounds.max, 9000);
    assert.deepEqual(TraceBounds.TraceBounds.BoundsManager.instance().state()?.micro.minimapTraceBounds.range, 6000);

    // Make sure the TimelineVisibleWindow was correctly set to the last breadcrumb bounds
    assert.deepEqual(TraceBounds.TraceBounds.BoundsManager.instance().state()?.micro.timelineTraceWindow.min, 3000);
    assert.deepEqual(TraceBounds.TraceBounds.BoundsManager.instance().state()?.micro.timelineTraceWindow.max, 9000);
    assert.deepEqual(TraceBounds.TraceBounds.BoundsManager.instance().state()?.micro.timelineTraceWindow.range, 6000);
  });
});
