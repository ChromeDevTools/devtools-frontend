
// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../main/main-meta.js';
import '../inspector_main/inspector_main-meta.js';
import '../../core/sdk/sdk-meta.js';
import '../../Images/Images.js';
import '../../models/logs/logs-meta.js';
import '../../models/persistence/persistence-meta.js';
import '../../panels/browser_debugger/browser_debugger-meta.js';
// panels/timeline depends on mobile_throttling for settings UI
import '../../panels/mobile_throttling/mobile_throttling-meta.js';
import '../../panels/protocol_monitor/protocol_monitor-meta.js';
import '../../panels/settings/settings-meta.js';
import '../../panels/sources/sources-meta.js';
// sdk/emulation depends on panels/sensors: crbug.com/1376652
import '../../panels/sensors/sensors-meta.js';
import '../../panels/timeline/timeline-meta.js';
import '../../ui/legacy/components/perf_ui/perf_ui-meta.js';
import '../../ui/legacy/components/quick_open/quick_open-meta.js';
import '../../ui/legacy/components/source_frame/source_frame-meta.js';

import * as Main from '../main/main.js';

new Main.MainImpl.MainImpl();
