// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const writingModesAffectingFlexDirection = new Set([
  'tb',
  'tb-rl',
  'vertical-lr',
  'vertical-rl',
]);

export const enum PhysicalDirection {
  LEFT_TO_RIGHT = 'left-to-right',
  RIGHT_TO_LEFT = 'right-to-left',
  BOTTOM_TO_TOP = 'bottom-to-top',
  TOP_TO_BOTTOM = 'top-to-bottom',
}

type DirectionsDict = {
  [key: string]: PhysicalDirection,
};

export type IconInfo = {
  iconName: string,
  rotate: number,
  scaleX: number,
  scaleY: number,
};

type ComputedStyles = Map<string, string>;

export function reverseDirection(direction: PhysicalDirection): PhysicalDirection {
  if (direction === PhysicalDirection.LEFT_TO_RIGHT) {
    return PhysicalDirection.RIGHT_TO_LEFT;
  }
  if (direction === PhysicalDirection.RIGHT_TO_LEFT) {
    return PhysicalDirection.LEFT_TO_RIGHT;
  }
  if (direction === PhysicalDirection.TOP_TO_BOTTOM) {
    return PhysicalDirection.BOTTOM_TO_TOP;
  }
  if (direction === PhysicalDirection.BOTTOM_TO_TOP) {
    return PhysicalDirection.TOP_TO_BOTTOM;
  }
  throw new Error('Unknown PhysicalFlexDirection');
}

function extendWithReverseDirections(directions: DirectionsDict): DirectionsDict {
  return {
    ...directions,
    'row-reverse': reverseDirection(directions.row),
    'column-reverse': reverseDirection(directions.column),
  };
}

/**
 * Returns absolute directions for rows, columns,
 * reverse rows and reverse column taking into account the direction and writing-mode attributes.
 */
export function getPhysicalDirections(computedStyles: ComputedStyles): DirectionsDict {
  const isRtl = computedStyles.get('direction') === 'rtl';
  const writingMode = computedStyles.get('writing-mode');
  const isVertical = writingMode && writingModesAffectingFlexDirection.has(writingMode);

  if (isVertical) {
    return extendWithReverseDirections({
      row: isRtl ? PhysicalDirection.BOTTOM_TO_TOP : PhysicalDirection.TOP_TO_BOTTOM,
      column: writingMode === 'vertical-lr' ? PhysicalDirection.LEFT_TO_RIGHT : PhysicalDirection.RIGHT_TO_LEFT,
    });
  }

  return extendWithReverseDirections({
    row: isRtl ? PhysicalDirection.RIGHT_TO_LEFT : PhysicalDirection.LEFT_TO_RIGHT,
    column: PhysicalDirection.TOP_TO_BOTTOM,
  });
}

/**
 * Rotates the flex direction icon in such way that it indicates
 * the desired `direction` and the arrow in the icon is always at the bottom
 * or at the right.
 *
 * By default, the icon is pointing top-down with the arrow on the right-hand side.
 */
export function rotateFlexDirectionIcon(direction: PhysicalDirection): IconInfo {
  // Default to LTR.
  let flipX = true;
  let flipY = false;
  let rotate = -90;

  if (direction === PhysicalDirection.RIGHT_TO_LEFT) {
    rotate = 90;
    flipY = false;
    flipX = false;
  } else if (direction === PhysicalDirection.TOP_TO_BOTTOM) {
    rotate = 0;
    flipX = false;
    flipY = false;
  } else if (direction === PhysicalDirection.BOTTOM_TO_TOP) {
    rotate = 0;
    flipX = false;
    flipY = true;
  }

  return {
    iconName: 'flex-direction',
    rotate: rotate,
    scaleX: flipX ? -1 : 1,
    scaleY: flipY ? -1 : 1,
  };
}

export function rotateAlignContentIcon(iconName: string, direction: PhysicalDirection): IconInfo {
  return {
    iconName,
    rotate: direction === PhysicalDirection.RIGHT_TO_LEFT ? 90 :
                                                            (direction === PhysicalDirection.LEFT_TO_RIGHT ? -90 : 0),
    scaleX: 1,
    scaleY: 1,
  };
}

