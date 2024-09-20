// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Trace from '../../models/trace/trace.js';
import * as TraceBounds from '../../services/trace_bounds/trace_bounds.js';

import * as TimelineComponents from './components/components.js';

function nestedBreadcrumbs(): {
  initialBreadcrumb: Trace.Types.File.Breadcrumb,
  breadcrumb1: Trace.Types.File.Breadcrumb,
  breadcrumb2: Trace.Types.File.Breadcrumb,
} {
  const initialTraceWindow: Trace.Types.Timing.TraceWindowMicroSeconds = {
    min: Trace.Types.Timing.MicroSeconds(1000),
    max: Trace.Types.Timing.MicroSeconds(10000),
    range: Trace.Types.Timing.MicroSeconds(9000),
  };

  const traceWindow1: Trace.Types.Timing.TraceWindowMicroSeconds = {
    min: Trace.Types.Timing.MicroSeconds(3000),
    max: Trace.Types.Timing.MicroSeconds(9000),
    range: Trace.Types.Timing.MicroSeconds(6000),
  };

  const traceWindow2: Trace.Types.Timing.TraceWindowMicroSeconds = {
    min: Trace.Types.Timing.MicroSeconds(4000),
    max: Trace.Types.Timing.MicroSeconds(6000),
    range: Trace.Types.Timing.MicroSeconds(2000),
  };

  const breadcrumb2: Trace.Types.File.Breadcrumb = {
    window: traceWindow2,
    child: null,
  };

  const breadcrumb1: Trace.Types.File.Breadcrumb = {
    window: traceWindow1,
    child: breadcrumb2,
  };

  const initialBreadcrumb: Trace.Types.File.Breadcrumb = {
    window: initialTraceWindow,
    child: breadcrumb1,
  };

  return {
    initialBreadcrumb,
    breadcrumb1,
    breadcrumb2,
  };
}

