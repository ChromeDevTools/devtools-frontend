// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as Platform from '../platform/platform.js';
import * as UI from '../ui/ui.js';

import {PerformanceModel} from './PerformanceModel.js';  // eslint-disable-line no-unused-vars
import {TimelineEventOverviewCPUActivity, TimelineEventOverviewFrames, TimelineEventOverviewNetwork, TimelineEventOverviewResponsiveness,} from './TimelineEventOverview.js';

export class TimelineHistoryManager {
  constructor() {
    /** @type {!Array<!PerformanceModel>} */
    this._recordings = [];
    this._action = /** @type {!UI.Action.Action} */ (self.UI.actionRegistry.action('timeline.show-history'));
    /** @type {!Map<string, number>} */
    this._nextNumberByDomain = new Map();
    this._button = new ToolbarButton(this._action);

    UI.ARIAUtils.markAsMenuButton(this._button.element);
    this.clear();

    this._allOverviews = [
      {constructor: TimelineEventOverviewResponsiveness, height: 3},
      {constructor: TimelineEventOverviewFrames, height: 16},
      {constructor: TimelineEventOverviewCPUActivity, height: 20},
      {constructor: TimelineEventOverviewNetwork, height: 8}
    ];
    this._totalHeight = this._allOverviews.reduce((acc, entry) => acc + entry.height, 0);
    this._enabled = true;
    /** @type {?PerformanceModel} */
    this._lastActiveModel = null;
  }

  /**
   * @param {!PerformanceModel} performanceModel
   */
  addRecording(performanceModel) {
    this._lastActiveModel = performanceModel;
    this._recordings.unshift(performanceModel);
    this._buildPreview(performanceModel);
    const modelTitle = this._title(performanceModel);
    this._button.setText(modelTitle);
    const buttonTitle = this._action.title();
    UI.ARIAUtils.setAccessibleName(this._button.element, ls`Current Session: ${modelTitle}. ${buttonTitle}`);
    this._updateState();
    if (this._recordings.length <= maxRecordings) {
      return;
    }
    const lruModel = this._recordings.reduce((a, b) => lastUsedTime(a) < lastUsedTime(b) ? a : b);
    this._recordings.splice(this._recordings.indexOf(lruModel), 1);
    lruModel.dispose();

    /**
     * @param {!PerformanceModel} model
     * @return {number}
     */
    function lastUsedTime(model) {
      return TimelineHistoryManager._dataForModel(model).lastUsed;
    }
  }

  /**
   * @param {boolean} enabled
   */
  setEnabled(enabled) {
    this._enabled = enabled;
    this._updateState();
  }

  button() {
    return this._button;
  }

  clear() {
    this._recordings.forEach(model => model.dispose());
    this._recordings = [];
    this._lastActiveModel = null;
    this._updateState();
    this._button.setText(Common.UIString.UIString('(no recordings)'));
    this._nextNumberByDomain.clear();
  }

  /**
   * @return {!Promise<?PerformanceModel>}
   */
  async showHistoryDropDown() {
    if (this._recordings.length < 2 || !this._enabled) {
      return null;
    }

    // DropDown.show() function finishes when the dropdown menu is closed via selection or losing focus
    const model = await DropDown.show(
        this._recordings, /** @type {!PerformanceModel} */ (this._lastActiveModel), this._button.element);
    if (!model) {
      return null;
    }
    const index = this._recordings.indexOf(model);
    if (index < 0) {
      console.assert(false, 'selected recording not found');
      return null;
    }
    this._setCurrentModel(model);
    return model;
  }

  cancelIfShowing() {
    DropDown.cancelIfShowing();
  }

  /**
   * @param {number} direction
   * @return {?PerformanceModel}
   */
  navigate(direction) {
    if (!this._enabled || !this._lastActiveModel) {
      return null;
    }
    const index = this._recordings.indexOf(this._lastActiveModel);
    if (index < 0) {
      return null;
    }
    const newIndex = Platform.NumberUtilities.clamp(index + direction, 0, this._recordings.length - 1);
    const model = this._recordings[newIndex];
    this._setCurrentModel(model);
    return model;
  }

