// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Trace from '../../../models/trace/trace.js';
import * as TraceBounds from '../../../services/trace_bounds/trace_bounds.js';

export function flattenBreadcrumbs(initialBreadcrumb: Trace.Types.File.Breadcrumb): Trace.Types.File.Breadcrumb[] {
  const allBreadcrumbs: Trace.Types.File.Breadcrumb[] = [initialBreadcrumb];
  let breadcrumbsIter: Trace.Types.File.Breadcrumb = initialBreadcrumb;

  while (breadcrumbsIter.child !== null) {
    const iterChild = breadcrumbsIter.child;
    if (iterChild !== null) {
      allBreadcrumbs.push(iterChild);
      breadcrumbsIter = iterChild;
    }
  }

  return allBreadcrumbs;
}

export interface SetActiveBreadcrumbOptions {
  removeChildBreadcrumbs: boolean;
  updateVisibleWindow: boolean;
}

export class Breadcrumbs {
  initialBreadcrumb: Trace.Types.File.Breadcrumb;
  activeBreadcrumb: Trace.Types.File.Breadcrumb;

  constructor(initialTraceWindow: Trace.Types.Timing.TraceWindowMicroSeconds) {
    this.initialBreadcrumb = {
      window: initialTraceWindow,
      child: null,
    };
    let lastBreadcrumb = this.initialBreadcrumb;
    while (lastBreadcrumb.child !== null) {
      lastBreadcrumb = lastBreadcrumb.child;
    }
    this.activeBreadcrumb = lastBreadcrumb;
  }

  add(newBreadcrumbTraceWindow: Trace.Types.Timing.TraceWindowMicroSeconds): Trace.Types.File.Breadcrumb {
    if (!this.isTraceWindowWithinTraceWindow(newBreadcrumbTraceWindow, this.activeBreadcrumb.window)) {
      throw new Error('Can not add a breadcrumb that is equal to or is outside of the parent breadcrumb TimeWindow');
    }

    const newBreadcrumb = {
      window: newBreadcrumbTraceWindow,
      child: null,
    };
    // To add a new Breadcrumb to the Breadcrumbs Linked List, set the child of active breadcrumb
    // to the new breadcrumb and update the active Breadcrumb to the newly added one
    this.activeBreadcrumb.child = newBreadcrumb;
    this.setActiveBreadcrumb(newBreadcrumb, {removeChildBreadcrumbs: false, updateVisibleWindow: true});
    return newBreadcrumb;
  }

  // Breadcumb should be within the bounds of the parent and can not have both start and end be equal to the parent
  isTraceWindowWithinTraceWindow(
      child: Trace.Types.Timing.TraceWindowMicroSeconds, parent: Trace.Types.Timing.TraceWindowMicroSeconds): boolean {
    return (child.min >= parent.min && child.max <= parent.max) &&
        !(child.min === parent.min && child.max === parent.max);
  }

  // Used to set an initial breadcrumbs from modifications loaded from a file
  setInitialBreadcrumbFromLoadedModifications(initialBreadcrumb: Trace.Types.File.Breadcrumb): void {
    this.initialBreadcrumb = initialBreadcrumb;
    // Make last breadcrumb active
    let lastBreadcrumb = initialBreadcrumb;
    while (lastBreadcrumb.child !== null) {
      lastBreadcrumb = lastBreadcrumb.child;
    }
    this.setActiveBreadcrumb(lastBreadcrumb, {removeChildBreadcrumbs: false, updateVisibleWindow: true});
  }

  /**
   * Sets a breadcrumb to be active.
   * Doing this will update the minimap bounds and optionally based on the
   * `updateVisibleWindow` parameter, it will also update the active window.
   * The reason `updateVisibleWindow` is configurable is because if we are
   * changing which breadcrumb is active because we want to reveal something to
   * the user, we may have already updated the visible timeline window, but we
   * are activating the breadcrumb to show the user that they are now within
   * this breadcrumb. This is used when revealing insights and annotations.
   */
  setActiveBreadcrumb(activeBreadcrumb: Trace.Types.File.Breadcrumb, options: SetActiveBreadcrumbOptions): void {
    // If the children of the activated breadcrumb need to be removed, set the child on the
    // activated breadcrumb to null. Since breadcrumbs are a linked list, this will remove all
    // of the following children.
    if (options.removeChildBreadcrumbs) {
      activeBreadcrumb.child = null;
    }

    // When we assign a new active breadcrumb, both the minimap bounds and the visible
    // window get set to that breadcrumb's window.
    this.activeBreadcrumb = activeBreadcrumb;
    TraceBounds.TraceBounds.BoundsManager.instance().setMiniMapBounds(
        activeBreadcrumb.window,
    );

    if (options.updateVisibleWindow) {
      TraceBounds.TraceBounds.BoundsManager.instance().setTimelineVisibleWindow(
          activeBreadcrumb.window,
      );
    }
  }
}
