import type { MetricRating } from './Utils.js';
export type CompareRating = 'better' | 'worse' | 'similar';
export declare function renderCompareText(options: {
    metric: string;
    rating: MetricRating;
    localValue: Element;
    compare?: CompareRating;
}): Element;
export declare function renderDetailedCompareText(options: {
    metric: string;
    localRating: MetricRating;
    localValue: Element;
    percent: string;
    fieldValue: Element;
    fieldRating?: MetricRating;
}): Element;
