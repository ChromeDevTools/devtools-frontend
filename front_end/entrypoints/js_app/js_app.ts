// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../shell/shell.js';
import '../../panels/js_timeline/js_timeline-meta.js';
import '../../panels/mobile_throttling/mobile_throttling-meta.js';

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Sources from '../../panels/sources/sources.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Main from '../main/main.js';

const UIStrings = {
  /**
   *@description Text that refers to the main target.
   */
  main: 'Main',
  /**
   *@description Title of the 'Scripts' tool in the Network Navigator View, which is part of the Sources tool
   */
  networkTitle: 'Scripts',
  /**
   *@description Command for showing the 'Scripts' tool in the Network Navigator View, which is part of the Sources tool
   */
  showNode: 'Show Scripts',
};

const str_ = i18n.i18n.registerUIStrings('entrypoints/js_app/js_app.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

let jsMainImplInstance: JsMainImpl;
let loadedSourcesModule: (typeof Sources|undefined);

async function loadSourcesModule(): Promise<typeof Sources> {
  if (!loadedSourcesModule) {
    loadedSourcesModule = await import('../../panels/sources/sources.js');
  }
  return loadedSourcesModule;
}
export class JsMainImpl implements Common.Runnable.Runnable {
  static instance(opts: {forceNew: boolean|null} = {forceNew: null}): JsMainImpl {
    const {forceNew} = opts;
    if (!jsMainImplInstance || forceNew) {
      jsMainImplInstance = new JsMainImpl();
    }

    return jsMainImplInstance;
  }

  async run(): Promise<void> {
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.ConnectToNodeJSDirectly);
    void SDK.Connections.initMainConnection(async () => {
      const target = SDK.TargetManager.TargetManager.instance().createTarget(
          'main', i18nString(UIStrings.main), SDK.Target.Type.NODE, null);
      void target.runtimeAgent().invoke_runIfWaitingForDebugger();
    }, Components.TargetDetachedDialog.TargetDetachedDialog.webSocketConnectionLost);
  }
}

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.NAVIGATOR_VIEW,
  id: 'navigator-network',
  title: i18nLazyString(UIStrings.networkTitle),
  commandPrompt: i18nLazyString(UIStrings.showNode),
  order: 2,
  persistence: UI.ViewManager.ViewPersistence.PERMANENT,
  async loadView() {
    const Sources = await loadSourcesModule();
    return Sources.SourcesNavigator.NetworkNavigatorView.instance();
  },
});

Common.Runnable.registerEarlyInitializationRunnable(JsMainImpl.instance);
new Main.MainImpl.MainImpl();