export function rotateJustifyContentIcon(iconName: string, direction: PhysicalDirection): IconInfo {
  return {
    iconName,
    rotate: direction === PhysicalDirection.TOP_TO_BOTTOM ? 90 :
                                                            (direction === PhysicalDirection.BOTTOM_TO_TOP ? -90 : 0),
    scaleX: direction === PhysicalDirection.RIGHT_TO_LEFT ? -1 : 1,
    scaleY: 1,
  };
}

export function rotateJustifyItemsIcon(iconName: string, direction: PhysicalDirection): IconInfo {
  return {
    iconName,
    rotate: direction === PhysicalDirection.TOP_TO_BOTTOM ? 90 :
                                                            (direction === PhysicalDirection.BOTTOM_TO_TOP ? -90 : 0),
    scaleX: direction === PhysicalDirection.RIGHT_TO_LEFT ? -1 : 1,
    scaleY: 1,
  };
}

export function rotateAlignItemsIcon(iconName: string, direction: PhysicalDirection): IconInfo {
  return {
    iconName,
    rotate: direction === PhysicalDirection.RIGHT_TO_LEFT ? 90 :
                                                            (direction === PhysicalDirection.LEFT_TO_RIGHT ? -90 : 0),
    scaleX: 1,
    scaleY: 1,
  };
}

function flexDirectionIcon(value: string): (styles: ComputedStyles) => IconInfo {
  function getIcon(computedStyles: ComputedStyles): IconInfo {
    const directions = getPhysicalDirections(computedStyles);
    return rotateFlexDirectionIcon(directions[value]);
  }
  return getIcon;
}

