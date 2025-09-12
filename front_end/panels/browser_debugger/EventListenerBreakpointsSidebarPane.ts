// Copyright 2015 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import {CategorizedBreakpointsSidebarPane} from './CategorizedBreakpointsSidebarPane.js';

let eventListenerBreakpointsSidebarPaneInstance: EventListenerBreakpointsSidebarPane;

export class EventListenerBreakpointsSidebarPane extends CategorizedBreakpointsSidebarPane {
  private constructor() {
    let breakpoints: SDK.CategorizedBreakpoint.CategorizedBreakpoint[] =
        SDK.DOMDebuggerModel.DOMDebuggerManager.instance().eventListenerBreakpoints();
    const nonDomBreakpoints = SDK.EventBreakpointsModel.EventBreakpointsManager.instance().eventListenerBreakpoints();
    breakpoints = breakpoints.concat(nonDomBreakpoints);

    super(
        breakpoints, `${VisualLogging.section('sources.event-listener-breakpoints')}`,
        'sources.event-listener-breakpoints');
  }

  static instance(): EventListenerBreakpointsSidebarPane {
    if (!eventListenerBreakpointsSidebarPaneInstance) {
      eventListenerBreakpointsSidebarPaneInstance = new EventListenerBreakpointsSidebarPane();
    }
    return eventListenerBreakpointsSidebarPaneInstance;
  }

  override getBreakpointFromPausedDetails(details: SDK.DebuggerModel.DebuggerPausedDetails):
      SDK.CategorizedBreakpoint.CategorizedBreakpoint|null {
    const auxData = details.auxData as SDK.DebuggerModel.EventListenerPausedDetailsAuxData | undefined;
    if (!auxData) {
      return null;
    }
    const domBreakpoint =
        auxData && SDK.DOMDebuggerModel.DOMDebuggerManager.instance().resolveEventListenerBreakpoint(auxData);
    if (domBreakpoint) {
      return domBreakpoint;
    }
    return SDK.EventBreakpointsModel.EventBreakpointsManager.instance().resolveEventListenerBreakpoint(auxData);
  }
}
