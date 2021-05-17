// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import type * as Common from '../../../core/common/common.js'; // eslint-disable-line no-unused-vars
import * as i18n from '../../../core/i18n/i18n.js';
import * as UI from '../../legacy/legacy.js';

import type {Settings} from './LinearMemoryInspector.js';
import {LinearMemoryInspector} from './LinearMemoryInspector.js';  // eslint-disable-line no-unused-vars
import type {LazyUint8Array} from './LinearMemoryInspectorController.js';
import {LinearMemoryInspectorController} from './LinearMemoryInspectorController.js';  // eslint-disable-line no-unused-vars

const UIStrings = {
  /**
  *@description Label in the Linear Memory Inspector tool that serves as a placeholder if no inspections are open (i.e. nothing to see here).
  *             Inspection hereby refers to viewing, navigating and understanding the memory through this tool.
  */
  noOpenInspections: 'No open inspections',
};
const str_ =
    i18n.i18n.registerUIStrings('ui/components/linear_memory_inspector/LinearMemoryInspectorPane.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
let inspectorInstance: LinearMemoryInspectorPaneImpl;

let wrapperInstance: Wrapper;

export class Wrapper extends UI.Widget.VBox {
  view: LinearMemoryInspectorPaneImpl;
  private constructor() {
    super();
    this.view = LinearMemoryInspectorPaneImpl.instance();
  }

  static instance(opts: {
    forceNew: boolean|null,
  } = {forceNew: null}): Wrapper {
    const {forceNew} = opts;
    if (!wrapperInstance || forceNew) {
      wrapperInstance = new Wrapper();
    }

    return wrapperInstance;
  }

  wasShown(): void {
    this.view.show(this.contentElement);
  }
}

export class LinearMemoryInspectorPaneImpl extends UI.Widget.VBox {
  _tabbedPane: UI.TabbedPane.TabbedPane;
  _tabIdToInspectorView: Map<string, LinearMemoryInspectorView>;
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

    this._tabIdToInspectorView = new Map();
  }

  static instance(): LinearMemoryInspectorPaneImpl {
    if (!inspectorInstance) {
      inspectorInstance = new LinearMemoryInspectorPaneImpl();
    }
    return inspectorInstance;
  }

  create(tabId: string, title: string, arrayWrapper: LazyUint8Array, address?: number): void {
    const inspectorView = new LinearMemoryInspectorView(arrayWrapper, address);
    this._tabIdToInspectorView.set(tabId, inspectorView);
    this._tabbedPane.appendTab(tabId, title, inspectorView, undefined, false, true);
    this._tabbedPane.selectTab(tabId);
  }

  close(tabId: string): void {
    this._tabbedPane.closeTab(tabId, false);
  }

  reveal(tabId: string, address?: number): void {
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

  refreshView(tabId: string): void {
    const view = this._tabIdToInspectorView.get(tabId);
    if (!view) {
      throw new Error(`View for specified tab id does not exist: ${tabId}`);
    }
    view.refreshData();
  }

  _tabClosed(event: Common.EventTarget.EventTargetEvent): void {
    const tabId = event.data.tabId;
    this._tabIdToInspectorView.delete(tabId);
    this.dispatchEventToListeners('view-closed', tabId);
  }
}

class LinearMemoryInspectorView extends UI.Widget.VBox {
  _memoryWrapper: LazyUint8Array;
  _address: number;
  _inspector: LinearMemoryInspector;
  firstTimeOpen: boolean;
  constructor(memoryWrapper: LazyUint8Array, address: number|undefined = 0) {
    super(false);

    if (address < 0 || address >= memoryWrapper.length()) {
      throw new Error('Requested address is out of bounds.');
    }

    this._memoryWrapper = memoryWrapper;
    this._address = address;
    this._inspector = new LinearMemoryInspector();
    this._inspector.addEventListener('memoryrequest', (event: Event) => {
      // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this._memoryRequested((event as any));
    });
    this._inspector.addEventListener('addresschanged', (event: Event) => {
      // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.updateAddress((event as any).data);
    });
    this._inspector.addEventListener('settingschanged', (event: Event) => {
      // Stop event from bubbling up, since no element further up needs the event.
      event.stopPropagation();
      // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.saveSettings((event as any).data);
    });
    this.contentElement.appendChild(this._inspector);
    this.firstTimeOpen = true;
  }

  wasShown(): void {
    this.refreshData();
  }

  saveSettings(settings: Settings): void {
    LinearMemoryInspectorController.instance().saveSettings(settings);
  }

  updateAddress(address: number): void {
    if (address < 0 || address >= this._memoryWrapper.length()) {
      throw new Error('Requested address is out of bounds.');
    }
    this._address = address;
  }

  refreshData(): void {
    LinearMemoryInspectorController.getMemoryForAddress(this._memoryWrapper, this._address).then(({memory, offset}) => {
      let valueTypes;
      let valueTypeModes;
      let endianness;
      if (this.firstTimeOpen) {
        const settings = LinearMemoryInspectorController.instance().loadSettings();
        valueTypes = settings.valueTypes;
        valueTypeModes = settings.modes;
        endianness = settings.endianness;
        this.firstTimeOpen = false;
      }
      this._inspector.data = {
        memory,
        address: this._address,
        memoryOffset: offset,
        outerMemoryLength: this._memoryWrapper.length(),
        valueTypes,
        valueTypeModes,
        endianness,
      };
    });
  }

  _memoryRequested(event: Common.EventTarget.EventTargetEvent): void {
    const {start, end, address} = (event.data as {
      start: number,
      end: number,
      address: number,
    });
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
