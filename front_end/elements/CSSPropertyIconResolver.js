// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const writingModesAffectingFlexDirection = new Set([
  'tb',
  'tb-rl',
  'vertical-lr',
  'vertical-rl',
]);

/**
 * @param {!Map<string, string>} computedStyles
 * @return {!IconInfo}
 */
function flexDirectionRowIcon(computedStyles) {
  const isRtl = computedStyles.get('direction') === 'rtl';
  const writingMode = computedStyles.get('writing-mode');
  const isVertical = writingMode && writingModesAffectingFlexDirection.has(writingMode);

  // Default to LTR and no writing mode.
  let flipX = true;
  let flipY = false;
  let rotate = -90;

  if (isRtl && !isVertical) {
    rotate = 90;
    flipX = false;
    flipY = false;
  }

  if (isRtl && isVertical) {
    rotate = 0;
    flipX = false;
    flipY = true;
  }

  if (!isRtl && isVertical) {
    rotate = 0;
    flipX = false;
    flipY = false;
  }

  // The icon is pointing top-down by default with the arrow on the right-hand side.
  return {
    iconName: 'flex-direction-icon',
    rotate: rotate,
    scaleX: flipX ? -1 : 1,
    scaleY: flipY ? -1 : 1,
  };
}

/**
 * @type {!Map<string, function(!Map<string, string>):!IconInfo>}
 */
const textToIconResolver = new Map();

textToIconResolver.set('flex-direction: row', flexDirectionRowIcon);

/**
 * @param {string} text
 * @param {!Map<string, string>} computedStyles
 * @return {?IconInfo}
 */
export function findIcon(text, computedStyles) {
  const resolver = textToIconResolver.get(text);
  if (resolver) {
    return resolver(computedStyles);
  }
  return null;
}

/**
 * @typedef {{
 *  iconName: string,
 *  rotate: number,
 *  scaleX: number,
 *  scaleY: number,
 * }}
 */
// @ts-ignore typedef
export let IconInfo;
