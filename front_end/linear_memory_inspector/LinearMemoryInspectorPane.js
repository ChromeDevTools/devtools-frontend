// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';  // eslint-disable-line no-unused-vars
import * as i18n from '../i18n/i18n.js';
import * as UI from '../ui/ui.js';

import {LinearMemoryInspector} from './LinearMemoryInspector.js';
import {LazyUint8Array, LinearMemoryInspectorController} from './LinearMemoryInspectorController.js';  // eslint-disable-line no-unused-vars

export const UIStrings = {
  /**
  *@description Label in the Linear Memory Inspector tool that serves as a placeholder if no inspections are open
  */
  noOpenInspections: 'No open inspections',
};
const str_ = i18n.i18n.registerUIStrings('linear_memory_inspector/LinearMemoryInspectorPane.js', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
/** @type {!LinearMemoryInspectorPaneImpl} */
let inspectorInstance;

/** @type {!Wrapper} */
let wrapperInstance;

export class Wrapper extends UI.Widget.VBox {
  /** @private */
  constructor() {
    super();
    this.view = LinearMemoryInspectorPaneImpl.instance();
  }

  /**
   * @param {{forceNew: ?boolean}} opts
   */
  static instance(opts = {forceNew: null}) {
    const {forceNew} = opts;
    if (!wrapperInstance || forceNew) {
      wrapperInstance = new Wrapper();
    }

    return wrapperInstance;
  }

  /**
   * @override
   */
  wasShown() {
    this.view.show(this.contentElement);
  }
}

export class LinearMemoryInspectorPaneImpl extends UI.Widget.VBox {
  constructor() {
    super(false);
    const placeholder = document.createElement('div');
    placeholder.textContent = i18nString(UIStrings.noOpenInspections);
    placeholder.style.display = 'flex';
    this._tabbedPane = new UI.TabbedPane.TabbedPane();
    this._tabbedPane.setPlaceholderElement(placeholder);
    this._tabbedPane.setCloseableTabs(true);
    this._tabbedPane.setAllowTabReorder(true, true);
    this._tabbedPane.addEventListener(UI.TabbedPane.Events.TabClosed, this._tabClosed, this);
    this._tabbedPane.show(this.contentElement);

    /** @type {!Map<string, LinearMemoryInspectorView>} */
    this._tabIdToInspectorView = new Map();
  }

  static instance() {
    if (!inspectorInstance) {
      inspectorInstance = new LinearMemoryInspectorPaneImpl();
    }
    return inspectorInstance;
  }

  /**
   * @param {string} tabId
   * @param {string} title
   * @param {!LazyUint8Array} arrayWrapper
   * @param {number} address
   */
  create(tabId, title, arrayWrapper, address) {
    const inspectorView = new LinearMemoryInspectorView(arrayWrapper, address);
    this._tabIdToInspectorView.set(tabId, inspectorView);
    this._tabbedPane.appendTab(tabId, title, inspectorView, undefined, false, true);
    this._tabbedPane.selectTab(tabId);
  }

  /**
   * @param {string} tabId
   */
  close(tabId) {
    this._tabbedPane.closeTab(tabId, false);
  }

  /**
   * @param {string} tabId
   * @param {number=} address
   */
  reveal(tabId, address) {
    const view = this._tabIdToInspectorView.get(tabId);
    if (!view) {
      throw new Error(`No linear memory inspector view for given tab id: ${tabId}`);
    }

    if (address !== undefined) {
      view.updateAddress(address);
    }
    this.refreshView(tabId);
    this._tabbedPane.selectTab(tabId);
  }

  /**
   * @param {string} tabId
   */
  refreshView(tabId) {
    const view = this._tabIdToInspectorView.get(tabId);
    if (!view) {
      throw new Error(`View for specified tab id does not exist: ${tabId}`);
    }
    view.refreshData();
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _tabClosed(event) {
    const tabId = event.data.tabId;
    this._tabIdToInspectorView.delete(tabId);
    this.dispatchEventToListeners('view-closed', tabId);
  }
}

class LinearMemoryInspectorView extends UI.Widget.VBox {
  /**
   *
   * @param {!LazyUint8Array} memoryWrapper
   * @param {number} address
   */
  constructor(memoryWrapper, address) {
    super(false);

    if (address < 0 || address >= memoryWrapper.length()) {
      throw new Error('Requested address is out of bounds.');
    }

    this._memoryWrapper = memoryWrapper;
    this._address = address;
    this._inspector = new LinearMemoryInspector();
    this._inspector.addEventListener('memory-request', /** @param {!Event} event */ event => {
      this._memoryRequested(/** @type {?} */ (event));
    });
    this._inspector.addEventListener('address-changed', /** @param {?} event */ event => {
      this.updateAddress(event.data);
    });
    this.contentElement.appendChild(this._inspector);
  }

  /**
   * @override
   */
  wasShown() {
    this.refreshData();
  }

  /**
   * @param {number} address
   */
  updateAddress(address) {
    if (address < 0 || address >= this._memoryWrapper.length()) {
      throw new Error('Requested address is out of bounds.');
    }
    this._address = address;
  }

  refreshData() {
    LinearMemoryInspectorController.getMemoryForAddress(this._memoryWrapper, this._address).then(({memory, offset}) => {
      this._inspector.data = {
        memory: memory,
        address: this._address,
        memoryOffset: offset,
        outerMemoryLength: this._memoryWrapper.length(),
      };
    });
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _memoryRequested(event) {
    const {start, end, address} = /** @type {!{start: number, end: number, address: number}} */ (event.data);
    if (address < start || address >= end) {
      throw new Error('Requested address is out of bounds.');
    }

    LinearMemoryInspectorController.getMemoryRange(this._memoryWrapper, start, end).then(memory => {
      this._inspector.data = {
        memory: memory,
        address: address,
        memoryOffset: start,
        outerMemoryLength: this._memoryWrapper.length(),
      };
    });
  }
}
