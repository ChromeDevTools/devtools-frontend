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

import * as Common from '../common/common.js';
import * as Host from '../host/host.js';

import {ActionDelegate as ActionDelegateInterface} from './ActionDelegate.js';  // eslint-disable-line no-unused-vars
import {Context} from './Context.js';                                           // eslint-disable-line no-unused-vars
import {Dialog} from './Dialog.js';
import {GlassPane} from './GlassPane.js';
import {Icon} from './Icon.js';  // eslint-disable-line no-unused-vars
import {KeyboardShortcut} from './KeyboardShortcut.js';
import {Panel} from './Panel.js';  // eslint-disable-line no-unused-vars
import {SplitWidget} from './SplitWidget.js';
import {Events as TabbedPaneEvents} from './TabbedPane.js';
import {ToolbarButton} from './Toolbar.js';
import {View, ViewLocation, ViewLocationResolver} from './View.js';  // eslint-disable-line no-unused-vars
import {ViewManager} from './ViewManager.js';
import {VBox, WidgetFocusRestorer} from './Widget.js';

/**
 * @implements {ViewLocationResolver}
 * @unrestricted
 */
export class InspectorView extends VBox {
  constructor() {
    super();
    GlassPane.setContainer(this.element);
    this.setMinimumSize(240, 72);

    // DevTools sidebar is a vertical split of panels tabbed pane and a drawer.
    this._drawerSplitWidget = new SplitWidget(false, true, 'Inspector.drawerSplitViewState', 200, 200);
    this._drawerSplitWidget.hideSidebar();
    this._drawerSplitWidget.hideDefaultResizer();
    this._drawerSplitWidget.enableShowModeSaving();
    this._drawerSplitWidget.show(this.element);

    // Create drawer tabbed pane.
    this._drawerTabbedLocation =
        ViewManager.instance().createTabbedLocation(this._showDrawer.bind(this, false), 'drawer-view', true, true);
    const moreTabsButton = this._drawerTabbedLocation.enableMoreTabsButton();
    moreTabsButton.setTitle(ls`More Tools`);
    this._drawerTabbedPane = this._drawerTabbedLocation.tabbedPane();
    this._drawerTabbedPane.setMinimumSize(0, 27);
    const closeDrawerButton = new ToolbarButton(Common.UIString.UIString('Close drawer'), 'largeicon-delete');
    closeDrawerButton.addEventListener(ToolbarButton.Events.Click, this._closeDrawer, this);
    this._drawerSplitWidget.installResizer(this._drawerTabbedPane.headerElement());
    this._drawerTabbedPane.addEventListener(TabbedPaneEvents.TabSelected, this._drawerTabSelected, this);

    this._drawerSplitWidget.setSidebarWidget(this._drawerTabbedPane);
    this._drawerTabbedPane.rightToolbar().appendToolbarItem(closeDrawerButton);

    // Create main area tabbed pane.
    this._tabbedLocation = ViewManager.instance().createTabbedLocation(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.bringToFront.bind(
            Host.InspectorFrontendHost.InspectorFrontendHostInstance),
        'panel', true, true, Root.Runtime.queryParam('panel'));

    this._tabbedPane = this._tabbedLocation.tabbedPane();
    this._tabbedPane.registerRequiredCSS('ui/inspectorViewTabbedPane.css');
    this._tabbedPane.addEventListener(TabbedPaneEvents.TabSelected, this._tabSelected, this);
    this._tabbedPane.setAccessibleName(Common.UIString.UIString('Panels'));

    // Store the initial selected panel for use in launch histograms
    Host.userMetrics.setLaunchPanel(this._tabbedPane.selectedTabId);

    if (Host.InspectorFrontendHost.isUnderTest()) {
      this._tabbedPane.setAutoSelectFirstItemOnShow(false);
    }
    this._drawerSplitWidget.setMainWidget(this._tabbedPane);

    this._keyDownBound = this._keyDown.bind(this);
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(
        Host.InspectorFrontendHostAPI.Events.ShowPanel, showPanel.bind(this));

    /**
     * @this {InspectorView}
     * @param {!Common.EventTarget.EventTargetEvent} event
     */
    function showPanel(event) {
      const panelName = /** @type {string} */ (event.data);
      this.showPanel(panelName);
    }
  }

  /**
   * @return {!InspectorView}
   */
  static instance() {
    return /** @type {!InspectorView} */ (self.runtime.sharedInstance(InspectorView));
  }

  /**
   * @override
   */
  wasShown() {
    this.element.ownerDocument.addEventListener('keydown', this._keyDownBound, false);
  }

  /**
   * @override
   */
  willHide() {
    this.element.ownerDocument.removeEventListener('keydown', this._keyDownBound, false);
  }

  /**
   * @override
   * @param {string} locationName
   * @return {?ViewLocation}
   */
  resolveLocation(locationName) {
    if (locationName === 'drawer-view') {
      return this._drawerTabbedLocation;
    }
    if (locationName === 'panel') {
      return this._tabbedLocation;
    }
    return null;
  }

  createToolbars() {
    this._tabbedPane.leftToolbar().appendItemsAtLocation('main-toolbar-left');
    this._tabbedPane.rightToolbar().appendItemsAtLocation('main-toolbar-right');
  }

  /**
   * @param {!View} view
   */
  addPanel(view) {
    this._tabbedLocation.appendView(view);
  }

  /**
   * @param {string} panelName
   * @return {boolean}
   */
  hasPanel(panelName) {
    return this._tabbedPane.hasTab(panelName);
  }

  /**
   * @param {string} panelName
   * @return {!Promise.<!Panel>}
   */
  panel(panelName) {
    return (
        /** @type {!Promise.<!Panel>} */ (ViewManager.instance().view(panelName).widget()));
  }

