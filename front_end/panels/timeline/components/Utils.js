// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import * as i18n from '../../../core/i18n/i18n.js';
import * as Platform from '../../../core/platform/platform.js';
import * as ThemeSupport from '../../../ui/legacy/theme_support/theme_support.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';
const UIStrings = {
    /**
     * @description ms is the short form of milli-seconds and the placeholder is a decimal number.
     * The shortest form or abbreviation of milliseconds should be used, as there is
     * limited room in this UI.
     * @example {2.14} PH1
     */
    fms: '{PH1}[ms]()',
    /**
     * @description s is short for seconds and the placeholder is a decimal number
     * The shortest form or abbreviation of seconds should be used, as there is
     * limited room in this UI.
     * @example {2.14} PH1
     */
    fs: '{PH1}[s]()',
};
const str_ = i18n.i18n.registerUIStrings('panels/timeline/components/Utils.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export var NetworkCategory;
(function (NetworkCategory) {
    NetworkCategory["DOC"] = "Doc";
    NetworkCategory["CSS"] = "CSS";
    NetworkCategory["JS"] = "JS";
    NetworkCategory["FONT"] = "Font";
    NetworkCategory["IMG"] = "Img";
    NetworkCategory["MEDIA"] = "Media";
    NetworkCategory["WASM"] = "Wasm";
    NetworkCategory["OTHER"] = "Other";
})(NetworkCategory || (NetworkCategory = {}));
export function networkResourceCategory(request) {
    const { mimeType } = request.args.data;
    switch (request.args.data.resourceType) {
        case "Document" /* Protocol.Network.ResourceType.Document */:
            return NetworkCategory.DOC;
        case "Stylesheet" /* Protocol.Network.ResourceType.Stylesheet */:
            return NetworkCategory.CSS;
        case "Image" /* Protocol.Network.ResourceType.Image */:
            return NetworkCategory.IMG;
        case "Media" /* Protocol.Network.ResourceType.Media */:
            return NetworkCategory.MEDIA;
        case "Font" /* Protocol.Network.ResourceType.Font */:
            return NetworkCategory.FONT;
        case "Script" /* Protocol.Network.ResourceType.Script */:
        case "WebSocket" /* Protocol.Network.ResourceType.WebSocket */:
            return NetworkCategory.JS;
        default:
            // FWIW, all the other (current) resourceTypes are:
            //     TextTrack, XHR, Fetch, Prefetch, EventSource, Manifest, SignedExchange, Ping, CSPViolationReport, Preflight, Other
            // Traces before Feb 2024 don't have `resourceType`.
            // We'll keep mimeType logic for a couple years to avoid grey network requests for last year's traces.
            return mimeType === undefined ? NetworkCategory.OTHER :
                mimeType.endsWith('/css') ? NetworkCategory.CSS :
                    mimeType.endsWith('javascript') ? NetworkCategory.JS :
                        mimeType.startsWith('image/') ? NetworkCategory.IMG :
                            mimeType.startsWith('audio/') || mimeType.startsWith('video/') ? NetworkCategory.MEDIA :
                                mimeType.startsWith('font/') || mimeType.includes('font-') ? NetworkCategory.FONT :
                                    mimeType === 'application/wasm' ? NetworkCategory.WASM :
                                        mimeType.startsWith('text/') ? NetworkCategory.DOC :
                                            // Ultimate fallback:
                                            NetworkCategory.OTHER;
    }
}
export function colorForNetworkCategory(category) {
    // TODO: These should align with `baseResourceTypeColors` from `NetworkWaterfallColumn`.
    let cssVarName = '--app-color-system';
    switch (category) {
        case NetworkCategory.DOC:
            cssVarName = '--app-color-doc';
            break;
        case NetworkCategory.JS:
            cssVarName = '--app-color-scripting';
            break;
        case NetworkCategory.CSS:
            cssVarName = '--app-color-css';
            break;
        case NetworkCategory.IMG:
            cssVarName = '--app-color-image';
            break;
        case NetworkCategory.MEDIA:
            cssVarName = '--app-color-media';
            break;
        case NetworkCategory.FONT:
            cssVarName = '--app-color-font';
            break;
        case NetworkCategory.WASM:
            cssVarName = '--app-color-wasm';
            break;
        case NetworkCategory.OTHER:
        default:
            cssVarName = '--app-color-system';
            break;
    }
    return ThemeSupport.ThemeSupport.instance().getComputedValue(cssVarName);
}
export function colorForNetworkRequest(request) {
    const category = networkResourceCategory(request);
    return colorForNetworkCategory(category);
}
/** TODO: Consolidate our metric rating logic with the trace engine. **/
export const LCP_THRESHOLDS = [2500, 4000];
export const CLS_THRESHOLDS = [0.1, 0.25];
export const INP_THRESHOLDS = [200, 500];
export function rateMetric(value, thresholds) {
    if (value <= thresholds[0]) {
        return 'good';
    }
    if (value <= thresholds[1]) {
        return 'needs-improvement';
    }
    return 'poor';
}
/**
 * Ensure to also include `metricValueStyles.css` when generating metric value elements.
 */
export function renderMetricValue(jslogContext, value, thresholds, format, options) {
    const metricValueEl = document.createElement('span');
    metricValueEl.classList.add('metric-value');
    if (value === undefined) {
        metricValueEl.classList.add('waiting');
        metricValueEl.textContent = '-';
        return metricValueEl;
    }
    metricValueEl.textContent = format(value);
    const rating = rateMetric(value, thresholds);
    metricValueEl.classList.add(rating);
    // Ensure we log impressions of each section. We purposefully add this here
    // because if we don't have field data (dealt with in the undefined branch
    // above), we do not want to log an impression on it.
    metricValueEl.setAttribute('jslog', `${VisualLogging.section(jslogContext)}`);
    if (options?.dim) {
        metricValueEl.classList.add('dim');
    }
    return metricValueEl;
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
export var NumberWithUnit;
(function (NumberWithUnit) {
    function parse(text) {
        const startBracket = text.indexOf('[');
        const endBracket = startBracket !== -1 && text.indexOf(']', startBracket);
        const startParen = endBracket && text.indexOf('(', endBracket);
        const endParen = startParen && text.indexOf(')', startParen);
        if (!endParen || endParen === -1) {
            return null;
        }
        const firstPart = text.substring(0, startBracket);
        const unitPart = text.substring(startBracket + 1, endBracket);
        const lastPart = text.substring(endParen + 1); // skips `]()`
        return { firstPart, unitPart, lastPart };
    }
    NumberWithUnit.parse = parse;
    function formatMicroSecondsAsSeconds(time) {
        const element = document.createElement('span');
        element.classList.add('number-with-unit');
        const milliseconds = Platform.Timing.microSecondsToMilliSeconds(time);
        const seconds = Platform.Timing.milliSecondsToSeconds(milliseconds);
        const text = i18nString(UIStrings.fs, { PH1: (seconds).toFixed(2) });
        const result = parse(text);
        if (!result) {
            // Some sort of problem with parsing, so fallback to not marking up the unit.
            element.textContent = i18n.TimeUtilities.formatMicroSecondsAsSeconds(time);
            return { text, element };
        }
        const { firstPart, unitPart, lastPart } = result;
        if (firstPart) {
            element.append(firstPart);
        }
        element.createChild('span', 'unit').textContent = unitPart;
        if (lastPart) {
            element.append(lastPart);
        }
        return { text: element.textContent ?? '', element };
    }
    NumberWithUnit.formatMicroSecondsAsSeconds = formatMicroSecondsAsSeconds;
    function formatMicroSecondsAsMillisFixed(time, fractionDigits = 0) {
        const element = document.createElement('span');
        element.classList.add('number-with-unit');
        const milliseconds = Platform.Timing.microSecondsToMilliSeconds(time);
        const text = i18nString(UIStrings.fms, { PH1: (milliseconds).toFixed(fractionDigits) });
        const result = parse(text);
        if (!result) {
            // Some sort of problem with parsing, so fallback to not marking up the unit.
            element.textContent = i18n.TimeUtilities.formatMicroSecondsAsMillisFixed(time);
            return { text, element };
        }
        const { firstPart, unitPart, lastPart } = result;
        if (firstPart) {
            element.append(firstPart);
        }
        element.createChild('span', 'unit').textContent = unitPart;
        if (lastPart) {
            element.append(lastPart);
        }
        return { text: element.textContent ?? '', element };
    }
    NumberWithUnit.formatMicroSecondsAsMillisFixed = formatMicroSecondsAsMillisFixed;
})(NumberWithUnit || (NumberWithUnit = {}));
/**
 * Returns if the local value is better/worse/similar compared to field.
 */
export function determineCompareRating(metric, localValue, fieldValue) {
    let thresholds;
    let compareThreshold;
    switch (metric) {
        case 'LCP':
            thresholds = LCP_THRESHOLDS;
            compareThreshold = 1000;
            break;
        case 'CLS':
            thresholds = CLS_THRESHOLDS;
            compareThreshold = 0.1;
            break;
        case 'INP':
            thresholds = INP_THRESHOLDS;
            compareThreshold = 200;
            break;
        default:
            Platform.assertNever(metric, `Unknown metric: ${metric}`);
    }
    const localRating = rateMetric(localValue, thresholds);
    const fieldRating = rateMetric(fieldValue, thresholds);
    // It's not worth highlighting a significant difference when both #s
    // are rated "good"
    if (localRating === 'good' && fieldRating === 'good') {
        return 'similar';
    }
    if (localValue - fieldValue > compareThreshold) {
        return 'worse';
    }
    if (fieldValue - localValue > compareThreshold) {
        return 'better';
    }
    return 'similar';
}
//# sourceMappingURL=Utils.js.map