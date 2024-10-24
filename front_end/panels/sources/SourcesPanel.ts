// Copyright 2021 The Chromium Authors. All rights reserved.
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

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as Breakpoints from '../../models/breakpoints/breakpoints.js';
import * as Extensions from '../../models/extensions/extensions.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as IconButton from '../../ui/components/icon_button/icon_button.js';
import * as ObjectUI from '../../ui/legacy/components/object_ui/object_ui.js';
import type * as SourceFrame from '../../ui/legacy/components/source_frame/source_frame.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import * as Snippets from '../snippets/snippets.js';

import {CallStackSidebarPane} from './CallStackSidebarPane.js';
import {DebuggerPausedMessage} from './DebuggerPausedMessage.js';
import {NavigatorView} from './NavigatorView.js';
import sourcesPanelStyles from './sourcesPanel.css.js';
import {Events, SourcesView} from './SourcesView.js';
import {ThreadsSidebarPane} from './ThreadsSidebarPane.js';
import {UISourceCodeFrame} from './UISourceCodeFrame.js';

const UIStrings = {
  /**
   *@description Text that appears when user drag and drop something (for example, a file) in Sources Panel of the Sources panel
   */
  dropWorkspaceFolderHere: 'Drop workspace folder here',
  /**
   *@description Text to show more options
   */
  moreOptions: 'More options',
  /**
   * @description Tooltip for the the navigator toggle in the Sources panel. Command to open/show the
   * sidebar containing the navigator tool.
   */
  showNavigator: 'Show navigator',
  /**
   * @description Tooltip for the the navigator toggle in the Sources panel. Command to close/hide
   * the sidebar containing the navigator tool.
   */
  hideNavigator: 'Hide navigator',
  /**
   * @description Screen reader announcement when the navigator sidebar is shown in the Sources panel.
   */
  navigatorShown: 'Navigator sidebar shown',
  /**
   * @description Screen reader announcement when the navigator sidebar is hidden in the Sources panel.
   */
  navigatorHidden: 'Navigator sidebar hidden',
  /**
   * @description Screen reader announcement when the navigator sidebar is shown in the Sources panel.
   */
  debuggerShown: 'Debugger sidebar shown',
  /**
   * @description Screen reader announcement when the navigator sidebar is hidden in the Sources panel.
   */
  debuggerHidden: 'Debugger sidebar hidden',
  /**
   * @description Tooltip for the the debugger toggle in the Sources panel. Command to open/show the
   * sidebar containing the debugger tool.
   */
  showDebugger: 'Show debugger',
  /**
   * @description Tooltip for the the debugger toggle in the Sources panel. Command to close/hide the
   * sidebar containing the debugger tool.
   */
  hideDebugger: 'Hide debugger',
  /**
   *@description Text in Sources Panel of the Sources panel
   */
  groupByFolder: 'Group by folder',
  /**
   *@description Text in Sources Panel of the Sources panel
   */
  groupByAuthored: 'Group by Authored/Deployed',
  /**
   *@description Text in Sources Panel of the Sources panel
   */
  hideIgnoreListed: 'Hide ignore-listed sources',
  /**
   *@description Tooltip text that appears when hovering over the largeicon play button in the Sources Panel of the Sources panel
   */
  resumeWithAllPausesBlockedForMs: 'Resume with all pauses blocked for 500 ms',
  /**
   *@description Tooltip text that appears when hovering over the largeicon terminate execution button in the Sources Panel of the Sources panel
   */
  terminateCurrentJavascriptCall: 'Terminate current JavaScript call',
  /**
   *@description Text in Sources Panel of the Sources panel
   */
  pauseOnCaughtExceptions: 'Pause on caught exceptions',
  /**
   *@description A context menu item in the Sources Panel of the Sources panel
   */
  revealInSidebar: 'Reveal in navigator sidebar',
  /**
   *@description A context menu item in the Sources Panel of the Sources panel when debugging JS code.
   * When clicked, the execution is resumed until it reaches the line specified by the right-click that
   * opened the context menu.
   */
  continueToHere: 'Continue to here',
  /**
   *@description A context menu item in the Console that stores selection as a temporary global variable
   */
  storeAsGlobalVariable: 'Store as global variable',
  /**
   *@description A context menu item in the Console, Sources, and Network panel
   *@example {string} PH1
   */
  copyS: 'Copy {PH1}',
  /**
   *@description A context menu item for strings in the Console, Sources, and Network panel.
   * When clicked, the raw contents of the string is copied to the clipboard.
   */
  copyStringContents: 'Copy string contents',
  /**
   *@description A context menu item for strings in the Console, Sources, and Network panel.
   * When clicked, the string is copied to the clipboard as a valid JavaScript literal.
   */
  copyStringAsJSLiteral: 'Copy string as JavaScript literal',
  /**
   *@description A context menu item for strings in the Console, Sources, and Network panel.
   * When clicked, the string is copied to the clipboard as a valid JSON literal.
   */
  copyStringAsJSONLiteral: 'Copy string as JSON literal',
  /**
   *@description A context menu item in the Sources Panel of the Sources panel
   */
  showFunctionDefinition: 'Show function definition',
  /**
   *@description Text in Sources Panel of the Sources panel
   */
  openInSourcesPanel: 'Open in Sources panel',
};
const str_ = i18n.i18n.registerUIStrings('panels/sources/SourcesPanel.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const primitiveRemoteObjectTypes = new Set(['number', 'boolean', 'bigint', 'undefined']);
let sourcesPanelInstance: SourcesPanel;

export class SourcesPanel extends UI.Panel.Panel implements
    UI.ContextMenu.Provider<Workspace.UISourceCode.UISourceCode|Workspace.UISourceCode.UILocation|
                            SDK.RemoteObject.RemoteObject|SDK.NetworkRequest.NetworkRequest|UISourceCodeFrame>,
    SDK.TargetManager.Observer, UI.View.ViewLocationResolver {
  private readonly workspace: Workspace.Workspace.WorkspaceImpl;
  private readonly togglePauseAction: UI.ActionRegistration.Action;
  private readonly stepOverAction: UI.ActionRegistration.Action;
  private readonly stepIntoAction: UI.ActionRegistration.Action;
  private readonly stepOutAction: UI.ActionRegistration.Action;
  private readonly stepAction: UI.ActionRegistration.Action;
  private readonly toggleBreakpointsActiveAction: UI.ActionRegistration.Action;
  private readonly debugToolbar: UI.Toolbar.Toolbar;
  private readonly debugToolbarDrawer: HTMLDivElement;
  private readonly debuggerPausedMessage: DebuggerPausedMessage;
  private overlayLoggables?: {debuggerPausedMessage: {}, resumeButton: {}, stepOverButton: {}};
  private splitWidget: UI.SplitWidget.SplitWidget;
  editorView: UI.SplitWidget.SplitWidget;
  private navigatorTabbedLocation: UI.View.TabbedViewLocation;
  sourcesViewInternal: SourcesView;
  private readonly toggleNavigatorSidebarButton: UI.Toolbar.ToolbarButton;
  private readonly toggleDebuggerSidebarButton: UI.Toolbar.ToolbarButton;
  private threadsSidebarPane: UI.View.View|null;
  private readonly watchSidebarPane: UI.View.View;
  private readonly callstackPane: CallStackSidebarPane;
  private liveLocationPool: Bindings.LiveLocation.LiveLocationPool;
  private lastModificationTime: number;
  private pausedInternal?: boolean;
  private switchToPausedTargetTimeout?: number;
  private ignoreExecutionLineEvents?: boolean;
  private executionLineLocation?: Bindings.DebuggerWorkspaceBinding.Location|null;
  private pauseOnExceptionButton?: UI.Toolbar.ToolbarToggle;
  private sidebarPaneStack?: UI.View.ViewLocation;
  private tabbedLocationHeader?: Element|null;
  private extensionSidebarPanesContainer?: UI.View.ViewLocation;
  sidebarPaneView?: UI.Widget.VBox|UI.SplitWidget.SplitWidget;

  #lastPausedTarget: WeakRef<SDK.Target.Target>|null = null;

  constructor() {
    super('sources');

    new UI.DropTarget.DropTarget(
        this.element, [UI.DropTarget.Type.Folder], i18nString(UIStrings.dropWorkspaceFolderHere),
        this.handleDrop.bind(this));

    this.workspace = Workspace.Workspace.WorkspaceImpl.instance();
    this.togglePauseAction = UI.ActionRegistry.ActionRegistry.instance().getAction('debugger.toggle-pause');
    this.stepOverAction = UI.ActionRegistry.ActionRegistry.instance().getAction('debugger.step-over');
    this.stepIntoAction = UI.ActionRegistry.ActionRegistry.instance().getAction('debugger.step-into');
    this.stepOutAction = UI.ActionRegistry.ActionRegistry.instance().getAction('debugger.step-out');
    this.stepAction = UI.ActionRegistry.ActionRegistry.instance().getAction('debugger.step');
    this.toggleBreakpointsActiveAction =
        UI.ActionRegistry.ActionRegistry.instance().getAction('debugger.toggle-breakpoints-active');

    this.debugToolbar = this.createDebugToolbar();
    this.debugToolbarDrawer = this.createDebugToolbarDrawer();
    this.debuggerPausedMessage = new DebuggerPausedMessage();

    const initialDebugSidebarWidth = 225;
    this.splitWidget =
        new UI.SplitWidget.SplitWidget(true, true, 'sources-panel-split-view-state', initialDebugSidebarWidth);
    this.splitWidget.enableShowModeSaving();
    this.splitWidget.show(this.element);

    // Create scripts navigator
    const initialNavigatorWidth = 225;
    this.editorView =
        new UI.SplitWidget.SplitWidget(true, false, 'sources-panel-navigator-split-view-state', initialNavigatorWidth);
    this.editorView.enableShowModeSaving();
    this.splitWidget.setMainWidget(this.editorView);

    // Create navigator tabbed pane with toolbar.
    this.navigatorTabbedLocation = UI.ViewManager.ViewManager.instance().createTabbedLocation(
        this.revealNavigatorSidebar.bind(this), 'navigator-view', true, true);
    const tabbedPane = this.navigatorTabbedLocation.tabbedPane();
    tabbedPane.setMinimumSize(100, 25);
    tabbedPane.element.classList.add('navigator-tabbed-pane');
    tabbedPane.headerElement().setAttribute(
        'jslog',
        `${VisualLogging.toolbar('navigator').track({keydown: 'ArrowUp|ArrowLeft|ArrowDown|ArrowRight|Enter|Space'})}`);
    const navigatorMenuButton = new UI.Toolbar.ToolbarMenuButton(
        this.populateNavigatorMenu.bind(this), /* isIconDropdown */ true, /* useSoftMenu */ true, 'more-options',
        'dots-vertical');
    navigatorMenuButton.setTitle(i18nString(UIStrings.moreOptions));
    tabbedPane.rightToolbar().appendToolbarItem(navigatorMenuButton);

    if (UI.ViewManager.ViewManager.instance().hasViewsForLocation('run-view-sidebar')) {
      const navigatorSplitWidget =
          new UI.SplitWidget.SplitWidget(false, true, 'source-panel-navigator-sidebar-split-view-state');
      navigatorSplitWidget.setMainWidget(tabbedPane);
      const runViewTabbedPane = UI.ViewManager.ViewManager.instance()
                                    .createTabbedLocation(this.revealNavigatorSidebar.bind(this), 'run-view-sidebar')
                                    .tabbedPane();
      navigatorSplitWidget.setSidebarWidget(runViewTabbedPane);
      navigatorSplitWidget.installResizer(runViewTabbedPane.headerElement());
      this.editorView.setSidebarWidget(navigatorSplitWidget);
    } else {
      this.editorView.setSidebarWidget(tabbedPane);
    }

    this.sourcesViewInternal = new SourcesView();
    this.sourcesViewInternal.addEventListener(Events.EDITOR_SELECTED, this.editorSelected.bind(this));

    this.toggleNavigatorSidebarButton = this.editorView.createShowHideSidebarButton(
        i18nString(UIStrings.showNavigator), i18nString(UIStrings.hideNavigator), i18nString(UIStrings.navigatorShown),
        i18nString(UIStrings.navigatorHidden), 'navigator');
    this.toggleDebuggerSidebarButton = this.splitWidget.createShowHideSidebarButton(
        i18nString(UIStrings.showDebugger), i18nString(UIStrings.hideDebugger), i18nString(UIStrings.debuggerShown),
        i18nString(UIStrings.debuggerHidden), 'debugger');
    this.editorView.setMainWidget(this.sourcesViewInternal);

    this.threadsSidebarPane = null;
    this.watchSidebarPane = UI.ViewManager.ViewManager.instance().view('sources.watch');
    this.callstackPane = CallStackSidebarPane.instance();

    Common.Settings.Settings.instance()
        .moduleSetting('sidebar-position')
        .addChangeListener(this.updateSidebarPosition.bind(this));
    this.updateSidebarPosition();

    void this.updateDebuggerButtonsAndStatus();

    this.liveLocationPool = new Bindings.LiveLocation.LiveLocationPool();

    this.setTarget(UI.Context.Context.instance().flavor(SDK.Target.Target));
    Common.Settings.Settings.instance()
        .moduleSetting('breakpoints-active')
        .addChangeListener(this.breakpointsActiveStateChanged, this);
    UI.Context.Context.instance().addFlavorChangeListener(SDK.Target.Target, this.onCurrentTargetChanged, this);
    UI.Context.Context.instance().addFlavorChangeListener(SDK.DebuggerModel.CallFrame, this.callFrameChanged, this);
    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.DebuggerModel.DebuggerModel, SDK.DebuggerModel.Events.DebuggerWasEnabled, this.debuggerWasEnabled, this);
    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.DebuggerModel.DebuggerModel, SDK.DebuggerModel.Events.DebuggerPaused, this.debuggerPaused, this);
    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.DebuggerModel.DebuggerModel, SDK.DebuggerModel.Events.DebugInfoAttached, this.debugInfoAttached, this);
    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.DebuggerModel.DebuggerModel, SDK.DebuggerModel.Events.DebuggerResumed,
        event => this.debuggerResumed(event.data));
    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.DebuggerModel.DebuggerModel, SDK.DebuggerModel.Events.GlobalObjectCleared,
        event => this.debuggerResumed(event.data));
    Extensions.ExtensionServer.ExtensionServer.instance().addEventListener(
        Extensions.ExtensionServer.Events.SidebarPaneAdded, this.extensionSidebarPaneAdded, this);
    SDK.TargetManager.TargetManager.instance().observeTargets(this);
    this.lastModificationTime = -Infinity;
  }

  static instance(opts: {
    forceNew: boolean|null,
  }|undefined = {forceNew: null}): SourcesPanel {
    const {forceNew} = opts;
    if (!sourcesPanelInstance || forceNew) {
      sourcesPanelInstance = new SourcesPanel();
    }

    return sourcesPanelInstance;
  }

  static updateResizerAndSidebarButtons(panel: SourcesPanel): void {
    panel.sourcesViewInternal.leftToolbar().removeToolbarItems();
    panel.sourcesViewInternal.rightToolbar().removeToolbarItems();
    panel.sourcesViewInternal.bottomToolbar().removeToolbarItems();
    const isInWrapper = UI.Context.Context.instance().flavor(QuickSourceView) &&
        !UI.InspectorView.InspectorView.instance().isDrawerMinimized();
    if (panel.splitWidget.isVertical() || isInWrapper) {
      panel.splitWidget.uninstallResizer(panel.sourcesViewInternal.toolbarContainerElement());
    } else {
      panel.splitWidget.installResizer(panel.sourcesViewInternal.toolbarContainerElement());
    }
    if (!isInWrapper) {
      panel.sourcesViewInternal.leftToolbar().appendToolbarItem(panel.toggleNavigatorSidebarButton);
      if (panel.splitWidget.isVertical()) {
        panel.sourcesViewInternal.rightToolbar().appendToolbarItem(panel.toggleDebuggerSidebarButton);
      } else {
        panel.sourcesViewInternal.bottomToolbar().appendToolbarItem(panel.toggleDebuggerSidebarButton);
      }
    }
  }

  targetAdded(_target: SDK.Target.Target): void {
    this.showThreadsIfNeeded();
  }

  targetRemoved(_target: SDK.Target.Target): void {
  }

  private showThreadsIfNeeded(): void {
    if (ThreadsSidebarPane.shouldBeShown() && !this.threadsSidebarPane) {
      this.threadsSidebarPane = UI.ViewManager.ViewManager.instance().view('sources.threads');
      if (this.sidebarPaneStack && this.threadsSidebarPane) {
        this.sidebarPaneStack.appendView(
            this.threadsSidebarPane, this.splitWidget.isVertical() ? this.watchSidebarPane : this.callstackPane);
      }
    }
  }

  private setTarget(target: SDK.Target.Target|null): void {
    if (!target) {
      return;
    }
    const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
    if (!debuggerModel) {
      return;
    }

    if (debuggerModel.isPaused()) {
      this.showDebuggerPausedDetails(
          (debuggerModel.debuggerPausedDetails() as SDK.DebuggerModel.DebuggerPausedDetails));
    } else {
      this.pausedInternal = false;
      this.clearInterface();
      this.toggleDebuggerSidebarButton.setEnabled(true);
    }
  }

  private onCurrentTargetChanged({data: target}: Common.EventTarget.EventTargetEvent<SDK.Target.Target|null>): void {
    this.setTarget(target);
  }
  paused(): boolean {
    return this.pausedInternal || false;
  }

  override wasShown(): void {
    UI.Context.Context.instance().setFlavor(SourcesPanel, this);
    this.registerCSSFiles([sourcesPanelStyles]);
    super.wasShown();
    if (UI.Context.Context.instance().flavor(QuickSourceView)) {
      UI.InspectorView.InspectorView.instance().setDrawerMinimized(true);
      SourcesPanel.updateResizerAndSidebarButtons(this);
    }
    this.editorView.setMainWidget(this.sourcesViewInternal);
  }

  override willHide(): void {
    super.willHide();
    UI.Context.Context.instance().setFlavor(SourcesPanel, null);
    const wrapperView = UI.Context.Context.instance().flavor(QuickSourceView);
    if (wrapperView) {
      wrapperView.showViewInWrapper();
      UI.InspectorView.InspectorView.instance().setDrawerMinimized(false);
      SourcesPanel.updateResizerAndSidebarButtons(this);
    }
  }

  resolveLocation(locationName: string): UI.View.ViewLocation|null {
    if (locationName === 'sources.sidebar-top' || locationName === 'sources.sidebar-bottom' ||
        locationName === 'sources.sidebar-tabs') {
      return this.sidebarPaneStack || null;
    }
    return this.navigatorTabbedLocation;
  }

  ensureSourcesViewVisible(): boolean {
    if (UI.Context.Context.instance().flavor(QuickSourceView)) {
      return true;
    }
    if (!UI.InspectorView.InspectorView.instance().canSelectPanel('sources')) {
      return false;
    }
    void UI.ViewManager.ViewManager.instance().showView('sources');
    return true;
  }

  override onResize(): void {
    if (Common.Settings.Settings.instance().moduleSetting('sidebar-position').get() === 'auto') {
      this.element.window().requestAnimationFrame(this.updateSidebarPosition.bind(this));
    }  // Do not force layout.
  }

  override searchableView(): UI.SearchableView.SearchableView {
    return this.sourcesViewInternal.searchableView();
  }

  toggleNavigatorSidebar(): void {
    this.editorView.toggleSidebar();
  }

  toggleDebuggerSidebar(): void {
    this.splitWidget.toggleSidebar();
  }

  private debuggerPaused(event: Common.EventTarget.EventTargetEvent<SDK.DebuggerModel.DebuggerModel>): void {
    const debuggerModel = event.data;
    const details = debuggerModel.debuggerPausedDetails();
    if (!this.pausedInternal &&
        Common.Settings.Settings.instance().moduleSetting('auto-focus-on-debugger-paused-enabled').get()) {
      void this.setAsCurrentPanel();
    }

    if (UI.Context.Context.instance().flavor(SDK.Target.Target) === debuggerModel.target()) {
      this.showDebuggerPausedDetails((details as SDK.DebuggerModel.DebuggerPausedDetails));
    } else if (!this.pausedInternal) {
      UI.Context.Context.instance().setFlavor(SDK.Target.Target, debuggerModel.target());
    }
  }

  private debugInfoAttached(event: Common.EventTarget.EventTargetEvent<SDK.Script.Script>): void {
    const {debuggerModel} = event.data;
    if (!debuggerModel.isPaused()) {
      return;
    }

    const details = debuggerModel.debuggerPausedDetails();
    if (details && UI.Context.Context.instance().flavor(SDK.Target.Target) === debuggerModel.target()) {
      this.showDebuggerPausedDetails(details);
    }
  }

  private showDebuggerPausedDetails(details: SDK.DebuggerModel.DebuggerPausedDetails): void {
    this.pausedInternal = true;
    void this.updateDebuggerButtonsAndStatus();
    UI.Context.Context.instance().setFlavor(SDK.DebuggerModel.DebuggerPausedDetails, details);
    this.toggleDebuggerSidebarButton.setEnabled(false);
    this.revealDebuggerSidebar();
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
        !Common.Settings.Settings.instance().moduleSetting('disable-paused-state-overlay').get();
    if (withOverlay && !this.overlayLoggables) {
      this.overlayLoggables = {debuggerPausedMessage: {}, resumeButton: {}, stepOverButton: {}};
      VisualLogging.registerLoggable(
          this.overlayLoggables.debuggerPausedMessage, `${VisualLogging.dialog('debugger-paused')}`, null);
      VisualLogging.registerLoggable(
          this.overlayLoggables.resumeButton, `${VisualLogging.action('debugger.toggle-pause')}`,
          this.overlayLoggables.debuggerPausedMessage);
      VisualLogging.registerLoggable(
          this.overlayLoggables.stepOverButton, `${VisualLogging.action('debugger.step-over')}`,
          this.overlayLoggables.debuggerPausedMessage);
    }
    this.#lastPausedTarget = new WeakRef(details.debuggerModel.target());
  }

  private maybeLogOverlayAction(): void {
    if (!this.overlayLoggables) {
      return;
    }
    const byOverlayButton = !document.hasFocus();
    // In the overlary we show two buttons: resume and step over. Both trigger
    // the Debugger.resumed event. The latter however will trigger
    // Debugger.paused shortly after, while the former won't. Here we guess
    // which one was clicked by checking if we are paused again after 0.5s.
    window.setTimeout(() => {
      if (!this.overlayLoggables) {
        return;
      }
      if (byOverlayButton) {
        const details = UI.Context.Context.instance().flavor(SDK.DebuggerModel.DebuggerPausedDetails);
        VisualLogging.logClick(
            this.pausedInternal && details?.reason === Protocol.Debugger.PausedEventReason.Step ?
                this.overlayLoggables.stepOverButton :
                this.overlayLoggables.resumeButton,
            new MouseEvent('click'));
      }
      if (!this.pausedInternal) {
        VisualLogging.logResize(this.overlayLoggables.debuggerPausedMessage, new DOMRect(0, 0, 0, 0));
        this.overlayLoggables = undefined;
      }
    }, 500);
  }

  private debuggerResumed(debuggerModel: SDK.DebuggerModel.DebuggerModel): void {
    this.maybeLogOverlayAction();
    const target = debuggerModel.target();
    if (UI.Context.Context.instance().flavor(SDK.Target.Target) !== target) {
      return;
    }
    this.pausedInternal = false;
    this.clearInterface();
    this.toggleDebuggerSidebarButton.setEnabled(true);
    this.switchToPausedTargetTimeout = window.setTimeout(this.switchToPausedTarget.bind(this, debuggerModel), 500);
  }

  private debuggerWasEnabled(event: Common.EventTarget.EventTargetEvent<SDK.DebuggerModel.DebuggerModel>): void {
    const debuggerModel = event.data;
    if (UI.Context.Context.instance().flavor(SDK.Target.Target) !== debuggerModel.target()) {
      return;
    }

    void this.updateDebuggerButtonsAndStatus();
  }

  get visibleView(): UI.Widget.Widget|null {
    return this.sourcesViewInternal.visibleView();
  }

  showUISourceCode(
      uiSourceCode: Workspace.UISourceCode.UISourceCode, location?: SourceFrame.SourceFrame.RevealPosition,
      omitFocus?: boolean): void {
    if (omitFocus) {
      if (!this.isShowing() && !UI.Context.Context.instance().flavor(QuickSourceView)) {
        return;
      }
    } else {
      this.showEditor();
    }
    this.sourcesViewInternal.showSourceLocation(uiSourceCode, location, omitFocus);
  }

  private showEditor(): void {
    if (UI.Context.Context.instance().flavor(QuickSourceView)) {
      return;
    }
    void this.setAsCurrentPanel();
  }

  showUILocation(uiLocation: Workspace.UISourceCode.UILocation, omitFocus?: boolean): void {
    const {uiSourceCode, lineNumber, columnNumber} = uiLocation;
    this.showUISourceCode(uiSourceCode, {lineNumber, columnNumber}, omitFocus);
  }

  async revealInNavigator(uiSourceCode: Workspace.UISourceCode.UISourceCode, skipReveal?: boolean): Promise<void> {
    const viewManager = UI.ViewManager.ViewManager.instance();
    for (const view of viewManager.viewsForLocation(UI.ViewManager.ViewLocationValues.NAVIGATOR_VIEW)) {
      const navigatorView = await view.widget();
      if (navigatorView instanceof NavigatorView && navigatorView.acceptProject(uiSourceCode.project())) {
        navigatorView.revealUISourceCode(uiSourceCode, true);
        this.navigatorTabbedLocation.tabbedPane().selectTab(view.viewId(), true);
        if (!skipReveal) {
          this.editorView.showBoth(true);
          navigatorView.focus();
        }
        break;
      }
    }
  }

  private addExperimentMenuItem(
      menuSection: UI.ContextMenu.Section, experiment: string, menuItem: Common.UIString.LocalizedString): void {
    // menu handler
    function toggleExperiment(): void {
      const checked = Root.Runtime.experiments.isEnabled(experiment);
      Root.Runtime.experiments.setEnabled(experiment, !checked);
      Host.userMetrics.experimentChanged(experiment, checked);
      // Need to signal to the NavigatorView that grouping has changed. Unfortunately,
      // it can't listen to an experiment, and this class doesn't directly interact
      // with it, so we will convince it a different grouping setting changed. When we switch
      // from using an experiment to a setting, it will listen to that setting and we
      // won't need to do this.
      const groupByFolderSetting = Common.Settings.Settings.instance().moduleSetting('navigator-group-by-folder');
      groupByFolderSetting.set(groupByFolderSetting.get());
    }

    menuSection.appendCheckboxItem(menuItem, toggleExperiment, {
      checked: Root.Runtime.experiments.isEnabled(experiment),
      additionalElement: IconButton.Icon.create('experiment'),
      jslogContext: Platform.StringUtilities.toKebabCase(experiment),
    });
  }

  private populateNavigatorMenu(contextMenu: UI.ContextMenu.ContextMenu): void {
    const groupByFolderSetting = Common.Settings.Settings.instance().moduleSetting('navigator-group-by-folder');
    contextMenu.appendItemsAtLocation('navigatorMenu');
    contextMenu.viewSection().appendCheckboxItem(
        i18nString(UIStrings.groupByFolder), () => groupByFolderSetting.set(!groupByFolderSetting.get()),
        {checked: groupByFolderSetting.get(), jslogContext: groupByFolderSetting.name});

    this.addExperimentMenuItem(
        contextMenu.viewSection(), Root.Runtime.ExperimentName.AUTHORED_DEPLOYED_GROUPING,
        i18nString(UIStrings.groupByAuthored));
    this.addExperimentMenuItem(
        contextMenu.viewSection(), Root.Runtime.ExperimentName.JUST_MY_CODE, i18nString(UIStrings.hideIgnoreListed));
  }

  setIgnoreExecutionLineEvents(ignoreExecutionLineEvents: boolean): void {
    this.ignoreExecutionLineEvents = ignoreExecutionLineEvents;
  }

  updateLastModificationTime(): void {
    this.lastModificationTime = window.performance.now();
  }

  private async executionLineChanged(liveLocation: Bindings.LiveLocation.LiveLocation): Promise<void> {
    const uiLocation = await liveLocation.uiLocation();
    if (liveLocation.isDisposed()) {
      return;
    }
    if (!uiLocation) {
      return;
    }
    if (window.performance.now() - this.lastModificationTime < lastModificationTimeout) {
      return;
    }
    this.sourcesViewInternal.showSourceLocation(uiLocation.uiSourceCode, uiLocation, undefined, true);
  }

  private lastModificationTimeoutPassedForTest(): void {
    lastModificationTimeout = Number.MIN_VALUE;
  }

  private updateLastModificationTimeForTest(): void {
    lastModificationTimeout = Number.MAX_VALUE;
  }

  private async callFrameChanged(): Promise<void> {
    const callFrame = UI.Context.Context.instance().flavor(SDK.DebuggerModel.CallFrame);
    if (!callFrame) {
      return;
    }
    if (this.executionLineLocation) {
      this.executionLineLocation.dispose();
    }
    this.executionLineLocation =
        await Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().createCallFrameLiveLocation(
            callFrame.location(), this.executionLineChanged.bind(this), this.liveLocationPool);
  }

  private async updateDebuggerButtonsAndStatus(): Promise<void> {
    const currentTarget = UI.Context.Context.instance().flavor(SDK.Target.Target);
    const currentDebuggerModel = currentTarget ? currentTarget.model(SDK.DebuggerModel.DebuggerModel) : null;
    if (!currentDebuggerModel) {
      this.togglePauseAction.setEnabled(false);
      this.stepOverAction.setEnabled(false);
      this.stepIntoAction.setEnabled(false);
      this.stepOutAction.setEnabled(false);
      this.stepAction.setEnabled(false);
    } else if (this.pausedInternal) {
      this.togglePauseAction.setToggled(true);
      this.togglePauseAction.setEnabled(true);
      this.stepOverAction.setEnabled(true);
      this.stepIntoAction.setEnabled(true);
      this.stepOutAction.setEnabled(true);
      this.stepAction.setEnabled(true);
    } else {
      this.togglePauseAction.setToggled(false);
      this.togglePauseAction.setEnabled(!currentDebuggerModel.isPausing());
      this.stepOverAction.setEnabled(false);
      this.stepIntoAction.setEnabled(false);
      this.stepOutAction.setEnabled(false);
      this.stepAction.setEnabled(false);
    }

    const details = currentDebuggerModel ? currentDebuggerModel.debuggerPausedDetails() : null;
    await this.debuggerPausedMessage.render(
        details, Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance(),
        Breakpoints.BreakpointManager.BreakpointManager.instance());
    if (details) {
      this.updateDebuggerButtonsAndStatusForTest();
    }
  }

  private updateDebuggerButtonsAndStatusForTest(): void {
  }

  private clearInterface(): void {
    void this.updateDebuggerButtonsAndStatus();
    UI.Context.Context.instance().setFlavor(SDK.DebuggerModel.DebuggerPausedDetails, null);

    if (this.switchToPausedTargetTimeout) {
      clearTimeout(this.switchToPausedTargetTimeout);
    }
    this.liveLocationPool.disposeAll();
  }

  private switchToPausedTarget(debuggerModel: SDK.DebuggerModel.DebuggerModel): void {
    delete this.switchToPausedTargetTimeout;
    if (this.pausedInternal || debuggerModel.isPaused()) {
      return;
    }

    for (const debuggerModel of SDK.TargetManager.TargetManager.instance().models(SDK.DebuggerModel.DebuggerModel)) {
      if (debuggerModel.isPaused()) {
        UI.Context.Context.instance().setFlavor(SDK.Target.Target, debuggerModel.target());
        break;
      }
    }
  }

  runSnippet(): void {
    const uiSourceCode = this.sourcesViewInternal.currentUISourceCode();
    if (uiSourceCode) {
      void Snippets.ScriptSnippetFileSystem.evaluateScriptSnippet(uiSourceCode);
    }
  }

  private editorSelected(event: Common.EventTarget.EventTargetEvent<Workspace.UISourceCode.UISourceCode>): void {
    const uiSourceCode = event.data;
    UI.Context.Context.instance().setFlavor(Workspace.UISourceCode.UISourceCode, uiSourceCode);
    if (this.editorView.mainWidget() &&
        Common.Settings.Settings.instance().moduleSetting('auto-reveal-in-navigator').get()) {
      void this.revealInNavigator(uiSourceCode, true);
    }
  }

  togglePause(): boolean {
    const target = UI.Context.Context.instance().flavor(SDK.Target.Target);
    if (!target) {
      return true;
    }
    const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
    if (!debuggerModel) {
      return true;
    }

    if (this.pausedInternal) {
      this.pausedInternal = false;
      debuggerModel.resume();
    } else {
      // Make sure pauses didn't stick skipped.
      debuggerModel.pause();
    }

    this.clearInterface();
    return true;
  }

  private prepareToResume(): SDK.DebuggerModel.DebuggerModel|null {
    if (!this.pausedInternal) {
      return null;
    }

    this.pausedInternal = false;

    this.clearInterface();
    const target = UI.Context.Context.instance().flavor(SDK.Target.Target);
    return target ? target.model(SDK.DebuggerModel.DebuggerModel) : null;
  }

  private longResume(): void {
    const debuggerModel = this.prepareToResume();
    if (debuggerModel) {
      debuggerModel.skipAllPausesUntilReloadOrTimeout(500);
      debuggerModel.resume();
    }
  }

  private terminateExecution(): void {
    const debuggerModel = this.prepareToResume();
    if (debuggerModel) {
      void debuggerModel.runtimeModel().terminateExecution();
      debuggerModel.resume();
    }
  }

  stepOver(): boolean {
    const debuggerModel = this.prepareToResume();
    if (debuggerModel) {
      void debuggerModel.stepOver();
    }
    return true;
  }

  stepInto(): boolean {
    const debuggerModel = this.prepareToResume();
    if (debuggerModel) {
      void debuggerModel.stepInto();
    }
    return true;
  }

  stepIntoAsync(): boolean {
    const debuggerModel = this.prepareToResume();
    if (debuggerModel) {
      debuggerModel.scheduleStepIntoAsync();
    }
    return true;
  }

  stepOut(): boolean {
    const debuggerModel = this.prepareToResume();
    if (debuggerModel) {
      void debuggerModel.stepOut();
    }
    return true;
  }

  private async continueToLocation(uiLocation: Workspace.UISourceCode.UILocation): Promise<void> {
    const executionContext = UI.Context.Context.instance().flavor(SDK.RuntimeModel.ExecutionContext);
    if (!executionContext) {
      return;
    }
    // Always use 0 column.
    const rawLocations =
        await Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().uiLocationToRawLocations(
            uiLocation.uiSourceCode, uiLocation.lineNumber, 0);
    const rawLocation = rawLocations.find(location => location.debuggerModel === executionContext.debuggerModel);
    if (rawLocation && this.prepareToResume()) {
      rawLocation.continueToLocation();
    }
  }

  toggleBreakpointsActive(): void {
    Common.Settings.Settings.instance()
        .moduleSetting('breakpoints-active')
        .set(!Common.Settings.Settings.instance().moduleSetting('breakpoints-active').get());
  }

  private breakpointsActiveStateChanged(): void {
    const active = Common.Settings.Settings.instance().moduleSetting('breakpoints-active').get();
    this.toggleBreakpointsActiveAction.setToggled(!active);
    this.sourcesViewInternal.toggleBreakpointsActiveState(active);
  }

  private createDebugToolbar(): UI.Toolbar.Toolbar {
    const debugToolbar = new UI.Toolbar.Toolbar('scripts-debug-toolbar');
    debugToolbar.element.setAttribute(
        'jslog',
        `${VisualLogging.toolbar('debug').track({keydown: 'ArrowUp|ArrowLeft|ArrowDown|ArrowRight|Enter|Space'})}`);

    const longResumeButton =
        new UI.Toolbar.ToolbarButton(i18nString(UIStrings.resumeWithAllPausesBlockedForMs), 'play');
    longResumeButton.addEventListener(UI.Toolbar.ToolbarButton.Events.CLICK, this.longResume, this);
    const terminateExecutionButton =
        new UI.Toolbar.ToolbarButton(i18nString(UIStrings.terminateCurrentJavascriptCall), 'stop');
    terminateExecutionButton.addEventListener(UI.Toolbar.ToolbarButton.Events.CLICK, this.terminateExecution, this);
    const pauseActionButton = UI.Toolbar.Toolbar.createLongPressActionButton(
        this.togglePauseAction, [terminateExecutionButton, longResumeButton], []);
    pauseActionButton.toggleOnClick(false);
    debugToolbar.appendToolbarItem(pauseActionButton);

    debugToolbar.appendToolbarItem(UI.Toolbar.Toolbar.createActionButton(this.stepOverAction));
    debugToolbar.appendToolbarItem(UI.Toolbar.Toolbar.createActionButton(this.stepIntoAction));
    debugToolbar.appendToolbarItem(UI.Toolbar.Toolbar.createActionButton(this.stepOutAction));
    debugToolbar.appendToolbarItem(UI.Toolbar.Toolbar.createActionButton(this.stepAction));

    debugToolbar.appendSeparator();
    debugToolbar.appendToolbarItem(UI.Toolbar.Toolbar.createActionButton(this.toggleBreakpointsActiveAction));

    return debugToolbar;
  }

  private createDebugToolbarDrawer(): HTMLDivElement {
    const debugToolbarDrawer = document.createElement('div');
    debugToolbarDrawer.classList.add('scripts-debug-toolbar-drawer');

    const label = i18nString(UIStrings.pauseOnCaughtExceptions);
    const setting = Common.Settings.Settings.instance().moduleSetting('pause-on-caught-exception');
    debugToolbarDrawer.appendChild(UI.SettingsUI.createSettingCheckbox(label, setting, true));

    return debugToolbarDrawer;
  }

  appendApplicableItems(
      event: Event, contextMenu: UI.ContextMenu.ContextMenu,
      target: Workspace.UISourceCode.UISourceCode|Workspace.UISourceCode.UILocation|SDK.RemoteObject.RemoteObject|
      SDK.NetworkRequest.NetworkRequest|UISourceCodeFrame): void {
    if (target instanceof Workspace.UISourceCode.UISourceCode) {
      this.appendUISourceCodeItems(event, contextMenu, target);
      return;
    }
    if (target instanceof UISourceCodeFrame) {
      this.appendUISourceCodeFrameItems(contextMenu, target);
      return;
    }
    if (target instanceof Workspace.UISourceCode.UILocation) {
      this.appendUILocationItems(contextMenu, target);
      return;
    }
    if (target instanceof SDK.RemoteObject.RemoteObject) {
      this.appendRemoteObjectItems(contextMenu, target);
      return;
    }
    this.appendNetworkRequestItems(contextMenu, target);
  }

  private appendUISourceCodeItems(
      event: Event, contextMenu: UI.ContextMenu.ContextMenu, uiSourceCode: Workspace.UISourceCode.UISourceCode): void {
    if (!event.target) {
      return;
    }

    const eventTarget = (event.target as Node);
    if (!uiSourceCode.project().isServiceProject() &&
        !eventTarget.isSelfOrDescendant(this.navigatorTabbedLocation.widget().element) &&
        !(Root.Runtime.experiments.isEnabled(Root.Runtime.ExperimentName.JUST_MY_CODE) &&
          Bindings.IgnoreListManager.IgnoreListManager.instance().isUserOrSourceMapIgnoreListedUISourceCode(
              uiSourceCode))) {
      contextMenu.revealSection().appendItem(
          i18nString(UIStrings.revealInSidebar), this.revealInNavigator.bind(this, uiSourceCode), {
            jslogContext: 'sources.reveal-in-navigator-sidebar',
          });
    }

    if (UI.ActionRegistry.ActionRegistry.instance().hasAction('drjones.sources-panel-context')) {
      const editorElement = this.element.querySelector('devtools-text-editor');
      if (!eventTarget.isSelfOrDescendant(editorElement) && uiSourceCode.contentType().isTextType()) {
        UI.Context.Context.instance().setFlavor(Workspace.UISourceCode.UISourceCode, uiSourceCode);
        contextMenu.headerSection().appendAction(
            'drjones.sources-panel-context',
        );
      }
    }

    // Ignore list only works for JavaScript debugging.
    if (uiSourceCode.contentType().hasScripts() &&
        Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance()
            .scriptsForUISourceCode(uiSourceCode)
            .every(script => script.isJavaScript())) {
      this.callstackPane.appendIgnoreListURLContextMenuItems(contextMenu, uiSourceCode);
    }
  }

  private appendUISourceCodeFrameItems(contextMenu: UI.ContextMenu.ContextMenu, target: UISourceCodeFrame): void {
    if (target.uiSourceCode().contentType().isFromSourceMap() || target.textEditor.state.selection.main.empty) {
      return;
    }
    contextMenu.debugSection().appendAction('debugger.evaluate-selection');
  }

  appendUILocationItems(contextMenu: UI.ContextMenu.ContextMenu, uiLocation: Workspace.UISourceCode.UILocation): void {
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
      if (debuggerModel && debuggerModel.isPaused()) {
        contextMenu.debugSection().appendItem(
            i18nString(UIStrings.continueToHere), this.continueToLocation.bind(this, uiLocation),
            {jslogContext: 'continue-to-here'});
      }

      this.callstackPane.appendIgnoreListURLContextMenuItems(contextMenu, uiSourceCode);
    }
  }

  private appendRemoteObjectItems(contextMenu: UI.ContextMenu.ContextMenu, remoteObject: SDK.RemoteObject.RemoteObject):
      void {
    const indent = Common.Settings.Settings.instance().moduleSetting('text-editor-indent').get();
    const executionContext = UI.Context.Context.instance().flavor(SDK.RuntimeModel.ExecutionContext);

    function getObjectTitle(): string|undefined {
      if (remoteObject.type === 'wasm') {
        return remoteObject.subtype;
      }
      if (remoteObject.subtype === 'node') {
        return 'outerHTML';
      }
      return remoteObject.type;
    }
    const copyContextMenuTitle = getObjectTitle();

    contextMenu.debugSection().appendItem(
        i18nString(UIStrings.storeAsGlobalVariable),
        () => executionContext?.target()
                  .model(SDK.ConsoleModel.ConsoleModel)
                  ?.saveToTempVariable(executionContext, remoteObject),
        {jslogContext: 'store-as-global-variable'});

    const ctxMenuClipboardSection = contextMenu.clipboardSection();
    const inspectorFrontendHost = Host.InspectorFrontendHost.InspectorFrontendHostInstance;

    if (remoteObject.type === 'string') {
      ctxMenuClipboardSection.appendItem(i18nString(UIStrings.copyStringContents), () => {
        inspectorFrontendHost.copyText(remoteObject.value);
      }, {jslogContext: 'copy-string-contents'});
      ctxMenuClipboardSection.appendItem(i18nString(UIStrings.copyStringAsJSLiteral), () => {
        inspectorFrontendHost.copyText(Platform.StringUtilities.formatAsJSLiteral(remoteObject.value));
      }, {jslogContext: 'copy-string-as-js-literal'});
      ctxMenuClipboardSection.appendItem(i18nString(UIStrings.copyStringAsJSONLiteral), () => {
        inspectorFrontendHost.copyText(JSON.stringify(remoteObject.value));
      }, {jslogContext: 'copy-string-as-json-literal'});
    }
    // We are trying to copy a primitive value.
    else if (primitiveRemoteObjectTypes.has(remoteObject.type)) {
      ctxMenuClipboardSection.appendItem(i18nString(UIStrings.copyS, {PH1: String(copyContextMenuTitle)}), () => {
        inspectorFrontendHost.copyText(remoteObject.description);
      }, {jslogContext: 'copy-primitive'});
    }
    // We are trying to copy a remote object.
    else if (remoteObject.type === 'object') {
      const copyDecodedValueHandler = async(): Promise<void> => {
        const result = await remoteObject.callFunctionJSON(toStringForClipboard, [{
                                                             value: {
                                                               subtype: remoteObject.subtype,
                                                               indent,
                                                             },
                                                           }]);
        inspectorFrontendHost.copyText(result);
      };

      ctxMenuClipboardSection.appendItem(
          i18nString(UIStrings.copyS, {PH1: String(copyContextMenuTitle)}), copyDecodedValueHandler,
          {jslogContext: 'copy-object'});
    }

    else if (remoteObject.type === 'function') {
      contextMenu.debugSection().appendItem(
          i18nString(UIStrings.showFunctionDefinition), this.showFunctionDefinition.bind(this, remoteObject),
          {jslogContext: 'show-function-definition'});
    }

    function toStringForClipboard(this: Object, data: {subtype: string, indent: string}): string|undefined {
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
      } catch (error) {
        return String(this);
      }
    }
  }

  private appendNetworkRequestItems(
      contextMenu: UI.ContextMenu.ContextMenu, request: SDK.NetworkRequest.NetworkRequest): void {
    const uiSourceCode = this.workspace.uiSourceCodeForURL(request.url());
    if (!uiSourceCode) {
      return;
    }
    const openText = i18nString(UIStrings.openInSourcesPanel);
    const callback: () => void = this.showUILocation.bind(this, uiSourceCode.uiLocation(0, 0));
    contextMenu.revealSection().appendItem(openText, callback, {jslogContext: 'reveal-in-sources'});
  }

  private showFunctionDefinition(remoteObject: SDK.RemoteObject.RemoteObject): void {
    void SDK.RemoteObject.RemoteFunction.objectAsFunction(remoteObject)
        .targetFunction()
        .then(
            targetFunction => targetFunction.debuggerModel()
                                  .functionDetailsPromise(targetFunction)
                                  .then(this.didGetFunctionDetails.bind(this)));
  }

  private async didGetFunctionDetails(response: {
    location: SDK.DebuggerModel.Location|null,
  }|null): Promise<void> {
    if (!response || !response.location) {
      return;
    }

    const uiLocation =
        await Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().rawLocationToUILocation(
            response.location);
    if (uiLocation) {
      this.showUILocation(uiLocation);
    }
  }

  private revealNavigatorSidebar(): void {
    void this.setAsCurrentPanel();
    this.editorView.showBoth(true);
  }

  private revealDebuggerSidebar(): void {
    if (!Common.Settings.Settings.instance().moduleSetting('auto-focus-on-debugger-paused-enabled').get()) {
      return;
    }
    void this.setAsCurrentPanel();
    this.splitWidget.showBoth(true);
  }

  private updateSidebarPosition(): void {
    let vertically;
    const position = Common.Settings.Settings.instance().moduleSetting('sidebar-position').get();
    if (position === 'right') {
      vertically = false;
    } else if (position === 'bottom') {
      vertically = true;
    } else {
      vertically = UI.InspectorView.InspectorView.instance().element.offsetWidth < 680;
    }

    if (this.sidebarPaneView && vertically === !this.splitWidget.isVertical()) {
      return;
    }

    if (this.sidebarPaneView && this.sidebarPaneView.shouldHideOnDetach()) {
      return;
    }  // We can't reparent extension iframes.

    if (this.sidebarPaneView) {
      this.sidebarPaneView.detach();
    }

    this.splitWidget.setVertical(!vertically);
    this.splitWidget.element.classList.toggle('sources-split-view-vertical', vertically);

    SourcesPanel.updateResizerAndSidebarButtons(this);

    // Create vertical box with stack.
    const vbox = new UI.Widget.VBox();
    vbox.element.appendChild(this.debugToolbar.element);
    vbox.element.appendChild(this.debugToolbarDrawer);

    vbox.setMinimumAndPreferredSizes(minToolbarWidth, 25, minToolbarWidth, 100);
    this.sidebarPaneStack = UI.ViewManager.ViewManager.instance().createStackLocation(
        this.revealDebuggerSidebar.bind(this), undefined, 'debug');
    this.sidebarPaneStack.widget().element.classList.add('overflow-auto');
    this.sidebarPaneStack.widget().show(vbox.element);
    this.sidebarPaneStack.widget().element.appendChild(this.debuggerPausedMessage.element());
    this.sidebarPaneStack.appendApplicableItems('sources.sidebar-top');

    if (this.threadsSidebarPane) {
      this.sidebarPaneStack.appendView(this.threadsSidebarPane);
    }

    const jsBreakpoints = UI.ViewManager.ViewManager.instance().view('sources.js-breakpoints');
    const scopeChainView = UI.ViewManager.ViewManager.instance().view('sources.scope-chain');

    if (this.tabbedLocationHeader) {
      this.splitWidget.uninstallResizer(this.tabbedLocationHeader);
      this.tabbedLocationHeader = null;
    }

    if (!vertically) {
      // Populate the rest of the stack.
      this.sidebarPaneStack.appendView(this.watchSidebarPane);
      void this.sidebarPaneStack.showView(jsBreakpoints);
      void this.sidebarPaneStack.showView(scopeChainView);
      void this.sidebarPaneStack.showView(this.callstackPane);
      this.extensionSidebarPanesContainer = this.sidebarPaneStack;
      this.sidebarPaneView = vbox;
      this.splitWidget.uninstallResizer(this.debugToolbar.gripElementForResize());
    } else {
      const splitWidget =
          new UI.SplitWidget.SplitWidget(true, true, 'sources-panel-debugger-sidebar-split-view-state', 0.5);
      splitWidget.setMainWidget(vbox);

      // Populate the left stack.
      void this.sidebarPaneStack.showView(jsBreakpoints);
      void this.sidebarPaneStack.showView(this.callstackPane);

      const tabbedLocation =
          UI.ViewManager.ViewManager.instance().createTabbedLocation(this.revealDebuggerSidebar.bind(this));
      splitWidget.setSidebarWidget(tabbedLocation.tabbedPane());
      this.tabbedLocationHeader = tabbedLocation.tabbedPane().headerElement();
      this.splitWidget.installResizer(this.tabbedLocationHeader);
      this.splitWidget.installResizer(this.debugToolbar.gripElementForResize());
      tabbedLocation.appendView(scopeChainView);
      tabbedLocation.appendView(this.watchSidebarPane);
      tabbedLocation.appendApplicableItems('sources.sidebar-tabs');
      this.extensionSidebarPanesContainer = tabbedLocation;
      this.sidebarPaneView = splitWidget;
    }

    this.sidebarPaneStack.appendApplicableItems('sources.sidebar-bottom');
    const extensionSidebarPanes = Extensions.ExtensionServer.ExtensionServer.instance().sidebarPanes();
    for (let i = 0; i < extensionSidebarPanes.length; ++i) {
      this.addExtensionSidebarPane(extensionSidebarPanes[i]);
    }

    this.splitWidget.setSidebarWidget(this.sidebarPaneView);
  }

  setAsCurrentPanel(): Promise<void> {
    return UI.ViewManager.ViewManager.instance().showView('sources');
  }

  private extensionSidebarPaneAdded(
      event: Common.EventTarget.EventTargetEvent<Extensions.ExtensionPanel.ExtensionSidebarPane>): void {
    this.addExtensionSidebarPane(event.data);
  }

  private addExtensionSidebarPane(pane: Extensions.ExtensionPanel.ExtensionSidebarPane): void {
    if (pane.panelName() === this.name) {
      (this.extensionSidebarPanesContainer as UI.View.ViewLocation).appendView(pane);
    }
  }

  sourcesView(): SourcesView {
    return this.sourcesViewInternal;
  }

  private handleDrop(dataTransfer: DataTransfer): void {
    const items = dataTransfer.items;
    if (!items.length) {
      return;
    }
    const entry = items[0].webkitGetAsEntry();
    if (entry && entry.isDirectory) {
      Host.InspectorFrontendHost.InspectorFrontendHostInstance.upgradeDraggedFileSystemPermissions(entry.filesystem);
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.WorkspaceDropFolder);
      void UI.ViewManager.ViewManager.instance().showView('navigator-files');
    }
  }
}

