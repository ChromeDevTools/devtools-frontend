// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Root from '../../core/root/root.js';
import * as VisualLogging from '../visual_logging/visual_logging.js';

import * as ARIAUtils from './ARIAUtils.js';
import drawerTabbedPaneStyles from './inspectorDrawerTabbedPane.css.js';
import {ShowMode, type SplitWidget} from './SplitWidget.js';
import {type EventData, Events as TabbedPaneEvents, TabbedPane, type TabbedPaneTabDelegate} from './TabbedPane.js';
import {ToolbarButton, type ToolbarMenuButton} from './Toolbar.js';
import type {TabbedViewLocation} from './View.js';
import {ViewManager} from './ViewManager.js';

const VERTICAL_MINIMIZED_DRAWER_SIZE = 27;

class DrawerTabbedPane extends TabbedPane {
  constructor() {
    super();
    this.registerRequiredCSS(drawerTabbedPaneStyles);
  }

  setVerticalMinimized(isMinimized: boolean): void {
    this.element.classList.toggle('drawer-minimized-vertical', isMinimized);
    this.contentElement.classList.toggle('collapsed-vertical-drawer-container', isMinimized);
    this.tabbedPaneContentElement().classList.toggle('hide-element', isMinimized);
    this.headerElement().classList.toggle('collapsed-vertical-drawer-header', isMinimized);
    this.headerContentsElement.classList.toggle('hide-element', isMinimized);
    this.leftToolbar().classList.toggle('hide-element', isMinimized);
    this.rightToolbar().classList.toggle('collapsed-vertical-drawer-right-toolbar', isMinimized);
    this.rightToolbar().classList.toggle('collapsed-vertical-drawer-toolbar-content', isMinimized);
  }

  restoreAfterVerticalMinimized(): void {
    this.clearMeasuredWidths();
    this.headerResized();
  }
}

const UIStrings = {
  /**
   * @description Title and tooltip text for the more tools menu button in the drawer.
   */
  moreTools: 'More tools',
  /**
   * @description Tooltip text for the minimize button in the drawer.
   */
  minimizeDrawer: 'Minimize drawer',
  /**
   * @description Tooltip text for the expand button in the drawer.
   */
  expandDrawer: 'Expand drawer',
  /**
   * @description Tooltip text for the close button in the drawer.
   */
  closeDrawer: 'Close drawer',
  /**
   * @description Tooltip text for the toggle orientation button in the drawer.
   */
  toggleDrawerOrientation: 'Toggle drawer orientation',
} as const;

