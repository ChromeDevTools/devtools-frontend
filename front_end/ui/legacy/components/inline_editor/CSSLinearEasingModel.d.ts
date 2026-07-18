/**
 * Represents a point in a linear easing function graph.
 */
export interface Point {
    /**
     * The timeline percentage fraction (0 to 100).
     */
    input: number;
    /**
     * The progress value (typically between 0 and 1, but can exceed bounds for bounce/elastic effects).
     */
    output: number;
}
/**
 * Model representing a CSS `linear()` easing function, conforming to the CSS Easing Level 1 specification.
 * It parses CSS linear easing text into a list of control points and manages point mutations.
 */
export declare class CSSLinearEasingModel {
    #private;
    constructor(points: Point[]);
    static parse(text: string): CSSLinearEasingModel | null;
    addPoint(point: Point, index?: number): void;
    removePoint(index: number): void;
    /**
     * Sets the timing point at the specified index, clamping its input value (percentage)
     * to ensure it remains non-decreasing and within the bounds of neighboring points.
     *
     * @param index The index of the point to update.
     * @param point The new timing point coordinates.
     */
    setPoint(index: number, point: Point): void;
    points(): Point[];
    asCSSText(): string;
}
