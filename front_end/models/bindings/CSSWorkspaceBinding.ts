// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Workspace from '../../workspace/workspace.js';  // eslint-disable-line no-unused-vars

import {LiveLocation as LiveLocationInterface, LiveLocationPool, LiveLocationWithPool} from './LiveLocation.js';  // eslint-disable-line no-unused-vars
import {ResourceMapping} from './ResourceMapping.js';
import {SASSSourceMapping} from './SASSSourceMapping.js';
import {StylesSourceMapping} from './StylesSourceMapping.js';

let cssWorkspaceBindingInstance: CSSWorkspaceBinding;

export class CSSWorkspaceBinding implements SDK.SDKModel.SDKModelObserver<SDK.CSSModel.CSSModel> {
  _workspace: Workspace.Workspace.WorkspaceImpl;
  _modelToInfo: Map<SDK.CSSModel.CSSModel, ModelInfo>;
  _sourceMappings: SourceMapping[];
  _liveLocationPromises: Set<Promise<unknown>>;

  private constructor(targetManager: SDK.SDKModel.TargetManager, workspace: Workspace.Workspace.WorkspaceImpl) {
    this._workspace = workspace;

    this._modelToInfo = new Map();
    this._sourceMappings = [];
    targetManager.observeModels(SDK.CSSModel.CSSModel, this);

    this._liveLocationPromises = new Set();
  }

  static instance(opts: {
    forceNew: boolean|null,
    targetManager: SDK.SDKModel.TargetManager|null,
    workspace: Workspace.Workspace.WorkspaceImpl|null,
  } = {forceNew: null, targetManager: null, workspace: null}): CSSWorkspaceBinding {
    const {forceNew, targetManager, workspace} = opts;
    if (!cssWorkspaceBindingInstance || forceNew) {
      if (!targetManager || !workspace) {
        throw new Error(
            `Unable to create CSSWorkspaceBinding: targetManager and workspace must be provided: ${new Error().stack}`);
      }

      cssWorkspaceBindingInstance = new CSSWorkspaceBinding(targetManager, workspace);
    }

    return cssWorkspaceBindingInstance;
  }

  _getCSSModelInfo(cssModel: SDK.CSSModel.CSSModel): ModelInfo {
    return this._modelToInfo.get(cssModel) as ModelInfo;
  }

  modelAdded(cssModel: SDK.CSSModel.CSSModel): void {
    this._modelToInfo.set(cssModel, new ModelInfo(cssModel, this._workspace));
  }

  modelRemoved(cssModel: SDK.CSSModel.CSSModel): void {
    this._getCSSModelInfo(cssModel)._dispose();
    this._modelToInfo.delete(cssModel);
  }

  /**
   * The promise returned by this function is resolved once all *currently*
   * pending LiveLocations are processed.
   */
  async pendingLiveLocationChangesPromise(): Promise<void> {
    await Promise.all(this._liveLocationPromises);
  }

  _recordLiveLocationChange(promise: Promise<unknown>): void {
    promise.then(() => {
      this._liveLocationPromises.delete(promise);
    });
    this._liveLocationPromises.add(promise);
  }

  async updateLocations(header: SDK.CSSStyleSheetHeader.CSSStyleSheetHeader): Promise<void> {
    const updatePromise = this._getCSSModelInfo(header.cssModel())._updateLocations(header);
    this._recordLiveLocationChange(updatePromise);
    await updatePromise;
  }

  createLiveLocation(
      rawLocation: SDK.CSSModel.CSSLocation, updateDelegate: (arg0: LiveLocationInterface) => Promise<void>,
      locationPool: LiveLocationPool): Promise<LiveLocation> {
    const locationPromise =
        this._getCSSModelInfo(rawLocation.cssModel())._createLiveLocation(rawLocation, updateDelegate, locationPool);
    this._recordLiveLocationChange(locationPromise);
    return locationPromise;
  }

