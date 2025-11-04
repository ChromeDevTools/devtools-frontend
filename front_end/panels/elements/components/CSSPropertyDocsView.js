// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-lit-render-outside-of-view */
import '../../../ui/legacy/legacy.js';
import * as Common from '../../../core/common/common.js';
import * as i18n from '../../../core/i18n/i18n.js';
import { html, nothing, render } from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';
import CSSPropertyDocsViewStyles from './cssPropertyDocsView.css.js';
const UIStrings = {
    /**
     * @description Text for button that redirects to CSS property documentation.
     */
    learnMore: 'Learn more',
    /**
     * @description Text for a checkbox to turn off the CSS property documentation.
     */
    dontShow: 'Don\'t show',
    /**
     * @description Text indicating that the CSS property has limited availability across major browsers.
     */
    limitedAvailability: 'Limited availability across major browsers',
    /**
     * @description Text indicating that the CSS property has limited availability across major browsers, with a list of unsupported browsers.
     * @example {Firefox} PH1
     * @example {Safari on iOS} PH1
     * @example {Chrome, Firefox on Android, or Safari} PH1
     */
    limitedAvailabilityInBrowsers: 'Limited availability across major browsers (not fully implemented in {PH1})',
    /**
     * @description Text to display a combination of browser name and platform name.
     * @example {Safari} PH1
     * @example {iOS} PH2
     */
    browserOnPlatform: '{PH1} on {PH2}',
    /**
     * @description Text indicating that the CSS property is newly available across major browsers since a certain time.
     * @example {September 2015} PH1
     */
    newlyAvailableSince: 'Newly available across major browsers (`Baseline` since {PH1})',
    /**
     * @description Text indicating that the CSS property is widely available across major browsers since a certain time.
     * @example {September 2015} PH1
     * @example {an unknown date} PH1
     */
    widelyAvailableSince: 'Widely available across major browsers (`Baseline` since {PH1})',
    /**
     * @description Text indicating that a specific date is not known.
     */
    unknownDate: 'an unknown date',
};
const str_ = i18n.i18n.registerUIStrings('panels/elements/components/CSSPropertyDocsView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const BASELINE_HIGH_AVAILABILITY_ICON = '../../../Images/baseline-high-availability.svg';
const BASELINE_LOW_AVAILABILITY_ICON = '../../../Images/baseline-low-availability.svg';
const BASELINE_LIMITED_AVAILABILITY_ICON = '../../../Images/baseline-limited-availability.svg';
const getBaselineIconPath = (baseline) => {
    let relativePath;
    switch (baseline.status) {
        case "high" /* BaselineStatus.HIGH */:
            relativePath = BASELINE_HIGH_AVAILABILITY_ICON;
            break;
        case "low" /* BaselineStatus.LOW */:
            relativePath = BASELINE_LOW_AVAILABILITY_ICON;
            break;
        default:
            relativePath = BASELINE_LIMITED_AVAILABILITY_ICON;
    }
    return new URL(relativePath, import.meta.url).toString();
};
const allBrowserIds = new Set(["C" /* BrowserId.C */, "CA" /* BrowserId.CA */, "E" /* BrowserId.E */, "FF" /* BrowserId.FF */, "FFA" /* BrowserId.FFA */, "S" /* BrowserId.S */, "SM" /* BrowserId.SM */]);
const browserIdToNameAndPlatform = new Map([
    ["C" /* BrowserId.C */, { name: 'Chrome', platform: "desktop" /* BrowserPlatform.DESKTOP */ }],
    ["CA" /* BrowserId.CA */, { name: 'Chrome', platform: "Android" /* BrowserPlatform.ANDROID */ }],
    ["E" /* BrowserId.E */, { name: 'Edge', platform: "desktop" /* BrowserPlatform.DESKTOP */ }],
    ["FF" /* BrowserId.FF */, { name: 'Firefox', platform: "desktop" /* BrowserPlatform.DESKTOP */ }],
    ["FFA" /* BrowserId.FFA */, { name: 'Firefox', platform: "Android" /* BrowserPlatform.ANDROID */ }],
    ["S" /* BrowserId.S */, { name: 'Safari', platform: "macOS" /* BrowserPlatform.MACOS */ }],
    ["SM" /* BrowserId.SM */, { name: 'Safari', platform: "iOS" /* BrowserPlatform.IOS */ }],
]);
function formatBrowserList(browserNames) {
    const formatter = new Intl.ListFormat(i18n.DevToolsLocale.DevToolsLocale.instance().locale, {
        style: 'long',
        type: 'disjunction',
    });
    return formatter.format(browserNames.entries().map(([name, platforms]) => platforms.length !== 1 || platforms[0] === "desktop" /* BrowserPlatform.DESKTOP */ ?
        name :
        i18nString(UIStrings.browserOnPlatform, { PH1: name, PH2: platforms[0] })));
}
const formatBaselineDate = (date) => {
    if (!date) {
        return i18nString(UIStrings.unknownDate);
    }
    const parsedDate = new Date(date);
    const formatter = new Intl.DateTimeFormat(i18n.DevToolsLocale.DevToolsLocale.instance().locale, {
        month: 'long',
        year: 'numeric',
    });
    return formatter.format(parsedDate);
};
const getBaselineMissingBrowsers = (browsers) => {
    const browserIds = browsers.map(v => v.replace(/\d*$/, ''));
    const missingBrowserIds = allBrowserIds.difference(new Set(browserIds));
    const missingBrowsers = new Map();
    for (const id of missingBrowserIds) {
        const browserInfo = browserIdToNameAndPlatform.get(id);
        if (browserInfo) {
            const { name, platform } = browserInfo;
            missingBrowsers.set(name, [...(missingBrowsers.get(name) ?? []), platform]);
        }
    }
    return missingBrowsers;
};
const getBaselineText = (baseline, browsers) => {
    if (baseline.status === "false" /* BaselineStatus.LIMITED */) {
        const missingBrowsers = browsers && getBaselineMissingBrowsers(browsers);
        if (missingBrowsers) {
            return i18nString(UIStrings.limitedAvailabilityInBrowsers, { PH1: formatBrowserList(missingBrowsers) });
        }
        return i18nString(UIStrings.limitedAvailability);
    }
    if (baseline.status === "low" /* BaselineStatus.LOW */) {
        return i18nString(UIStrings.newlyAvailableSince, { PH1: formatBaselineDate(baseline.baseline_low_date) });
    }
    return i18nString(UIStrings.widelyAvailableSince, { PH1: formatBaselineDate(baseline.baseline_high_date) });
};
export class CSSPropertyDocsView extends HTMLElement {
    #shadow = this.attachShadow({ mode: 'open' });
    #cssProperty;
    constructor(cssProperty) {
        super();
        this.#cssProperty = cssProperty;
        this.#render();
    }
    #dontShowChanged(e) {
        const showDocumentation = !e.target.checked;
        Common.Settings.Settings.instance()
            .moduleSetting('show-css-property-documentation-on-hover')
            .set(showDocumentation);
    }
    #render() {
        const { description, references, baseline, browsers } = this.#cssProperty;
        const link = references?.[0].url;
        // Disabled until https://crbug.com/1079231 is fixed.
        // clang-format off
        render(html `
      <style>${CSSPropertyDocsViewStyles}</style>
      <div class="docs-popup-wrapper">
        ${description ? html `
          <div id="description">
            ${description}
          </div>
        ` : nothing}
        ${baseline ? html `
          <div id="baseline" class="docs-popup-section">
            <img
              id="baseline-icon"
              src=${getBaselineIconPath(baseline)}
              role="presentation"
            >
            <span>
              ${getBaselineText(baseline, browsers)}
            </span>
          </div>
        ` : nothing}
        ${link ? html `
          <div class="docs-popup-section footer">
            <x-link
              id="learn-more"
              href=${link}
              class="clickable underlined unbreakable-text"
            >
              ${i18nString(UIStrings.learnMore)}
            </x-link>
            <devtools-checkbox
              @change=${this.#dontShowChanged}
              jslog=${VisualLogging.toggle('css-property-doc').track({ change: true })}>
              ${i18nString(UIStrings.dontShow)}
            </devtools-checkbox>
          </div>
        ` : nothing}
      </div>
    `, this.#shadow, {
            host: this,
        });
        // clang-format on
    }
}
customElements.define('devtools-css-property-docs-view', CSSPropertyDocsView);
//# sourceMappingURL=CSSPropertyDocsView.js.map