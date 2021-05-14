// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as Protocol from '../../generated/protocol.js';
import * as Common from '../common/common.js';

import {OverlayColorGenerator} from './OverlayColorGenerator.js';

export class OverlayPersistentHighlighter {
  _model: OverlayModel;
  _gridHighlights: Map<number, Protocol.Overlay.GridHighlightConfig>;
  _scrollSnapHighlights: Map<number, Protocol.Overlay.ScrollSnapContainerHighlightConfig>;
  _flexHighlights: Map<number, Protocol.Overlay.FlexContainerHighlightConfig>;
  _colors: Map<number, Common.Color.Color>;
  _gridColorGenerator: OverlayColorGenerator;
  _flexColorGenerator: OverlayColorGenerator;
  _flexEnabled: boolean;
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _showGridLineLabelsSetting: Common.Settings.Setting<any>;
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _extendGridLinesSetting: Common.Settings.Setting<any>;
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _showGridAreasSetting: Common.Settings.Setting<any>;
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _showGridTrackSizesSetting: Common.Settings.Setting<any>;
  constructor(model: OverlayModel, flexEnabled: boolean = true) {
    this._model = model;

    this._gridHighlights = new Map();

    this._scrollSnapHighlights = new Map();

    this._flexHighlights = new Map();

    this._colors = new Map();

    this._gridColorGenerator = new OverlayColorGenerator();
    this._flexColorGenerator = new OverlayColorGenerator();
    this._flexEnabled = flexEnabled;

    this._showGridLineLabelsSetting = Common.Settings.Settings.instance().moduleSetting('showGridLineLabels');
    this._showGridLineLabelsSetting.addChangeListener(this._onSettingChange, this);
    this._extendGridLinesSetting = Common.Settings.Settings.instance().moduleSetting('extendGridLines');
    this._extendGridLinesSetting.addChangeListener(this._onSettingChange, this);
    this._showGridAreasSetting = Common.Settings.Settings.instance().moduleSetting('showGridAreas');
    this._showGridAreasSetting.addChangeListener(this._onSettingChange, this);
    this._showGridTrackSizesSetting = Common.Settings.Settings.instance().moduleSetting('showGridTrackSizes');
    this._showGridTrackSizesSetting.addChangeListener(this._onSettingChange, this);
  }

  _onSettingChange(): void {
    this.resetOverlay();
  }

