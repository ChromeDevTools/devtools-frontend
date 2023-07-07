// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// @ts-nocheck

import * as TraceModule from './trace.js';

// All the Layout Tests expect to find the TracingManager and TracingModel on
// SDK, not on the Trace namespace. To enable the frontend change to land,
// these are exposed on both here. We can then update the layout tests in a
// separate CL, and then update this code so it does not change the SDK global

self.SDK = self.SDK || {};
SDK = SDK || {};
/** @constructor */
SDK.TracingManager = TraceModule.TracingManager.TracingManager;

/** @constructor */
SDK.TracingModel = TraceModule.Legacy.TracingModel;

/** @constructor */
SDK.TracingModel.Event = TraceModule.Legacy.Event;

SDK.TracingModel.LegacyTopLevelEventCategory = TraceModule.Legacy.LegacyTopLevelEventCategory;
SDK.TracingModel.DevToolsMetadataEventCategory = TraceModule.Legacy.DevToolsMetadataEventCategory;

self.Trace = self.Trace || {};
Trace = Trace || {};
/** @constructor */
Trace.TracingManager = TraceModule.TracingManager.TracingManager;

/** @constructor */
Trace.TracingModel = TraceModule.Legacy.TracingModel;

/** @constructor */
Trace.TracingModel.Event = TraceModule.Legacy.Event;

Trace.TracingModel.LegacyTopLevelEventCategory = TraceModule.Legacy.LegacyTopLevelEventCategory;
Trace.TracingModel.DevToolsMetadataEventCategory = TraceModule.Legacy.DevToolsMetadataEventCategory;
