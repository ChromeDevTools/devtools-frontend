// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export type Micro = number&{_tag: 'MicroSeconds'};
// eslint-disable-next-line @typescript-eslint/naming-convention
export function Micro(value: number): Micro {
  return value as Micro;
}

export type Milli = number&{_tag: 'MilliSeconds'};
// eslint-disable-next-line @typescript-eslint/naming-convention
export function Milli(value: number): Milli {
  return value as Milli;
}
export type Seconds = number&{_tag: 'Seconds'};
// eslint-disable-next-line @typescript-eslint/naming-convention
export function Seconds(value: number): Seconds {
  return value as Seconds;
}

export interface TraceWindow<TimeFormat extends Micro|Milli> {
  min: TimeFormat;
  max: TimeFormat;
  range: TimeFormat;
}

// See front_end/models/trace/helpers/Timing.ts for helpful utility functions like traceWindowFromMicroSeconds
export type TraceWindowMicro = TraceWindow<Micro>;
export type TraceWindowMilli = TraceWindow<Milli>;
