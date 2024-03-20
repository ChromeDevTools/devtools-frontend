// Copyright (c) Meta Platforms, Inc. and affiliates.
// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../shell/shell.js';
import '../../panels/emulation/emulation-meta.js';
import '../../panels/sensors/sensors-meta.js';
import '../../panels/developer_resources/developer_resources-meta.js';
import '../inspector_main/inspector_main-meta.js';
import '../../panels/issues/issues-meta.js';
import '../../panels/mobile_throttling/mobile_throttling-meta.js';
import '../../panels/network/network-meta.js';
import '../../panels/js_profiler/js_profiler-meta.js';
import '../../panels/rn_welcome/rn_welcome-meta.js';

import * as Host from '../../core/host/host.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Main from '../main/main.js';
import type * as InspectorBackend from '../../core/protocol_client/InspectorBackend.js';

Host.RNPerfMetrics.registerPerfMetricsGlobalPostMessageHandler();

// Legacy JavaScript Profiler - we support this until Hermes can support the
// modern Performance panel.
Root.Runtime.experiments.register(
  Root.Runtime.ExperimentName.JS_PROFILER_TEMP_ENABLE,
  'Enable JavaScript Profiler (legacy)',
  /* unstable */ false,
);

Root.Runtime.experiments.register(
  Root.Runtime.ExperimentName.REACT_NATIVE_SPECIFIC_UI,
  'Show React Native-specific UI',
  /* unstable */ false,
);

Root.Runtime.experiments.register(
  Root.Runtime.ExperimentName.ENABLE_REACT_DEVTOOLS_PANEL,
  'Enable React DevTools panel',
  /* unstable */ true,
);

Root.Runtime.experiments.enableExperimentsByDefault([
  Root.Runtime.ExperimentName.JS_PROFILER_TEMP_ENABLE,
  Root.Runtime.ExperimentName.REACT_NATIVE_SPECIFIC_UI,
]);

class FuseboxClientMetadataModel extends SDK.SDKModel.SDKModel<void> {
  constructor(target: SDK.Target.Target) {
    super(target);
    target.router()?.sendMessage(
      target.sessionId,
      'FuseboxClient',
      'FuseboxClient.setClientMetadata' as InspectorBackend.QualifiedName,
      {},
      () => {},
    );
  }
}

SDK.SDKModel.SDKModel.register(
  FuseboxClientMetadataModel,
  {capabilities: SDK.Target.Capability.None, autostart: true},
);

// @ts-ignore Exposed for legacy layout tests
self.runtime = Root.Runtime.Runtime.instance({forceNew: true});
new Main.MainImpl.MainImpl();
