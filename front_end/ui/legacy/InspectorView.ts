/*
 * Copyright (C) 2011 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/* eslint-disable rulesdir/no_underscored_properties */

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Root from '../../core/root/root.js';

import type {ActionDelegate as ActionDelegateInterface} from './ActionRegistration.js'; // eslint-disable-line no-unused-vars
import type {Context} from './Context.js';         // eslint-disable-line no-unused-vars
import type {ContextMenu} from './ContextMenu.js'; // eslint-disable-line no-unused-vars
import {Dialog} from './Dialog.js';
import {DockController, State} from './DockController.js';
import {GlassPane} from './GlassPane.js';
import type {Icon} from './Icon.js'; // eslint-disable-line no-unused-vars
import {Infobar, Type as InfobarType} from './Infobar.js';
import {KeyboardShortcut} from './KeyboardShortcut.js';
import type {Panel} from './Panel.js'; // eslint-disable-line no-unused-vars
import {SplitWidget} from './SplitWidget.js';
import {Events as TabbedPaneEvents} from './TabbedPane.js';
import type {TabbedPane, TabbedPaneTabDelegate} from './TabbedPane.js'; // eslint-disable-line no-unused-vars
import {ToolbarButton} from './Toolbar.js';
import type {TabbedViewLocation, View, ViewLocation, ViewLocationResolver} from './View.js'; // eslint-disable-line no-unused-vars
import {ViewManager} from './ViewManager.js';
import type {Widget} from './Widget.js';
import {VBox, WidgetFocusRestorer} from './Widget.js';  // eslint-disable-line no-unused-vars

