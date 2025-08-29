// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable rulesdir/no-lit-render-outside-of-view */

import '../../../ui/legacy/legacy.js';

import * as Common from '../../../core/common/common.js';
import * as i18n from '../../../core/i18n/i18n.js';
import type * as Platform from '../../../core/platform/platform.js';
import {html, nothing, render} from '../../../ui/lit/lit.js';
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
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/elements/components/CSSPropertyDocsView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

const BASELINE_HIGH_AVAILABILITY_ICON =
    '../../../Images/baseline-high-availability.svg' as Platform.DevToolsPath.RawPathString;
const BASELINE_LOW_AVAILABILITY_ICON =
    '../../../Images/baseline-low-availability.svg' as Platform.DevToolsPath.RawPathString;
const BASELINE_LIMITED_AVAILABILITY_ICON =
    '../../../Images/baseline-limited-availability.svg' as Platform.DevToolsPath.RawPathString;

const getBaselineIconPath = (baseline: Baseline): Platform.DevToolsPath.UrlString => {
  let relativePath: string;
  switch (baseline.status) {
    case BaselineStatus.HIGH:
      relativePath = BASELINE_HIGH_AVAILABILITY_ICON;
      break;
    case BaselineStatus.LOW:
      relativePath = BASELINE_LOW_AVAILABILITY_ICON;
      break;
    default:
      relativePath = BASELINE_LIMITED_AVAILABILITY_ICON;
  }
  return new URL(relativePath, import.meta.url).toString() as Platform.DevToolsPath.UrlString;
};

const enum BrowserId {
  C = 'C',
  CA = 'CA',
  E = 'E',
  FF = 'FF',
  FFA = 'FFA',
  S = 'S',
  SM = 'SM',
}
const allBrowserIds = new Set<BrowserId>(
    [BrowserId.C, BrowserId.CA, BrowserId.E, BrowserId.FF, BrowserId.FFA, BrowserId.S, BrowserId.SM]);
const enum BrowserPlatform {
  DESKTOP = 'desktop',
  ANDROID = 'Android',
  MACOS = 'macOS',
  IOS = 'iOS',
}
const browserIdToNameAndPlatform = new Map([
  [BrowserId.C, {name: 'Chrome', platform: BrowserPlatform.DESKTOP}],
  [BrowserId.CA, {name: 'Chrome', platform: BrowserPlatform.ANDROID}],
  [BrowserId.E, {name: 'Edge', platform: BrowserPlatform.DESKTOP}],
  [BrowserId.FF, {name: 'Firefox', platform: BrowserPlatform.DESKTOP}],
  [BrowserId.FFA, {name: 'Firefox', platform: BrowserPlatform.ANDROID}],
  [BrowserId.S, {name: 'Safari', platform: BrowserPlatform.MACOS}],
  [BrowserId.SM, {name: 'Safari', platform: BrowserPlatform.IOS}],
]);

function formatBrowserList(browserNames: Map<string, BrowserPlatform[]>): string {
  const formatter = new Intl.ListFormat(i18n.DevToolsLocale.DevToolsLocale.instance().locale, {
    style: 'long',
    type: 'disjunction',
  });
  return formatter.format(browserNames.entries().map(
      ([name, platforms]) => platforms.length !== 1 || platforms[0] === BrowserPlatform.DESKTOP ?
          name :
          i18nString(UIStrings.browserOnPlatform, {PH1: name, PH2: platforms[0]})));
}

const formatBaselineDate = (date?: string): string => {
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

const getBaselineMissingBrowsers = (browsers: string[]): Map<string, BrowserPlatform[]> => {
  const browserIds = browsers.map(v => v.replace(/\d*$/, ''));
  const missingBrowserIds = allBrowserIds.difference(new Set(browserIds));
  const missingBrowsers = new Map();
  for (const id of missingBrowserIds) {
    const browserInfo = browserIdToNameAndPlatform.get(id);
    if (browserInfo) {
      const {name, platform} = browserInfo;
      missingBrowsers.set(name, [...(missingBrowsers.get(name) ?? []), platform]);
    }
  }
  return missingBrowsers;
};

const getBaselineText = (baseline: Baseline, browsers?: string[]): string => {
  if (baseline.status === BaselineStatus.LIMITED) {
    const missingBrowsers = browsers && getBaselineMissingBrowsers(browsers);
    if (missingBrowsers) {
      return i18nString(UIStrings.limitedAvailabilityInBrowsers, {PH1: formatBrowserList(missingBrowsers)});
    }
    return i18nString(UIStrings.limitedAvailability);
  }

  if (baseline.status === BaselineStatus.LOW) {
    return i18nString(UIStrings.newlyAvailableSince, {PH1: formatBaselineDate(baseline.baseline_low_date)});
  }
  return i18nString(UIStrings.widelyAvailableSince, {PH1: formatBaselineDate(baseline.baseline_high_date)});
};

export const enum BaselineStatus {
  LIMITED = 'false',
  LOW = 'low',
  HIGH = 'high',
}

/**
 * An object containing Baseline (https://web.dev/baseline,
 * https://web-platform-dx.github.io/web-features/) information about the feature's browser
 * compatibility.
 */
interface Baseline {
  /**
   * The Baseline status of the feature:
   * - `"false"` — limited availability across major browsers
   * - `"low"` — newly available across major browsers
   * - `"high"` — widely available across major browsers
   */
  status: BaselineStatus;
  /**
   * A date in the format `YYYY-MM-DD` representing when the feature became newly available,
   * or `undefined` if it hasn't yet reached that status.
   */
  // eslint-disable-next-line @typescript-eslint/naming-convention
  baseline_low_date?: string;
  /**
   * A date in the format `YYYY-MM-DD` representing when the feature became widely available,
   * or `undefined` if it hasn't yet reached that status.
   *
   * The widely available date is always 30 months after the newly available date.
   */
  // eslint-disable-next-line @typescript-eslint/naming-convention
  baseline_high_date?: string;
}

export interface CSSProperty {
  name: string;
  description?: string;
  baseline?: Baseline;
  browsers?: string[];
  references?: Array<{
    name: string,
    url: string,
  }>;
}

export class CSSPropertyDocsView extends HTMLElement {
  readonly #shadow = this.attachShadow({mode: 'open'});
  readonly #cssProperty: CSSProperty;

  constructor(cssProperty: CSSProperty) {
    super();
    this.#cssProperty = cssProperty;
    this.#render();
  }

  #dontShowChanged(e: Event): void {
    const showDocumentation = !(e.target as HTMLInputElement).checked;
    Common.Settings.Settings.instance()
        .moduleSetting('show-css-property-documentation-on-hover')
        .set(showDocumentation);
  }

  #render(): void {
    const {description, references, baseline, browsers} = this.#cssProperty;
    const link = references?.[0].url;

    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    render(html`
      <style>${CSSPropertyDocsViewStyles}</style>
      <div class="docs-popup-wrapper">
        ${description ? html`
          <div id="description">
            ${description}
          </div>
        ` : nothing}
        ${baseline ? html`
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
        ${link ? html`
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

declare global {
  interface HTMLElementTagNameMap {
    'devtools-css-property-docs-view': CSSPropertyDocsView;
  }
}
