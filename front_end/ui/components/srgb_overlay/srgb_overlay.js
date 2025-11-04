var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/ui/components/srgb_overlay/SrgbOverlay.js
var SrgbOverlay_exports = {};
__export(SrgbOverlay_exports, {
  SrgbOverlay: () => SrgbOverlay
});
import * as Common from "./../../../core/common/common.js";
import * as RenderCoordinator from "./../render_coordinator/render_coordinator.js";
import { html, render } from "./../../lit/lit.js";

// gen/front_end/ui/components/srgb_overlay/srgbOverlay.css.js
var srgbOverlay_css_default = `/*
 * Copyright 2023 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

:host {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
}

.gamut-line {
  /* We want to show 50% white color in all themes since this is drawn over a color rectangle */
  stroke: color-mix(in srgb, var(--ref-palette-neutral100) 50%, transparent);
  fill: none;
}

.label {
  position: absolute;
  bottom: 3px;
  margin-right: 5px;
  /* We want to show 50% white color in all themes since this is drawn over a color rectangle */
  color: color-mix(in srgb, var(--ref-palette-neutral100) 50%, transparent);
}

/*# sourceURL=${import.meta.resolve("./srgbOverlay.css")} */`;

// gen/front_end/ui/components/srgb_overlay/SrgbOverlay.js
var SRGB_LABEL_HEIGHT = 10;
var SRGB_LABEL_BOTTOM = 3;
var SRGB_TEXT_UPPER_POINT_FROM_BOTTOM = SRGB_LABEL_HEIGHT + SRGB_LABEL_BOTTOM;
var EPSILON = 1e-3;
function isColorInSrgbGamut(hsv) {
  const rgba = Common.Color.hsva2rgba([...hsv, 1]);
  const xyzd50 = Common.ColorConverter.ColorConverter.displayP3ToXyzd50(rgba[0], rgba[1], rgba[2]);
  const srgb = Common.ColorConverter.ColorConverter.xyzd50ToSrgb(xyzd50[0], xyzd50[1], xyzd50[2]);
  return srgb.every((val) => val + EPSILON >= 0 && val - EPSILON <= 1);
}
var SrgbOverlay = class extends HTMLElement {
  #shadow = this.attachShadow({ mode: "open" });
  #getLinePoints({ hue, width, height }) {
    if (width === 0 || height === 0) {
      return null;
    }
    const step = 1 / window.devicePixelRatio;
    const linePoints = [];
    let x = 0;
    for (let y = 0; y < height; y += step) {
      const value = 1 - y / height;
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
        x: width
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
    return RenderCoordinator.write("Srgb Overlay render", () => {
      const points = this.#getLinePoints({ hue, width, height });
      if (!points || points.length === 0) {
        return;
      }
      const closestPoint = this.#closestPointAtHeight(points, height - SRGB_TEXT_UPPER_POINT_FROM_BOTTOM);
      if (!closestPoint) {
        return;
      }
      render(html`
          <style>${srgbOverlay_css_default}</style>
          <span class="label" style="right: ${width - closestPoint.x}px">sRGB</span>
          <svg>
            <polyline points=${points.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" ")} class="gamut-line" />
          </svg>
        `, this.#shadow, { host: this });
    });
  }
};
customElements.define("devtools-spectrum-srgb-overlay", SrgbOverlay);
export {
  SrgbOverlay_exports as SrgbOverlay
};
//# sourceMappingURL=srgb_overlay.js.map
