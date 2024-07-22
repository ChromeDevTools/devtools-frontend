// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Overlays from '../../overlays/overlays.js';

export enum InsightsCategories {
  ALL = 'All',
  INP = 'INP',
  LCP = 'LCP',
  CLS = 'CLS',
  OTHER = 'Other',
}

export interface ActiveInsight {
  name: string;
  navigationId: string;
  createOverlayFn: (() => Overlays.Overlays.TimelineOverlay[]);
}
