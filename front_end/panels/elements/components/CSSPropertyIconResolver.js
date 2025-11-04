// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
const writingModesAffectingFlexDirection = new Set([
    'tb',
    'tb-rl',
    'vertical-lr',
    'vertical-rl',
]);
export function reverseDirection(direction) {
    if (direction === "left-to-right" /* PhysicalDirection.LEFT_TO_RIGHT */) {
        return "right-to-left" /* PhysicalDirection.RIGHT_TO_LEFT */;
    }
    if (direction === "right-to-left" /* PhysicalDirection.RIGHT_TO_LEFT */) {
        return "left-to-right" /* PhysicalDirection.LEFT_TO_RIGHT */;
    }
    if (direction === "top-to-bottom" /* PhysicalDirection.TOP_TO_BOTTOM */) {
        return "bottom-to-top" /* PhysicalDirection.BOTTOM_TO_TOP */;
    }
    if (direction === "bottom-to-top" /* PhysicalDirection.BOTTOM_TO_TOP */) {
        return "top-to-bottom" /* PhysicalDirection.TOP_TO_BOTTOM */;
    }
    throw new Error('Unknown PhysicalFlexDirection');
}
function extendWithReverseDirections(directions) {
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
export function getPhysicalDirections(computedStyles) {
    const isRtl = computedStyles.get('direction') === 'rtl';
    const writingMode = computedStyles.get('writing-mode');
    const isVertical = writingMode && writingModesAffectingFlexDirection.has(writingMode);
    if (isVertical) {
        return extendWithReverseDirections({
            row: isRtl ? "bottom-to-top" /* PhysicalDirection.BOTTOM_TO_TOP */ : "top-to-bottom" /* PhysicalDirection.TOP_TO_BOTTOM */,
            column: writingMode === 'vertical-lr' ? "left-to-right" /* PhysicalDirection.LEFT_TO_RIGHT */ : "right-to-left" /* PhysicalDirection.RIGHT_TO_LEFT */,
        });
    }
    return extendWithReverseDirections({
        row: isRtl ? "right-to-left" /* PhysicalDirection.RIGHT_TO_LEFT */ : "left-to-right" /* PhysicalDirection.LEFT_TO_RIGHT */,
        column: "top-to-bottom" /* PhysicalDirection.TOP_TO_BOTTOM */,
    });
}
/**
 * Rotates the flex direction icon in such way that it indicates
 * the desired `direction` and the arrow in the icon is always at the bottom
 * or at the right.
 *
 * By default, the icon is pointing top-down with the arrow on the right-hand side.
 */
export function rotateFlexDirectionIcon(direction) {
    // Default to LTR.
    let flipX = true;
    let flipY = false;
    let rotate = -90;
    if (direction === "right-to-left" /* PhysicalDirection.RIGHT_TO_LEFT */) {
        rotate = 90;
        flipY = false;
        flipX = false;
    }
    else if (direction === "top-to-bottom" /* PhysicalDirection.TOP_TO_BOTTOM */) {
        rotate = 0;
        flipX = false;
        flipY = false;
    }
    else if (direction === "bottom-to-top" /* PhysicalDirection.BOTTOM_TO_TOP */) {
        rotate = 0;
        flipX = false;
        flipY = true;
    }
    return {
        iconName: 'flex-direction',
        rotate,
        scaleX: flipX ? -1 : 1,
        scaleY: flipY ? -1 : 1,
    };
}
export function rotateAlignContentIcon(iconName, direction) {
    return {
        iconName,
        rotate: direction === "right-to-left" /* PhysicalDirection.RIGHT_TO_LEFT */ ? 90 :
            (direction === "left-to-right" /* PhysicalDirection.LEFT_TO_RIGHT */ ? -90 : 0),
        scaleX: 1,
        scaleY: 1,
    };
}
export function rotateJustifyContentIcon(iconName, direction) {
    return {
        iconName,
        rotate: direction === "top-to-bottom" /* PhysicalDirection.TOP_TO_BOTTOM */ ? 90 :
            (direction === "bottom-to-top" /* PhysicalDirection.BOTTOM_TO_TOP */ ? -90 : 0),
        scaleX: direction === "right-to-left" /* PhysicalDirection.RIGHT_TO_LEFT */ ? -1 : 1,
        scaleY: 1,
    };
}
export function rotateJustifyItemsIcon(iconName, direction) {
    return {
        iconName,
        rotate: direction === "top-to-bottom" /* PhysicalDirection.TOP_TO_BOTTOM */ ? 90 :
            (direction === "bottom-to-top" /* PhysicalDirection.BOTTOM_TO_TOP */ ? -90 : 0),
        scaleX: direction === "right-to-left" /* PhysicalDirection.RIGHT_TO_LEFT */ ? -1 : 1,
        scaleY: 1,
    };
}
export function rotateAlignItemsIcon(iconName, direction) {
    return {
        iconName,
        rotate: direction === "right-to-left" /* PhysicalDirection.RIGHT_TO_LEFT */ ? 90 :
            (direction === "left-to-right" /* PhysicalDirection.LEFT_TO_RIGHT */ ? -90 : 0),
        scaleX: 1,
        scaleY: 1,
    };
}
function flexDirectionIcon(value) {
    function getIcon(computedStyles) {
        const directions = getPhysicalDirections(computedStyles);
        return rotateFlexDirectionIcon(directions[value]);
    }
    return getIcon;
}
function flexAlignContentIcon(iconName) {
    function getIcon(computedStyles) {
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
function gridAlignContentIcon(iconName) {
    function getIcon(computedStyles) {
        const directions = getPhysicalDirections(computedStyles);
        return rotateAlignContentIcon(iconName, directions.column);
    }
    return getIcon;
}
function flexJustifyContentIcon(iconName) {
    function getIcon(computedStyles) {
        const directions = getPhysicalDirections(computedStyles);
        return rotateJustifyContentIcon(iconName, directions[computedStyles.get('flex-direction') || 'row']);
    }
    return getIcon;
}
function gridJustifyContentIcon(iconName) {
    function getIcon(computedStyles) {
        const directions = getPhysicalDirections(computedStyles);
        return rotateJustifyContentIcon(iconName, directions.row);
    }
    return getIcon;
}
function gridJustifyItemsIcon(iconName) {
    function getIcon(computedStyles) {
        const directions = getPhysicalDirections(computedStyles);
        return rotateJustifyItemsIcon(iconName, directions.row);
    }
    return getIcon;
}
function flexAlignItemsIcon(iconName) {
    function getIcon(computedStyles) {
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
function gridAlignItemsIcon(iconName) {
    function getIcon(computedStyles) {
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
function baselineIcon() {
    return {
        iconName: 'align-items-baseline',
        rotate: 0,
        scaleX: 1,
        scaleY: 1,
    };
}
function flexAlignSelfIcon(iconName) {
    function getIcon(parentComputedStyles) {
        return flexAlignItemsIcon(iconName)(parentComputedStyles);
    }
    return getIcon;
}
function gridAlignSelfIcon(iconName) {
    function getIcon(parentComputedStyles) {
        return gridAlignItemsIcon(iconName)(parentComputedStyles);
    }
    return getIcon;
}
export function rotateFlexWrapIcon(iconName, direction) {
    return {
        iconName,
        rotate: direction === "bottom-to-top" /* PhysicalDirection.BOTTOM_TO_TOP */ || direction === "top-to-bottom" /* PhysicalDirection.TOP_TO_BOTTOM */ ? 90 : 0,
        scaleX: 1,
        scaleY: 1,
    };
}
function flexWrapIcon(iconName) {
    function getIcon(computedStyles) {
        const directions = getPhysicalDirections(computedStyles);
        const computedFlexDirection = computedStyles.get('flex-direction') || 'row';
        return rotateFlexWrapIcon(iconName, directions[computedFlexDirection]);
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
    ['justify-content: end', flexJustifyContentIcon('justify-content-end')],
    ['justify-content: start', flexJustifyContentIcon('justify-content-start')],
    ['justify-content: right', flexJustifyContentIcon('justify-content-end')],
    ['justify-content: left', flexJustifyContentIcon('justify-content-start')],
    ['align-items: stretch', flexAlignItemsIcon('align-items-stretch')],
    ['align-items: flex-end', flexAlignItemsIcon('align-items-end')],
    ['align-items: flex-start', flexAlignItemsIcon('align-items-start')],
    ['align-items: end', flexAlignItemsIcon('align-items-end')],
    ['align-items: start', flexAlignItemsIcon('align-items-start')],
    ['align-items: self-end', flexAlignItemsIcon('align-items-end')],
    ['align-items: self-start', flexAlignItemsIcon('align-items-start')],
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
    ['align-self: start', gridAlignSelfIcon('align-self-start')],
    ['align-self: end', gridAlignSelfIcon('align-self-end')],
    ['align-self: self-start', gridAlignSelfIcon('align-self-start')],
    ['align-self: self-end', gridAlignSelfIcon('align-self-end')],
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
    ['justify-content: right', gridJustifyContentIcon('justify-content-end')],
    ['justify-content: left', gridJustifyContentIcon('justify-content-start')],
    ['justify-content: stretch', gridJustifyContentIcon('justify-content-stretch')],
    ['align-items: stretch', gridAlignItemsIcon('align-items-stretch')],
    ['align-items: end', gridAlignItemsIcon('align-items-end')],
    ['align-items: start', gridAlignItemsIcon('align-items-start')],
    ['align-items: self-end', gridAlignItemsIcon('align-items-end')],
    ['align-items: self-start', gridAlignItemsIcon('align-items-start')],
    ['align-items: center', gridAlignItemsIcon('align-items-center')],
    ['align-items: baseline', baselineIcon],
    ['justify-items: center', gridJustifyItemsIcon('justify-items-center')],
    ['justify-items: stretch', gridJustifyItemsIcon('justify-items-stretch')],
    ['justify-items: end', gridJustifyItemsIcon('justify-items-end')],
    ['justify-items: start', gridJustifyItemsIcon('justify-items-start')],
    ['justify-items: self-end', gridJustifyItemsIcon('justify-items-end')],
    ['justify-items: self-start', gridJustifyItemsIcon('justify-items-start')],
    ['justify-items: right', gridJustifyItemsIcon('justify-items-end')],
    ['justify-items: left', gridJustifyItemsIcon('justify-items-start')],
    ['justify-items: baseline', baselineIcon],
]);
const gridItemIcons = new Map([
    ['align-self: baseline', baselineIcon],
    ['align-self: center', gridAlignSelfIcon('align-self-center')],
    ['align-self: start', gridAlignSelfIcon('align-self-start')],
    ['align-self: end', gridAlignSelfIcon('align-self-end')],
    ['align-self: self-start', gridAlignSelfIcon('align-self-start')],
    ['align-self: self-end', gridAlignSelfIcon('align-self-end')],
    ['align-self: stretch', gridAlignSelfIcon('align-self-stretch')],
]);
const isFlexContainer = (computedStyles) => {
    const display = computedStyles?.get('display');
    return display === 'flex' || display === 'inline-flex';
};
const isGridContainer = (computedStyles) => {
    const display = computedStyles?.get('display');
    return display === 'grid' || display === 'inline-grid';
};
export function findIcon(text, computedStyles, parentComputedStyles) {
    if (isFlexContainer(computedStyles)) {
        const icon = findFlexContainerIcon(text, computedStyles);
        if (icon) {
            return icon;
        }
    }
    if (isFlexContainer(parentComputedStyles)) {
        const icon = findFlexItemIcon(text, parentComputedStyles);
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
        const icon = findGridItemIcon(text, parentComputedStyles);
        if (icon) {
            return icon;
        }
    }
    return null;
}
export function findFlexContainerIcon(text, computedStyles) {
    const resolver = flexContainerIcons.get(text);
    if (resolver) {
        return resolver(computedStyles || new Map());
    }
    return null;
}
export function findFlexItemIcon(text, parentComputedStyles) {
    const resolver = flexItemIcons.get(text);
    if (resolver) {
        return resolver(parentComputedStyles || new Map());
    }
    return null;
}
export function findGridContainerIcon(text, computedStyles) {
    const resolver = gridContainerIcons.get(text);
    if (resolver) {
        return resolver(computedStyles || new Map());
    }
    return null;
}
export function findGridItemIcon(text, parentComputedStyles) {
    const resolver = gridItemIcons.get(text);
    if (resolver) {
        return resolver(parentComputedStyles || new Map());
    }
    return null;
}
//# sourceMappingURL=CSSPropertyIconResolver.js.map