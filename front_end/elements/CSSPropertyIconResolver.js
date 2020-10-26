// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const writingModesAffectingFlexDirection = new Set([
  'tb',
  'tb-rl',
  'vertical-lr',
  'vertical-rl',
]);

/** @enum {string} */
export const PhysicalFlexDirection = {
  LEFT_TO_RIGHT: 'left-to-right',
  RIGHT_TO_LEFT: 'right-to-left',
  BOTTOM_TO_TOP: 'bottom-to-top',
  TOP_TO_BOTTOM: 'top-to-bottom',
};

/**
 * @param {!PhysicalFlexDirection} direction
 * @return {!PhysicalFlexDirection}
 */
export function reverseDirection(direction) {
  if (direction === PhysicalFlexDirection.LEFT_TO_RIGHT) {
    return PhysicalFlexDirection.RIGHT_TO_LEFT;
  }
  if (direction === PhysicalFlexDirection.RIGHT_TO_LEFT) {
    return PhysicalFlexDirection.LEFT_TO_RIGHT;
  }
  if (direction === PhysicalFlexDirection.TOP_TO_BOTTOM) {
    return PhysicalFlexDirection.BOTTOM_TO_TOP;
  }
  if (direction === PhysicalFlexDirection.BOTTOM_TO_TOP) {
    return PhysicalFlexDirection.TOP_TO_BOTTOM;
  }
  throw new Error('Unknown PhysicalFlexDirection');
}

/**
 * @param {!Object.<string, !PhysicalFlexDirection>} directions
 * @return {!Object.<string, !PhysicalFlexDirection>}
 */
function extendWithReverseDirections(directions) {
  return {
    ...directions,
    'row-reverse': reverseDirection(directions.row),
    'column-reverse': reverseDirection(directions.column),
  };
}

/**
 * Returns absolute directions for row and column values of flex-direction
 * taking into account the direction and writing-mode attributes.
 *
 * @param {!Map<string, string>} computedStyles
 * @return {!Object.<string, !PhysicalFlexDirection>}
 */
export function getPhysicalFlexDirections(computedStyles) {
  const isRtl = computedStyles.get('direction') === 'rtl';
  const writingMode = computedStyles.get('writing-mode');
  const isVertical = writingMode && writingModesAffectingFlexDirection.has(writingMode);

  if (isVertical) {
    return extendWithReverseDirections({
      row: isRtl ? PhysicalFlexDirection.BOTTOM_TO_TOP : PhysicalFlexDirection.TOP_TO_BOTTOM,
      column: writingMode === 'vertical-lr' ? PhysicalFlexDirection.LEFT_TO_RIGHT : PhysicalFlexDirection.RIGHT_TO_LEFT
    });
  }

  return extendWithReverseDirections({
    row: isRtl ? PhysicalFlexDirection.RIGHT_TO_LEFT : PhysicalFlexDirection.LEFT_TO_RIGHT,
    column: PhysicalFlexDirection.TOP_TO_BOTTOM,
  });
}

/**
 * Rotates the flex direction icon in such way that it indicates
 * the desired `direction` and the arrow in the icon is always at the bottom
 * or at the right.
 *
 * By default, the icon is pointing top-down with the arrow on the right-hand side.
 *
 * @param {!PhysicalFlexDirection} direction
 * @return {!IconInfo}
 */
export function rotateFlexDirectionIcon(direction) {
  // Default to LTR.
  let flipX = true;
  let flipY = false;
  let rotate = -90;

  if (direction === PhysicalFlexDirection.RIGHT_TO_LEFT) {
    rotate = 90;
    flipY = false;
    flipX = false;
  } else if (direction === PhysicalFlexDirection.TOP_TO_BOTTOM) {
    rotate = 0;
    flipX = false;
    flipY = false;
  } else if (direction === PhysicalFlexDirection.BOTTOM_TO_TOP) {
    rotate = 0;
    flipX = false;
    flipY = true;
  }

  return {
    iconName: 'flex-direction-icon',
    rotate: rotate,
    scaleX: flipX ? -1 : 1,
    scaleY: flipY ? -1 : 1,
  };
}

/**
 *
 * @param {string} value
 * @return {function(!Map<string, string>):!IconInfo}
 */
function flexDirectionIcon(value) {
  /**
   * @param {!Map<string, string>} computedStyles
   * @return {!IconInfo}
   */
  function getIcon(computedStyles) {
    const directions = getPhysicalFlexDirections(computedStyles);
    return rotateFlexDirectionIcon(directions[value]);
  }
  return getIcon;
}

/**
 * @type {!Map<string, function(!Map<string, string>):!IconInfo>}
 */
const textToIconResolver = new Map();

textToIconResolver.set('flex-direction: row', flexDirectionIcon('row'));
textToIconResolver.set('flex-direction: column', flexDirectionIcon('column'));
textToIconResolver.set('flex-direction: column-reverse', flexDirectionIcon('column-reverse'));
textToIconResolver.set('flex-direction: row-reverse', flexDirectionIcon('row-reverse'));
textToIconResolver.set('flex-direction: initial', flexDirectionIcon('row'));
textToIconResolver.set('flex-direction: unset', flexDirectionIcon('row'));
textToIconResolver.set('flex-direction: revert', flexDirectionIcon('row'));

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
