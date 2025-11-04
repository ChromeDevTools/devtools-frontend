export interface Point {
    input: number;
    output: number;
}
export declare class CSSLinearEasingModel {
    #private;
    constructor(points: Point[]);
    static parse(text: string): CSSLinearEasingModel | null;
    addPoint(point: Point, index?: number): void;
    removePoint(index: number): void;
    setPoint(index: number, point: Point): void;
    points(): Point[];
    asCSSText(): string;
}
