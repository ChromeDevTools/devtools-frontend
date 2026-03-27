// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as i18n from '../../core/i18n/i18n.js';
import * as VisualLogging from '../visual_logging/visual_logging.js';
import * as ARIAUtils from './ARIAUtils.js';
import drawerTabbedPaneStyles from './inspectorDrawerTabbedPane.css.js';
import { Events as TabbedPaneEvents, TabbedPane } from './TabbedPane.js';
import { ToolbarButton } from './Toolbar.js';
import { ViewManager } from './ViewManager.js';
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
};
const str_ = i18n.i18n.registerUIStrings('ui/legacy/InspectorDrawerView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class InspectorDrawerView {
    tabbedLocation;
    tabbedPane;
    #splitWidget;
    #verticalExpandedMinimumWidth;
    #minimumSizes;
    #setInspectorMinimumSize;
    #toggleOrientationButton;
    #closeDrawerButton;
    #moreTabsButton;
    #onTabSelected;
    constructor(options) {
        this.#splitWidget = options.splitWidget;
        this.#verticalExpandedMinimumWidth = options.verticalExpandedMinimumWidth;
        this.#minimumSizes = options.minimumSizes;
        this.#setInspectorMinimumSize = options.setInspectorMinimumSize;
        this.#onTabSelected = options.onTabSelected;
        this.tabbedLocation = ViewManager.instance().createTabbedLocation(options.revealDrawer, 'drawer-view', true, true, undefined, options.isVisible, () => new DrawerTabbedPane());
        this.#moreTabsButton = this.tabbedLocation.enableMoreTabsButton();
        this.#moreTabsButton.setTitle(i18nString(UIStrings.moreTools));
        this.tabbedPane = this.tabbedLocation.tabbedPane();
        this.tabbedPane.element.classList.add('drawer-tabbed-pane');
        this.tabbedPane.element.setAttribute('jslog', `${VisualLogging.drawer()}`);
        this.#closeDrawerButton = new ToolbarButton(i18nString(UIStrings.closeDrawer), 'cross');
        this.#closeDrawerButton.element.setAttribute('jslog', `${VisualLogging.close().track({ click: true })}`);
        this.#closeDrawerButton.addEventListener("Click" /* ToolbarButton.Events.CLICK */, options.onHide);
        this.#toggleOrientationButton = new ToolbarButton(i18nString(UIStrings.toggleDrawerOrientation), options.isVertical ? 'dock-bottom' : 'dock-right');
        this.#toggleOrientationButton.element.setAttribute('jslog', `${VisualLogging.toggle('toggle-drawer-orientation').track({ click: true })}`);
        this.#toggleOrientationButton.addEventListener("Click" /* ToolbarButton.Events.CLICK */, options.onToggleOrientation);
        if (options.enableOrientationToggle) {
            this.tabbedPane.rightToolbar().appendToolbarItem(this.#toggleOrientationButton);
        }
        this.tabbedPane.rightToolbar().appendToolbarItem(this.#closeDrawerButton);
        this.tabbedPane.addEventListener(TabbedPaneEvents.TabSelected, this.#drawerTabSelected, this);
        this.tabbedPane.setTabDelegate(options.tabDelegate);
        const selectedDrawerTab = this.tabbedPane.selectedTabId;
        if (this.#splitWidget.showMode() !== "OnlyMain" /* ShowMode.ONLY_MAIN */ && selectedDrawerTab) {
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
    setVertical(shouldBeVertical) {
        if (shouldBeVertical === this.#splitWidget.isVertical()) {
            return;
        }
        const previousShowMode = this.#splitWidget.showMode();
        this.#splitWidget.setVertical(shouldBeVertical);
        this.#updatePresentation();
        this.applyState(previousShowMode);
    }
    applyState(showMode) {
        if (this.#splitWidget.showMode() !== showMode) {
            switch (showMode) {
                case "Both" /* ShowMode.BOTH */:
                    this.#splitWidget.showBoth();
                    break;
                case "OnlyMain" /* ShowMode.ONLY_MAIN */:
                    this.#splitWidget.hideSidebar();
                    break;
                case "OnlySidebar" /* ShowMode.ONLY_SIDEBAR */:
                    this.#splitWidget.hideMain();
                    break;
            }
        }
        this.#updatePresentation();
    }
    show(hasTargetDrawer) {
        this.tabbedPane.setAutoSelectFirstItemOnShow(!hasTargetDrawer);
        this.#splitWidget.showBoth();
    }
    hide() {
        this.#splitWidget.hideSidebar(true);
    }
    drawerVisible() {
        return this.tabbedPane.isShowing();
    }
    drawerSize() {
        return this.#splitWidget.sidebarSize();
    }
    setDrawerSize(size) {
        this.#splitWidget.setSidebarSize(size);
    }
    totalSize() {
        return this.#splitWidget.totalSize();
    }
    isVertical() {
        return this.#splitWidget.isVertical();
    }
    updatePresentation(isVertical) {
        this.#toggleOrientationButton.setGlyph(isVertical ? 'dock-bottom' : 'dock-right');
        if (isVertical) {
            this.tabbedPane.setMinimumSize(this.#verticalExpandedMinimumWidth, 27);
        }
        else {
            this.tabbedPane.setMinimumSize(0, 27);
        }
    }
    #updatePresentation() {
        const drawerIsVertical = this.#splitWidget.isVertical();
        this.#setInspectorMinimumSize(drawerIsVertical ? this.#minimumSizes.inspectorWidthWhenVertical :
            this.#minimumSizes.inspectorWidthWhenHorizontal, this.#minimumSizes.inspectorHeight);
        this.updatePresentation(drawerIsVertical);
    }
    #drawerTabSelected(event) {
        const { tabId } = event.data;
        this.#onTabSelected(tabId);
    }
}
//# sourceMappingURL=InspectorDrawerView.js.map