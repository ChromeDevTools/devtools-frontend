// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as TraceEngine from '../../../models/trace/trace.js';

export interface Breadcrumb {
  window: TraceEngine.Types.Timing.TraceWindow;
  child: Breadcrumb|null;
}

export function flattenBreadcrumbs(initialBreadcrumb: Breadcrumb): Breadcrumb[] {
  const allBreadcrumbs: Breadcrumb[] = [initialBreadcrumb];
  let breadcrumbsIter: Breadcrumb = initialBreadcrumb;

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
  readonly initialBreadcrumb: Breadcrumb;
  lastBreadcrumb: Breadcrumb;

  constructor(initialTraceWindow: TraceEngine.Types.Timing.TraceWindow) {
    this.initialBreadcrumb = {
      window: initialTraceWindow,
      child: null,
    };
    this.lastBreadcrumb = this.initialBreadcrumb;
  }

  add(newBreadcrumbTraceWindow: TraceEngine.Types.Timing.TraceWindow): void {
    if (this.isTraceWindowWithinTraceWindow(newBreadcrumbTraceWindow, this.lastBreadcrumb.window)) {
      const newBreadcrumb = {
        window: newBreadcrumbTraceWindow,
        child: null,
      };
      // To add a new Breadcrumb to the Breadcrumbs Linked List, set the child of last breadcrumb
      // to the new breadcrumb and update the last Breadcrumb
      this.lastBreadcrumb.child = newBreadcrumb;
      this.lastBreadcrumb = this.lastBreadcrumb.child;
    } else {
      throw new Error('Can not add a breadcrumb that is equal to or is outside of the parent breadcrumb TimeWindow');
    }
  }

  // Breadcumb should be within the bounds of the parent and can not have both start and end be equal to the parent
  isTraceWindowWithinTraceWindow(
      child: TraceEngine.Types.Timing.TraceWindow, parent: TraceEngine.Types.Timing.TraceWindow): boolean {
    return (child.min >= parent.min && child.max <= parent.max) &&
        !(child.min === parent.min && child.max === parent.max);
  }

  // Make breadcrumb active by removing all of its children and making it the last breadcrumb
  makeBreadcrumbActive(newLastBreadcrumb: Breadcrumb): void {
    this.lastBreadcrumb = newLastBreadcrumb;
    this.lastBreadcrumb.child = null;
  }
}
