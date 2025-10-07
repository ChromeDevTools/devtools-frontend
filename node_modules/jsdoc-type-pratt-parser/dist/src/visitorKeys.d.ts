import type { NonRootResult } from './result/NonRootResult.js';
export type VisitorKeys = {
    [P in NonRootResult as P['type']]: Array<keyof P>;
};
export declare const visitorKeys: VisitorKeys;
