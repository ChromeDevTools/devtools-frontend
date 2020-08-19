// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// @ts-nocheck
// TODO(crbug.com/1011811): Enable TypeScript compiler checks

import * as Bindings from '../bindings/bindings.js';
import * as Common from '../common/common.js';
import * as SDK from '../sdk/sdk.js';
import * as TextUtils from '../text_utils/text_utils.js';
import * as UI from '../ui/ui.js';
import * as Workspace from '../workspace/workspace.js';

/**
 * @implements {UI.ContextFlavorListener.ContextFlavorListener}
 * @implements {UI.ListControl.ListDelegate}
 * @unrestricted
 */
export class JavaScriptBreakpointsSidebarPane extends UI.ThrottledWidget.ThrottledWidget {
  constructor() {
    super(true);
    this.registerRequiredCSS('sources/javaScriptBreakpointsSidebarPane.css');

    this._breakpointManager = Bindings.BreakpointManager.BreakpointManager.instance();
    this._breakpointManager.addEventListener(Bindings.BreakpointManager.Events.BreakpointAdded, this.update, this);
    this._breakpointManager.addEventListener(Bindings.BreakpointManager.Events.BreakpointRemoved, this.update, this);
    Common.Settings.Settings.instance().moduleSetting('breakpointsActive').addChangeListener(this.update, this);

    /** @type {!UI.ListModel.ListModel.<!BreakpointItem>} */
    this._breakpoints = new UI.ListModel.ListModel();
    /** @type {!UI.ListControl.ListControl.<!BreakpointItem>} */
    this._list = new UI.ListControl.ListControl(this._breakpoints, this, UI.ListControl.ListMode.NonViewport);
    UI.ARIAUtils.markAsList(this._list.element);
    this.contentElement.appendChild(this._list.element);

    this._emptyElement = this.contentElement.createChild('div', 'gray-info-message');
    this._emptyElement.textContent = ls`No breakpoints`;
    this._emptyElement.tabIndex = -1;

    this.update();
  }

  /**
   * @returns {!Array<!BreakpointLocation>}
   */
  _getBreakpointLocations() {
    const locations = this._breakpointManager.allBreakpointLocations().filter(
        breakpointLocation =>
            breakpointLocation.uiLocation.uiSourceCode.project().type() !== Workspace.Workspace.projectTypes.Debugger);

    locations.sort((item1, item2) => item1.uiLocation.compareTo(item2.uiLocation));

    const result = [];
    let lastBreakpoint = null;
    let lastLocation = null;
    for (const location of locations) {
      if (location.breakpoint !== lastBreakpoint || (lastLocation && location.uiLocation.compareTo(lastLocation))) {
        result.push(location);
        lastBreakpoint = location.breakpoint;
        lastLocation = location.uiLocation;
      }
    }
    return result;
  }

  _hideList() {
    this._list.element.classList.add('hidden');
    this._emptyElement.classList.remove('hidden');
  }

  _ensureListShown() {
    this._list.element.classList.remove('hidden');
    this._emptyElement.classList.add('hidden');
  }

  /**
   * @param {!Array<!BreakpointLocation>} breakpointLocations
   * @return {!Array<!Array<!BreakpointLocation>>}
   */
  _groupBreakpointLocationsById(breakpointLocations) {
    /** @type {!Platform.Multimap<string, !BreakpointLocation>} */
    const map = new Platform.Multimap();
    for (const breakpointLocation of breakpointLocations) {
      const uiLocation = breakpointLocation.uiLocation;
      map.set(uiLocation.id(), breakpointLocation);
    }
    /** @type {!Array<!Array<!BreakpointLocation>>} */
    const arr = [];
    for (const id of map.keysArray()) {
      const locations = Array.from(map.get(id));
      if (locations.length) {
        arr.push(locations);
      }
    }
    return arr;
  }