  /**
   * @param {!PerformanceModel} model
   */
  _setCurrentModel(model) {
    TimelineHistoryManager._dataForModel(model).lastUsed = Date.now();
    this._lastActiveModel = model;
    const modelTitle = this._title(model);
    const buttonTitle = this._action.title();
    this._button.setText(modelTitle);
    UI.ARIAUtils.setAccessibleName(this._button.element, ls`Current Session: ${modelTitle}. ${buttonTitle}`);
  }

  _updateState() {
    this._action.setEnabled(this._recordings.length > 1 && this._enabled);
  }

  /**
   * @param {!PerformanceModel} performanceModel
   * @return {!Element}
   */
  static _previewElement(performanceModel) {
    const data = TimelineHistoryManager._dataForModel(performanceModel);
    const startedAt = performanceModel.recordStartTime();
    data.time.textContent =
        startedAt ? Common.UIString.UIString('(%s ago)', TimelineHistoryManager._coarseAge(startedAt)) : '';
    return data.preview;
  }

  /**
   * @param {number} time
   * @return {string}
   */
  static _coarseAge(time) {
    const seconds = Math.round((Date.now() - time) / 1000);
    if (seconds < 50) {
      return Common.UIString.UIString('moments');
    }
    const minutes = Math.round(seconds / 60);
    if (minutes < 50) {
      return Common.UIString.UIString('%s m', minutes);
    }
    const hours = Math.round(minutes / 60);
    return Common.UIString.UIString('%s h', hours);
  }

  /**
   * @param {!PerformanceModel} performanceModel
   * @return {string}
   */
  _title(performanceModel) {
    return TimelineHistoryManager._dataForModel(performanceModel).title;
  }

  /**
   * @param {!PerformanceModel} performanceModel
   */
  _buildPreview(performanceModel) {
    const parsedURL = Common.ParsedURL.ParsedURL.fromString(performanceModel.timelineModel().pageURL());
    const domain = parsedURL ? parsedURL.host : '';
    const sequenceNumber = this._nextNumberByDomain.get(domain) || 1;
    const title = Common.UIString.UIString('%s #%d', domain, sequenceNumber);
    this._nextNumberByDomain.set(domain, sequenceNumber + 1);
    const timeElement = createElement('span');

    const preview = createElementWithClass('div', 'preview-item vbox');
    const data = {preview: preview, title: title, time: timeElement, lastUsed: Date.now()};
    performanceModel[previewDataSymbol] = data;

    preview.appendChild(this._buildTextDetails(performanceModel, title, timeElement));
    const screenshotAndOverview = preview.createChild('div', 'hbox');
    screenshotAndOverview.appendChild(this._buildScreenshotThumbnail(performanceModel));
    screenshotAndOverview.appendChild(this._buildOverview(performanceModel));
    return data.preview;
  }

  /**
   * @param {!PerformanceModel} performanceModel
   * @param {string} title
   * @param {!Element} timeElement
   * @return {!Element}
   */
  _buildTextDetails(performanceModel, title, timeElement) {
    const container = createElementWithClass('div', 'text-details hbox');
    const nameSpan = container.createChild('span', 'name');
    nameSpan.textContent = title;
    UI.ARIAUtils.setAccessibleName(nameSpan, title);
    const tracingModel = performanceModel.tracingModel();
    const duration = Number.millisToString(tracingModel.maximumRecordTime() - tracingModel.minimumRecordTime(), false);
    const timeContainer = container.createChild('span', 'time');
    timeContainer.appendChild(createTextNode(duration));
    timeContainer.appendChild(timeElement);
    return container;
  }

