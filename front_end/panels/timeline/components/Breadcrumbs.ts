// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as TraceEngine from '../../../models/trace/trace.js';
import * as TraceBounds from '../../../services/trace_bounds/trace_bounds.js';

export function flattenBreadcrumbs(initialBreadcrumb: TraceEngine.Types.File.Breadcrumb):
    TraceEngine.Types.File.Breadcrumb[] {
  const allBreadcrumbs: TraceEngine.Types.File.Breadcrumb[] = [initialBreadcrumb];
  let breadcrumbsIter: TraceEngine.Types.File.Breadcrumb = initialBreadcrumb;

  while (breadcrumbsIter.child !== null) {
    const iterChild = breadcrumbsIter.child;
    if (iterChild !== null) {
      allBreadcrumbs.push(iterChild);
      breadcrumbsIter = iterChild;
    }
  }

  return allBreadcrumbs;
}

export class Breadcrumbs {
  initialBreadcrumb: TraceEngine.Types.File.Breadcrumb;
  lastBreadcrumb: TraceEngine.Types.File.Breadcrumb;

  constructor(initialTraceWindow: TraceEngine.Types.Timing.TraceWindowMicroSeconds) {
    this.initialBreadcrumb = {
      window: initialTraceWindow,
      child: null,
    };
    this.lastBreadcrumb = this.initialBreadcrumb;
  }

  add(newBreadcrumbTraceWindow: TraceEngine.Types.Timing.TraceWindowMicroSeconds): void {
    if (this.isTraceWindowWithinTraceWindow(newBreadcrumbTraceWindow, this.lastBreadcrumb.window)) {
      const newBreadcrumb = {
        window: newBreadcrumbTraceWindow,
        child: null,
      };
      // To add a new Breadcrumb to the Breadcrumbs Linked List, set the child of last breadcrumb
      // to the new breadcrumb and update the last Breadcrumb
      this.lastBreadcrumb.child = newBreadcrumb;
      this.setLastBreadcrumb(newBreadcrumb);
    } else {
      throw new Error('Can not add a breadcrumb that is equal to or is outside of the parent breadcrumb TimeWindow');
    }
  }

  // Breadcumb should be within the bounds of the parent and can not have both start and end be equal to the parent
  isTraceWindowWithinTraceWindow(
      child: TraceEngine.Types.Timing.TraceWindowMicroSeconds,
      parent: TraceEngine.Types.Timing.TraceWindowMicroSeconds): boolean {
    return (child.min >= parent.min && child.max <= parent.max) &&
        !(child.min === parent.min && child.max === parent.max);
  }

  // Used to set an initial breadcrumbs from modifications loaded from a file
  setInitialBreadcrumbFromLoadedModifications(initialBreadcrumb: TraceEngine.Types.File.Breadcrumb): void {
    this.initialBreadcrumb = initialBreadcrumb;
    // Make last breadcrumb active
    let lastBreadcrumb = initialBreadcrumb;
    while (lastBreadcrumb.child !== null) {
      lastBreadcrumb = lastBreadcrumb.child;
    }
    this.setLastBreadcrumb(lastBreadcrumb);
  }

  setLastBreadcrumb(lastBreadcrumb: TraceEngine.Types.File.Breadcrumb): void {
    // When we assign a new active breadcrumb, both the minimap bounds and the visible
    // window get set to that breadcrumb's window.
    this.lastBreadcrumb = lastBreadcrumb;
    this.lastBreadcrumb.child = null;
    TraceBounds.TraceBounds.BoundsManager.instance().setMiniMapBounds(
        lastBreadcrumb.window,
    );
    TraceBounds.TraceBounds.BoundsManager.instance().setTimelineVisibleWindow(
        lastBreadcrumb.window,
    );
  }
}