  /**
   * @param {!Array<!BreakpointLocation>} breakpointLocations
   * @return {!Platform.Multimap<string, string>}
   */
  _getLocationIdsByLineId(breakpointLocations) {
    /** @type {!Platform.Multimap<string, string>} */
    const result = new Platform.Multimap();

    for (const breakpointLocation of breakpointLocations) {
      const uiLocation = breakpointLocation.uiLocation;
      result.set(uiLocation.lineId(), uiLocation.id());
    }

    return result;
  }

  /**
   * @return {!Promise<?Workspace.UISourceCode.UILocation>}
   */
  async _getSelectedUILocation() {
    const details = UI.Context.Context.instance().flavor(SDK.DebuggerModel.DebuggerPausedDetails);
    if (details && details.callFrames.length) {
      return await Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().rawLocationToUILocation(
          details.callFrames[0].location());
    }
    return null;
  }

  /**
   * @param {!Array<!Array<!BreakpointLocation>>} locations
   * @return {!Promise<!Array<!TextUtils.Text.Text>>}
   */
  _getContent(locations) {
    // Use a cache to share the Text objects between all breakpoints. This way
    // we share the cached line ending information that Text calculates. This
    // was very slow to calculate with a lot of breakpoints in the same very
    // large source file.
    /** @type {!Map<string, !TextUtils.Text.Text>} */
    const contentToTextMap = new Map();

    return Promise.all(locations.map(async ([{uiLocation: {uiSourceCode}}]) => {
      if (uiSourceCode.mimeType() === 'application/wasm') {
        // We could mirror the logic from `SourceFrame._ensureContentLoaded()` here
        // (and if so, ideally share that code somewhere), but that's quite heavy
        // logic just to display a single Wasm instruction. Also not really clear
        // how much value this would add. So let's keep it simple for now and don't
        // display anything additional for Wasm breakpoints, and if there's demand
        // to display some text preview, we could look into selectively disassemb-
        // ling the part of the text that we need here.
        // Relevant crbug: https://crbug.com/1090256
        return new TextUtils.Text.Text('');
      }
      const {content} = await uiSourceCode.requestContent();
      const contentText = content || '';
      if (contentToTextMap.has(contentText)) {
        return /** @type {!TextUtils.Text.Text} */ (contentToTextMap.get(contentText));
      }
      const text = new TextUtils.Text.Text(contentText);
      contentToTextMap.set(contentText, text);
      return text;
    }));
  }

  /**
   * @override
   * @return {!Promise<?>}
   */
  async doUpdate() {
    const hadFocus = this.hasFocus();
    const breakpointLocations = this._getBreakpointLocations();
    if (!breakpointLocations.length) {
      this._hideList();
      this._setBreakpointItems([]);
      return this._didUpdateForTest();
    }
    this._ensureListShown();

    const locationsGroupedById = this._groupBreakpointLocationsById(breakpointLocations);
    const locationIdsByLineId = this._getLocationIdsByLineId(breakpointLocations);
    const content = await this._getContent(locationsGroupedById);
    const selectedUILocation = await this._getSelectedUILocation();
    const breakpoints = [];
    for (let idx = 0; idx < locationsGroupedById.length; idx++) {
      const locations = locationsGroupedById[idx];
      const breakpointLocation = locations[0];
      const uiLocation = breakpointLocation.uiLocation;
      const isSelected =
          !!selectedUILocation && locations.some(location => location.uiLocation.id() === selectedUILocation.id());
      const showColumn = locationIdsByLineId.get(uiLocation.lineId()).size > 1;
      const text = /** @type {!TextUtils.Text.Text} */ (content[idx]);
      breakpoints.push(new BreakpointItem(locations, text, isSelected, showColumn));
    }

    if (breakpoints.some(breakpoint => breakpoint.isSelected)) {
      UI.ViewManager.ViewManager.instance().showView('sources.jsBreakpoints');
    }

    this._list.element.classList.toggle(
        'breakpoints-list-deactivated', !Common.Settings.Settings.instance().moduleSetting('breakpointsActive').get());

    this._setBreakpointItems(breakpoints);

    if (hadFocus) {
      this.focus();
    }

    return this._didUpdateForTest();
  }