describe('Timeline breadcrumbs', () => {
  it('can create breadcrumbs', () => {
    const {initialBreadcrumb, breadcrumb1, breadcrumb2} = nestedBreadcrumbs();

    TraceBounds.TraceBounds.BoundsManager.instance({forceNew: true}).resetWithNewBounds(initialBreadcrumb.window);
    const crumbs = new TimelineComponents.Breadcrumbs.Breadcrumbs(initialBreadcrumb.window);

    crumbs.add(breadcrumb1.window);
    crumbs.add(breadcrumb2.window);

    assert.deepEqual(
        TimelineComponents.Breadcrumbs.flattenBreadcrumbs(initialBreadcrumb),
        [initialBreadcrumb, breadcrumb1, breadcrumb2]);

    assert.deepEqual(crumbs.activeBreadcrumb, breadcrumb2);
  });

  it('can activate breadcrumbs', () => {
    const {initialBreadcrumb, breadcrumb1, breadcrumb2} = nestedBreadcrumbs();

    TraceBounds.TraceBounds.BoundsManager.instance({forceNew: true}).resetWithNewBounds(initialBreadcrumb.window);
    const crumbs = new TimelineComponents.Breadcrumbs.Breadcrumbs(initialBreadcrumb.window);
    crumbs.add(breadcrumb1.window);
    crumbs.add(breadcrumb2.window);

    // Last added breadcrumb should be active
    assert.deepEqual(crumbs.activeBreadcrumb, breadcrumb2);

    // Make sure breadcrumb 1 can be actived
    crumbs.setActiveBreadcrumb(breadcrumb1, {
      removeChildBreadcrumbs: false,
      updateVisibleWindow: true,
    });
    assert.deepEqual(crumbs.activeBreadcrumb, breadcrumb1);

    // Make sure initial breadcrumb can be actived
    crumbs.setActiveBreadcrumb(initialBreadcrumb, {
      removeChildBreadcrumbs: false,
      updateVisibleWindow: true,
    });
    assert.deepEqual(crumbs.activeBreadcrumb, initialBreadcrumb);

    // No breadcrumb were removed
    assert.deepEqual(
        TimelineComponents.Breadcrumbs.flattenBreadcrumbs(initialBreadcrumb),
        [initialBreadcrumb, breadcrumb1, breadcrumb2]);
  });

  it('can overwrite child breadcrumbs when a new one is added', () => {
    const {initialBreadcrumb, breadcrumb1, breadcrumb2} = nestedBreadcrumbs();

    TraceBounds.TraceBounds.BoundsManager.instance({forceNew: true}).resetWithNewBounds(initialBreadcrumb.window);

    const crumbs = new TimelineComponents.Breadcrumbs.Breadcrumbs(initialBreadcrumb.window);
    crumbs.add(breadcrumb1.window);
    crumbs.add(breadcrumb2.window);

    // Last added breadcrumb should be active
    assert.deepEqual(crumbs.activeBreadcrumb, breadcrumb2);

    // Currently, breadcrumbs structure is:
    // initialBreadcrumb -> breadcrumb1 -> breadcrumb2(activated)
    assert.deepEqual(
        TimelineComponents.Breadcrumbs.flattenBreadcrumbs(initialBreadcrumb),
        [initialBreadcrumb, breadcrumb1, breadcrumb2]);

    // In this test we want to check if the children of the activated breadcrumb will be overwrritten if a new one is added
    // Make the initial breadcrumb active:
    // initialBreadcrumb(activated) -> breadcrumb1 -> breadcrumb2
    crumbs.setActiveBreadcrumb(initialBreadcrumb, {
      removeChildBreadcrumbs: false,
      updateVisibleWindow: true,
    });
    assert.deepEqual(crumbs.activeBreadcrumb, initialBreadcrumb);

    // Add a new breadcrumb
    const traceWindow4: Trace.Types.Timing.TraceWindowMicroSeconds = {
      min: Trace.Types.Timing.MicroSeconds(2000),
      max: Trace.Types.Timing.MicroSeconds(5000),
      range: Trace.Types.Timing.MicroSeconds(3000),
    };

    const breadcrumb4: Trace.Types.File.Breadcrumb = {
      window: traceWindow4,
      child: null,
    };

    crumbs.add(traceWindow4);

    // Breadcrumbs should look like this:
    // initialBreadcrumb -> breadcrumb4
    assert.deepEqual(
        TimelineComponents.Breadcrumbs.flattenBreadcrumbs(initialBreadcrumb), [initialBreadcrumb, breadcrumb4]);
    assert.deepEqual(crumbs.activeBreadcrumb, breadcrumb4);
  });

  it('can remove breadcrumbs', () => {
    const {initialBreadcrumb, breadcrumb1, breadcrumb2} = nestedBreadcrumbs();

    TraceBounds.TraceBounds.BoundsManager.instance({forceNew: true}).resetWithNewBounds(initialBreadcrumb.window);

    const crumbs = new TimelineComponents.Breadcrumbs.Breadcrumbs(initialBreadcrumb.window);
    crumbs.add(breadcrumb1.window);
    crumbs.add(breadcrumb2.window);

    assert.deepEqual(
        TimelineComponents.Breadcrumbs.flattenBreadcrumbs(initialBreadcrumb),
        [initialBreadcrumb, breadcrumb1, breadcrumb2]);
    assert.deepEqual(crumbs.activeBreadcrumb, breadcrumb2);
    crumbs.setActiveBreadcrumb(breadcrumb1, {
      removeChildBreadcrumbs: true,
      updateVisibleWindow: true,
    });

    assert.deepEqual(
        TimelineComponents.Breadcrumbs.flattenBreadcrumbs(initialBreadcrumb), [initialBreadcrumb, breadcrumb1]);
    assert.deepEqual(crumbs.activeBreadcrumb, breadcrumb1);
  });

  it('can not create a breadcrumb equal to the parent breadcrumb', () => {
    const {initialBreadcrumb} = nestedBreadcrumbs();

    assert.throws(() => {
      TraceBounds.TraceBounds.BoundsManager.instance({forceNew: true}).resetWithNewBounds(initialBreadcrumb.window);

      const crumbs = new TimelineComponents.Breadcrumbs.Breadcrumbs(initialBreadcrumb.window);

      const equalTraceWindow: Trace.Types.Timing.TraceWindowMicroSeconds = {
        min: initialBreadcrumb.window.min,
        max: initialBreadcrumb.window.max,
        range: initialBreadcrumb.window.range,
      };

      crumbs.add(equalTraceWindow);
    }, 'Can not add a breadcrumb that is equal to or is outside of the parent breadcrumb TimeWindow');
  });

  it('can create breadcrumbs with equal start or end as the parent breadcrumb', () => {
    const initialTraceWindow: Trace.Types.Timing.TraceWindowMicroSeconds = {
      min: Trace.Types.Timing.MicroSeconds(1000),
      max: Trace.Types.Timing.MicroSeconds(10000),
      range: Trace.Types.Timing.MicroSeconds(9000),
    };
    TraceBounds.TraceBounds.BoundsManager.instance({forceNew: true}).resetWithNewBounds(initialTraceWindow);

    const crumbs = new TimelineComponents.Breadcrumbs.Breadcrumbs(initialTraceWindow);

    const traceWindow1: Trace.Types.Timing.TraceWindowMicroSeconds = {
      min: Trace.Types.Timing.MicroSeconds(1000),
      max: Trace.Types.Timing.MicroSeconds(9000),
      range: Trace.Types.Timing.MicroSeconds(8000),
    };

    const traceWindow2: Trace.Types.Timing.TraceWindowMicroSeconds = {
      min: Trace.Types.Timing.MicroSeconds(3000),
      max: Trace.Types.Timing.MicroSeconds(9000),
      range: Trace.Types.Timing.MicroSeconds(6000),
    };

    crumbs.add(traceWindow1);
    crumbs.add(traceWindow2);

    const breadcrumb2: Trace.Types.File.Breadcrumb = {
      window: traceWindow2,
      child: null,
    };

    const breadcrumb1: Trace.Types.File.Breadcrumb = {
      window: traceWindow1,
      child: breadcrumb2,
    };

    const initialBreadcrumb: Trace.Types.File.Breadcrumb = {
      window: initialTraceWindow,
      child: breadcrumb1,
    };

    assert.deepEqual(
        TimelineComponents.Breadcrumbs.flattenBreadcrumbs(initialBreadcrumb),
        [initialBreadcrumb, breadcrumb1, breadcrumb2]);
    assert.deepEqual(crumbs.activeBreadcrumb, breadcrumb2);
  });

  it('correctly sets the last breadrumb and trace bound window when a new initial breadcrumb is provided', () => {
    const {initialBreadcrumb, breadcrumb1, breadcrumb2} = nestedBreadcrumbs();
    TraceBounds.TraceBounds.BoundsManager.instance({forceNew: true}).resetWithNewBounds(initialBreadcrumb.window);

    const crumbs = new TimelineComponents.Breadcrumbs.Breadcrumbs(initialBreadcrumb.window);
    crumbs.setInitialBreadcrumbFromLoadedModifications(initialBreadcrumb);

    assert.deepEqual(
        TimelineComponents.Breadcrumbs.flattenBreadcrumbs(initialBreadcrumb),
        [initialBreadcrumb, breadcrumb1, breadcrumb2]);
    assert.deepEqual(crumbs.activeBreadcrumb, breadcrumb2);

    // Make sure the trace bounds were correctly set to the last breadcrumb bounds
    assert.deepEqual(
        TraceBounds.TraceBounds.BoundsManager.instance().state()?.micro.minimapTraceBounds, breadcrumb2.window);

    // Make sure the TimelineVisibleWindow was correctly set to the last breadcrumb bounds
    assert.deepEqual(
        TraceBounds.TraceBounds.BoundsManager.instance().state()?.micro.minimapTraceBounds, breadcrumb2.window);
  });

  it('it will not update the trace window when activating a breadcrumb if the option is set to false', () => {
    const {initialBreadcrumb, breadcrumb1, breadcrumb2} = nestedBreadcrumbs();
    TraceBounds.TraceBounds.BoundsManager.instance({forceNew: true}).resetWithNewBounds(initialBreadcrumb.window);
    const crumbs = new TimelineComponents.Breadcrumbs.Breadcrumbs(initialBreadcrumb.window);
    crumbs.setInitialBreadcrumbFromLoadedModifications(initialBreadcrumb);
    // Make sure the trace bounds were correctly set to the last breadcrumb bounds
    assert.deepEqual(
        TraceBounds.TraceBounds.BoundsManager.instance().state()?.micro.minimapTraceBounds, breadcrumb2.window);

    // Now activate breadcrumb1, but tell it not to update the bounds
    crumbs.setActiveBreadcrumb(breadcrumb1, {removeChildBreadcrumbs: false, updateVisibleWindow: false});

    // The visible window is still breadcrumb2.
    assert.deepEqual(
        TraceBounds.TraceBounds.BoundsManager.instance().state()?.micro.timelineTraceWindow, breadcrumb2.window);

    // Now activate breadcrumb1, but ask it to update the bounds this time
    crumbs.setActiveBreadcrumb(breadcrumb1, {removeChildBreadcrumbs: false, updateVisibleWindow: true});
    // Now the window has changed.
    assert.deepEqual(
        TraceBounds.TraceBounds.BoundsManager.instance().state()?.micro.timelineTraceWindow, breadcrumb1.window);
  });
});
