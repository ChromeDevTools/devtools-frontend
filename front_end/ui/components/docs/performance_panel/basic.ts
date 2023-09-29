// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as FrontendHelpers from '../../../../../test/unittests/front_end/helpers/EnvironmentHelpers.js';
import * as Common from '../../../../core/common/common.js';
import * as SDK from '../../../../core/sdk/sdk.js';
import * as Bindings from '../../../../models/bindings/bindings.js';
import * as Workspace from '../../../../models/workspace/workspace.js';
import * as Timeline from '../../../../panels/timeline/timeline.js';
import * as UI from '../../../legacy/legacy.js';
import * as ComponentSetup from '../../helpers/helpers.js';

/**
 * Because the panel is not quite as isolated as other components we have to
 * do a bit of setup globally to ensure the panel can render, primarily creating
 * some actions and settings. We also have to instantiate some instances which
 * would usually be setup in MainImpl when running DevTools, but we can set them
 * up here rather than pull in all of the setup from elsewhere. Over time we
 * should look to reduce this global setup and pass data into the panel.
 **/
await FrontendHelpers.initializeGlobalVars();
await ComponentSetup.ComponentServerSetup.setup();

const resourceMapping = new Bindings.ResourceMapping.ResourceMapping(
    SDK.TargetManager.TargetManager.instance(),
    Workspace.Workspace.WorkspaceImpl.instance(),
);
Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance({
  forceNew: true,
  resourceMapping,
  targetManager: SDK.TargetManager.TargetManager.instance(),
});
Bindings.IgnoreListManager.IgnoreListManager.instance({
  forceNew: true,
  debuggerWorkspaceBinding: Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance(),
});
SDK.CPUThrottlingManager.CPUThrottlingManager.instance().setHardwareConcurrency(128);

UI.ActionRegistration.registerActionExtension({
  actionId: 'timeline.record-reload',
  iconClass: UI.ActionRegistration.IconClass.REFRESH,
  category: UI.ActionRegistration.ActionCategory.PERFORMANCE,
  contextTypes() {
    return [Timeline.TimelinePanel.TimelinePanel];
  },
  bindings: [
    {
      platform: UI.ActionRegistration.Platforms.WindowsLinux,
      shortcut: 'Ctrl+Shift+E',
    },
    {
      platform: UI.ActionRegistration.Platforms.Mac,
      shortcut: 'Meta+Shift+E',
    },
  ],
});
UI.ActionRegistration.registerActionExtension({
  actionId: 'timeline.show-history',
  category: UI.ActionRegistration.ActionCategory.PERFORMANCE,
  contextTypes() {
    return [Timeline.TimelinePanel.TimelinePanel];
  },
});
UI.ActionRegistration.registerActionExtension({
  actionId: 'components.collect-garbage',
  category: UI.ActionRegistration.ActionCategory.PERFORMANCE,
});
UI.ActionRegistration.registerActionExtension({
  actionId: 'timeline.toggle-recording',
  title: () => 'Toggle recording' as Common.UIString.LocalizedString,
  toggleable: true,
  category: UI.ActionRegistration.ActionCategory.PERFORMANCE,
  iconClass: UI.ActionRegistration.IconClass.START_RECORDING,
  contextTypes() {
    return [Timeline.TimelinePanel.TimelinePanel];
  },
  bindings: [
    {
      platform: UI.ActionRegistration.Platforms.WindowsLinux,
      shortcut: 'Ctrl+E',
    },
    {
      platform: UI.ActionRegistration.Platforms.Mac,
      shortcut: 'Meta+E',
    },
  ],
});
const actionRegistry = UI.ActionRegistry.ActionRegistry.instance();
UI.ShortcutRegistry.ShortcutRegistry.instance({forceNew: true, actionRegistry: actionRegistry});
Common.Settings.settingForTest('flamechartMouseWheelAction').set('zoom');

const params = new URLSearchParams(window.location.search);
const traceFileName = params.get('trace');
const cpuprofileName = params.get('cpuprofile');
const nodeMode = params.get('isNode');
const isNodeMode = nodeMode === 'true' ? true : false;
// By default we run both engines in the dev server, but this can be overridden by passing the parameter.
let threadTracksSource = Timeline.TimelinePanel.ThreadTracksSource.BOTH_ENGINES;
const threadTracksSourceParam = params.get('threadTracksSource');
if (threadTracksSourceParam === 'new') {
  threadTracksSource = Timeline.TimelinePanel.ThreadTracksSource.NEW_ENGINE;
} else if (threadTracksSourceParam === 'old') {
  threadTracksSource = Timeline.TimelinePanel.ThreadTracksSource.OLD_ENGINE;
}

const timeline =
    Timeline.TimelinePanel.TimelinePanel.instance({forceNew: true, isNode: isNodeMode, threadTracksSource});
const container = document.getElementById('container');
if (!container) {
  throw new Error('could not find container');
}
container.innerHTML = '';
timeline.markAsRoot();
timeline.show(container);

let fileName;
if (traceFileName) {
  fileName = `${traceFileName}.json.gz`;
} else if (cpuprofileName) {
  fileName = `${cpuprofileName}.cpuprofile.gz`;
}

if (fileName) {
  const file = new URL(`../../../../../test/unittests/fixtures/traces/${fileName}`, import.meta.url);
  const response = await fetch(file);
  const asBlob = await response.blob();
  const asFile = new File([asBlob], `${fileName}`, {
    type: 'application/gzip',
  });
  void timeline.loadFromFile(asFile);
}
