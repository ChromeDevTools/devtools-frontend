// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ProtocolMonitorModule from './protocol_monitor.js';

self.ProtocolMonitor = self.ProtocolMonitor || {};
ProtocolMonitor = ProtocolMonitor || {};

/**
 * @constructor
 */
ProtocolMonitor.ProtocolMonitor = ProtocolMonitorModule.ProtocolMonitor.ProtocolMonitorImpl;

/**
 * @constructor
 */
ProtocolMonitor.ProtocolMonitor.InfoWidget = ProtocolMonitorModule.ProtocolMonitor.InfoWidget;

/**
 * @constructor
 */
ProtocolMonitor.ProtocolMonitor.ProtocolNode = ProtocolMonitorModule.ProtocolMonitor.ProtocolNode;
