// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// @ts-nocheck

import * as BreakpointsModule from './breakpoints.js';

// We still put things onto global bindings for web tests to be backwards-compatible.
self.Bindings = self.Bindings || {};
Bindings = Bindings || {};

/* @constructor */
Bindings.BreakpointManager = BreakpointsModule.BreakpointManager.BreakpointManager;

/* @enum {symbol} */
Bindings.BreakpointManager.Events = BreakpointsModule.BreakpointManager.Events;

/* @constructor */
Bindings.BreakpointManager.Breakpoint = BreakpointsModule.BreakpointManager.Breakpoint;

Bindings.BreakpointManager.ModelBreakpoint = BreakpointsModule.BreakpointManager.ModelBreakpoint;