const str_ = i18n.i18n.registerUIStrings('ui/legacy/InspectorDrawerView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

interface InspectorDrawerViewOptions {
  revealDrawer: () => void;
  isVisible: () => boolean;
  drawerLabel: string;
  onToggleMinimized: () => void;
  onHide: () => void;
  onToggleOrientation: () => void;
  onExpandFromMinimized: () => void;
  onMinimizeFromTabInteraction: () => void;
  onTabSelected: (tabId: string) => void;
  isConsoleOpenInMainAndDrawer: (tabId: string) => boolean;
  tabDelegate: TabbedPaneTabDelegate;
  enableOrientationToggle: boolean;
  isVertical: boolean;
  verticalExpandedMinimumWidth: number;
  minimumSizes: {
    inspectorWidthWhenVertical: number,
    inspectorWidthWhenHorizontal: number,
    inspectorHeight: number,
  };
  setInspectorMinimumSize: (width: number, height: number) => void;
  splitWidget?: SplitWidget;
}

interface InspectorDrawerPresentation {
  isVertical: boolean;
  isMinimized: boolean;
  verticalExpandedMinimumWidth: number;
}

export class InspectorDrawerView {
  readonly tabbedLocation: TabbedViewLocation;
  readonly tabbedPane: DrawerTabbedPane;
  #splitWidget: SplitWidget|null = null;
  readonly #drawerMinimizedSetting: Common.Settings.Setting<boolean>;
  readonly #verticalExpandedMinimumWidth: number;
  readonly #minimumSizes: {
    inspectorWidthWhenVertical: number,
    inspectorWidthWhenHorizontal: number,
    inspectorHeight: number,
  };
  readonly #setInspectorMinimumSize: (width: number, height: number) => void;
  #isVertical: boolean;
  #isMinimized = false;
  #showMode: ShowMode = ShowMode.ONLY_MAIN;
  #hasExplicitShowMode = false;
  #pendingDrawerSize: number|null = null;
  #pendingInitialTabId: string|null = null;
  #drawerSizeBeforeMinimize = 0;
  #wasVerticalAndMinimized = false;
  readonly #toggleOrientationButton: ToolbarButton;
  readonly #minimizeExpandButton: ToolbarButton;
  readonly #closeDrawerButton: ToolbarButton;
  readonly #moreTabsButton: ToolbarMenuButton|null;
  readonly #onExpandFromMinimized: () => void;
  readonly #onMinimizeFromTabInteraction: () => void;
  readonly #onTabSelected: (tabId: string) => void;
  readonly #isConsoleOpenInMainAndDrawer: (tabId: string) => boolean;

  constructor(options: InspectorDrawerViewOptions) {
    this.#isVertical = options.isVertical;
    this.#verticalExpandedMinimumWidth = options.verticalExpandedMinimumWidth;
    this.#minimumSizes = options.minimumSizes;
    this.#setInspectorMinimumSize = options.setInspectorMinimumSize;
    this.#onExpandFromMinimized = options.onExpandFromMinimized;
    this.#onMinimizeFromTabInteraction = options.onMinimizeFromTabInteraction;
    this.#onTabSelected = options.onTabSelected;
    this.#isConsoleOpenInMainAndDrawer = options.isConsoleOpenInMainAndDrawer;
    this.#drawerMinimizedSetting =
        Common.Settings.Settings.instance().createLocalSetting('inspector.drawer-minimized', false);
    this.tabbedLocation = ViewManager.instance().createTabbedLocation(options.revealDrawer, 'drawer-view', true, true, {
      isLocationVisible: options.isVisible,
      tabbedPaneFactory: () => new DrawerTabbedPane(),
      plusButton: {title: i18nString(UIStrings.moreTools), jslogContext: 'plus-button-drawer'},
    });
    // When the plus button is disabled we keep the legacy left-toolbar
    // three-dot menu so users can still reach hidden / addable tools.
    if (Root.Runtime.hostConfig.devToolsPlusButton?.enabled) {
      this.#moreTabsButton = null;
    } else {
      this.#moreTabsButton = this.tabbedLocation.enableMoreTabsButton();
      this.#moreTabsButton.setTitle(i18nString(UIStrings.moreTools));
    }
    this.tabbedPane = this.tabbedLocation.tabbedPane() as DrawerTabbedPane;
    this.#pendingInitialTabId = this.tabbedPane.selectedTabId;
    this.tabbedPane.element.classList.add('drawer-tabbed-pane');
    this.tabbedPane.element.setAttribute('jslog', `${VisualLogging.drawer()}`);

    this.#minimizeExpandButton = new ToolbarButton(
        i18nString(UIStrings.minimizeDrawer), options.isVertical ? 'right-panel-close' : 'bottom-panel-close');
    this.#minimizeExpandButton.element.setAttribute(
        'jslog', `${VisualLogging.toggle('minimize-drawer').track({click: true})}`);
    this.#minimizeExpandButton.addEventListener(ToolbarButton.Events.CLICK, options.onToggleMinimized);

    this.#closeDrawerButton = new ToolbarButton(i18nString(UIStrings.closeDrawer), 'cross');
    this.#closeDrawerButton.element.setAttribute(
        'jslog', `${VisualLogging.close('close-drawer').track({click: true})}`);
    this.#closeDrawerButton.addEventListener(ToolbarButton.Events.CLICK, options.onHide);

    this.#toggleOrientationButton = new ToolbarButton(
        i18nString(UIStrings.toggleDrawerOrientation), options.isVertical ? 'dock-bottom' : 'dock-right');
    this.#toggleOrientationButton.element.setAttribute(
        'jslog', `${VisualLogging.toggle('toggle-drawer-orientation').track({click: true})}`);
    this.#toggleOrientationButton.addEventListener(ToolbarButton.Events.CLICK, options.onToggleOrientation);

    if (options.enableOrientationToggle) {
      this.tabbedPane.rightToolbar().appendToolbarItem(this.#toggleOrientationButton);
    }
    this.tabbedPane.rightToolbar().appendToolbarItem(this.#minimizeExpandButton);
    this.tabbedPane.rightToolbar().appendToolbarItem(this.#closeDrawerButton);
    this.tabbedPane.addEventListener(TabbedPaneEvents.TabInvoked, this.#drawerTabInvoked, this);
    this.tabbedPane.addEventListener(TabbedPaneEvents.TabSelected, this.#drawerTabSelected, this);
    this.tabbedPane.setTabDelegate(options.tabDelegate);

    const drawerElement = this.tabbedPane.element;
    ARIAUtils.markAsComplementary(drawerElement);
    ARIAUtils.setLabel(drawerElement, options.drawerLabel);

    this.tabbedPane.headerElement().setAttribute('jslog', `${VisualLogging.toolbar('drawer').track({
                                                   drag: true,
                                                   keydown: 'ArrowUp|ArrowLeft|ArrowDown|ArrowRight|Enter|Space',
                                                 })}`);
    if (options.splitWidget) {
      this.attachSplitWidget(options.splitWidget);
    } else {
      this.#updatePresentation(false);
    }
  }

  attachSplitWidget(splitWidget: SplitWidget): void {
    if (this.#splitWidget === splitWidget) {
      return;
    }

    const previousSplitWidget = this.#splitWidget;
    if (previousSplitWidget) {
      previousSplitWidget.uninstallResizer(this.tabbedPane.headerElement());
      this.#isVertical = previousSplitWidget.isVertical();
      this.#showMode = previousSplitWidget.showMode();
      this.#isMinimized = previousSplitWidget.isSidebarMinimized();
      this.#hasExplicitShowMode = true;
      if (this.#pendingDrawerSize === null) {
        if (!this.#isMinimized && previousSplitWidget.sidebarSize() > 0) {
          this.#pendingDrawerSize = previousSplitWidget.sidebarSize();
        } else if (this.#isMinimized && this.#drawerSizeBeforeMinimize > 0) {
          this.#pendingDrawerSize = this.#drawerSizeBeforeMinimize;
        }
      }
      if (this.#showMode === ShowMode.ONLY_MAIN) {
        previousSplitWidget.hideSidebar(false);
      } else if (this.#showMode === ShowMode.ONLY_SIDEBAR) {
        previousSplitWidget.hideMain(false);
      }
      this.tabbedPane.detach();
    }

    this.#splitWidget = splitWidget;
    if (splitWidget.isVertical() !== this.#isVertical) {
      splitWidget.setVertical(this.#isVertical);
    }

    splitWidget.installResizer(this.tabbedPane.headerElement());
    splitWidget.setSidebarWidget(this.tabbedPane);

    const pendingDrawerSize = this.#pendingDrawerSize;
    this.#pendingDrawerSize = null;

    if (this.#hasExplicitShowMode) {
      this.applyState(this.#showMode, this.#isMinimized);
    } else {
      this.#showMode = splitWidget.showMode();
      if (this.#isMinimized && splitWidget.showMode() === ShowMode.BOTH) {
        this.setMinimized(true);
      } else {
        this.#isMinimized = false;
        this.#updatePresentation(false);
      }
    }

    if (pendingDrawerSize !== null) {
      if (this.isMinimized()) {
        this.#drawerSizeBeforeMinimize = pendingDrawerSize;
      } else {
        splitWidget.setSidebarSize(pendingDrawerSize);
      }
    }

    this.#reportPendingInitialTabIfVisible();
  }

  #reportPendingInitialTabIfVisible(): void {
    if (this.#pendingInitialTabId && this.showMode() !== ShowMode.ONLY_MAIN) {
      const tabId = this.#pendingInitialTabId;
      this.#pendingInitialTabId = null;
      this.#onTabSelected(tabId);
    }
  }

  showMode(): ShowMode {
    return this.#splitWidget ? this.#splitWidget.showMode() : this.#showMode;
  }

  sidebarIsShowing(): boolean {
    return this.#splitWidget ? this.#splitWidget.sidebarIsShowing() : this.#showMode !== ShowMode.ONLY_MAIN;
  }

  restoreMinimizedStateFromSettings(): void {
    if (!this.#drawerMinimizedSetting.get()) {
      return;
    }

    // The drawer starts hidden; show it first, then minimize.
    this.#showMode = ShowMode.BOTH;
    if (this.#splitWidget) {
      this.#splitWidget.showBoth();
    } else {
      this.#hasExplicitShowMode = true;
    }
    this.setMinimized(true);
    this.#reportPendingInitialTabIfVisible();
  }

  setVertical(shouldBeVertical: boolean): void {
    if (shouldBeVertical === this.isVertical()) {
      return;
    }

    const previousShowMode = this.showMode();
    const wasDrawerMinimized = this.isMinimized();

    this.#isVertical = shouldBeVertical;
    this.#splitWidget?.setVertical(shouldBeVertical);
    this.#updatePresentation(wasDrawerMinimized);
    if (this.#splitWidget || this.#hasExplicitShowMode) {
      this.applyState(previousShowMode, wasDrawerMinimized);
    }
  }

  applyState(showMode: ShowMode, minimized: boolean): void {
    this.#showMode = showMode;
    if (!this.#splitWidget) {
      this.#hasExplicitShowMode = true;
      const shouldBeMinimized = showMode === ShowMode.BOTH && minimized;
      if (showMode === ShowMode.BOTH) {
        this.setMinimized(shouldBeMinimized);
      } else {
        this.#isMinimized = false;
        this.#updatePresentation(false);
        this.#drawerMinimizedSetting.set(false);
      }
      this.#reportPendingInitialTabIfVisible();
      return;
    }

    if (this.#splitWidget.showMode() !== showMode) {
      switch (showMode) {
        case ShowMode.BOTH:
          this.#splitWidget.showBoth();
          break;
        case ShowMode.ONLY_MAIN:
          this.#splitWidget.hideSidebar();
          break;
        case ShowMode.ONLY_SIDEBAR:
          this.#splitWidget.hideMain();
          break;
      }
    }

    const shouldBeMinimized = showMode === ShowMode.BOTH && minimized;
    if (showMode === ShowMode.BOTH) {
      this.setMinimized(shouldBeMinimized);
      this.#reportPendingInitialTabIfVisible();
      return;
    }

    this.#isMinimized = false;
    this.#splitWidget.setSidebarMinimized(false);
    this.#splitWidget.setResizable(false);
    this.#updatePresentation(false);
    this.#drawerMinimizedSetting.set(false);
    this.#reportPendingInitialTabIfVisible();
  }

  show(hasTargetDrawer: boolean): void {
    const wasDrawerVisible = this.isVisibleForEvents();
    this.tabbedPane.setAutoSelectFirstItemOnShow(!hasTargetDrawer);
    this.#showMode = ShowMode.BOTH;
    if (this.#splitWidget) {
      this.#splitWidget.showBoth();
    } else {
      this.#hasExplicitShowMode = true;
    }
    this.#updatePresentation(this.isMinimized());
    this.#dispatchPaneVisibilityChangedIfNeeded(wasDrawerVisible);
    this.#reportPendingInitialTabIfVisible();
  }

  hide(): void {
    const wasDrawerVisible = this.isVisibleForEvents();
    const wasMinimized = this.isMinimized();
    this.#showMode = ShowMode.ONLY_MAIN;
    if (this.#splitWidget) {
      this.#splitWidget.hideSidebar(!wasMinimized);
    } else {
      this.#hasExplicitShowMode = true;
    }
    this.#isMinimized = false;
    this.#updatePresentation(false);
    if (wasMinimized) {
      this.#splitWidget?.setSidebarMinimized(false);
      this.#splitWidget?.setResizable(true);
    }
    this.#drawerMinimizedSetting.set(false);
    this.#dispatchPaneVisibilityChangedIfNeeded(wasDrawerVisible);
  }

  setMinimized(minimized: boolean): void {
    const wasDrawerVisible = this.isVisibleForEvents();
    if (minimized && !this.isMinimized() && this.#splitWidget) {
      this.#drawerSizeBeforeMinimize = this.#splitWidget.sidebarSize();
    }

    this.#isMinimized = minimized;
    this.#updatePresentation(minimized);
    this.#splitWidget?.setSidebarMinimized(minimized);
    this.#dispatchPaneVisibilityChangedIfNeeded(wasDrawerVisible);
    this.#splitWidget?.setResizable(!minimized);
    this.#drawerMinimizedSetting.set(minimized);
    if (!minimized && this.#drawerSizeBeforeMinimize > 0 && this.#splitWidget) {
      this.#splitWidget.setSidebarSize(this.#drawerSizeBeforeMinimize);
    }
  }

  drawerVisible(): boolean {
    return this.#splitWidget?.isShowing() ? this.tabbedPane.isShowing() : this.sidebarIsShowing();
  }

  isVisibleForEvents(): boolean {
    return this.sidebarIsShowing() && !this.isMinimized();
  }

  drawerSize(): number {
    return this.#splitWidget ? this.#splitWidget.sidebarSize() : (this.#pendingDrawerSize ?? 0);
  }

  setDrawerSize(size: number): void {
    if (!this.#splitWidget) {
      this.#pendingDrawerSize = size;
      return;
    }
    this.#splitWidget.setSidebarSize(size);
  }

  totalSize(): number {
    return this.#splitWidget ? this.#splitWidget.totalSize() : 0;
  }

  isMinimized(): boolean {
    return this.#splitWidget ? this.#splitWidget.isSidebarMinimized() : this.#isMinimized;
  }

  isVertical(): boolean {
    return this.#splitWidget ? this.#splitWidget.isVertical() : this.#isVertical;
  }

  updatePresentation({isVertical, isMinimized, verticalExpandedMinimumWidth}: InspectorDrawerPresentation): void {
    this.#toggleOrientationButton.setGlyph(isVertical ? 'dock-bottom' : 'dock-right');
    this.#updateMinimizeExpandButton(isVertical, isMinimized);

    const isVerticalAndMinimized = isVertical && isMinimized;
    if (isVerticalAndMinimized) {
      this.tabbedPane.setMinimumSize(VERTICAL_MINIMIZED_DRAWER_SIZE, VERTICAL_MINIMIZED_DRAWER_SIZE);
    } else if (isVertical) {
      this.tabbedPane.setMinimumSize(verticalExpandedMinimumWidth, VERTICAL_MINIMIZED_DRAWER_SIZE);
    } else {
      this.tabbedPane.setMinimumSize(0, VERTICAL_MINIMIZED_DRAWER_SIZE);
    }

    this.tabbedPane.setVerticalMinimized(isVerticalAndMinimized);

    if (this.#moreTabsButton) {
      this.#moreTabsButton.setVisible(!isVerticalAndMinimized);
    }

    if (!isVerticalAndMinimized && this.#wasVerticalAndMinimized) {
      this.tabbedPane.restoreAfterVerticalMinimized();
    }
    this.#wasVerticalAndMinimized = isVerticalAndMinimized;
  }

  #updateMinimizeExpandButton(isVertical: boolean, isMinimized: boolean): void {
    if (isMinimized) {
      this.#minimizeExpandButton.setGlyph(isVertical ? 'right-panel-open' : 'bottom-panel-open');
      this.#minimizeExpandButton.setTitle(i18nString(UIStrings.expandDrawer));
      return;
    }

    this.#minimizeExpandButton.setGlyph(isVertical ? 'right-panel-close' : 'bottom-panel-close');
    this.#minimizeExpandButton.setTitle(i18nString(UIStrings.minimizeDrawer));
  }

  #updatePresentation(minimized: boolean): void {
    const requireVerticalMinimumWidth = this.isVertical() && this.sidebarIsShowing() && !minimized;
    this.#setInspectorMinimumSize(requireVerticalMinimumWidth ? this.#minimumSizes.inspectorWidthWhenVertical :
                                                                this.#minimumSizes.inspectorWidthWhenHorizontal,
                                  this.#minimumSizes.inspectorHeight);
    const drawerIsVertical = this.isVertical();
    this.updatePresentation({
      isVertical: drawerIsVertical,
      isMinimized: minimized,
      verticalExpandedMinimumWidth: this.#verticalExpandedMinimumWidth,
    });
  }

  #dispatchPaneVisibilityChangedIfNeeded(wasDrawerVisible: boolean): void {
    const isDrawerVisible = this.isVisibleForEvents();
    if (wasDrawerVisible === isDrawerVisible) {
      return;
    }
    this.tabbedPane.dispatchEventToListeners(TabbedPaneEvents.PaneVisibilityChanged, {isVisible: isDrawerVisible});
  }

  #drawerTabSelected(event: Common.EventTarget.EventTargetEvent<EventData>): void {
    const {tabId, prevTabId, isUserGesture} = event.data;
    this.#pendingInitialTabId = null;
    this.#onTabSelected(tabId);

    if (this.#isConsoleOpenInMainAndDrawer(tabId)) {
      return;
    }

    if (isUserGesture && prevTabId && prevTabId !== tabId && this.isMinimized()) {
      this.#onExpandFromMinimized();
    }
  }

  #drawerTabInvoked(event: Common.EventTarget.EventTargetEvent<EventData>): void {
    const {tabId, isUserGesture} = event.data;
    if (isUserGesture && this.#isConsoleOpenInMainAndDrawer(tabId)) {
      if (!this.isMinimized()) {
        this.#onMinimizeFromTabInteraction();
      }
      return;
    }
    if (isUserGesture && this.isMinimized()) {
      this.#onExpandFromMinimized();
    }
  }
}
