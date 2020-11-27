// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';

import {OverlayColorGenerator} from './OverlayColorGenerator.js';

export class OverlayPersistentHighlighter {
  /**
   * @param {!OverlayModel} model
   * @param {boolean} flexEnabled
   */
  constructor(model, flexEnabled = true) {
    this._model = model;

    /** @type {!Map<number, !Protocol.Overlay.GridHighlightConfig>} */
    this._gridHighlights = new Map();

    /** @type {!Map<number, !Protocol.Overlay.FlexContainerHighlightConfig>} */
    this._flexHighlights = new Map();

    /** @type {!Map<number, !Common.Color.Color>} */
    this._colors = new Map();

    this._gridColorGenerator = new OverlayColorGenerator();
    this._flexColorGenerator = new OverlayColorGenerator();
    this._flexEnabled = flexEnabled;

    /** @type {!Common.Settings.Setting<*>} */
    this._showGridLineLabelsSetting = Common.Settings.Settings.instance().moduleSetting('showGridLineLabels');
    this._showGridLineLabelsSetting.addChangeListener(this._onSettingChange, this);
    /** @type {!Common.Settings.Setting<*>} */
    this._extendGridLinesSetting = Common.Settings.Settings.instance().moduleSetting('extendGridLines');
    this._extendGridLinesSetting.addChangeListener(this._onSettingChange, this);
    /** @type {!Common.Settings.Setting<*>} */
    this._showGridAreasSetting = Common.Settings.Settings.instance().moduleSetting('showGridAreas');
    this._showGridAreasSetting.addChangeListener(this._onSettingChange, this);
    /** @type {!Common.Settings.Setting<*>} */
    this._showGridTrackSizesSetting = Common.Settings.Settings.instance().moduleSetting('showGridTrackSizes');
    this._showGridTrackSizesSetting.addChangeListener(this._onSettingChange, this);
  }

  /**
   * @private
   */
  _onSettingChange() {
    this.resetOverlay();
  }

  /**
   * @private
   * @param {number} nodeId
   * @return {!Protocol.Overlay.GridHighlightConfig}
   */
  _buildGridHighlightConfig(nodeId) {
    const mainColor = this.colorOfGrid(nodeId);
    const background = mainColor.setAlpha(0.1);
    const gapBackground = mainColor.setAlpha(0.3);
    const gapHatch = mainColor.setAlpha(0.8);

    const showGridExtensionLines = /** @type {boolean} */ (this._extendGridLinesSetting.get());
    const showPositiveLineNumbers = this._showGridLineLabelsSetting.get() === 'lineNumbers';
    const showNegativeLineNumbers = showPositiveLineNumbers;
    const showLineNames = this._showGridLineLabelsSetting.get() === 'lineNames';
    return {
      rowGapColor: gapBackground.toProtocolRGBA(),
      rowHatchColor: gapHatch.toProtocolRGBA(),
      columnGapColor: gapBackground.toProtocolRGBA(),
      columnHatchColor: gapHatch.toProtocolRGBA(),
      gridBorderColor: mainColor.toProtocolRGBA(),
      gridBorderDash: false,
      rowLineColor: mainColor.toProtocolRGBA(),
      columnLineColor: mainColor.toProtocolRGBA(),
      rowLineDash: true,
      columnLineDash: true,
      showGridExtensionLines,
      showPositiveLineNumbers,
      showNegativeLineNumbers,
      showLineNames,
      showAreaNames: /** @type {boolean} */ (this._showGridAreasSetting.get()),
      showTrackSizes: /** @type {boolean} */ (this._showGridTrackSizesSetting.get()),
      areaBorderColor: mainColor.toProtocolRGBA(),
      gridBackgroundColor: background.toProtocolRGBA(),
    };
  }

  /**
   * @private
   * @param {number} nodeId
   * @return {!Protocol.Overlay.FlexContainerHighlightConfig}
   */
  _buildFlexContainerHighlightConfig(nodeId) {
    const mainColor = this.colorOfFlex(nodeId);
    return {
      containerBorder: {color: mainColor.toProtocolRGBA(), pattern: Protocol.Overlay.LineStylePattern.Dashed},
      itemSeparator: {color: mainColor.toProtocolRGBA(), pattern: Protocol.Overlay.LineStylePattern.Dotted},
      lineSeparator: {color: mainColor.toProtocolRGBA(), pattern: Protocol.Overlay.LineStylePattern.Dashed},
      mainDistributedSpace: {hatchColor: mainColor.toProtocolRGBA()},
      crossDistributedSpace: {hatchColor: mainColor.toProtocolRGBA()}
    };
  }

  /**
   * @param {number} nodeId
   */
  highlightGridInOverlay(nodeId) {
    this._gridHighlights.set(nodeId, this._buildGridHighlightConfig(nodeId));
    this._updateHighlightsInOverlay();
  }

  /**
   * @param {number} nodeId
   * @return {boolean}
   */
  isGridHighlighted(nodeId) {
    return this._gridHighlights.has(nodeId);
  }

  /**
   * @param {number} nodeId
   * @return {!Common.Color.Color}
   */
  colorOfGrid(nodeId) {
    let color = this._colors.get(nodeId);
    if (!color) {
      color = this._gridColorGenerator.next();
      this._colors.set(nodeId, color);
    }

    return color;
  }

  /**
   * @param {number} nodeId
   * @param {!Common.Color.Color} color
   */
  setColorOfGrid(nodeId, color) {
    this._colors.set(nodeId, color);
  }

