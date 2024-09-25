// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Overlays from '../../overlays/overlays.js';

export enum Category {
  ALL = 'All',
  INP = 'INP',
  LCP = 'LCP',
  CLS = 'CLS',
}

export interface ActiveInsight {
  name: string;
  insightSetKey: string;
  createOverlayFn: (() => Overlays.Overlays.TimelineOverlay[]);
}
