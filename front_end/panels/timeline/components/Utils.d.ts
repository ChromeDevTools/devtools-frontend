import * as Platform from '../../../core/platform/platform.js';
import type * as Trace from '../../../models/trace/trace.js';
import type { CompareRating } from './MetricCompareStrings.js';
export declare enum NetworkCategory {
    DOC = "Doc",
    CSS = "CSS",
    JS = "JS",
    FONT = "Font",
    IMG = "Img",
    MEDIA = "Media",
    WASM = "Wasm",
    OTHER = "Other"
}
export declare function networkResourceCategory(request: Trace.Types.Events.SyntheticNetworkRequest): NetworkCategory;
export declare function colorForNetworkCategory(category: NetworkCategory): string;
export declare function colorForNetworkRequest(request: Trace.Types.Events.SyntheticNetworkRequest): string;
export type MetricRating = 'good' | 'needs-improvement' | 'poor';
export type MetricThresholds = [number, number];
/** TODO: Consolidate our metric rating logic with the trace engine. **/
export declare const LCP_THRESHOLDS: MetricThresholds;
export declare const CLS_THRESHOLDS: MetricThresholds;
export declare const INP_THRESHOLDS: MetricThresholds;
export declare function rateMetric(value: number, thresholds: MetricThresholds): MetricRating;
/**
 * Ensure to also include `metricValueStyles.css` when generating metric value elements.
 */
export declare function renderMetricValue(jslogContext: string, value: number | undefined, thresholds: MetricThresholds, format: (value: number) => string, options?: {
    dim?: boolean;
}): HTMLElement;
export interface NumberWithUnitString {
    element: HTMLElement;
    text: string;
}
/**
 * These methods format numbers with units in a way that allows the unit portion to be styled specifically.
 * They return a text string (the usual string resulting from formatting a number), and an HTMLSpanElement.
 * The element contains the formatted number, with a nested span element for the unit portion: `.unit`.
 *
 * This formatting is locale-aware. This is accomplished by utilizing the fact that UIStrings passthru
 * markdown link syntax: `[text that will be translated](not translated)`. The result
 * is a translated string like this: `[t̂éx̂t́ t̂h́ât́ ŵíl̂ĺ b̂é t̂ŕâńŝĺât́êd́](not translated)`. This is used within
 * insight components to localize markdown content. But here, we utilize it to parse a localized string.
 *
 * If the parsing fails, we fallback to i18n.TimeUtilities, and there will be no `.unit` element.
 *
 * As of this writing, our only locale where the unit comes before the number is `sw`, ex: `Sek {PH1}`.
 *
 * new Intl.NumberFormat('sw', {
 * style: 'unit',
 * unit: 'millisecond',
 * unitDisplay: 'narrow'
 * }).format(10); // 'ms 10'
 *
 */
export declare namespace NumberWithUnit {
    function parse(text: string): {
        firstPart: string;
        unitPart: string;
        lastPart: string;
    } | null;
    function formatMicroSecondsAsSeconds(time: Platform.Timing.MicroSeconds): NumberWithUnitString;
    function formatMicroSecondsAsMillisFixed(time: Platform.Timing.MicroSeconds, fractionDigits?: number): NumberWithUnitString;
}
/**
 * Returns if the local value is better/worse/similar compared to field.
 */
export declare function determineCompareRating(metric: 'LCP' | 'CLS' | 'INP', localValue: Trace.Types.Timing.Milli | number, fieldValue: Trace.Types.Timing.Milli | number): CompareRating | undefined;
