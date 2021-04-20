// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as Common from '../../../core/common/common.js';  // eslint-disable-line no-unused-vars

import {Events as ViewEvents, GraphView} from './GraphView.js';

// A class that maps each context to its corresponding graph.
// It controls which graph to render when the context is switched or updated.
export class GraphManager extends Common.ObjectWrapper.ObjectWrapper {
  _graphMapByContextId: Map<string, GraphView>;
  constructor() {
    super();

    this._graphMapByContextId = new Map();
  }

  createContext(contextId: string): void {
    const graph = new GraphView(contextId);
    // When a graph has any update, request redraw.
    graph.addEventListener(ViewEvents.ShouldRedraw, this._notifyShouldRedraw, this);
    this._graphMapByContextId.set(contextId, graph);
  }

  destroyContext(contextId: string): void {
    if (!this._graphMapByContextId.has(contextId)) {
      return;
    }

    const graph = this._graphMapByContextId.get(contextId);
    if (!graph) {
      return;
    }

    graph.removeEventListener(ViewEvents.ShouldRedraw, this._notifyShouldRedraw, this);
    this._graphMapByContextId.delete(contextId);
  }

  hasContext(contextId: string): boolean {
    return this._graphMapByContextId.has(contextId);
  }

  clearGraphs(): void {
    this._graphMapByContextId.clear();
  }

  /**
   * Get graph by contextId.
   * If the user starts listening for WebAudio events after the page has been running a context for awhile,
   * the graph might be undefined.
   */
  getGraph(contextId: string): GraphView|null {
    return this._graphMapByContextId.get(contextId) || null;
  }

  _notifyShouldRedraw(event: Common.EventTarget.EventTargetEvent<GraphView>): void {
    this.dispatchEventToListeners(ViewEvents.ShouldRedraw, event.data);
  }
}
