// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as PerformanceMonitorModule from './performance_monitor.js';

self.PerformanceMonitor = self.PerformanceMonitor || {};
PerformanceMonitor = PerformanceMonitor || {};

/**
 * @constructor
 */
PerformanceMonitor.PerformanceMonitor = PerformanceMonitorModule.PerformanceMonitor.PerformanceMonitorImpl;

PerformanceMonitor.PerformanceMonitor.Format = PerformanceMonitorModule.PerformanceMonitor.Format;

/**
 * @constructor
 */
PerformanceMonitor.PerformanceMonitor.ControlPane = PerformanceMonitorModule.PerformanceMonitor.ControlPane;

/** @enum {symbol} */
PerformanceMonitor.PerformanceMonitor.ControlPane.Events = PerformanceMonitorModule.PerformanceMonitor.Events;

/**
 * @constructor
 */
PerformanceMonitor.PerformanceMonitor.MetricIndicator = PerformanceMonitorModule.PerformanceMonitor.MetricIndicator;
PerformanceMonitor.PerformanceMonitor.MetricIndicator._format = PerformanceMonitorModule.PerformanceMonitor.format;
