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

import {createChild, Overlay, type Bounds, type ResetData} from './common.js';

import {buildPath, emptyBounds, type PathBounds} from './highlight_common.js';

interface Path {
  path: Array<string|number>;
  outlineColor: string;
  name: string;
}

interface SourceOrderHighlight {
  sourceOrder: number;
  paths: Path[];
}

export class SourceOrderOverlay extends Overlay {
  private sourceOrderContainer!: HTMLElement;

  override reset(resetData: ResetData) {
    super.reset(resetData);
    this.sourceOrderContainer.textContent = '';
  }

  override install() {
    this.document.body.classList.add('fill');

    const canvas = this.document.createElement('canvas');
    canvas.id = 'canvas';
    canvas.classList.add('fill');
    this.document.body.append(canvas);

    const sourceOrderContainer = this.document.createElement('div');
    sourceOrderContainer.id = 'source-order-container';
    this.document.body.append(sourceOrderContainer);
    this.sourceOrderContainer = sourceOrderContainer;

    this.setCanvas(canvas);

    super.install();
  }

  override uninstall() {
    this.document.body.classList.remove('fill');
    this.document.body.innerHTML = '';
    super.uninstall();
  }

  drawSourceOrder(highlight: SourceOrderHighlight) {
    const sourceOrder = highlight.sourceOrder || 0;
    const path = highlight.paths.slice().pop();

    if (!path) {
      throw new Error('No path provided');
    }

    this.context.save();
    const bounds = emptyBounds();
    const outlineColor = path.outlineColor;

    this.context.save();
    drawPath(this.context, path.path, outlineColor, Boolean(sourceOrder), bounds, this.emulationScaleFactor);
    this.context.restore();

    this.context.save();
    if (Boolean(sourceOrder)) {
      this.drawSourceOrderLabel(sourceOrder, outlineColor, bounds);
    }
    this.context.restore();

    return {bounds};
  }

  private drawSourceOrderLabel(sourceOrder: number, color: string, bounds: PathBounds) {
    const sourceOrderContainer = this.sourceOrderContainer;
    const otherLabels = sourceOrderContainer.children;
    const labelContainer = createChild(sourceOrderContainer, 'div', 'source-order-label-container');
    labelContainer.style.color = color;
    labelContainer.textContent = String(sourceOrder);

    const labelHeight = labelContainer.offsetHeight;
    const labelWidth = labelContainer.offsetWidth;
    const labelType =
        getLabelType(bounds, labelHeight, labelWidth, otherLabels as HTMLCollectionOf<HTMLElement>, this.canvasHeight);
    const labelPosition = getPositionFromLabelType(labelType, bounds, labelHeight);

    labelContainer.classList.add(labelType);
    labelContainer.style.top = labelPosition.contentTop + 'px';
    labelContainer.style.left = labelPosition.contentLeft + 'px';
  }
}

// If there is a large number of child elements, labels will be placed in the top
// corner in order to keep the overlay rendering quick
const MAX_CHILD_ELEMENTS_THRESHOLD = 300;

/**
 * There are 8 types of labels.
 *
 * There are 4 positions a label can have on the y axis, relative to the element:
 * - topCorner, bottomCorner: placed inside of the element, in its left corners
 * - aboveElement, belowElement: placed outside of the element, aligned on the
 *   left edge of the element
 *
 * The label position is determined as follows:
 * 1. Top corner if the element is wider and taller than the element
 * 2. Above element if the label is wider or taller than the element
 * 3. Below element if the label would be placed above the element, but this would
 *    cause it to overlap with another label or intersect the top of the window
 * 4. Bottom corner if the label would be placed below the element, but this would
 *    cause it to intersect the bottom of the window
 * On the x axis, the label is always aligned with its element's leftmost edge.
 *
 * The label may need additional styles if it is taller or wider than the element,
 * to make sure all borders that don't touch the element's outline are rounded
 * - Wider: right corners are rounded
 * - Taller: top corners are rounded
 *
 * Examples: (E = element, L = label)
 *             ______
 *            |_L_|  | (the bottom right corner of the label will be rounded)
 * topCorner: |      |
 *            |___E__|
 *                     ___
 *                    |_L_| (the bottom right corner of the label will be rounded)
 * aboveElementWider: | |
 *                    |E|
 *                    |_|
 *                      ______
 * bottomCornerTaller: |  L   |_____
 *                     |______|__E__|
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const LabelTypes = {
  topCorner: 'top-corner',
  aboveElement: 'above-element',
  belowElement: 'below-element',
  aboveElementWider: 'above-element-wider',
  belowElementWider: 'below-element-wider',
  bottomCornerWider: 'bottom-corner-wider',
  bottomCornerTaller: 'bottom-corner-taller',
  bottomCornerWiderTaller: 'bottom-corner-wider-taller',
};

/**
 * Calculates the coordinates to place the label based on position type
 */
