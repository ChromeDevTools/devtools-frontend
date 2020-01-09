// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ConsoleCountersModule from './console_counters.js';

self.ConsoleCounters = self.ConsoleCounters || {};
ConsoleCounters = ConsoleCounters || {};

/** @constructor */
ConsoleCounters.WarningErrorCounter = ConsoleCountersModule.WarningErrorCounter.WarningErrorCounter;
