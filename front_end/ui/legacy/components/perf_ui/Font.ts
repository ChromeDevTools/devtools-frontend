// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Host from '../../../../core/host/host.js';

let fontFamily: string|null = null;

/**
 * Because we run our UI in a couple of contexts (actual app & test
 * environments) and on multiple platforms, the font is not consistent, so this
 * function is used to determine which font to use when rendering the canvas.
 * The most reliable way to do this is to see what font is on the body element,
 * but because this triggers layout we ensure we only do it once before caching
 * the result. If nothing is set on the body for whatever reason, we fall back
 * to what we usually use on the platform.
 *
 * We need this behaviour because in interaction tests we force the font to be a
 * specific font that we know is available on local dev machines and on the bots
 * to ensure that the screenshot tests are consistent.
 **/
export function getFontFamilyForCanvas(): string {
  if (fontFamily) {
    return fontFamily;
  }

  const bodyStyles = getComputedStyle(document.body);
  if (bodyStyles.fontFamily) {
    fontFamily = bodyStyles.fontFamily;
  } else {
    fontFamily = Host.Platform.fontFamily();
  }

  return fontFamily;
}

export const DEFAULT_FONT_SIZE = '11px';