  _buildGridHighlightConfig(nodeId: number): Protocol.Overlay.GridHighlightConfig {
    const mainColor = this.colorOfGrid(nodeId);
    const background = mainColor.setAlpha(0.1);
    const gapBackground = mainColor.setAlpha(0.3);
    const gapHatch = mainColor.setAlpha(0.8);

    const showGridExtensionLines = (this._extendGridLinesSetting.get() as boolean);
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
      showAreaNames: (this._showGridAreasSetting.get() as boolean),
      showTrackSizes: (this._showGridTrackSizesSetting.get() as boolean),
      areaBorderColor: mainColor.toProtocolRGBA(),
      gridBackgroundColor: background.toProtocolRGBA(),
    };
  }

  _buildFlexContainerHighlightConfig(nodeId: number): Protocol.Overlay.FlexContainerHighlightConfig {
    const mainColor = this.colorOfFlex(nodeId);
    return {
      containerBorder: {color: mainColor.toProtocolRGBA(), pattern: Protocol.Overlay.LineStylePattern.Dashed},
      itemSeparator: {color: mainColor.toProtocolRGBA(), pattern: Protocol.Overlay.LineStylePattern.Dotted},
      lineSeparator: {color: mainColor.toProtocolRGBA(), pattern: Protocol.Overlay.LineStylePattern.Dashed},
      mainDistributedSpace: {hatchColor: mainColor.toProtocolRGBA()},
      crossDistributedSpace: {hatchColor: mainColor.toProtocolRGBA()},
    };
  }

  _buildScrollSnapContainerHighlightConfig(_nodeId: number): Protocol.Overlay.ScrollSnapContainerHighlightConfig {
    return {
      snapAreaBorder: {
        color: Common.Color.PageHighlight.GridBorder.toProtocolRGBA(),
        pattern: Protocol.Overlay.LineStylePattern.Dashed,
      },
      snapportBorder: {color: Common.Color.PageHighlight.GridBorder.toProtocolRGBA()},
      scrollMarginColor: Common.Color.PageHighlight.Margin.toProtocolRGBA(),
      scrollPaddingColor: Common.Color.PageHighlight.Padding.toProtocolRGBA(),
    };
  }

  highlightGridInOverlay(nodeId: number): void {
    this._gridHighlights.set(nodeId, this._buildGridHighlightConfig(nodeId));
    this._updateHighlightsInOverlay();
  }

  isGridHighlighted(nodeId: number): boolean {
    return this._gridHighlights.has(nodeId);
  }

  colorOfGrid(nodeId: number): Common.Color.Color {
    let color = this._colors.get(nodeId);
    if (!color) {
      color = this._gridColorGenerator.next();
      this._colors.set(nodeId, color);
    }

    return color;
  }

  setColorOfGrid(nodeId: number, color: Common.Color.Color): void {
    this._colors.set(nodeId, color);
  }

  hideGridInOverlay(nodeId: number): void {
    if (this._gridHighlights.has(nodeId)) {
      this._gridHighlights.delete(nodeId);
      this._updateHighlightsInOverlay();
    }
  }

  highlightScrollSnapInOverlay(nodeId: number): void {
    this._scrollSnapHighlights.set(nodeId, this._buildScrollSnapContainerHighlightConfig(nodeId));
    this._updateHighlightsInOverlay();
  }

  isScrollSnapHighlighted(nodeId: number): boolean {
    return this._scrollSnapHighlights.has(nodeId);
  }

  hideScrollSnapInOverlay(nodeId: number): void {
    if (this._scrollSnapHighlights.has(nodeId)) {
      this._scrollSnapHighlights.delete(nodeId);
      this._updateHighlightsInOverlay();
    }
  }

  highlightFlexInOverlay(nodeId: number): void {
    this._flexHighlights.set(nodeId, this._buildFlexContainerHighlightConfig(nodeId));
    this._updateHighlightsInOverlay();
  }

  isFlexHighlighted(nodeId: number): boolean {
    return this._flexHighlights.has(nodeId);
  }

  colorOfFlex(nodeId: number): Common.Color.Color {
    let color = this._colors.get(nodeId);
    if (!color) {
      color = this._flexColorGenerator.next();
      this._colors.set(nodeId, color);
    }

    return color;
  }

  setColorOfFlex(nodeId: number, color: Common.Color.Color): void {
    this._colors.set(nodeId, color);
  }

  hideFlexInOverlay(nodeId: number): void {
    if (this._flexHighlights.has(nodeId)) {
      this._flexHighlights.delete(nodeId);
      this._updateHighlightsInOverlay();
    }
  }

  hideAllInOverlay(): void {
    this._flexHighlights.clear();
    this._gridHighlights.clear();
    this._scrollSnapHighlights.clear();
    this._updateHighlightsInOverlay();
  }

  refreshHighlights(): void {
    const gridsNeedUpdate = this._updateHighlightsForDeletedNodes(this._gridHighlights);
    const flexboxesNeedUpdate = this._updateHighlightsForDeletedNodes(this._flexHighlights);
    const scrollSnapsNeedUpdate = this._updateHighlightsForDeletedNodes(this._scrollSnapHighlights);
    if (flexboxesNeedUpdate || gridsNeedUpdate || scrollSnapsNeedUpdate) {
      this._updateHighlightsInOverlay();
    }
  }

  _updateHighlightsForDeletedNodes(highlights: Map<number, unknown>): boolean {
    let needsUpdate = false;
    for (const nodeId of highlights.keys()) {
      if (this._model.getDOMModel().nodeForId(nodeId) === null) {
        highlights.delete(nodeId);
        needsUpdate = true;
      }
    }
    return needsUpdate;
  }

  resetOverlay(): void {
    for (const nodeId of this._gridHighlights.keys()) {
      this._gridHighlights.set(nodeId, this._buildGridHighlightConfig(nodeId));
    }
    for (const nodeId of this._flexHighlights.keys()) {
      this._flexHighlights.set(nodeId, this._buildFlexContainerHighlightConfig(nodeId));
    }
    for (const nodeId of this._scrollSnapHighlights.keys()) {
      this._scrollSnapHighlights.set(nodeId, this._buildScrollSnapContainerHighlightConfig(nodeId));
    }
    this._updateHighlightsInOverlay();
  }

  _updateHighlightsInOverlay(): void {
    const hasNodesToHighlight = this._gridHighlights.size > 0 || this._flexHighlights.size > 0;
    this._model.setShowViewportSizeOnResize(!hasNodesToHighlight);
    this._updateGridHighlightsInOverlay();
    this._updateFlexHighlightsInOverlay();
    this._updateScrollSnapHighlightsInOverlay();
  }

  _updateGridHighlightsInOverlay(): void {
    const overlayModel = this._model;
    const gridNodeHighlightConfigs = [];
    for (const [nodeId, gridHighlightConfig] of this._gridHighlights.entries()) {
      gridNodeHighlightConfigs.push({nodeId, gridHighlightConfig});
    }
    overlayModel.target().overlayAgent().invoke_setShowGridOverlays({gridNodeHighlightConfigs});
  }

  _updateFlexHighlightsInOverlay(): void {
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

  _updateScrollSnapHighlightsInOverlay(): void {
    const overlayModel = this._model;
    const scrollSnapHighlightConfigs = [];
    for (const [nodeId, scrollSnapContainerHighlightConfig] of this._scrollSnapHighlights.entries()) {
      scrollSnapHighlightConfigs.push({nodeId, scrollSnapContainerHighlightConfig});
    }
    overlayModel.target().overlayAgent().invoke_setShowScrollSnapOverlays({scrollSnapHighlightConfigs});
  }
}

/**
 * @interface
 */
export interface DOMModel {
  nodeForId(nodeId: number): void;
}
/**
 * @interface
 */
export interface OverlayAgent {
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/naming-convention
  invoke_setShowGridOverlays(param: {
    gridNodeHighlightConfigs: Array<{
      nodeId: number,
      gridHighlightConfig: Protocol.Overlay.GridHighlightConfig,
    }>,
  }): void;

  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/naming-convention
  invoke_setShowFlexOverlays(param: {
    flexNodeHighlightConfigs: Array<{
      nodeId: number,
      flexContainerHighlightConfig: Protocol.Overlay.FlexContainerHighlightConfig,
    }>,
  }): void;

  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/naming-convention
  invoke_setShowScrollSnapOverlays(param: {
    scrollSnapHighlightConfigs: Array<{
      nodeId: number,
    }>,
  }): void;
}

/**
 * @interface
 */
export interface Target {
  overlayAgent(): OverlayAgent;
}

/**
 * @interface
 */
export interface OverlayModel {
  getDOMModel(): DOMModel;

  target(): Target;

  setShowViewportSizeOnResize(value: boolean): void;
}
