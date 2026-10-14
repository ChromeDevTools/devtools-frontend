// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/*
 * Copyright (C) 2008 Apple Inc. All Rights Reserved.
 * Copyright (C) 2011 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE INC. ``AS IS'' AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL APPLE INC. OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY
 * OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
import '../../ui/legacy/legacy.js';
import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Badges from '../../models/badges/badges.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as Breakpoints from '../../models/breakpoints/breakpoints.js';
import * as StackTrace from '../../models/stack_trace/stack_trace.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as PanelCommon from '../../panels/common/common.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as Geometry from '../../ui/geometry/geometry.js';
import * as ObjectUI from '../../ui/legacy/components/object_ui/object_ui.js';
import * as UI from '../../ui/legacy/legacy.js';
import { html, nothing, render } from '../../ui/lit/lit.js';
import * as Settings from '../../ui/settings/settings.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import * as Snippets from '../snippets/snippets.js';
import { CallStackSidebarPane } from './CallStackSidebarPane.js';
import { DebuggerPausedMessage } from './DebuggerPausedMessage.js';
import { NavigatorView } from './NavigatorView.js';
import sourcesPanelStyles from './sourcesPanel.css.js';
import { SourcesView } from './SourcesView.js';
import { ThreadsSidebarPane } from './ThreadsSidebarPane.js';
import { UISourceCodeFrame } from './UISourceCodeFrame.js';
const { bindToAction } = UI.UIUtils;
const { widget } = UI.Widget;
const UIStrings = {
    /**
     * @description Text that appears when user drags and drops a folder in the Sources panel.
     */
    dropWorkspaceFolderHere: 'Drop workspace folder here',
    /**
     * @description Text to show more options.
     */
    moreOptions: 'More options',
    /**
     * @description Text in Sources panel.
     */
    groupByFolder: 'Group by folder',
    /**
     * @description Text in Sources panel.
     */
    groupByAuthored: 'Group by authored/deployed',
    /**
     * @description Text in Sources panel.
     */
    hideIgnoreListed: 'Hide ignore-listed sources',
    /**
     * @description Tooltip text that appears when hovering over the resume button in the Sources panel.
     */
    resumeWithAllPausesBlockedForMs: 'Resume with all pauses blocked for 500 ms',
    /**
     * @description Tooltip text that appears when hovering over the terminate execution button in the Sources panel.
     */
    terminateCurrentJavascriptCall: 'Terminate current JavaScript call',
    /**
     * @description A context menu item in the Sources panel.
     */
    revealInSidebar: 'Reveal in navigator sidebar',
    /**
     * @description A context menu item in the Sources panel when debugging JavaScript code.
     * When clicked, the execution is resumed until it reaches the line specified by the right-click that
     * opened the context menu.
     */
    continueToHere: 'Continue to here',
    /**
     * @description A context menu item in the Console panel that stores selection as a temporary global variable.
     */
    storeAsGlobalVariable: 'Store as global variable',
    /**
     * @description A context menu item in the Console, Sources, and Network panels.
     * @example {string} PH1
     */
    copyS: 'Copy {PH1}',
    /**
     * @description A context menu item for strings in the Console, Sources, and Network panels.
     * When clicked, the raw contents of the string is copied to the clipboard.
     */
    copyStringContents: 'Copy string contents',
    /**
     * @description A context menu item for strings in the Console, Sources, and Network panels.
     * When clicked, the string is copied to the clipboard as a valid JavaScript literal.
     */
    copyStringAsJSLiteral: 'Copy string as JavaScript literal',
    /**
     * @description A context menu item for strings in the Console, Sources, and Network panels.
     * When clicked, the string is copied to the clipboard as a valid JSON literal.
     */
    copyStringAsJSONLiteral: 'Copy string as JSON literal',
    /**
     * @description A context menu item in the Sources panel.
     */
    showFunctionDefinition: 'Show function definition',
    /**
     * @description Text in Sources panel.
     */
    openInSourcesPanel: 'Open in Sources panel',
    /**
     * @description Text of a context menu item to redirect to the AI assistance panel and to start a chat.
     */
    startAChat: 'Start a chat',
    /**
     * @description Text of a context menu item to redirect to the AI assistance panel and directly execute
     * a prompt to assess the performance of a script.
     */
    assessPerformance: 'Assess performance',
    /**
     * @description Context menu item in Sources panel to explain a script via AI.
     */
    explainThisScript: 'Explain this script',
    /**
     * @description Context menu item in Sources panel to explain input handling in a script via AI.
     */
    explainInputHandling: 'Explain input handling',
    /**
     * @description Screen reader announcement when the navigator sidebar is shown in the Sources panel.
     */
    navigatorShown: 'Navigator sidebar shown',
    /**
     * @description Screen reader announcement when the navigator sidebar is hidden in the Sources panel.
     */
    navigatorHidden: 'Navigator sidebar hidden',
    /**
     * @description Screen reader announcement when the debugger sidebar is shown in the Sources panel.
     */
    debuggerShown: 'Debugger sidebar shown',
    /**
     * @description Screen reader announcement when the debugger sidebar is hidden in the Sources panel.
     */
    debuggerHidden: 'Debugger sidebar hidden',
};
const str_ = i18n.i18n.registerUIStrings('panels/sources/SourcesPanel.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const primitiveRemoteObjectTypes = new Set(['number', 'boolean', 'bigint', 'undefined']);
let sourcesPanelInstance;
function isSidebarOpenInSplitSetting(settingName, isVertical) {
    const state = Common.Settings.Settings.instance().createSetting(settingName, {}).get();
    const orientationState = isVertical ? state.vertical : state.horizontal;
    const showMode = orientationState?.showMode ?? (isVertical ? state.horizontal?.showMode : state.vertical?.showMode);
    return showMode !== "OnlyMain" /* UI.SplitWidget.ShowMode.ONLY_MAIN */;
}
function setSidebarOpenInSplitSetting(settingName, isVertical, open) {
    const setting = Common.Settings.Settings.instance().createSetting(settingName, {});
    const state = setting.get() || {};
    const showMode = open ? "Both" /* UI.SplitWidget.ShowMode.BOTH */ : "OnlyMain" /* UI.SplitWidget.ShowMode.ONLY_MAIN */;
    const currentOrientationState = (isVertical ? state.vertical : state.horizontal) || {};
    currentOrientationState.showMode = showMode;
    const otherOrientationState = (isVertical ? state.horizontal : state.vertical) || {};
    otherOrientationState.showMode = showMode;
    if (isVertical) {
        state.vertical = currentOrientationState;
        state.horizontal = otherOrientationState;
    }
    else {
        state.horizontal = currentOrientationState;
        state.vertical = otherOrientationState;
    }
    setting.set(state);
}
export const DEFAULT_VIEW = (input, _output, target) => {
    // clang-format off
    render(html `
    <style>${sourcesPanelStyles}</style>
    <devtools-split-view
        class="widget split-widget ${input.isVertical ? '' : 'sources-split-view-vertical'}"
        direction=${input.isVertical ? 'column' : 'row'}
        sidebar-position="second"
        name="sources-panel-split-view-state"
        sidebar-initial-size="225"
        show=${!input.isTraceApp && input.isDebuggerSidebarOpen ? 'both' : 'main'}
        @change=${input.onDebuggerSplitChange}>
      <devtools-split-view
          slot="main"
          direction="column"
          sidebar-position="first"
          name="sources-panel-navigator-split-view-state"
          sidebar-initial-size="225"
          show=${input.isNavigatorSidebarOpen ? 'both' : 'main'}
          @change=${input.onNavigatorSplitChange}>
        <devtools-widget
            slot="sidebar"
            ${widget(UI.Widget.WrapperWidget, {
        widget: input.isNavigatorSidebarOpen ? input.navigatorTabbedPane : null,
    })}>
        </devtools-widget>
        <devtools-widget
            slot="main"
            ${widget(UI.Widget.WrapperWidget, { widget: input.sourcesView })}>
        </devtools-widget>
      </devtools-split-view>
      ${!input.isTraceApp && input.sidebarPaneStackWidget ? (input.isVertical ? html `
        <devtools-widget
            slot="sidebar"
            ${widget(UI.Widget.VBox, {
        minimumSize: new Geometry.Size(minToolbarWidth, 25),
    })}>
          ${renderDebugPaneContent(input)}
        </devtools-widget>
      ` : html `
        <devtools-split-view
            slot="sidebar"
            direction="column"
            sidebar-position="second"
            name="sources-panel-debugger-sidebar-split-view-state"
            sidebar-initial-size="0.5">
          <devtools-widget
              slot="main"
              ${widget(UI.Widget.VBox, {
        minimumSize: new Geometry.Size(minToolbarWidth, 25),
    })}>
            ${renderDebugPaneContent(input)}
          </devtools-widget>
          ${input.debuggerSidebarTabbedPane ? html `
            <devtools-widget
                slot="sidebar"
                ${widget(UI.Widget.WrapperWidget, { widget: input.debuggerSidebarTabbedPane })}>
            </devtools-widget>
          ` : nothing}
        </devtools-split-view>
      `) : nothing}
    </devtools-split-view>
  `, target);
    // clang-format on
};
function renderDebugPaneContent(input) {
    // clang-format off
    return html `
    ${input.isDebuggerSidebarOpen ? html `
      <devtools-toolbar
          class="scripts-debug-toolbar"
          jslog=${VisualLogging.toolbar('debug').track({
        keydown: 'ArrowUp|ArrowLeft|ArrowDown|ArrowRight|Enter|Space',
    })}>
        <devtools-button ${bindToAction('debugger.toggle-pause')}>
          <devtools-button
              .iconName=${'stop'}
              .variant=${"toolbar" /* Buttons.Button.Variant.TOOLBAR */}
              .title=${i18nString(UIStrings.terminateCurrentJavascriptCall)}
              @click=${input.onTerminateExecution}>
          </devtools-button>
          <devtools-button
              .iconName=${'play'}
              .variant=${"toolbar" /* Buttons.Button.Variant.TOOLBAR */}
              .title=${i18nString(UIStrings.resumeWithAllPausesBlockedForMs)}
              @click=${input.onLongResume}>
          </devtools-button>
        </devtools-button>
        <devtools-button ${bindToAction('debugger.step-over')}></devtools-button>
        <devtools-button ${bindToAction('debugger.step-into')}></devtools-button>
        <devtools-button ${bindToAction('debugger.step-out')}></devtools-button>
        <devtools-button ${bindToAction('debugger.step')}></devtools-button>
        <div class="toolbar-divider"></div>
        <devtools-button ${bindToAction('debugger.toggle-breakpoints-active')}></devtools-button>
      </devtools-toolbar>
    ` : nothing}
    <devtools-widget
        class="flex-none"
        ${widget(UI.Widget.WrapperWidget, { widget: input.debuggerPausedMessage })}>
    </devtools-widget>
    <devtools-widget
        class="flex-auto"
        ${widget(UI.Widget.WrapperWidget, { widget: input.sidebarPaneStackWidget })}>
    </devtools-widget>
  `;
    // clang-format on
}
export class SourcesPanel extends UI.Panel.Panel {
    // Accessed in legacy_test_runner / web_tests.
    workspace;
    navigatorTabbedLocation;
    watchSidebarPane;
    sidebarPaneStack;
    #view;
    #togglePauseAction;
    #stepOverAction;
    #stepIntoAction;
    #stepOutAction;
    #stepAction;
    #toggleBreakpointsActiveAction;
    #debuggerPausedMessage;
    #overlayLoggables;
    #isVertical = true;
    #isNavigatorSidebarOpen;
    #isDebuggerSidebarOpen;
    #showSourcesViewInWrapper = false;
    #sourcesView;
    threadsSidebarPane;
    #callstackPane;
    #lastModificationTime;
    #paused;
    #switchToPausedTargetTimeout;
    #extensionSidebarPanesContainer;
    #debuggerSidebarTabbedLocation = null;
    #lastPausedTarget = null;
    constructor(view = DEFAULT_VIEW) {
        super('sources');
        this.#view = view;
        new UI.DropTarget.DropTarget(this.element, [UI.DropTarget.Type.Folder], i18nString(UIStrings.dropWorkspaceFolderHere), this.#handleDrop.bind(this));
        this.workspace = Workspace.Workspace.WorkspaceImpl.instance();
        this.#togglePauseAction = UI.ActionRegistry.ActionRegistry.instance().getAction('debugger.toggle-pause');
        this.#stepOverAction = UI.ActionRegistry.ActionRegistry.instance().getAction('debugger.step-over');
        this.#stepIntoAction = UI.ActionRegistry.ActionRegistry.instance().getAction('debugger.step-into');
        this.#stepOutAction = UI.ActionRegistry.ActionRegistry.instance().getAction('debugger.step-out');
        this.#stepAction = UI.ActionRegistry.ActionRegistry.instance().getAction('debugger.step');
        this.#toggleBreakpointsActiveAction =
            UI.ActionRegistry.ActionRegistry.instance().getAction('debugger.toggle-breakpoints-active');
        this.#debuggerPausedMessage =
            new DebuggerPausedMessage(undefined, [SDK.EventBreakpointsModel.EventBreakpointsManager.instance()]);
        // Create navigator tabbed pane with toolbar.
        this.navigatorTabbedLocation = UI.ViewManager.ViewManager.instance().createTabbedLocation(this.#revealNavigatorSidebar.bind(this), 'navigator-view', true, true);
        const tabbedPane = this.navigatorTabbedLocation.tabbedPane();
        tabbedPane.setMinimumSize(100, 25);
        tabbedPane.element.classList.add('navigator-tabbed-pane');
        tabbedPane.headerElement().setAttribute('jslog', `${VisualLogging.toolbar('navigator').track({ keydown: 'ArrowUp|ArrowLeft|ArrowDown|ArrowRight|Enter|Space' })}`);
        const navigatorMenuButton = new UI.ContextMenu.MenuButton();
        navigatorMenuButton.populateMenuCall = this.#populateNavigatorMenu.bind(this);
        navigatorMenuButton.jslogContext = 'more-options';
        navigatorMenuButton.iconName = 'dots-vertical';
        navigatorMenuButton.title = i18nString(UIStrings.moreOptions);
        tabbedPane.rightToolbar().appendToolbarItem(new UI.Toolbar.ToolbarItem(navigatorMenuButton));
        this.#sourcesView = new SourcesView();
        this.#sourcesView.addEventListener("EditorSelected" /* Events.EDITOR_SELECTED */, this.#editorSelected.bind(this));
        this.#sourcesView.addEventListener("EditorClosed" /* Events.EDITOR_CLOSED */, this.#editorClosed.bind(this));
        if (!window.opener) {
            window.addEventListener('beforeunload', this.handleBeforeUnload, true);
        }
        this.#sourcesView.onToggleNavigatorSidebar = this.toggleNavigatorSidebar.bind(this);
        this.#sourcesView.onToggleDebuggerSidebar = this.toggleDebuggerSidebar.bind(this);
        this.#isNavigatorSidebarOpen = isSidebarOpenInSplitSetting('sources-panel-navigator-split-view-state', true);
        this.#isDebuggerSidebarOpen = isSidebarOpenInSplitSetting('sources-panel-split-view-state', this.#isVertical);
        this.#sourcesView.isNavigatorSidebarOpen = this.#isNavigatorSidebarOpen;
        this.#sourcesView.isDebuggerSidebarOpen = this.#isDebuggerSidebarOpen;
        this.threadsSidebarPane = null;
        this.watchSidebarPane = UI.ViewManager.ViewManager.instance().view('sources.watch');
        this.#callstackPane = CallStackSidebarPane.instance();
        Common.Settings.Settings.instance()
            .resolve(Settings.MainSettings.sidebarPositionSettingDescriptor)
            .addChangeListener(() => this.#updateSidebarPosition());
        this.#updateSidebarPosition(true);
        void this.#updateDebuggerButtonsAndStatus();
        this.#setTarget(UI.Context.Context.instance().flavor(SDK.Target.Target));
        Common.Settings.Settings.instance()
            .resolve(SDK.SDKSettings.breakpointsActiveSettingDescriptor)
            .addChangeListener(this.#breakpointsActiveStateChanged, this);
        UI.Context.Context.instance().addFlavorChangeListener(SDK.Target.Target, this.#onCurrentTargetChanged, this);
        UI.Context.Context.instance().addFlavorChangeListener(StackTrace.StackTrace.DebuggableFrameFlavor, this.#callFrameChanged, this);
        SDK.TargetManager.TargetManager.instance().addModelListener(SDK.DebuggerModel.DebuggerModel, SDK.DebuggerModel.Events.DebuggerWasEnabled, this.#debuggerWasEnabled, this);
        SDK.TargetManager.TargetManager.instance().addModelListener(SDK.DebuggerModel.DebuggerModel, SDK.DebuggerModel.Events.DebuggerPaused, this.#debuggerPaused, this);
        SDK.TargetManager.TargetManager.instance().addModelListener(SDK.DebuggerModel.DebuggerModel, SDK.DebuggerModel.Events.DebugInfoAttached, this.#debugInfoAttached, this);
        SDK.TargetManager.TargetManager.instance().addModelListener(SDK.DebuggerModel.DebuggerModel, SDK.DebuggerModel.Events.DebuggerResumed, event => this.#debuggerResumed(event.data));
        SDK.TargetManager.TargetManager.instance().addModelListener(SDK.DebuggerModel.DebuggerModel, SDK.DebuggerModel.Events.GlobalObjectCleared, event => this.#debuggerResumed(event.data));
        PanelCommon.ExtensionServer.ExtensionServer.instance().addEventListener("SidebarPaneAdded" /* PanelCommon.ExtensionServer.Events.SidebarPaneAdded */, this.#extensionSidebarPaneAdded, this);
        SDK.TargetManager.TargetManager.instance().observeTargets(this);
        this.#lastModificationTime = -Infinity;
    }
    #setNavigatorSidebarOpen(isOpen) {
        if (this.#isNavigatorSidebarOpen === isOpen) {
            return;
        }
        this.#isNavigatorSidebarOpen = isOpen;
        setSidebarOpenInSplitSetting('sources-panel-navigator-split-view-state', true, isOpen);
        this.#sourcesView.isNavigatorSidebarOpen = isOpen;
        this.performUpdate();
    }
    #setDebuggerSidebarOpen(isOpen) {
        if (this.#isDebuggerSidebarOpen === isOpen) {
            return;
        }
        this.#isDebuggerSidebarOpen = isOpen;
        setSidebarOpenInSplitSetting('sources-panel-split-view-state', this.#isVertical, isOpen);
        this.#sourcesView.isDebuggerSidebarOpen = isOpen;
        this.performUpdate();
    }
    performUpdate() {
        this.#view({
            isVertical: this.#isVertical,
            isNavigatorSidebarOpen: this.#isNavigatorSidebarOpen,
            isDebuggerSidebarOpen: this.#isDebuggerSidebarOpen,
            isTraceApp: Root.Runtime.Runtime.isTraceApp(),
            navigatorTabbedPane: this.navigatorTabbedLocation.tabbedPane(),
            sourcesView: this.#showSourcesViewInWrapper ? null : this.#sourcesView,
            debuggerPausedMessage: this.#debuggerPausedMessage,
            sidebarPaneStackWidget: this.sidebarPaneStack?.widget() ?? null,
            debuggerSidebarTabbedPane: this.#debuggerSidebarTabbedLocation?.tabbedPane() ?? null,
            onNavigatorSplitChange: (event) => {
                this.#setNavigatorSidebarOpen(event.detail === "Both" /* UI.SplitWidget.ShowMode.BOTH */);
            },
            onDebuggerSplitChange: (event) => {
                this.#setDebuggerSidebarOpen(event.detail === "Both" /* UI.SplitWidget.ShowMode.BOTH */);
            },
            onTerminateExecution: this.#terminateExecution.bind(this),
            onLongResume: this.#longResume.bind(this),
        }, undefined, this.contentElement);
    }
    static instance(opts = { forceNew: null }) {
        const { forceNew } = opts;
        if (!sourcesPanelInstance || forceNew) {
            sourcesPanelInstance = new SourcesPanel();
        }
        return sourcesPanelInstance;
    }
    static updateResizerAndSidebarButtons(panel) {
        const isInWrapper = Boolean(UI.Context.Context.instance().flavor(QuickSourceView)) &&
            !UI.InspectorView.InspectorView.instance().isDrawerMinimized();
        panel.#sourcesView.setLayoutMode(panel.#isVertical, isInWrapper);
    }
    static setShowSourcesViewInWrapper(panel, showInWrapper) {
        if (panel.#showSourcesViewInWrapper === showInWrapper) {
            return;
        }
        panel.#showSourcesViewInWrapper = showInWrapper;
        panel.performUpdate();
    }
    targetAdded(_target) {
        this.showThreadsIfNeeded();
    }
    targetRemoved(_target) {
    }
    showThreadsIfNeeded() {
        if (ThreadsSidebarPane.shouldBeShown() && !this.threadsSidebarPane) {
            this.threadsSidebarPane = UI.ViewManager.ViewManager.instance().view('sources.threads');
            if (this.sidebarPaneStack && this.threadsSidebarPane) {
                this.sidebarPaneStack.appendView(this.threadsSidebarPane, this.#isVertical ? this.watchSidebarPane : this.#callstackPane);
            }
        }
    }
    #setTarget(target) {
        if (!target) {
            return;
        }
        const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
        if (!debuggerModel) {
            return;
        }
        if (debuggerModel.isPaused()) {
            this.#showDebuggerPausedDetails(debuggerModel.debuggerPausedDetails());
        }
        else {
            this.#paused = false;
            this.#clearInterface();
            this.#sourcesView.toggleDebuggerSidebarButtonEnabled(true);
        }
    }
    #onCurrentTargetChanged({ data: target }) {
        this.#setTarget(target);
    }
    paused() {
        return this.#paused || false;
    }
    wasShown() {
        UI.Context.Context.instance().setFlavor(SourcesPanel, this);
        super.wasShown();
        const wrapperView = UI.Context.Context.instance().flavor(QuickSourceView);
        if (wrapperView) {
            wrapperView.hideViewInWrapper();
            UI.InspectorView.InspectorView.instance().setDrawerMinimized(true);
            SourcesPanel.updateResizerAndSidebarButtons(this);
        }
        SourcesPanel.setShowSourcesViewInWrapper(this, false);
        this.#callstackPane.requestUpdate();
    }
    willHide() {
        super.willHide();
        UI.Context.Context.instance().setFlavor(SourcesPanel, null);
        const wrapperView = UI.Context.Context.instance().flavor(QuickSourceView);
        if (wrapperView) {
            wrapperView.showViewInWrapper();
            UI.InspectorView.InspectorView.instance().setDrawerMinimized(false);
            SourcesPanel.updateResizerAndSidebarButtons(this);
        }
    }
    resolveLocation(locationName) {
        if (locationName === 'sources.sidebar-top' || locationName === 'sources.sidebar-bottom' ||
            locationName === 'sources.sidebar-tabs') {
            return this.sidebarPaneStack || null;
        }
        return this.navigatorTabbedLocation;
    }
    ensureSourcesViewVisible() {
        if (UI.Context.Context.instance().flavor(QuickSourceView)) {
            return true;
        }
        if (!UI.InspectorView.InspectorView.instance().canSelectPanel('sources')) {
            return false;
        }
        void UI.ViewManager.ViewManager.instance().showView('sources');
        return true;
    }
    onResize() {
        if (Common.Settings.Settings.instance().resolve(Settings.MainSettings.sidebarPositionSettingDescriptor).get() ===
            'auto') {
            this.element.window().requestAnimationFrame(() => this.#updateSidebarPosition());
        } // Do not force layout.
    }
    searchableView() {
        return this.#sourcesView.searchableView();
    }
    toggleNavigatorSidebar() {
        const isOpen = !this.#isNavigatorSidebarOpen;
        this.#setNavigatorSidebarOpen(isOpen);
        UI.ARIAUtils.LiveAnnouncer.alert(isOpen ? i18nString(UIStrings.navigatorShown) :
            i18nString(UIStrings.navigatorHidden));
    }
    toggleDebuggerSidebar() {
        const isOpen = !this.#isDebuggerSidebarOpen;
        this.#setDebuggerSidebarOpen(isOpen);
        UI.ARIAUtils.LiveAnnouncer.alert(isOpen ? i18nString(UIStrings.debuggerShown) :
            i18nString(UIStrings.debuggerHidden));
        this.sidebarPaneStack?.notifyVisibilityChanged(isOpen);
    }
    #debuggerPaused(event) {
        const debuggerModel = event.data;
        const details = debuggerModel.debuggerPausedDetails();
        if (!this.#paused &&
            Common.Settings.Settings.instance()
                .resolve(Settings.SourcesSettings.autoFocusOnDebuggerPausedEnabledSettingDescriptor)
                .get()) {
            void this.setAsCurrentPanel();
        }
        if (UI.Context.Context.instance().flavor(SDK.Target.Target) === debuggerModel.target()) {
            this.#showDebuggerPausedDetails(details);
        }
        else if (!this.#paused) {
            UI.Context.Context.instance().setFlavor(SDK.Target.Target, debuggerModel.target());
        }
        Badges.UserBadges.instance().recordAction(Badges.BadgeAction.DEBUGGER_PAUSED);
        window.dispatchEvent(new CustomEvent('DevTools.DebuggerPaused', { bubbles: true, cancelable: true }));
    }
    #debugInfoAttached(event) {
        const { debuggerModel } = event.data;
        if (!debuggerModel.isPaused()) {
            return;
        }
        const details = debuggerModel.debuggerPausedDetails();
        if (details && UI.Context.Context.instance().flavor(SDK.Target.Target) === debuggerModel.target()) {
            this.#showDebuggerPausedDetails(details);
        }
    }
    #showDebuggerPausedDetails(details) {
        this.#paused = true;
        void this.#updateDebuggerButtonsAndStatus();
        UI.Context.Context.instance().setFlavor(SDK.DebuggerModel.DebuggerPausedDetails, details);
        this.#sourcesView.toggleDebuggerSidebarButtonEnabled(false);
        this.#revealDebuggerSidebar();
        const pausedTarget = details.debuggerModel.target();
        if (this.threadsSidebarPane && this.#lastPausedTarget?.deref() !== pausedTarget &&
            pausedTarget !== SDK.TargetManager.TargetManager.instance().primaryPageTarget()) {
            // If we pause in something other than the main frame (e.g. worker), we should expand the
            // "Threads" list to make it more clear which target is paused. We do this only if the target of
            // the previous pause is different from the new pause to prevent annoying the user by re-opening
            // the "Threads" list while stepping or hitting the same breakpoint multiple points.
            void this.sidebarPaneStack?.showView(this.threadsSidebarPane);
        }
        window.focus();
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.bringToFront();
        const withOverlay = UI.Context.Context.instance().flavor(SDK.Target.Target)?.model(SDK.OverlayModel.OverlayModel) &&
            !Common.Settings.Settings.instance().resolve(SDK.SDKSettings.disablePausedStateOverlaySettingDescriptor).get();
        if (withOverlay && !this.#overlayLoggables) {
            this.#overlayLoggables = { debuggerPausedMessage: {}, resumeButton: {}, stepOverButton: {} };
            VisualLogging.registerLoggable(this.#overlayLoggables.debuggerPausedMessage, `${VisualLogging.dialog('debugger-paused')}`, null, new DOMRect(0, 0, 200, 20));
            VisualLogging.registerLoggable(this.#overlayLoggables.resumeButton, `${VisualLogging.action('debugger.toggle-pause')}`, this.#overlayLoggables.debuggerPausedMessage, new DOMRect(0, 0, 20, 20));
            VisualLogging.registerLoggable(this.#overlayLoggables.stepOverButton, `${VisualLogging.action('debugger.step-over')}`, this.#overlayLoggables.debuggerPausedMessage, new DOMRect(0, 0, 20, 20));
        }
        this.#lastPausedTarget = new WeakRef(details.debuggerModel.target());
    }
    #maybeLogOverlayAction() {
        if (!this.#overlayLoggables) {
            return;
        }
        const byOverlayButton = !document.hasFocus();
        // In the overlay we show two buttons: resume and step over. Both trigger
        // the Debugger.resumed event. The latter however will trigger
        // Debugger.paused shortly after, while the former won't. Here we guess
        // which one was clicked by checking if we are paused again after 0.5s.
        window.setTimeout(() => {
            if (!this.#overlayLoggables) {
                return;
            }
            if (byOverlayButton) {
                const details = UI.Context.Context.instance().flavor(SDK.DebuggerModel.DebuggerPausedDetails);
                VisualLogging.logClick(this.#paused && details?.reason === "step" /* Protocol.Debugger.PausedEventReason.Step */ ?
                    this.#overlayLoggables.stepOverButton :
                    this.#overlayLoggables.resumeButton, new MouseEvent('click'));
            }
            if (!this.#paused) {
                VisualLogging.logResize(this.#overlayLoggables.debuggerPausedMessage, new DOMRect(0, 0, 0, 0));
                this.#overlayLoggables = undefined;
            }
        }, 500);
    }
    #debuggerResumed(debuggerModel) {
        this.#maybeLogOverlayAction();
        const target = debuggerModel.target();
        if (UI.Context.Context.instance().flavor(SDK.Target.Target) !== target) {
            return;
        }
        this.#paused = false;
        this.#clearInterface();
        this.#sourcesView.toggleDebuggerSidebarButtonEnabled(true);
        this.#switchToPausedTargetTimeout = window.setTimeout(this.#switchToPausedTarget.bind(this, debuggerModel), 500);
    }
    #debuggerWasEnabled(event) {
        const debuggerModel = event.data;
        if (UI.Context.Context.instance().flavor(SDK.Target.Target) !== debuggerModel.target()) {
            return;
        }
        void this.#updateDebuggerButtonsAndStatus();
    }
    get visibleView() {
        return this.#sourcesView.visibleView();
    }
    async showUISourceCode(uiSourceCode, location, omitFocus) {
        if (omitFocus) {
            if (!this.isShowing() && !UI.Context.Context.instance().flavor(QuickSourceView)) {
                return;
            }
        }
        else {
            this.#showEditor();
        }
        await this.#sourcesView.showSourceLocation(uiSourceCode, location, omitFocus);
    }
    #showEditor() {
        if (UI.Context.Context.instance().flavor(QuickSourceView)) {
            return;
        }
        void this.setAsCurrentPanel();
    }
    async showUILocation(uiLocation, omitFocus) {
        const { uiSourceCode, lineNumber, columnNumber } = uiLocation;
        await this.showUISourceCode(uiSourceCode, { lineNumber, columnNumber }, omitFocus);
    }
    async revealInNavigator(uiSourceCode, skipReveal) {
        const viewManager = UI.ViewManager.ViewManager.instance();
        for (const view of viewManager.viewsForLocation("navigator-view" /* UI.ViewManager.ViewLocationValues.NAVIGATOR_VIEW */)) {
            const navigatorView = await view.widget();
            if (navigatorView instanceof NavigatorView && navigatorView.acceptProject(uiSourceCode.project())) {
                navigatorView.revealUISourceCode(uiSourceCode, true);
                this.navigatorTabbedLocation.tabbedPane().selectTab(view.viewId(), true);
                if (!skipReveal) {
                    this.#setNavigatorSidebarOpen(true);
                    navigatorView.focus();
                }
                break;
            }
        }
    }
    #addSettingMenuItem(contextMenu, setting, menuText) {
        contextMenu.appendCheckboxItem(menuText, () => setting.set(!setting.get()), { checked: setting.get(), jslogContext: setting.name });
    }
    #populateNavigatorMenu(contextMenu) {
        contextMenu.appendItemsAtLocation('navigatorMenu');
        this.#addSettingMenuItem(contextMenu.viewSection(), Common.Settings.Settings.instance().resolve(Settings.SourcesSettings.navigatorGroupByFolderSettingDescriptor), i18nString(UIStrings.groupByFolder));
        this.#addSettingMenuItem(contextMenu.viewSection(), Common.Settings.Settings.instance().resolve(Settings.SourcesSettings.navigatorGroupByAuthoredSettingDescriptor), i18nString(UIStrings.groupByAuthored));
        this.#addSettingMenuItem(contextMenu.viewSection(), Common.Settings.Settings.instance().resolve(Settings.SourcesSettings.navigatorJustMyCodeSettingDescriptor), i18nString(UIStrings.hideIgnoreListed));
    }
    updateLastModificationTime() {
        this.#lastModificationTime = window.performance.now();
    }
    async #callFrameChanged() {
        const frameFlavor = UI.Context.Context.instance().flavor(StackTrace.StackTrace.DebuggableFrameFlavor);
        const uiLocation = frameFlavor?.frame.toUiLocation(this.workspace);
        if (!uiLocation) {
            return;
        }
        if (window.performance.now() - this.#lastModificationTime < lastModificationTimeout) {
            return;
        }
        await this.#sourcesView.showSourceLocation(uiLocation.uiSourceCode, uiLocation, undefined, true);
    }
    async #updateDebuggerButtonsAndStatus() {
        const currentTarget = UI.Context.Context.instance().flavor(SDK.Target.Target);
        const currentDebuggerModel = currentTarget ? currentTarget.model(SDK.DebuggerModel.DebuggerModel) : null;
        const paused = this.#paused;
        const details = currentDebuggerModel ? currentDebuggerModel.debuggerPausedDetails() : null;
        await this.#debuggerPausedMessage.render(details, Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance(), Breakpoints.BreakpointManager.BreakpointManager.instance());
        await this.#debuggerPausedMessage.updateComplete;
        if (!currentDebuggerModel) {
            this.#togglePauseAction.setEnabled(false);
            this.#stepOverAction.setEnabled(false);
            this.#stepIntoAction.setEnabled(false);
            this.#stepOutAction.setEnabled(false);
            this.#stepAction.setEnabled(false);
        }
        else if (paused) {
            this.#togglePauseAction.setToggled(true);
            this.#togglePauseAction.setEnabled(true);
            this.#stepOverAction.setEnabled(true);
            this.#stepIntoAction.setEnabled(true);
            this.#stepOutAction.setEnabled(true);
            this.#stepAction.setEnabled(true);
        }
        else {
            this.#togglePauseAction.setToggled(false);
            this.#togglePauseAction.setEnabled(!currentDebuggerModel.isPausing());
            this.#stepOverAction.setEnabled(false);
            this.#stepIntoAction.setEnabled(false);
            this.#stepOutAction.setEnabled(false);
            this.#stepAction.setEnabled(false);
        }
        if (details) {
            this.updateDebuggerButtonsAndStatusForTest();
        }
    }
    updateDebuggerButtonsAndStatusForTest() {
    }
    #clearInterface() {
        void this.#updateDebuggerButtonsAndStatus();
        UI.Context.Context.instance().setFlavor(SDK.DebuggerModel.DebuggerPausedDetails, null);
        if (this.#switchToPausedTargetTimeout) {
            clearTimeout(this.#switchToPausedTargetTimeout);
        }
    }
    #switchToPausedTarget(debuggerModel) {
        this.#switchToPausedTargetTimeout = undefined;
        if (this.#paused || debuggerModel.isPaused()) {
            return;
        }
        for (const debuggerModel of SDK.TargetManager.TargetManager.instance().models(SDK.DebuggerModel.DebuggerModel)) {
            if (debuggerModel.isPaused()) {
                UI.Context.Context.instance().setFlavor(SDK.Target.Target, debuggerModel.target());
                break;
            }
        }
    }
    runSnippet() {
        const uiSourceCode = this.#sourcesView.currentUISourceCode();
        if (uiSourceCode) {
            void Snippets.ScriptSnippetFileSystem.evaluateScriptSnippet(uiSourceCode);
        }
    }
    #editorSelected(event) {
        const uiSourceCode = event.data;
        UI.Context.Context.instance().setFlavor(Workspace.UISourceCode.UISourceCode, uiSourceCode);
        if (!this.#showSourcesViewInWrapper &&
            Common.Settings.Settings.instance()
                .resolve(Settings.SourcesSettings.autoRevealInNavigatorSettingDescriptor)
                .get()) {
            void this.revealInNavigator(uiSourceCode, true);
        }
    }
    #editorClosed({ data: { uiSourceCode } }) {
        const context = UI.Context.Context.instance();
        if (context.flavor(Workspace.UISourceCode.UISourceCode) === uiSourceCode) {
            context.setFlavor(Workspace.UISourceCode.UISourceCode, null);
        }
    }
    handleBeforeUnload = (event) => {
        if (event.returnValue) {
            return;
        }
        const unsavedSourceCodes = Workspace.Workspace.WorkspaceImpl.instance()
            .uiSourceCodesForProjectType(Workspace.Workspace.projectTypes.FileSystem)
            .filter(uiSourceCode => uiSourceCode.isDirty());
        if (!unsavedSourceCodes.length) {
            return;
        }
        event.returnValue = true;
        void UI.ViewManager.ViewManager.instance().showView('sources');
        for (const sourceCode of unsavedSourceCodes) {
            void Common.Revealer.reveal(sourceCode);
        }
    };
    togglePause() {
        const target = UI.Context.Context.instance().flavor(SDK.Target.Target);
        if (!target) {
            return true;
        }
        const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
        if (!debuggerModel) {
            return true;
        }
        if (this.#paused) {
            this.#paused = false;
            debuggerModel.resume();
        }
        else {
            // Make sure pauses didn't stick skipped.
            debuggerModel.pause();
        }
        this.#clearInterface();
        return true;
    }
    #prepareToResume() {
        if (!this.#paused) {
            return null;
        }
        this.#paused = false;
        this.#clearInterface();
        const target = UI.Context.Context.instance().flavor(SDK.Target.Target);
        return target ? target.model(SDK.DebuggerModel.DebuggerModel) : null;
    }
    #longResume() {
        const debuggerModel = this.#prepareToResume();
        if (debuggerModel) {
            debuggerModel.skipAllPausesUntilReloadOrTimeout(500);
            debuggerModel.resume();
        }
    }
    #terminateExecution() {
        const debuggerModel = this.#prepareToResume();
        if (debuggerModel) {
            void debuggerModel.runtimeModel().terminateExecution();
            debuggerModel.resume();
        }
    }
    stepOver() {
        const debuggerModel = this.#prepareToResume();
        if (debuggerModel) {
            void debuggerModel.stepOver();
        }
        return true;
    }
    stepInto() {
        const debuggerModel = this.#prepareToResume();
        if (debuggerModel) {
            void debuggerModel.stepInto();
        }
        return true;
    }
    stepIntoAsync() {
        const debuggerModel = this.#prepareToResume();
        if (debuggerModel) {
            debuggerModel.scheduleStepIntoAsync();
        }
        return true;
    }
    stepOut() {
        const debuggerModel = this.#prepareToResume();
        if (debuggerModel) {
            void debuggerModel.stepOut();
        }
        return true;
    }
    async #continueToLocation(uiLocation) {
        const executionContext = UI.Context.Context.instance().flavor(SDK.RuntimeModel.ExecutionContext);
        if (!executionContext) {
            return;
        }
        // Always use 0 column.
        const rawLocations = await Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().uiLocationToRawLocations(uiLocation.uiSourceCode, uiLocation.lineNumber, 0);
        const rawLocation = rawLocations.find(location => location.debuggerModel === executionContext.debuggerModel);
        if (rawLocation && this.#prepareToResume()) {
            rawLocation.continueToLocation();
        }
    }
    toggleBreakpointsActive() {
        const setting = Common.Settings.Settings.instance().resolve(SDK.SDKSettings.breakpointsActiveSettingDescriptor);
        setting.set(!setting.get());
    }
    #breakpointsActiveStateChanged() {
        const active = Common.Settings.Settings.instance().resolve(SDK.SDKSettings.breakpointsActiveSettingDescriptor).get();
        this.#toggleBreakpointsActiveAction.setToggled(!active);
        this.#sourcesView.toggleBreakpointsActiveState(active);
    }
    appendApplicableItems(event, contextMenu, target) {
        if (target instanceof Workspace.UISourceCode.UISourceCode) {
            this.#appendUISourceCodeItems(event, contextMenu, target);
            return;
        }
        if (target instanceof UISourceCodeFrame) {
            this.#appendUISourceCodeFrameItems(contextMenu, target);
            return;
        }
        if (target instanceof Workspace.UISourceCode.UILocation) {
            this.appendUILocationItems(contextMenu, target);
            return;
        }
        if (target instanceof SDK.RemoteObject.RemoteObject) {
            this.#appendRemoteObjectItems(contextMenu, target);
            return;
        }
        this.#appendNetworkRequestItems(contextMenu, target);
    }
    #appendUISourceCodeItems(event, contextMenu, uiSourceCode) {
        if (!event.target) {
            return;
        }
        const eventTarget = event.target;
        if (!uiSourceCode.project().isServiceProject() &&
            !eventTarget.isSelfOrDescendant(this.navigatorTabbedLocation.widget().element) &&
            !(Common.Settings.Settings.instance()
                .resolve(Settings.SourcesSettings.navigatorJustMyCodeSettingDescriptor)
                .get() &&
                Workspace.IgnoreListManager.IgnoreListManager.instance().isUserOrSourceMapIgnoreListedUISourceCode(uiSourceCode))) {
            contextMenu.revealSection().appendItem(i18nString(UIStrings.revealInSidebar), this.revealInNavigator.bind(this, uiSourceCode), {
                jslogContext: 'sources.reveal-in-navigator-sidebar',
            });
        }
        const openAiAssistanceId = 'drjones.sources-panel-context';
        if (UI.ActionRegistry.ActionRegistry.instance().hasAction(openAiAssistanceId)) {
            const editorElement = this.element.querySelector('devtools-text-editor');
            if (!eventTarget.isSelfOrDescendant(editorElement) && uiSourceCode.contentType().isTextType()) {
                UI.Context.Context.instance().setFlavor(Workspace.UISourceCode.UISourceCode, uiSourceCode);
                const action = UI.ActionRegistry.ActionRegistry.instance().getAction(openAiAssistanceId);
                const submenu = contextMenu.footerSection().appendSubMenuItem(action.title(), false, openAiAssistanceId);
                submenu.defaultSection().appendAction('drjones.sources-panel-context', i18nString(UIStrings.startAChat));
                appendSubmenuPromptAction(submenu, action, i18nString(UIStrings.assessPerformance), 'Is this script optimized for performance?', openAiAssistanceId + '.performance');
                appendSubmenuPromptAction(submenu, action, i18nString(UIStrings.explainThisScript), 'What does this script do?', openAiAssistanceId + '.script');
                appendSubmenuPromptAction(submenu, action, i18nString(UIStrings.explainInputHandling), 'Does the script handle user input safely', openAiAssistanceId + '.input');
            }
        }
        // Ignore list only works for JavaScript debugging.
        if (uiSourceCode.contentType().hasScripts() &&
            Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance()
                .scriptsForUISourceCode(uiSourceCode)
                .every(script => script.isJavaScript())) {
            this.#callstackPane.appendIgnoreListURLContextMenuItems(contextMenu, uiSourceCode);
        }
        function appendSubmenuPromptAction(submenu, action, label, prompt, jslogContext) {
            submenu.defaultSection().appendItem(label, () => action.execute({ prompt }), { disabled: !action.enabled(), jslogContext });
        }
    }
    #appendUISourceCodeFrameItems(contextMenu, target) {
        if (target.uiSourceCode().contentType().isFromSourceMap() || target.textEditor.state.selection.main.empty) {
            return;
        }
        contextMenu.debugSection().appendAction('debugger.evaluate-selection');
    }
    appendUILocationItems(contextMenu, uiLocation) {
        const uiSourceCode = uiLocation.uiSourceCode;
        if (!Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance()
            .scriptsForUISourceCode(uiSourceCode)
            .every(script => script.isJavaScript())) {
            // Ignore List and 'Continue to here' currently only works for JavaScript debugging.
            return;
        }
        const contentType = uiSourceCode.contentType();
        if (contentType.hasScripts()) {
            const target = UI.Context.Context.instance().flavor(SDK.Target.Target);
            const debuggerModel = target ? target.model(SDK.DebuggerModel.DebuggerModel) : null;
            if (debuggerModel?.isPaused()) {
                contextMenu.debugSection().appendItem(i18nString(UIStrings.continueToHere), this.#continueToLocation.bind(this, uiLocation), { jslogContext: 'continue-to-here' });
            }
            this.#callstackPane.appendIgnoreListURLContextMenuItems(contextMenu, uiSourceCode);
        }
    }
    #appendRemoteObjectItems(contextMenu, remoteObject) {
        const indent = Common.Settings.Settings.instance().resolve(SDK.SDKSettings.textEditorIndentSettingDescriptor).get();
        const executionContext = UI.Context.Context.instance().flavor(SDK.RuntimeModel.ExecutionContext);
        function getObjectTitle() {
            if (remoteObject.type === 'wasm') {
                return remoteObject.subtype;
            }
            if (remoteObject.subtype === 'node') {
                return 'outerHTML';
            }
            return remoteObject.type;
        }
        const copyContextMenuTitle = getObjectTitle();
        contextMenu.debugSection().appendItem(i18nString(UIStrings.storeAsGlobalVariable), () => executionContext?.target()
            .model(SDK.ConsoleModel.ConsoleModel)
            ?.saveToTempVariable(executionContext, remoteObject), { jslogContext: 'store-as-global-variable' });
        const ctxMenuClipboardSection = contextMenu.clipboardSection();
        const inspectorFrontendHost = Host.InspectorFrontendHost.InspectorFrontendHostInstance;
        if (remoteObject.type === 'string') {
            ctxMenuClipboardSection.appendItem(i18nString(UIStrings.copyStringContents), () => {
                inspectorFrontendHost.copyText(remoteObject.value);
            }, { jslogContext: 'copy-string-contents' });
            ctxMenuClipboardSection.appendItem(i18nString(UIStrings.copyStringAsJSLiteral), () => {
                inspectorFrontendHost.copyText(Platform.StringUtilities.formatAsJSLiteral(remoteObject.value));
            }, { jslogContext: 'copy-string-as-js-literal' });
            ctxMenuClipboardSection.appendItem(i18nString(UIStrings.copyStringAsJSONLiteral), () => {
                inspectorFrontendHost.copyText(JSON.stringify(remoteObject.value));
            }, { jslogContext: 'copy-string-as-json-literal' });
        }
        // We are trying to copy a primitive value.
        else if (primitiveRemoteObjectTypes.has(remoteObject.type)) {
            ctxMenuClipboardSection.appendItem(i18nString(UIStrings.copyS, { PH1: String(copyContextMenuTitle) }), () => {
                inspectorFrontendHost.copyText(remoteObject.description);
            }, { jslogContext: 'copy-primitive' });
        }
        // We are trying to copy a remote object.
        else if (remoteObject.type === 'object') {
            const copyDecodedValueHandler = async () => {
                const result = await remoteObject.callFunctionJSON(toStringForClipboard, [{
                        value: {
                            subtype: remoteObject.subtype,
                            indent,
                        },
                    }]);
                inspectorFrontendHost.copyText(result);
            };
            ctxMenuClipboardSection.appendItem(i18nString(UIStrings.copyS, { PH1: String(copyContextMenuTitle) }), copyDecodedValueHandler, { jslogContext: 'copy-object' });
        }
        else if (remoteObject.type === 'function') {
            contextMenu.debugSection().appendItem(i18nString(UIStrings.showFunctionDefinition), this.showFunctionDefinition.bind(this, remoteObject), { jslogContext: 'show-function-definition' });
        }
        function toStringForClipboard(data) {
            const subtype = data.subtype;
            const indent = data.indent;
            if (subtype === 'map') {
                if (this instanceof Map) {
                    const elements = Array.from(this.entries());
                    const literal = elements.length === 0 ? '' : JSON.stringify(elements, null, indent);
                    return `new Map(${literal})`;
                }
                return undefined;
            }
            if (subtype === 'set') {
                if (this instanceof Set) {
                    const values = Array.from(this.values());
                    const literal = values.length === 0 ? '' : JSON.stringify(values, null, indent);
                    return `new Set(${literal})`;
                }
                return undefined;
            }
            if (subtype === 'node') {
                return this instanceof Element ? this.outerHTML : undefined;
            }
            if (subtype && typeof this === 'undefined') {
                return String(subtype);
            }
            try {
                return JSON.stringify(this, null, indent);
            }
            catch {
                return String(this);
            }
        }
    }
    #appendNetworkRequestItems(contextMenu, request) {
        const uiSourceCode = this.workspace.uiSourceCodeForURL(request.url());
        if (!uiSourceCode) {
            return;
        }
        const openText = i18nString(UIStrings.openInSourcesPanel);
        const callback = this.showUILocation.bind(this, uiSourceCode.uiLocation(0, 0));
        contextMenu.revealSection().appendItem(openText, callback, { jslogContext: 'reveal-in-sources' });
    }
    showFunctionDefinition(remoteObject) {
        void SDK.RemoteObject.RemoteFunction.objectAsFunction(remoteObject)
            .targetFunction()
            .then(targetFunction => targetFunction.debuggerModel()
            .functionDetailsPromise(targetFunction)
            .then(this.#didGetFunctionDetails.bind(this)));
    }
    async #didGetFunctionDetails(response) {
        if (!response?.location) {
            return;
        }
        const uiLocation = await Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().rawLocationToUILocation(response.location);
        if (uiLocation) {
            await this.showUILocation(uiLocation);
        }
    }
    #revealNavigatorSidebar() {
        void this.setAsCurrentPanel();
        this.#setNavigatorSidebarOpen(true);
    }
    #revealDebuggerSidebar() {
        if (!Common.Settings.Settings.instance()
            .resolve(Settings.SourcesSettings.autoFocusOnDebuggerPausedEnabledSettingDescriptor)
            .get()) {
            return;
        }
        void this.setAsCurrentPanel();
        this.#setDebuggerSidebarOpen(true);
    }
    #updateSidebarPosition(force = false) {
        let vertically;
        const position = Common.Settings.Settings.instance().resolve(Settings.MainSettings.sidebarPositionSettingDescriptor).get();
        if (position === 'right') {
            vertically = false;
        }
        else if (position === 'bottom') {
            vertically = true;
        }
        else {
            vertically = this.element.offsetWidth < 680;
        }
        if (!force && vertically === !this.#isVertical) {
            return;
        }
        if (this.sidebarPaneStack?.widget().shouldHideOnDetach() ||
            this.#debuggerSidebarTabbedLocation?.tabbedPane().shouldHideOnDetach()) {
            return;
        } // We can't reparent extension iframes.
        this.#isVertical = !vertically;
        this.#isDebuggerSidebarOpen = isSidebarOpenInSplitSetting('sources-panel-split-view-state', this.#isVertical);
        this.#sourcesView.isDebuggerSidebarOpen = this.#isDebuggerSidebarOpen;
        SourcesPanel.updateResizerAndSidebarButtons(this);
        if (Root.Runtime.Runtime.isTraceApp()) {
            this.performUpdate();
            return;
        }
        this.sidebarPaneStack = UI.ViewManager.ViewManager.instance().createStackLocation(this.#revealDebuggerSidebar.bind(this), undefined, 'debug');
        this.sidebarPaneStack.widget().element.classList.add('y-overflow-only');
        this.sidebarPaneStack.appendApplicableItems('sources.sidebar-top');
        if (this.threadsSidebarPane) {
            this.sidebarPaneStack.appendView(this.threadsSidebarPane);
        }
        const jsBreakpoints = UI.ViewManager.ViewManager.instance().view('sources.js-breakpoints');
        const scopeChainView = UI.ViewManager.ViewManager.instance().view('sources.scope-chain');
        this.#debuggerSidebarTabbedLocation = null;
        if (!vertically) {
            // Populate the rest of the stack.
            this.sidebarPaneStack.appendView(this.watchSidebarPane);
            void this.sidebarPaneStack.showView(jsBreakpoints);
            void this.sidebarPaneStack.showView(scopeChainView);
            void this.sidebarPaneStack.showView(this.#callstackPane);
            this.#extensionSidebarPanesContainer = this.sidebarPaneStack;
        }
        else {
            // Populate the left stack.
            void this.sidebarPaneStack.showView(jsBreakpoints);
            void this.sidebarPaneStack.showView(this.#callstackPane);
            const tabbedLocation = UI.ViewManager.ViewManager.instance().createTabbedLocation(this.#revealDebuggerSidebar.bind(this), 'sources-panel-debugger-sidebar');
            tabbedLocation.appendView(scopeChainView);
            tabbedLocation.appendView(this.watchSidebarPane);
            tabbedLocation.appendApplicableItems('sources.sidebar-tabs');
            this.#extensionSidebarPanesContainer = tabbedLocation;
            this.#debuggerSidebarTabbedLocation = tabbedLocation;
        }
        this.sidebarPaneStack.appendApplicableItems('sources.sidebar-bottom');
        const extensionSidebarPanes = PanelCommon.ExtensionServer.ExtensionServer.instance().sidebarPanes();
        for (let i = 0; i < extensionSidebarPanes.length; ++i) {
            this.#addExtensionSidebarPane(extensionSidebarPanes[i]);
        }
        this.performUpdate();
    }
    setAsCurrentPanel() {
        return UI.ViewManager.ViewManager.instance().showView('sources');
    }
    #extensionSidebarPaneAdded(event) {
        this.#addExtensionSidebarPane(event.data);
    }
    #addExtensionSidebarPane(pane) {
        if (pane.panelName() === this.name) {
            this.#extensionSidebarPanesContainer.appendView(pane);
        }
    }
    sourcesView() {
        return this.#sourcesView;
    }
    #handleDrop(dataTransfer) {
        const items = dataTransfer.items;
        if (!items.length) {
            return;
        }
        const entry = items[0].webkitGetAsEntry();
        if (entry?.isDirectory) {
            Host.InspectorFrontendHost.InspectorFrontendHostInstance.upgradeDraggedFileSystemPermissions(entry.filesystem);
            Host.userMetrics.actionTaken(Host.UserMetrics.Action.WorkspaceDropFolder);
            void UI.ViewManager.ViewManager.instance().showView('navigator-files');
        }
    }
}
export const lastModificationTimeout = 200;
export const minToolbarWidth = 215;
export class UILocationRevealer {
    async reveal(uiLocation, omitFocus) {
        await SourcesPanel.instance().showUILocation(uiLocation, omitFocus);
    }
}
export class UILocationRangeRevealer {
    static #instance;
    static instance(opts = { forceNew: false }) {
        if (!UILocationRangeRevealer.#instance || opts.forceNew) {
            UILocationRangeRevealer.#instance = new UILocationRangeRevealer();
        }
        return UILocationRangeRevealer.#instance;
    }
    async reveal(uiLocationRange, omitFocus) {
        const { uiSourceCode, range: { start: from, end: to } } = uiLocationRange;
        await SourcesPanel.instance().showUISourceCode(uiSourceCode, { from, to }, omitFocus);
    }
}
export class DebuggerLocationRevealer {
    async reveal(rawLocation, omitFocus) {
        const uiLocation = await Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().rawLocationToUILocation(rawLocation);
        if (uiLocation) {
            await SourcesPanel.instance().showUILocation(uiLocation, omitFocus);
        }
    }
}
export class UISourceCodeRevealer {
    async reveal(uiSourceCode, omitFocus) {
        await SourcesPanel.instance().showUISourceCode(uiSourceCode, undefined, omitFocus);
    }
}
export class DebuggerPausedDetailsRevealer {
    async reveal(_object) {
        if (Common.Settings.Settings.instance()
            .resolve(Settings.SourcesSettings.autoFocusOnDebuggerPausedEnabledSettingDescriptor)
            .get()) {
            return await SourcesPanel.instance().setAsCurrentPanel();
        }
    }
}
export class RevealingActionDelegate {
    handleAction(context, actionId) {
        const panel = SourcesPanel.instance();
        if (!panel.ensureSourcesViewVisible()) {
            return false;
        }
        switch (actionId) {
            case 'debugger.toggle-pause': {
                // This action can be triggered both on the DevTools front-end itself,
                // or on the inspected target. If triggered on the DevTools front-end,
                // it will take care of resuming.
                //
                // If triggered on the target, NOT in hosted mode:
                //   * ..and the paused overlay is enabled:
                //       => do not take any action here, as the paused overlay will resume
                //   * ..and the paused overlay is disabled:
                //       => take care of the resume here
                // If triggered on the target in hosted mode:
                //   * ..and the paused overlay is enabled:
                //       => execution will not reach here, as shortcuts are not forwarded
                //          and the paused overlay will resume
                //   * ..and the paused overlay is disabled:
                //       => overlay will not take care of resume, and neither will
                //          DevTools as no shortcuts are forwarded from the target
                // Do not trigger a resume action, if: the shortcut was forwarded and the
                // paused overlay is enabled.
                const actionHandledInPausedOverlay = context.flavor(UI.ShortcutRegistry.ForwardedShortcut) &&
                    !Common.Settings.Settings.instance()
                        .resolve(SDK.SDKSettings.disablePausedStateOverlaySettingDescriptor)
                        .get();
                if (actionHandledInPausedOverlay) {
                    // Taken care of by inspector overlay: handled set to true to
                    // register user metric.
                    return true;
                }
                panel.togglePause();
                return true;
            }
        }
        return false;
    }
}
export class ActionDelegate {
    handleAction(context, actionId) {
        const panel = SourcesPanel.instance();
        switch (actionId) {
            case 'debugger.step-over': {
                panel.stepOver();
                return true;
            }
            case 'debugger.step-into': {
                panel.stepIntoAsync();
                return true;
            }
            case 'debugger.step': {
                panel.stepInto();
                return true;
            }
            case 'debugger.step-out': {
                panel.stepOut();
                return true;
            }
            case 'debugger.run-snippet': {
                panel.runSnippet();
                return true;
            }
            case 'debugger.toggle-breakpoints-active': {
                panel.toggleBreakpointsActive();
                return true;
            }
            case 'debugger.evaluate-selection': {
                const frame = context.flavor(UISourceCodeFrame);
                if (frame) {
                    const { state: editorState } = frame.textEditor;
                    let text = editorState.sliceDoc(editorState.selection.main.from, editorState.selection.main.to);
                    const executionContext = context.flavor(SDK.RuntimeModel.ExecutionContext);
                    const consoleModel = executionContext?.target().model(SDK.ConsoleModel.ConsoleModel);
                    if (executionContext && consoleModel) {
                        const message = consoleModel.addCommandMessage(executionContext, text);
                        text = ObjectUI.JavaScriptREPL.JavaScriptREPL.wrapObjectLiteral(text);
                        void consoleModel.evaluateCommandInConsole(executionContext, message, text, /* useCommandLineAPI */ true);
                    }
                }
                return true;
            }
            case 'sources.reveal-in-navigator-sidebar': {
                const uiSourceCode = panel.sourcesView().currentUISourceCode();
                if (uiSourceCode === null) {
                    return false;
                }
                void panel.revealInNavigator(uiSourceCode);
                return true;
            }
            case 'sources.toggle-navigator-sidebar': {
                panel.toggleNavigatorSidebar();
                return true;
            }
            case 'sources.toggle-debugger-sidebar': {
                panel.toggleDebuggerSidebar();
                return true;
            }
            case 'sources.toggle-word-wrap': {
                const setting = Common.Settings.Settings.instance().resolve(Settings.SourcesSettings.sourcesWordWrapSettingDescriptor);
                setting.set(!setting.get());
                return true;
            }
        }
        return false;
    }
}
export const QUICK_SOURCE_DEFAULT_VIEW = (input, _output, target) => {
    // clang-format off
    render(html `
    <div class="sources-view-wrapper vbox flex-auto">
      ${input.sourcesView ? widget(UI.Widget.WrapperWidget, { widget: input.sourcesView }) : nothing}
    </div>
  `, target);
    // clang-format on
};
export class QuickSourceView extends UI.Widget.VBox {
    #sourcesView;
    #view;
    #showInWrapper = false;
    constructor(view = QUICK_SOURCE_DEFAULT_VIEW) {
        super({ jslog: `${VisualLogging.panel('sources.quick').track({ resize: true })}` });
        this.#view = view;
        this.#sourcesView = SourcesPanel.instance().sourcesView();
        this.performUpdate();
    }
    performUpdate() {
        this.#view({ sourcesView: this.#showInWrapper ? this.#sourcesView : null }, undefined, this.contentElement);
    }
    wasShown() {
        UI.Context.Context.instance().setFlavor(QuickSourceView, this);
        super.wasShown();
        if (!SourcesPanel.instance().isShowing()) {
            this.showViewInWrapper();
        }
        else {
            UI.InspectorView.InspectorView.instance().setDrawerMinimized(true);
        }
        SourcesPanel.updateResizerAndSidebarButtons(SourcesPanel.instance());
    }
    willHide() {
        UI.InspectorView.InspectorView.instance().setDrawerMinimized(false);
        queueMicrotask(() => {
            SourcesPanel.updateResizerAndSidebarButtons(SourcesPanel.instance());
        });
        super.willHide();
        UI.Context.Context.instance().setFlavor(QuickSourceView, null);
    }
    showViewInWrapper() {
        SourcesPanel.setShowSourcesViewInWrapper(SourcesPanel.instance(), true);
        this.#showInWrapper = true;
        this.performUpdate();
    }
    hideViewInWrapper() {
        this.#showInWrapper = false;
        this.performUpdate();
        SourcesPanel.setShowSourcesViewInWrapper(SourcesPanel.instance(), false);
    }
}
//# sourceMappingURL=SourcesPanel.js.map