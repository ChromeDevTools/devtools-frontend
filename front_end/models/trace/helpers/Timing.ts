// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Types from '../types/types.js';

export const millisecondsToMicroseconds = (value: Types.Timing.MilliSeconds): Types.Timing.MicroSeconds =>
    Types.Timing.MicroSeconds(value * 1000);

export const secondsToMilliseconds = (value: Types.Timing.Seconds): Types.Timing.MilliSeconds =>
    Types.Timing.MilliSeconds(value * 1000);

export const secondsToMicroseconds = (value: Types.Timing.Seconds): Types.Timing.MicroSeconds =>
    millisecondsToMicroseconds(secondsToMilliseconds(value));