export let lastModificationTimeout = 200;
export const minToolbarWidth = 215;

export class UILocationRevealer implements Common.Revealer.Revealer<Workspace.UISourceCode.UILocation> {
  async reveal(uiLocation: Workspace.UISourceCode.UILocation, omitFocus?: boolean): Promise<void> {
    SourcesPanel.instance().showUILocation(uiLocation, omitFocus);
  }
}

export class UILocationRangeRevealer implements Common.Revealer.Revealer<Workspace.UISourceCode.UILocationRange> {
  static #instance?: UILocationRangeRevealer;
  static instance(opts: {forceNew: boolean} = {forceNew: false}): UILocationRangeRevealer {
    if (!UILocationRangeRevealer.#instance || opts.forceNew) {
      UILocationRangeRevealer.#instance = new UILocationRangeRevealer();
    }
    return UILocationRangeRevealer.#instance;
  }

  async reveal(uiLocationRange: Workspace.UISourceCode.UILocationRange, omitFocus?: boolean): Promise<void> {
    const {uiSourceCode, range: {start: from, end: to}} = uiLocationRange;
    SourcesPanel.instance().showUISourceCode(uiSourceCode, {from, to}, omitFocus);
  }
}

export class DebuggerLocationRevealer implements Common.Revealer.Revealer<SDK.DebuggerModel.Location> {
  async reveal(rawLocation: SDK.DebuggerModel.Location, omitFocus?: boolean): Promise<void> {
    const uiLocation =
        await Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().rawLocationToUILocation(
            rawLocation);
    if (uiLocation) {
      SourcesPanel.instance().showUILocation(uiLocation, omitFocus);
    }
  }
}

