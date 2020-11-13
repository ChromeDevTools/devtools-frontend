// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../sdk/sdk.js';
import {CategorizedBreakpointsSidebarPane} from './CategorizedBreakpointsSidebarPane.js';

export class EventListenerBreakpointsSidebarPane extends CategorizedBreakpointsSidebarPane {
  constructor() {
    const categories = SDK.DOMDebuggerModel.DOMDebuggerManager.instance().eventListenerBreakpoints().map(
        breakpoint => breakpoint.category());
    categories.sort();
    const breakpoints = SDK.DOMDebuggerModel.DOMDebuggerManager.instance().eventListenerBreakpoints();
    super(categories, breakpoints, 'sources.eventListenerBreakpoints', SDK.DebuggerModel.BreakReason.EventListener);
  }

  /**
   * @override
   * @param {!SDK.DebuggerModel.DebuggerPausedDetails} details
   * @returns {?SDK.DOMDebuggerModel.CategorizedBreakpoint}
   */
  _getBreakpointFromPausedDetails(details) {
    return SDK.DOMDebuggerModel.DOMDebuggerManager.instance().resolveEventListenerBreakpoint(
        /** @type {!{eventName: string, targetName: string}} */ (details.auxData));
  }
}
