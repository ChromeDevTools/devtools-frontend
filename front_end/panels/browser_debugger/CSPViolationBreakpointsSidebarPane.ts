// Copyright 2015 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import {CategorizedBreakpointsSidebarPane} from './CategorizedBreakpointsSidebarPane.js';

export class CSPViolationBreakpointsSidebarPane extends CategorizedBreakpointsSidebarPane {
  constructor() {
    const breakpoints: SDK.DOMDebuggerModel.CSPViolationBreakpoint[] =
        SDK.DOMDebuggerModel.DOMDebuggerManager.instance().cspViolationBreakpoints();
    super(
        breakpoints, `${VisualLogging.section('sources.csp-violation-breakpoints')}`,
        'sources.csp-violation-breakpoints');
  }

  protected override getBreakpointFromPausedDetails(details: SDK.DebuggerModel.DebuggerPausedDetails):
      SDK.CategorizedBreakpoint.CategorizedBreakpoint|null {
    const breakpointType = details.auxData?.['violationType'] ? details.auxData['violationType'] : '';
    const breakpoints = SDK.DOMDebuggerModel.DOMDebuggerManager.instance().cspViolationBreakpoints();
    const breakpoint = breakpoints.find(x => x.type() === breakpointType);
    return breakpoint ? breakpoint : null;
  }

  protected override onBreakpointChanged(breakpoint: SDK.CategorizedBreakpoint.CategorizedBreakpoint, enabled: boolean):
      void {
    super.onBreakpointChanged(breakpoint, enabled);
    SDK.DOMDebuggerModel.DOMDebuggerManager.instance().updateCSPViolationBreakpoints();
  }
}
