// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

//  Copyright (C) 2012 Google Inc. All rights reserved.

//  Redistribution and use in source and binary forms, with or without
//  modification, are permitted provided that the following conditions
//  are met:

//  1.  Redistributions of source code must retain the above copyright
//      notice, this list of conditions and the following disclaimer.
//  2.  Redistributions in binary form must reproduce the above copyright
//      notice, this list of conditions and the following disclaimer in the
//      documentation and/or other materials provided with the distribution.
//  3.  Neither the name of Apple Computer, Inc. ("Apple") nor the names of
//      its contributors may be used to endorse or promote products derived
//      from this software without specific prior written permission.

//  THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS "AS IS" AND ANY
//  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
//  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
//  DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY
//  DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
//  (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
//  LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
//  ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
//  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
//  THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

// eslint-disable-next-line rulesdir/es_modules_import
import {
  contrastRatio,
  contrastRatioAPCA,
  getAPCAThreshold,
  getContrastThreshold,
} from '../front_end/core/common/ColorUtils.js';

import {
  constrainNumber,
  createChild,
  createElement,
  createTextChild,
  ellipsify,
  Overlay,
  type Bounds,
  type PathCommands,
  type ResetData,
} from './common.js';

import {drawPath, emptyBounds, formatColor, formatRgba, type PathBounds} from './highlight_common.js';

import {
  drawLayoutFlexContainerHighlight,
  drawLayoutFlexItemHighlight,
  type FlexContainerHighlight,
  type FlexItemHighlight,
} from './highlight_flex_common.js';

import {drawLayoutGridHighlight, type GridHighlight} from './highlight_grid_common.js';
import {type ScrollSnapHighlight} from './highlight_scroll_snap.js';

import {drawContainerQueryHighlight, type ContainerQueryHighlight} from './highlight_container_query.js';
import {type IsolatedElementHighlight} from './highlight_isolated_element.js';
import {PersistentOverlay} from './tool_persistent.js';

type ColorRgba = [number, number, number, number];

function isTransparent(color: ColorRgba): boolean {
  return color[3] === 0;
}

interface Path {
  path: PathCommands;
  outlineColor: string;
  fillColor: string;
  name: string;
}

interface ContrastInfo {
  backgroundColor: string;
  backgroundColorUnclampedRgba: ColorRgba;
  backgroundColorCssText: string;
  fontSize: string;
  fontWeight: string;
  contrastAlgorithm: 'apca'|'aa'|'aaa';
  textOpacity: number;
}

export interface ElementInfo {
  contrast?: ContrastInfo;
  tagName: string;
  idValue: string;
  className?: string;
  nodeWidth: number;
  nodeHeight: number;
  isLocked: boolean;
  isLockedAncestor: boolean;
  style: {
    [key: string]: string|undefined,
  }&{
    'color-unclamped-rgba'?: ColorRgba,
    'background-color-unclamped-rgba'?: ColorRgba,
  };
  showAccessibilityInfo: boolean;
  isKeyboardFocusable: boolean;
  accessibleName: string;
  accessibleRole: string;
  layoutObjectName?: string;
}

interface Highlight {
  paths: Path[];
  showRulers: boolean;
  showExtensionLines: boolean;
  elementInfo: ElementInfo;
  colorFormat: string;
  gridInfo: GridHighlight[];
  flexInfo: FlexContainerHighlight[];
  flexItemInfo: FlexItemHighlight[];
  containerQueryInfo: ContainerQueryHighlight[];
  isolatedElementInfo: IsolatedElementHighlight[];
}

export class HighlightOverlay extends Overlay {
  private tooltip!: HTMLElement;
  private persistentOverlay?: PersistentOverlay;
  private gridLabelState = {gridLayerCounter: 0};

  reset(resetData: ResetData) {
    super.reset(resetData);
    this.tooltip.innerHTML = '';
    this.gridLabelState.gridLayerCounter = 0;
    if (this.persistentOverlay) {
      this.persistentOverlay.reset(resetData);
    }
  }

