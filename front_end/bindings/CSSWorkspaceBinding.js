// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as SDK from '../sdk/sdk.js';
import * as Workspace from '../workspace/workspace.js';  // eslint-disable-line no-unused-vars

import {LiveLocation as LiveLocationInterface, LiveLocationPool, LiveLocationWithPool,} from './LiveLocation.js';  // eslint-disable-line no-unused-vars
import {ResourceMapping} from './ResourceMapping.js';
import {SASSSourceMapping} from './SASSSourceMapping.js';
import {StylesSourceMapping} from './StylesSourceMapping.js';

/**
 * @type {!CSSWorkspaceBinding}
 */
let cssWorkspaceBindingInstance;

/**
 * @implements {SDK.SDKModel.SDKModelObserver<!SDK.CSSModel.CSSModel>}
 */
export class CSSWorkspaceBinding {
  /**
   * @private
   * @param {!SDK.SDKModel.TargetManager} targetManager
   * @param {!Workspace.Workspace.WorkspaceImpl} workspace
   */
  constructor(targetManager, workspace) {
    this._workspace = workspace;

    /** @type {!Map.<!SDK.CSSModel.CSSModel, !ModelInfo>} */
    this._modelToInfo = new Map();
    /** @type {!Array<!SourceMapping>} */
    this._sourceMappings = [];
    targetManager.observeModels(SDK.CSSModel.CSSModel, this);

    /** @type {!Set.<!Promise>} */
    this._liveLocationPromises = new Set();
  }

  /**
   * @param {{forceNew: ?boolean, targetManager: ?SDK.SDKModel.TargetManager, workspace: ?Workspace.Workspace.WorkspaceImpl}} opts
   */
  static instance(opts = {forceNew: null, targetManager: null, workspace: null}) {
    const {forceNew, targetManager, workspace} = opts;
    if (!cssWorkspaceBindingInstance || forceNew) {
      if (!targetManager || !workspace) {
        throw new Error(
            `Unable to create settings: targetManager and workspace must be provided: ${new Error().stack}`);
      }

      cssWorkspaceBindingInstance = new CSSWorkspaceBinding(targetManager, workspace);
    }

    return cssWorkspaceBindingInstance;
  }

  /**
   * @override
   * @param {!SDK.CSSModel.CSSModel} cssModel
   */
  modelAdded(cssModel) {
    this._modelToInfo.set(cssModel, new ModelInfo(cssModel, this._workspace));
  }

  /**
   * @override
   * @param {!SDK.CSSModel.CSSModel} cssModel
   */
  modelRemoved(cssModel) {
    this._modelToInfo.get(cssModel)._dispose();
    this._modelToInfo.delete(cssModel);
  }

  /**
   * The promise returned by this function is resolved once all *currently*
   * pending LiveLocations are processed.
   *
   * @return {!Promise}
   */
  pendingLiveLocationChangesPromise() {
    return Promise.all(this._liveLocationPromises);
  }

  /**
   * @param {!Promise} promise
   */
  _recordLiveLocationChange(promise) {
    promise.then(() => {
      this._liveLocationPromises.delete(promise);
    });
    this._liveLocationPromises.add(promise);
  }

  /**
   * @param {!SDK.CSSStyleSheetHeader.CSSStyleSheetHeader} header
   * @return {!Promise}
   */
  async updateLocations(header) {
    const updatePromise = this._modelToInfo.get(header.cssModel())._updateLocations(header);
    this._recordLiveLocationChange(updatePromise);
    await updatePromise;
  }

  /**
   * @param {!SDK.CSSModel.CSSLocation} rawLocation
   * @param {function(!LiveLocationInterface)} updateDelegate
   * @param {!LiveLocationPool} locationPool
   * @return {!Promise<!LiveLocation>}
   */
  createLiveLocation(rawLocation, updateDelegate, locationPool) {
    const locationPromise =
        this._modelToInfo.get(rawLocation.cssModel())._createLiveLocation(rawLocation, updateDelegate, locationPool);
    this._recordLiveLocationChange(locationPromise);
    return locationPromise;
  }

