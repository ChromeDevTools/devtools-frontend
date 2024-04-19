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
import '../../panels/js_profiler/js_profiler-meta.js';
import '../../panels/rn_welcome/rn_welcome-legacy-meta.js';

import * as i18n from '../../core/i18n/i18n.js';
import * as Root from '../../core/root/root.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Main from '../main/main.js';

import type * as Sources from '../../panels/sources/sources.js';
import * as RNExperiments from '../../core/rn_experiments/rn_experiments.js';
import * as Host from '../../core/host/host.js';

Host.RNPerfMetrics.registerPerfMetricsGlobalPostMessageHandler();

Host.rnPerfMetrics.setLaunchId(Root.Runtime.Runtime.queryParam('launchId'));
Host.rnPerfMetrics.entryPointLoadingStarted('rn_inspector');

RNExperiments.RNExperimentsImpl.setIsReactNativeEntryPoint(true);
RNExperiments.RNExperimentsImpl.Instance.enableExperimentsByDefault([
  Root.Runtime.ExperimentName.JS_HEAP_PROFILER_ENABLE,
  Root.Runtime.ExperimentName.JS_PROFILER_TEMP_ENABLE,
  Root.Runtime.ExperimentName.REACT_NATIVE_SPECIFIC_UI,
]);
RNExperiments.RNExperimentsImpl.Instance.setNonConfigurableExperiments(
  [
    // RDT support is Fusebox-only
    Root.Runtime.ExperimentName.ENABLE_REACT_DEVTOOLS_PANEL,
  ],
);

const UIStrings = {
  /**
   *@description Title of the 'React Native' tool in the Network Navigator View, which is part of the Sources tool
   */
  networkTitle: 'React Native',
  /**
   *@description Command for showing the 'React Native' tool in the Network Navigator View, which is part of the Sources tool
   */
  showReactNative: 'Show React Native',
};

const str_ = i18n.i18n.registerUIStrings('entrypoints/rn_inspector/rn_inspector.ts', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

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

Host.rnPerfMetrics.entryPointLoadingFinished('rn_inspector');
