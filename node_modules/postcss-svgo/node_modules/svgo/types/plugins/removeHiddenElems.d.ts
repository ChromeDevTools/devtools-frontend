export const name: "removeHiddenElems";
export const description: "removes hidden elements (zero sized, with absent attributes)";
/**
 * Remove hidden elements with disabled rendering:
 * - display="none"
 * - opacity="0"
 * - circle with zero radius
 * - ellipse with zero x-axis or y-axis radius
 * - rectangle with zero width or height
 * - pattern with zero width or height
 * - image with zero width or height
 * - path with empty data
 * - polyline with empty points
 * - polygon with empty points
 *
 * @author Kir Belevich
 *
 * @type {import('../lib/types.js').Plugin<RemoveHiddenElemsParams>}
 */
export const fn: import("../lib/types.js").Plugin<RemoveHiddenElemsParams>;
export type RemoveHiddenElemsParams = {
    isHidden?: boolean | undefined;
    displayNone?: boolean | undefined;
    opacity0?: boolean | undefined;
    circleR0?: boolean | undefined;
    ellipseRX0?: boolean | undefined;
    ellipseRY0?: boolean | undefined;
    rectWidth0?: boolean | undefined;
    rectHeight0?: boolean | undefined;
    patternWidth0?: boolean | undefined;
    patternHeight0?: boolean | undefined;
    imageWidth0?: boolean | undefined;
    imageHeight0?: boolean | undefined;
    pathEmptyD?: boolean | undefined;
    polylineEmptyPoints?: boolean | undefined;
    polygonEmptyPoints?: boolean | undefined;
};