  /**
   * @param {!SDK.CSSProperty.CSSProperty} cssProperty
   * @param {boolean} forName
   * @return {?Workspace.UISourceCode.UILocation}
   */
  propertyUILocation(cssProperty, forName) {
    const style = cssProperty.ownerStyle;
    if (!style || style.type !== SDK.CSSStyleDeclaration.Type.Regular || !style.styleSheetId) {
      return null;
    }
    const header = style.cssModel().styleSheetHeaderForId(style.styleSheetId);
    if (!header) {
      return null;
    }

    const range = forName ? cssProperty.nameRange() : cssProperty.valueRange();
    if (!range) {
      return null;
    }

    const lineNumber = range.startLine;
    const columnNumber = range.startColumn;
    const rawLocation = new SDK.CSSModel.CSSLocation(
        header, header.lineNumberInSource(lineNumber), header.columnNumberInSource(lineNumber, columnNumber));
    return this.rawLocationToUILocation(rawLocation);
  }

  /**
   * @param {!SDK.CSSModel.CSSLocation} rawLocation
   * @return {?Workspace.UISourceCode.UILocation}
   */
  rawLocationToUILocation(rawLocation) {
    for (let i = this._sourceMappings.length - 1; i >= 0; --i) {
      const uiLocation = this._sourceMappings[i].rawLocationToUILocation(rawLocation);
      if (uiLocation) {
        return uiLocation;
      }
    }
    return this._modelToInfo.get(rawLocation.cssModel())._rawLocationToUILocation(rawLocation);
  }

  /**
   * @param {!Workspace.UISourceCode.UILocation} uiLocation
   * @return {!Array<!SDK.CSSModel.CSSLocation>}
   */
  uiLocationToRawLocations(uiLocation) {
    for (let i = this._sourceMappings.length - 1; i >= 0; --i) {
      const rawLocations = this._sourceMappings[i].uiLocationToRawLocations(uiLocation);
      if (rawLocations.length) {
        return rawLocations;
      }
    }
    const rawLocations = [];
    for (const modelInfo of this._modelToInfo.values()) {
      rawLocations.push(...modelInfo._uiLocationToRawLocations(uiLocation));
    }
    return rawLocations;
  }

  /**
   * @param {!SourceMapping} sourceMapping
   */
  addSourceMapping(sourceMapping) {
    this._sourceMappings.push(sourceMapping);
  }
}

/**
 * @interface
 */
export class SourceMapping {
  /**
   * @param {!SDK.CSSModel.CSSLocation} rawLocation
   * @return {?Workspace.UISourceCode.UILocation}
   */
  rawLocationToUILocation(rawLocation) {
  }

  /**
   * @param {!Workspace.UISourceCode.UILocation} uiLocation
   * @return {!Array<!SDK.CSSModel.CSSLocation>}
   */
  uiLocationToRawLocations(uiLocation) {
  }
}

export class ModelInfo {
  /**
   * @param {!SDK.CSSModel.CSSModel} cssModel
   * @param {!Workspace.Workspace.WorkspaceImpl} workspace
   */
  constructor(cssModel, workspace) {
    this._eventListeners = [
      cssModel.addEventListener(
          SDK.CSSModel.Events.StyleSheetAdded,
          event => {
            this._styleSheetAdded(event);
          },
          this),
      cssModel.addEventListener(
          SDK.CSSModel.Events.StyleSheetRemoved,
          event => {
            this._styleSheetRemoved(event);
          },
          this)
    ];

    this._stylesSourceMapping = new StylesSourceMapping(cssModel, workspace);
    const sourceMapManager = cssModel.sourceMapManager();
    this._sassSourceMapping = new SASSSourceMapping(cssModel.target(), sourceMapManager, workspace);

    /** @type {!Platform.Multimap<!SDK.CSSStyleSheetHeader.CSSStyleSheetHeader, !LiveLocation>} */
    this._locations = new Platform.Multimap();
    /** @type {!Platform.Multimap<string, !LiveLocation>} */
    this._unboundLocations = new Platform.Multimap();
  }

  /**
   * @param {!SDK.CSSModel.CSSLocation} rawLocation
   * @param {function(!LiveLocationInterface)} updateDelegate
   * @param {!LiveLocationPool} locationPool
   * @return {!Promise<!LiveLocation>}
   */
  async _createLiveLocation(rawLocation, updateDelegate, locationPool) {
    const location = new LiveLocation(rawLocation, this, updateDelegate, locationPool);
    const header = rawLocation.header();
    if (header) {
      location._header = header;
      this._locations.set(header, location);
      await location.update();
    } else {
      this._unboundLocations.set(rawLocation.url, location);
    }
    return location;
  }

