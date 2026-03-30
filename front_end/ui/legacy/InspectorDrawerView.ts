// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
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
   * @description Title of more tabs button in the drawer view.
   */
  moreTools: 'More Tools',
  /**
   * @description Text that appears when hover over the minimize button on the drawer view.
   */
  minimizeDrawer: 'Minimize drawer',
  /**
   * @description Text that appears when hover over the expand button on the drawer view.
   */
  expandDrawer: 'Expand drawer',
  /**
   * @description Text that appears when hover over the close button on the drawer view.
   */
  closeDrawer: 'Close drawer',
  /**
   * @description Text that appears when hover the toggle orientation button.
   */
  toggleDrawerOrientation: 'Toggle drawer orientation',
} as const;

const str_ = i18n.i18n.registerUIStrings('ui/legacy/InspectorDrawerView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

interface InspectorDrawerViewOptions {
  splitWidget: SplitWidget;
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
}

interface InspectorDrawerPresentation {
  isVertical: boolean;
  isMinimized: boolean;
  verticalExpandedMinimumWidth: number;
}

export class InspectorDrawerView {
  readonly tabbedLocation: TabbedViewLocation;
  readonly tabbedPane: DrawerTabbedPane;
  readonly #splitWidget: SplitWidget;
  readonly #drawerMinimizedSetting: Common.Settings.Setting<boolean>;
  readonly #verticalExpandedMinimumWidth: number;
  readonly #minimumSizes: {
    inspectorWidthWhenVertical: number,
    inspectorWidthWhenHorizontal: number,
    inspectorHeight: number,
  };
  readonly #setInspectorMinimumSize: (width: number, height: number) => void;
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
    this.#splitWidget = options.splitWidget;
    this.#verticalExpandedMinimumWidth = options.verticalExpandedMinimumWidth;
    this.#minimumSizes = options.minimumSizes;
    this.#setInspectorMinimumSize = options.setInspectorMinimumSize;
    this.#onExpandFromMinimized = options.onExpandFromMinimized;
    this.#onMinimizeFromTabInteraction = options.onMinimizeFromTabInteraction;
    this.#onTabSelected = options.onTabSelected;
    this.#isConsoleOpenInMainAndDrawer = options.isConsoleOpenInMainAndDrawer;
    this.#drawerMinimizedSetting =
        Common.Settings.Settings.instance().createLocalSetting('inspector.drawer-minimized', false);
    this.tabbedLocation = ViewManager.instance().createTabbedLocation(
        options.revealDrawer, 'drawer-view', true, true, undefined, options.isVisible, () => new DrawerTabbedPane());
    this.#moreTabsButton = this.tabbedLocation.enableMoreTabsButton();
    this.#moreTabsButton.setTitle(i18nString(UIStrings.moreTools));
    this.tabbedPane = this.tabbedLocation.tabbedPane() as DrawerTabbedPane;
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
    const selectedDrawerTab = this.tabbedPane.selectedTabId;
    if (this.#splitWidget.showMode() !== ShowMode.ONLY_MAIN && selectedDrawerTab) {
      this.#onTabSelected(selectedDrawerTab);
    }

    const drawerElement = this.tabbedPane.element;
    ARIAUtils.markAsComplementary(drawerElement);
    ARIAUtils.setLabel(drawerElement, options.drawerLabel);
    this.#splitWidget.installResizer(this.tabbedPane.headerElement());
    this.#splitWidget.setSidebarWidget(this.tabbedPane);

    this.tabbedPane.headerElement().setAttribute('jslog', `${VisualLogging.toolbar('drawer').track({
                                                   drag: true,
                                                   keydown: 'ArrowUp|ArrowLeft|ArrowDown|ArrowRight|Enter|Space',
                                                 })}`);
    this.#updatePresentation(false);
  }

  restoreMinimizedStateFromSettings(): void {
    if (!this.#drawerMinimizedSetting.get()) {
      return;
    }

    // The drawer starts hidden; show it first, then minimize.
    this.#splitWidget.showBoth();
    this.setMinimized(true);
  }

  setVertical(shouldBeVertical: boolean): void {
    if (shouldBeVertical === this.#splitWidget.isVertical()) {
      return;
    }

    const previousShowMode = this.#splitWidget.showMode();
    const wasDrawerMinimized = this.isMinimized();

    this.#splitWidget.setVertical(shouldBeVertical);
    this.#updatePresentation(wasDrawerMinimized);
    this.applyState(previousShowMode, wasDrawerMinimized);
  }

  applyState(showMode: ShowMode, minimized: boolean): void {
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
      return;
    }

    this.#splitWidget.setSidebarMinimized(false);
    this.#splitWidget.setResizable(false);
    this.#updatePresentation(false);
    this.#drawerMinimizedSetting.set(false);
  }

  show(hasTargetDrawer: boolean): void {
    const wasDrawerVisible = this.isVisibleForEvents();
    this.tabbedPane.setAutoSelectFirstItemOnShow(!hasTargetDrawer);
    this.#splitWidget.showBoth();
    this.#dispatchPaneVisibilityChangedIfNeeded(wasDrawerVisible);
  }

  hide(): void {
    const wasDrawerVisible = this.isVisibleForEvents();
    const wasMinimized = this.isMinimized();
    this.#splitWidget.hideSidebar(!wasMinimized);
    if (wasMinimized) {
      this.#updatePresentation(false);
      this.#splitWidget.setSidebarMinimized(false);
      this.#splitWidget.setResizable(true);
    }
    this.#drawerMinimizedSetting.set(false);
    this.#dispatchPaneVisibilityChangedIfNeeded(wasDrawerVisible);
  }

  setMinimized(minimized: boolean): void {
    const wasDrawerVisible = this.isVisibleForEvents();
    if (minimized && !this.isMinimized()) {
      this.#drawerSizeBeforeMinimize = this.#splitWidget.sidebarSize();
    }

    this.#updatePresentation(minimized);
    this.#splitWidget.setSidebarMinimized(minimized);
    this.#dispatchPaneVisibilityChangedIfNeeded(wasDrawerVisible);
    this.#splitWidget.setResizable(!minimized);
    this.#drawerMinimizedSetting.set(minimized);
    if (!minimized && this.#drawerSizeBeforeMinimize > 0) {
      this.#splitWidget.setSidebarSize(this.#drawerSizeBeforeMinimize);
    }
  }

  drawerVisible(): boolean {
    return this.tabbedPane.isShowing();
  }

  isVisibleForEvents(): boolean {
    return this.#splitWidget.sidebarIsShowing() && !this.isMinimized();
  }

  drawerSize(): number {
    return this.#splitWidget.sidebarSize();
  }

  setDrawerSize(size: number): void {
    this.#splitWidget.setSidebarSize(size);
  }

  totalSize(): number {
    return this.#splitWidget.totalSize();
  }

  isMinimized(): boolean {
    return this.#splitWidget.isSidebarMinimized();
  }

  isVertical(): boolean {
    return this.#splitWidget.isVertical();
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
    const drawerIsVertical = this.#splitWidget.isVertical();
    this.#setInspectorMinimumSize(
        drawerIsVertical ? this.#minimumSizes.inspectorWidthWhenVertical :
                           this.#minimumSizes.inspectorWidthWhenHorizontal,
        this.#minimumSizes.inspectorHeight);
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
