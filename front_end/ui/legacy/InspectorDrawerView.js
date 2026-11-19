// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Root from '../../core/root/root.js';
import * as Buttons from '../components/buttons/buttons.js';
import { html, nothing, render } from '../lit/lit.js';
import * as VisualLogging from '../visual_logging/visual_logging.js';
import drawerTabbedPaneStyles from './inspectorDrawerTabbedPane.css.js';
import { Events as TabbedPaneEvents, TabbedPane } from './TabbedPane.js';
import { ViewManager } from './ViewManager.js';
const VERTICAL_MINIMIZED_DRAWER_SIZE = 27;
export const DEFAULT_DRAWER_TABBED_PANE_VIEW = (input, _output, target) => {
    // clang-format off
    render(html `<style>${drawerTabbedPaneStyles}</style>`, target, {
        container: {
            classes: [
                'drawer-tabbed-pane',
                ...(input.isVerticalMinimized ? ['drawer-minimized-vertical'] : []),
            ],
            attributes: {
                role: 'complementary',
                'aria-label': input.label,
                jslog: `${VisualLogging.drawer()}`,
            },
        },
    });
    // clang-format on
};
class DrawerTabbedPane extends TabbedPane {
    #label;
    #view;
    #isVerticalMinimized = false;
    #renderedVerticalMinimized = false;
    constructor(label, view = DEFAULT_DRAWER_TABBED_PANE_VIEW) {
        super();
        this.#label = label;
        this.#view = view;
        // Perform initial render synchronously so host classes, ARIA attributes, and
        // shadow styles are applied before callers or tests inspect `tabbedPane.element`.
        this.performUpdate();
    }
    setVerticalMinimized(isMinimized) {
        if (this.#isVerticalMinimized === isMinimized) {
            return;
        }
        this.#isVerticalMinimized = isMinimized;
        // Flush synchronously so callers such as showDrawer({focus: true}) and
        // drawerTabbedPane.focus() see the unhidden .tabbed-pane-content immediately.
        this.performUpdate();
    }
    performUpdate() {
        if (#view in this && this.element.shadowRoot) {
            this.#view({
                isVerticalMinimized: this.#isVerticalMinimized,
                label: this.#label,
            }, undefined, this.element.shadowRoot);
            const wasVerticalMinimized = this.#renderedVerticalMinimized;
            this.#renderedVerticalMinimized = this.#isVerticalMinimized;
            if (wasVerticalMinimized && !this.#isVerticalMinimized) {
                this.clearMeasuredWidths();
            }
        }
        super.performUpdate();
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
};
const str_ = i18n.i18n.registerUIStrings('ui/legacy/InspectorDrawerView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export const DEFAULT_TOOLBAR_VIEW = (input, _output, target) => {
    const minimizeExpandIcon = input.isMinimized ? (input.isVertical ? 'right-panel-open' : 'bottom-panel-open') :
        (input.isVertical ? 'right-panel-close' : 'bottom-panel-close');
    const minimizeExpandLabel = input.isMinimized ? i18nString(UIStrings.expandDrawer) : i18nString(UIStrings.minimizeDrawer);
    const orientationIcon = input.isVertical ? 'dock-bottom' : 'dock-right';
    const orientationLabel = i18nString(UIStrings.toggleDrawerOrientation);
    const closeLabel = i18nString(UIStrings.closeDrawer);
    // clang-format off
    render(html `
    ${input.showOrientationToggle ? html `
      <devtools-button
          class="toolbar-button"
          .iconName=${orientationIcon}
          .variant=${"icon" /* Buttons.Button.Variant.ICON */}
          .accessibleLabel=${orientationLabel}
          .title=${orientationLabel}
          jslog=${VisualLogging.toggle('toggle-drawer-orientation').track({ click: true })}
          @click=${() => input.onToggleOrientation()}></devtools-button>` : nothing}
    <devtools-button
        class="toolbar-button"
        .iconName=${minimizeExpandIcon}
        .variant=${"icon" /* Buttons.Button.Variant.ICON */}
        .accessibleLabel=${minimizeExpandLabel}
        .title=${minimizeExpandLabel}
        jslog=${VisualLogging.toggle('minimize-drawer').track({ click: true })}
        @click=${() => input.onToggleMinimized()}></devtools-button>
    <devtools-button
        class="toolbar-button"
        .iconName=${'cross'}
        .variant=${"icon" /* Buttons.Button.Variant.ICON */}
        .accessibleLabel=${closeLabel}
        .title=${closeLabel}
        jslog=${VisualLogging.close('close-drawer').track({ click: true })}
        @click=${() => input.onClose()}></devtools-button>
  `, target);
    // clang-format on
};
export class InspectorDrawerView {
    tabbedLocation;
    tabbedPane;
    #splitWidget = null;
    #drawerMinimizedSetting;
    #verticalExpandedMinimumWidth;
    #minimumSizes;
    #setInspectorMinimumSize;
    #isVertical;
    #isMinimized = false;
    #showMode = "OnlyMain" /* ShowMode.ONLY_MAIN */;
    #hasExplicitShowMode = false;
    #pendingDrawerSize = null;
    #pendingInitialTabId = null;
    #drawerSizeBeforeMinimize = 0;
    #toolbarView;
    #enableOrientationToggle;
    #onToggleMinimized;
    #onHide;
    #onToggleOrientation;
    #moreTabsButton;
    #onExpandFromMinimized;
    #onMinimizeFromTabInteraction;
    #onTabSelected;
    #isConsoleOpenInMainAndDrawer;
    constructor(options) {
        this.#isVertical = options.isVertical;
        this.#verticalExpandedMinimumWidth = options.verticalExpandedMinimumWidth;
        this.#minimumSizes = options.minimumSizes;
        this.#setInspectorMinimumSize = options.setInspectorMinimumSize;
        this.#toolbarView = options.toolbarView ?? DEFAULT_TOOLBAR_VIEW;
        this.#enableOrientationToggle = options.enableOrientationToggle;
        this.#onToggleMinimized = options.onToggleMinimized;
        this.#onHide = options.onHide;
        this.#onToggleOrientation = options.onToggleOrientation;
        this.#onExpandFromMinimized = options.onExpandFromMinimized;
        this.#onMinimizeFromTabInteraction = options.onMinimizeFromTabInteraction;
        this.#onTabSelected = options.onTabSelected;
        this.#isConsoleOpenInMainAndDrawer = options.isConsoleOpenInMainAndDrawer;
        this.#drawerMinimizedSetting =
            Common.Settings.Settings.instance().createLocalSetting('inspector.drawer-minimized', false);
        this.tabbedLocation = ViewManager.instance().createTabbedLocation(options.revealDrawer, 'drawer-view', true, true, {
            isLocationVisible: options.isVisible,
            tabbedPaneFactory: () => new DrawerTabbedPane(options.drawerLabel, options.drawerTabbedPaneView),
            plusButton: { title: i18nString(UIStrings.moreTools), jslogContext: 'plus-button-drawer' },
        });
        // When the plus button is disabled we keep the legacy left-toolbar
        // three-dot menu so users can still reach hidden / addable tools.
        if (Root.Runtime.hostConfig.devToolsPlusButton?.enabled) {
            this.#moreTabsButton = null;
        }
        else {
            this.#moreTabsButton = this.tabbedLocation.enableMoreTabsButton();
            this.#moreTabsButton.setTitle(i18nString(UIStrings.moreTools));
        }
        this.tabbedPane = this.tabbedLocation.tabbedPane();
        this.#pendingInitialTabId = this.tabbedPane.selectedTabId;
        this.tabbedPane.addEventListener(TabbedPaneEvents.TabInvoked, this.#drawerTabInvoked, this);
        this.tabbedPane.addEventListener(TabbedPaneEvents.TabSelected, this.#drawerTabSelected, this);
        this.tabbedPane.setTabDelegate(options.tabDelegate);
        this.tabbedPane.headerElement().setAttribute('jslog', `${VisualLogging.toolbar('drawer').track({
            drag: true,
            keydown: 'ArrowUp|ArrowLeft|ArrowDown|ArrowRight|Enter|Space',
        })}`);
        if (options.splitWidget) {
            this.attachSplitWidget(options.splitWidget);
        }
        else {
            this.#updatePresentation(false);
        }
    }
    attachSplitWidget(splitWidget) {
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
                }
                else if (this.#isMinimized && this.#drawerSizeBeforeMinimize > 0) {
                    this.#pendingDrawerSize = this.#drawerSizeBeforeMinimize;
                }
            }
            if (this.#showMode === "OnlyMain" /* ShowMode.ONLY_MAIN */) {
                previousSplitWidget.hideSidebar(false);
            }
            else if (this.#showMode === "OnlySidebar" /* ShowMode.ONLY_SIDEBAR */) {
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
        }
        else {
            this.#showMode = splitWidget.showMode();
            if (this.#isMinimized && splitWidget.showMode() === "Both" /* ShowMode.BOTH */) {
                this.setMinimized(true);
            }
            else {
                this.#isMinimized = false;
                this.#updatePresentation(false);
            }
        }
        if (pendingDrawerSize !== null) {
            if (this.isMinimized()) {
                this.#drawerSizeBeforeMinimize = pendingDrawerSize;
            }
            else {
                splitWidget.setSidebarSize(pendingDrawerSize);
            }
        }
        this.#reportPendingInitialTabIfVisible();
    }
    #reportPendingInitialTabIfVisible() {
        if (this.#pendingInitialTabId && this.showMode() !== "OnlyMain" /* ShowMode.ONLY_MAIN */) {
            const tabId = this.#pendingInitialTabId;
            this.#pendingInitialTabId = null;
            this.#onTabSelected(tabId);
        }
    }
    showMode() {
        return this.#splitWidget ? this.#splitWidget.showMode() : this.#showMode;
    }
    sidebarIsShowing() {
        return this.#splitWidget ? this.#splitWidget.sidebarIsShowing() : this.#showMode !== "OnlyMain" /* ShowMode.ONLY_MAIN */;
    }
    restoreMinimizedStateFromSettings() {
        if (!this.#drawerMinimizedSetting.get()) {
            return;
        }
        // The drawer starts hidden; show it first, then minimize.
        this.#showMode = "Both" /* ShowMode.BOTH */;
        if (this.#splitWidget) {
            this.#splitWidget.showBoth();
        }
        else {
            this.#hasExplicitShowMode = true;
        }
        this.setMinimized(true);
        this.#reportPendingInitialTabIfVisible();
    }
    setVertical(shouldBeVertical) {
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
    applyState(showMode, minimized) {
        const wasDrawerVisible = this.#showMode !== "OnlyMain" /* ShowMode.ONLY_MAIN */ && !this.#isMinimized;
        this.#showMode = showMode;
        if (!this.#splitWidget) {
            this.#hasExplicitShowMode = true;
            const shouldBeMinimized = showMode === "Both" /* ShowMode.BOTH */ && minimized;
            if (showMode === "Both" /* ShowMode.BOTH */) {
                this.setMinimized(shouldBeMinimized);
            }
            else {
                this.#isMinimized = false;
                this.#updatePresentation(false);
                this.#drawerMinimizedSetting.set(false);
            }
            this.#reportPendingInitialTabIfVisible();
            return;
        }
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
        const shouldBeMinimized = showMode === "Both" /* ShowMode.BOTH */ && minimized;
        if (showMode === "Both" /* ShowMode.BOTH */) {
            this.#setMinimizedInternal(shouldBeMinimized, wasDrawerVisible);
            this.#reportPendingInitialTabIfVisible();
            return;
        }
        this.#isMinimized = false;
        this.#splitWidget.setSidebarMinimized(false);
        this.#splitWidget.setResizable(false);
        this.#updatePresentation(false);
        this.#drawerMinimizedSetting.set(false);
        this.#dispatchPaneVisibilityChangedIfNeeded(wasDrawerVisible);
        this.#reportPendingInitialTabIfVisible();
    }
    show(hasTargetDrawer) {
        const wasDrawerVisible = this.isVisibleForEvents();
        this.tabbedPane.setAutoSelectFirstItemOnShow(!hasTargetDrawer);
        this.#showMode = "Both" /* ShowMode.BOTH */;
        if (this.#splitWidget) {
            this.#splitWidget.showBoth();
        }
        else {
            this.#hasExplicitShowMode = true;
        }
        this.#updatePresentation(this.isMinimized());
        this.#dispatchPaneVisibilityChangedIfNeeded(wasDrawerVisible);
        this.#reportPendingInitialTabIfVisible();
    }
    hide() {
        const wasDrawerVisible = this.isVisibleForEvents();
        const wasMinimized = this.isMinimized();
        this.#showMode = "OnlyMain" /* ShowMode.ONLY_MAIN */;
        if (this.#splitWidget) {
            this.#splitWidget.hideSidebar(!wasMinimized);
        }
        else {
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
    setMinimized(minimized) {
        this.#setMinimizedInternal(minimized, this.isVisibleForEvents());
    }
    #setMinimizedInternal(minimized, wasDrawerVisible) {
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
    drawerVisible() {
        return this.#splitWidget?.isShowing() ? this.tabbedPane.isShowing() : this.sidebarIsShowing();
    }
    isVisibleForEvents() {
        return this.sidebarIsShowing() && !this.isMinimized();
    }
    drawerSize() {
        return this.#splitWidget ? this.#splitWidget.sidebarSize() : (this.#pendingDrawerSize ?? 0);
    }
    setDrawerSize(size) {
        if (!this.#splitWidget) {
            this.#pendingDrawerSize = size;
            return;
        }
        this.#splitWidget.setSidebarSize(size);
    }
    totalSize() {
        return this.#splitWidget ? this.#splitWidget.totalSize() : 0;
    }
    isMinimized() {
        return this.#splitWidget ? this.#splitWidget.isSidebarMinimized() : this.#isMinimized;
    }
    isVertical() {
        return this.#splitWidget ? this.#splitWidget.isVertical() : this.#isVertical;
    }
    updatePresentation({ isVertical, isMinimized, verticalExpandedMinimumWidth }) {
        this.#toolbarView({
            isVertical,
            isMinimized,
            showOrientationToggle: this.#enableOrientationToggle,
            onToggleOrientation: this.#onToggleOrientation,
            onToggleMinimized: this.#onToggleMinimized,
            onClose: this.#onHide,
        }, undefined, this.tabbedPane.rightToolbar());
        const isVerticalAndMinimized = isVertical && isMinimized;
        if (isVerticalAndMinimized) {
            this.tabbedPane.setMinimumSize(VERTICAL_MINIMIZED_DRAWER_SIZE, VERTICAL_MINIMIZED_DRAWER_SIZE);
        }
        else if (isVertical) {
            this.tabbedPane.setMinimumSize(verticalExpandedMinimumWidth, VERTICAL_MINIMIZED_DRAWER_SIZE);
        }
        else {
            this.tabbedPane.setMinimumSize(0, VERTICAL_MINIMIZED_DRAWER_SIZE);
        }
        this.tabbedPane.setVerticalMinimized(isVerticalAndMinimized);
        if (this.#moreTabsButton) {
            this.#moreTabsButton.setVisible(!isVerticalAndMinimized);
        }
    }
    #updatePresentation(minimized) {
        const requireVerticalMinimumWidth = this.isVertical() && this.sidebarIsShowing() && !minimized;
        this.#setInspectorMinimumSize(requireVerticalMinimumWidth ? this.#minimumSizes.inspectorWidthWhenVertical :
            this.#minimumSizes.inspectorWidthWhenHorizontal, this.#minimumSizes.inspectorHeight);
        const drawerIsVertical = this.isVertical();
        this.updatePresentation({
            isVertical: drawerIsVertical,
            isMinimized: minimized,
            verticalExpandedMinimumWidth: this.#verticalExpandedMinimumWidth,
        });
    }
    #dispatchPaneVisibilityChangedIfNeeded(wasDrawerVisible) {
        const isDrawerVisible = this.isVisibleForEvents();
        if (wasDrawerVisible === isDrawerVisible) {
            return;
        }
        this.tabbedPane.dispatchEventToListeners(TabbedPaneEvents.PaneVisibilityChanged, { isVisible: isDrawerVisible });
    }
    #drawerTabSelected(event) {
        const { tabId, prevTabId, isUserGesture } = event.data;
        this.#pendingInitialTabId = null;
        this.#onTabSelected(tabId);
        if (this.#isConsoleOpenInMainAndDrawer(tabId)) {
            return;
        }
        if (isUserGesture && prevTabId && prevTabId !== tabId && this.isMinimized()) {
            this.#onExpandFromMinimized();
        }
    }
    #drawerTabInvoked(event) {
        const { tabId, isUserGesture } = event.data;
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
//# sourceMappingURL=InspectorDrawerView.js.map