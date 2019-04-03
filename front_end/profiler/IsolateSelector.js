// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @implements {UI.ListDelegate<!Profiler.IsolateSelector.ListItem>}
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
    this._updateTimer = null;

    this._isolateManager = new SDK.IsolateManager();
    this._isolateManager.addEventListener(SDK.IsolateManager.Events.IsolateAdded, this._isolateAdded, this);
    this._isolateManager.addEventListener(SDK.IsolateManager.Events.IsolateRemoved, this._isolateRemoved, this);
    this._isolateManager.addEventListener(SDK.IsolateManager.Events.IsolateChanged, this._isolateChanged, this);

    SDK.targetManager.addEventListener(SDK.TargetManager.Events.NameChanged, this._targetChanged, this);
    SDK.targetManager.addEventListener(SDK.TargetManager.Events.InspectedURLChanged, this._targetChanged, this);
  }

  /**
   * @override
   */
  wasShown() {
    this._updateStats();
  }

  /**
   * @override
   */
  willHide() {
    clearTimeout(this._updateTimer);
  }

  /**
   * @param {!Common.Event} event
   */
  _isolateAdded(event) {
    const isolate = /** @type {!SDK.IsolateManager.Isolate} */ (event.data);
    const item = new Profiler.IsolateSelector.ListItem(isolate);
    const index = item.model().target() === SDK.targetManager.mainTarget() ? 0 : this._items.length;
    this._items.insert(index, item);
    this._itemByIsolate.set(isolate, item);
    if (this._items.length === 1)
      this._list.selectItem(item);
    this._update();
  }

  /**
   * @param {!Common.Event} event
   */
  _isolateChanged(event) {
    const isolate = /** @type {!SDK.IsolateManager.Isolate} */ (event.data);
    const item = this._itemByIsolate.get(isolate);
    item.updateTitle();
    this._update();
  }

  /**
   * @param {!Common.Event} event
   */
  _isolateRemoved(event) {
    const isolate = /** @type {!SDK.IsolateManager.Isolate} */ (event.data);
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
    const isolate = this._isolateManager.isolateByModel(model);
    const item = isolate && this._itemByIsolate.get(isolate);
    if (item)
      item.updateTitle();
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

  _updateStats() {
    for (const item of this._itemByIsolate.values())
      item.updateStats();
    const heapStatsUpdateIntervalMs = 2000;
    this._updateTimer = setTimeout(() => this._updateStats(), heapStatsUpdateIntervalMs);
  }
};

Profiler.IsolateSelector.ListItem = class {
  /**
   * @param {!SDK.IsolateManager.Isolate} isolateInfo
   */
  constructor(isolateInfo) {
    this._isolateInfo = isolateInfo;
    this.element = createElementWithClass('div', 'profile-isolate-item hbox');
    this._heapDiv = this.element.createChild('div', 'profile-isolate-item-heap');
    this._nameDiv = this.element.createChild('div', 'profile-isolate-item-name');
    this._updatesDisabled = false;
    this.updateTitle();
    this.updateStats();
  }

  /**
   * @return {!Set<!SDK.RuntimeModel>}
   */
  models() {
    return this._isolateInfo.models();
  }

  /**
   * @return {!SDK.RuntimeModel}
   */
  model() {
    return this.models().values().next().value;
  }

  async updateStats() {
    if (this._updatesDisabled)
      return;
    const heapStats = await this.model().heapUsage();
    if (!heapStats) {
      this._updatesDisabled = true;
      return;
    }
    const usedTitle = ls`Heap size in use by live JS objects.`;
    const totalTitle = ls`Total JS heap size including live objects, garbage, and reserved space.`;
    this._heapDiv.removeChildren();
    this._heapDiv.append(UI.html`
        <span title="${usedTitle}">${Number.bytesToString(heapStats.usedSize)}</span>
        <span> / </span>
        <span title="${totalTitle}">${Number.bytesToString(heapStats.totalSize)}</span>`);
  }

  updateTitle() {
    /** @type {!Map<string, number>} */
    const modelCountByName = new Map();
    for (const model of this.models()) {
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
