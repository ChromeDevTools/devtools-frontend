// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable no-unused-private-class-members */

export type MicroSeconds = number&{_tag: 'MicroSeconds'};
// eslint-disable-next-line @typescript-eslint/naming-convention
export function MicroSeconds(value: number): MicroSeconds {
  return value as MicroSeconds;
}

export type MilliSeconds = number&{_tag: 'MilliSeconds'};
// eslint-disable-next-line @typescript-eslint/naming-convention
export function MilliSeconds(value: number): MilliSeconds {
  return value as MilliSeconds;
}
export type Seconds = number&{_tag: 'Seconds'};
// eslint-disable-next-line @typescript-eslint/naming-convention
export function Seconds(value: number): Seconds {
  return value as Seconds;
}

export const enum TimeUnit {
  MICROSECONDS = 0,
  MILLISECONDS = 1,
  SECONDS = 2,
  MINUTES = 3,
}

// Other types.

export interface TraceWindow {
  min: MicroSeconds;
  max: MicroSeconds;
  range: MicroSeconds;
}

export interface TraceWindowMilliSeconds {
  min: MilliSeconds;
  max: MilliSeconds;
  range: MilliSeconds;
}