const UIStrings = {
  /**
  *@description Title of more tabs button in inspector view
  */
  moreTools: 'More Tools',
  /**
  *@description Text that appears when hovor over the close button on the drawer view
  */
  closeDrawer: 'Close drawer',
  /**
  *@description The aria label for main tabbed pane that contains Panels
  */
  panels: 'Panels',
  /**
  *@description Title of an action that reloads the DevTools
  */
  reloadDevtools: 'Reload DevTools',
  /**
  *@description Text for context menu action to move a tab to the main panel
  */
  moveToTop: 'Move to top',
  /**
  *@description Text for context menu action to move a tab to the drawer
  */
  moveToBottom: 'Move to bottom',
};
const str_ = i18n.i18n.registerUIStrings('ui/legacy/InspectorView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
let inspectorViewInstance: InspectorView;

export class InspectorView extends VBox implements ViewLocationResolver {
  _drawerSplitWidget: SplitWidget;
  _tabDelegate: InspectorViewTabDelegate;
  _drawerTabbedLocation: TabbedViewLocation;
  _drawerTabbedPane: TabbedPane;
  _infoBarDiv!: HTMLDivElement|null;
  _tabbedLocation: TabbedViewLocation;
  _tabbedPane: TabbedPane;
  _keyDownBound: (event: Event) => void;
  _currentPanelLocked?: boolean;
  _focusRestorer?: WidgetFocusRestorer|null;
  _ownerSplitWidget?: SplitWidget;
  _reloadRequiredInfobar?: Infobar;

  constructor() {
    super();
    GlassPane.setContainer(this.element);
    this.setMinimumSize(240, 72);

    // DevTools sidebar is a vertical split of panels tabbed pane and a drawer.
    this._drawerSplitWidget = new SplitWidget(false, true, 'Inspector.drawerSplitViewState', 200, 200);
    this._drawerSplitWidget.hideSidebar();
    this._drawerSplitWidget.enableShowModeSaving();
    this._drawerSplitWidget.show(this.element);

    this._tabDelegate = new InspectorViewTabDelegate();

    // Create drawer tabbed pane.
    this._drawerTabbedLocation =
        ViewManager.instance().createTabbedLocation(this._showDrawer.bind(this, false), 'drawer-view', true, true);
    const moreTabsButton = this._drawerTabbedLocation.enableMoreTabsButton();
    moreTabsButton.setTitle(i18nString(UIStrings.moreTools));
    this._drawerTabbedPane = this._drawerTabbedLocation.tabbedPane();
    this._drawerTabbedPane.setMinimumSize(0, 27);
    this._drawerTabbedPane.element.classList.add('drawer-tabbed-pane');
    const closeDrawerButton = new ToolbarButton(i18nString(UIStrings.closeDrawer), 'largeicon-delete');
    closeDrawerButton.addEventListener(ToolbarButton.Events.Click, this._closeDrawer, this);
    this._drawerTabbedPane.addEventListener(TabbedPaneEvents.TabSelected, this._tabSelected, this);
    this._drawerTabbedPane.setTabDelegate(this._tabDelegate);

    this._drawerSplitWidget.installResizer(this._drawerTabbedPane.headerElement());
    this._drawerSplitWidget.setSidebarWidget(this._drawerTabbedPane);
    this._drawerTabbedPane.rightToolbar().appendToolbarItem(closeDrawerButton);

    // Create main area tabbed pane.
    this._tabbedLocation = ViewManager.instance().createTabbedLocation(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.bringToFront.bind(
            Host.InspectorFrontendHost.InspectorFrontendHostInstance),
        'panel', true, true, Root.Runtime.Runtime.queryParam('panel'));

    this._tabbedPane = this._tabbedLocation.tabbedPane();
    this._tabbedPane.element.classList.add('main-tabbed-pane');
    this._tabbedPane.registerRequiredCSS('ui/legacy/inspectorViewTabbedPane.css', {enableLegacyPatching: false});
    this._tabbedPane.addEventListener(TabbedPaneEvents.TabSelected, this._tabSelected, this);
    this._tabbedPane.setAccessibleName(i18nString(UIStrings.panels));
    this._tabbedPane.setTabDelegate(this._tabDelegate);

    // Store the initial selected panel for use in launch histograms
    Host.userMetrics.setLaunchPanel(this._tabbedPane.selectedTabId);

    if (Host.InspectorFrontendHost.isUnderTest()) {
      this._tabbedPane.setAutoSelectFirstItemOnShow(false);
    }
    this._drawerSplitWidget.setMainWidget(this._tabbedPane);

    this._keyDownBound = this._keyDown.bind(this);
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(
        Host.InspectorFrontendHostAPI.Events.ShowPanel, showPanel.bind(this));

    function showPanel(this: InspectorView, event: Common.EventTarget.EventTargetEvent): void {
      const panelName = (event.data as string);
      this.showPanel(panelName);
    }
  }

  static instance(opts: {
    forceNew: boolean|null,
  }|undefined = {forceNew: null}): InspectorView {
    const {forceNew} = opts;
    if (!inspectorViewInstance || forceNew) {
      inspectorViewInstance = new InspectorView();
    }

    return inspectorViewInstance;
  }

  wasShown(): void {
    this.element.ownerDocument.addEventListener('keydown', this._keyDownBound, false);
  }

  willHide(): void {
    this.element.ownerDocument.removeEventListener('keydown', this._keyDownBound, false);
  }

  resolveLocation(locationName: string): ViewLocation|null {
    if (locationName === 'drawer-view') {
      return this._drawerTabbedLocation;
    }
    if (locationName === 'panel') {
      return this._tabbedLocation;
    }
    return null;
  }

  async createToolbars(): Promise<void> {
    await this._tabbedPane.leftToolbar().appendItemsAtLocation('main-toolbar-left');
    await this._tabbedPane.rightToolbar().appendItemsAtLocation('main-toolbar-right');
  }

  addPanel(view: View): void {
    this._tabbedLocation.appendView(view);
  }

  hasPanel(panelName: string): boolean {
    return this._tabbedPane.hasTab(panelName);
  }

  async panel(panelName: string): Promise<Panel> {
    const view = ViewManager.instance().view(panelName);
    if (!view) {
      throw new Error(`Expected view for panel '${panelName}'`);
    }
    return /** @type {!Promise.<!Panel>} */ view.widget() as Promise<Panel>;
  }

  onSuspendStateChanged(allTargetsSuspended: boolean): void {
    this._currentPanelLocked = allTargetsSuspended;
    this._tabbedPane.setCurrentTabLocked(this._currentPanelLocked);
    this._tabbedPane.leftToolbar().setEnabled(!this._currentPanelLocked);
    this._tabbedPane.rightToolbar().setEnabled(!this._currentPanelLocked);
  }

  canSelectPanel(panelName: string): boolean {
    return !this._currentPanelLocked || this._tabbedPane.selectedTabId === panelName;
  }

  async showPanel(panelName: string): Promise<void> {
    await ViewManager.instance().showView(panelName);
  }

  setPanelIcon(tabId: string, icon: Icon|null): void {
    // Find the tabbed location where the panel lives
    const tabbedPane = this._getTabbedPaneForTabId(tabId);
    if (tabbedPane) {
      tabbedPane.setTabIcon(tabId, icon);
    }
  }

  _emitDrawerChangeEvent(isDrawerOpen: boolean): void {
    const evt = new CustomEvent(Events.DrawerChange, {bubbles: true, cancelable: true, detail: {isDrawerOpen}});
    document.body.dispatchEvent(evt);
  }

  _getTabbedPaneForTabId(tabId: string): TabbedPane|null {
    // Tab exists in the main panel
    if (this._tabbedPane.hasTab(tabId)) {
      return this._tabbedPane;
    }

    // Tab exists in the drawer
    if (this._drawerTabbedPane.hasTab(tabId)) {
      return this._drawerTabbedPane;
    }

    // Tab is not open
    return null;
  }

  currentPanelDeprecated(): Widget|null {
    return (ViewManager.instance().materializedWidget(this._tabbedPane.selectedTabId || '') as Widget | null);
  }

  _showDrawer(focus: boolean): void {
    if (this._drawerTabbedPane.isShowing()) {
      return;
    }
    this._drawerSplitWidget.showBoth();
    if (focus) {
      this._focusRestorer = new WidgetFocusRestorer(this._drawerTabbedPane);
    } else {
      this._focusRestorer = null;
    }
    this._emitDrawerChangeEvent(true);
  }

  drawerVisible(): boolean {
    return this._drawerTabbedPane.isShowing();
  }

  _closeDrawer(): void {
    if (!this._drawerTabbedPane.isShowing()) {
      return;
    }
    if (this._focusRestorer) {
      this._focusRestorer.restore();
    }
    this._drawerSplitWidget.hideSidebar(true);

    this._emitDrawerChangeEvent(false);
  }

  setDrawerMinimized(minimized: boolean): void {
    this._drawerSplitWidget.setSidebarMinimized(minimized);
    this._drawerSplitWidget.setResizable(!minimized);
  }

  isDrawerMinimized(): boolean {
    return this._drawerSplitWidget.isSidebarMinimized();
  }

  closeDrawerTab(id: string, userGesture?: boolean): void {
    this._drawerTabbedPane.closeTab(id, userGesture);
    Host.userMetrics.panelClosed(id);
  }

  _keyDown(event: Event): void {
    const keyboardEvent = (event as KeyboardEvent);
    if (!KeyboardShortcut.eventHasCtrlOrMeta(keyboardEvent) || keyboardEvent.altKey || keyboardEvent.shiftKey) {
      return;
    }

    // Ctrl/Cmd + 1-9 should show corresponding panel.
    const panelShortcutEnabled = Common.Settings.moduleSetting('shortcutPanelSwitch').get();
    if (panelShortcutEnabled) {
      let panelIndex = -1;
      if (keyboardEvent.keyCode > 0x30 && keyboardEvent.keyCode < 0x3A) {
        panelIndex = keyboardEvent.keyCode - 0x31;
      } else if (
          keyboardEvent.keyCode > 0x60 && keyboardEvent.keyCode < 0x6A &&
          keyboardEvent.location === KeyboardEvent.DOM_KEY_LOCATION_NUMPAD) {
        panelIndex = keyboardEvent.keyCode - 0x61;
      }
      if (panelIndex !== -1) {
        const panelName = this._tabbedPane.tabIds()[panelIndex];
        if (panelName) {
          if (!Dialog.hasInstance() && !this._currentPanelLocked) {
            this.showPanel(panelName);
          }
          event.consume(true);
        }
      }
    }
  }

  onResize(): void {
    GlassPane.containerMoved(this.element);
  }

  topResizerElement(): Element {
    return this._tabbedPane.headerElement();
  }

  toolbarItemResized(): void {
    this._tabbedPane.headerResized();
  }

  _tabSelected(event: Common.EventTarget.EventTargetEvent): void {
    const tabId = (event.data['tabId'] as string);
    Host.userMetrics.panelShown(tabId);
  }

  setOwnerSplit(splitWidget: SplitWidget): void {
    this._ownerSplitWidget = splitWidget;
  }

  ownerSplit(): SplitWidget|null {
    return this._ownerSplitWidget || null;
  }

  minimize(): void {
    if (this._ownerSplitWidget) {
      this._ownerSplitWidget.setSidebarMinimized(true);
    }
  }

  restore(): void {
    if (this._ownerSplitWidget) {
      this._ownerSplitWidget.setSidebarMinimized(false);
    }
  }

  displayReloadRequiredWarning(message: string): void {
    if (!this._reloadRequiredInfobar) {
      const infobar = new Infobar(InfobarType.Info, message, [
        {
          text: i18nString(UIStrings.reloadDevtools),
          highlight: true,
          delegate: (): void => {
            if (DockController.instance().canDock() && DockController.instance().dockSide() === State.Undocked) {
              Host.InspectorFrontendHost.InspectorFrontendHostInstance.setIsDocked(true, function() {});
            }
            Host.InspectorFrontendHost.InspectorFrontendHostInstance.reattach(() => window.location.reload());
          },
          dismiss: false,
        },
      ]);
      infobar.setParentView(this);
      this._attachReloadRequiredInfobar(infobar);
      this._reloadRequiredInfobar = infobar;
      infobar.setCloseCallback(() => {
        delete this._reloadRequiredInfobar;
      });
    }
  }

  _attachReloadRequiredInfobar(infobar: Infobar): void {
    if (!this._infoBarDiv) {
      this._infoBarDiv = (document.createElement('div') as HTMLDivElement);
      this._infoBarDiv.classList.add('flex-none');
      this.contentElement.insertBefore(this._infoBarDiv, this.contentElement.firstChild);
    }
    this._infoBarDiv.appendChild(infobar.element);
  }
}

let actionDelegateInstance: ActionDelegate;

export class ActionDelegate implements ActionDelegateInterface {
  static instance(opts: {
    forceNew: boolean|null,
  } = {forceNew: null}): ActionDelegate {
    const {forceNew} = opts;
    if (!actionDelegateInstance || forceNew) {
      actionDelegateInstance = new ActionDelegate();
    }

    return actionDelegateInstance;
  }

  handleAction(context: Context, actionId: string): boolean {
    switch (actionId) {
      case 'main.toggle-drawer':
        if (InspectorView.instance().drawerVisible()) {
          InspectorView.instance()._closeDrawer();
        } else {
          InspectorView.instance()._showDrawer(true);
        }
        return true;
      case 'main.next-tab':
        InspectorView.instance()._tabbedPane.selectNextTab();
        InspectorView.instance()._tabbedPane.focus();
        return true;
      case 'main.previous-tab':
        InspectorView.instance()._tabbedPane.selectPrevTab();
        InspectorView.instance()._tabbedPane.focus();
        return true;
    }
    return false;
  }
}

export class InspectorViewTabDelegate implements TabbedPaneTabDelegate {
  closeTabs(tabbedPane: TabbedPane, ids: string[]): void {
    tabbedPane.closeTabs(ids, true);
    // Log telemetry about the closure
    ids.forEach(id => {
      Host.userMetrics.panelClosed(id);
    });
  }

  moveToDrawer(tabId: string): void {
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.TabMovedToDrawer);
    ViewManager.instance().moveView(tabId, 'drawer-view');
  }

  moveToMainPanel(tabId: string): void {
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.TabMovedToMainPanel);
    ViewManager.instance().moveView(tabId, 'panel');
  }

  onContextMenu(tabId: string, contextMenu: ContextMenu): void {
    // Special case for console, we don't show the movable context panel for this two tabs
    if (tabId === 'console' || tabId === 'console-view') {
      return;
    }

    const locationName = ViewManager.instance().locationNameForViewId(tabId);
    if (locationName === 'drawer-view') {
      contextMenu.defaultSection().appendItem(i18nString(UIStrings.moveToTop), this.moveToMainPanel.bind(this, tabId));
    } else {
      contextMenu.defaultSection().appendItem(i18nString(UIStrings.moveToBottom), this.moveToDrawer.bind(this, tabId));
    }
  }
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum Events {
  DrawerChange = 'drawerchange',
}
