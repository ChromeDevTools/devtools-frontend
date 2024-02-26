// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../../core/common/common.js';
import * as Platform from '../../../../core/platform/platform.js';
import * as FrontendHelpers from '../../../../testing/EnvironmentHelpers.js';
import * as ComponentHelpers from '../../helpers/helpers.js';

await ComponentHelpers.ComponentServerSetup.setup();
await FrontendHelpers.initializeGlobalVars();

const form = document.querySelector<HTMLFormElement>('form');
if (!form) {
  throw new Error('could not find form');
}

form.addEventListener('submit', event => {
  event.preventDefault();
  const property = form.querySelector<HTMLInputElement>('#css-property')?.value;
  const value = form.querySelector<HTMLInputElement>('#css-value')?.value;
  if (!property || !value) {
    return;
  }
  const output = legacyInvertVariableForDarkMode(property, value);
  const outputElem = document.querySelector<HTMLElement>('#output');
  if (outputElem) {
    outputElem.innerText = output;
  }
});

/**
 * This code is largely copy and pasted from the legacy ThemeSupport
 * around color patching. This is because we are working towards removing the
 * legacy color patching, but still may need to be able to generate legacy dark
 * mode values for light colors during the migration. This doc exists for that
 * reason.
 */

type ColorUsage = 'unknown'|'foreground'|'background';

function patchHSLA(hsla: number[], colorUsage: ColorUsage): void {
  const hue = hsla[0];
  const sat = hsla[1];
  let lit: number = hsla[2];
  const alpha = hsla[3];

  const minCap = colorUsage === 'background' ? 0.14 : 0;
  const maxCap = colorUsage === 'foreground' ? 0.9 : 1;
  lit = 1 - lit;
  if (lit < minCap * 2) {
    lit = minCap + lit / 2;
  } else if (lit > 2 * maxCap - 1) {
    lit = maxCap - 1 / 2 + lit / 2;
  }
  hsla[0] = Platform.NumberUtilities.clamp(hue, 0, 1);
  hsla[1] = Platform.NumberUtilities.clamp(sat, 0, 1);
  hsla[2] = Platform.NumberUtilities.clamp(lit, 0, 1);
  hsla[3] = Platform.NumberUtilities.clamp(alpha, 0, 1);
}

function patchColor(colorAsText: string, colorUsage: ColorUsage): string {
  const color = Common.Color.parse(colorAsText)?.as(Common.Color.Format.HSL);
  if (!color) {
    return colorAsText;
  }
  const hsla: Common.ColorUtils.Color4D = [color.h, color.s, color.l, color.alpha ?? 1];
  patchHSLA(hsla, colorUsage);

  const rgba = Common.Color.hsl2rgb(hsla);
  const outColor = new Common.Color.Legacy(rgba, Common.Color.Format.RGBA);
  let outText = outColor.asString();
  if (!outText) {
    outText = outColor.asString(outColor.hasAlpha() ? Common.Color.Format.RGBA : Common.Color.Format.RGB);
  }
  return outText || colorAsText;
}

function legacyInvertVariableForDarkMode(cssProperty: string, cssValue: string): string {
  let colorUsage: ColorUsage = 'unknown';
  if (cssProperty.indexOf('background') === 0 || cssProperty.indexOf('border') === 0) {
    colorUsage = 'background';
  }
  if (cssProperty.indexOf('background') === -1) {
    colorUsage = 'foreground';
  }

  const items = cssValue.replace(Common.Color.Regex, '\0$1\0').split('\0');
  const output = [];
  for (const item of items) {
    if (!item) {
      continue;
    }
    const newColor = patchColor(item, colorUsage);
    output.push(newColor);
  }
  return output.join(' ');
}
