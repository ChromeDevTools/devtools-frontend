// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';

/**
 * @implements {UI.ListControl.ListDelegate<!ListItem>}
 * @implements {SDK.IsolateManager.Observer}
 */
export class IsolateSelector extends UI.Widget.VBox {
  constructor() {
    super(false);

    /** @type {!UI.ListModel.ListModel<!ListItem>} */
    this._items = new UI.ListModel.ListModel();
    /** @type {!UI.ListControl.ListControl<!ListItem>} */
    this._list = new UI.ListControl.ListControl(this._items, this, UI.ListControl.ListMode.NonViewport);
    this._list.element.tabIndex = 0;
    this._list.element.classList.add('javascript-vm-instances-list');
    UI.ARIAUtils.setAccessibleName(this._list.element, ls`JavaScript VM instances`);
    this.contentElement.appendChild(this._list.element);

    /** @type {!Map<!SDK.IsolateManager.Isolate, !ListItem>} */
    this._itemByIsolate = new Map();

    this._totalElement = createElementWithClass('div', 'profile-memory-usage-item hbox');
    this._totalValueDiv = this._totalElement.createChild('div', 'profile-memory-usage-item-size');
    this._totalTrendDiv = this._totalElement.createChild('div', 'profile-memory-usage-item-trend');
    this._totalElement.createChild('div').textContent = ls`Total JS heap size`;
    const trendIntervalMinutes = Math.round(SDK.IsolateManager.MemoryTrendWindowMs / 60e3);
    this._totalTrendDiv.title = ls`Total page JS heap size change trend over the last ${trendIntervalMinutes} minutes.`;
    this._totalValueDiv.title = ls`Total page JS heap size across all VM instances.`;

    self.SDK.isolateManager.observeIsolates(this);
    SDK.SDKModel.TargetManager.instance().addEventListener(SDK.SDKModel.Events.NameChanged, this._targetChanged, this);
    SDK.SDKModel.TargetManager.instance().addEventListener(
        SDK.SDKModel.Events.InspectedURLChanged, this._targetChanged, this);
  }

  /**
   * @override
   */
  wasShown() {
    self.SDK.isolateManager.addEventListener(SDK.IsolateManager.Events.MemoryChanged, this._heapStatsChanged, this);
  }

  /**
   * @override
   */
  willHide() {
    self.SDK.isolateManager.removeEventListener(SDK.IsolateManager.Events.MemoryChanged, this._heapStatsChanged, this);
  }

  /**
   * @override
   * @param {!SDK.IsolateManager.Isolate} isolate
   */
  isolateAdded(isolate) {
    const item = new ListItem(isolate);
    const index = item.model().target() === SDK.SDKModel.TargetManager.instance().mainTarget() ? 0 : this._items.length;
    this._items.insert(index, item);
    this._itemByIsolate.set(isolate, item);
    if (this._items.length === 1 || isolate.isMainThread()) {
      this._list.selectItem(item);
    }
    this._update();
  }

  /**
   * @override
   * @param {!SDK.IsolateManager.Isolate} isolate
   */
  isolateChanged(isolate) {
    const item = this._itemByIsolate.get(isolate);
    item.updateTitle();
    this._update();
  }

