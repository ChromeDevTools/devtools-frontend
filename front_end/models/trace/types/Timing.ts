// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable no-unused-private-class-members */

class MicroSecondsTag {
  readonly #microSecondsTag: (symbol|undefined);
}
export type MicroSeconds = number&MicroSecondsTag;
// eslint-disable-next-line @typescript-eslint/naming-convention
export function MicroSeconds(value: number): MicroSeconds {
  return value as MicroSeconds;
}

class MilliSecondsTag {
  readonly #milliSecondsTag: (symbol|undefined);
}
export type MilliSeconds = number&MilliSecondsTag;
// eslint-disable-next-line @typescript-eslint/naming-convention
export function MilliSeconds(value: number): MilliSeconds {
  return value as MilliSeconds;
}

class SecondsTag {
  readonly #secondsTag: (symbol|undefined);
}
export type Seconds = number&SecondsTag;
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
