export function transform2js(transformString: string): TransformItem[];
export function transformsMultiply(transforms: ReadonlyArray<TransformItem>): TransformItem;
export function matrixToTransform(origMatrix: TransformItem, params: TransformParams): TransformItem[];
export function transformArc(cursor: [number, number], arc: number[], transform: ReadonlyArray<number>): number[];
export function roundTransform(transform: TransformItem, params: TransformParams): TransformItem;
export function js2transform(transformJS: ReadonlyArray<TransformItem>, params: TransformParams): string;
export type TransformItem = {
    name: string;
    data: number[];
};
export type TransformParams = {
    convertToShorts: boolean;
    degPrecision?: number | undefined;
    floatPrecision: number;
    transformPrecision: number;
    matrixToTransform: boolean;
    shortTranslate: boolean;
    shortScale: boolean;
    shortRotate: boolean;
    removeUseless: boolean;
    collapseIntoOne: boolean;
    leadingZero: boolean;
    negativeExtraSpace: boolean;
};