  /**
   * @override
   * @param {!SDK.IsolateManager.Isolate} isolate
   */
  isolateRemoved(isolate) {
    const item = this._itemByIsolate.get(isolate);
    this._items.remove(this._items.indexOf(item));
    this._itemByIsolate.delete(isolate);
    this._update();
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _targetChanged(event) {
    const target = /** @type {!SDK.SDKModel.Target} */ (event.data);
    const model = target.model(SDK.RuntimeModel.RuntimeModel);
    if (!model) {
      return;
    }
    const isolate = self.SDK.isolateManager.isolateByModel(model);
    const item = isolate && this._itemByIsolate.get(isolate);
    if (item) {
      item.updateTitle();
    }
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _heapStatsChanged(event) {
    const isolate = /** @type {!SDK.IsolateManager.Isolate} */ (event.data);
    const listItem = this._itemByIsolate.get(isolate);
    if (listItem) {
      listItem.updateStats();
    }
    this._updateTotal();
  }

  _updateTotal() {
    let total = 0;
    let trend = 0;
    for (const isolate of self.SDK.isolateManager.isolates()) {
      total += isolate.usedHeapSize();
      trend += isolate.usedHeapSizeGrowRate();
    }
    this._totalValueDiv.textContent = Number.bytesToString(total);
    IsolateSelector._formatTrendElement(trend, this._totalTrendDiv);
  }

  /**
   * @param {number} trendValueMs
   * @param {!Element} element
   */
  static _formatTrendElement(trendValueMs, element) {
    const changeRateBytesPerSecond = trendValueMs * 1e3;
    const changeRateThresholdBytesPerSecond = 1024;
    if (Math.abs(changeRateBytesPerSecond) < changeRateThresholdBytesPerSecond) {
      return;
    }
    const changeRateText = Number.bytesToString(Math.abs(changeRateBytesPerSecond));
    let changeText, changeLabel;
    if (changeRateBytesPerSecond > 0) {
      changeText = ls`\u2B06${changeRateText}/s`;
      element.classList.toggle('increasing', true);
      changeLabel = ls`increasing by ${changeRateText} per second`;
    } else {
      changeText = ls`\u2B07${changeRateText}/s`;
      element.classList.toggle('increasing', false);
      changeLabel = ls`decreasing by ${changeRateText} per second`;
    }
    element.textContent = changeText;
    UI.ARIAUtils.setAccessibleName(element, changeLabel);
  }

  /**
   * @return {!Element}
   */
  totalMemoryElement() {
    return this._totalElement;
  }

  /**
   * @override
   * @param {!ListItem} item
   * @return {!Element}
   */
  createElementForItem(item) {
    return item.element;
  }

  /**
   * @override
   * @param {!ListItem} item
   * @return {number}
   */
  heightForItem(item) {
  }

  /**
   * @override
   * @param {?Element} fromElement
   * @param {?Element} toElement
   * @return {boolean}
   */
  updateSelectedItemARIA(fromElement, toElement) {
    return false;
  }

  /**
   * @override
   * @param {!ListItem} item
   * @return {boolean}
   */
  isItemSelectable(item) {
    return true;
  }

  /**
   * @override
   * @param {?ListItem} from
   * @param {?ListItem} to
   * @param {?Element} fromElement
   * @param {?Element} toElement
   */
  selectedItemChanged(from, to, fromElement, toElement) {
    if (fromElement) {
      fromElement.classList.remove('selected');
    }
    if (toElement) {
      toElement.classList.add('selected');
    }
    const model = to && to.model();
    self.UI.context.setFlavor(SDK.HeapProfilerModel.HeapProfilerModel, model && model.heapProfilerModel());
    self.UI.context.setFlavor(
        SDK.CPUProfilerModel.CPUProfilerModel, model && model.target().model(SDK.CPUProfilerModel.CPUProfilerModel));
  }

  _update() {
    this._updateTotal();
    this._list.invalidateRange(0, this._items.length);
  }
}

export class ListItem {
  /**
   * @param {!SDK.IsolateManager.Isolate} isolate
   */
  constructor(isolate) {
    this._isolate = isolate;
    const trendIntervalMinutes = Math.round(SDK.IsolateManager.MemoryTrendWindowMs / 60e3);
    this.element = createElementWithClass('div', 'profile-memory-usage-item hbox');
    UI.ARIAUtils.markAsOption(this.element);
    this._heapDiv = this.element.createChild('div', 'profile-memory-usage-item-size');
    this._heapDiv.title = ls`Heap size in use by live JS objects.`;
    this._trendDiv = this.element.createChild('div', 'profile-memory-usage-item-trend');
    this._trendDiv.title = ls`Heap size change trend over the last ${trendIntervalMinutes} minutes.`;
    this._nameDiv = this.element.createChild('div', 'profile-memory-usage-item-name');
    this.updateTitle();
  }

  /**
   * @return {?SDK.RuntimeModel.RuntimeModel}
   */
  model() {
    return this._isolate.runtimeModel();
  }

  updateStats() {
    this._heapDiv.textContent = Number.bytesToString(this._isolate.usedHeapSize());
    IsolateSelector._formatTrendElement(this._isolate.usedHeapSizeGrowRate(), this._trendDiv);
  }

  updateTitle() {
    /** @type {!Map<string, number>} */
    const modelCountByName = new Map();
    for (const model of this._isolate.models()) {
      const target = model.target();
      const name = SDK.SDKModel.TargetManager.instance().mainTarget() !== target ? target.name() : '';
      const parsedURL = new Common.ParsedURL.ParsedURL(target.inspectedURL());
      const domain = parsedURL.isValid ? parsedURL.domain() : '';
      const title = target.decorateLabel(domain && name ? `${domain}: ${name}` : name || domain || ls`(empty)`);
      modelCountByName.set(title, (modelCountByName.get(title) || 0) + 1);
    }
    this._nameDiv.removeChildren();
    const titles = [];
    for (const [name, count] of modelCountByName) {
      const title = count > 1 ? `${name} (${count})` : name;
      titles.push(title);
      const titleDiv = this._nameDiv.createChild('div');
      titleDiv.textContent = title;
      titleDiv.title = title;
    }
  }
}
