// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @implements {UI.ListDelegate<!Profiler.IsolateSelector.ListItem>}
 * @implements {SDK.IsolateManager.Observer}
 */
Profiler.IsolateSelector = class extends UI.VBox {
  constructor() {
    super(true);

    /** @type {!UI.ListModel<!Profiler.IsolateSelector.ListItem>} */
    this._items = new UI.ListModel();
    /** @type {!UI.ListControl<!Profiler.IsolateSelector.ListItem>} */
    this._list = new UI.ListControl(this._items, this, UI.ListMode.NonViewport);
    this.contentElement.appendChild(this._list.element);

    this.registerRequiredCSS('profiler/profileLauncherView.css');
    /** @type {!Map<!SDK.IsolateManager.Isolate, !Profiler.IsolateSelector.ListItem>} */
    this._itemByIsolate = new Map();

    SDK.isolateManager.observeIsolates(this);

    SDK.targetManager.addEventListener(SDK.TargetManager.Events.NameChanged, this._targetChanged, this);
    SDK.targetManager.addEventListener(SDK.TargetManager.Events.InspectedURLChanged, this._targetChanged, this);
  }

  /**
   * @override
   */
  wasShown() {
    SDK.isolateManager.addEventListener(SDK.IsolateManager.Events.MemoryChanged, this._heapStatsChanged, this);
  }

  /**
   * @override
   */
  willHide() {
    SDK.isolateManager.removeEventListener(SDK.IsolateManager.Events.MemoryChanged, this._heapStatsChanged, this);
  }

  /**
   * @override
   * @param {!SDK.IsolateManager.Isolate} isolate
   */
  isolateAdded(isolate) {
    const item = new Profiler.IsolateSelector.ListItem(isolate);
    const index = item.model().target() === SDK.targetManager.mainTarget() ? 0 : this._items.length;
    this._items.insert(index, item);
    this._itemByIsolate.set(isolate, item);
    if (this._items.length === 1)
      this._list.selectItem(item);
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
   * @param {!Common.Event} event
   */
  _targetChanged(event) {
    const target = /** @type {!SDK.Target} */ (event.data);
    const model = target.model(SDK.RuntimeModel);
    if (!model)
      return;
    const isolate = SDK.isolateManager.isolateByModel(model);
    const item = isolate && this._itemByIsolate.get(isolate);
    if (item)
      item.updateTitle();
  }

  /**
   * @param {!Common.Event} event
   */
  _heapStatsChanged(event) {
    const isolate = /** @type {!SDK.IsolateManager.Isolate} */ (event.data);
    const listItem = this._itemByIsolate.get(isolate);
    if (listItem)
      listItem.updateStats();
  }

  /**
   * @override
   * @param {!Profiler.IsolateSelector.ListItem} item
   * @return {!Element}
   */
  createElementForItem(item) {
    return item.element;
  }

  /**
   * @override
   * @param {!Profiler.IsolateSelector.ListItem} item
   * @return {number}
   */
  heightForItem(item) {
  }

  /**
   * @override
   * @param {!Profiler.IsolateSelector.ListItem} item
   * @return {boolean}
   */
  isItemSelectable(item) {
    return true;
  }

  /**
   * @override
   * @param {?Profiler.IsolateSelector.ListItem} from
   * @param {?Profiler.IsolateSelector.ListItem} to
   * @param {?Element} fromElement
   * @param {?Element} toElement
   */
  selectedItemChanged(from, to, fromElement, toElement) {
    if (fromElement)
      fromElement.classList.remove('selected');
    if (toElement)
      toElement.classList.add('selected');
    const model = to && to.model();
    UI.context.setFlavor(SDK.HeapProfilerModel, model && model.heapProfilerModel());
    UI.context.setFlavor(SDK.CPUProfilerModel, model && model.target().model(SDK.CPUProfilerModel));
  }

  _update() {
    this._list.invalidateRange(0, this._items.length);
  }
};

Profiler.IsolateSelector.ListItem = class {
  /**
   * @param {!SDK.IsolateManager.Isolate} isolate
   */
  constructor(isolate) {
    this._isolate = isolate;
    const trendIntervalMinutes = Math.round(SDK.IsolateManager.MemoryTrendWindowMs / 60e3);
    this.element = createElementWithClass('div', 'profile-isolate-item hbox');
    this._heapDiv = this.element.createChild('div', 'profile-isolate-item-heap');
    this._trendDiv = this.element.createChild('div', 'profile-isolate-item-trend');
    this._trendDiv.setAttribute('title', ls`Heap size change trend over the last ${trendIntervalMinutes} minutes.`);
    this._nameDiv = this.element.createChild('div', 'profile-isolate-item-name');
    this._heapDiv.setAttribute('title', ls`Heap size in use by live JS objects.`);
    this.updateTitle();
  }

  /**
   * @return {!SDK.RuntimeModel}
   */
  model() {
    return this._isolate.models().values().next().value;
  }

  updateStats() {
    this._heapDiv.removeChildren();
    this._heapDiv.textContent = Number.bytesToString(this._isolate.usedHeapSize());

    const changeRateBytesPerSecond = this._isolate.usedHeapSizeGrowRate() * 1e3;
    const changeRateThresholdBytesPerSecond = 1024;
    if (Math.abs(changeRateBytesPerSecond) < changeRateThresholdBytesPerSecond || this._isolate.samplesCount() < 5)
      return;
    const changeRateText = changeRateBytesPerSecond > 0 ?
        ls`\u2B06${Number.bytesToString(changeRateBytesPerSecond)}/s` :
        ls`\u2B07${Number.bytesToString(-changeRateBytesPerSecond)}/s`;
    this._trendDiv.classList.toggle('increasing', changeRateBytesPerSecond > 0);
    this._trendDiv.textContent = changeRateText;
  }

  updateTitle() {
    /** @type {!Map<string, number>} */
    const modelCountByName = new Map();
    for (const model of this._isolate.models()) {
      const target = model.target();
      const name = SDK.targetManager.mainTarget() !== target ? target.name() : '';
      const parsedURL = new Common.ParsedURL(target.inspectedURL());
      const domain = parsedURL.isValid ? parsedURL.domain() : '';
      const title = target.decorateLabel(domain && name ? `${domain}: ${name}` : name || domain || ls`(empty)`);
      modelCountByName.set(title, (modelCountByName.get(title) || 0) + 1);
    }
    this._nameDiv.removeChildren();
    for (const [name, count] of modelCountByName) {
      const title = count > 1 ? `${name} (${count})` : name;
      this._nameDiv.appendChild(UI.html`<div title="${title}">${title}</div>`);
    }
  }
};
