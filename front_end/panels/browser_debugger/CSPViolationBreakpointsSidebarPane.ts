// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import {CategorizedBreakpointsSidebarPane} from './CategorizedBreakpointsSidebarPane.js';

export class CSPViolationBreakpointsSidebarPane extends CategorizedBreakpointsSidebarPane {
  constructor() {
    const breakpoints: SDK.DOMDebuggerModel.CSPViolationBreakpoint[] =
        SDK.DOMDebuggerModel.DOMDebuggerManager.instance().cspViolationBreakpoints();
    super(breakpoints, 'sources.csp-violation-breakpoints', Protocol.Debugger.PausedEventReason.CSPViolation);
    this.contentElement.setAttribute('jslog', `${VisualLogging.section('sources.csp-violation-breakpoints')}`);
  }

  protected override getBreakpointFromPausedDetails(details: SDK.DebuggerModel.DebuggerPausedDetails):
      SDK.CategorizedBreakpoint.CategorizedBreakpoint|null {
    const breakpointType = details.auxData && details.auxData['violationType'] ? details.auxData['violationType'] : '';
    const breakpoints = SDK.DOMDebuggerModel.DOMDebuggerManager.instance().cspViolationBreakpoints();
    const breakpoint = breakpoints.find(x => x.type() === breakpointType);
    return breakpoint ? breakpoint : null;
  }

  protected override toggleBreakpoint(breakpoint: SDK.CategorizedBreakpoint.CategorizedBreakpoint, enabled: boolean):
      void {
    breakpoint.setEnabled(enabled);
    SDK.DOMDebuggerModel.DOMDebuggerManager.instance().updateCSPViolationBreakpoints();
  }
}
