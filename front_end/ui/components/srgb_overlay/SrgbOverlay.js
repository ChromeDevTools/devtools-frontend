// Copyright 2017 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-lit-render-outside-of-view, @devtools/enforce-custom-element-definitions-location */
import * as Common from '../../../core/common/common.js';
import * as RenderCoordinator from '../../../ui/components/render_coordinator/render_coordinator.js';
import { html, render } from '../../../ui/lit/lit.js';
import srgbOverlayStyles from './srgbOverlay.css.js';
const SRGB_LABEL_HEIGHT = 10;
const SRGB_LABEL_BOTTOM = 3;
const SRGB_TEXT_UPPER_POINT_FROM_BOTTOM = SRGB_LABEL_HEIGHT + SRGB_LABEL_BOTTOM;
const EPSILON = 0.001;
function isColorInSrgbGamut(hsv) {
    const rgba = Common.Color.hsva2rgba([...hsv, 1]);
    const xyzd50 = Common.ColorConverter.ColorConverter.displayP3ToXyzd50(rgba[0], rgba[1], rgba[2]);
    const srgb = Common.ColorConverter.ColorConverter.xyzd50ToSrgb(xyzd50[0], xyzd50[1], xyzd50[2]);
    return srgb.every(val => val + EPSILON >= 0 && val - EPSILON <= 1);
}
export class SrgbOverlay extends HTMLElement {
    #shadow = this.attachShadow({ mode: 'open' });
    #getLinePoints({ hue, width, height }) {
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
                    linePoints.push({ x, y });
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
    #closestPointAtHeight(points, atHeight) {
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
    render({ hue, width, height }) {
        return RenderCoordinator.write('Srgb Overlay render', () => {
            const points = this.#getLinePoints({ hue, width, height });
            if (!points || points.length === 0) {
                return;
            }
            const closestPoint = this.#closestPointAtHeight(points, height - SRGB_TEXT_UPPER_POINT_FROM_BOTTOM);
            if (!closestPoint) {
                return;
            }
            render(html `
          <style>${srgbOverlayStyles}</style>
          <span class="label" style="right: ${width - closestPoint.x}px">sRGB</span>
          <svg>
            <polyline points=${points.map(point => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(' ')} class="gamut-line" />
          </svg>
        `, this.#shadow, { host: this });
        });
    }
}
customElements.define('devtools-spectrum-srgb-overlay', SrgbOverlay);
//# sourceMappingURL=SrgbOverlay.js.map