  /**
   * @param {!PerformanceModel} performanceModel
   * @return {!Element}
   */
  _buildScreenshotThumbnail(performanceModel) {
    const container = createElementWithClass('div', 'screenshot-thumb');
    const thumbnailAspectRatio = 3 / 2;
    container.style.width = this._totalHeight * thumbnailAspectRatio + 'px';
    container.style.height = this._totalHeight + 'px';
    const filmStripModel = performanceModel.filmStripModel();
    const lastFrame = filmStripModel.frames().peekLast();
    if (!lastFrame) {
      return container;
    }
    lastFrame.imageDataPromise()
        .then(data => UI.UIUtils.loadImageFromData(data))
        .then(image => image && container.appendChild(image));
    return container;
  }

  /**
   * @param {!PerformanceModel} performanceModel
   * @return {!Element}
   */
  _buildOverview(performanceModel) {
    const container = createElement('div');

    container.style.width = previewWidth + 'px';
    container.style.height = this._totalHeight + 'px';
    const canvas = container.createChild('canvas');
    canvas.width = window.devicePixelRatio * previewWidth;
    canvas.height = window.devicePixelRatio * this._totalHeight;

    const ctx = canvas.getContext('2d');
    let yOffset = 0;
    for (const overview of this._allOverviews) {
      const timelineOverview = new overview.constructor();
      timelineOverview.setCanvasSize(previewWidth, overview.height);
      timelineOverview.setModel(performanceModel);
      timelineOverview.update();
      const sourceContext = timelineOverview.context();
      const imageData = sourceContext.getImageData(0, 0, sourceContext.canvas.width, sourceContext.canvas.height);
      ctx.putImageData(imageData, 0, yOffset);
      yOffset += overview.height * window.devicePixelRatio;
    }
    return container;
  }

  /**
   * @param {!PerformanceModel} model
   * @return {?PreviewData}
   */
  static _dataForModel(model) {
    return model[previewDataSymbol] || null;
  }
}

export const maxRecordings = 5;
export const previewWidth = 450;
export const previewDataSymbol = Symbol('previewData');

/**
 * @implements {UI.ListControl.ListDelegate<!PerformanceModel>}
 */
export class DropDown {
  /**
   * @param {!Array<!PerformanceModel>} models
   */
  constructor(models) {
    this._glassPane = new UI.GlassPane.GlassPane();
    this._glassPane.setSizeBehavior(UI.GlassPane.SizeBehavior.MeasureContent);
    this._glassPane.setOutsideClickCallback(() => this._close(null));
    this._glassPane.setPointerEventsBehavior(UI.GlassPane.PointerEventsBehavior.BlockedByGlassPane);
    this._glassPane.setAnchorBehavior(UI.GlassPane.AnchorBehavior.PreferBottom);
    this._glassPane.element.addEventListener('blur', () => this._close(null));

    const shadowRoot =
        UI.Utils.createShadowRootWithCoreStyles(this._glassPane.contentElement, 'timeline/timelineHistoryManager.css');
    const contentElement = shadowRoot.createChild('div', 'drop-down');

    const listModel = new UI.ListModel.ListModel();
    this._listControl = new UI.ListControl.ListControl(listModel, this, UI.ListControl.ListMode.NonViewport);
    this._listControl.element.addEventListener('mousemove', this._onMouseMove.bind(this), false);
    listModel.replaceAll(models);

    UI.ARIAUtils.markAsMenu(this._listControl.element);
    UI.ARIAUtils.setAccessibleName(this._listControl.element, ls`Select Timeline Session`);
    contentElement.appendChild(this._listControl.element);
    contentElement.addEventListener('keydown', this._onKeyDown.bind(this), false);
    contentElement.addEventListener('click', this._onClick.bind(this), false);

    this._focusRestorer = new UI.UIUtils.ElementFocusRestorer(this._listControl.element);
    /** @type {?function(?PerformanceModel)} */
    this._selectionDone = null;
  }

