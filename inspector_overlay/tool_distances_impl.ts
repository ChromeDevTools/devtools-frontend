//  Copyright 2019 The Chromium Authors. All rights reserved.
//  Use of this source code is governed by a BSD-style license that can be
//  found in the LICENSE file.

import {Overlay} from './common.js';

interface Style {
  'background-color': string;
  'background-image': string;
  'border-left-width': string;
  'border-left-style': string;
  'border-left-color': string;
  'border-right-width': string;
  'border-right-style': string;
  'border-right-color': string;
  'border-top-width': string;
  'border-top-style': string;
  'border-top-color': string;
  'border-bottom-width': string;
  'border-bottom-style': string;
  'border-bottom-color': string;
  'outline-width': string;
  'outline-style': string;
  'outline-color': string;
  'box-shadow': string;
}

type StyleKey = keyof Style;
type Quad = number[];

interface DistanceInfo {
  style: Style;
  border: Quad;
  padding: Quad;
  content: Quad;
  boxes: number[][];
}

export class DistancesOverlay extends Overlay {
  drawDistances({distanceInfo}: {distanceInfo: DistanceInfo}) {
    if (!distanceInfo) {
      return;
    }
    const rect = quadToRect(getVisualQuad(distanceInfo));
    this.context.save();
    this.context.strokeStyle = '#ccc';
    for (const box of distanceInfo.boxes) {
      this.context.strokeRect(box[0], box[1], box[2], box[3]);
    }
    this.context.strokeStyle = '#f00';
    this.context.lineWidth = 1;
    this.context.rect(rect.x - 0.5, rect.y - 0.5, rect.w + 1, rect.h + 1);
    this.context.stroke();
    this.context.restore();
  }

  setPlatform(platform: string) {
    super.setPlatform(platform);
    this.document.body.classList.add('fill');

    const canvas = this.document.createElement('canvas');
    canvas.id = 'canvas';
    canvas.classList.add('fill');
    this.document.body.append(canvas);

    this.setCanvas(canvas);
  }
}

function getVisualQuad(data: DistanceInfo): Quad {
  const style = data['style'];
  if (shouldUseVisualBorder(style)) {
    return data['border'];
  }
  if (ShouldUseVisualPadding(style)) {
    return data['padding'];
  }
  return data['content'];

  function shouldUseVisualBorder(style: Style): boolean {
    const sides = ['top', 'right', 'bottom', 'left'];
    for (const side of sides) {
      const border_width = style[`border-${side}-width` as StyleKey];
      const border_style = style[`border-${side}-style` as StyleKey];
      const border_color = style[`border-${side}-color` as StyleKey];
      if (border_width !== '0px' && border_style !== 'none' && !border_color.endsWith('00')) {
        return true;
      }
    }
    const outline_width = style['outline-width'];
    const outline_style = style['outline-style'];
    const outline_color = style['outline-color'];
    if (outline_width !== '0px' && outline_style !== 'none' && !outline_color.endsWith('00')) {
      return true;
    }
    const box_shadow = style['box-shadow'];
    if (box_shadow !== 'none') {
      return true;
    }
    return false;
  }

  function ShouldUseVisualPadding(style: Style): boolean {
    const bg_color = style['background-color'];
    const bg_image = style['background-image'];
    if (!bg_color.startsWith('#FFFFFF') && !bg_color.endsWith('00')) {
      return true;
    }
    if (bg_image !== 'none') {
      return true;
    }
    return false;
  }
}

function quadToRect(quad: Quad): {x: number, y: number, w: number, h: number} {
  return {x: quad[0], y: quad[1], w: quad[4] - quad[0], h: quad[5] - quad[1]};
}
