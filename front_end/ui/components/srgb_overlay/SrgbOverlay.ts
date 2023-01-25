// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as Coordinator from '../../../ui/components/render_coordinator/render_coordinator.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';

import srgbOverlayStyles from './srgbOverlay.css.js';

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

type SrgbOverlayProps = {
  // [0 - 1] corresponding to HSV hue
  hue: number,
  width: number,
  height: number,
};

const SRGB_LABEL_HEIGHT = 10;
const SRGB_LABEL_BOTTOM = 3;
const SRGB_TEXT_UPPER_POINT_FROM_BOTTOM = SRGB_LABEL_HEIGHT + SRGB_LABEL_BOTTOM;

const EPSILON = 0.001;
// TODO(crbug.com/1409892): Use `Color` class here for a better code (and not duplicate isInGamut logic here)
function isColorInSrgbGamut(hsv: Common.ColorUtils.Color3D): boolean {
  const rgba: Common.ColorUtils.Color4D = [0, 0, 0, 0];
  Common.Color.hsva2rgba([...hsv, 1], rgba);
  const xyzd50 = Common.ColorConverter.ColorConverter.displayP3ToXyzd50(rgba[0], rgba[1], rgba[2]);
  const srgb = Common.ColorConverter.ColorConverter.xyzd50ToSrgb(xyzd50[0], xyzd50[1], xyzd50[2]);
  return srgb.every(val => val + EPSILON >= 0 && val - EPSILON <= 1);
}

export class SrgbOverlay extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-spectrum-srgb-overlay`;
  readonly #shadow = this.attachShadow({mode: 'open'});

  constructor() {
    super();
    this.#shadow.adoptedStyleSheets = [
      srgbOverlayStyles,
    ];
  }

  #getLinePoints({hue, width, height}: SrgbOverlayProps): {x: number, y: number}[]|null {
    if (width === 0 || height === 0) {
      return null;
    }

    const step = 1 / window.devicePixelRatio;
    const linePoints = [];
    let x = 0;
    for (let y = 0; y < height; y += step) {
      const value = 1 - (y / height);

      for (; x < width; x += step) {
        const saturation = x / width;
        if (!isColorInSrgbGamut([hue, saturation, value])) {
          linePoints.push({x, y});
          break;
        }
      }
    }

    if (linePoints.length === 0) {
      return null;
    }

    const lastPoint = linePoints[linePoints.length - 1];
    if (lastPoint.x < width) {
      linePoints.push({
        y: lastPoint.y,
        x: width,
      });
    }

    return linePoints;
  }

  #closestPointAtHeight(points: {x: number, y: number}[], atHeight: number): {x: number, y: number}|null {
    let min = Infinity;
    let closestPoint = null;
    for (const point of points) {
      if (Math.abs(atHeight - point.y) <= min) {
        min = Math.abs(atHeight - point.y);
        closestPoint = point;
      }
    }

    return closestPoint;
  }

  render({hue, width, height}: SrgbOverlayProps): Promise<void> {
    return coordinator.write('Srgb Overlay render', () => {
      const points = this.#getLinePoints({hue, width, height});
      if (!points || points.length === 0) {
        return;
      }

      const closestPoint = this.#closestPointAtHeight(points, height - SRGB_TEXT_UPPER_POINT_FROM_BOTTOM);
      if (!closestPoint) {
        return;
      }

      LitHtml.render(
          LitHtml.html`
          <span class="label" style="right: ${width - closestPoint.x}px">sRGB</span>
          <svg>
            <polyline points=${
              points.map(point => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(' ')} class="gamut-line" />
          </svg>
        `,
          this.#shadow, {host: this});
    });
  }
}

ComponentHelpers.CustomElements.defineComponent('devtools-spectrum-srgb-overlay', SrgbOverlay);

declare global {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface HTMLElementTagNameMap {
    'devtools-spectrum-srgb-overlay': SrgbOverlay;
  }
}
