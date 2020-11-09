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
 * @param {string} iconName
 * @param {!PhysicalFlexDirection} direction
 * @return {!IconInfo}
 */
export function rotateAlignContentIcon(iconName, direction) {
  return {
    iconName,
    rotate: direction === PhysicalFlexDirection.RIGHT_TO_LEFT ?
        90 :
        (direction === PhysicalFlexDirection.LEFT_TO_RIGHT ? -90 : 0),
    scaleX: 1,
    scaleY: 1,
  };
}

/**
 * @param {string} iconName
 * @param {!PhysicalFlexDirection} direction
 * @return {!IconInfo}
 */
export function rotateJustifyContentIcon(iconName, direction) {
  return {
    iconName,
    rotate: direction === PhysicalFlexDirection.TOP_TO_BOTTOM ?
        90 :
        (direction === PhysicalFlexDirection.BOTTOM_TO_TOP ? -90 : 0),
    scaleX: direction === PhysicalFlexDirection.RIGHT_TO_LEFT ? -1 : 1,
    scaleY: 1,
  };
}

/**
 * @param {string} iconName
 * @param {!PhysicalFlexDirection} direction
 * @return {!IconInfo}
 */
export function rotateAlignItemsIcon(iconName, direction) {
  return {
    iconName,
    rotate: direction === PhysicalFlexDirection.RIGHT_TO_LEFT ?
        90 :
        (direction === PhysicalFlexDirection.LEFT_TO_RIGHT ? -90 : 0),
    scaleX: 1,
    scaleY: 1,
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
 *
 * @param {string} iconName
 * @return {function(!Map<string, string>):!IconInfo}
 */
function flexAlignContentIcon(iconName) {
  /**
   * @param {!Map<string, string>} computedStyles
   * @return {!IconInfo}
   */
  function getIcon(computedStyles) {
    const directions = getPhysicalFlexDirections(computedStyles);
    /**
     * @type {!Map<string, !PhysicalFlexDirection>}
     */
    const flexDirectionToPhysicalDirection = new Map([
      ['column', directions.row],
      ['row', directions.column],
      ['column-reverse', directions.row],
      ['row-reverse', directions.column],
    ]);
    const computedFlexDirection = computedStyles.get('flex-direction') || 'row';
    const iconDirection = flexDirectionToPhysicalDirection.get(computedFlexDirection);
    if (!iconDirection) {
      throw new Error('Unknown direction for flex-align icon');
    }
    return rotateAlignContentIcon(iconName, iconDirection);
  }
  return getIcon;
}

/**
 *
 * @param {string} iconName
 * @return {function(!Map<string, string>):!IconInfo}
 */
function flexJustifyContentIcon(iconName) {
  /**
   * @param {!Map<string, string>} computedStyles
   * @return {!IconInfo}
   */
  function getIcon(computedStyles) {
    const directions = getPhysicalFlexDirections(computedStyles);
    return rotateJustifyContentIcon(iconName, directions[computedStyles.get('flex-direction') || 'row']);
  }
  return getIcon;
}

/**
 *
 * @param {string} iconName
 * @return {function(!Map<string, string>):!IconInfo}
 */
function flexAlignItemsIcon(iconName) {
  /**
   * @param {!Map<string, string>} computedStyles
   * @return {!IconInfo}
   */
  function getIcon(computedStyles) {
    const directions = getPhysicalFlexDirections(computedStyles);
    /**
     * @type {!Map<string, !PhysicalFlexDirection>}
     */
    const flexDirectionToPhysicalDirection = new Map([
      ['column', directions.row],
      ['row', directions.column],
      ['column-reverse', directions.row],
      ['row-reverse', directions.column],
    ]);
    const computedFlexDirection = computedStyles.get('flex-direction') || 'row';
    const iconDirection = flexDirectionToPhysicalDirection.get(computedFlexDirection);
    if (!iconDirection) {
      throw new Error('Unknown direction for flex-align icon');
    }
    return rotateAlignItemsIcon(iconName, iconDirection);
  }
  return getIcon;
}

/**
 * The baseline icon contains the letter A to indicate that we're aligning based on where the text baseline is.
 * Therefore we're not rotating this icon like the others, as this would become confusing. Plus baseline alignment
 * is likely only really useful in horizontal flow cases.
 *
 * @return {!IconInfo}
 */
function baselineIcon() {
  return {
    iconName: 'baseline-icon',
    rotate: 0,
    scaleX: 1,
    scaleY: 1,
  };
}

/**
 *
 * @param {string} iconName
 * @return {function(!Map<string, string>,!Map<string, string>)}):!IconInfo}
 */
function flexAlignSelfIcon(iconName) {
  /**
   * @param {!Map<string, string>} computedStyles
   * @param {!Map<string, string>} parentComputedStyles
   * @return {!IconInfo}
   */
  function getIcon(computedStyles, parentComputedStyles) {
    return flexAlignItemsIcon(iconName)(parentComputedStyles);
  }
  return getIcon;
}

/**
 * @type {!Map<string, function(!Map<string, string>, !Map<string, string>):!IconInfo>}
 */
const textToIconResolver = new Map([
  ['flex-direction: row', flexDirectionIcon('row')],
  ['flex-direction: column', flexDirectionIcon('column')],
  ['flex-direction: column-reverse', flexDirectionIcon('column-reverse')],
  ['flex-direction: row-reverse', flexDirectionIcon('row-reverse')],
  ['flex-direction: initial', flexDirectionIcon('row')],
  ['flex-direction: unset', flexDirectionIcon('row')],
  ['flex-direction: revert', flexDirectionIcon('row')],
  ['align-content: center', flexAlignContentIcon('flex-align-content-center-icon')],
  ['align-content: space-around', flexAlignContentIcon('flex-align-content-space-around-icon')],
  ['align-content: space-between', flexAlignContentIcon('flex-align-content-space-between-icon')],
  ['align-content: stretch', flexAlignContentIcon('flex-align-content-stretch-icon')],
  ['align-content: space-evenly', flexAlignContentIcon('flex-align-content-space-evenly-icon')],
  ['align-content: flex-end', flexAlignContentIcon('flex-align-content-end-icon')],
  ['align-content: flex-start', flexAlignContentIcon('flex-align-content-start-icon')],
  // TODO(crbug.com/1139945): Start & end should be enabled once Chromium supports them for flexbox.
  // ['align-content: start', flexAlignContentIcon('flex-align-content-start-icon')],
  // ['align-content: end', flexAlignContentIcon('flex-align-content-end-icon')],
  ['align-content: normal', flexAlignContentIcon('flex-align-content-stretch-icon')],
  ['align-content: revert', flexAlignContentIcon('flex-align-content-stretch-icon')],
  ['align-content: unset', flexAlignContentIcon('flex-align-content-stretch-icon')],
  ['align-content: initial', flexAlignContentIcon('flex-align-content-stretch-icon')],
  ['justify-content: center', flexJustifyContentIcon('flex-justify-content-center-icon')],
  ['justify-content: space-around', flexJustifyContentIcon('flex-justify-content-space-around-icon')],
  ['justify-content: space-between', flexJustifyContentIcon('flex-justify-content-space-between-icon')],
  ['justify-content: space-evenly', flexJustifyContentIcon('flex-justify-content-space-evenly-icon')],
  ['justify-content: flex-end', flexJustifyContentIcon('flex-justify-content-flex-end-icon')],
  ['justify-content: flex-start', flexJustifyContentIcon('flex-justify-content-flex-start-icon')],
  ['align-items: stretch', flexAlignItemsIcon('flex-align-items-stretch-icon')],
  ['align-items: flex-end', flexAlignItemsIcon('flex-align-items-flex-end-icon')],
  ['align-items: flex-start', flexAlignItemsIcon('flex-align-items-flex-start-icon')],
  ['align-items: center', flexAlignItemsIcon('flex-align-items-center-icon')],
  ['align-items: baseline', baselineIcon],
  ['align-content: baseline', baselineIcon],
  ['align-self: baseline', baselineIcon],
  ['align-self: center', flexAlignSelfIcon('flex-align-self-center-icon')],
  ['align-self: flex-start', flexAlignSelfIcon('flex-align-self-flex-start-icon')],
  ['align-self: flex-end', flexAlignSelfIcon('flex-align-self-flex-end-icon')],
  ['align-self: stretch', flexAlignSelfIcon('flex-align-self-stretch-icon')],
]);

/**
 * @param {string} text
 * @param {?Map<string, string>} computedStyles
 * @param {?Map<string, string>=} parentComputedStyles
 * @return {?IconInfo}
 */
export function findIcon(text, computedStyles, parentComputedStyles) {
  const resolver = textToIconResolver.get(text);
  if (resolver) {
    return resolver(computedStyles || new Map(), parentComputedStyles || new Map());
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
