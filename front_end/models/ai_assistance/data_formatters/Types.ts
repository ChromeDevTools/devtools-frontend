// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export interface UnitFormatters {
  millis: (x: number) => string;
  micros: (x: number) => string;
  bytes: (x: number) => string;
}
