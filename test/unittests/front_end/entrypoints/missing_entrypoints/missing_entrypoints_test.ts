// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// This file exists to ensure that entrypoints that we don't currently have unit
// tests for are at least imported. This means that they will then show up in
// the coverage reporting.

import {describeWithEnvironment} from '../../helpers/EnvironmentHelpers.js';

describeWithEnvironment('Imports entrypoints that are yet to be tested', () => {
  before(async () => {
    await import('../../../../../front_end/panels/browser_debugger/browser_debugger.js');
    await import('../../../../../front_end/panels/changes/changes.js');
    await import('../../../../../front_end/panels/console/console.js');
    await import('../../../../../front_end/panels/console_counters/console_counters.js');
    await import('../../../../../front_end/panels/css_overview/css_overview.js');
    await import('../../../../../front_end/panels/developer_resources/developer_resources.js');
    await import('../../../../../front_end/models/heap_snapshot_model/heap_snapshot_model.js');
    await import('../../../../../front_end/entrypoints/heap_snapshot_worker/heap_snapshot_worker.js');
    await import('../../../../../front_end/entrypoints/inspector_main/inspector_main.js');
    await import('../../../../../front_end/models/javascript_metadata/javascript_metadata.js');
    await import('../../../../../front_end/panels/layer_viewer/layer_viewer.js');
    await import('../../../../../front_end/panels/layers/layers.js');
    await import('../../../../../front_end/panels/lighthouse/lighthouse.js');
    await import('../../../../../front_end/entrypoints/main/main.js');
    await import('../../../../../front_end/panels/performance_monitor/performance_monitor.js');
    await import('../../../../../front_end/panels/profiler/profiler.js');
    await import('../../../../../front_end/panels/protocol_monitor/protocol_monitor.js');
    await import('../../../../../front_end/panels/application/application.js');
    await import('../../../../../front_end/panels/screencast/screencast.js');
    await import('../../../../../front_end/panels/security/security.js');
    await import('../../../../../front_end/panels/settings/settings.js');
    await import('../../../../../front_end/entrypoints/wasmparser_worker/wasmparser_worker.js');
    await import('../../../../../front_end/panels/web_audio/web_audio.js');
    await import('../../../../../front_end/panels/webauthn/webauthn.js');
  });

  it('imports missing entrypoints',
     () => {
         // Intentionally blank, but here to ensure the before gets called.
     });
});
