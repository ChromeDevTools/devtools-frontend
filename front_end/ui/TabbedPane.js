/*
 * Copyright (C) 2010 Google Inc. All rights reserved.
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

/**
 * @unrestricted
 */
UI.TabbedPane = class extends UI.VBox {
  constructor() {
    super(true);
    this.registerRequiredCSS('ui/tabbedPane.css');
    this.element.classList.add('tabbed-pane');
    this.contentElement.classList.add('tabbed-pane-shadow');
    this.contentElement.tabIndex = -1;
    this._headerElement = this.contentElement.createChild('div', 'tabbed-pane-header');
    this._headerContentsElement = this._headerElement.createChild('div', 'tabbed-pane-header-contents');
    this._tabSlider = createElementWithClass('div', 'tabbed-pane-tab-slider');
    this._tabsElement = this._headerContentsElement.createChild('div', 'tabbed-pane-header-tabs');
    this._tabsElement.setAttribute('role', 'tablist');
    this._contentElement = this.contentElement.createChild('div', 'tabbed-pane-content');
    this._contentElement.setAttribute('role', 'tabpanel');
    this._contentElement.createChild('content');
    /** @type {!Array.<!UI.TabbedPaneTab>} */
    this._tabs = [];
    /** @type {!Array.<!UI.TabbedPaneTab>} */
    this._tabsHistory = [];
    /** @type {!Map<string, !UI.TabbedPaneTab>} */
    this._tabsById = new Map();
    this._currentTabLocked = false;
    this._autoSelectFirstItemOnShow = true;

    this._dropDownButton = this._createDropDownButton();
    UI.zoomManager.addEventListener(UI.ZoomManager.Events.ZoomChanged, this._zoomChanged, this);
  }

  /**
   * @param {string} name
   */
  setAccessibleName(name) {
    UI.ARIAUtils.setAccessibleName(this._tabsElement, name);
  }

  /**
   * @param {boolean} locked
   */
  setCurrentTabLocked(locked) {
    this._currentTabLocked = locked;
    this._headerElement.classList.toggle('locked', this._currentTabLocked);
  }

  /**
   * @param {boolean} autoSelect
   */
  setAutoSelectFirstItemOnShow(autoSelect) {
    this._autoSelectFirstItemOnShow = autoSelect;
  }

  /**
   * @return {?UI.Widget}
   */
  get visibleView() {
    return this._currentTab ? this._currentTab.view : null;
  }

  /**
   * @return {!Array.<string>}
   */
  tabIds() {
    return this._tabs.map(tab => tab._id);
  }

  /**
   * @param {string} tabId
   * @return {number}
   */
  tabIndex(tabId) {
    return this._tabs.findIndex(tab => tab.id === tabId);
  }

  /**
   * @return {!Array.<!UI.Widget>}
   */
  tabViews() {
    return this._tabs.map(tab => tab.view);
  }

  /**
   * @param {string} tabId
   * @return {?UI.Widget}
   */
  tabView(tabId) {
    return this._tabsById.has(tabId) ? this._tabsById.get(tabId).view : null;
  }

  /**
   * @return {?string}
   */
  get selectedTabId() {
    return this._currentTab ? this._currentTab.id : null;
  }

  /**
   * @param {boolean} shrinkableTabs
   */
  setShrinkableTabs(shrinkableTabs) {
    this._shrinkableTabs = shrinkableTabs;
  }

  /**
   * @param {boolean} verticalTabLayout
   */
  setVerticalTabLayout(verticalTabLayout) {
    this._verticalTabLayout = verticalTabLayout;
    this.contentElement.classList.add('vertical-tab-layout');
    this.invalidateConstraints();
  }

  /**
   * @param {boolean} closeableTabs
   */
  setCloseableTabs(closeableTabs) {
    this._closeableTabs = closeableTabs;
  }

  /**
   * @override
   */
  focus() {
    if (this.visibleView)
      this.visibleView.focus();
    else
      this.contentElement.focus();
  }

  /**
   * @return {!Element}
   */
  headerElement() {
    return this._headerElement;
  }

  /**
   * @param {string} id
   * @return {boolean}
   */
  isTabCloseable(id) {
    var tab = this._tabsById.get(id);
    return tab ? tab.isCloseable() : false;
  }

  /**
   * @param {!UI.TabbedPaneTabDelegate} delegate
   */
  setTabDelegate(delegate) {
    var tabs = this._tabs.slice();
    for (var i = 0; i < tabs.length; ++i)
      tabs[i].setDelegate(delegate);
    this._delegate = delegate;
  }

  /**
   * @param {string} id
   * @param {string} tabTitle
   * @param {!UI.Widget} view
   * @param {string=} tabTooltip
   * @param {boolean=} userGesture
   * @param {boolean=} isCloseable
   * @param {number=} index
   */
  appendTab(id, tabTitle, view, tabTooltip, userGesture, isCloseable, index) {
    isCloseable = typeof isCloseable === 'boolean' ? isCloseable : this._closeableTabs;
    var tab = new UI.TabbedPaneTab(this, id, tabTitle, isCloseable, view, tabTooltip);
    tab.setDelegate(this._delegate);
    console.assert(!this._tabsById.has(id), `Tabbed pane already contains a tab with id '${id}'`);
    this._tabsById.set(id, tab);
    if (index !== undefined)
      this._tabs.splice(index, 0, tab);
    else
      this._tabs.push(tab);
    this._tabsHistory.push(tab);
    if (this._tabsHistory[0] === tab && this.isShowing())
      this.selectTab(tab.id, userGesture);
    this._updateTabElements();
  }

  /**
   * @param {string} id
   * @param {boolean=} userGesture
   */
  closeTab(id, userGesture) {
    this.closeTabs([id], userGesture);
  }

  /**
   * @param {!Array.<string>} ids
   * @param {boolean=} userGesture
   */
  closeTabs(ids, userGesture) {
    var focused = this.hasFocus();
    for (var i = 0; i < ids.length; ++i)
      this._innerCloseTab(ids[i], userGesture);
    this._updateTabElements();
    if (this._tabsHistory.length)
      this.selectTab(this._tabsHistory[0].id, false);
    if (focused)
      this.focus();
  }

  /**
   * @param {string} id
   * @param {boolean=} userGesture
   */
  _innerCloseTab(id, userGesture) {
    if (!this._tabsById.has(id))
      return;
    if (userGesture && !this._tabsById.get(id)._closeable)
      return;
    if (this._currentTab && this._currentTab.id === id)
      this._hideCurrentTab();

    var tab = this._tabsById.get(id);
    this._tabsById.delete(id);

    this._tabsHistory.splice(this._tabsHistory.indexOf(tab), 1);
    this._tabs.splice(this._tabs.indexOf(tab), 1);
    if (tab._shown)
      this._hideTabElement(tab);

    var eventData = {tabId: id, view: tab.view, isUserGesture: userGesture};
    this.dispatchEventToListeners(UI.TabbedPane.Events.TabClosed, eventData);
    return true;
  }

  /**
   * @param {string} tabId
   * @return {boolean}
   */
  hasTab(tabId) {
    return this._tabsById.has(tabId);
  }

  /**
   * @return {!Array.<string>}
   */
  allTabs() {
    return this._tabs.map(function(tab) {
      return tab.id;
    });
  }

  /**
   * @param {string} id
   * @return {!Array.<string>}
   */
  otherTabs(id) {
    var result = [];
    for (var i = 0; i < this._tabs.length; ++i) {
      if (this._tabs[i].id !== id)
        result.push(this._tabs[i].id);
    }
    return result;
  }

  /**
   * @param {string} id
   * @return {!Array.<string>}
   */
  _tabsToTheRight(id) {
    var index = -1;
    for (var i = 0; i < this._tabs.length; ++i) {
      if (this._tabs[i].id === id) {
        index = i;
        break;
      }
    }
    if (index === -1)
      return [];
    return this._tabs.slice(index + 1).map(function(tab) {
      return tab.id;
    });
  }

  /**
   * @param {string} id
   * @param {boolean=} userGesture
   * @return {boolean}
   */
  selectTab(id, userGesture) {
    if (this._currentTabLocked)
      return false;
    var focused = this.hasFocus();
    var tab = this._tabsById.get(id);
    if (!tab)
      return false;
    if (this._currentTab && this._currentTab.id === id)
      return true;

    this.suspendInvalidations();
    this._hideCurrentTab();
    this._showTab(tab);
    this.resumeInvalidations();
    this._currentTab = tab;

    this._tabsHistory.splice(this._tabsHistory.indexOf(tab), 1);
    this._tabsHistory.splice(0, 0, tab);

    this._updateTabElements();
    if (focused)
      this.focus();

    var eventData = {tabId: id, view: tab.view, isUserGesture: userGesture};
    this.dispatchEventToListeners(UI.TabbedPane.Events.TabSelected, eventData);
    return true;
  }

  selectNextTab() {
    var index = this._tabs.indexOf(this._currentTab);
    var nextIndex = mod(index + 1, this._tabs.length);
    this.selectTab(this._tabs[nextIndex].id, true);
  }

  selectPrevTab() {
    var index = this._tabs.indexOf(this._currentTab);
    var nextIndex = mod(index - 1, this._tabs.length);
    this.selectTab(this._tabs[nextIndex].id, true);
  }

  /**
   * @param {number} tabsCount
   * @return {!Array.<string>}
   */
  lastOpenedTabIds(tabsCount) {
    function tabToTabId(tab) {
      return tab.id;
    }

    return this._tabsHistory.slice(0, tabsCount).map(tabToTabId);
  }

  /**
   * @param {string} id
   * @param {?UI.Icon} icon
   */
  setTabIcon(id, icon) {
    var tab = this._tabsById.get(id);
    tab._setIcon(icon);
    this._updateTabElements();
  }

  /**
   * @param {string} id
   * @param {boolean} enabled
   */
  setTabEnabled(id, enabled) {
    var tab = this._tabsById.get(id);
    tab.tabElement.classList.toggle('disabled', !enabled);
  }

  /**
   * @param {string} id
   * @param {string} className
   * @param {boolean=} force
   */
  toggleTabClass(id, className, force) {
    var tab = this._tabsById.get(id);
    if (tab._toggleClass(className, force))
      this._updateTabElements();
  }

  /**
   * @param {!Common.Event} event
   */
  _zoomChanged(event) {
    for (var i = 0; i < this._tabs.length; ++i)
      delete this._tabs[i]._measuredWidth;
    if (this.isShowing())
      this._updateTabElements();
  }

  /**
   * @param {string} id
   * @param {string} tabTitle
   * @param {string=} tabTooltip
   */
  changeTabTitle(id, tabTitle, tabTooltip) {
    var tab = this._tabsById.get(id);
    if (tabTooltip !== undefined)
      tab.tooltip = tabTooltip;
    if (tab.title !== tabTitle) {
      tab.title = tabTitle;
      this._updateTabElements();
    }
  }

  /**
   * @param {string} id
   * @param {!UI.Widget} view
   */
  changeTabView(id, view) {
    var tab = this._tabsById.get(id);
    if (tab.view === view)
      return;

    this.suspendInvalidations();
    var isSelected = this._currentTab && this._currentTab.id === id;
    var shouldFocus = tab.view.hasFocus();
    if (isSelected)
      this._hideTab(tab);
    tab.view = view;
    if (isSelected)
      this._showTab(tab);
    if (shouldFocus)
      tab.view.focus();
    this.resumeInvalidations();
  }

  /**
   * @override
   */
  onResize() {
    this._updateTabElements();
  }

  headerResized() {
    this._updateTabElements();
  }

  /**
   * @override
   */
  wasShown() {
    var effectiveTab = this._currentTab || this._tabsHistory[0];
    if (effectiveTab && this._autoSelectFirstItemOnShow)
      this.selectTab(effectiveTab.id);
  }

  /**
   * @param {boolean} enable
   */
  setTabSlider(enable) {
    this._sliderEnabled = enable;
    this._tabSlider.classList.toggle('enabled', enable);
    this._headerElement.classList.add('tabbed-pane-no-tab-borders');
  }

  /**
   * @override
   * @return {!UI.Constraints}
   */
  calculateConstraints() {
    var constraints = super.calculateConstraints();
    var minContentConstraints = new UI.Constraints(new UI.Size(0, 0), new UI.Size(50, 50));
    constraints = constraints.widthToMax(minContentConstraints).heightToMax(minContentConstraints);
    if (this._verticalTabLayout)
      constraints = constraints.addWidth(new UI.Constraints(new UI.Size(120, 0)));
    else
      constraints = constraints.addHeight(new UI.Constraints(new UI.Size(0, 30)));
    return constraints;
  }

  _updateTabElements() {
    UI.invokeOnceAfterBatchUpdate(this, this._innerUpdateTabElements);
  }

  /**
   * @param {string} text
   */
  setPlaceholderText(text) {
    this._noTabsMessage = text;
  }

  _innerUpdateTabElements() {
    if (!this.isShowing())
      return;

    if (!this._tabs.length) {
      this._contentElement.classList.add('has-no-tabs');
      if (this._noTabsMessage && !this._noTabsMessageElement) {
        this._noTabsMessageElement = this._contentElement.createChild('div', 'tabbed-pane-placeholder fill');
        this._noTabsMessageElement.textContent = this._noTabsMessage;
      }
    } else {
      this._contentElement.classList.remove('has-no-tabs');
      if (this._noTabsMessageElement) {
        this._noTabsMessageElement.remove();
        delete this._noTabsMessageElement;
      }
    }

    this._measureDropDownButton();
    this._updateWidths();
    this._updateTabsDropDown();
    this._updateTabSlider();
  }

  /**
   * @param {number} index
   * @param {!UI.TabbedPaneTab} tab
   */
  _showTabElement(index, tab) {
    if (index >= this._tabsElement.children.length)
      this._tabsElement.appendChild(tab.tabElement);
    else
      this._tabsElement.insertBefore(tab.tabElement, this._tabsElement.children[index]);
    tab._shown = true;
  }

  /**
   * @param {!UI.TabbedPaneTab} tab
   */
  _hideTabElement(tab) {
    this._tabsElement.removeChild(tab.tabElement);
    tab._shown = false;
  }

  _createDropDownButton() {
    var dropDownContainer = createElementWithClass('div', 'tabbed-pane-header-tabs-drop-down-container');
    var chevronIcon = UI.Icon.create('largeicon-chevron', 'chevron-icon');
    dropDownContainer.appendChild(chevronIcon);
    this._dropDownMenu = new UI.DropDownMenu(dropDownContainer);
    this._dropDownMenu.addEventListener(UI.DropDownMenu.Events.ItemSelected, this._dropDownMenuItemSelected, this);

    return dropDownContainer;
  }

  /**
   * @param {!Common.Event} event
   */
  _dropDownMenuItemSelected(event) {
    var tabId = /** @type {string} */ (event.data);
    this._lastSelectedOverflowTab = this._tabsById.get(tabId);
    this.selectTab(tabId, true);
  }

  _totalWidth() {
    return this._headerContentsElement.getBoundingClientRect().width;
  }

  /**
   * @return {number}
   */
  _numberOfTabsShown() {
    var numTabsShown = 0;
    for (var tab of this._tabs) {
      if (tab._shown)
        numTabsShown++;
    }
    return numTabsShown;
  }

  disableOverflowMenu() {
    this._overflowDisabled = true;
  }

  _updateTabsDropDown() {
    var tabsToShowIndexes = this._tabsToShowIndexes(
        this._tabs, this._tabsHistory, this._totalWidth(), this._measuredDropDownButtonWidth || 0);
    if (this._lastSelectedOverflowTab && this._numberOfTabsShown() !== tabsToShowIndexes.length) {
      delete this._lastSelectedOverflowTab;
      this._updateTabsDropDown();
      return;
    }

    for (var i = 0; i < this._tabs.length; ++i) {
      if (this._tabs[i]._shown && tabsToShowIndexes.indexOf(i) === -1)
        this._hideTabElement(this._tabs[i]);
    }
    for (var i = 0; i < tabsToShowIndexes.length; ++i) {
      var tab = this._tabs[tabsToShowIndexes[i]];
      if (!tab._shown)
        this._showTabElement(i, tab);
    }

    if (!this._overflowDisabled)
      this._populateDropDownFromIndex();
  }

  _populateDropDownFromIndex() {
    if (this._dropDownButton.parentElement)
      this._headerContentsElement.removeChild(this._dropDownButton);

    this._dropDownMenu.clear();

    var tabsToShow = [];
    for (var i = 0; i < this._tabs.length; ++i) {
      if (!this._tabs[i]._shown)
        tabsToShow.push(this._tabs[i]);
    }

    var selectedId = null;
    for (var i = 0; i < tabsToShow.length; ++i) {
      var tab = tabsToShow[i];
      this._dropDownMenu.addItem(tab.id, tab.title);
      if (this._tabsHistory[0] === tab)
        selectedId = tab.id;
    }
    if (tabsToShow.length) {
      this._headerContentsElement.appendChild(this._dropDownButton);
      this._dropDownMenu.selectItem(selectedId);
    }
  }

  _measureDropDownButton() {
    if (this._overflowDisabled || this._measuredDropDownButtonWidth)
      return;
    this._dropDownButton.classList.add('measuring');
    this._headerContentsElement.appendChild(this._dropDownButton);
    this._measuredDropDownButtonWidth = this._dropDownButton.getBoundingClientRect().width;
    this._headerContentsElement.removeChild(this._dropDownButton);
    this._dropDownButton.classList.remove('measuring');
  }

  _updateWidths() {
    var measuredWidths = this._measureWidths();
    var maxWidth =
        this._shrinkableTabs ? this._calculateMaxWidth(measuredWidths.slice(), this._totalWidth()) : Number.MAX_VALUE;

    var i = 0;
    for (var tab of this._tabs)
      tab.setWidth(this._verticalTabLayout ? -1 : Math.min(maxWidth, measuredWidths[i++]));
  }

  _measureWidths() {
    // Add all elements to measure into this._tabsElement
    this._tabsElement.style.setProperty('width', '2000px');
    var measuringTabElements = [];
    for (var tab of this._tabs) {
      if (typeof tab._measuredWidth === 'number')
        continue;
      var measuringTabElement = tab._createTabElement(true);
      measuringTabElement.__tab = tab;
      measuringTabElements.push(measuringTabElement);
      this._tabsElement.appendChild(measuringTabElement);
    }

    // Perform measurement
    for (var i = 0; i < measuringTabElements.length; ++i) {
      var width = measuringTabElements[i].getBoundingClientRect().width;
      measuringTabElements[i].__tab._measuredWidth = Math.ceil(width);
    }

    // Nuke elements from the UI
    for (var i = 0; i < measuringTabElements.length; ++i)
      measuringTabElements[i].remove();

    // Combine the results.
    var measuredWidths = [];
    for (var tab of this._tabs)
      measuredWidths.push(tab._measuredWidth);
    this._tabsElement.style.removeProperty('width');

    return measuredWidths;
  }

  /**
   * @param {!Array.<number>} measuredWidths
   * @param {number} totalWidth
   */
  _calculateMaxWidth(measuredWidths, totalWidth) {
    if (!measuredWidths.length)
      return 0;

    measuredWidths.sort(function(x, y) {
      return x - y;
    });

    var totalMeasuredWidth = 0;
    for (var i = 0; i < measuredWidths.length; ++i)
      totalMeasuredWidth += measuredWidths[i];

    if (totalWidth >= totalMeasuredWidth)
      return measuredWidths[measuredWidths.length - 1];

    var totalExtraWidth = 0;
    for (var i = measuredWidths.length - 1; i > 0; --i) {
      var extraWidth = measuredWidths[i] - measuredWidths[i - 1];
      totalExtraWidth += (measuredWidths.length - i) * extraWidth;

      if (totalWidth + totalExtraWidth >= totalMeasuredWidth) {
        return measuredWidths[i - 1] +
            (totalWidth + totalExtraWidth - totalMeasuredWidth) / (measuredWidths.length - i);
      }
    }

    return totalWidth / measuredWidths.length;
  }

  /**
   * @param {!Array.<!UI.TabbedPaneTab>} tabsOrdered
   * @param {!Array.<!UI.TabbedPaneTab>} tabsHistory
   * @param {number} totalWidth
   * @param {number} measuredDropDownButtonWidth
   * @return {!Array.<number>}
   */
  _tabsToShowIndexes(tabsOrdered, tabsHistory, totalWidth, measuredDropDownButtonWidth) {
    var tabsToShowIndexes = [];

    var totalTabsWidth = 0;
    var tabCount = tabsOrdered.length;
    var tabsToLookAt = tabsOrdered.slice(0);
    if (this._currentTab !== undefined)
      tabsToLookAt.unshift(tabsToLookAt.splice(tabsToLookAt.indexOf(this._currentTab), 1)[0]);
    if (this._lastSelectedOverflowTab !== undefined)
      tabsToLookAt.unshift(tabsToLookAt.splice(tabsToLookAt.indexOf(this._lastSelectedOverflowTab), 1)[0]);
    for (var i = 0; i < tabCount; ++i) {
      var tab = this._automaticReorder ? tabsHistory[i] : tabsToLookAt[i];
      totalTabsWidth += tab.width();
      var minimalRequiredWidth = totalTabsWidth;
      if (i !== tabCount - 1)
        minimalRequiredWidth += measuredDropDownButtonWidth;
      if (!this._verticalTabLayout && minimalRequiredWidth > totalWidth)
        break;
      tabsToShowIndexes.push(tabsOrdered.indexOf(tab));
    }

    tabsToShowIndexes.sort(function(x, y) {
      return x - y;
    });

    return tabsToShowIndexes;
  }

  _hideCurrentTab() {
    if (!this._currentTab)
      return;

    this._hideTab(this._currentTab);
    delete this._currentTab;
  }

  /**
   * @param {!UI.TabbedPaneTab} tab
   */
  _showTab(tab) {
    tab.tabElement.classList.add('selected');
    UI.ARIAUtils.setSelected(tab.tabElement, true);
    tab.view.show(this.element);
    this._updateTabSlider();
  }

  _updateTabSlider() {
    if (!this._currentTab || !this._sliderEnabled)
      return;
    var left = 0;
    for (var i = 0; i < this._tabs.length && this._currentTab !== this._tabs[i] && this._tabs[i]._shown; i++)
      left += this._tabs[i]._measuredWidth;
    var sliderWidth = this._currentTab._shown ? this._currentTab._measuredWidth : this._dropDownButton.offsetWidth;
    var scaleFactor = window.devicePixelRatio >= 1.5 ? ' scaleY(0.75)' : '';
    this._tabSlider.style.transform = 'translateX(' + left + 'px)' + scaleFactor;
    this._tabSlider.style.width = sliderWidth + 'px';

    if (this._tabSlider.parentElement !== this._headerContentsElement)
      this._headerContentsElement.appendChild(this._tabSlider);
  }

  /**
   * @param {!UI.TabbedPaneTab} tab
   */
  _hideTab(tab) {
    tab.tabElement.classList.remove('selected');
    tab.tabElement.setAttribute('aria-selected', 'false');
    tab.view.detach();
  }

  /**
   * @override
   * @return {!Array.<!Element>}
   */
  elementsToRestoreScrollPositionsFor() {
    return [this._contentElement];
  }

  /**
   * @param {!UI.TabbedPaneTab} tab
   * @param {number} index
   */
  _insertBefore(tab, index) {
    this._tabsElement.insertBefore(tab._tabElement || null, this._tabsElement.childNodes[index]);
    var oldIndex = this._tabs.indexOf(tab);
    this._tabs.splice(oldIndex, 1);
    if (oldIndex < index)
      --index;
    this._tabs.splice(index, 0, tab);
    this.dispatchEventToListeners(UI.TabbedPane.Events.TabOrderChanged, this._tabs);
  }

  /**
   * @return {!UI.Toolbar}
   */
  leftToolbar() {
    if (!this._leftToolbar) {
      this._leftToolbar = new UI.Toolbar('tabbed-pane-left-toolbar');
      this._headerElement.insertBefore(this._leftToolbar.element, this._headerElement.firstChild);
    }
    return this._leftToolbar;
  }

  /**
   * @return {!UI.Toolbar}
   */
  rightToolbar() {
    if (!this._rightToolbar) {
      this._rightToolbar = new UI.Toolbar('tabbed-pane-right-toolbar');
      this._headerElement.appendChild(this._rightToolbar.element);
    }
    return this._rightToolbar;
  }

  renderWithNoHeaderBackground() {
    this._headerElement.classList.add('tabbed-pane-no-header-background');
  }

  /**
   * @param {boolean} allow
   * @param {boolean=} automatic
   */
  setAllowTabReorder(allow, automatic) {
    this._allowTabReorder = allow;
    this._automaticReorder = automatic;
  }
};