  /**
   * @param {boolean} allTargetsSuspended
   */
  onSuspendStateChanged(allTargetsSuspended) {
    this._currentPanelLocked = allTargetsSuspended;
    this._tabbedPane.setCurrentTabLocked(this._currentPanelLocked);
    this._tabbedPane.leftToolbar().setEnabled(!this._currentPanelLocked);
    this._tabbedPane.rightToolbar().setEnabled(!this._currentPanelLocked);
  }

  /**
   * @param {string} panelName
   * @return {boolean}
   */
  canSelectPanel(panelName) {
    return !this._currentPanelLocked || this._tabbedPane.selectedTabId === panelName;
  }

  /**
   * @param {string} panelName
   * @return {!Promise.<?Panel>}
   */
  showPanel(panelName) {
    return ViewManager.instance().showView(panelName);
  }

  /**
   * @param {string} panelName
   * @param {?Icon} icon
   */
  setPanelIcon(panelName, icon) {
    this._tabbedPane.setTabIcon(panelName, icon);
  }

  /**
   * @return {?Panel}
   */
  currentPanelDeprecated() {
    return (
        /** @type {?Panel} */ (ViewManager.instance().materializedWidget(this._tabbedPane.selectedTabId || '')));
  }

  /**
   * @param {boolean} focus
   */
  _showDrawer(focus) {
    if (this._drawerTabbedPane.isShowing()) {
      return;
    }
    this._drawerSplitWidget.showBoth();
    if (focus) {
      this._focusRestorer = new WidgetFocusRestorer(this._drawerTabbedPane);
    } else {
      this._focusRestorer = null;
    }
  }

  /**
   * @return {boolean}
   */
  drawerVisible() {
    return this._drawerTabbedPane.isShowing();
  }

  _closeDrawer() {
    if (!this._drawerTabbedPane.isShowing()) {
      return;
    }
    if (this._focusRestorer) {
      this._focusRestorer.restore();
    }
    this._drawerSplitWidget.hideSidebar(true);
  }

  /**
   * @param {boolean} minimized
   */
  setDrawerMinimized(minimized) {
    this._drawerSplitWidget.setSidebarMinimized(minimized);
    this._drawerSplitWidget.setResizable(!minimized);
  }

  /**
   * @return {boolean}
   */
  isDrawerMinimized() {
    return this._drawerSplitWidget.isSidebarMinimized();
  }

  /**
   * @param {string} id
   * @param {boolean=} userGesture
   */
  closeDrawerTab(id, userGesture) {
    this._drawerTabbedPane.closeTab(id, userGesture);
  }

  /**
   * @param {!Event} event
   */
  _keyDown(event) {
    const keyboardEvent = /** @type {!KeyboardEvent} */ (event);
    if (!KeyboardShortcut.eventHasCtrlOrMeta(keyboardEvent) || event.altKey || event.shiftKey) {
      return;
    }

    // Ctrl/Cmd + 1-9 should show corresponding panel.
    const panelShortcutEnabled = Common.Settings.moduleSetting('shortcutPanelSwitch').get();
    if (panelShortcutEnabled) {
      let panelIndex = -1;
      if (event.keyCode > 0x30 && event.keyCode < 0x3A) {
        panelIndex = event.keyCode - 0x31;
      } else if (
          event.keyCode > 0x60 && event.keyCode < 0x6A &&
          keyboardEvent.location === KeyboardEvent.DOM_KEY_LOCATION_NUMPAD) {
        panelIndex = event.keyCode - 0x61;
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

  /**
   * @override
   */
  onResize() {
    GlassPane.containerMoved(this.element);
  }

  /**
   * @return {!Element}
   */
  topResizerElement() {
    return this._tabbedPane.headerElement();
  }

  toolbarItemResized() {
    this._tabbedPane.headerResized();
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _tabSelected(event) {
    const tabId = /** @type {string} */ (event.data['tabId']);
    Host.userMetrics.panelShown(tabId);
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _drawerTabSelected(event) {
    const tabId = /** @type {string} */ (event.data['tabId']);
    Host.userMetrics.drawerShown(tabId);
  }

  /**
   * @param {!SplitWidget} splitWidget
   */
  setOwnerSplit(splitWidget) {
    this._ownerSplitWidget = splitWidget;
  }

  /**
   * @return {?SplitWidget}
   */
  ownerSplit() {
    return this._ownerSplitWidget;
  }

  minimize() {
    if (this._ownerSplitWidget) {
      this._ownerSplitWidget.setSidebarMinimized(true);
    }
  }

  restore() {
    if (this._ownerSplitWidget) {
      this._ownerSplitWidget.setSidebarMinimized(false);
    }
  }
}

/**
 * @implements {ActionDelegateInterface}
 * @unrestricted
 */
export class ActionDelegate {
  /**
   * @override
   * @param {!Context} context
   * @param {string} actionId
   * @return {boolean}
   */
  handleAction(context, actionId) {
    switch (actionId) {
      case 'main.toggle-drawer':
        if (self.UI.inspectorView.drawerVisible()) {
          self.UI.inspectorView._closeDrawer();
        } else {
          self.UI.inspectorView._showDrawer(true);
        }
        return true;
      case 'main.next-tab':
        self.UI.inspectorView._tabbedPane.selectNextTab();
        self.UI.inspectorView._tabbedPane.focus();
        return true;
      case 'main.previous-tab':
        self.UI.inspectorView._tabbedPane.selectPrevTab();
        self.UI.inspectorView._tabbedPane.focus();
        return true;
    }
    return false;
  }
}
