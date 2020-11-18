// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// This file exists to ensure that entrypoints that we don't currently have unit
// tests for are at least imported. This means that they will then show up in
// the coverage reporting.

import {describeWithEnvironment} from '../helpers/EnvironmentHelpers.js';

describeWithEnvironment('Imports entrypoints that are yet to be tested', () => {
  before(async () => {
    await import('../../../../front_end/browser_debugger/browser_debugger.js');
    await import('../../../../front_end/changes/changes.js');
    await import('../../../../front_end/cm/cm.js');
    await import('../../../../front_end/cm_headless/cm_headless.js');
    await import('../../../../front_end/cm_modes/cm_modes.js');
    await import('../../../../front_end/console/console.js');
    await import('../../../../front_end/console_counters/console_counters.js');
    await import('../../../../front_end/css_overview/css_overview.js');
    await import('../../../../front_end/developer_resources/developer_resources.js');
    await import('../../../../front_end/heap_snapshot_model/heap_snapshot_model.js');
    await import('../../../../front_end/heap_snapshot_worker/heap_snapshot_worker.js');
    await import('../../../../front_end/help/help.js');
    await import('../../../../front_end/input/input.js');
    await import('../../../../front_end/inspector_main/inspector_main.js');
    await import('../../../../front_end/javascript_metadata/javascript_metadata.js');
    await import('../../../../front_end/js_main/js_main.js');
    await import('../../../../front_end/layer_viewer/layer_viewer.js');
    await import('../../../../front_end/layers/layers.js');
    await import('../../../../front_end/lighthouse/lighthouse.js');
    await import('../../../../front_end/main/main.js');
    await import('../../../../front_end/node_main/node_main.js');
    await import('../../../../front_end/performance_monitor/performance_monitor.js');
    await import('../../../../front_end/profiler/profiler.js');
    await import('../../../../front_end/protocol_monitor/protocol_monitor.js');
    await import('../../../../front_end/resources/resources.js');
    await import('../../../../front_end/screencast/screencast.js');
    await import('../../../../front_end/security/security.js');
    await import('../../../../front_end/services/services.js');
    await import('../../../../front_end/settings/settings.js');
    await import('../../../../front_end/startup/startup.js');
    await import('../../../../front_end/services/services.js');
    await import('../../../../front_end/toolbox_bootstrap/toolbox_bootstrap.js');
    await import('../../../../front_end/wasmparser_worker/wasmparser_worker.js');
    await import('../../../../front_end/web_audio/web_audio.js');
    await import('../../../../front_end/webauthn/webauthn.js');
    await import('../../../../front_end/worker_main/worker_main.js');
    await import('../../../../front_end/worker_service/worker_service.js');
  });

  it('imports missing entrypoints',
     () => {
         // Intentionally blank, but here to ensure the before gets called.
     });
});
