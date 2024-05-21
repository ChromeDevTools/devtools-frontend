// Copyright (c) Meta Platforms, Inc. and affiliates.
// Copyright 2024 The Chromium Authors. All rights reserved.
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
import '../../panels/react_devtools/react_devtools-meta.js';
import '../../panels/rn_welcome/rn_welcome-meta.js';
import '../../panels/timeline/timeline-meta.js';

import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Main from '../main/main.js';

import type * as Platform from '../../core/platform/platform.js';
import type * as Sources from '../../panels/sources/sources.js';
import * as RNExperiments from '../../core/rn_experiments/rn_experiments.js';

/*
 * To ensure accurate timing measurements,
 * please make sure these perf metrics lines are called ahead of everything else
 */
Host.rnPerfMetrics.registerPerfMetricsGlobalPostMessageHandler();
Host.rnPerfMetrics.setLaunchId(Root.Runtime.Runtime.queryParam('launchId'));
Host.rnPerfMetrics.entryPointLoadingStarted('rn_fusebox');

const UIStrings = {
  /**
   *@description Title of the 'React Native' tool in the Network Navigator View, which is part of the Sources tool
   */
  networkTitle: 'React Native',
  /**
   *@description Command for showing the 'React Native' tool in the Network Navigator View, which is part of the Sources tool
   */
  showReactNative: 'Show React Native',
  /**
   *@description Label of the FB-only 'send feedback' action button in the toolbar
   */
  sendFeedback: '[FB-only] Send feedback',
};
const str_ = i18n.i18n.registerUIStrings('entrypoints/rn_fusebox/rn_fusebox.ts', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

// Disable Network-related features
UI.ViewManager.maybeRemoveViewExtension('network.blocked-urls');
UI.ViewManager.maybeRemoveViewExtension('network.config');

// Disable Performance-related features
UI.ViewManager.maybeRemoveViewExtension('coverage');
UI.ViewManager.maybeRemoveViewExtension('linear-memory-inspector');
UI.ViewManager.maybeRemoveViewExtension('rendering');

// Disable additional features
UI.ViewManager.maybeRemoveViewExtension('issues-pane');
UI.ViewManager.maybeRemoveViewExtension('sensors');

// Disable Settings panels
UI.ViewManager.maybeRemoveViewExtension('devices');
UI.ViewManager.maybeRemoveViewExtension('emulation-locations');
UI.ViewManager.maybeRemoveViewExtension('throttling-conditions');

RNExperiments.RNExperimentsImpl.setIsReactNativeEntryPoint(true);
RNExperiments.RNExperimentsImpl.Instance.enableExperimentsByDefault([
  Root.Runtime.ExperimentName.REACT_NATIVE_SPECIFIC_UI,
]);

class FuseboxClientMetadataModel extends SDK.SDKModel.SDKModel<void> {
  constructor(target: SDK.Target.Target) {
    super(target);
    void target.fuseboxClientAgent().invoke_setClientMetadata();
  }
}

SDK.SDKModel.SDKModel.register(
  FuseboxClientMetadataModel,
  {
    capabilities: SDK.Target.Capability.None,
    autostart: true,
    // Ensure FuseboxClient.setClientMetadata is sent before most other CDP domains
    // are initialised. This allows the backend to confidently detect non-Fusebox
    // clients by the fact that they send e.g. Runtime.enable without sending any
    // Fusebox-specific messages first.
    // TODO: Explicitly depend on this model in RuntimeModel and LogModel, and
    // remove the `early` and `autostart` flags.
    early: true,
  },
);

let loadedSourcesModule: (typeof Sources|undefined);

async function loadSourcesModule(): Promise<typeof Sources> {
  if (!loadedSourcesModule) {
    loadedSourcesModule = await import('../../panels/sources/sources.js');
  }
  return loadedSourcesModule;
}

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.NAVIGATOR_VIEW,
  id: 'navigator-network',
  title: i18nLazyString(UIStrings.networkTitle),
  commandPrompt: i18nLazyString(UIStrings.showReactNative),
  order: 2,
  persistence: UI.ViewManager.ViewPersistence.PERMANENT,
  async loadView() {
    const Sources = await loadSourcesModule();
    return Sources.SourcesNavigator.NetworkNavigatorView.instance();
  },
});

// @ts-ignore Exposed for legacy layout tests
self.runtime = Root.Runtime.Runtime.instance({forceNew: true});
new Main.MainImpl.MainImpl();

if (globalThis.FB_ONLY__reactNativeFeedbackLink) {
  const feedbackLink = globalThis.FB_ONLY__reactNativeFeedbackLink as Platform.DevToolsPath.UrlString;
  const actionId = 'react-native-send-feedback';
  const sendFeedbackActionDelegate: UI.ActionRegistration.ActionDelegate = {
    handleAction(_context, incomingActionId): boolean {
      if (incomingActionId !== actionId) {
        return false;
      }
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.openInNewTab(
      feedbackLink,
    );

      return true;
    },
  };

  UI.ActionRegistration.registerActionExtension({
    category: UI.ActionRegistration.ActionCategory.GLOBAL,
    actionId,
    title: i18nLazyString(UIStrings.sendFeedback),
    async loadActionDelegate() {
      return sendFeedbackActionDelegate;
    },
    iconClass: UI.ActionRegistration.IconClass.BUG,
  });

  UI.Toolbar.registerToolbarItem({
    location: UI.Toolbar.ToolbarItemLocation.MAIN_TOOLBAR_RIGHT,
    actionId,
    showLabel: true,
  });
}

Host.rnPerfMetrics.entryPointLoadingFinished('rn_fusebox');