  /**
   * @param {!Array<!PerformanceModel>} models
   * @param {!Timeline.PerformanceModel} currentModel
   * @param {!Element} anchor
   * @return {!Promise<?Timeline.PerformanceModel>}
   */
  static show(models, currentModel, anchor) {
    if (DropDown._instance) {
      return Promise.resolve(/** @type {?PerformanceModel} */ (null));
    }
    const instance = new DropDown(models);
    return instance._show(anchor, currentModel);
  }

  static cancelIfShowing() {
    if (!DropDown._instance) {
      return;
    }
    DropDown._instance._close(null);
  }

  /**
   * @param {!Element} anchor
   * @param {!PerformanceModel} currentModel
   * @return {!Promise<?Timeline.PerformanceModel>}
   */
  _show(anchor, currentModel) {
    DropDown._instance = this;
    this._glassPane.setContentAnchorBox(anchor.boxInWindow());
    this._glassPane.show(/** @type {!Document} */ (this._glassPane.contentElement.ownerDocument));
    this._listControl.element.focus();
    this._listControl.selectItem(currentModel);

    return new Promise(fulfill => this._selectionDone = fulfill);
  }

  /**
   * @param {!Event} event
   */
  _onMouseMove(event) {
    const node = event.target.enclosingNodeOrSelfWithClass('preview-item');
    const listItem = node && this._listControl.itemForNode(node);
    if (!listItem) {
      return;
    }
    this._listControl.selectItem(listItem);
  }

  /**
   * @param {!Event} event
   */
  _onClick(event) {
    if (!event.target.enclosingNodeOrSelfWithClass('preview-item')) {
      return;
    }
    this._close(this._listControl.selectedItem());
  }

  /**
   * @param {!Event} event
   */
  _onKeyDown(event) {
    switch (event.key) {
      case 'Tab':
      case 'Escape':
        this._close(null);
        break;
      case 'Enter':
        this._close(this._listControl.selectedItem());
        break;
      default:
        return;
    }
    event.consume(true);
  }

  /**
   * @param {?PerformanceModel} model
   */
  _close(model) {
    this._selectionDone(model);
    this._focusRestorer.restore();
    this._glassPane.hide();
    DropDown._instance = null;
  }

  /**
   * @override
   * @param {!PerformanceModel} item
   * @return {!Element}
   */
  createElementForItem(item) {
    const element = TimelineHistoryManager._previewElement(item);
    UI.ARIAUtils.markAsMenuItem(element);
    element.classList.remove('selected');
    return element;
  }

  /**
   * @override
   * @param {!PerformanceModel} item
   * @return {number}
   */
  heightForItem(item) {
    console.assert(false, 'Should not be called');
    return 0;
  }

  /**
   * @override
   * @param {!PerformanceModel} item
   * @return {boolean}
   */
  isItemSelectable(item) {
    return true;
  }

  /**
   * @override
   * @param {?PerformanceModel} from
   * @param {?Timeline.PerformanceModel} to
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
}

/**
 * @type {?DropDown}
 */
DropDown._instance = null;

export class ToolbarButton extends UI.Toolbar.ToolbarItem {
  /**
   * @param {!UI.Action.Action} action
   */
  constructor(action) {
    super(createElementWithClass('button', 'history-dropdown-button'));
    UI.Utils.appendStyle(this.element, 'timeline/historyToolbarButton.css');
    this._contentElement = this.element.createChild('span', 'content');
    const dropdownArrowIcon = UI.Icon.Icon.create('smallicon-triangle-down');
    this.element.appendChild(dropdownArrowIcon);
    this.element.addEventListener('click', () => void action.execute(), false);
    this.setEnabled(action.enabled());
    action.addEventListener(UI.Action.Events.Enabled, event => this.setEnabled(/** @type {boolean} */ (event.data)));
    this.setTitle(action.title());
  }

  /**
   * @param {string} text
   */
  setText(text) {
    this._contentElement.textContent = text;
  }
}

/** @typedef {!{preview: !Element, time: !Element, lastUsed: number, title: string}} */
export let PreviewData;