  propertyUILocation(cssProperty: SDK.CSSProperty.CSSProperty, forName: boolean): Workspace.UISourceCode.UILocation
      |null {
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

  rawLocationToUILocation(rawLocation: SDK.CSSModel.CSSLocation): Workspace.UISourceCode.UILocation|null {
    for (let i = this._sourceMappings.length - 1; i >= 0; --i) {
      const uiLocation = this._sourceMappings[i].rawLocationToUILocation(rawLocation);
      if (uiLocation) {
        return uiLocation;
      }
    }
    return this._getCSSModelInfo(rawLocation.cssModel())._rawLocationToUILocation(rawLocation);
  }

  uiLocationToRawLocations(uiLocation: Workspace.UISourceCode.UILocation): SDK.CSSModel.CSSLocation[] {
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

  addSourceMapping(sourceMapping: SourceMapping): void {
    this._sourceMappings.push(sourceMapping);
  }
}

/**
 * @interface
 */
export interface SourceMapping {
  rawLocationToUILocation(rawLocation: SDK.CSSModel.CSSLocation): Workspace.UISourceCode.UILocation|null;

  uiLocationToRawLocations(uiLocation: Workspace.UISourceCode.UILocation): SDK.CSSModel.CSSLocation[];
}

export class ModelInfo {
  _eventListeners: Common.EventTarget.EventDescriptor[];
  _stylesSourceMapping: StylesSourceMapping;
  _sassSourceMapping: SASSSourceMapping;
  _locations: Platform.MapUtilities.Multimap<SDK.CSSStyleSheetHeader.CSSStyleSheetHeader, LiveLocation>;
  _unboundLocations: Platform.MapUtilities.Multimap<string, LiveLocation>;
  constructor(cssModel: SDK.CSSModel.CSSModel, workspace: Workspace.Workspace.WorkspaceImpl) {
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
          this),
    ];

    this._stylesSourceMapping = new StylesSourceMapping(cssModel, workspace);
    const sourceMapManager = cssModel.sourceMapManager();
    this._sassSourceMapping = new SASSSourceMapping(cssModel.target(), sourceMapManager, workspace);

    this._locations = new Platform.MapUtilities.Multimap();
    this._unboundLocations = new Platform.MapUtilities.Multimap();
  }

  async _createLiveLocation(
      rawLocation: SDK.CSSModel.CSSLocation, updateDelegate: (arg0: LiveLocationInterface) => Promise<void>,
      locationPool: LiveLocationPool): Promise<LiveLocation> {
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

  _disposeLocation(location: LiveLocation): void {
    if (location._header) {
      this._locations.delete(location._header, location);
    } else {
      this._unboundLocations.delete(location._url, location);
    }
  }

  _updateLocations(header: SDK.CSSStyleSheetHeader.CSSStyleSheetHeader): Promise<void[]> {
    const promises = [];
    for (const location of this._locations.get(header)) {
      promises.push(location.update());
    }
    return Promise.all(promises);
  }

  async _styleSheetAdded(event: Common.EventTarget.EventTargetEvent): Promise<void> {
    const header = (event.data as SDK.CSSStyleSheetHeader.CSSStyleSheetHeader);
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

  async _styleSheetRemoved(event: Common.EventTarget.EventTargetEvent): Promise<void> {
    const header = (event.data as SDK.CSSStyleSheetHeader.CSSStyleSheetHeader);
    const promises = [];
    for (const location of this._locations.get(header)) {
      location._header = null;
      this._unboundLocations.set(location._url, location);
      promises.push(location.update());
    }
    await Promise.all(promises);
    this._locations.deleteAll(header);
  }

  _rawLocationToUILocation(rawLocation: SDK.CSSModel.CSSLocation): Workspace.UISourceCode.UILocation|null {
    let uiLocation: (Workspace.UISourceCode.UILocation|null)|null = null;
    uiLocation = uiLocation || this._sassSourceMapping.rawLocationToUILocation(rawLocation);
    uiLocation = uiLocation || this._stylesSourceMapping.rawLocationToUILocation(rawLocation);
    uiLocation = uiLocation || ResourceMapping.instance().cssLocationToUILocation(rawLocation);
    return uiLocation;
  }

  _uiLocationToRawLocations(uiLocation: Workspace.UISourceCode.UILocation): SDK.CSSModel.CSSLocation[] {
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

  _dispose(): void {
    Common.EventTarget.EventTarget.removeEventListeners(this._eventListeners);
    this._stylesSourceMapping.dispose();
    this._sassSourceMapping.dispose();
  }
}

export class LiveLocation extends LiveLocationWithPool {
  _url: string;
  _lineNumber: number;
  _columnNumber: number;
  _info: ModelInfo;
  _header: SDK.CSSStyleSheetHeader.CSSStyleSheetHeader|null;
  constructor(
      rawLocation: SDK.CSSModel.CSSLocation, info: ModelInfo,
      updateDelegate: (arg0: LiveLocationInterface) => Promise<void>, locationPool: LiveLocationPool) {
    super(updateDelegate, locationPool);
    this._url = rawLocation.url;
    this._lineNumber = rawLocation.lineNumber;
    this._columnNumber = rawLocation.columnNumber;
    this._info = info;
    this._header = null;
  }

  header(): SDK.CSSStyleSheetHeader.CSSStyleSheetHeader|null {
    return this._header;
  }

  async uiLocation(): Promise<Workspace.UISourceCode.UILocation|null> {
    if (!this._header) {
      return null;
    }
    const rawLocation = new SDK.CSSModel.CSSLocation(this._header, this._lineNumber, this._columnNumber);
    return CSSWorkspaceBinding.instance().rawLocationToUILocation(rawLocation);
  }

  dispose(): void {
    super.dispose();
    this._info._disposeLocation(this);
  }

  async isIgnoreListed(): Promise<boolean> {
    return false;
  }
}
