import type { ReportOpts } from '../types.js';
export declare const checkSoftNavsEnabled: (opts?: ReportOpts) => boolean | undefined;
export declare const storeSoftNavEntry: (map: Map<number, PerformanceSoftNavigation>, entry: PerformanceSoftNavigation) => void;
