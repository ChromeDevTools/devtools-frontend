// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as SDK from '../../core/sdk/sdk.js';
import {CategorizedBreakpointsSidebarPane} from './CategorizedBreakpointsSidebarPane.js';

let eventListenerBreakpointsSidebarPaneInstance: EventListenerBreakpointsSidebarPane;

export class EventListenerBreakpointsSidebarPane extends CategorizedBreakpointsSidebarPane {
  private constructor() {
    const categories = SDK.DOMDebuggerModel.DOMDebuggerManager.instance().eventListenerBreakpoints().map(
        breakpoint => breakpoint.category());
    categories.sort();
    const breakpoints = SDK.DOMDebuggerModel.DOMDebuggerManager.instance().eventListenerBreakpoints();
    super(
        categories, breakpoints, 'sources.eventListenerBreakpoints', Protocol.Debugger.PausedEventReason.EventListener);
  }

  static instance(): EventListenerBreakpointsSidebarPane {
    if (!eventListenerBreakpointsSidebarPaneInstance) {
      eventListenerBreakpointsSidebarPaneInstance = new EventListenerBreakpointsSidebarPane();
    }
    return eventListenerBreakpointsSidebarPaneInstance;
  }

  _getBreakpointFromPausedDetails(details: SDK.DebuggerModel.DebuggerPausedDetails):
      SDK.DOMDebuggerModel.CategorizedBreakpoint|null {
    return SDK.DOMDebuggerModel.DOMDebuggerManager.instance().resolveEventListenerBreakpoint(details.auxData as {
      eventName: string,
      targetName: string,
    });
  }
}