export class UISourceCodeRevealer implements Common.Revealer.Revealer<Workspace.UISourceCode.UISourceCode> {
  async reveal(uiSourceCode: Workspace.UISourceCode.UISourceCode, omitFocus?: boolean): Promise<void> {
    SourcesPanel.instance().showUISourceCode(uiSourceCode, undefined, omitFocus);
  }
}

export class DebuggerPausedDetailsRevealer implements
    Common.Revealer.Revealer<SDK.DebuggerModel.DebuggerPausedDetails> {
  async reveal(_object: SDK.DebuggerModel.DebuggerPausedDetails): Promise<void> {
    if (Common.Settings.Settings.instance().moduleSetting('auto-focus-on-debugger-paused-enabled').get()) {
      return SourcesPanel.instance().setAsCurrentPanel();
    }
  }
}

export class RevealingActionDelegate implements UI.ActionRegistration.ActionDelegate {
  handleAction(context: UI.Context.Context, actionId: string): boolean {
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
            !Common.Settings.Settings.instance().moduleSetting('disable-paused-state-overlay').get();
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

export class ActionDelegate implements UI.ActionRegistration.ActionDelegate {
  handleAction(context: UI.Context.Context, actionId: string): boolean {
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
          const {state: editorState} = frame.textEditor;
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
    }
    return false;
  }
}

export class QuickSourceView extends UI.Widget.VBox {
  private readonly view: SourcesView;
  constructor() {
    super();
    this.element.classList.add('sources-view-wrapper');
    this.element.setAttribute('jslog', `${VisualLogging.panel('sources.quick').track({resize: true})}`);
    this.view = SourcesPanel.instance().sourcesView();
  }

  override wasShown(): void {
    UI.Context.Context.instance().setFlavor(QuickSourceView, this);
    super.wasShown();
    if (!SourcesPanel.instance().isShowing()) {
      this.showViewInWrapper();
    } else {
      UI.InspectorView.InspectorView.instance().setDrawerMinimized(true);
    }
    SourcesPanel.updateResizerAndSidebarButtons(SourcesPanel.instance());
  }

  override willHide(): void {
    UI.InspectorView.InspectorView.instance().setDrawerMinimized(false);
    queueMicrotask(() => {
      SourcesPanel.updateResizerAndSidebarButtons(SourcesPanel.instance());
    });
    super.willHide();
    UI.Context.Context.instance().setFlavor(QuickSourceView, null);
  }

  showViewInWrapper(): void {
    this.view.show(this.element);
  }
}