  install() {
    this.document.body.classList.add('fill');

    const canvas = this.document.createElement('canvas');
    canvas.id = 'canvas';
    canvas.classList.add('fill');
    this.document.body.append(canvas);

    const tooltip = this.document.createElement('div');
    tooltip.id = 'tooltip-container';
    this.document.body.append(tooltip);
    this.tooltip = tooltip;

    this.persistentOverlay = new PersistentOverlay(this.window);
    this.persistentOverlay.renderGridMarkup();
    this.persistentOverlay.setCanvas(canvas);

    this.setCanvas(canvas);

    super.install();
  }

  uninstall() {
    this.document.body.classList.remove('fill');
    this.document.body.innerHTML = '';

    super.uninstall();
  }

  drawHighlight(highlight: Highlight) {
    this.context.save();

    const bounds = emptyBounds();
    let contentPath: PathCommands|null = null;
    let borderPath: PathCommands|null = null;

    for (let paths = highlight.paths.slice(); paths.length;) {
      const path = paths.pop();
      if (!path) {
        continue;
      }
      this.context.save();
      drawPath(
          this.context, path.path, path.fillColor, path.outlineColor, undefined, bounds, this.emulationScaleFactor);
      if (paths.length) {
        this.context.globalCompositeOperation = 'destination-out';
        drawPath(
            this.context, paths[paths.length - 1].path, 'red', undefined, undefined, bounds, this.emulationScaleFactor);
      }
      this.context.restore();

      if (path.name === 'content') {
        contentPath = path.path;
      }
      if (path.name === 'border') {
        borderPath = path.path;
      }
    }
    this.context.restore();

    this.context.save();

    const rulerAtRight = Boolean(
        highlight.paths.length && highlight.showRulers && bounds.minX < 20 && bounds.maxX + 20 < this.canvasWidth);
    const rulerAtBottom = Boolean(
        highlight.paths.length && highlight.showRulers && bounds.minY < 20 && bounds.maxY + 20 < this.canvasHeight);

    if (highlight.showRulers) {
      this.drawAxis(this.context, rulerAtRight, rulerAtBottom);
    }

    if (highlight.paths.length) {
      if (highlight.showExtensionLines) {
        drawRulers(
            this.context, bounds, rulerAtRight, rulerAtBottom, undefined, false, this.canvasWidth, this.canvasHeight);
      }

      if (highlight.elementInfo) {
        drawElementTitle(highlight.elementInfo, highlight.colorFormat, bounds, this.canvasWidth, this.canvasHeight);
      }
    }
    if (highlight.gridInfo) {
      for (const grid of highlight.gridInfo) {
        drawLayoutGridHighlight(
            grid, this.context, this.deviceScaleFactor, this.canvasWidth, this.canvasHeight, this.emulationScaleFactor,
            this.gridLabelState);
      }
    }

    if (highlight.flexInfo) {
      for (const flex of highlight.flexInfo) {
        drawLayoutFlexContainerHighlight(
            flex, this.context, this.deviceScaleFactor, this.canvasWidth, this.canvasHeight, this.emulationScaleFactor);
      }
    }

    if (highlight.containerQueryInfo) {
      for (const containerQuery of highlight.containerQueryInfo) {
        drawContainerQueryHighlight(containerQuery, this.context, this.emulationScaleFactor);
      }
    }

    // Draw the highlight for flex item only if the element isn't also a flex container that already has some highlight
    // config.
    const isVisibleFlexContainer = highlight.flexInfo?.length && highlight.flexInfo.some(config => {
      return Object.keys(config.flexContainerHighlightConfig).length > 0;
    });

    if (highlight.flexItemInfo && !isVisibleFlexContainer) {
      for (const flexItem of highlight.flexItemInfo) {
        const path = flexItem.boxSizing === 'content' ? contentPath : borderPath;
        if (!path) {
          continue;
        }
        drawLayoutFlexItemHighlight(
            flexItem, path, this.context, this.deviceScaleFactor, this.canvasWidth, this.canvasHeight,
            this.emulationScaleFactor);
      }
    }
    this.context.restore();

    return {bounds: bounds};
  }

