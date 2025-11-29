// Copyright 2010 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import './Toolbar.js';
import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as Geometry from '../../models/geometry/geometry.js';
import * as Annotations from '../../ui/components/annotations/annotations.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import { createIcon, Icon } from '../kit/kit.js';
import * as ARIAUtils from './ARIAUtils.js';
import { ContextMenu } from './ContextMenu.js';
import tabbedPaneStyles from './tabbedPane.css.js';
import { Tooltip } from './Tooltip.js';
import { installDragHandle } from './UIUtils.js';
import { VBox } from './Widget.js';
import { ZoomManager } from './ZoomManager.js';
const UIStrings = {
    /**
     * @description The aria label for the button to open more tabs at the right tabbed pane in Elements tools
     */
    moreTabs: 'More tabs',
    /**
     * @description Text in Tabbed Pane
     * @example {tab} PH1
     */
    closeS: 'Close {PH1}',
    /**
     * @description Text to close something
     */
    close: 'Close',
    /**
     * @description Text on a menu option to close other drawers when right click on a drawer title
     */
    closeOthers: 'Close others',
    /**
     * @description Text on a menu option to close the drawer to the right when right click on a drawer title
     */
    closeTabsToTheRight: 'Close tabs to the right',
    /**
     * @description Text on a menu option to close all the drawers except Console when right click on a drawer title
     */
    closeAll: 'Close all',
    /**
     * @description Indicates that a tab contains a preview feature (i.e., a beta / experimental feature).
     */
    previewFeature: 'Preview feature',
    /**
     * @description Indicates that a tab contains annotation(s).
     */
    panelContainsAnnotation: 'This panel has one or more annotations',
    /**
     * @description Text to move a tab forwar.
     */
    moveTabRight: 'Move right',
    /**
     * @description Text to move a tab backward.
     */
    moveTabLeft: 'Move left',
};
const str_ = i18n.i18n.registerUIStrings('ui/legacy/TabbedPane.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class TabbedPane extends Common.ObjectWrapper.eventMixin(VBox) {
    #headerElement;
    headerContentsElement;
    tabSlider;
    tabsElement;
    #contentElement;
    tabs;
    tabsHistory;
    tabsById;
    currentTabLocked;
    autoSelectFirstItemOnShow;
    triggerDropDownTimeout;
    dropDownButton;
    currentDevicePixelRatio;
    shrinkableTabs;
    verticalTabLayout;
    closeableTabs;
    delegate;
    currentTab;
    sliderEnabled;
    placeholderElement;
    focusedPlaceholderElement;
    placeholderContainerElement;
    lastSelectedOverflowTab;
    measuredDropDownButtonWidth;
    #leftToolbar;
    #rightToolbar;
    allowTabReorder;
    automaticReorder;
    constructor(element) {
        super(element, { useShadowDom: true });
        this.registerRequiredCSS(tabbedPaneStyles);
        this.element.classList.add('tabbed-pane');
        this.contentElement.classList.add('tabbed-pane-shadow');
        this.contentElement.tabIndex = -1;
        this.setDefaultFocusedElement(this.contentElement);
        this.#headerElement = this.contentElement.createChild('div', 'tabbed-pane-header');
        this.headerContentsElement = this.#headerElement.createChild('div', 'tabbed-pane-header-contents');
        this.tabSlider = document.createElement('div');
        this.tabSlider.classList.add('tabbed-pane-tab-slider');
        this.tabsElement = this.headerContentsElement.createChild('div', 'tabbed-pane-header-tabs');
        this.tabsElement.setAttribute('role', 'tablist');
        this.tabsElement.addEventListener('keydown', this.keyDown.bind(this), false);
        this.#contentElement = this.contentElement.createChild('div', 'tabbed-pane-content');
        this.#contentElement.createChild('slot');
        this.tabs = [];
        this.tabsHistory = [];
        this.tabsById = new Map();
        this.currentTabLocked = false;
        this.autoSelectFirstItemOnShow = true;
        this.triggerDropDownTimeout = null;
        this.dropDownButton = this.createDropDownButton();
        this.currentDevicePixelRatio = window.devicePixelRatio;
        ZoomManager.instance().addEventListener("ZoomChanged" /* ZoomManagerEvents.ZOOM_CHANGED */, this.zoomChanged, this);
        this.makeTabSlider();
        if (Annotations.AnnotationRepository.annotationsEnabled()) {
            Annotations.AnnotationRepository.instance().addEventListener("AnnotationAdded" /* Annotations.Events.ANNOTATION_ADDED */, this.#onAnnotationAdded, this);
        }
    }
    setAccessibleName(name) {
        ARIAUtils.setLabel(this.tabsElement, name);
    }
    setCurrentTabLocked(locked) {
        this.currentTabLocked = locked;
        this.#headerElement.classList.toggle('locked', this.currentTabLocked);
    }
    setAutoSelectFirstItemOnShow(autoSelect) {
        this.autoSelectFirstItemOnShow = autoSelect;
    }
    get visibleView() {
        return this.currentTab ? this.currentTab.view : null;
    }
    tabIds() {
        return this.tabs.map(tab => tab.id);
    }
    tabIndex(tabId) {
        return this.tabs.findIndex(tab => tab.id === tabId);
    }
    tabViews() {
        return this.tabs.map(tab => tab.view);
    }
    tabView(tabId) {
        const tab = this.tabsById.get(tabId);
        return tab ? tab.view : null;
    }
    get selectedTabId() {
        return this.currentTab ? this.currentTab.id : null;
    }
    setShrinkableTabs(shrinkableTabs) {
        this.shrinkableTabs = shrinkableTabs;
    }
    makeVerticalTabLayout() {
        this.verticalTabLayout = true;
        this.setTabSlider(false);
        this.contentElement.classList.add('vertical-tab-layout');
        this.invalidateConstraints();
    }
    setCloseableTabs(closeableTabs) {
        this.closeableTabs = closeableTabs;
    }
    focus() {
        if (this.visibleView) {
            this.visibleView.focus();
        }
        else {
            this.contentElement.focus();
        }
    }
    focusSelectedTabHeader() {
        const selectedTab = this.currentTab;
        if (selectedTab) {
            selectedTab.tabElement.focus();
        }
    }
    headerElement() {
        return this.#headerElement;
    }
    tabbedPaneContentElement() {
        return this.#contentElement;
    }
    setTabDelegate(delegate) {
        const tabs = this.tabs.slice();
        for (let i = 0; i < tabs.length; ++i) {
            tabs[i].setDelegate(delegate);
        }
        this.delegate = delegate;
    }
    appendTab(id, tabTitle, view, tabTooltip, userGesture, isCloseable, isPreviewFeature, index, jslogContext) {
        const closeable = typeof isCloseable === 'boolean' ? isCloseable : Boolean(this.closeableTabs);
        const tab = new TabbedPaneTab(this, id, tabTitle, closeable, Boolean(isPreviewFeature), view, tabTooltip, jslogContext);
        tab.setDelegate(this.delegate);
        console.assert(!this.tabsById.has(id), `Tabbed pane already contains a tab with id '${id}'`);
        this.tabsById.set(id, tab);
        tab.tabElement.tabIndex = -1;
        tab.tabElement.setAttribute('jslog', `${VisualLogging.panelTabHeader().track({ click: true, drag: true }).context(tab.jslogContext)}`);
        if (index !== undefined) {
            this.tabs.splice(index, 0, tab);
        }
        else {
            this.tabs.push(tab);
        }
        this.tabsHistory.push(tab);
        if (this.tabsHistory[0] === tab && this.isShowing()) {
            this.selectTab(tab.id, userGesture);
        }
        this.requestUpdate();
    }
    closeTab(id, userGesture) {
        this.closeTabs([id], userGesture);
    }
    closeTabs(ids, userGesture) {
        if (ids.length === 0) {
            return;
        }
        const focused = this.hasFocus();
        for (let i = 0; i < ids.length; ++i) {
            this.#closeTab(ids[i], userGesture);
        }
        this.requestUpdate();
        if (this.tabsHistory.length) {
            this.selectTab(this.tabsHistory[0].id, false);
        }
        if (focused) {
            this.focus();
        }
    }
    #closeTab(id, userGesture) {
        const tab = this.tabsById.get(id);
        if (!tab) {
            return;
        }
        if (userGesture && !tab.closeable) {
            return;
        }
        if (this.currentTab?.id === id) {
            this.hideCurrentTab();
        }
        this.tabsById.delete(id);
        this.tabsHistory.splice(this.tabsHistory.indexOf(tab), 1);
        this.tabs.splice(this.tabs.indexOf(tab), 1);
        if (tab.shown) {
            this.hideTabElement(tab);
        }
        const eventData = { prevTabId: undefined, tabId: id, view: tab.view, isUserGesture: userGesture };
        this.dispatchEventToListeners(Events.TabClosed, eventData);
        return true;
    }
    hasTab(tabId) {
        return this.tabsById.has(tabId);
    }
    otherTabs(id) {
        const result = [];
        for (let i = 0; i < this.tabs.length; ++i) {
            if (this.tabs[i].id !== id) {
                result.push(this.tabs[i].id);
            }
        }
        return result;
    }
    tabsToTheRight(id) {
        let index = -1;
        for (let i = 0; i < this.tabs.length; ++i) {
            if (this.tabs[i].id === id) {
                index = i;
                break;
            }
        }
        if (index === -1) {
            return [];
        }
        return this.tabs.slice(index + 1).map(function (tab) {
            return tab.id;
        });
    }
    viewHasFocus() {
        if (this.visibleView?.hasFocus()) {
            return true;
        }
        const root = this.contentElement.getComponentRoot();
        return root instanceof Document && this.contentElement === root.activeElement;
    }
    selectTab(id, userGesture, forceFocus) {
        if (this.currentTabLocked) {
            return false;
        }
        const focused = this.viewHasFocus();
        const tab = this.tabsById.get(id);
        if (!tab) {
            return false;
        }
        this.lastSelectedOverflowTab = tab;
        const eventData = {
            prevTabId: this.currentTab ? this.currentTab.id : undefined,
            tabId: id,
            view: tab.view,
            isUserGesture: userGesture,
        };
        this.dispatchEventToListeners(Events.TabInvoked, eventData);
        if (this.currentTab?.id === id) {
            return true;
        }
        this.suspendInvalidations();
        this.hideCurrentTab();
        this.showTab(tab);
        this.resumeInvalidations();
        this.currentTab = tab;
        this.tabsHistory.splice(this.tabsHistory.indexOf(tab), 1);
        this.tabsHistory.splice(0, 0, tab);
        this.requestUpdate();
        if (focused || forceFocus) {
            this.focus();
        }
        this.dispatchEventToListeners(Events.TabSelected, eventData);
        return true;
    }
    selectNextTab() {
        const index = this.tabs.indexOf(this.currentTab);
        const nextIndex = Platform.NumberUtilities.mod(index + 1, this.tabs.length);
        this.selectTab(this.tabs[nextIndex].id, true);
    }
    selectPrevTab() {
        const index = this.tabs.indexOf(this.currentTab);
        const nextIndex = Platform.NumberUtilities.mod(index - 1, this.tabs.length);
        this.selectTab(this.tabs[nextIndex].id, true);
    }
    getTabIndex(id) {
        const index = this.tabs.indexOf(this.tabsById.get(id));
        return index;
    }
    moveTabBackward(id, index) {
        this.insertBefore(this.tabsById.get(id), index - 1);
        this.updateTabSlider();
    }
    moveTabForward(id, index) {
        this.insertBefore(this.tabsById.get(id), index + 2);
        this.updateTabSlider();
    }
    lastOpenedTabIds(tabsCount) {
        function tabToTabId(tab) {
            return tab.id;
        }
        return this.tabsHistory.slice(0, tabsCount).map(tabToTabId);
    }
    setTabIcon(id, icon) {
        const tab = this.tabsById.get(id);
        if (!tab) {
            return;
        }
        tab.setIcon(icon);
        this.requestUpdate();
    }
    setTrailingTabIcon(id, icon) {
        const tab = this.tabsById.get(id);
        if (!tab) {
            return;
        }
        tab.setSuffixElement(icon);
    }
    setSuffixElement(id, suffixElement) {
        const tab = this.tabsById.get(id);
        if (!tab) {
            return;
        }
        tab.setSuffixElement(suffixElement);
        this.requestUpdate();
    }
    setBadge(id, content) {
        const badge = document.createElement('span');
        badge.textContent = content;
        badge.classList.add('badge');
        this.setSuffixElement(id, content ? badge : null);
    }
    setTabEnabled(id, enabled) {
        const tab = this.tabsById.get(id);
        if (tab) {
            tab.tabElement.classList.toggle('disabled', !enabled);
        }
    }
    tabIsDisabled(id) {
        return !this.tabIsEnabled(id);
    }
    tabIsEnabled(id) {
        const tab = this.tabsById.get(id);
        const disabled = tab?.tabElement.classList.contains('disabled') ?? false;
        return !disabled;
    }
    zoomChanged() {
        this.clearMeasuredWidths();
        if (this.isShowing()) {
            this.requestUpdate();
        }
    }
    clearMeasuredWidths() {
        for (let i = 0; i < this.tabs.length; ++i) {
            delete this.tabs[i].measuredWidth;
        }
    }
    changeTabTitle(id, tabTitle, tabTooltip) {
        const tab = this.tabsById.get(id);
        if (tab && tabTooltip !== undefined) {
            tab.tooltip = tabTooltip;
        }
        if (tab && tab.title !== tabTitle) {
            tab.title = tabTitle;
            ARIAUtils.setLabel(tab.tabElement, tabTitle);
            this.requestUpdate();
        }
    }
    changeTabView(id, view) {
        const tab = this.tabsById.get(id);
        if (!tab || tab.view === view) {
            return;
        }
        this.suspendInvalidations();
        const isSelected = this.currentTab?.id === id;
        const shouldFocus = tab.view.hasFocus();
        if (isSelected) {
            this.hideTab(tab);
        }
        tab.view = view;
        if (isSelected) {
            this.showTab(tab);
        }
        if (shouldFocus) {
            tab.view.focus();
        }
        this.resumeInvalidations();
    }
    onResize() {
        if (this.currentDevicePixelRatio !== window.devicePixelRatio) {
            // Force recalculation of all tab widths on a DPI change
            this.clearMeasuredWidths();
            this.currentDevicePixelRatio = window.devicePixelRatio;
        }
        this.requestUpdate();
    }
    headerResized() {
        this.requestUpdate();
    }
    wasShown() {
        super.wasShown();
        const effectiveTab = this.currentTab || this.tabsHistory[0];
        if (effectiveTab && this.autoSelectFirstItemOnShow) {
            this.selectTab(effectiveTab.id);
        }
        this.requestUpdate();
        this.dispatchEventToListeners(Events.PaneVisibilityChanged, { isVisible: true });
    }
    wasHidden() {
        this.dispatchEventToListeners(Events.PaneVisibilityChanged, { isVisible: false });
    }
    makeTabSlider() {
        if (this.verticalTabLayout) {
            return;
        }
        this.setTabSlider(true);
    }
    setTabSlider(enable) {
        this.sliderEnabled = enable;
        this.tabSlider.classList.toggle('enabled', enable);
    }
    calculateConstraints() {
        let constraints = super.calculateConstraints();
        const minContentConstraints = new Geometry.Constraints(new Geometry.Size(0, 0), new Geometry.Size(50, 50));
        constraints = constraints.widthToMax(minContentConstraints).heightToMax(minContentConstraints);
        if (this.verticalTabLayout) {
            constraints = constraints.addWidth(new Geometry.Constraints(new Geometry.Size(120, 0)));
        }
        else {
            constraints = constraints.addHeight(new Geometry.Constraints(new Geometry.Size(0, 30)));
        }
        return constraints;
    }
    setPlaceholderElement(element, focusedElement) {
        this.placeholderElement = element;
        if (focusedElement) {
            this.focusedPlaceholderElement = focusedElement;
        }
        if (this.placeholderContainerElement) {
            this.placeholderContainerElement.removeChildren();
            this.placeholderContainerElement.appendChild(element);
        }
    }
    async waitForTabElementUpdate() {
        this.performUpdate();
    }
    updateTabAnnotationIcons() {
        if (!Annotations.AnnotationRepository.annotationsEnabled()) {
            return;
        }
        const annotations = Annotations.AnnotationRepository.instance();
        if (!annotations) {
            return;
        }
        for (const tab of this.tabs) {
            let primaryType = -1;
            let secondaryType = -1;
            switch (tab.id) {
                case 'elements':
                    primaryType = Annotations.AnnotationType.ELEMENT_NODE;
                    secondaryType = Annotations.AnnotationType.STYLE_RULE;
                    break;
                case 'network':
                    primaryType = Annotations.AnnotationType.NETWORK_REQUEST;
                    secondaryType = Annotations.AnnotationType.NETWORK_REQUEST_SUBPANEL_HEADERS;
                    break;
            }
            const showTabAnnotationIcon = annotations.getAnnotationDataByType(primaryType).length > 0 ||
                annotations.getAnnotationDataByType(secondaryType).length > 0;
            this.setTabAnnotationIcon(tab.id, showTabAnnotationIcon);
        }
    }
    performUpdate() {
        if (!this.isShowing()) {
            return;
        }
        if (!this.tabs.length) {
            this.#contentElement.classList.add('has-no-tabs');
            if (this.placeholderElement && !this.placeholderContainerElement) {
                this.placeholderContainerElement = this.#contentElement.createChild('div', 'tabbed-pane-placeholder fill');
                this.placeholderContainerElement.appendChild(this.placeholderElement);
                if (this.focusedPlaceholderElement) {
                    this.setDefaultFocusedElement(this.focusedPlaceholderElement);
                }
            }
        }
        else {
            this.#contentElement.classList.remove('has-no-tabs');
            if (this.placeholderContainerElement) {
                this.placeholderContainerElement.remove();
                this.setDefaultFocusedElement(this.contentElement);
                delete this.placeholderContainerElement;
            }
        }
        this.measureDropDownButton();
        this.adjustToolbarWidth();
        this.updateWidths();
        this.updateTabsDropDown();
        this.updateTabSlider();
        this.updateTabAnnotationIcons();
    }
    adjustToolbarWidth() {
        if (!this.#rightToolbar || !this.measuredDropDownButtonWidth) {
            return;
        }
        const leftToolbarWidth = this.#leftToolbar?.getBoundingClientRect().width ?? 0;
        const rightToolbarWidth = this.#rightToolbar.getBoundingClientRect().width;
        const totalWidth = this.#headerElement.getBoundingClientRect().width;
        if (!this.#rightToolbar.hasCompactLayout() &&
            totalWidth - rightToolbarWidth - leftToolbarWidth < this.measuredDropDownButtonWidth + 10) {
            this.#rightToolbar.setCompactLayout(true);
        }
        else if (this.#rightToolbar.hasCompactLayout() &&
            // Estimate the right toolbar size in non-compact mode as 2 times its compact size.
            totalWidth - 2 * rightToolbarWidth - leftToolbarWidth > this.measuredDropDownButtonWidth + 10) {
            this.#rightToolbar.setCompactLayout(false);
        }
    }
    showTabElement(index, tab) {
        if (index >= this.tabsElement.children.length) {
            this.tabsElement.appendChild(tab.tabElement);
        }
        else {
            this.tabsElement.insertBefore(tab.tabElement, this.tabsElement.children[index]);
        }
        tab.shown = true;
    }
    hideTabElement(tab) {
        this.tabsElement.removeChild(tab.tabElement);
        tab.shown = false;
    }
    createDropDownButton() {
        const dropDownContainer = document.createElement('div');
        dropDownContainer.classList.add('tabbed-pane-header-tabs-drop-down-container');
        dropDownContainer.setAttribute('jslog', `${VisualLogging.dropDown('more-tabs').track({ click: true })}`);
        const chevronIcon = createIcon('chevron-double-right', 'chevron-icon');
        const moreTabsString = i18nString(UIStrings.moreTabs);
        dropDownContainer.title = moreTabsString;
        ARIAUtils.markAsMenuButton(dropDownContainer);
        ARIAUtils.setLabel(dropDownContainer, moreTabsString);
        ARIAUtils.setExpanded(dropDownContainer, false);
        dropDownContainer.tabIndex = 0;
        dropDownContainer.appendChild(chevronIcon);
        dropDownContainer.addEventListener('click', this.dropDownClicked.bind(this));
        dropDownContainer.addEventListener('keydown', this.dropDownKeydown.bind(this));
        dropDownContainer.addEventListener('mousedown', event => {
            if (event.button !== 0 || this.triggerDropDownTimeout) {
                return;
            }
            this.triggerDropDownTimeout = window.setTimeout(this.dropDownClicked.bind(this, event), 200);
        });
        return dropDownContainer;
    }
    dropDownClicked(event) {
        if (event.button !== 0) {
            return;
        }
        if (this.triggerDropDownTimeout) {
            clearTimeout(this.triggerDropDownTimeout);
            this.triggerDropDownTimeout = null;
        }
        const rect = this.dropDownButton.getBoundingClientRect();
        const menu = new ContextMenu(event, {
            x: rect.left,
            y: rect.bottom,
            onSoftMenuClosed: () => {
                ARIAUtils.setExpanded(this.dropDownButton, false);
            },
        });
        for (const tab of this.tabs) {
            if (tab.shown) {
                continue;
            }
            if (this.numberOfTabsShown() === 0 && this.tabsHistory[0] === tab) {
                menu.defaultSection().appendCheckboxItem(tab.title, this.dropDownMenuItemSelected.bind(this, tab), { checked: true, jslogContext: tab.jslogContext });
            }
            else {
                menu.defaultSection().appendItem(tab.title, this.dropDownMenuItemSelected.bind(this, tab), { jslogContext: tab.jslogContext });
            }
        }
        void menu.show().then(() => ARIAUtils.setExpanded(this.dropDownButton, menu.isHostedMenuOpen()));
    }
    dropDownKeydown(event) {
        if (Platform.KeyboardUtilities.isEnterOrSpaceKey(event)) {
            this.dropDownButton.click();
            event.consume(true);
        }
    }
    dropDownMenuItemSelected(tab) {
        this.selectTab(tab.id, true, true);
    }
    totalWidth() {
        return this.headerContentsElement.getBoundingClientRect().width;
    }
    numberOfTabsShown() {
        let numTabsShown = 0;
        for (const tab of this.tabs) {
            if (tab.shown) {
                numTabsShown++;
            }
        }
        return numTabsShown;
    }
    updateTabsDropDown() {
        const tabsToShowIndexes = this.tabsToShowIndexes(this.tabs, this.tabsHistory, this.totalWidth(), this.measuredDropDownButtonWidth || 0);
        if (this.lastSelectedOverflowTab && this.numberOfTabsShown() !== tabsToShowIndexes.length) {
            delete this.lastSelectedOverflowTab;
            this.updateTabsDropDown();
            return;
        }
        for (let i = 0; i < this.tabs.length; ++i) {
            if (this.tabs[i].shown && tabsToShowIndexes.indexOf(i) === -1) {
                this.hideTabElement(this.tabs[i]);
            }
        }
        for (let i = 0; i < tabsToShowIndexes.length; ++i) {
            const tab = this.tabs[tabsToShowIndexes[i]];
            if (!tab.shown) {
                this.showTabElement(i, tab);
            }
        }
        this.maybeShowDropDown(tabsToShowIndexes.length !== this.tabs.length);
    }
    maybeShowDropDown(hasMoreTabs) {
        if (hasMoreTabs && !this.dropDownButton.parentElement) {
            this.headerContentsElement.appendChild(this.dropDownButton);
        }
        else if (!hasMoreTabs && this.dropDownButton.parentElement) {
            this.headerContentsElement.removeChild(this.dropDownButton);
        }
    }
    measureDropDownButton() {
        if (this.measuredDropDownButtonWidth) {
            return;
        }
        this.dropDownButton.classList.add('measuring');
        this.headerContentsElement.appendChild(this.dropDownButton);
        this.measuredDropDownButtonWidth = this.dropDownButton.getBoundingClientRect().width;
        this.headerContentsElement.removeChild(this.dropDownButton);
        this.dropDownButton.classList.remove('measuring');
    }
    updateWidths() {
        const measuredWidths = this.measureWidths();
        const maxWidth = this.shrinkableTabs ? this.calculateMaxWidth(measuredWidths.slice(), this.totalWidth()) : Number.MAX_VALUE;
        let i = 0;
        for (const tab of this.tabs) {
            tab.setWidth(this.verticalTabLayout ? -1 : Math.min(maxWidth, measuredWidths[i++]));
        }
    }
    measureWidths() {
        // Add all elements to measure into this.tabsElement
        this.tabsElement.style.setProperty('width', '2000px');
        const measuringTabElements = new Map();
        for (const tab of this.tabs) {
            if (typeof tab.measuredWidth === 'number') {
                continue;
            }
            const measuringTabElement = tab.createTabElement(/* measure */ true);
            measuringTabElements.set(measuringTabElement, tab);
            this.tabsElement.appendChild(measuringTabElement);
        }
        // Perform measurement
        for (const [measuringTabElement, tab] of measuringTabElements) {
            const width = measuringTabElement.getBoundingClientRect().width;
            tab.measuredWidth = Math.ceil(width);
        }
        // Nuke elements from the UI
        for (const measuringTabElement of measuringTabElements.keys()) {
            measuringTabElement.remove();
        }
        // Combine the results.
        const measuredWidths = [];
        for (const tab of this.tabs) {
            measuredWidths.push(tab.measuredWidth || 0);
        }
        this.tabsElement.style.removeProperty('width');
        return measuredWidths;
    }
    calculateMaxWidth(measuredWidths, totalWidth) {
        if (!measuredWidths.length) {
            return 0;
        }
        measuredWidths.sort(function (x, y) {
            return x - y;
        });
        let totalMeasuredWidth = 0;
        for (let i = 0; i < measuredWidths.length; ++i) {
            totalMeasuredWidth += measuredWidths[i];
        }
        if (totalWidth >= totalMeasuredWidth) {
            return measuredWidths[measuredWidths.length - 1];
        }
        let totalExtraWidth = 0;
        for (let i = measuredWidths.length - 1; i > 0; --i) {
            const extraWidth = measuredWidths[i] - measuredWidths[i - 1];
            totalExtraWidth += (measuredWidths.length - i) * extraWidth;
            if (totalWidth + totalExtraWidth >= totalMeasuredWidth) {
                return measuredWidths[i - 1] +
                    (totalWidth + totalExtraWidth - totalMeasuredWidth) / (measuredWidths.length - i);
            }
        }
        return totalWidth / measuredWidths.length;
    }
    tabsToShowIndexes(tabsOrdered, tabsHistory, totalWidth, measuredDropDownButtonWidth) {
        const tabsToShowIndexes = [];
        let totalTabsWidth = 0;
        const tabCount = tabsOrdered.length;
        const tabsToLookAt = tabsOrdered.slice(0);
        if (this.currentTab !== undefined) {
            tabsToLookAt.unshift(tabsToLookAt.splice(tabsToLookAt.indexOf(this.currentTab), 1)[0]);
        }
        if (this.lastSelectedOverflowTab !== undefined) {
            tabsToLookAt.unshift(tabsToLookAt.splice(tabsToLookAt.indexOf(this.lastSelectedOverflowTab), 1)[0]);
        }
        for (let i = 0; i < tabCount; ++i) {
            const tab = this.automaticReorder ? tabsHistory[i] : tabsToLookAt[i];
            totalTabsWidth += tab.width();
            let minimalRequiredWidth = totalTabsWidth;
            if (i !== tabCount - 1) {
                minimalRequiredWidth += measuredDropDownButtonWidth;
            }
            if (!this.verticalTabLayout && minimalRequiredWidth > totalWidth) {
                break;
            }
            tabsToShowIndexes.push(tabsOrdered.indexOf(tab));
        }
        tabsToShowIndexes.sort(function (x, y) {
            return x - y;
        });
        return tabsToShowIndexes;
    }
    hideCurrentTab() {
        if (!this.currentTab) {
            return;
        }
        this.hideTab(this.currentTab);
        delete this.currentTab;
    }
    showTab(tab) {
        tab.tabElement.tabIndex = 0;
        tab.tabElement.classList.add('selected');
        ARIAUtils.setSelected(tab.tabElement, true);
        tab.view.show(this.element);
        this.updateTabSlider();
    }
    updateTabSlider() {
        if (!this.sliderEnabled) {
            return;
        }
        if (!this.currentTab) {
            this.tabSlider.style.width = '0';
            return;
        }
        let left = 0;
        for (let i = 0; i < this.tabs.length && this.currentTab !== this.tabs[i]; i++) {
            if (this.tabs[i].shown) {
                left += this.tabs[i].measuredWidth || 0;
            }
        }
        const sliderWidth = this.currentTab.shown ? this.currentTab.measuredWidth : this.dropDownButton.offsetWidth;
        const scaleFactor = window.devicePixelRatio >= 1.5 ? ' scaleY(0.75)' : '';
        this.tabSlider.style.transform = 'translateX(' + left + 'px)' + scaleFactor;
        this.tabSlider.style.width = sliderWidth + 'px';
        if (this.tabSlider.parentElement !== this.headerContentsElement) {
            this.headerContentsElement.appendChild(this.tabSlider);
        }
    }
    hideTab(tab) {
        tab.tabElement.removeAttribute('tabIndex');
        tab.tabElement.classList.remove('selected');
        tab.tabElement.tabIndex = -1;
        tab.tabElement.setAttribute('aria-selected', 'false');
        tab.view.detach();
    }
    elementsToRestoreScrollPositionsFor() {
        return [this.#contentElement];
    }
    insertBefore(tab, index) {
        this.tabsElement.insertBefore(tab.tabElement, this.tabsElement.childNodes[index]);
        const oldIndex = this.tabs.indexOf(tab);
        this.tabs.splice(oldIndex, 1);
        if (oldIndex < index) {
            --index;
        }
        this.tabs.splice(index, 0, tab);
        const eventData = { prevTabId: undefined, tabId: tab.id, view: tab.view, isUserGesture: undefined };
        this.dispatchEventToListeners(Events.TabOrderChanged, eventData);
    }
    leftToolbar() {
        if (!this.#leftToolbar) {
            this.#leftToolbar = document.createElement('devtools-toolbar');
            this.#leftToolbar.classList.add('tabbed-pane-left-toolbar');
            this.#headerElement.insertBefore(this.#leftToolbar, this.#headerElement.firstChild);
        }
        return this.#leftToolbar;
    }
    rightToolbar() {
        if (!this.#rightToolbar) {
            this.#rightToolbar = document.createElement('devtools-toolbar');
            this.#rightToolbar.classList.add('tabbed-pane-right-toolbar');
            this.#headerElement.appendChild(this.#rightToolbar);
        }
        return this.#rightToolbar;
    }
    setAllowTabReorder(allow, automatic) {
        this.allowTabReorder = allow;
        this.automaticReorder = automatic;
    }
    setTabAnnotationIcon(id, iconVisible) {
        const tab = this.tabsById.get(id);
        if (tab) {
            tab.tabAnnotationIcon = iconVisible;
        }
    }
    #onAnnotationAdded() {
        this.updateTabAnnotationIcons();
    }
    keyDown(event) {
        if (!this.currentTab) {
            return;
        }
        let nextTabElement = null;
        switch (event.key) {
            case 'ArrowUp':
            case 'ArrowLeft':
                nextTabElement = this.currentTab.tabElement.previousElementSibling;
                if (!nextTabElement && !this.dropDownButton.parentElement) {
                    nextTabElement = this.currentTab.tabElement.parentElement ?
                        this.currentTab.tabElement.parentElement.lastElementChild :
                        null;
                }
                break;
            case 'ArrowDown':
            case 'ArrowRight':
                nextTabElement = this.currentTab.tabElement.nextElementSibling;
                if (!nextTabElement && !this.dropDownButton.parentElement) {
                    nextTabElement = this.currentTab.tabElement.parentElement ?
                        this.currentTab.tabElement.parentElement.firstElementChild :
                        null;
                }
                break;
            case 'Enter':
            case ' ':
                this.currentTab.view.focus();
                return;
            default:
                return;
        }
        if (!nextTabElement) {
            this.dropDownButton.click();
            return;
        }
        const tab = this.tabs.find(tab => tab.tabElement === nextTabElement);
        if (tab) {
            this.selectTab(tab.id, true);
        }
        nextTabElement.focus();
    }
}
export var Events;
(function (Events) {
    /* eslint-disable @typescript-eslint/naming-convention -- Used by web_tests. */
    Events["TabInvoked"] = "TabInvoked";
    Events["TabSelected"] = "TabSelected";
    Events["TabClosed"] = "TabClosed";
    Events["TabOrderChanged"] = "TabOrderChanged";
    Events["PaneVisibilityChanged"] = "PaneVisibilityChanged";
    /* eslint-enable @typescript-eslint/naming-convention */
})(Events || (Events = {}));
export class TabbedPaneTab {
    closeable;
    previewFeature = false;
    #tabAnnotationIcon = false;
    tabbedPane;
    #id;
    #title;
    #tooltip;
    #view;
    shown;
    measuredWidth;
    #tabElement;
    icon = null;
    suffixElement = null;
    #width;
    delegate;
    titleElement;
    dragStartX;
    #jslogContext;
    constructor(tabbedPane, id, title, closeable, previewFeature, view, tooltip, jslogContext) {
        this.closeable = closeable;
        this.previewFeature = previewFeature;
        this.tabbedPane = tabbedPane;
        this.#id = id;
        this.#title = title;
        this.#tooltip = tooltip;
        this.#view = view;
        this.shown = false;
        this.#jslogContext = jslogContext;
    }
    get id() {
        return this.#id;
    }
    get title() {
        return this.#title;
    }
    set title(title) {
        if (title === this.#title) {
            return;
        }
        this.#title = title;
        if (this.titleElement) {
            this.titleElement.textContent = title;
            const closeIconContainer = this.#tabElement?.querySelector('.close-button');
            closeIconContainer?.setAttribute('title', i18nString(UIStrings.closeS, { PH1: title }));
            closeIconContainer?.setAttribute('aria-label', i18nString(UIStrings.closeS, { PH1: title }));
        }
        delete this.measuredWidth;
    }
    get jslogContext() {
        return this.#jslogContext ?? (this.#id === 'console-view' ? 'console' : this.#id);
    }
    get tabAnnotationIcon() {
        return this.#tabAnnotationIcon;
    }
    set tabAnnotationIcon(iconVisible) {
        if (this.#tabAnnotationIcon === iconVisible) {
            return;
        }
        this.#tabAnnotationIcon = iconVisible;
        if (!this.#tabElement) {
            return;
        }
        const iconElement = this.#tabElement.querySelector('.ai-icon');
        if (iconVisible) {
            if (!iconElement) {
                const closeButton = this.#tabElement.querySelector('.close-button');
                this.#tabElement.insertBefore(this.createTabAnnotationIcon(), closeButton);
            }
        }
        else {
            iconElement?.remove();
        }
        this.#tabElement.classList.toggle('ai', iconVisible);
        delete this.measuredWidth;
        this.tabbedPane.requestUpdate();
    }
    isCloseable() {
        return this.closeable;
    }
    setIcon(icon) {
        this.icon = icon;
        if (this.#tabElement && this.titleElement) {
            this.createIconElement(this.#tabElement, this.titleElement, false);
        }
        delete this.measuredWidth;
    }
    setSuffixElement(suffixElement) {
        this.suffixElement = suffixElement;
        if (this.#tabElement && this.titleElement) {
            this.createSuffixElement(this.#tabElement, this.titleElement, false);
        }
        delete this.measuredWidth;
    }
    toggleClass(className, force) {
        const element = this.tabElement;
        const hasClass = element.classList.contains(className);
        if (hasClass === force) {
            return false;
        }
        element.classList.toggle(className, force);
        delete this.measuredWidth;
        return true;
    }
    get view() {
        return this.#view;
    }
    set view(view) {
        this.#view = view;
    }
    get tooltip() {
        return this.#tooltip;
    }
    set tooltip(tooltip) {
        this.#tooltip = tooltip;
        if (this.titleElement) {
            Tooltip.install(this.titleElement, tooltip || '');
        }
    }
    get tabElement() {
        if (!this.#tabElement) {
            this.#tabElement = this.createTabElement(false);
        }
        return this.#tabElement;
    }
    width() {
        return this.#width || 0;
    }
    setWidth(width) {
        this.tabElement.style.width = width === -1 ? '' : (width + 'px');
        this.#width = width;
    }
    setDelegate(delegate) {
        this.delegate = delegate;
    }
    createIconElement(tabElement, titleElement, measuring) {
        const iconElement = tabIcons.get(tabElement);
        if (iconElement) {
            iconElement.remove();
            tabIcons.delete(tabElement);
        }
        if (!this.icon) {
            return;
        }
        const iconContainer = document.createElement('span');
        iconContainer.classList.add('tabbed-pane-header-tab-icon');
        const iconNode = measuring ? this.createMeasureClone(this.icon) : this.icon;
        iconContainer.appendChild(iconNode);
        titleElement.insertAdjacentElement('beforebegin', iconContainer);
        tabIcons.set(tabElement, iconContainer);
    }
    createSuffixElement(tabElement, titleElement, measuring) {
        const tabSuffixElement = tabSuffixElements.get(tabElement);
        if (tabSuffixElement) {
            tabSuffixElement.remove();
            tabSuffixElements.delete(tabElement);
        }
        if (!this.suffixElement) {
            return;
        }
        const suffixElementContainer = document.createElement('span');
        suffixElementContainer.classList.add('tabbed-pane-header-tab-suffix-element');
        const suffixElement = measuring ? this.suffixElement.cloneNode() : this.suffixElement;
        suffixElementContainer.appendChild(suffixElement);
        titleElement.insertAdjacentElement('afterend', suffixElementContainer);
        tabSuffixElements.set(tabElement, suffixElementContainer);
    }
    createMeasureClone(original) {
        // Cloning doesn't work for the icon component because the shadow
        // root isn't copied, but it is sufficient to create a div styled
        // to be the same size.
        const fakeClone = document.createElement('div');
        fakeClone.style.width = original.style.width;
        fakeClone.style.height = original.style.height;
        return fakeClone;
    }
    createTabElement(measuring) {
        const tabElement = document.createElement('div');
        tabElement.classList.add('tabbed-pane-header-tab');
        tabElement.id = 'tab-' + this.#id;
        ARIAUtils.markAsTab(tabElement);
        ARIAUtils.setSelected(tabElement, false);
        ARIAUtils.setLabel(tabElement, this.title);
        const titleElement = tabElement.createChild('span', 'tabbed-pane-header-tab-title');
        titleElement.textContent = this.title;
        Tooltip.install(titleElement, this.tooltip || '');
        this.createIconElement(tabElement, titleElement, measuring);
        this.createSuffixElement(tabElement, titleElement, measuring);
        if (!measuring) {
            this.titleElement = titleElement;
        }
        if (this.previewFeature) {
            const previewIcon = this.createPreviewIcon();
            tabElement.appendChild(previewIcon);
            tabElement.classList.add('preview');
        }
        if (this.tabAnnotationIcon) {
            const tabAnnotationIcon = this.createTabAnnotationIcon();
            tabElement.appendChild(tabAnnotationIcon);
            tabElement.classList.add('ai');
        }
        if (this.closeable) {
            const closeIcon = this.createCloseIconButton();
            tabElement.appendChild(closeIcon);
            tabElement.classList.add('closeable');
        }
        if (measuring) {
            tabElement.classList.add('measuring');
        }
        else {
            tabElement.addEventListener('click', this.tabClicked.bind(this), false);
            tabElement.addEventListener('keydown', this.tabKeyDown.bind(this), false);
            tabElement.addEventListener('auxclick', this.tabClicked.bind(this), false);
            tabElement.addEventListener('mousedown', this.tabMouseDown.bind(this), false);
            tabElement.addEventListener('mouseup', this.tabMouseUp.bind(this), false);
            tabElement.addEventListener('contextmenu', this.tabContextMenu.bind(this), false);
            if (this.tabbedPane.allowTabReorder) {
                installDragHandle(tabElement, this.startTabDragging.bind(this), this.tabDragging.bind(this), this.endTabDragging.bind(this), null, null, 200);
            }
        }
        return tabElement;
    }
    createTabAnnotationIcon() {
        // TODO(finnur): Replace the ai-icon with the squiggly svg once it becomes available.
        const iconContainer = document.createElement('div');
        iconContainer.classList.add('ai-icon');
        const tabAnnotationIcon = new Icon();
        tabAnnotationIcon.name = 'smart-assistant';
        tabAnnotationIcon.classList.add('small');
        iconContainer.appendChild(tabAnnotationIcon);
        iconContainer.setAttribute('title', i18nString(UIStrings.panelContainsAnnotation));
        iconContainer.setAttribute('aria-label', i18nString(UIStrings.panelContainsAnnotation));
        return iconContainer;
    }
    createCloseIconButton() {
        const closeButton = new Buttons.Button.Button();
        closeButton.data = {
            variant: "icon" /* Buttons.Button.Variant.ICON */,
            size: "MICRO" /* Buttons.Button.Size.MICRO */,
            iconName: 'cross',
            title: i18nString(UIStrings.closeS, { PH1: this.title }),
        };
        closeButton.classList.add('close-button', 'tabbed-pane-close-button');
        closeButton.setAttribute('jslog', `${VisualLogging.close().track({ click: true })}`);
        closeButton.setAttribute('aria-label', i18nString(UIStrings.closeS, { PH1: this.title }));
        return closeButton;
    }
    createPreviewIcon() {
        const iconContainer = document.createElement('div');
        iconContainer.classList.add('preview-icon');
        const previewIcon = new Icon();
        previewIcon.name = 'experiment';
        previewIcon.classList.add('small');
        iconContainer.appendChild(previewIcon);
        iconContainer.setAttribute('title', i18nString(UIStrings.previewFeature));
        iconContainer.setAttribute('aria-label', i18nString(UIStrings.previewFeature));
        return iconContainer;
    }
    isCloseIconClicked(element) {
        return element?.classList.contains('tabbed-pane-close-button') ||
            element?.parentElement?.classList.contains('tabbed-pane-close-button') || false;
    }
    tabKeyDown(ev) {
        const event = ev;
        switch (event.key) {
            case 'Enter':
            case ' ':
                if (this.isCloseIconClicked(event.target)) {
                    this.closeTabs([this.id]);
                    ev.consume(true);
                    return;
                }
        }
    }
    tabClicked(event) {
        const middleButton = event.button === 1;
        const shouldClose = this.closeable && (middleButton || this.isCloseIconClicked(event.target));
        if (!shouldClose) {
            this.tabbedPane.focus();
            return;
        }
        this.closeTabs([this.id]);
        event.consume(true);
    }
    tabMouseDown(event) {
        if (this.isCloseIconClicked(event.target) || event.button !== 0) {
            return;
        }
        this.tabbedPane.selectTab(this.id, true);
    }
    tabMouseUp(event) {
        // This is needed to prevent middle-click pasting on linux when tabs are clicked.
        if (event.button === 1) {
            event.consume(true);
        }
    }
    closeTabs(ids) {
        if (this.delegate) {
            this.delegate.closeTabs(this.tabbedPane, ids);
            return;
        }
        this.tabbedPane.closeTabs(ids, true);
    }
    tabContextMenu(event) {
        function close() {
            this.closeTabs([this.id]);
        }
        function closeOthers() {
            this.closeTabs(this.tabbedPane.otherTabs(this.id));
        }
        function closeAll() {
            this.closeTabs(this.tabbedPane.tabIds());
        }
        function closeToTheRight() {
            this.closeTabs(this.tabbedPane.tabsToTheRight(this.id));
        }
        function moveTabForward(tabIndex) {
            this.tabbedPane.moveTabForward(this.id, tabIndex);
        }
        function moveTabBackward(tabIndex) {
            this.tabbedPane.moveTabBackward(this.id, tabIndex);
        }
        const contextMenu = new ContextMenu(event);
        if (this.closeable) {
            contextMenu.defaultSection().appendItem(i18nString(UIStrings.close), close.bind(this), { jslogContext: 'close' });
            contextMenu.defaultSection().appendItem(i18nString(UIStrings.closeOthers), closeOthers.bind(this), { jslogContext: 'close-others' });
            contextMenu.defaultSection().appendItem(i18nString(UIStrings.closeTabsToTheRight), closeToTheRight.bind(this), { jslogContext: 'close-tabs-to-the-right' });
            contextMenu.defaultSection().appendItem(i18nString(UIStrings.closeAll), closeAll.bind(this), { jslogContext: 'close-all' });
        }
        if (this.delegate) {
            this.delegate.onContextMenu(this.id, contextMenu);
        }
        const tabIndex = this.tabbedPane.getTabIndex(this.id);
        if (tabIndex > 0) {
            contextMenu.defaultSection().appendItem(i18nString(UIStrings.moveTabLeft), moveTabBackward.bind(this, tabIndex), { jslogContext: 'move-tab-backward' });
        }
        if (tabIndex < this.tabbedPane.tabsElement.childNodes.length - 1) {
            contextMenu.defaultSection().appendItem(i18nString(UIStrings.moveTabRight), moveTabForward.bind(this, tabIndex), { jslogContext: 'move-tab-forward' });
        }
        void contextMenu.show();
    }
    startTabDragging(event) {
        if (this.isCloseIconClicked(event.target)) {
            return false;
        }
        this.dragStartX = event.pageX;
        if (this.#tabElement) {
            this.#tabElement.classList.add('dragging');
        }
        this.tabbedPane.tabSlider.remove();
        return true;
    }
    tabDragging(event) {
        const tabElements = this.tabbedPane.tabsElement.childNodes;
        for (let i = 0; i < tabElements.length; ++i) {
            let tabElement = tabElements[i];
            if (!this.#tabElement || tabElement === this.#tabElement) {
                continue;
            }
            const intersects = tabElement.offsetLeft + tabElement.clientWidth > this.#tabElement.offsetLeft &&
                this.#tabElement.offsetLeft + this.#tabElement.clientWidth > tabElement.offsetLeft;
            if (!intersects) {
                continue;
            }
            const dragStartX = this.dragStartX;
            if (Math.abs(event.pageX - dragStartX) < tabElement.clientWidth / 2 + 5) {
                break;
            }
            if (event.pageX - dragStartX > 0) {
                tabElement = tabElement.nextSibling;
                ++i;
            }
            const oldOffsetLeft = this.#tabElement.offsetLeft;
            this.tabbedPane.insertBefore(this, i);
            this.dragStartX = dragStartX + this.#tabElement.offsetLeft - oldOffsetLeft;
            break;
        }
        const dragStartX = this.dragStartX;
        const tabElement = this.#tabElement;
        if (!tabElement.previousSibling && event.pageX - dragStartX < 0) {
            tabElement.style.setProperty('left', '0px');
            return;
        }
        if (!tabElement.nextSibling && event.pageX - dragStartX > 0) {
            tabElement.style.setProperty('left', '0px');
            return;
        }
        tabElement.style.setProperty('left', (event.pageX - dragStartX) + 'px');
    }
    endTabDragging(_event) {
        const tabElement = this.#tabElement;
        tabElement.classList.remove('dragging');
        tabElement.style.removeProperty('left');
        delete this.dragStartX;
        this.tabbedPane.updateTabSlider();
    }
}
const tabIcons = new WeakMap();
const tabSuffixElements = new WeakMap();
//# sourceMappingURL=TabbedPane.js.map