  /**
   * If the number of breakpoint items is the same,
   * we expect only minor changes and it implies that only
   * few items should be updated
   *
   * @param {!Array<!BreakpointItem>} breakpointItems
   */
  _setBreakpointItems(breakpointItems) {
    if (this._breakpoints.length === breakpointItems.length) {
      for (let i = 0; i < this._breakpoints.length; i++) {
        if (!this._breakpoints.at(i).isSimilar(breakpointItems[i])) {
          this._breakpoints.replace(i, breakpointItems[i]);
        }
      }
    } else {
      this._breakpoints.replaceAll(breakpointItems);
    }
  }

  /**
   * @override
   * @param {!BreakpointItem} item
   * @return {!Element}
   */
  createElementForItem(item) {
    const element = document.createElement('div');
    element.classList.add('breakpoint-entry');
    UI.ARIAUtils.markAsListitem(element);
    element.tabIndex = this._list.selectedItem() === item ? 0 : -1;
    element.addEventListener('contextmenu', this._breakpointContextMenu.bind(this), true);
    element.addEventListener('click', this._revealLocation.bind(this, element), false);
    const checkboxLabel = UI.UIUtils.CheckboxLabel.create('');

    const uiLocation = item.locations[0].uiLocation;
    const hasEnabled = item.locations.some(location => location.breakpoint.enabled());
    const hasDisabled = item.locations.some(location => !location.breakpoint.enabled());
    checkboxLabel.textElement.textContent =
        uiLocation.linkText() + (item.showColumn ? ':' + (uiLocation.columnNumber + 1) : '');
    checkboxLabel.checkboxElement.checked = hasEnabled;
    checkboxLabel.checkboxElement.indeterminate = hasEnabled && hasDisabled;
    checkboxLabel.checkboxElement.tabIndex = -1;
    checkboxLabel.addEventListener('click', this._breakpointCheckboxClicked.bind(this), false);
    element.appendChild(checkboxLabel);
    let checkedDescription = hasEnabled ? ls`checked` : ls`unchecked`;
    if (hasEnabled && hasDisabled) {
      checkedDescription = ls`mixed`;
    }
    if (item.isSelected) {
      UI.ARIAUtils.setDescription(element, ls`${checkedDescription} breakpoint hit`);
      element.classList.add('breakpoint-hit');
      this.setDefaultFocusedElement(element);
    } else {
      UI.ARIAUtils.setDescription(element, checkedDescription);
    }

    element.addEventListener('keydown', event => {
      if (event.key === ' ') {
        checkboxLabel.checkboxElement.click();
        event.consume(true);
      }
    });

    const snippetElement = element.createChild('div', 'source-text monospace');
    const lineNumber = uiLocation.lineNumber;

    if (item.text && lineNumber < item.text.lineCount()) {
      const lineText = item.text.lineAt(lineNumber);
      const maxSnippetLength = 200;
      snippetElement.textContent =
          lineText.substring(item.showColumn ? uiLocation.columnNumber : 0).trimEndWithMaxLength(maxSnippetLength);
    }

    element[breakpointLocationsSymbol] = item.locations;
    element[locationSymbol] = uiLocation;
    return element;
  }

  /**
   * @override
   * @param {!BreakpointItem} item
   * @return {number}
   */
  heightForItem(item) {
    return 0;
  }

  /**
   * @override
   * @param {!BreakpointItem} item
   * @return {boolean}
   */
  isItemSelectable(item) {
    return true;
  }

  /**
   * @override
   * @param {?BreakpointItem} from
   * @param {?BreakpointItem} to
   * @param {?Element} fromElement
   * @param {?Element} toElement
   */
  selectedItemChanged(from, to, fromElement, toElement) {
    if (fromElement) {
      fromElement.tabIndex = -1;
    }
    if (toElement) {
      toElement.tabIndex = 0;
      this.setDefaultFocusedElement(toElement);
      if (this.hasFocus()) {
        toElement.focus();
      }
    }
  }