  drawGridHighlight(highlight: GridHighlight) {
    if (this.persistentOverlay) {
      this.persistentOverlay.drawGridHighlight(highlight);
    }
  }

  drawFlexContainerHighlight(highlight: FlexContainerHighlight) {
    if (this.persistentOverlay) {
      this.persistentOverlay.drawFlexContainerHighlight(highlight);
    }
  }

  drawScrollSnapHighlight(highlight: ScrollSnapHighlight) {
    this.persistentOverlay?.drawScrollSnapHighlight(highlight);
  }

  drawContainerQueryHighlight(highlight: ContainerQueryHighlight) {
    this.persistentOverlay?.drawContainerQueryHighlight(highlight);
  }

  drawIsolatedElementHighlight(highlight: IsolatedElementHighlight) {
    this.persistentOverlay?.drawIsolatedElementHighlight(highlight);
  }

  private drawAxis(context: CanvasRenderingContext2D, rulerAtRight: boolean, rulerAtBottom: boolean) {
    context.save();

    const pageFactor = this.pageZoomFactor * this.pageScaleFactor * this.emulationScaleFactor;
    const scrollX = this.scrollX * this.pageScaleFactor;
    const scrollY = this.scrollY * this.pageScaleFactor;
    function zoom(x: number) {
      return Math.round(x * pageFactor);
    }
    function unzoom(x: number) {
      return Math.round(x / pageFactor);
    }

    const width = this.canvasWidth / pageFactor;
    const height = this.canvasHeight / pageFactor;

    const gridSubStep = 5;
    const gridStep = 50;

    {
      // Draw X grid background
      context.save();
      context.fillStyle = gridBackgroundColor;
      if (rulerAtBottom) {
        context.fillRect(0, zoom(height) - 15, zoom(width), zoom(height));
      } else {
        context.fillRect(0, 0, zoom(width), 15);
      }

      // Clip out backgrounds intersection
      context.globalCompositeOperation = 'destination-out';
      context.fillStyle = 'red';
      if (rulerAtRight) {
        context.fillRect(zoom(width) - 15, 0, zoom(width), zoom(height));
      } else {
        context.fillRect(0, 0, 15, zoom(height));
      }
      context.restore();

      // Draw Y grid background
      context.fillStyle = gridBackgroundColor;
      if (rulerAtRight) {
        context.fillRect(zoom(width) - 15, 0, zoom(width), zoom(height));
      } else {
        context.fillRect(0, 0, 15, zoom(height));
      }
    }

    context.lineWidth = 1;
    context.strokeStyle = darkGridColor;
    context.fillStyle = darkGridColor;
    {
      // Draw labels.
      context.save();
      context.translate(-scrollX, 0.5 - scrollY);
      const maxY = height + unzoom(scrollY);
      for (let y = 2 * gridStep; y < maxY; y += 2 * gridStep) {
        context.save();
        context.translate(scrollX, zoom(y));
        context.rotate(-Math.PI / 2);
        context.fillText(String(y), 2, rulerAtRight ? zoom(width) - 7 : 13);
        context.restore();
      }
      context.translate(0.5, -0.5);
      const maxX = width + unzoom(scrollX);
      for (let x = 2 * gridStep; x < maxX; x += 2 * gridStep) {
        context.save();
        context.fillText(String(x), zoom(x) + 2, rulerAtBottom ? scrollY + zoom(height) - 7 : scrollY + 13);
        context.restore();
      }
      context.restore();
    }

    {
      // Draw vertical grid
      context.save();
      if (rulerAtRight) {
        context.translate(zoom(width), 0);
        context.scale(-1, 1);
      }
      context.translate(-scrollX, 0.5 - scrollY);
      const maxY = height + unzoom(scrollY);
      for (let y = gridStep; y < maxY; y += gridStep) {
        context.beginPath();
        context.moveTo(scrollX, zoom(y));
        const markLength = (y % (gridStep * 2)) ? 5 : 8;
        context.lineTo(scrollX + markLength, zoom(y));
        context.stroke();
      }
      context.strokeStyle = lightGridColor;
      for (let y = gridSubStep; y < maxY; y += gridSubStep) {
        if (!(y % gridStep)) {
          continue;
        }
        context.beginPath();
        context.moveTo(scrollX, zoom(y));
        context.lineTo(scrollX + gridSubStep, zoom(y));
        context.stroke();
      }
      context.restore();
    }

    {
      // Draw horizontal grid
      context.save();
      if (rulerAtBottom) {
        context.translate(0, zoom(height));
        context.scale(1, -1);
      }
      context.translate(0.5 - scrollX, -scrollY);
      const maxX = width + unzoom(scrollX);
      for (let x = gridStep; x < maxX; x += gridStep) {
        context.beginPath();
        context.moveTo(zoom(x), scrollY);
        const markLength = (x % (gridStep * 2)) ? 5 : 8;
        context.lineTo(zoom(x), scrollY + markLength);
        context.stroke();
      }
      context.strokeStyle = lightGridColor;
      for (let x = gridSubStep; x < maxX; x += gridSubStep) {
        if (!(x % gridStep)) {
          continue;
        }
        context.beginPath();
        context.moveTo(zoom(x), scrollY);
        context.lineTo(zoom(x), scrollY + gridSubStep);
        context.stroke();
      }
      context.restore();
    }

    context.restore();
  }
}

