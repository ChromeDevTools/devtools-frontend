// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as GPU from './GPUHandler.js';
import * as LayoutShifts from './LayoutShiftsHandler.js';
import * as Memory from './MemoryHandler.js';
import * as NetworkRequests from './NetworkRequestsHandler.js';
import * as PageLoadMetrics from './PageLoadMetricsHandler.js';
import * as Screenshots from './ScreenshotsHandler.js';
import type * as Renderer from './RendererHandler.js';
import type * as Samples from './SamplesHandler.js';
import * as UserInteractions from './UserInteractionsHandler.js';
import * as UserTimings from './UserTimingsHandler.js';
import * as Warnings from './WarningsHandler.js';

import type * as Types from './types.js';

// As we migrate the data engine we are incrementally enabling the new handlers
// one by one, so we do not waste effort parsing data that we do not use. This
// object should be updated when we add a new handler to enable it.
export const ENABLED_TRACE_HANDLERS = {
  UserTimings,
  PageLoadMetrics,
  UserInteractions,
  LayoutShifts,
  Screenshots,
  GPU,
  Memory,
  NetworkRequests,
  Warnings,
};

// Renderer and Samples handler are only executed when the panel is run
// from the component examples server. Thus we mark them as optional
// properties during the migration.
export type MaybeRendererAndSamplesHandler = {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  Renderer?: typeof Renderer,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  Samples?: typeof Samples,
};

export type EnabledHandlersDuringMigration = typeof ENABLED_TRACE_HANDLERS&MaybeRendererAndSamplesHandler;

export type PartialTraceData = Readonly<Types.EnabledHandlerDataWithMeta<EnabledHandlersDuringMigration>>;
