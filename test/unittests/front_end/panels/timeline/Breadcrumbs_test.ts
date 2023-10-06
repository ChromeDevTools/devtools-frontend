// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TraceEngine from '../../../../../front_end/models/trace/trace.js';
import * as TimelineComponents from '../../../../../front_end/panels/timeline/components/components.js';

describe('Timeline breadcrumbs', () => {
  it('can create breadcrumbs', () => {
    const initialTraceWindow: TraceEngine.Types.Timing.TraceWindow = {
      min: TraceEngine.Types.Timing.MicroSeconds(1),
      max: TraceEngine.Types.Timing.MicroSeconds(10),
      range: TraceEngine.Types.Timing.MicroSeconds(9),
    };

    const crumbs = new TimelineComponents.Breadcrumbs.Breadcrumbs(initialTraceWindow);

    const traceWindow1: TraceEngine.Types.Timing.TraceWindow = {
      min: TraceEngine.Types.Timing.MicroSeconds(3),
      max: TraceEngine.Types.Timing.MicroSeconds(9),
      range: TraceEngine.Types.Timing.MicroSeconds(6),
    };

    const traceWindow2: TraceEngine.Types.Timing.TraceWindow = {
      min: TraceEngine.Types.Timing.MicroSeconds(4),
      max: TraceEngine.Types.Timing.MicroSeconds(6),
      range: TraceEngine.Types.Timing.MicroSeconds(2),
    };

    crumbs.add(traceWindow1);
    crumbs.add(traceWindow2);

    const breadcrumb2: TimelineComponents.Breadcrumbs.Breadcrumb = {
      window: traceWindow2,
      child: null,
    };

    const breadcrumb1: TimelineComponents.Breadcrumbs.Breadcrumb = {
      window: traceWindow1,
      child: breadcrumb2,
    };

    const initialBreadcrumb: TimelineComponents.Breadcrumbs.Breadcrumb = {
      window: initialTraceWindow,
      child: breadcrumb1,
    };

    assert.deepEqual(
        TimelineComponents.Breadcrumbs.flattenBreadcrumbs(initialBreadcrumb),
        [initialBreadcrumb, breadcrumb1, breadcrumb2]);

    assert.deepEqual(crumbs.lastBreadcrumb, breadcrumb2);
  });

  it('can remove breadcrumbs', () => {
    const initialTraceWindow: TraceEngine.Types.Timing.TraceWindow = {
      min: TraceEngine.Types.Timing.MicroSeconds(1),
      max: TraceEngine.Types.Timing.MicroSeconds(10),
      range: TraceEngine.Types.Timing.MicroSeconds(9),
    };

    const crumbs = new TimelineComponents.Breadcrumbs.Breadcrumbs(initialTraceWindow);

    const traceWindow1: TraceEngine.Types.Timing.TraceWindow = {
      min: TraceEngine.Types.Timing.MicroSeconds(3),
      max: TraceEngine.Types.Timing.MicroSeconds(9),
      range: TraceEngine.Types.Timing.MicroSeconds(6),
    };

    const traceWindow2: TraceEngine.Types.Timing.TraceWindow = {
      min: TraceEngine.Types.Timing.MicroSeconds(4),
      max: TraceEngine.Types.Timing.MicroSeconds(6),
      range: TraceEngine.Types.Timing.MicroSeconds(2),
    };

    crumbs.add(traceWindow1);
    crumbs.add(traceWindow2);

    const breadcrumb2: TimelineComponents.Breadcrumbs.Breadcrumb = {
      window: traceWindow2,
      child: null,
    };

    const breadcrumb1: TimelineComponents.Breadcrumbs.Breadcrumb = {
      window: traceWindow1,
      child: breadcrumb2,
    };

    const initialBreadcrumb: TimelineComponents.Breadcrumbs.Breadcrumb = {
      window: initialTraceWindow,
      child: breadcrumb1,
    };

    assert.deepEqual(
        TimelineComponents.Breadcrumbs.flattenBreadcrumbs(initialBreadcrumb),
        [initialBreadcrumb, breadcrumb1, breadcrumb2]);
    assert.deepEqual(crumbs.lastBreadcrumb, breadcrumb2);
    crumbs.makeBreadcrumbActive(breadcrumb1);

    breadcrumb1.child = null;

    assert.deepEqual(
        TimelineComponents.Breadcrumbs.flattenBreadcrumbs(initialBreadcrumb), [initialBreadcrumb, breadcrumb1]);
    assert.deepEqual(crumbs.lastBreadcrumb, breadcrumb1);
  });

  it('can not create a breadcrumb equal to the parent breadcrumb', () => {
    assert.throws(() => {
      const initialTraceWindow: TraceEngine.Types.Timing.TraceWindow = {
        min: TraceEngine.Types.Timing.MicroSeconds(1),
        max: TraceEngine.Types.Timing.MicroSeconds(10),
        range: TraceEngine.Types.Timing.MicroSeconds(9),
      };

      const crumbs = new TimelineComponents.Breadcrumbs.Breadcrumbs(initialTraceWindow);

      const traceWindow1: TraceEngine.Types.Timing.TraceWindow = {
        min: TraceEngine.Types.Timing.MicroSeconds(1),
        max: TraceEngine.Types.Timing.MicroSeconds(10),
        range: TraceEngine.Types.Timing.MicroSeconds(9),
      };

      crumbs.add(traceWindow1);
    }, 'Can not add a breadcrumb that is equal to or is outside of the parent breadcrumb TimeWindow');
  });

  it('can create breadcrumbs with equal start or end as the parent breadcrumb', () => {
    const initialTraceWindow: TraceEngine.Types.Timing.TraceWindow = {
      min: TraceEngine.Types.Timing.MicroSeconds(1),
      max: TraceEngine.Types.Timing.MicroSeconds(10),
      range: TraceEngine.Types.Timing.MicroSeconds(9),
    };

    const crumbs = new TimelineComponents.Breadcrumbs.Breadcrumbs(initialTraceWindow);

    const traceWindow1: TraceEngine.Types.Timing.TraceWindow = {
      min: TraceEngine.Types.Timing.MicroSeconds(1),
      max: TraceEngine.Types.Timing.MicroSeconds(9),
      range: TraceEngine.Types.Timing.MicroSeconds(8),
    };

    const traceWindow2: TraceEngine.Types.Timing.TraceWindow = {
      min: TraceEngine.Types.Timing.MicroSeconds(3),
      max: TraceEngine.Types.Timing.MicroSeconds(9),
      range: TraceEngine.Types.Timing.MicroSeconds(6),
    };

    crumbs.add(traceWindow1);
    crumbs.add(traceWindow2);

    const breadcrumb2: TimelineComponents.Breadcrumbs.Breadcrumb = {
      window: traceWindow2,
      child: null,
    };

    const breadcrumb1: TimelineComponents.Breadcrumbs.Breadcrumb = {
      window: traceWindow1,
      child: breadcrumb2,
    };

    const initialBreadcrumb: TimelineComponents.Breadcrumbs.Breadcrumb = {
      window: initialTraceWindow,
      child: breadcrumb1,
    };

    assert.deepEqual(
        TimelineComponents.Breadcrumbs.flattenBreadcrumbs(initialBreadcrumb),
        [initialBreadcrumb, breadcrumb1, breadcrumb2]);
    assert.deepEqual(crumbs.lastBreadcrumb, breadcrumb2);
  });
});
