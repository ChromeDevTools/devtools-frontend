// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Trace from '../../../../../front_end/models/trace/trace.js';
import * as Types from '../../../../../front_end/models/trace/types/types.js';
import * as Timeline from '../../../../../front_end/panels/timeline/timeline.js';

describe('Timeline breadcrumbs', () => {
  it('can create breadcrumbs', () => {
    const initialTraceWindow: Trace.Types.Timing.TraceWindow = {
      min: Types.Timing.MicroSeconds(1),
      max: Types.Timing.MicroSeconds(10),
      range: Types.Timing.MicroSeconds(9),
    };

    const crumbs = new Timeline.Breadcrumbs.Breadcrumbs(initialTraceWindow);

    const traceWindow1: Trace.Types.Timing.TraceWindow = {
      min: Types.Timing.MicroSeconds(3),
      max: Types.Timing.MicroSeconds(9),
      range: Types.Timing.MicroSeconds(6),
    };

    const traceWindow2: Trace.Types.Timing.TraceWindow = {
      min: Types.Timing.MicroSeconds(4),
      max: Types.Timing.MicroSeconds(6),
      range: Types.Timing.MicroSeconds(2),
    };

    crumbs.add(traceWindow1);
    crumbs.add(traceWindow2);

    const breadcrumb2: Timeline.Breadcrumbs.Breadcrumb = {
      window: traceWindow2,
      child: null,
    };

    const breadcrumb1: Timeline.Breadcrumbs.Breadcrumb = {
      window: traceWindow1,
      child: breadcrumb2,
    };

    const initialBreadcrumb: Timeline.Breadcrumbs.Breadcrumb = {
      window: initialTraceWindow,
      child: breadcrumb1,
    };

    assert.deepEqual(crumbs.allCrumbs(), [initialBreadcrumb, breadcrumb1, breadcrumb2]);
  });

  it('can remove breadcrumbs', () => {
    const initialTraceWindow: Trace.Types.Timing.TraceWindow = {
      min: Types.Timing.MicroSeconds(1),
      max: Types.Timing.MicroSeconds(10),
      range: Types.Timing.MicroSeconds(9),
    };

    const crumbs = new Timeline.Breadcrumbs.Breadcrumbs(initialTraceWindow);

    const traceWindow1: Trace.Types.Timing.TraceWindow = {
      min: Types.Timing.MicroSeconds(3),
      max: Types.Timing.MicroSeconds(9),
      range: Types.Timing.MicroSeconds(6),
    };

    const traceWindow2: Trace.Types.Timing.TraceWindow = {
      min: Types.Timing.MicroSeconds(4),
      max: Types.Timing.MicroSeconds(6),
      range: Types.Timing.MicroSeconds(2),
    };

    crumbs.add(traceWindow1);
    crumbs.add(traceWindow2);

    const breadcrumb2: Timeline.Breadcrumbs.Breadcrumb = {
      window: traceWindow2,
      child: null,
    };

    const breadcrumb1: Timeline.Breadcrumbs.Breadcrumb = {
      window: traceWindow1,
      child: breadcrumb2,
    };

    const initialBreadcrumb: Timeline.Breadcrumbs.Breadcrumb = {
      window: initialTraceWindow,
      child: breadcrumb1,
    };

    assert.deepEqual(crumbs.allCrumbs(), [initialBreadcrumb, breadcrumb1, breadcrumb2]);
    crumbs.makeBreadcrumbActive(traceWindow1);

    breadcrumb1.child = null;

    assert.deepEqual(crumbs.allCrumbs(), [initialBreadcrumb, breadcrumb1]);
  });

  it('can not create a breadcrumb equal to the parent breadcrumb', () => {
    assert.throws(() => {
      const initialTraceWindow: Trace.Types.Timing.TraceWindow = {
        min: Types.Timing.MicroSeconds(1),
        max: Types.Timing.MicroSeconds(10),
        range: Types.Timing.MicroSeconds(9),
      };

      const crumbs = new Timeline.Breadcrumbs.Breadcrumbs(initialTraceWindow);

      const traceWindow1: Trace.Types.Timing.TraceWindow = {
        min: Types.Timing.MicroSeconds(1),
        max: Types.Timing.MicroSeconds(10),
        range: Types.Timing.MicroSeconds(9),
      };

      crumbs.add(traceWindow1);
    }, 'Can not add a breadcrumb that is equal to or is outside of the parent breadcrumb TimeWindow');
  });

  it('can create breadcrumbs with equal start or end as the parent breadcrumb', () => {
    const initialTraceWindow: Trace.Types.Timing.TraceWindow = {
      min: Types.Timing.MicroSeconds(1),
      max: Types.Timing.MicroSeconds(10),
      range: Types.Timing.MicroSeconds(9),
    };

    const crumbs = new Timeline.Breadcrumbs.Breadcrumbs(initialTraceWindow);

    const traceWindow1: Trace.Types.Timing.TraceWindow = {
      min: Types.Timing.MicroSeconds(1),
      max: Types.Timing.MicroSeconds(9),
      range: Types.Timing.MicroSeconds(8),
    };

    const traceWindow2: Trace.Types.Timing.TraceWindow = {
      min: Types.Timing.MicroSeconds(3),
      max: Types.Timing.MicroSeconds(9),
      range: Types.Timing.MicroSeconds(6),
    };

    crumbs.add(traceWindow1);
    crumbs.add(traceWindow2);

    const breadcrumb2: Timeline.Breadcrumbs.Breadcrumb = {
      window: traceWindow2,
      child: null,
    };

    const breadcrumb1: Timeline.Breadcrumbs.Breadcrumb = {
      window: traceWindow1,
      child: breadcrumb2,
    };

    const initialBreadcrumb: Timeline.Breadcrumbs.Breadcrumb = {
      window: initialTraceWindow,
      child: breadcrumb1,
    };

    assert.deepEqual(crumbs.allCrumbs(), [initialBreadcrumb, breadcrumb1, breadcrumb2]);
  });
});
