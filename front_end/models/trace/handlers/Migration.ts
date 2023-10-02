// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Animations from './AnimationHandler.js';
import * as AuctionWorklets from './AuctionWorkletsHandler.js';
import * as GPU from './GPUHandler.js';
import * as LayoutShifts from './LayoutShiftsHandler.js';
import * as Memory from './MemoryHandler.js';
import * as NetworkRequests from './NetworkRequestsHandler.js';
import * as PageLoadMetrics from './PageLoadMetricsHandler.js';
import type * as Renderer from './RendererHandler.js';
import type * as Samples from './SamplesHandler.js';
import * as Screenshots from './ScreenshotsHandler.js';
import type * as Types from './types.js';
import * as UserInteractions from './UserInteractionsHandler.js';
import * as UserTimings from './UserTimingsHandler.js';
import * as Warnings from './WarningsHandler.js';
import * as Workers from './WorkersHandler.js';

// As we migrate the data engine we are incrementally enabling the new handlers
// one by one, so we do not waste effort parsing data that we do not use. This
// object should be updated when we add a new handler to enable it.
export const ENABLED_TRACE_HANDLERS = {
  Animations,
  AuctionWorklets,
  UserTimings,
  PageLoadMetrics,
  UserInteractions,
  LayoutShifts,
  Screenshots,
  GPU,
  Memory,
  NetworkRequests,
  Warnings,
  Workers,
};

export type EnabledHandlersDuringMigration = typeof ENABLED_TRACE_HANDLERS;

// Renderer and Samples handler are only executed when the panel is run
// from the component examples server. Thus we mark them as optional
// properties during the migration.
export type PartialTraceData = Readonly<Types.EnabledHandlerDataWithMeta<EnabledHandlersDuringMigration>>&{
  // eslint-disable-next-line @typescript-eslint/naming-convention
  readonly Renderer?: Readonly<ReturnType<typeof Renderer['data']>>,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  readonly Samples?: Readonly<ReturnType<typeof Samples['data']>>,
};
