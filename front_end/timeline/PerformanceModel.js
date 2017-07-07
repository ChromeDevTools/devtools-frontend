// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

Timeline.PerformanceModel = class extends Common.Object {
  constructor() {
    super();
    /** @type {?SDK.Target} */
    this._mainTarget = null;
    /** @type {?SDK.TracingModel} */
    this._tracingModel = null;

    this._timelineModel = new TimelineModel.TimelineModel();
    this._frameModel =
        new TimelineModel.TimelineFrameModel(event => Timeline.TimelineUIUtils.eventStyle(event).category.name);
    /** @type {?SDK.FilmStripModel} */
    this._filmStripModel = null;
    /** @type {?TimelineModel.TimelineIRModel} */
    this._irModel = new TimelineModel.TimelineIRModel();

    /** @type {!Array<!{title: string, model: !SDK.TracingModel, timeOffset: number}>} */
    this._extensionTracingModels = [];
    /** @type {number|undefined} */
    this._recordStartTime = undefined;
  }

  /**
   * @param {!SDK.Target} target
   */
  setMainTarget(target) {
    this._mainTarget = target;
  }

  /**
   * @param {number} time
   */
  setRecordStartTime(time) {
    this._recordStartTime = time;
  }

  /**
   * @return {number|undefined}
   */
  recordStartTime() {
    return this._recordStartTime;
  }

  /**
   * @param {!SDK.TracingModel} model
   */
  setTracingModel(model) {
    this._tracingModel = model;
    this._timelineModel.setEvents(model, !this._mainTarget);

    var groups = TimelineModel.TimelineModel.AsyncEventGroup;
    var asyncEventsByGroup = this._timelineModel.mainThreadAsyncEvents();
    this._irModel.populate(asyncEventsByGroup.get(groups.input), asyncEventsByGroup.get(groups.animation));

    this._frameModel.addTraceEvents(
        this._mainTarget, this._timelineModel.inspectedTargetEvents(), this._timelineModel.sessionId() || '');

    for (var entry of this._extensionTracingModels) {
      entry.model.adjustTime(
          this._tracingModel.minimumRecordTime() + (entry.timeOffset / 1000) - this._recordStartTime);
    }
  }

  /**
   * @param {string} title
   * @param {!SDK.TracingModel} model
   * @param {number} timeOffset
   */
  addExtensionEvents(title, model, timeOffset) {
    this._extensionTracingModels.push({model: model, title: title, timeOffset: timeOffset});
    if (!this._tracingModel)
      return;
    model.adjustTime(this._tracingModel.minimumRecordTime() + (timeOffset / 1000) - this._recordStartTime);
    this.dispatchEventToListeners(Timeline.PerformanceModel.Events.ExtensionDataAdded);
  }

  /**
   * @return {!SDK.TracingModel}
   */
  tracingModel() {
    if (!this._tracingModel)
      throw 'call setTracingModel before accessing PerformanceModel';
    return this._tracingModel;
  }

  /**
   * @return {!TimelineModel.TimelineModel}
   */
  timelineModel() {
    return this._timelineModel;
  }

  /**
   * @return {!SDK.FilmStripModel} filmStripModel
   */
  filmStripModel() {
    if (this._filmStripModel)
      return this._filmStripModel;
    if (!this._tracingModel)
      throw 'call setTracingModel before accessing PerformanceModel';
    this._filmStripModel = new SDK.FilmStripModel(this._tracingModel);
    return this._filmStripModel;
  }

  /**
   * @return {!Array<!TimelineModel.TimelineFrame>} frames
   */
  frames() {
    return this._frameModel.frames();
  }

  /**
   * @return {!TimelineModel.TimelineFrameModel} frames
   */
  frameModel() {
    return this._frameModel;
  }

  /**
   * @return {!Array<!Common.Segment>}
   */
  interactionRecords() {
    return this._irModel.interactionRecords();
  }

  /**
   * @return {!Array<!{title: string, model: !SDK.TracingModel}>}
   */
  extensionInfo() {
    return this._extensionTracingModels;
  }

  dispose() {
    if (this._tracingModel)
      this._tracingModel.dispose();
    for (var extensionEntry of this._extensionTracingModels)
      extensionEntry.model.dispose();
  }

  /**
   * @param {!TimelineModel.TimelineFrame} frame
   * @return {?SDK.FilmStripModel.Frame}
   */
  filmStripModelFrame(frame) {
    // For idle frames, look at the state at the beginning of the frame.
    var screenshotTime = frame.idle ? frame.startTime : frame.endTime;
    var filmStripFrame = this._filmStripModel.frameByTimestamp(screenshotTime);
    return filmStripFrame && filmStripFrame.timestamp - frame.endTime < 10 ? filmStripFrame : null;
  }

  /**
   * @param {!Common.OutputStream} stream
   * @return {!Promise<?FileError>}
   */
  save(stream) {
    var backingStorage = /** @type {!Bindings.TempFileBackingStorage} */ (this._tracingModel.backingStorage());
    return backingStorage.writeToStream(stream);
  }
};

/**
 * @enum {symbol}
 */
Timeline.PerformanceModel.Events = {
  ExtensionDataAdded: Symbol('ExtensionDataAdded')
};