function flexAlignContentIcon(iconName: string): (styles: ComputedStyles) => IconInfo {
  function getIcon(computedStyles: ComputedStyles): IconInfo {
    const directions = getPhysicalDirections(computedStyles);
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

function gridAlignContentIcon(iconName: string): (styles: ComputedStyles) => IconInfo {
  function getIcon(computedStyles: ComputedStyles): IconInfo {
    const directions = getPhysicalDirections(computedStyles);
    return rotateAlignContentIcon(iconName, directions.column);
  }
  return getIcon;
}

function flexJustifyContentIcon(iconName: string): (styles: ComputedStyles) => IconInfo {
  function getIcon(computedStyles: ComputedStyles): IconInfo {
    const directions = getPhysicalDirections(computedStyles);
    return rotateJustifyContentIcon(iconName, directions[computedStyles.get('flex-direction') || 'row']);
  }
  return getIcon;
}

function gridJustifyContentIcon(iconName: string): (styles: ComputedStyles) => IconInfo {
  function getIcon(computedStyles: ComputedStyles): IconInfo {
    const directions = getPhysicalDirections(computedStyles);
    return rotateJustifyContentIcon(iconName, directions.row);
  }
  return getIcon;
}

function gridJustifyItemsIcon(iconName: string): (styles: ComputedStyles) => IconInfo {
  function getIcon(computedStyles: ComputedStyles): IconInfo {
    const directions = getPhysicalDirections(computedStyles);
    return rotateJustifyItemsIcon(iconName, directions.row);
  }
  return getIcon;
}

function flexAlignItemsIcon(iconName: string): (styles: ComputedStyles) => IconInfo {
  function getIcon(computedStyles: ComputedStyles): IconInfo {
    const directions = getPhysicalDirections(computedStyles);
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

function gridAlignItemsIcon(iconName: string): (styles: ComputedStyles) => IconInfo {
  function getIcon(computedStyles: ComputedStyles): IconInfo {
    const directions = getPhysicalDirections(computedStyles);
    return rotateAlignItemsIcon(iconName, directions.column);
  }
  return getIcon;
}

/**
 * The baseline icon contains the letter A to indicate that we're aligning based on where the text baseline is.
 * Therefore we're not rotating this icon like the others, as this would become confusing. Plus baseline alignment
 * is likely only really useful in horizontal flow cases.
 */
function baselineIcon(): IconInfo {
  return {
    iconName: 'align-items-baseline',
    rotate: 0,
    scaleX: 1,
    scaleY: 1,
  };
}

function flexAlignSelfIcon(iconName: string): (styles: ComputedStyles, parentStyles: ComputedStyles) => IconInfo {
  function getIcon(computedStyles: ComputedStyles, parentComputedStyles: ComputedStyles): IconInfo {
    return flexAlignItemsIcon(iconName)(parentComputedStyles);
  }
  return getIcon;
}

function gridAlignSelfIcon(iconName: string): (styles: ComputedStyles, parentStyles: ComputedStyles) => IconInfo {
  function getIcon(computedStyles: ComputedStyles, parentComputedStyles: ComputedStyles): IconInfo {
    return gridAlignItemsIcon(iconName)(parentComputedStyles);
  }
  return getIcon;
}

export function roateFlexWrapIcon(iconName: string, direction: PhysicalDirection): IconInfo {
  return {
    iconName,
    rotate: direction === PhysicalDirection.BOTTOM_TO_TOP || direction === PhysicalDirection.TOP_TO_BOTTOM ? 90 : 0,
    scaleX: 1,
    scaleY: 1,
  };
}

function flexWrapIcon(iconName: string): (styles: ComputedStyles) => IconInfo {
  function getIcon(computedStyles: ComputedStyles): IconInfo {
    const directions = getPhysicalDirections(computedStyles);
    const computedFlexDirection = computedStyles.get('flex-direction') || 'row';
    return roateFlexWrapIcon(iconName, directions[computedFlexDirection]);
  }
  return getIcon;
}

const flexContainerIcons = new Map([
  ['flex-direction: row', flexDirectionIcon('row')],
  ['flex-direction: column', flexDirectionIcon('column')],
  ['flex-direction: column-reverse', flexDirectionIcon('column-reverse')],
  ['flex-direction: row-reverse', flexDirectionIcon('row-reverse')],
  ['flex-direction: initial', flexDirectionIcon('row')],
  ['flex-direction: unset', flexDirectionIcon('row')],
  ['flex-direction: revert', flexDirectionIcon('row')],
  ['align-content: center', flexAlignContentIcon('align-content-center')],
  ['align-content: space-around', flexAlignContentIcon('align-content-space-around')],
  ['align-content: space-between', flexAlignContentIcon('align-content-space-between')],
  ['align-content: stretch', flexAlignContentIcon('align-content-stretch')],
  ['align-content: space-evenly', flexAlignContentIcon('align-content-space-evenly')],
  ['align-content: flex-end', flexAlignContentIcon('align-content-end')],
  ['align-content: flex-start', flexAlignContentIcon('align-content-start')],
  ['align-content: start', flexAlignContentIcon('align-content-start')],
  ['align-content: end', flexAlignContentIcon('align-content-end')],
  ['align-content: normal', flexAlignContentIcon('align-content-stretch')],
  ['align-content: revert', flexAlignContentIcon('align-content-stretch')],
  ['align-content: unset', flexAlignContentIcon('align-content-stretch')],
  ['align-content: initial', flexAlignContentIcon('align-content-stretch')],
  ['justify-content: center', flexJustifyContentIcon('justify-content-center')],
  ['justify-content: space-around', flexJustifyContentIcon('justify-content-space-around')],
  ['justify-content: space-between', flexJustifyContentIcon('justify-content-space-between')],
  ['justify-content: space-evenly', flexJustifyContentIcon('justify-content-space-evenly')],
  ['justify-content: flex-end', flexJustifyContentIcon('justify-content-end')],
  ['justify-content: flex-start', flexJustifyContentIcon('justify-content-start')],
  ['align-items: stretch', flexAlignItemsIcon('align-items-stretch')],
  ['align-items: flex-end', flexAlignItemsIcon('align-items-end')],
  ['align-items: flex-start', flexAlignItemsIcon('align-items-start')],
  ['align-items: center', flexAlignItemsIcon('align-items-center')],
  ['align-items: baseline', baselineIcon],
  ['align-content: baseline', baselineIcon],
  ['flex-wrap: wrap', flexWrapIcon('flex-wrap')],
  ['flex-wrap: nowrap', flexWrapIcon('flex-no-wrap')],
]);

const flexItemIcons = new Map([
  ['align-self: baseline', baselineIcon],
  ['align-self: center', flexAlignSelfIcon('align-self-center')],
  ['align-self: flex-start', flexAlignSelfIcon('align-self-start')],
  ['align-self: flex-end', flexAlignSelfIcon('align-self-end')],
  ['align-self: stretch', flexAlignSelfIcon('align-self-stretch')],
]);

const gridContainerIcons = new Map([
  ['align-content: center', gridAlignContentIcon('align-content-center')],
  ['align-content: space-around', gridAlignContentIcon('align-content-space-around')],
  ['align-content: space-between', gridAlignContentIcon('align-content-space-between')],
  ['align-content: stretch', gridAlignContentIcon('align-content-stretch')],
  ['align-content: space-evenly', gridAlignContentIcon('align-content-space-evenly')],
  ['align-content: end', gridAlignContentIcon('align-content-end')],
  ['align-content: start', gridAlignContentIcon('align-content-start')],
  ['align-content: baseline', baselineIcon],
  ['justify-content: center', gridJustifyContentIcon('justify-content-center')],
  ['justify-content: space-around', gridJustifyContentIcon('justify-content-space-around')],
  ['justify-content: space-between', gridJustifyContentIcon('justify-content-space-between')],
  ['justify-content: space-evenly', gridJustifyContentIcon('justify-content-space-evenly')],
  ['justify-content: end', gridJustifyContentIcon('justify-content-end')],
  ['justify-content: start', gridJustifyContentIcon('justify-content-start')],
  ['align-items: stretch', gridAlignItemsIcon('align-items-stretch')],
  ['align-items: end', gridAlignItemsIcon('align-items-end')],
  ['align-items: start', gridAlignItemsIcon('align-items-start')],
  ['align-items: center', gridAlignItemsIcon('align-items-center')],
  ['align-items: baseline', baselineIcon],
  ['justify-items: center', gridJustifyItemsIcon('justify-items-center')],
  ['justify-items: stretch', gridJustifyItemsIcon('justify-items-stretch')],
  ['justify-items: end', gridJustifyItemsIcon('justify-items-end')],
  ['justify-items: start', gridJustifyItemsIcon('justify-items-start')],
  ['justify-items: baseline', baselineIcon],
]);

const gridItemIcons = new Map([
  ['align-self: baseline', baselineIcon],
  ['align-self: center', gridAlignSelfIcon('align-self-center')],
  ['align-self: start', gridAlignSelfIcon('align-self-start')],
  ['align-self: end', gridAlignSelfIcon('align-self-end')],
  ['align-self: stretch', gridAlignSelfIcon('align-self-stretch')],
]);

const isFlexContainer = (computedStyles?: ComputedStyles|null): boolean => {
  const display = computedStyles?.get('display');
  return display === 'flex' || display === 'inline-flex';
};

const isGridContainer = (computedStyles?: ComputedStyles|null): boolean => {
  const display = computedStyles?.get('display');
  return display === 'grid' || display === 'inline-grid';
};

export function findIcon(
    text: string, computedStyles: ComputedStyles|null, parentComputedStyles?: ComputedStyles|null): IconInfo|null {
  if (isFlexContainer(computedStyles)) {
    const icon = findFlexContainerIcon(text, computedStyles);
    if (icon) {
      return icon;
    }
  }
  if (isFlexContainer(parentComputedStyles)) {
    const icon = findFlexItemIcon(text, computedStyles, parentComputedStyles);
    if (icon) {
      return icon;
    }
  }
  if (isGridContainer(computedStyles)) {
    const icon = findGridContainerIcon(text, computedStyles);
    if (icon) {
      return icon;
    }
  }
  if (isGridContainer(parentComputedStyles)) {
    const icon = findGridItemIcon(text, computedStyles, parentComputedStyles);
    if (icon) {
      return icon;
    }
  }
  return null;
}

export function findFlexContainerIcon(text: string, computedStyles: ComputedStyles|null): IconInfo|null {
  const resolver = flexContainerIcons.get(text);
  if (resolver) {
    return resolver(computedStyles || new Map());
  }
  return null;
}

export function findFlexItemIcon(
    text: string, computedStyles: ComputedStyles|null, parentComputedStyles?: ComputedStyles|null): IconInfo|null {
  const resolver = flexItemIcons.get(text);
  if (resolver) {
    return resolver(computedStyles || new Map(), parentComputedStyles || new Map());
  }
  return null;
}

export function findGridContainerIcon(text: string, computedStyles: ComputedStyles|null): IconInfo|null {
  const resolver = gridContainerIcons.get(text);
  if (resolver) {
    return resolver(computedStyles || new Map());
  }
  return null;
}

export function findGridItemIcon(
    text: string, computedStyles: ComputedStyles|null, parentComputedStyles?: ComputedStyles|null): IconInfo|null {
  const resolver = gridItemIcons.get(text);
  if (resolver) {
    return resolver(computedStyles || new Map(), parentComputedStyles || new Map());
  }
  return null;
}