const lightGridColor = 'rgba(0,0,0,0.2)';
const darkGridColor = 'rgba(0,0,0,0.7)';
const gridBackgroundColor = 'rgba(255, 255, 255, 0.8)';

/**
 * Determine the layout type of the highlighted element based on the config.
 * @param {Object} elementInfo The element information, part of the config object passed to drawHighlight
 * @return {String|null} The layout type of the object, or null if none was found
 */
function getElementLayoutType(elementInfo: ElementInfo): string|null {
  if (elementInfo.layoutObjectName && elementInfo.layoutObjectName.endsWith('Grid')) {
    return 'grid';
  }

  if (elementInfo.layoutObjectName && elementInfo.layoutObjectName === 'LayoutNGFlexibleBox') {
    return 'flex';
  }

  return null;
}

/**
 * Create the DOM node that displays the description of the highlighted element
 */
export function createElementDescription(elementInfo: ElementInfo, colorFormat: string): Element {
  const elementInfoElement = createElement('div', 'element-info');
  const elementInfoHeaderElement = createChild(elementInfoElement, 'div', 'element-info-header');

  const layoutType = getElementLayoutType(elementInfo);
  if (layoutType) {
    createChild(elementInfoHeaderElement, 'div', `element-layout-type ${layoutType}`);
  }
  const descriptionElement = createChild(elementInfoHeaderElement, 'div', 'element-description monospace');
  const tagNameElement = createChild(descriptionElement, 'span', 'material-tag-name');
  tagNameElement.textContent = elementInfo.tagName;
  const nodeIdElement = createChild(descriptionElement, 'span', 'material-node-id');
  const maxLength = 80;
  nodeIdElement.textContent = elementInfo.idValue ? '#' + ellipsify(elementInfo.idValue, maxLength) : '';
  nodeIdElement.classList.toggle('hidden', !elementInfo.idValue);

  const classNameElement = createChild(descriptionElement, 'span', 'material-class-name');
  if (nodeIdElement.textContent.length < maxLength) {
    classNameElement.textContent = ellipsify(elementInfo.className || '', maxLength - nodeIdElement.textContent.length);
  }
  classNameElement.classList.toggle('hidden', !elementInfo.className);
  const dimensionsElement = createChild(elementInfoHeaderElement, 'div', 'dimensions');
  createChild(dimensionsElement, 'span', 'material-node-width').textContent =
      String(Math.round(elementInfo.nodeWidth * 100) / 100);
  createTextChild(dimensionsElement, '\u00d7');
  createChild(dimensionsElement, 'span', 'material-node-height').textContent =
      String(Math.round(elementInfo.nodeHeight * 100) / 100);

  const style = elementInfo.style || {};
  let elementInfoBodyElement: HTMLElement;

  if (elementInfo.isLockedAncestor) {
    addTextRow('Showing content-visibility ancestor', '');
  }

  if (elementInfo.isLocked) {
    addTextRow('Descendants are skipped due to content-visibility', '');
  }

  const color = style['color'];
  const colorRgba = style['color-unclamped-rgba'];
  if (color && colorRgba && !isTransparent(colorRgba)) {
    addColorRow('Color', style['color-css-text'] ?? color, style['color-css-text'] ? 'original' : colorFormat);
  }

  const fontFamily = style['font-family'];
  const fontSize = style['font-size'];
  if (fontFamily && fontSize !== '0px') {
    addTextRow('Font', `${fontSize} ${fontFamily}`);
  }

  const bgColor = style['background-color'];
  const bgColorRgba = style['background-color-unclamped-rgba'];
  if (bgColor && bgColorRgba && !isTransparent(bgColorRgba)) {
    addColorRow(
        'Background', style['background-color-css-text'] ?? bgColor,
        style['background-color-css-text'] ? 'original' : colorFormat);
  }

  const margin = style['margin'];
  if (margin && margin !== '0px') {
    addTextRow('Margin', margin);
  }

  const padding = style['padding'];
  if (padding && padding !== '0px') {
    addTextRow('Padding', padding);
  }

  const cbgColorRgba = elementInfo.contrast ? elementInfo.contrast.backgroundColorUnclampedRgba : null;
  const hasContrastInfo = colorRgba && !isTransparent(colorRgba) && cbgColorRgba && !isTransparent(cbgColorRgba);

  if (elementInfo.showAccessibilityInfo) {
    addSection('Accessibility');

    if (hasContrastInfo && style['color-unclamped-rgba'] && elementInfo.contrast) {
      addContrastRow(style['color-unclamped-rgba'], elementInfo.contrast);
    }

    addTextRow('Name', elementInfo.accessibleName);
    addTextRow('Role', elementInfo.accessibleRole);
    addIconRow(
        'Keyboard-focusable',
        elementInfo.isKeyboardFocusable ? 'a11y-icon a11y-icon-ok' : 'a11y-icon a11y-icon-not-ok');
  }

  function ensureElementInfoBody() {
    if (!elementInfoBodyElement) {
      elementInfoBodyElement = createChild(elementInfoElement, 'div', 'element-info-body');
    }
  }

  function addSection(name: string) {
    ensureElementInfoBody();
    const rowElement = createChild(elementInfoBodyElement, 'div', 'element-info-row element-info-section');
    const nameElement = createChild(rowElement, 'div', 'section-name');
    nameElement.textContent = name;
    createChild(createChild(rowElement, 'div', 'separator-container'), 'div', 'separator');
  }

  function addRow(name: string, rowClassName: string|undefined, valueClassName: string|undefined) {
    ensureElementInfoBody();
    const rowElement = createChild(elementInfoBodyElement, 'div', 'element-info-row');
    if (rowClassName) {
      rowElement.classList.add(rowClassName);
    }
    const nameElement = createChild(rowElement, 'div', 'element-info-name');
    nameElement.textContent = name;
    createChild(rowElement, 'div', 'element-info-gap');
    return createChild(rowElement, 'div', valueClassName || '');
  }

  function addIconRow(name: string, value: string) {
    createChild(addRow(name, '', 'element-info-value-icon'), 'div', value);
  }

  function addTextRow(name: string, value: string) {
    createTextChild(addRow(name, '', 'element-info-value-text'), value);
  }

  function addColorRow(name: string, color: string, colorFormat: string) {
    const valueElement = addRow(name, '', 'element-info-value-color');
    const swatch = createChild(valueElement, 'div', 'color-swatch');
    const inner = createChild(swatch, 'div', 'color-swatch-inner');
    inner.style.backgroundColor = color;
    createTextChild(valueElement, formatColor(color, colorFormat));
  }

  function addContrastRow(fgColor: ColorRgba, contrast: ContrastInfo) {
    const parsedFgColor = fgColor.slice() as ColorRgba;
    const parsedBgColor = contrast.backgroundColorUnclampedRgba.slice() as ColorRgba;
    // Merge text opacity into the alpha channel of the color.
    parsedFgColor[3] *= contrast.textOpacity;
    const valueElement = addRow('Contrast', '', 'element-info-value-contrast');
    const sampleText = createChild(valueElement, 'div', 'contrast-text');
    sampleText.style.color = formatRgba(parsedFgColor, 'rgb');
    sampleText.style.backgroundColor = contrast.backgroundColorCssText;
    sampleText.textContent = 'Aa';
    const valueSpan = createChild(valueElement, 'span');
    if (contrast.contrastAlgorithm === 'apca') {
      const percentage = contrastRatioAPCA(parsedFgColor, parsedBgColor);
      const threshold = getAPCAThreshold(contrast.fontSize, contrast.fontWeight);
      valueSpan.textContent = String(Math.floor(percentage * 100) / 100) + '%';
      createChild(
          valueElement, 'div',
          threshold === null || Math.abs(percentage) < threshold ? 'a11y-icon a11y-icon-warning' :
                                                                   'a11y-icon a11y-icon-ok');
    } else if (contrast.contrastAlgorithm === 'aa' || contrast.contrastAlgorithm === 'aaa') {
      const ratio = contrastRatio(parsedFgColor, parsedBgColor);
      const threshold = getContrastThreshold(contrast.fontSize, contrast.fontWeight)[contrast.contrastAlgorithm];
      valueSpan.textContent = String(Math.floor(ratio * 100) / 100);
      createChild(valueElement, 'div', ratio < threshold ? 'a11y-icon a11y-icon-warning' : 'a11y-icon a11y-icon-ok');
    }
  }

  return elementInfoElement;
}

