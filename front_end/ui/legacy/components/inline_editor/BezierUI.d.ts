import * as Geometry from '../../../../models/geometry/geometry.js';
interface Params {
    width: number;
    height: number;
    marginTop: number;
    controlPointRadius: number;
    shouldDrawLine: boolean;
}
export declare class BezierUI {
    width: number;
    height: number;
    marginTop: number;
    radius: number;
    shouldDrawLine: boolean;
    constructor({ width, height, marginTop, controlPointRadius, shouldDrawLine }: Params);
    static drawVelocityChart(bezier: Geometry.CubicBezier, path: Element, width: number): void;
    curveWidth(): number;
    curveHeight(): number;
    private drawLine;
    private drawControlPoints;
    drawCurve(bezier: Geometry.CubicBezier | null, svg: Element): void;
}
export declare const Height = 26;
export {};
