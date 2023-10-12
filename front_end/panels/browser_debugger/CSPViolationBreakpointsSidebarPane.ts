// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';

import {CategorizedBreakpointsSidebarPane} from './CategorizedBreakpointsSidebarPane.js';

let cspViolationBreakpointsSidebarPaneInstance: CSPViolationBreakpointsSidebarPane;

export class CSPViolationBreakpointsSidebarPane extends CategorizedBreakpointsSidebarPane {
  private constructor() {
    const breakpoints: SDK.DOMDebuggerModel.CSPViolationBreakpoint[] =
        SDK.DOMDebuggerModel.DOMDebuggerManager.instance().cspViolationBreakpoints();
    super(breakpoints, 'sources.cspViolationBreakpoints', Protocol.Debugger.PausedEventReason.CSPViolation);
  }

  static instance(): CSPViolationBreakpointsSidebarPane {
    if (!cspViolationBreakpointsSidebarPaneInstance) {
      cspViolationBreakpointsSidebarPaneInstance = new CSPViolationBreakpointsSidebarPane();
    }
    return cspViolationBreakpointsSidebarPaneInstance;
  }

  protected override getBreakpointFromPausedDetails(details: SDK.DebuggerModel.DebuggerPausedDetails):
      SDK.CategorizedBreakpoint.CategorizedBreakpoint|null {
    const breakpointType = details.auxData && details.auxData['violationType'] ? details.auxData['violationType'] : '';
    const breakpoints = SDK.DOMDebuggerModel.DOMDebuggerManager.instance().cspViolationBreakpoints();
    const breakpoint = breakpoints.find(x => x.type() === breakpointType);
    return breakpoint ? breakpoint : null;
  }

  protected override toggleBreakpoint(breakpoint: SDK.CategorizedBreakpoint.CategorizedBreakpoint, enabled: boolean): void {
    breakpoint.setEnabled(enabled);
    SDK.DOMDebuggerModel.DOMDebuggerManager.instance().updateCSPViolationBreakpoints();
  }
}