  /**
   * @param {number} nodeId
   */
  hideGridInOverlay(nodeId) {
    if (this._gridHighlights.has(nodeId)) {
      this._gridHighlights.delete(nodeId);
      this._updateHighlightsInOverlay();
    }
  }

  /**
   * @param {number} nodeId
   */
  highlightFlexInOverlay(nodeId) {
    this._flexHighlights.set(nodeId, this._buildFlexContainerHighlightConfig(nodeId));
    this._updateHighlightsInOverlay();
  }

  /**
   * @param {number} nodeId
   * @return {boolean}
   */
  isFlexHighlighted(nodeId) {
    return this._flexHighlights.has(nodeId);
  }

  /**
   * @param {number} nodeId
   * @return {!Common.Color.Color}
   */
  colorOfFlex(nodeId) {
    let color = this._colors.get(nodeId);
    if (!color) {
      color = this._flexColorGenerator.next();
      this._colors.set(nodeId, color);
    }

    return color;
  }

  /**
   * @param {number} nodeId
   * @param {!Common.Color.Color} color
   */
  setColorOfFlex(nodeId, color) {
    this._colors.set(nodeId, color);
  }

  /**
   * @param {number} nodeId
   */
  hideFlexInOverlay(nodeId) {
    if (this._flexHighlights.has(nodeId)) {
      this._flexHighlights.delete(nodeId);
      this._updateHighlightsInOverlay();
    }
  }

  hideAllInOverlay() {
    this._flexHighlights.clear();
    this._gridHighlights.clear();
    this._updateHighlightsInOverlay();
  }

  refreshHighlights() {
    const gridsNeedUpdate = this._updateHighlightsForDeletedNodes(this._gridHighlights);
    const flexboxesNeedUpdate = this._updateHighlightsForDeletedNodes(this._flexHighlights);
    if (flexboxesNeedUpdate || gridsNeedUpdate) {
      this._updateHighlightsInOverlay();
    }
  }

  /**
   *
   * @param {!Map<number, !Protocol.Overlay.GridHighlightConfig>|!Map<number, !Protocol.Overlay.FlexContainerHighlightConfig>} highlights
   * @return {boolean} whether there were changes to highlights
   */
  _updateHighlightsForDeletedNodes(highlights) {
    let needsUpdate = false;
    for (const nodeId of highlights.keys()) {
      if (this._model.getDOMModel().nodeForId(nodeId) === null) {
        highlights.delete(nodeId);
        needsUpdate = true;
      }
    }
    return needsUpdate;
  }

  resetOverlay() {
    for (const nodeId of this._gridHighlights.keys()) {
      this._gridHighlights.set(nodeId, this._buildGridHighlightConfig(nodeId));
    }
    for (const nodeId of this._flexHighlights.keys()) {
      this._flexHighlights.set(nodeId, this._buildFlexContainerHighlightConfig(nodeId));
    }
    this._updateHighlightsInOverlay();
  }

  /**
   * @private
   */
  _updateHighlightsInOverlay() {
    const hasNodesToHighlight = this._gridHighlights.size > 0 || this._flexHighlights.size > 0;
    this._model.setShowViewportSizeOnResize(!hasNodesToHighlight);
    this._updateGridHighlightsInOverlay();
    this._updateFlexHighlightsInOverlay();
  }

  /**
   * @private
   */
  _updateGridHighlightsInOverlay() {
    const overlayModel = this._model;
    const gridNodeHighlightConfigs = [];
    for (const [nodeId, gridHighlightConfig] of this._gridHighlights.entries()) {
      gridNodeHighlightConfigs.push({nodeId, gridHighlightConfig});
    }
    overlayModel.target().overlayAgent().invoke_setShowGridOverlays({gridNodeHighlightConfigs});
  }

  /**
   * @private
   */
  _updateFlexHighlightsInOverlay() {
    if (!this._flexEnabled) {
      return;
    }
    const overlayModel = this._model;
    const flexNodeHighlightConfigs = [];
    for (const [nodeId, flexContainerHighlightConfig] of this._flexHighlights.entries()) {
      flexNodeHighlightConfigs.push({nodeId, flexContainerHighlightConfig});
    }
    overlayModel.target().overlayAgent().invoke_setShowFlexOverlays({flexNodeHighlightConfigs});
  }
}

/**
 * @interface
 */
export class DOMModel {
  /**
   * @param {number} nodeId
   */
  nodeForId(nodeId) {
  }
}
/**
 * @interface
 */
export class OverlayAgent {
  /**
   *
   * @param {!{gridNodeHighlightConfigs: !Array<!{nodeId: number, gridHighlightConfig: !Protocol.Overlay.GridHighlightConfig}>}} param
   */
  invoke_setShowGridOverlays(param) {
  }

  /**
   *
   * @param {!{flexNodeHighlightConfigs: !Array<!{nodeId: number, flexContainerHighlightConfig: !Protocol.Overlay.FlexContainerHighlightConfig}>}} param
   */
  invoke_setShowFlexOverlays(param) {
  }
}

/**
 * @interface
 */
export class Target {
  /**
   * @return {!OverlayAgent}
   */
  overlayAgent() {
    throw new Error('Not implemented');
  }
}

/**
 * @interface
 */
export class OverlayModel {
  /**
   * @return {!DOMModel}
   */
  getDOMModel() {
    throw new Error('Not implemented');
  }

  /**
   * @return {!Target}
   */
  target() {
    throw new Error('Not implemented');
  }

  /**
   * @param {boolean} value
   */
  setShowViewportSizeOnResize(value) {
  }
}
