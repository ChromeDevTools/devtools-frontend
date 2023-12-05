// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export interface HighlightInfo {
  startAddress: number;
  size: number;
  // If the inspector is opened from a different UI location
  // than the scope view, we don't have guaranteed access to the name.
  name?: string;
  type: string;
}
