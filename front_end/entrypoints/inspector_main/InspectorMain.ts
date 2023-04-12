// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as MobileThrottling from '../../panels/mobile_throttling/mobile_throttling.js';
import * as IconButton from '../../ui/components/icon_button/icon_button.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';

import nodeIconStyles from './nodeIcon.css.js';

import type * as Protocol from '../../generated/protocol.js';

const UIStrings = {
  /**
   * @description Text that refers to the main target. The main target is the primary webpage that
   * DevTools is connected to. This text is used in various places in the UI as a label/name to inform
   * the user which target/webpage they are currently connected to, as DevTools may connect to multiple
   * targets at the same time in some scenarios.
   */
  main: 'Main',
  /**
   * @description Text that refers to the tab target. The tab target is the Chrome tab that
   * DevTools is connected to. This text is used in various places in the UI as a label/name to inform
   * the user which target they are currently connected to, as DevTools may connect to multiple
   * targets at the same time in some scenarios.
   */
  tab: 'Tab',
  /**
   * @description A warning shown to the user when JavaScript is disabled on the webpage that
   * DevTools is connected to.
   */
  javascriptIsDisabled: 'JavaScript is disabled',
  /**
   * @description A message that prompts the user to open devtools for a specific environment (Node.js)
   */
  openDedicatedTools: 'Open dedicated DevTools for `Node.js`',
};
const str_ = i18n.i18n.registerUIStrings('entrypoints/inspector_main/InspectorMain.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
let inspectorMainImplInstance: InspectorMainImpl;

export class InspectorMainImpl implements Common.Runnable.Runnable {
  static instance(opts: {
    forceNew: boolean|null,
  } = {forceNew: null}): InspectorMainImpl {
    const {forceNew} = opts;
    if (!inspectorMainImplInstance || forceNew) {
      inspectorMainImplInstance = new InspectorMainImpl();
    }

    return inspectorMainImplInstance;
  }

  async run(): Promise<void> {
    let firstCall = true;
    await SDK.Connections.initMainConnection(async () => {
      const type = Root.Runtime.Runtime.queryParam('v8only') ?
          SDK.Target.Type.Node :
          (Root.Runtime.Runtime.queryParam('targetType') === 'tab' ? SDK.Target.Type.Tab : SDK.Target.Type.Frame);
      // TODO(crbug.com/1348385): support waiting for debugger with tab target.
      const waitForDebuggerInPage =
          type === SDK.Target.Type.Frame && Root.Runtime.Runtime.queryParam('panel') === 'sources';
      const name = type === SDK.Target.Type.Frame ? i18nString(UIStrings.main) : i18nString(UIStrings.tab);
      const target = SDK.TargetManager.TargetManager.instance().createTarget(
          'main', name, type, null, undefined, waitForDebuggerInPage);

      const targetManager = SDK.TargetManager.TargetManager.instance();
      targetManager.observeTargets({
        targetAdded: (target: SDK.Target.Target) => {
          if (target === targetManager.primaryPageTarget()) {
            target.setName(i18nString(UIStrings.main));
          }
        },
        targetRemoved: (_: unknown) => {},
      });
      // Only resume target during the first connection,
      // subsequent connections are due to connection hand-over,
      // there is no need to pause in debugger.
      if (!firstCall) {
        return;
      }
      firstCall = false;

      if (waitForDebuggerInPage) {
        const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
        if (debuggerModel) {
          if (!debuggerModel.isReadyToPause()) {
            await debuggerModel.once(SDK.DebuggerModel.Events.DebuggerIsReadyToPause);
          }
          debuggerModel.pause();
        }
      }

      if (type !== SDK.Target.Type.Tab) {
        void target.runtimeAgent().invoke_runIfWaitingForDebugger();
      }
    }, Components.TargetDetachedDialog.TargetDetachedDialog.webSocketConnectionLost);

    new SourcesPanelIndicator();
    new BackendSettingsSync();
    new MobileThrottling.NetworkPanelIndicator.NetworkPanelIndicator();

    Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(
        Host.InspectorFrontendHostAPI.Events.ReloadInspectedPage, ({data: hard}) => {
          SDK.ResourceTreeModel.ResourceTreeModel.reloadAllPages(hard);
        });
  }
}

Common.Runnable.registerEarlyInitializationRunnable(InspectorMainImpl.instance);

let reloadActionDelegateInstance: ReloadActionDelegate;

export class ReloadActionDelegate implements UI.ActionRegistration.ActionDelegate {
  static instance(opts: {
    forceNew: boolean|null,
  } = {forceNew: null}): ReloadActionDelegate {
    const {forceNew} = opts;
    if (!reloadActionDelegateInstance || forceNew) {
      reloadActionDelegateInstance = new ReloadActionDelegate();
    }

    return reloadActionDelegateInstance;
  }

  handleAction(context: UI.Context.Context, actionId: string): boolean {
    switch (actionId) {
      case 'inspector_main.reload':
        SDK.ResourceTreeModel.ResourceTreeModel.reloadAllPages(false);
        return true;
      case 'inspector_main.hard-reload':
        SDK.ResourceTreeModel.ResourceTreeModel.reloadAllPages(true);
        return true;
    }
    return false;
  }
}

let focusDebuggeeActionDelegateInstance: FocusDebuggeeActionDelegate;

export class FocusDebuggeeActionDelegate implements UI.ActionRegistration.ActionDelegate {
  static instance(opts: {
    forceNew: boolean|null,
  } = {forceNew: null}): FocusDebuggeeActionDelegate {
    const {forceNew} = opts;
    if (!focusDebuggeeActionDelegateInstance || forceNew) {
      focusDebuggeeActionDelegateInstance = new FocusDebuggeeActionDelegate();
    }

    return focusDebuggeeActionDelegateInstance;
  }
  handleAction(_context: UI.Context.Context, _actionId: string): boolean {
    const mainTarget = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
    if (!mainTarget) {
      return false;
    }
    void mainTarget.pageAgent().invoke_bringToFront();
    return true;
  }
}

let nodeIndicatorInstance: NodeIndicator;

export class NodeIndicator implements UI.Toolbar.Provider {
  readonly #element: Element;
  readonly #button: UI.Toolbar.ToolbarItem;
  private constructor() {
    const element = document.createElement('div');
    const shadowRoot =
        UI.Utils.createShadowRootWithCoreStyles(element, {cssFile: [nodeIconStyles], delegatesFocus: undefined});
    this.#element = shadowRoot.createChild('div', 'node-icon');
    element.addEventListener(
        'click', () => Host.InspectorFrontendHost.InspectorFrontendHostInstance.openNodeFrontend(), false);
    this.#button = new UI.Toolbar.ToolbarItem(element);
    this.#button.setTitle(i18nString(UIStrings.openDedicatedTools));
    SDK.TargetManager.TargetManager.instance().addEventListener(
        SDK.TargetManager.Events.AvailableTargetsChanged, event => this.#update(event.data));
    this.#button.setVisible(false);
    this.#update([]);
  }
  static instance(opts: {
    forceNew: boolean|null,
  } = {forceNew: null}): NodeIndicator {
    const {forceNew} = opts;
    if (!nodeIndicatorInstance || forceNew) {
      nodeIndicatorInstance = new NodeIndicator();
    }

    return nodeIndicatorInstance;
  }

  #update(targetInfos: Protocol.Target.TargetInfo[]): void {
    const hasNode = Boolean(targetInfos.find(target => target.type === 'node' && !target.attached));
    this.#element.classList.toggle('inactive', !hasNode);
    if (hasNode) {
      this.#button.setVisible(true);
    }
  }

  item(): UI.Toolbar.ToolbarItem|null {
    return this.#button;
  }
}

export class SourcesPanelIndicator {
  constructor() {
    Common.Settings.Settings.instance()
        .moduleSetting('javaScriptDisabled')
        .addChangeListener(javaScriptDisabledChanged);
    javaScriptDisabledChanged();

    function javaScriptDisabledChanged(): void {
      let icon: IconButton.Icon.Icon|null = null;
      const javaScriptDisabled = Common.Settings.Settings.instance().moduleSetting('javaScriptDisabled').get();
      if (javaScriptDisabled) {
        icon = new IconButton.Icon.Icon();
        icon.data = {iconName: 'warning-filled', color: 'var(--icon-warning)', width: '14px', height: '14px'};
        UI.Tooltip.Tooltip.install(icon, i18nString(UIStrings.javascriptIsDisabled));
      }
      UI.InspectorView.InspectorView.instance().setPanelIcon('sources', icon);
    }
  }
}

export class BackendSettingsSync implements SDK.TargetManager.Observer {
  readonly #autoAttachSetting: Common.Settings.Setting<boolean>;
  readonly #adBlockEnabledSetting: Common.Settings.Setting<boolean>;
  readonly #emulatePageFocusSetting: Common.Settings.Setting<boolean>;

  constructor() {
    this.#autoAttachSetting = Common.Settings.Settings.instance().moduleSetting('autoAttachToCreatedPages');
    this.#autoAttachSetting.addChangeListener(this.#updateAutoAttach, this);
    this.#updateAutoAttach();

    this.#adBlockEnabledSetting = Common.Settings.Settings.instance().moduleSetting('network.adBlockingEnabled');
    this.#adBlockEnabledSetting.addChangeListener(this.#update, this);

    this.#emulatePageFocusSetting = Common.Settings.Settings.instance().moduleSetting('emulatePageFocus');
    this.#emulatePageFocusSetting.addChangeListener(this.#update, this);

    SDK.TargetManager.TargetManager.instance().observeTargets(this);
  }

  #updateTarget(target: SDK.Target.Target): void {
    if (target.type() !== SDK.Target.Type.Frame || target.parentTarget()?.type() === SDK.Target.Type.Frame) {
      return;
    }
    void target.pageAgent().invoke_setAdBlockingEnabled({enabled: this.#adBlockEnabledSetting.get()});
    void target.emulationAgent().invoke_setFocusEmulationEnabled({enabled: this.#emulatePageFocusSetting.get()});
  }

  #updateAutoAttach(): void {
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.setOpenNewWindowForPopups(this.#autoAttachSetting.get());
  }

  #update(): void {
    for (const target of SDK.TargetManager.TargetManager.instance().targets()) {
      this.#updateTarget(target);
    }
  }

  targetAdded(target: SDK.Target.Target): void {
    this.#updateTarget(target);
  }

  targetRemoved(_target: SDK.Target.Target): void {
  }
}

SDK.ChildTargetManager.ChildTargetManager.install();