export function getPositionFromLabelType(positionType: string, bounds: Omit<Bounds, 'allPoints'>, labelHeight: number):
    {contentTop: number, contentLeft: number} {
  let contentTop = 0;
  switch (positionType) {
    case LabelTypes.topCorner:
      contentTop = bounds.minY;
      break;
    case LabelTypes.aboveElement:
    case LabelTypes.aboveElementWider:
      contentTop = bounds.minY - labelHeight;
      break;
    case LabelTypes.belowElement:
    case LabelTypes.belowElementWider:
      contentTop = bounds.maxY;
      break;
    case LabelTypes.bottomCornerWider:
    case LabelTypes.bottomCornerTaller:
    case LabelTypes.bottomCornerWiderTaller:
      contentTop = bounds.maxY - labelHeight;
      break;
  }
  return {
    contentTop,
    contentLeft: bounds.minX,
  };
}

/**
 * Determines the position type of the label based on the element it's associated
 * with, avoiding overlaps between other labels
 */
export function getLabelType(
    bounds: Omit<Bounds, 'allPoints'>, labelHeight: number, labelWidth: number,
    otherLabels: HTMLCollectionOf<HTMLElement>, canvasHeight: number): string {
  let labelType;
  // Label goes in the top left corner if the element is bigger than the label
  // or if there are too many child nodes
  const widerThanElement = bounds.minX + labelWidth > bounds.maxX;
  const tallerThanElement = bounds.minY + labelHeight > bounds.maxY;
  if ((!widerThanElement && !tallerThanElement) || otherLabels.length >= MAX_CHILD_ELEMENTS_THRESHOLD) {
    return LabelTypes.topCorner;
  }

  // Check if the new label would overlap with an existing label if placed above
  // its element
  let overlaps = false;
  for (let i = 0; i < otherLabels.length; i++) {
    const currentLabel = otherLabels[i];
    const rect = currentLabel.getBoundingClientRect();
    // Skip the newly created/appended element that is currently being placed
    if (currentLabel.style.top === '' && currentLabel.style.left === '') {
      continue;
    }
    const topOverlaps = bounds.minY - labelHeight <= rect.top + rect.height && bounds.minY - labelHeight >= rect.top;
    const bottomOverlaps = bounds.minY <= rect.top + rect.height && bounds.minY >= rect.top;
    const leftOverlaps = bounds.minX >= rect.left && bounds.minX <= rect.left + rect.width;
    const rightOverlaps = bounds.minX + labelWidth >= rect.left && bounds.minX + labelWidth <= rect.left + rect.width;
    const sideOverlaps = leftOverlaps || rightOverlaps;
    if (sideOverlaps && (topOverlaps || bottomOverlaps)) {
      overlaps = true;
      break;
    }
  }
  // Label goes on top of the element if the element is too small
  if (bounds.minY - labelHeight > 0 && !overlaps) {
    labelType = LabelTypes.aboveElement;
    if (widerThanElement) {
      labelType = LabelTypes.aboveElementWider;
    }
    // Label goes below the element if would go off the screen/overlap with another label
  } else if (bounds.maxY + labelHeight < canvasHeight) {
    labelType = LabelTypes.belowElement;
    if (widerThanElement) {
      labelType = LabelTypes.belowElementWider;
    }
    // Label goes in the bottom left corner of the element if putting it below the element would make it go off the screen
  } else {
    if (widerThanElement && tallerThanElement) {
      labelType = LabelTypes.bottomCornerWiderTaller;
    } else if (widerThanElement) {
      labelType = LabelTypes.bottomCornerWider;
    } else {
      labelType = LabelTypes.bottomCornerTaller;
    }
  }
  return labelType;
}

function drawPath(
    context: CanvasRenderingContext2D, commands: Array<string|number>, outlineColor: string|undefined, isChild: boolean,
    bounds: PathBounds, emulationScaleFactor: number): Path2D {
  context.save();
  const path = buildPath(commands, bounds, emulationScaleFactor);
  if (outlineColor) {
    context.strokeStyle = outlineColor;
    context.lineWidth = 2;
    if (!isChild) {
      context.setLineDash([3, 3]);
    }
    context.stroke(path);
  }
  context.restore();
  return path;
}