/**
 * @param {Object} elementInfo The highlight config object passed to drawHighlight
 * @param {String} colorFormat
 * @param {Object} bounds
 * @param {number} canvasWidth
 * @param {number} canvasHeight
 */
function drawElementTitle(
    elementInfo: ElementInfo, colorFormat: string, bounds: Bounds, canvasWidth: number, canvasHeight: number) {
  // Get the tooltip container and empty it, there can only be one tooltip displayed at the same time.
  const tooltipContainer = document.getElementById('tooltip-container');
  if (!tooltipContainer) {
    throw new Error('#tooltip-container is not found');
  }

  tooltipContainer.innerHTML = '';

  // Create the necessary wrappers.
  const wrapper = createChild(tooltipContainer, 'div');
  const tooltipContent = createChild(wrapper, 'div', 'tooltip-content');

  // Create the tooltip content and append it.
  const tooltip = createElementDescription(elementInfo, colorFormat);
  tooltipContent.appendChild(tooltip);

  const titleWidth = tooltipContent.offsetWidth;
  const titleHeight = tooltipContent.offsetHeight;
  const arrowHalfWidth = 8;
  const pageMargin = 2;
  const arrowWidth = arrowHalfWidth * 2;
  const arrowInset = arrowHalfWidth + 2;

  const containerMinX = pageMargin + arrowInset;
  const containerMaxX = canvasWidth - pageMargin - arrowInset - arrowWidth;

  // Left align arrow to the tooltip but ensure it is pointing to the element.
  // Center align arrow if the inspected element bounds are too narrow.
  const boundsAreTooNarrow = bounds.maxX - bounds.minX < arrowWidth + 2 * arrowInset;
  let arrowX: number;
  if (boundsAreTooNarrow) {
    arrowX = (bounds.minX + bounds.maxX) * 0.5 - arrowHalfWidth;
  } else {
    const xFromLeftBound = bounds.minX + arrowInset;
    const xFromRightBound = bounds.maxX - arrowInset - arrowWidth;
    if (xFromLeftBound > containerMinX && xFromLeftBound < containerMaxX) {
      arrowX = xFromLeftBound;
    } else {
      arrowX = constrainNumber(containerMinX, xFromLeftBound, xFromRightBound);
    }
  }
  // Hide arrow if element is completely off the sides of the page.
  const arrowHidden = arrowX < containerMinX || arrowX > containerMaxX;

  let boxX = arrowX - arrowInset;
  boxX = constrainNumber(boxX, pageMargin, canvasWidth - titleWidth - pageMargin);

  let boxY = bounds.minY - arrowHalfWidth - titleHeight;
  let onTop = true;
  if (boxY < 0) {
    boxY = Math.min(canvasHeight - titleHeight, bounds.maxY + arrowHalfWidth);
    onTop = false;
  } else if (bounds.minY > canvasHeight) {
    boxY = canvasHeight - arrowHalfWidth - titleHeight;
  }

  // If tooltip intersects with the bounds, hide it.
  // Allow bounds to contain the box though for the large elements like <body>.
  const includes = boxX >= bounds.minX && boxX + titleWidth <= bounds.maxX && boxY >= bounds.minY &&
      boxY + titleHeight <= bounds.maxY;
  const overlaps =
      boxX < bounds.maxX && boxX + titleWidth > bounds.minX && boxY < bounds.maxY && boxY + titleHeight > bounds.minY;
  if (overlaps && !includes) {
    tooltipContent.style.display = 'none';
    return;
  }

  tooltipContent.style.top = boxY + 'px';
  tooltipContent.style.left = boxX + 'px';
  tooltipContent.style.setProperty('--arrow-visibility', (arrowHidden || includes) ? 'hidden' : 'visible');
  if (arrowHidden) {
    return;
  }

  tooltipContent.style.setProperty('--arrow', onTop ? 'var(--arrow-down)' : 'var(--arrow-up)');
  tooltipContent.style.setProperty('--shadow-direction', onTop ? 'var(--shadow-up)' : 'var(--shadow-down)');
  // When tooltip is on-top remove 1px from the arrow's top value to get rid of whitespace produced by the tooltip's border.
  tooltipContent.style.setProperty('--arrow-top', (onTop ? titleHeight - 1 : -arrowHalfWidth) + 'px');
  tooltipContent.style.setProperty('--arrow-left', (arrowX - boxX) + 'px');
}

