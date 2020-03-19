// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

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
   * @override
   * @return {!Promise<?>}
   */
  async doUpdate() {
    const hadFocus = this.hasFocus();
    const breakpointLocations = this._breakpointManager.allBreakpointLocations().filter(
        breakpointLocation =>
            breakpointLocation.uiLocation.uiSourceCode.project().type() !== Workspace.Workspace.projectTypes.Debugger);
    if (!breakpointLocations.length) {
      this._list.element.classList.add('hidden');
      this._emptyElement.classList.remove('hidden');
      this._breakpoints.replaceAll([]);
      this._didUpdateForTest();
      return Promise.resolve();
    }

    this._list.element.classList.remove('hidden');
    this._emptyElement.classList.add('hidden');

    breakpointLocations.sort((item1, item2) => item1.uiLocation.compareTo(item2.uiLocation));

    /** @type {!Platform.Multimap<string, string>} */
    const breakpointEntriesForLine = new Platform.Multimap();

    /** @type {!Platform.Multimap<string, !{breakpoint: !Bindings.BreakpointManager.Breakpoint, uiLocation: !Workspace.UISourceCode.UILocation}>} */
    const locationForEntry = new Platform.Multimap();
    for (const breakpointLocation of breakpointLocations) {
      const uiLocation = breakpointLocation.uiLocation;
      const entryDescriptor = `${uiLocation.uiSourceCode.url()}:${uiLocation.lineNumber}:${uiLocation.columnNumber}`;
      locationForEntry.set(entryDescriptor, breakpointLocation);
      const lineDescriptor = `${uiLocation.uiSourceCode.url()}:${uiLocation.lineNumber}`;
      breakpointEntriesForLine.set(lineDescriptor, entryDescriptor);
    }

    const details = self.UI.context.flavor(SDK.DebuggerModel.DebuggerPausedDetails);
    const selectedUILocation = details && details.callFrames.length ?
        await Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().rawLocationToUILocation(
            details.callFrames[0].location()) :
        null;

    let shouldShowView = false;
    const promises = [];
    const breakpoints = [];
    let itemToSelect;
    for (const descriptor of locationForEntry.keysArray()) {
      const locations = Array.from(locationForEntry.get(descriptor));
      const breakpointLocation = locations[0];
      const uiLocation = breakpointLocation.uiLocation;
      const isSelected =
          !!selectedUILocation && locations.some(location => location.uiLocation.id() === selectedUILocation.id());
      const showColumn =
          breakpointEntriesForLine.get(`${uiLocation.uiSourceCode.url()}:${uiLocation.lineNumber}`).size > 1;

      const content = uiLocation.uiSourceCode.requestContent();
      promises.push(content);
      const item = {breakpointLocation, locations, isSelected, showColumn, content};
      breakpoints.push(item);
      if (this._list.selectedItem() &&
          this._list.selectedItem().breakpointLocation.breakpoint === breakpointLocation.breakpoint) {
        itemToSelect = item;
      }
      if (isSelected) {
        shouldShowView = true;
      }
    }
    if (shouldShowView) {
      UI.ViewManager.ViewManager.instance().showView('sources.jsBreakpoints');
    }
    this._list.element.classList.toggle(
        'breakpoints-list-deactivated', !Common.Settings.Settings.instance().moduleSetting('breakpointsActive').get());
    this._breakpoints.replaceAll(breakpoints);
    this._list.selectItem(itemToSelect || this._breakpoints.at(0));
    if (hadFocus) {
      this.focus();
    }
    return Promise.all(promises).then(() => this._didUpdateForTest());
  }

  /**
   * @override
   * @param {!BreakpointItem} item
   * @return {!Element}
   */
  createElementForItem(item) {
    const element = createElementWithClass('div', 'breakpoint-entry');
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
    item.content.then(content => {
      const lineNumber = uiLocation.lineNumber;
      const text = new TextUtils.Text.Text(content.content || '');
      if (lineNumber < text.lineCount()) {
        const lineText = text.lineAt(lineNumber);
        const maxSnippetLength = 200;
        snippetElement.textContent =
            lineText.substring(item.showColumn ? uiLocation.columnNumber : 0).trimEndWithMaxLength(maxSnippetLength);
      }
    });

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
          this._breakpoints.find(breakpointItem => breakpointItem.breakpointLocation.breakpoint === breakpoint);
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
    }
    if (breakpoints.some(breakpoint => breakpoint.enabled())) {
      const disableTitle = Common.UIString.UIString('Disable all breakpoints');
      contextMenu.defaultSection().appendItem(disableTitle, this._toggleAllBreakpoints.bind(this, false));
    }
    const removeAllTitle = Common.UIString.UIString('Remove all breakpoints');
    contextMenu.defaultSection().appendItem(removeAllTitle, this._removeAllBreakpoints.bind(this));
    const removeOtherTitle = Common.UIString.UIString('Remove other breakpoints');
    contextMenu.defaultSection().appendItem(
        removeOtherTitle, this._removeOtherBreakpoints.bind(this, new Set(breakpoints)));
    contextMenu.show();
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

export const locationSymbol = Symbol('location');
export const checkboxLabelSymbol = Symbol('checkbox-label');
export const snippetElementSymbol = Symbol('snippet-element');
export const breakpointLocationsSymbol = Symbol('locations');

/** @typedef {{breakpoint: !Bindings.BreakpointManager.Breakpoint, uiLocation: !Workspace.UISourceCode.UILocation}} */
export let Breakpoint;

/**
 * @typedef {{
 * breakpointLocation: !Breakpoint,
 * locations: !Array.<!Breakpoint>,
 * showColumn: boolean,
 * isSelected: boolean,
 * content: !Promise.<?string>
 * }}
 */
export let BreakpointItem;