  /**
   * @override
   * @param {?Element} fromElement
   * @param {?Element} toElement
   * @return {boolean}
   */
  updateSelectedItemARIA(fromElement, toElement) {
    return true;
  }

  /**
   * @param {!Event} event
   * @return {!Array<!Bindings.BreakpointManager.BreakpointLocation>}
   */
  _breakpointLocations(event) {
    if (event.target instanceof Element) {
      return this._breakpointLocationsForElement(event.target);
    }
    return [];
  }

  /**
   * @param {!Element} element
   * @return {!Array<!Bindings.BreakpointManager.BreakpointLocation>}
   */
  _breakpointLocationsForElement(element) {
    const node = element.enclosingNodeOrSelfWithClass('breakpoint-entry');
    if (!node) {
      return [];
    }
    return node[breakpointLocationsSymbol] || [];
  }

  /**
   * @param {!Event} event
   */
  _breakpointCheckboxClicked(event) {
    const hadFocus = this.hasFocus();
    const breakpoints = this._breakpointLocations(event).map(breakpointLocation => breakpointLocation.breakpoint);
    const newState = event.target.checkboxElement.checked;
    for (const breakpoint of breakpoints) {
      breakpoint.setEnabled(newState);
      const item =
          this._breakpoints.find(breakpointItem => breakpointItem.locations.some(loc => loc.breakpoint === breakpoint));
      if (item) {
        this._list.refreshItem(item);
      }
    }
    if (hadFocus) {
      this.focus();
    }
    event.consume();
  }

  /**
   * @param {!Element} element
   */
  _revealLocation(element) {
    const uiLocations =
        this._breakpointLocationsForElement(element).map(breakpointLocation => breakpointLocation.uiLocation);
    let uiLocation = null;
    for (const uiLocationCandidate of uiLocations) {
      if (!uiLocation || uiLocationCandidate.columnNumber < uiLocation.columnNumber) {
        uiLocation = uiLocationCandidate;
      }
    }
    if (uiLocation) {
      Common.Revealer.reveal(uiLocation);
    }
  }

  /**
   * @param {!Event} event
   */
  _breakpointContextMenu(event) {
    const breakpoints = this._breakpointLocations(event).map(breakpointLocation => breakpointLocation.breakpoint);

    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    const removeEntryTitle = breakpoints.length > 1 ? Common.UIString.UIString('Remove all breakpoints in line') :
                                                      Common.UIString.UIString('Remove breakpoint');
    contextMenu.defaultSection().appendItem(
        removeEntryTitle, () => breakpoints.map(breakpoint => breakpoint.remove(false /* keepInStorage */)));
    if (event.target instanceof Element) {
      contextMenu.defaultSection().appendItem(ls`Reveal location`, this._revealLocation.bind(this, event.target));
    }

    const breakpointActive = Common.Settings.Settings.instance().moduleSetting('breakpointsActive').get();
    const breakpointActiveTitle = breakpointActive ? Common.UIString.UIString('Deactivate breakpoints') :
                                                     Common.UIString.UIString('Activate breakpoints');
    contextMenu.defaultSection().appendItem(
        breakpointActiveTitle,
        () => Common.Settings.Settings.instance().moduleSetting('breakpointsActive').set(!breakpointActive));

    if (breakpoints.some(breakpoint => !breakpoint.enabled())) {
      const enableTitle = Common.UIString.UIString('Enable all breakpoints');
      contextMenu.defaultSection().appendItem(enableTitle, this._toggleAllBreakpoints.bind(this, true));
      if (event.target instanceof Element) {
        const enableInFileTitle = Common.UIString.UIString('Enable breakpoints in file');
        contextMenu.defaultSection().appendItem(
            enableInFileTitle, this._toggleAllBreakpointsInFile.bind(this, event.target, true));
      }
    }
    if (breakpoints.some(breakpoint => breakpoint.enabled())) {
      const disableTitle = Common.UIString.UIString('Disable all breakpoints');
      contextMenu.defaultSection().appendItem(disableTitle, this._toggleAllBreakpoints.bind(this, false));
      if (event.target instanceof Element) {
        const disableInFileTitle = Common.UIString.UIString('Disable breakpoints in file');
        contextMenu.defaultSection().appendItem(
            disableInFileTitle, this._toggleAllBreakpointsInFile.bind(this, event.target, false));
      }
    }

    const removeAllTitle = Common.UIString.UIString('Remove all breakpoints');
    contextMenu.defaultSection().appendItem(removeAllTitle, this._removeAllBreakpoints.bind(this));
    const removeOtherTitle = Common.UIString.UIString('Remove other breakpoints');
    contextMenu.defaultSection().appendItem(
        removeOtherTitle, this._removeOtherBreakpoints.bind(this, new Set(breakpoints)));
    contextMenu.show();
  }