/** @enum {symbol} */
UI.TabbedPane.Events = {
  TabSelected: Symbol('TabSelected'),
  TabClosed: Symbol('TabClosed'),
  TabOrderChanged: Symbol('TabOrderChanged')
};

/**
 * @unrestricted
 */
UI.TabbedPaneTab = class {
  /**
   * @param {!UI.TabbedPane} tabbedPane
   * @param {string} id
   * @param {string} title
   * @param {boolean} closeable
   * @param {!UI.Widget} view
   * @param {string=} tooltip
   */
  constructor(tabbedPane, id, title, closeable, view, tooltip) {
    this._closeable = closeable;
    this._tabbedPane = tabbedPane;
    this._id = id;
    this._title = title;
    this._tooltip = tooltip;
    this._view = view;
    this._shown = false;
    /** @type {number} */
    this._measuredWidth;
    /** @type {!Element|undefined} */
    this._tabElement;
    /** @type {?Element} */
    this._iconContainer = null;
  }

  /**
   * @return {string}
   */
  get id() {
    return this._id;
  }

  /**
   * @return {string}
   */
  get title() {
    return this._title;
  }

  /**
   * @param {string} title
   */
  set title(title) {
    if (title === this._title)
      return;
    this._title = title;
    if (this._titleElement)
      this._titleElement.textContent = title;
    delete this._measuredWidth;
  }

  /**
   * @return {boolean}
   */
  isCloseable() {
    return this._closeable;
  }

  /**
   * @param {?UI.Icon} icon
   */
  _setIcon(icon) {
    this._icon = icon;
    if (this._tabElement)
      this._createIconElement(this._tabElement, this._titleElement, false);
    delete this._measuredWidth;
  }

  /**
   * @param {string} className
   * @param {boolean=} force
   * @return {boolean}
   */
  _toggleClass(className, force) {
    var element = this.tabElement;
    var hasClass = element.classList.contains(className);
    if (hasClass === force)
      return false;
    element.classList.toggle(className, force);
    delete this._measuredWidth;
    return true;
  }

  /**
   * @return {!UI.Widget}
   */
  get view() {
    return this._view;
  }

  /**
   * @param {!UI.Widget} view
   */
  set view(view) {
    this._view = view;
  }

  /**
   * @return {string|undefined}
   */
  get tooltip() {
    return this._tooltip;
  }

  /**
   * @param {string|undefined} tooltip
   */
  set tooltip(tooltip) {
    this._tooltip = tooltip;
    if (this._titleElement)
      this._titleElement.title = tooltip || '';
  }

  /**
   * @return {!Element}
   */
  get tabElement() {
    if (!this._tabElement)
      this._tabElement = this._createTabElement(false);

    return this._tabElement;
  }

  /**
   * @return {number}
   */
  width() {
    return this._width;
  }

  /**
   * @param {number} width
   */
  setWidth(width) {
    this.tabElement.style.width = width === -1 ? '' : (width + 'px');
    this._width = width;
  }

  /**
   * @param {!UI.TabbedPaneTabDelegate} delegate
   */
  setDelegate(delegate) {
    this._delegate = delegate;
  }

  /**
   * @param {!Element} tabElement
   * @param {!Element} titleElement
   * @param {boolean} measuring
   */
  _createIconElement(tabElement, titleElement, measuring) {
    if (tabElement.__iconElement) {
      tabElement.__iconElement.remove();
      tabElement.__iconElement = null;
    }
    if (!this._icon)
      return;

    var iconContainer = createElementWithClass('span', 'tabbed-pane-header-tab-icon');
    var iconNode = measuring ? this._icon.cloneNode(true) : this._icon;
    iconContainer.appendChild(iconNode);
    tabElement.insertBefore(iconContainer, titleElement);
    tabElement.__iconElement = iconContainer;
  }

  /**
   * @param {boolean} measuring
   * @return {!Element}
   */
  _createTabElement(measuring) {
    var tabElement = createElementWithClass('div', 'tabbed-pane-header-tab');
    tabElement.id = 'tab-' + this._id;
    tabElement.tabIndex = -1;
    UI.ARIAUtils.markAsTab(tabElement);
    UI.ARIAUtils.setSelected(tabElement, false);
    tabElement.selectTabForTest = this._tabbedPane.selectTab.bind(this._tabbedPane, this.id, true);

    var titleElement = tabElement.createChild('span', 'tabbed-pane-header-tab-title');
    titleElement.textContent = this.title;
    titleElement.title = this.tooltip || '';
    this._createIconElement(tabElement, titleElement, measuring);
    if (!measuring)
      this._titleElement = titleElement;

    if (this._closeable)
      tabElement.createChild('div', 'tabbed-pane-close-button', 'dt-close-button').gray = true;

    if (measuring) {
      tabElement.classList.add('measuring');
    } else {
      tabElement.addEventListener('click', this._tabClicked.bind(this), false);
      tabElement.addEventListener('auxclick', this._tabClicked.bind(this), false);
      tabElement.addEventListener('mousedown', this._tabMouseDown.bind(this), false);
      tabElement.addEventListener('mouseup', this._tabMouseUp.bind(this), false);

      tabElement.addEventListener('contextmenu', this._tabContextMenu.bind(this), false);
      if (this._tabbedPane._allowTabReorder) {
        UI.installDragHandle(
            tabElement, this._startTabDragging.bind(this), this._tabDragging.bind(this),
            this._endTabDragging.bind(this), '-webkit-grabbing', 'pointer', 200);
      }
    }

    return tabElement;
  }

  /**
   * @param {!Event} event
   */
  _tabClicked(event) {
    var middleButton = event.button === 1;
    var shouldClose = this._closeable && (middleButton || event.target.classList.contains('tabbed-pane-close-button'));
    if (!shouldClose) {
      this._tabbedPane.focus();
      return;
    }
    this._closeTabs([this.id]);
    event.consume(true);
  }

  /**
   * @param {!Event} event
   */
  _tabMouseDown(event) {
    if (event.target.classList.contains('tabbed-pane-close-button') || event.button === 1)
      return;
    this._tabbedPane.selectTab(this.id, true);
  }

  /**
   * @param {!Event} event
   */
  _tabMouseUp(event) {
    // This is needed to prevent middle-click pasting on linux when tabs are clicked.
    if (event.button === 1)
      event.consume(true);
  }

  /**
   * @param {!Array.<string>} ids
   */
  _closeTabs(ids) {
    if (this._delegate) {
      this._delegate.closeTabs(this._tabbedPane, ids);
      return;
    }
    this._tabbedPane.closeTabs(ids, true);
  }

  _tabContextMenu(event) {
    /**
     * @this {UI.TabbedPaneTab}
     */
    function close() {
      this._closeTabs([this.id]);
    }

    /**
     * @this {UI.TabbedPaneTab}
     */
    function closeOthers() {
      this._closeTabs(this._tabbedPane.otherTabs(this.id));
    }

    /**
     * @this {UI.TabbedPaneTab}
     */
    function closeAll() {
      this._closeTabs(this._tabbedPane.allTabs());
    }

    /**
     * @this {UI.TabbedPaneTab}
     */
    function closeToTheRight() {
      this._closeTabs(this._tabbedPane._tabsToTheRight(this.id));
    }

    var contextMenu = new UI.ContextMenu(event);
    if (this._closeable) {
      contextMenu.appendItem(Common.UIString.capitalize('Close'), close.bind(this));
      contextMenu.appendItem(Common.UIString.capitalize('Close ^others'), closeOthers.bind(this));
      contextMenu.appendItem(Common.UIString.capitalize('Close ^tabs to the ^right'), closeToTheRight.bind(this));
      contextMenu.appendItem(Common.UIString.capitalize('Close ^all'), closeAll.bind(this));
    }
    if (this._delegate)
      this._delegate.onContextMenu(this.id, contextMenu);
    contextMenu.show();
  }

  /**
   * @param {!Event} event
   * @return {boolean}
   */
  _startTabDragging(event) {
    if (event.target.classList.contains('tabbed-pane-close-button'))
      return false;
    this._dragStartX = event.pageX;
    this._tabElement.classList.add('dragging');
    this._tabbedPane._tabSlider.remove();
    return true;
  }

  /**
   * @param {!Event} event
   */
  _tabDragging(event) {
    var tabElements = this._tabbedPane._tabsElement.childNodes;
    for (var i = 0; i < tabElements.length; ++i) {
      var tabElement = tabElements[i];
      if (tabElement === this._tabElement)
        continue;

      var intersects = tabElement.offsetLeft + tabElement.clientWidth > this._tabElement.offsetLeft &&
          this._tabElement.offsetLeft + this._tabElement.clientWidth > tabElement.offsetLeft;
      if (!intersects)
        continue;

      if (Math.abs(event.pageX - this._dragStartX) < tabElement.clientWidth / 2 + 5)
        break;

      if (event.pageX - this._dragStartX > 0) {
        tabElement = tabElement.nextSibling;
        ++i;
      }

      var oldOffsetLeft = this._tabElement.offsetLeft;
      this._tabbedPane._insertBefore(this, i);
      this._dragStartX += this._tabElement.offsetLeft - oldOffsetLeft;
      break;
    }

    if (!this._tabElement.previousSibling && event.pageX - this._dragStartX < 0) {
      this._tabElement.style.setProperty('left', '0px');
      return;
    }
    if (!this._tabElement.nextSibling && event.pageX - this._dragStartX > 0) {
      this._tabElement.style.setProperty('left', '0px');
      return;
    }

    this._tabElement.style.setProperty('left', (event.pageX - this._dragStartX) + 'px');
  }

  /**
   * @param {!Event} event
   */
  _endTabDragging(event) {
    this._tabElement.classList.remove('dragging');
    this._tabElement.style.removeProperty('left');
    delete this._dragStartX;
    this._tabbedPane._updateTabSlider();
  }
};

/**
 * @interface
 */
UI.TabbedPaneTabDelegate = function() {};

UI.TabbedPaneTabDelegate.prototype = {
  /**
   * @param {!UI.TabbedPane} tabbedPane
   * @param {!Array.<string>} ids
   */
  closeTabs(tabbedPane, ids) {},

  /**
   * @param {string} tabId
   * @param {!UI.ContextMenu} contextMenu
   */
  onContextMenu(tabId, contextMenu) {}
};
