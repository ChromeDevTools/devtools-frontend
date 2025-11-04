// Copyright 2018 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as MobileThrottling from '../../panels/mobile_throttling/mobile_throttling.js';
import * as Security from '../../panels/security/security.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import nodeIconStyles from './nodeIcon.css.js';
const { html } = Lit;
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
     * @meaning Tab target that's different than the "Tab" of Chrome. (See b/343009012)
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
let inspectorMainImplInstance;
export class InspectorMainImpl {
    static instance(opts = { forceNew: null }) {
        const { forceNew } = opts;
        if (!inspectorMainImplInstance || forceNew) {
            inspectorMainImplInstance = new InspectorMainImpl();
        }
        return inspectorMainImplInstance;
    }
    async run() {
        let firstCall = true;
        await SDK.Connections.initMainConnection(async () => {
            const type = Root.Runtime.Runtime.queryParam('v8only') ?
                SDK.Target.Type.NODE :
                (Root.Runtime.Runtime.queryParam('targetType') === 'tab' || Root.Runtime.Runtime.isTraceApp() ?
                    SDK.Target.Type.TAB :
                    SDK.Target.Type.FRAME);
            // TODO(crbug.com/1348385): support waiting for debugger with tab target.
            const waitForDebuggerInPage = type === SDK.Target.Type.FRAME && Root.Runtime.Runtime.queryParam('panel') === 'sources';
            const name = type === SDK.Target.Type.FRAME ? i18nString(UIStrings.main) : i18nString(UIStrings.tab);
            const target = SDK.TargetManager.TargetManager.instance().createTarget('main', name, type, null, undefined, waitForDebuggerInPage);
            const waitForPrimaryPageTarget = () => {
                return new Promise(resolve => {
                    const targetManager = SDK.TargetManager.TargetManager.instance();
                    targetManager.observeTargets({
                        targetAdded: (target) => {
                            if (target === targetManager.primaryPageTarget()) {
                                target.setName(i18nString(UIStrings.main));
                                resolve(target);
                            }
                        },
                        targetRemoved: (_) => { },
                    });
                });
            };
            await waitForPrimaryPageTarget();
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
            if (type !== SDK.Target.Type.TAB) {
                void target.runtimeAgent().invoke_runIfWaitingForDebugger();
            }
        }, Components.TargetDetachedDialog.TargetDetachedDialog.connectionLost);
        new SourcesPanelIndicator();
        new BackendSettingsSync();
        new MobileThrottling.NetworkPanelIndicator.NetworkPanelIndicator();
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(Host.InspectorFrontendHostAPI.Events.ReloadInspectedPage, ({ data: hard }) => {
            SDK.ResourceTreeModel.ResourceTreeModel.reloadAllPages(hard);
        });
        // Skip possibly showing the cookie control reload banner if devtools UI is not enabled or if there is an enterprise policy blocking third party cookies
        if (!Root.Runtime.hostConfig.devToolsPrivacyUI?.enabled ||
            Root.Runtime.hostConfig.thirdPartyCookieControls?.managedBlockThirdPartyCookies === true) {
            return;
        }
        // Third party cookie control settings according to the browser
        const browserCookieControls = Root.Runtime.hostConfig.thirdPartyCookieControls;
        // Devtools cookie controls settings
        const cookieControlOverrideSetting = Common.Settings.Settings.instance().createSetting('cookie-control-override-enabled', undefined);
        const gracePeriodMitigationDisabledSetting = Common.Settings.Settings.instance().createSetting('grace-period-mitigation-disabled', undefined);
        const heuristicMitigationDisabledSetting = Common.Settings.Settings.instance().createSetting('heuristic-mitigation-disabled', undefined);
        // If there are saved cookie control settings, check to see if they differ from the browser config. If they do, prompt a page reload so the user will see the cookie controls behavior.
        if (cookieControlOverrideSetting.get() !== undefined) {
            if (browserCookieControls?.thirdPartyCookieRestrictionEnabled !== cookieControlOverrideSetting.get()) {
                Security.CookieControlsView.showInfobar();
                return;
            }
            // If the devtools third-party cookie control is active, we also need to check if there's a discrepancy in the mitigation behavior.
            if (cookieControlOverrideSetting.get()) {
                if (browserCookieControls?.thirdPartyCookieMetadataEnabled === gracePeriodMitigationDisabledSetting.get()) {
                    Security.CookieControlsView.showInfobar();
                    return;
                }
                if (browserCookieControls?.thirdPartyCookieHeuristicsEnabled === heuristicMitigationDisabledSetting.get()) {
                    Security.CookieControlsView.showInfobar();
                    return;
                }
            }
        }
    }
}
Common.Runnable.registerEarlyInitializationRunnable(InspectorMainImpl.instance);
export class ReloadActionDelegate {
    handleAction(_context, actionId) {
        switch (actionId) {
            case 'inspector-main.reload':
                SDK.ResourceTreeModel.ResourceTreeModel.reloadAllPages(false);
                return true;
            case 'inspector-main.hard-reload':
                SDK.ResourceTreeModel.ResourceTreeModel.reloadAllPages(true);
                return true;
        }
        return false;
    }
}
export class FocusDebuggeeActionDelegate {
    handleAction(_context, _actionId) {
        const mainTarget = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
        if (!mainTarget) {
            return false;
        }
        void mainTarget.pageAgent().invoke_bringToFront();
        return true;
    }
}
const isNodeProcessRunning = (targetInfos) => {
    return Boolean(targetInfos.find(target => target.type === 'node' && !target.attached));
};
export const DEFAULT_VIEW = (input, output, target) => {
    const { nodeProcessRunning, } = input;
    // clang-format off
    Lit.render(html `
    <style>${nodeIconStyles}</style>
    <div
        class="node-icon ${!nodeProcessRunning ? 'inactive' : ''}"
        title=${i18nString(UIStrings.openDedicatedTools)}
        @click=${() => Host.InspectorFrontendHost.InspectorFrontendHostInstance.openNodeFrontend()}>
    </div>
    `, target);
    // clang-format on
};
export class NodeIndicator extends UI.Widget.Widget {
    #view;
    #targetInfos = [];
    #wasShown = false;
    constructor(element, view = DEFAULT_VIEW) {
        super(element, { useShadowDom: true });
        this.#view = view;
        SDK.TargetManager.TargetManager.instance().addEventListener("AvailableTargetsChanged" /* SDK.TargetManager.Events.AVAILABLE_TARGETS_CHANGED */, event => {
            this.#targetInfos = event.data;
            this.requestUpdate();
        });
    }
    performUpdate() {
        // Disable when we are testing, as debugging e2e
        // attaches a debug process and this changes some view sizes
        if (Host.InspectorFrontendHost.isUnderTest()) {
            return;
        }
        const nodeProcessRunning = isNodeProcessRunning(this.#targetInfos);
        if (!this.#wasShown && !nodeProcessRunning) {
            // This widget is designed to be hidden until the first debuggable Node process is detected. Therefore
            // we don't construct the view if there's no data. After we've shown it once, it remains on-sreen and
            // indicates via its disabled state whether Node debugging is available.
            return;
        }
        this.#wasShown = true;
        const input = {
            nodeProcessRunning,
        };
        this.#view(input, {}, this.contentElement);
    }
}
let nodeIndicatorProviderInstance;
export class NodeIndicatorProvider {
    #toolbarItem;
    #widgetElement;
    constructor() {
        this.#widgetElement = document.createElement('devtools-widget');
        this.#widgetElement.widgetConfig = UI.Widget.widgetConfig(NodeIndicator);
        this.#toolbarItem = new UI.Toolbar.ToolbarItem(this.#widgetElement);
        this.#toolbarItem.setVisible(false);
    }
    item() {
        return this.#toolbarItem;
    }
    static instance(opts = { forceNew: null }) {
        const { forceNew } = opts;
        if (!nodeIndicatorProviderInstance || forceNew) {
            nodeIndicatorProviderInstance = new NodeIndicatorProvider();
        }
        return nodeIndicatorProviderInstance;
    }
}
export class SourcesPanelIndicator {
    constructor() {
        Common.Settings.Settings.instance()
            .moduleSetting('java-script-disabled')
            .addChangeListener(javaScriptDisabledChanged);
        javaScriptDisabledChanged();
        function javaScriptDisabledChanged() {
            const warnings = [];
            if (Common.Settings.Settings.instance().moduleSetting('java-script-disabled').get()) {
                warnings.push(i18nString(UIStrings.javascriptIsDisabled));
            }
            UI.InspectorView.InspectorView.instance().setPanelWarnings('sources', warnings);
        }
    }
}
export class BackendSettingsSync {
    #autoAttachSetting;
    #adBlockEnabledSetting;
    #emulatePageFocusSetting;
    constructor() {
        this.#autoAttachSetting = Common.Settings.Settings.instance().moduleSetting('auto-attach-to-created-pages');
        this.#autoAttachSetting.addChangeListener(this.#updateAutoAttach, this);
        this.#updateAutoAttach();
        this.#adBlockEnabledSetting = Common.Settings.Settings.instance().moduleSetting('network.ad-blocking-enabled');
        this.#adBlockEnabledSetting.addChangeListener(this.#update, this);
        this.#emulatePageFocusSetting = Common.Settings.Settings.instance().moduleSetting('emulate-page-focus');
        this.#emulatePageFocusSetting.addChangeListener(this.#update, this);
        SDK.TargetManager.TargetManager.instance().addModelListener(SDK.ChildTargetManager.ChildTargetManager, "TargetInfoChanged" /* SDK.ChildTargetManager.Events.TARGET_INFO_CHANGED */, this.#targetInfoChanged, this);
        SDK.TargetManager.TargetManager.instance().observeTargets(this);
    }
    #updateTarget(target) {
        if (target.type() !== SDK.Target.Type.FRAME || target.parentTarget()?.type() === SDK.Target.Type.FRAME) {
            return;
        }
        void target.pageAgent().invoke_setAdBlockingEnabled({ enabled: this.#adBlockEnabledSetting.get() });
        void target.emulationAgent().invoke_setFocusEmulationEnabled({ enabled: this.#emulatePageFocusSetting.get() });
    }
    #updateAutoAttach() {
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.setOpenNewWindowForPopups(this.#autoAttachSetting.get());
    }
    #update() {
        for (const target of SDK.TargetManager.TargetManager.instance().targets()) {
            this.#updateTarget(target);
        }
    }
    #targetInfoChanged(event) {
        const targetManager = SDK.TargetManager.TargetManager.instance();
        const target = targetManager.targetById(event.data.targetId);
        if (!target || target.outermostTarget() !== target) {
            return;
        }
        this.#updateTarget(target);
    }
    targetAdded(target) {
        this.#updateTarget(target);
    }
    targetRemoved(_target) {
    }
}
SDK.ChildTargetManager.ChildTargetManager.install();
//# sourceMappingURL=InspectorMain.js.map