  /**
   * @param {!Element} element
   * @param {boolean} toggleState
   */
  _toggleAllBreakpointsInFile(element, toggleState) {
    const breakpointLocations = this._getBreakpointLocations();
    const selectedBreakpointLocations = this._breakpointLocationsForElement(element);
    breakpointLocations.forEach(breakpointLocation => {
      const matchesLocation = selectedBreakpointLocations.some(
          selectedBreakpointLocation =>
              selectedBreakpointLocation.breakpoint.url() === breakpointLocation.breakpoint.url());
      if (matchesLocation) {
        breakpointLocation.breakpoint.setEnabled(toggleState);
      }
    });
  }

  /**
   * @param {boolean} toggleState
   */
  _toggleAllBreakpoints(toggleState) {
    for (const breakpointLocation of this._breakpointManager.allBreakpointLocations()) {
      breakpointLocation.breakpoint.setEnabled(toggleState);
    }
  }

  _removeAllBreakpoints() {
    for (const breakpointLocation of this._breakpointManager.allBreakpointLocations()) {
      breakpointLocation.breakpoint.remove(false /* keepInStorage */);
    }
  }

  /**
   * @param {!Set<!Bindings.BreakpointManager.Breakpoint>} selectedBreakpoints
   */
  _removeOtherBreakpoints(selectedBreakpoints) {
    for (const breakpointLocation of this._breakpointManager.allBreakpointLocations()) {
      if (!selectedBreakpoints.has(breakpointLocation.breakpoint)) {
        breakpointLocation.breakpoint.remove(false /* keepInStorage */);
      }
    }
  }

  /**
   * @override
   * @param {?Object} object
   */
  flavorChanged(object) {
    this.update();
  }

  _didUpdateForTest() {
  }
}

class BreakpointItem {
  /**
   * @param {!Array<!BreakpointLocation>} locations
   * @param {?TextUtils.Text.Text} text
   * @param {boolean} isSelected
   * @param {boolean} showColumn
   */
  constructor(locations, text, isSelected, showColumn) {
    this.locations = locations;
    this.text = text;
    this.isSelected = isSelected;
    this.showColumn = showColumn;
  }

  /**
   * Checks if this item has not changed compared with the other
   * Used to cache model items between re-renders
   * @param {!BreakpointItem} other
   */
  isSimilar(other) {
    return this.locations.length === other.locations.length &&
        this.locations.every((l, idx) => l.uiLocation === other.locations[idx].uiLocation) &&
        this.locations.every((l, idx) => l.breakpoint === other.locations[idx].breakpoint) &&
        ((this.text === other.text) || (this.text && other.text && this.text.value() === other.text.value())) &&
        this.isSelected === other.isSelected && this.showColumn === other.showColumn;
  }
}

export const locationSymbol = Symbol('location');
export const checkboxLabelSymbol = Symbol('checkbox-label');
export const snippetElementSymbol = Symbol('snippet-element');
export const breakpointLocationsSymbol = Symbol('locations');

/** @typedef {{breakpoint: !Bindings.BreakpointManager.Breakpoint, uiLocation: !Workspace.UISourceCode.UILocation}} */
export let BreakpointLocation;
