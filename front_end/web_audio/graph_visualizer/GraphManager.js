// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../common/common.js';  // eslint-disable-line no-unused-vars

import {Events as ViewEvents, GraphView} from './GraphView.js';

// A class that maps each context to its corresponding graph.
// It controls which graph to render when the context is switched or updated.
export class GraphManager extends Common.ObjectWrapper.ObjectWrapper {
  constructor() {
    super();

    /** @type {!Map<!Protocol.WebAudio.GraphObjectId, !GraphView>} */
    this._graphMapByContextId = new Map();
  }

  /**
   * @param {!Protocol.WebAudio.GraphObjectId} contextId
   */
  createContext(contextId) {
    const graph = new GraphView(contextId);
    // When a graph has any update, request redraw.
    graph.addEventListener(ViewEvents.ShouldRedraw, this._notifyShouldRedraw, this);
    this._graphMapByContextId.set(contextId, graph);
  }

  /**
   * @param {!Protocol.WebAudio.GraphObjectId} contextId
   */
  destroyContext(contextId) {
    if (!this._graphMapByContextId.has(contextId)) {
      return;
    }

    const graph = this._graphMapByContextId.get(contextId);
    graph.removeEventListener(ViewEvents.ShouldRedraw, this._notifyShouldRedraw, this);
    this._graphMapByContextId.delete(contextId);
  }

  hasContext(contextId) {
    return this._graphMapByContextId.has(contextId);
  }

  clearGraphs() {
    this._graphMapByContextId.clear();
  }

  /**
   * Get graph by contextId.
   * If the user starts listening for WebAudio events after the page has been running a context for awhile,
   * the graph might be undefined.
   * @param {!Protocol.WebAudio.GraphObjectId} contextId
   * @return {?GraphView}
   */
  getGraph(contextId) {
    return this._graphMapByContextId.get(contextId);
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _notifyShouldRedraw(event) {
    const graph = /** @type {!GraphView} */ (event.data);
    this.dispatchEventToListeners(ViewEvents.ShouldRedraw, graph);
  }
}