  /**
   * @param {!LiveLocation} location
   */
  _disposeLocation(location) {
    if (location._header) {
      this._locations.delete(location._header, location);
    } else {
      this._unboundLocations.delete(location._url, location);
    }
  }

  /**
   * @param {!SDK.CSSStyleSheetHeader.CSSStyleSheetHeader} header
   */
  _updateLocations(header) {
    const promises = [];
    for (const location of this._locations.get(header)) {
      promises.push(location.update());
    }
    return Promise.all(promises);
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  async _styleSheetAdded(event) {
    const header = /** @type {!SDK.CSSStyleSheetHeader.CSSStyleSheetHeader} */ (event.data);
    if (!header.sourceURL) {
      return;
    }

    const promises = [];
    for (const location of this._unboundLocations.get(header.sourceURL)) {
      location._header = header;
      this._locations.set(header, location);
      promises.push(location.update());
    }
    await Promise.all(promises);
    this._unboundLocations.deleteAll(header.sourceURL);
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  async _styleSheetRemoved(event) {
    const header = /** @type {!SDK.CSSStyleSheetHeader.CSSStyleSheetHeader} */ (event.data);
    const promises = [];
    for (const location of this._locations.get(header)) {
      location._header = null;
      this._unboundLocations.set(location._url, location);
      promises.push(location.update());
    }
    await Promise.all(promises);
    this._locations.deleteAll(header);
  }

  /**
   * @param {!SDK.CSSModel.CSSLocation} rawLocation
   * @return {?Workspace.UISourceCode.UILocation}
   */
  _rawLocationToUILocation(rawLocation) {
    let uiLocation = null;
    uiLocation = uiLocation || this._sassSourceMapping.rawLocationToUILocation(rawLocation);
    uiLocation = uiLocation || this._stylesSourceMapping.rawLocationToUILocation(rawLocation);
    uiLocation = uiLocation || ResourceMapping.instance().cssLocationToUILocation(rawLocation);
    return uiLocation;
  }

  /**
   * @param {!Workspace.UISourceCode.UILocation} uiLocation
   * @return {!Array<!SDK.CSSModel.CSSLocation>}
   */
  _uiLocationToRawLocations(uiLocation) {
    let rawLocations = this._sassSourceMapping.uiLocationToRawLocations(uiLocation);
    if (rawLocations.length) {
      return rawLocations;
    }
    rawLocations = this._stylesSourceMapping.uiLocationToRawLocations(uiLocation);
    if (rawLocations.length) {
      return rawLocations;
    }
    return ResourceMapping.instance().uiLocationToCSSLocations(uiLocation);
  }

  _dispose() {
    Common.EventTarget.EventTarget.removeEventListeners(this._eventListeners);
    this._stylesSourceMapping.dispose();
    this._sassSourceMapping.dispose();
  }
}

/**
 * @unrestricted
 */
export class LiveLocation extends LiveLocationWithPool {
  /**
   * @param {!SDK.CSSModel.CSSLocation} rawLocation
   * @param {!ModelInfo} info
   * @param {function(!LiveLocationInterface)} updateDelegate
   * @param {!LiveLocationPool} locationPool
   */
  constructor(rawLocation, info, updateDelegate, locationPool) {
    super(updateDelegate, locationPool);
    this._url = rawLocation.url;
    this._lineNumber = rawLocation.lineNumber;
    this._columnNumber = rawLocation.columnNumber;
    this._info = info;
    this._header = null;
  }

  /**
   * @override
   * @return {!Promise<?Workspace.UISourceCode.UILocation>}
   */
  async uiLocation() {
    if (!this._header) {
      return null;
    }
    const rawLocation = new SDK.CSSModel.CSSLocation(this._header, this._lineNumber, this._columnNumber);
    return CSSWorkspaceBinding.instance().rawLocationToUILocation(rawLocation);
  }

  /**
   * @override
   */
  dispose() {
    super.dispose();
    this._info._disposeLocation(this);
  }

  /**
   * @override
   * @return {!Promise<boolean>}
   */
  async isBlackboxed() {
    return false;
  }
}
