// Copyright 2017 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../../ui/components/highlighting/highlighting.js';
import '../../ui/legacy/components/data_grid/data_grid.js';
import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as UI from '../../ui/legacy/legacy.js';
import { Directives, html, nothing, render } from '../../ui/lit/lit.js';
import coverageListViewStyles from './coverageListView.css.js';
const UIStrings = {
    /**
     * @description Text that appears on a button for the css resource type filter.
     */
    css: 'CSS',
    /**
     * @description Text in Coverage List View of the Coverage tab
     */
    jsPerFunction: 'JS (per function)',
    /**
     * @description Text in Coverage List View of the Coverage tab
     */
    jsPerBlock: 'JS (per block)',
    /**
     * @description Text for web URLs
     */
    url: 'URL',
    /**
     * @description Text that refers to some types
     */
    type: 'Type',
    /**
     * @description Text in Coverage List View of the Coverage tab
     */
    totalBytes: 'Total Bytes',
    /**
     * @description Text in Coverage List View of the Coverage tab
     */
    unusedBytes: 'Unused Bytes',
    /**
     * @description Text in the Coverage List View of the Coverage Tab
     */
    usageVisualization: 'Usage Visualization',
    /**
     * @description Data grid name for Coverage data grids
     */
    codeCoverage: 'Code Coverage',
    /**
     * @description Cell title in Coverage List View of the Coverage tab. The coverage tool tells
     *developers which functions (logical groups of lines of code) were actually run/executed. If a
     *function does get run, then it is marked in the UI to indicate that it was covered.
     */
    jsCoverageWithPerFunction: 'JS coverage with per function granularity: Once a function was executed, the whole function is marked as covered.',
    /**
     * @description Cell title in Coverage List View of the Coverage tab. The coverage tool tells
     *developers which blocks (logical groups of lines of code, smaller than a function) were actually
     *run/executed. If a block does get run, then it is marked in the UI to indicate that it was
     *covered.
     */
    jsCoverageWithPerBlock: 'JS coverage with per block granularity: Once a block of JavaScript was executed, that block is marked as covered.',
    /**
     * @description Accessible text for the value in bytes in memory allocation or coverage view.
     */
    sBytes: '{n, plural, =1 {# byte} other {# bytes}}',
    /**
     * @description Accessible text for the unused bytes column in the coverage tool that describes the total unused bytes and percentage of the file unused.
     * @example {88%} percentage
     */
    sBytesS: '{n, plural, =1 {# byte, {percentage}} other {# bytes, {percentage}}}',
    /**
     * @description Tooltip text for the bar in the coverage list view of the coverage tool that illustrates the relation between used and unused bytes.
     * @example {1000} PH1
     * @example {12.34} PH2
     */
    sBytesSBelongToFunctionsThatHave: '{PH1} bytes ({PH2}) belong to functions that have not (yet) been executed.',
    /**
     * @description Tooltip text for the bar in the coverage list view of the coverage tool that illustrates the relation between used and unused bytes.
     * @example {1000} PH1
     * @example {12.34} PH2
     */
    sBytesSBelongToBlocksOf: '{PH1} bytes ({PH2}) belong to blocks of JavaScript that have not (yet) been executed.',
    /**
     * @description Message in Coverage View of the Coverage tab
     * @example {1000} PH1
     * @example {12.34} PH2
     */
    sBytesSBelongToFunctionsThatHaveExecuted: '{PH1} bytes ({PH2}) belong to functions that have executed at least once.',
    /**
     * @description Message in Coverage View of the Coverage tab
     * @example {1000} PH1
     * @example {12.34} PH2
     */
    sBytesSBelongToBlocksOfJavascript: '{PH1} bytes ({PH2}) belong to blocks of JavaScript that have executed at least once.',
    /**
     * @description Accessible text for the visualization column of coverage tool. Contains percentage of unused bytes to used bytes.
     * @example {12.3} PH1
     * @example {12.3} PH2
     */
    sOfFileUnusedSOfFileUsed: '{PH1} % of file unused, {PH2} % of file used',
};
const str_ = i18n.i18n.registerUIStrings('panels/coverage/CoverageListView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const { styleMap, repeat } = Directives;
export function coverageTypeToString(type) {
    const types = [];
    if (type & 1 /* CoverageType.CSS */) {
        types.push(i18nString(UIStrings.css));
    }
    if (type & 4 /* CoverageType.JAVA_SCRIPT_PER_FUNCTION */) {
        types.push(i18nString(UIStrings.jsPerFunction));
    }
    else if (type & 2 /* CoverageType.JAVA_SCRIPT */) {
        types.push(i18nString(UIStrings.jsPerBlock));
    }
    return types.join('+');
}
const formatBytes = (value) => {
    return getBytesFormatter().format(value ?? 0);
};
const formatPercent = (value) => {
    return getPercentageFormatter().format(value ?? 0);
};
export const DEFAULT_VIEW = (input, _output, target) => {
    // clang-format off
    render(html `
    <style>${coverageListViewStyles}</style>
    <devtools-data-grid class="flex-auto" name=${i18nString(UIStrings.codeCoverage)} striped autofocus resize="last"
      .template=${html `
        <table>
          <tr>
            <th id="url" width="250px" weight="3" sortable>${i18nString(UIStrings.url)}</th>
            <th id="type" width="45px" weight="1" fixed sortable>${i18nString(UIStrings.type)}</th>
            <th id="size" width="60px" align="right" weight="1" fixed sortable>${i18nString(UIStrings.totalBytes)}</th>
            <th id="unused-size" width="100px" align="right" weight="1" fixed sortable sort="descending">${i18nString(UIStrings.unusedBytes)}</th>
            <th id="bars" width="250px" weight="1" sortable>${i18nString(UIStrings.usageVisualization)}</th>
          </tr>
          ${repeat(input.items, info => info.url, info => renderItem(info, input))}
        </table>`}>
      </devtools-data-grid>`, target);
    // clang-format on
};
export class CoverageListView extends UI.Widget.VBox {
    #highlightRegExp;
    #coverageInfo = [];
    #selectedUrl = null;
    #maxSize = 0;
    #view;
    constructor(element, view = DEFAULT_VIEW) {
        super(element, { useShadowDom: true, delegatesFocus: true });
        this.#view = view;
        this.#highlightRegExp = null;
    }
    set highlightRegExp(highlightRegExp) {
        this.#highlightRegExp = highlightRegExp;
        this.requestUpdate();
    }
    get highlightRegExp() {
        return this.#highlightRegExp;
    }
    set coverageInfo(coverageInfo) {
        this.#coverageInfo = coverageInfo;
        this.#maxSize = coverageInfo.reduce((acc, entry) => Math.max(acc, entry.size), 0);
        this.requestUpdate();
    }
    get coverageInfo() {
        return this.#coverageInfo;
    }
    performUpdate() {
        const input = {
            items: this.#coverageInfo,
            selectedUrl: this.#selectedUrl,
            maxSize: this.#maxSize,
            onOpen: (url) => {
                this.selectedUrl = url;
            },
            highlightRegExp: this.#highlightRegExp,
        };
        this.#view(input, {}, this.contentElement);
    }
    reset() {
        this.#coverageInfo = [];
        this.#maxSize = 0;
        this.requestUpdate();
    }
    set selectedUrl(url) {
        const info = this.#coverageInfo.find(info => info.url === url);
        if (!info) {
            return;
        }
        if (this.#selectedUrl !== url) {
            this.#selectedUrl = url;
            this.requestUpdate();
        }
        const sourceCode = url ? Workspace.Workspace.WorkspaceImpl.instance().uiSourceCodeForURL(url) : null;
        if (!sourceCode) {
            return;
        }
        void Common.Revealer.reveal(sourceCode);
    }
    get selectedUrl() {
        return this.#selectedUrl;
    }
}
let percentageFormatter = null;
function getPercentageFormatter() {
    if (!percentageFormatter) {
        percentageFormatter = new Intl.NumberFormat(i18n.DevToolsLocale.DevToolsLocale.instance().locale, {
            style: 'percent',
            maximumFractionDigits: 1,
        });
    }
    return percentageFormatter;
}
let bytesFormatter = null;
function getBytesFormatter() {
    if (!bytesFormatter) {
        bytesFormatter = new Intl.NumberFormat(i18n.DevToolsLocale.DevToolsLocale.instance().locale);
    }
    return bytesFormatter;
}
function renderItem(info, input) {
    function highlightRange(textContent) {
        const matches = input.highlightRegExp?.exec(textContent);
        return matches?.length ? `${matches.index},${matches[0].length}` : '';
    }
    const splitURL = /^(.*)(\/[^/]*)$/.exec(info.url);
    // clang-format off
    return html `
    <style>${coverageListViewStyles}</style>
    <tr data-url=${info.url} selected=${info.url === input.selectedUrl}
        @open=${() => input.onOpen(info.url)}>
      <td data-value=${info.url} title=${info.url} aria-label=${info.url}>
        <devtools-highlight ranges=${highlightRange(info.url)} class="url-outer" aria-hidden="true">
          <div class="url-prefix">${splitURL ? splitURL[1] : info.url}</div>
          <div class="url-suffix">${splitURL ? splitURL[2] : ''}</div>
        </devtools-highlight>
      </td>
      <td data-value=${coverageTypeToString(info.type)}
          title=${info.type & 4 /* CoverageType.JAVA_SCRIPT_PER_FUNCTION */ ? i18nString(UIStrings.jsCoverageWithPerFunction) :
        info.type & 2 /* CoverageType.JAVA_SCRIPT */ ? i18nString(UIStrings.jsCoverageWithPerBlock) :
            ''}>
        ${coverageTypeToString(info.type)}
      </td>
      <td data-value=${info.size} aria-label=${i18nString(UIStrings.sBytes, { n: info.size || 0 })}>
        <span>${formatBytes(info.size)}</span>
      </td>
      <td data-value=${info.unusedSize} aria-label=${i18nString(UIStrings.sBytesS, { n: info.unusedSize, percentage: formatPercent(info.unusedPercentage) })}>
        <span>${formatBytes(info.unusedSize)}</span>
        <span class="percent-value">
          ${formatPercent(info.unusedPercentage)}
        </span>
      </td>
      <td data-value=${info.unusedSize} aria-label=${i18nString(UIStrings.sOfFileUnusedSOfFileUsed, { PH1: formatPercent(info.unusedPercentage), PH2: formatPercent(info.usedPercentage) })}>
        <div class="bar-container">
          ${info.unusedSize > 0 ? html `
            <div class="bar bar-unused-size"
                title=${info.type & 4 /* CoverageType.JAVA_SCRIPT_PER_FUNCTION */ ? i18nString(UIStrings.sBytesSBelongToFunctionsThatHave, { PH1: info.unusedSize, PH2: formatPercent(info.unusedPercentage) }) :
        info.type & 2 /* CoverageType.JAVA_SCRIPT */ ? i18nString(UIStrings.sBytesSBelongToBlocksOf, { PH1: info.unusedSize, PH2: formatPercent(info.unusedPercentage) }) :
            ''}
                  style=${styleMap({ width: ((info.unusedSize / input.maxSize) * 100 || 0) + '%' })}>
            </div>` : nothing}
          ${info.usedSize > 0 ? html `
            <div class="bar bar-used-size"
                  title=${info.type & 4 /* CoverageType.JAVA_SCRIPT_PER_FUNCTION */ ? i18nString(UIStrings.sBytesSBelongToFunctionsThatHaveExecuted, { PH1: info.usedSize, PH2: formatPercent(info.usedPercentage) }) :
        info.type & 2 /* CoverageType.JAVA_SCRIPT */ ? i18nString(UIStrings.sBytesSBelongToBlocksOfJavascript, { PH1: info.usedSize, PH2: formatPercent(info.usedPercentage) }) :
            ''}
                style=${styleMap({ width: ((info.usedSize / input.maxSize) * 100 || 0) + '%' })}>
            </div>` : nothing}
        </div>
      </td>
      ${info.sources.length > 0 ? html `
        <td><table>
          ${repeat(info.sources, source => source.url, source => renderItem(source, input))}
        </table></td>` : nothing}
    </tr>`;
    // clang-format on
}
//# sourceMappingURL=CoverageListView.js.map