const DEFAULT_RULER_COLOR = 'rgba(128, 128, 128, 0.3)';

function drawRulers(
    context: CanvasRenderingContext2D, bounds: PathBounds, rulerAtRight: boolean, rulerAtBottom: boolean,
    color: string|undefined, dash: boolean, canvasWidth: number, canvasHeight: number) {
  context.save();
  const width = canvasWidth;
  const height = canvasHeight;
  context.strokeStyle = color || DEFAULT_RULER_COLOR;
  context.lineWidth = 1;
  context.translate(0.5, 0.5);
  if (dash) {
    context.setLineDash([3, 3]);
  }

  if (rulerAtRight) {
    for (const y in bounds.rightmostXForY) {
      context.beginPath();
      context.moveTo(width, Number(y));
      context.lineTo(bounds.rightmostXForY[y], Number(y));
      context.stroke();
    }
  } else {
    for (const y in bounds.leftmostXForY) {
      context.beginPath();
      context.moveTo(0, Number(y));
      context.lineTo(bounds.leftmostXForY[y], Number(y));
      context.stroke();
    }
  }

  if (rulerAtBottom) {
    for (const x in bounds.bottommostYForX) {
      context.beginPath();
      context.moveTo(Number(x), height);
      context.lineTo(Number(x), bounds.topmostYForX[x]);
      context.stroke();
    }
  } else {
    for (const x in bounds.topmostYForX) {
      context.beginPath();
      context.moveTo(Number(x), 0);
      context.lineTo(Number(x), bounds.topmostYForX[x]);
      context.stroke();
    }
  }

  context.restore();
}
