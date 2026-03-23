// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as VisualLogging from '../visual_logging/visual_logging.js';

import * as ARIAUtils from './ARIAUtils.js';
import drawerTabbedPaneStyles from './inspectorDrawerTabbedPane.css.js';
import {ShowMode, type SplitWidget} from './SplitWidget.js';
import {type EventData, Events as TabbedPaneEvents, TabbedPane, type TabbedPaneTabDelegate} from './TabbedPane.js';
import {ToolbarButton, type ToolbarMenuButton} from './Toolbar.js';
import type {TabbedViewLocation} from './View.js';
import {ViewManager} from './ViewManager.js';

class DrawerTabbedPane extends TabbedPane {
  constructor() {
    super();
    this.registerRequiredCSS(drawerTabbedPaneStyles);
  }
}

const UIStrings = {
  /**
   * @description Title of more tabs button in the drawer view.
   */
  moreTools: 'More Tools',
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
  onHide: () => void;
  onToggleOrientation: () => void;
  onTabSelected: (tabId: string) => void;
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

export class InspectorDrawerView {
  readonly tabbedLocation: TabbedViewLocation;
  readonly tabbedPane: DrawerTabbedPane;
  readonly #splitWidget: SplitWidget;
  readonly #verticalExpandedMinimumWidth: number;
  readonly #minimumSizes: {
    inspectorWidthWhenVertical: number,
    inspectorWidthWhenHorizontal: number,
    inspectorHeight: number,
  };
  readonly #setInspectorMinimumSize: (width: number, height: number) => void;
  readonly #toggleOrientationButton: ToolbarButton;
  readonly #closeDrawerButton: ToolbarButton;
  readonly #moreTabsButton: ToolbarMenuButton|null;
  readonly #onTabSelected: (tabId: string) => void;

  constructor(options: InspectorDrawerViewOptions) {
    this.#splitWidget = options.splitWidget;
    this.#verticalExpandedMinimumWidth = options.verticalExpandedMinimumWidth;
    this.#minimumSizes = options.minimumSizes;
    this.#setInspectorMinimumSize = options.setInspectorMinimumSize;
    this.#onTabSelected = options.onTabSelected;
    this.tabbedLocation = ViewManager.instance().createTabbedLocation(
        options.revealDrawer, 'drawer-view', true, true, undefined, options.isVisible, () => new DrawerTabbedPane());
    this.#moreTabsButton = this.tabbedLocation.enableMoreTabsButton();
    this.#moreTabsButton.setTitle(i18nString(UIStrings.moreTools));
    this.tabbedPane = this.tabbedLocation.tabbedPane() as DrawerTabbedPane;
    this.tabbedPane.element.classList.add('drawer-tabbed-pane');
    this.tabbedPane.element.setAttribute('jslog', `${VisualLogging.drawer()}`);

    this.#closeDrawerButton = new ToolbarButton(i18nString(UIStrings.closeDrawer), 'cross');
    this.#closeDrawerButton.element.setAttribute('jslog', `${VisualLogging.close().track({click: true})}`);
    this.#closeDrawerButton.addEventListener(ToolbarButton.Events.CLICK, options.onHide);

    this.#toggleOrientationButton = new ToolbarButton(
        i18nString(UIStrings.toggleDrawerOrientation), options.isVertical ? 'dock-bottom' : 'dock-right');
    this.#toggleOrientationButton.element.setAttribute(
        'jslog', `${VisualLogging.toggle('toggle-drawer-orientation').track({click: true})}`);
    this.#toggleOrientationButton.addEventListener(ToolbarButton.Events.CLICK, options.onToggleOrientation);

    if (options.enableOrientationToggle) {
      this.tabbedPane.rightToolbar().appendToolbarItem(this.#toggleOrientationButton);
    }
    this.tabbedPane.rightToolbar().appendToolbarItem(this.#closeDrawerButton);
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
    this.#updatePresentation();
  }

  setVertical(shouldBeVertical: boolean): void {
    if (shouldBeVertical === this.#splitWidget.isVertical()) {
      return;
    }

    const previousShowMode = this.#splitWidget.showMode();
    this.#splitWidget.setVertical(shouldBeVertical);
    this.#updatePresentation();
    this.applyState(previousShowMode);
  }

  applyState(showMode: ShowMode): void {
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
    this.#updatePresentation();
  }

  show(hasTargetDrawer: boolean): void {
    this.tabbedPane.setAutoSelectFirstItemOnShow(!hasTargetDrawer);
    this.#splitWidget.showBoth();
  }

  hide(): void {
    this.#splitWidget.hideSidebar(true);
  }

  drawerVisible(): boolean {
    return this.tabbedPane.isShowing();
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

  isVertical(): boolean {
    return this.#splitWidget.isVertical();
  }

  updatePresentation(isVertical: boolean): void {
    this.#toggleOrientationButton.setGlyph(isVertical ? 'dock-bottom' : 'dock-right');

    if (isVertical) {
      this.tabbedPane.setMinimumSize(this.#verticalExpandedMinimumWidth, 27);
    } else {
      this.tabbedPane.setMinimumSize(0, 27);
    }
  }

  #updatePresentation(): void {
    const drawerIsVertical = this.#splitWidget.isVertical();
    this.#setInspectorMinimumSize(
        drawerIsVertical ? this.#minimumSizes.inspectorWidthWhenVertical :
                           this.#minimumSizes.inspectorWidthWhenHorizontal,
        this.#minimumSizes.inspectorHeight);
    this.updatePresentation(drawerIsVertical);
  }

  #drawerTabSelected(event: Common.EventTarget.EventTargetEvent<EventData>): void {
    const {tabId} = event.data;
    this.#onTabSelected(tabId);
  }
}
