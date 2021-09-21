/**
 * @license
 * Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/** @template T @typedef {import('./i18n').I18n<T>} I18n */

const ELLIPSIS = '\u2026';
const NBSP = '\xa0';
const PASS_THRESHOLD = 0.9;
const SCREENSHOT_PREFIX = 'data:image/jpeg;base64,';

const RATINGS = {
  PASS: {label: 'pass', minScore: PASS_THRESHOLD},
  AVERAGE: {label: 'average', minScore: 0.5},
  FAIL: {label: 'fail'},
  ERROR: {label: 'error'},
};

// 25 most used tld plus one domains (aka public suffixes) from http archive.
// @see https://github.com/GoogleChrome/lighthouse/pull/5065#discussion_r191926212
// The canonical list is https://publicsuffix.org/learn/ but we're only using subset to conserve bytes
const listOfTlds = [
  'com', 'co', 'gov', 'edu', 'ac', 'org', 'go', 'gob', 'or', 'net', 'in', 'ne', 'nic', 'gouv',
  'web', 'spb', 'blog', 'jus', 'kiev', 'mil', 'wi', 'qc', 'ca', 'bel', 'on',
];

class Util {
  static get PASS_THRESHOLD() {
    return PASS_THRESHOLD;
  }

  static get MS_DISPLAY_VALUE() {
    return `%10d${NBSP}ms`;
  }

  /**
   * Returns a new LHR that's reshaped for slightly better ergonomics within the report rendereer.
   * Also, sets up the localized UI strings used within renderer and makes changes to old LHRs to be
   * compatible with current renderer.
   * The LHR passed in is not mutated.
   * TODO(team): we all agree the LHR shape change is technical debt we should fix
   * @param {LH.Result} result
   * @return {LH.ReportResult}
   */
  static prepareReportResult(result) {
    // If any mutations happen to the report within the renderers, we want the original object untouched
    const clone = /** @type {LH.ReportResult} */ (JSON.parse(JSON.stringify(result)));

    // If LHR is older (≤3.0.3), it has no locale setting. Set default.
    if (!clone.configSettings.locale) {
      clone.configSettings.locale = 'en';
    }
    if (!clone.configSettings.formFactor) {
      // @ts-expect-error fallback handling for emulatedFormFactor
      clone.configSettings.formFactor = clone.configSettings.emulatedFormFactor;
    }

    for (const audit of Object.values(clone.audits)) {
      // Turn 'not-applicable' (LHR <4.0) and 'not_applicable' (older proto versions)
      // into 'notApplicable' (LHR ≥4.0).
      // @ts-expect-error tsc rightly flags that these values shouldn't occur.
      // eslint-disable-next-line max-len
      if (audit.scoreDisplayMode === 'not_applicable' || audit.scoreDisplayMode === 'not-applicable') {
        audit.scoreDisplayMode = 'notApplicable';
      }

      if (audit.details) {
        // Turn `auditDetails.type` of undefined (LHR <4.2) and 'diagnostic' (LHR <5.0)
        // into 'debugdata' (LHR ≥5.0).
        // @ts-expect-error tsc rightly flags that these values shouldn't occur.
        if (audit.details.type === undefined || audit.details.type === 'diagnostic') {
          // @ts-expect-error details is of type never.
          audit.details.type = 'debugdata';
        }

        // Add the jpg data URL prefix to filmstrip screenshots without them (LHR <5.0).
        if (audit.details.type === 'filmstrip') {
          for (const screenshot of audit.details.items) {
            if (!screenshot.data.startsWith(SCREENSHOT_PREFIX)) {
              screenshot.data = SCREENSHOT_PREFIX + screenshot.data;
            }
          }
        }
      }
    }

    // For convenience, smoosh all AuditResults into their auditRef (which has just weight & group)
    if (typeof clone.categories !== 'object') throw new Error('No categories provided.');

    /** @type {Map<string, Array<LH.ReportResult.AuditRef>>} */
    const relevantAuditToMetricsMap = new Map();

    for (const category of Object.values(clone.categories)) {
      // Make basic lookup table for relevantAudits
      category.auditRefs.forEach(metricRef => {
        if (!metricRef.relevantAudits) return;
        metricRef.relevantAudits.forEach(auditId => {
          const arr = relevantAuditToMetricsMap.get(auditId) || [];
          arr.push(metricRef);
          relevantAuditToMetricsMap.set(auditId, arr);
        });
      });

      category.auditRefs.forEach(auditRef => {
        const result = clone.audits[auditRef.id];
        auditRef.result = result;

        // Attach any relevantMetric auditRefs
        if (relevantAuditToMetricsMap.has(auditRef.id)) {
          auditRef.relevantMetrics = relevantAuditToMetricsMap.get(auditRef.id);
        }

        // attach the stackpacks to the auditRef object
        if (clone.stackPacks) {
          clone.stackPacks.forEach(pack => {
            if (pack.descriptions[auditRef.id]) {
              auditRef.stackPacks = auditRef.stackPacks || [];
              auditRef.stackPacks.push({
                title: pack.title,
                iconDataURL: pack.iconDataURL,
                description: pack.descriptions[auditRef.id],
              });
            }
          });
        }
      });
    }

    return clone;
  }

  /**
   * Used to determine if the "passed" for the purposes of showing up in the "failed" or "passed"
   * sections of the report.
   *
   * @param {{score: (number|null), scoreDisplayMode: string}} audit
   * @return {boolean}
   */
  static showAsPassed(audit) {
    switch (audit.scoreDisplayMode) {
      case 'manual':
      case 'notApplicable':
        return true;
      case 'error':
      case 'informative':
        return false;
      case 'numeric':
      case 'binary':
      default:
        return Number(audit.score) >= RATINGS.PASS.minScore;
    }
  }

  /**
   * Convert a score to a rating label.
   * @param {number|null} score
   * @param {string=} scoreDisplayMode
   * @return {string}
   */
  static calculateRating(score, scoreDisplayMode) {
    // Handle edge cases first, manual and not applicable receive 'pass', errored audits receive 'error'
    if (scoreDisplayMode === 'manual' || scoreDisplayMode === 'notApplicable') {
      return RATINGS.PASS.label;
    } else if (scoreDisplayMode === 'error') {
      return RATINGS.ERROR.label;
    } else if (score === null) {
      return RATINGS.FAIL.label;
    }

    // At this point, we're rating a standard binary/numeric audit
    let rating = RATINGS.FAIL.label;
    if (score >= RATINGS.PASS.minScore) {
      rating = RATINGS.PASS.label;
    } else if (score >= RATINGS.AVERAGE.minScore) {
      rating = RATINGS.AVERAGE.label;
    }
    return rating;
  }

  /**
   * Split a string by markdown code spans (enclosed in `backticks`), splitting
   * into segments that were enclosed in backticks (marked as `isCode === true`)
   * and those that outside the backticks (`isCode === false`).
   * @param {string} text
   * @return {Array<{isCode: true, text: string}|{isCode: false, text: string}>}
   */
  static splitMarkdownCodeSpans(text) {
    /** @type {Array<{isCode: true, text: string}|{isCode: false, text: string}>} */
    const segments = [];

    // Split on backticked code spans.
    const parts = text.split(/`(.*?)`/g);
    for (let i = 0; i < parts.length; i ++) {
      const text = parts[i];

      // Empty strings are an artifact of splitting, not meaningful.
      if (!text) continue;

      // Alternates between plain text and code segments.
      const isCode = i % 2 !== 0;
      segments.push({
        isCode,
        text,
      });
    }

    return segments;
  }

  /**
   * Split a string on markdown links (e.g. [some link](https://...)) into
   * segments of plain text that weren't part of a link (marked as
   * `isLink === false`), and segments with text content and a URL that did make
   * up a link (marked as `isLink === true`).
   * @param {string} text
   * @return {Array<{isLink: true, text: string, linkHref: string}|{isLink: false, text: string}>}
   */
  static splitMarkdownLink(text) {
    /** @type {Array<{isLink: true, text: string, linkHref: string}|{isLink: false, text: string}>} */
    const segments = [];

    const parts = text.split(/\[([^\]]+?)\]\((https?:\/\/.*?)\)/g);
    while (parts.length) {
      // Shift off the same number of elements as the pre-split and capture groups.
      const [preambleText, linkText, linkHref] = parts.splice(0, 3);

      if (preambleText) { // Skip empty text as it's an artifact of splitting, not meaningful.
        segments.push({
          isLink: false,
          text: preambleText,
        });
      }

      // Append link if there are any.
      if (linkText && linkHref) {
        segments.push({
          isLink: true,
          text: linkText,
          linkHref,
        });
      }
    }

    return segments;
  }

  /**
   * @param {URL} parsedUrl
   * @param {{numPathParts?: number, preserveQuery?: boolean, preserveHost?: boolean}=} options
   * @return {string}
   */
  static getURLDisplayName(parsedUrl, options) {
    // Closure optional properties aren't optional in tsc, so fallback needs undefined  values.
    options = options || {numPathParts: undefined, preserveQuery: undefined,
      preserveHost: undefined};
    const numPathParts = options.numPathParts !== undefined ? options.numPathParts : 2;
    const preserveQuery = options.preserveQuery !== undefined ? options.preserveQuery : true;
    const preserveHost = options.preserveHost || false;

    let name;

    if (parsedUrl.protocol === 'about:' || parsedUrl.protocol === 'data:') {
      // Handle 'about:*' and 'data:*' URLs specially since they have no path.
      name = parsedUrl.href;
    } else {
      name = parsedUrl.pathname;
      const parts = name.split('/').filter(part => part.length);
      if (numPathParts && parts.length > numPathParts) {
        name = ELLIPSIS + parts.slice(-1 * numPathParts).join('/');
      }

      if (preserveHost) {
        name = `${parsedUrl.host}/${name.replace(/^\//, '')}`;
      }
      if (preserveQuery) {
        name = `${name}${parsedUrl.search}`;
      }
    }

    const MAX_LENGTH = 64;
    // Always elide hexadecimal hash
    name = name.replace(/([a-f0-9]{7})[a-f0-9]{13}[a-f0-9]*/g, `$1${ELLIPSIS}`);
    // Also elide other hash-like mixed-case strings
    name = name.replace(/([a-zA-Z0-9-_]{9})(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])[a-zA-Z0-9-_]{10,}/g,
      `$1${ELLIPSIS}`);
    // Also elide long number sequences
    name = name.replace(/(\d{3})\d{6,}/g, `$1${ELLIPSIS}`);
    // Merge any adjacent ellipses
    name = name.replace(/\u2026+/g, ELLIPSIS);

    // Elide query params first
    if (name.length > MAX_LENGTH && name.includes('?')) {
      // Try to leave the first query parameter intact
      name = name.replace(/\?([^=]*)(=)?.*/, `?$1$2${ELLIPSIS}`);

      // Remove it all if it's still too long
      if (name.length > MAX_LENGTH) {
        name = name.replace(/\?.*/, `?${ELLIPSIS}`);
      }
    }

    // Elide too long names next
    if (name.length > MAX_LENGTH) {
      const dotIndex = name.lastIndexOf('.');
      if (dotIndex >= 0) {
        name = name.slice(0, MAX_LENGTH - 1 - (name.length - dotIndex)) +
          // Show file extension
          `${ELLIPSIS}${name.slice(dotIndex)}`;
      } else {
        name = name.slice(0, MAX_LENGTH - 1) + ELLIPSIS;
      }
    }

    return name;
  }

  /**
   * Split a URL into a file, hostname and origin for easy display.
   * @param {string} url
   * @return {{file: string, hostname: string, origin: string}}
   */
  static parseURL(url) {
    const parsedUrl = new URL(url);
    return {
      file: Util.getURLDisplayName(parsedUrl),
      hostname: parsedUrl.hostname,
      origin: parsedUrl.origin,
    };
  }

  /**
   * @param {string|URL} value
   * @return {!URL}
   */
  static createOrReturnURL(value) {
    if (value instanceof URL) {
      return value;
    }

    return new URL(value);
  }

  /**
   * Gets the tld of a domain
   *
   * @param {string} hostname
   * @return {string} tld
   */
  static getTld(hostname) {
    const tlds = hostname.split('.').slice(-2);

    if (!listOfTlds.includes(tlds[0])) {
      return `.${tlds[tlds.length - 1]}`;
    }

    return `.${tlds.join('.')}`;
  }

  /**
   * Returns a primary domain for provided hostname (e.g. www.example.com -> example.com).
   * @param {string|URL} url hostname or URL object
   * @return {string}
   */
  static getRootDomain(url) {
    const hostname = Util.createOrReturnURL(url).hostname;
    const tld = Util.getTld(hostname);

    // tld is .com or .co.uk which means we means that length is 1 to big
    // .com => 2 & .co.uk => 3
    const splitTld = tld.split('.');

    // get TLD + root domain
    return hostname.split('.').slice(-splitTld.length).join('.');
  }

  /**
   * @param {LH.Result['configSettings']} settings
   * @return {!Array<{name: string, description: string}>}
   */
  static getEnvironmentDisplayValues(settings) {
    const emulationDesc = Util.getEmulationDescriptions(settings);

    return [
      {
        name: Util.i18n.strings.runtimeSettingsDevice,
        description: emulationDesc.deviceEmulation,
      },
      {
        name: Util.i18n.strings.runtimeSettingsNetworkThrottling,
        description: emulationDesc.networkThrottling,
      },
      {
        name: Util.i18n.strings.runtimeSettingsCPUThrottling,
        description: emulationDesc.cpuThrottling,
      },
    ];
  }

  /**
   * @param {LH.Result['configSettings']} settings
   * @return {{deviceEmulation: string, networkThrottling: string, cpuThrottling: string}}
   */
  static getEmulationDescriptions(settings) {
    let cpuThrottling;
    let networkThrottling;

    const throttling = settings.throttling;

    switch (settings.throttlingMethod) {
      case 'provided':
        cpuThrottling = Util.i18n.strings.throttlingProvided;
        networkThrottling = Util.i18n.strings.throttlingProvided;
        break;
      case 'devtools': {
        const {cpuSlowdownMultiplier, requestLatencyMs} = throttling;
        cpuThrottling = `${Util.i18n.formatNumber(cpuSlowdownMultiplier)}x slowdown (DevTools)`;
        networkThrottling = `${Util.i18n.formatNumber(requestLatencyMs)}${NBSP}ms HTTP RTT, ` +
          `${Util.i18n.formatNumber(throttling.downloadThroughputKbps)}${NBSP}Kbps down, ` +
          `${Util.i18n.formatNumber(throttling.uploadThroughputKbps)}${NBSP}Kbps up (DevTools)`;
        break;
      }
      case 'simulate': {
        const {cpuSlowdownMultiplier, rttMs, throughputKbps} = throttling;
        cpuThrottling = `${Util.i18n.formatNumber(cpuSlowdownMultiplier)}x slowdown (Simulated)`;
        networkThrottling = `${Util.i18n.formatNumber(rttMs)}${NBSP}ms TCP RTT, ` +
          `${Util.i18n.formatNumber(throughputKbps)}${NBSP}Kbps throughput (Simulated)`;
        break;
      }
      default:
        cpuThrottling = Util.i18n.strings.runtimeUnknown;
        networkThrottling = Util.i18n.strings.runtimeUnknown;
    }

    // TODO(paulirish): revise Runtime Settings strings: https://github.com/GoogleChrome/lighthouse/pull/11796
    const deviceEmulation = {
      mobile: Util.i18n.strings.runtimeMobileEmulation,
      desktop: Util.i18n.strings.runtimeDesktopEmulation,
    }[settings.formFactor] || Util.i18n.strings.runtimeNoEmulation;

    return {
      deviceEmulation,
      cpuThrottling,
      networkThrottling,
    };
  }

  /**
   * Returns only lines that are near a message, or the first few lines if there are
   * no line messages.
   * @param {LH.Audit.Details.SnippetValue['lines']} lines
   * @param {LH.Audit.Details.SnippetValue['lineMessages']} lineMessages
   * @param {number} surroundingLineCount Number of lines to include before and after
   * the message. If this is e.g. 2 this function might return 5 lines.
   */
  static filterRelevantLines(lines, lineMessages, surroundingLineCount) {
    if (lineMessages.length === 0) {
      // no lines with messages, just return the first bunch of lines
      return lines.slice(0, surroundingLineCount * 2 + 1);
    }

    const minGapSize = 3;
    const lineNumbersToKeep = new Set();
    // Sort messages so we can check lineNumbersToKeep to see how big the gap to
    // the previous line is.
    lineMessages = lineMessages.sort((a, b) => (a.lineNumber || 0) - (b.lineNumber || 0));
    lineMessages.forEach(({lineNumber}) => {
      let firstSurroundingLineNumber = lineNumber - surroundingLineCount;
      let lastSurroundingLineNumber = lineNumber + surroundingLineCount;

      while (firstSurroundingLineNumber < 1) {
        // make sure we still show (surroundingLineCount * 2 + 1) lines in total
        firstSurroundingLineNumber++;
        lastSurroundingLineNumber++;
      }
      // If only a few lines would be omitted normally then we prefer to include
      // extra lines to avoid the tiny gap
      if (lineNumbersToKeep.has(firstSurroundingLineNumber - minGapSize - 1)) {
        firstSurroundingLineNumber -= minGapSize;
      }
      for (let i = firstSurroundingLineNumber; i <= lastSurroundingLineNumber; i++) {
        const surroundingLineNumber = i;
        lineNumbersToKeep.add(surroundingLineNumber);
      }
    });

    return lines.filter(line => lineNumbersToKeep.has(line.lineNumber));
  }

  /**
   * @param {string} categoryId
   */
  static isPluginCategory(categoryId) {
    return categoryId.startsWith('lighthouse-plugin-');
  }
}

/**
 * Some parts of the report renderer require data found on the LHR. Instead of wiring it
 * through, we have this global.
 * @type {LH.ReportResult | null}
 */
Util.reportJson = null;

/**
 * An always-increasing counter for making unique SVG ID suffixes.
 */
Util.getUniqueSuffix = (() => {
  let svgSuffix = 0;
  return function() {
    return svgSuffix++;
  };
})();

/** @type {I18n<typeof Util['UIStrings']>} */
// @ts-expect-error: Is set in report renderer.
Util.i18n = null;

/**
 * Report-renderer-specific strings.
 */
Util.UIStrings = {
  /** Disclaimer shown to users below the metric values (First Contentful Paint, Time to Interactive, etc) to warn them that the numbers they see will likely change slightly the next time they run Lighthouse. */
  varianceDisclaimer: 'Values are estimated and may vary. The [performance score is calculated](https://web.dev/performance-scoring/) directly from these metrics.',
  /** Text link pointing to an interactive calculator that explains Lighthouse scoring. The link text should be fairly short. */
  calculatorLink: 'See calculator.',
  /** Label preceding a radio control for filtering the list of audits. The radio choices are various performance metrics (FCP, LCP, TBT), and if chosen, the audits in the report are hidden if they are not relevant to the selected metric. */
  showRelevantAudits: 'Show audits relevant to:',
  /** Column heading label for the listing of opportunity audits. Each audit title represents an opportunity. There are only 2 columns, so no strict character limit.  */
  opportunityResourceColumnLabel: 'Opportunity',
  /** Column heading label for the estimated page load savings of opportunity audits. Estimated Savings is the total amount of time (in seconds) that Lighthouse computed could be reduced from the total page load time, if the suggested action is taken. There are only 2 columns, so no strict character limit. */
  opportunitySavingsColumnLabel: 'Estimated Savings',

  /** An error string displayed next to a particular audit when it has errored, but not provided any specific error message. */
  errorMissingAuditInfo: 'Report error: no audit information',
  /** A label, shown next to an audit title or metric title, indicating that there was an error computing it. The user can hover on the label to reveal a tooltip with the extended error message. Translation should be short (< 20 characters). */
  errorLabel: 'Error!',
  /** This label is shown above a bulleted list of warnings. It is shown directly below an audit that produced warnings. Warnings describe situations the user should be aware of, as Lighthouse was unable to complete all the work required on this audit. For example, The 'Unable to decode image (biglogo.jpg)' warning may show up below an image encoding audit. */
  warningHeader: 'Warnings: ',
  /** Section heading shown above a list of passed audits that contain warnings. Audits under this section do not negatively impact the score, but Lighthouse has generated some potentially actionable suggestions that should be reviewed. This section is expanded by default and displays after the failing audits. */
  warningAuditsGroupTitle: 'Passed audits but with warnings',
  /** Section heading shown above a list of audits that are passing. 'Passed' here refers to a passing grade. This section is collapsed by default, as the user should be focusing on the failed audits instead. Users can click this heading to reveal the list. */
  passedAuditsGroupTitle: 'Passed audits',
  /** Section heading shown above a list of audits that do not apply to the page. For example, if an audit is 'Are images optimized?', but the page has no images on it, the audit will be marked as not applicable. This is neither passing or failing. This section is collapsed by default, as the user should be focusing on the failed audits instead. Users can click this heading to reveal the list. */
  notApplicableAuditsGroupTitle: 'Not applicable',
  /** Section heading shown above a list of audits that were not computed by Lighthouse. They serve as a list of suggestions for the user to go and manually check. For example, Lighthouse can't automate testing cross-browser compatibility, so that is listed within this section, so the user is reminded to test it themselves. This section is collapsed by default, as the user should be focusing on the failed audits instead. Users can click this heading to reveal the list. */
  manualAuditsGroupTitle: 'Additional items to manually check',

  /** Label shown preceding any important warnings that may have invalidated the entire report. For example, if the user has Chrome extensions installed, they may add enough performance overhead that Lighthouse's performance metrics are unreliable. If shown, this will be displayed at the top of the report UI. */
  toplevelWarningsMessage: 'There were issues affecting this run of Lighthouse:',

  /** String of text shown in a graphical representation of the flow of network requests for the web page. This label represents the initial network request that fetches an HTML page. This navigation may be redirected (eg. Initial navigation to http://example.com redirects to https://www.example.com). */
  crcInitialNavigation: 'Initial Navigation',
  /** Label of value shown in the summary of critical request chains. Refers to the total amount of time (milliseconds) of the longest critical path chain/sequence of network requests. Example value: 2310 ms */
  crcLongestDurationLabel: 'Maximum critical path latency:',

  /** Label for button that shows all lines of the snippet when clicked */
  snippetExpandButtonLabel: 'Expand snippet',
  /** Label for button that only shows a few lines of the snippet when clicked */
  snippetCollapseButtonLabel: 'Collapse snippet',

  /** Explanation shown to users below performance results to inform them that the test was done with a 4G network connection and to warn them that the numbers they see will likely change slightly the next time they run Lighthouse. 'Lighthouse' becomes link text to additional documentation. */
  lsPerformanceCategoryDescription: '[Lighthouse](https://developers.google.com/web/tools/lighthouse/) analysis of the current page on an emulated mobile network. Values are estimated and may vary.',
  /** Title of the lab data section of the Performance category. Within this section are various speed metrics which quantify the pageload performance into values presented in seconds and milliseconds. "Lab" is an abbreviated form of "laboratory", and refers to the fact that the data is from a controlled test of a website, not measurements from real users visiting that site.  */
  labDataTitle: 'Lab Data',

  /** This label is for a checkbox above a table of items loaded by a web page. The checkbox is used to show or hide third-party (or "3rd-party") resources in the table, where "third-party resources" refers to items loaded by a web page from URLs that aren't controlled by the owner of the web page. */
  thirdPartyResourcesLabel: 'Show 3rd-party resources',
  /** This label is for a button that opens a new tab to a webapp called "Treemap", which is a nested visual representation of a heierarchy of data related to the reports (script bytes and coverage, resource breakdown, etc.) */
  viewTreemapLabel: 'View Treemap',

  /** Option in a dropdown menu that opens a small, summary report in a print dialog.  */
  dropdownPrintSummary: 'Print Summary',
  /** Option in a dropdown menu that opens a full Lighthouse report in a print dialog.  */
  dropdownPrintExpanded: 'Print Expanded',
  /** Option in a dropdown menu that copies the Lighthouse JSON object to the system clipboard. */
  dropdownCopyJSON: 'Copy JSON',
  /** Option in a dropdown menu that saves the Lighthouse report HTML locally to the system as a '.html' file. */
  dropdownSaveHTML: 'Save as HTML',
  /** Option in a dropdown menu that saves the Lighthouse JSON object to the local system as a '.json' file. */
  dropdownSaveJSON: 'Save as JSON',
  /** Option in a dropdown menu that opens the current report in the Lighthouse Viewer Application. */
  dropdownViewer: 'Open in Viewer',
  /** Option in a dropdown menu that saves the current report as a new GitHub Gist. */
  dropdownSaveGist: 'Save as Gist',
  /** Option in a dropdown menu that toggles the themeing of the report between Light(default) and Dark themes. */
  dropdownDarkTheme: 'Toggle Dark Theme',

  /** Title of the Runtime settings table in a Lighthouse report.  Runtime settings are the environment configurations that a specific report used at auditing time. */
  runtimeSettingsTitle: 'Runtime Settings',
  /** Label for a row in a table that shows the URL that was audited during a Lighthouse run. */
  runtimeSettingsUrl: 'URL',
  /** Label for a row in a table that shows the time at which a Lighthouse run was conducted; formatted as a timestamp, e.g. Jan 1, 1970 12:00 AM UTC. */
  runtimeSettingsFetchTime: 'Fetch Time',
  /** Label for a row in a table that describes the kind of device that was emulated for the Lighthouse run.  Example values for row elements: 'No Emulation', 'Emulated Desktop', etc. */
  runtimeSettingsDevice: 'Device',
  /** Label for a row in a table that describes the network throttling conditions that were used during a Lighthouse run, if any. */
  runtimeSettingsNetworkThrottling: 'Network throttling',
  /** Label for a row in a table that describes the CPU throttling conditions that were used during a Lighthouse run, if any.*/
  runtimeSettingsCPUThrottling: 'CPU throttling',
  /** Label for a row in a table that shows in what tool Lighthouse is being run (e.g. The lighthouse CLI, Chrome DevTools, Lightrider, WebPageTest, etc). */
  runtimeSettingsChannel: 'Channel',
  /** Label for a row in a table that shows the User Agent that was detected on the Host machine that ran Lighthouse. */
  runtimeSettingsUA: 'User agent (host)',
  /** Label for a row in a table that shows the User Agent that was used to send out all network requests during the Lighthouse run. */
  runtimeSettingsUANetwork: 'User agent (network)',
  /** Label for a row in a table that shows the estimated CPU power of the machine running Lighthouse. Example row values: 532, 1492, 783. */
  runtimeSettingsBenchmark: 'CPU/Memory Power',
  /** Label for a row in a table that shows the version of the Axe library used. Example row values: 2.1.0, 3.2.3 */
  runtimeSettingsAxeVersion: 'Axe version',

  /** Label for button to create an issue against the Lighthouse GitHub project. */
  footerIssue: 'File an issue',

  /** Descriptive explanation for emulation setting when no device emulation is set. */
  runtimeNoEmulation: 'No emulation',
  /** Descriptive explanation for emulation setting when emulating a Moto G4 mobile device. */
  runtimeMobileEmulation: 'Emulated Moto G4',
  /** Descriptive explanation for emulation setting when emulating a generic desktop form factor, as opposed to a mobile-device like form factor. */
  runtimeDesktopEmulation: 'Emulated Desktop',
  /** Descriptive explanation for a runtime setting that is set to an unknown value. */
  runtimeUnknown: 'Unknown',

  /** Descriptive explanation for environment throttling that was provided by the runtime environment instead of provided by Lighthouse throttling. */
  throttlingProvided: 'Provided by environment',
};

Util.UIStrings;

// auto-generated by build/build-report-components.js

/** @typedef {import('./dom.js').DOM} DOM */

/* eslint-disable max-len */


/**
 * @param {DOM} dom
 */
function create3pFilterComponent(dom) {
  const el0 = dom.document().createDocumentFragment();
  const el1 = dom.createElement('style');
  el1.append('\n    .lh-3p-filter {\n      background-color: var(--table-higlight-background-color);\n      color: var(--color-gray-600);\n      float: right;\n      padding: 6px;\n    }\n    .lh-3p-filter-label, .lh-3p-filter-input {\n      vertical-align: middle;\n      user-select: none;\n    }\n    .lh-3p-filter-input:disabled + .lh-3p-ui-string {\n      text-decoration: line-through;\n    }\n  ');
  el0.append(el1);
  const el2 = dom.createElement('div', 'lh-3p-filter');
  const el3 = dom.createElement('label', 'lh-3p-filter-label');
  const el4 = dom.createElement('input', 'lh-3p-filter-input');
  el4.setAttribute('type', 'checkbox');
  el4.setAttribute('checked', '');
  const el5 = dom.createElement('span', 'lh-3p-ui-string');
  el5.append('Show 3rd party resources');
  const el6 = dom.createElement('span', 'lh-3p-filter-count');
  el3.append(' ', el4, ' ', el5, ' (', el6, ') ');
  el2.append(' ', el3, ' ');
  el0.append(el2);
  return el0;
}

/**
 * @param {DOM} dom
 */
function createAuditComponent(dom) {
  const el0 = dom.document().createDocumentFragment();
  const el1 = dom.createElement('div', 'lh-audit');
  const el2 = dom.createElement('details', 'lh-expandable-details');
  const el3 = dom.createElement('summary');
  const el4 = dom.createElement('div', 'lh-audit__header lh-expandable-details__summary');
  const el5 = dom.createElement('span', 'lh-audit__score-icon');
  const el6 = dom.createElement('span', 'lh-audit__title-and-text');
  const el7 = dom.createElement('span', 'lh-audit__title');
  const el8 = dom.createElement('span', 'lh-audit__display-text');
  el6.append(' ', el7, ' ', el8, ' ');
  const el9 = dom.createElement('div', 'lh-chevron-container');
  el4.append(' ', el5, ' ', el6, ' ', el9, ' ');
  el3.append(' ', el4, ' ');
  const el10 = dom.createElement('div', 'lh-audit__description');
  const el11 = dom.createElement('div', 'lh-audit__stackpacks');
  el2.append(' ', el3, ' ', el10, ' ', el11, ' ');
  el1.append(' ', el2, ' ');
  el0.append(el1);
  return el0;
}

/**
 * @param {DOM} dom
 */
function createCategoryHeaderComponent(dom) {
  const el0 = dom.document().createDocumentFragment();
  const el1 = dom.createElement('div', 'lh-category-header');
  const el2 = dom.createElement('div', 'lh-score__gauge');
  el2.setAttribute('role', 'heading');
  el2.setAttribute('aria-level', '2');
  const el3 = dom.createElement('div', 'lh-category-header__description');
  el1.append(' ', el2, ' ', el3, ' ');
  el0.append(el1);
  return el0;
}

/**
 * @param {DOM} dom
 */
function createChevronComponent(dom) {
  const el0 = dom.document().createDocumentFragment();
  const el1 = dom.createElementNS('http://www.w3.org/2000/svg', 'svg', 'lh-chevron');
  el1.setAttribute('viewBox', '0 0 100 100');
  const el2 = dom.createElementNS('http://www.w3.org/2000/svg', 'g', 'lh-chevron__lines');
  const el3 = dom.createElementNS('http://www.w3.org/2000/svg', 'path', 'lh-chevron__line lh-chevron__line-left');
  el3.setAttribute('d', 'M10 50h40');
  const el4 = dom.createElementNS('http://www.w3.org/2000/svg', 'path', 'lh-chevron__line lh-chevron__line-right');
  el4.setAttribute('d', 'M90 50H50');
  el2.append(' ', el3, ' ', el4, ' ');
  el1.append(' ', el2, ' ');
  el0.append(el1);
  return el0;
}

/**
 * @param {DOM} dom
 */
function createClumpComponent(dom) {
  const el0 = dom.document().createDocumentFragment();
  const el1 = dom.createElement('details', 'lh-clump lh-audit-group');
  const el2 = dom.createElement('summary');
  const el3 = dom.createElement('div', 'lh-audit-group__summary');
  const el4 = dom.createElement('div', 'lh-audit-group__header');
  const el5 = dom.createElement('span', 'lh-audit-group__title');
  const el6 = dom.createElement('span', 'lh-audit-group__itemcount');
  el4.append(' ', el5, ' ', el6, ' ', ' ', ' ');
  el3.append(' ', el4, ' ');
  el2.append(' ', el3, ' ');
  el1.append(' ', el2, ' ');
  el0.append(el1);
  return el0;
}

/**
 * @param {DOM} dom
 */
function createCrcComponent(dom) {
  const el0 = dom.document().createDocumentFragment();
  const el1 = dom.createElement('div', 'lh-crc-container');
  const el2 = dom.createElement('style');
  el2.append('\n      .lh-crc .lh-tree-marker {\n        width: 12px;\n        height: 26px;\n        display: block;\n        float: left;\n        background-position: top left;\n      }\n      .lh-crc .lh-horiz-down {\n        background: url(\'data:image/svg+xml;utf8,<svg width="16" height="26" viewBox="0 0 16 26" xmlns="http://www.w3.org/2000/svg"><g fill="%23D8D8D8" fill-rule="evenodd"><path d="M16 12v2H-2v-2z"/><path d="M9 12v14H7V12z"/></g></svg>\');\n      }\n      .lh-crc .lh-right {\n        background: url(\'data:image/svg+xml;utf8,<svg width="16" height="26" viewBox="0 0 16 26" xmlns="http://www.w3.org/2000/svg"><path d="M16 12v2H0v-2z" fill="%23D8D8D8" fill-rule="evenodd"/></svg>\');\n      }\n      .lh-crc .lh-up-right {\n        background: url(\'data:image/svg+xml;utf8,<svg width="16" height="26" viewBox="0 0 16 26" xmlns="http://www.w3.org/2000/svg"><path d="M7 0h2v14H7zm2 12h7v2H9z" fill="%23D8D8D8" fill-rule="evenodd"/></svg>\');\n      }\n      .lh-crc .lh-vert-right {\n        background: url(\'data:image/svg+xml;utf8,<svg width="16" height="26" viewBox="0 0 16 26" xmlns="http://www.w3.org/2000/svg"><path d="M7 0h2v27H7zm2 12h7v2H9z" fill="%23D8D8D8" fill-rule="evenodd"/></svg>\');\n      }\n      .lh-crc .lh-vert {\n        background: url(\'data:image/svg+xml;utf8,<svg width="16" height="26" viewBox="0 0 16 26" xmlns="http://www.w3.org/2000/svg"><path d="M7 0h2v26H7z" fill="%23D8D8D8" fill-rule="evenodd"/></svg>\');\n      }\n      .lh-crc .lh-crc-tree {\n        font-size: 14px;\n        width: 100%;\n        overflow-x: auto;\n      }\n      .lh-crc .lh-crc-node {\n        height: 26px;\n        line-height: 26px;\n        white-space: nowrap;\n      }\n      .lh-crc .lh-crc-node__tree-value {\n        margin-left: 10px;\n      }\n      .lh-crc .lh-crc-node__tree-value div {\n        display: inline;\n      }\n      .lh-crc .lh-crc-node__chain-duration {\n        font-weight: 700;\n      }\n      .lh-crc .lh-crc-initial-nav {\n        color: #595959;\n        font-style: italic;\n      }\n      .lh-crc__summary-value {\n        margin-bottom: 10px;\n      }\n    ');
  const el3 = dom.createElement('div');
  const el4 = dom.createElement('div', 'lh-crc__summary-value');
  const el5 = dom.createElement('span', 'lh-crc__longest_duration_label');
  const el6 = dom.createElement('b', 'lh-crc__longest_duration');
  el4.append(' ', el5, ' ', el6, ' ');
  el3.append(' ', el4, ' ');
  const el7 = dom.createElement('div', 'lh-crc');
  const el8 = dom.createElement('div', 'lh-crc-initial-nav');
  el7.append(' ', el8, ' ', ' ');
  el1.append(' ', el2, ' ', el3, ' ', el7, ' ');
  el0.append(el1);
  return el0;
}

/**
 * @param {DOM} dom
 */
function createCrcChainComponent(dom) {
  const el0 = dom.document().createDocumentFragment();
  const el1 = dom.createElement('div', 'lh-crc-node');
  const el2 = dom.createElement('span', 'lh-crc-node__tree-marker');
  const el3 = dom.createElement('span', 'lh-crc-node__tree-value');
  el1.append(' ', el2, ' ', el3, ' ');
  el0.append(el1);
  return el0;
}

/**
 * @param {DOM} dom
 */
function createElementScreenshotComponent(dom) {
  const el0 = dom.document().createDocumentFragment();
  const el1 = dom.createElement('div', 'lh-element-screenshot');
  const el2 = dom.createElement('div', 'lh-element-screenshot__content');
  const el3 = dom.createElement('div', 'lh-element-screenshot__mask');
  const el4 = dom.createElementNS('http://www.w3.org/2000/svg', 'svg');
  el4.setAttribute('height', '0');
  el4.setAttribute('width', '0');
  const el5 = dom.createElementNS('http://www.w3.org/2000/svg', 'defs');
  const el6 = dom.createElementNS('http://www.w3.org/2000/svg', 'clipPath');
  el6.setAttribute('clipPathUnits', 'objectBoundingBox');
  el5.append(' ', el6, ' ', ' ');
  el4.append(' ', el5, ' ');
  el3.append(' ', el4, ' ');
  const el7 = dom.createElement('div', 'lh-element-screenshot__image');
  const el8 = dom.createElement('div', 'lh-element-screenshot__element-marker');
  el2.append(' ', el3, ' ', el7, ' ', el8, ' ');
  el1.append(' ', el2, ' ');
  el0.append(el1);
  return el0;
}

/**
 * @param {DOM} dom
 */
function createEnvItemComponent(dom) {
  const el0 = dom.document().createDocumentFragment();
  const el1 = dom.createElement('li', 'lh-env__item');
  const el2 = dom.createElement('span', 'lh-env__name');
  const el3 = dom.createElement('span', 'lh-env__description');
  el1.append(' ', el2, ' ', el3, ' ');
  el0.append(el1);
  return el0;
}

/**
 * @param {DOM} dom
 */
function createFooterComponent(dom) {
  const el0 = dom.document().createDocumentFragment();
  const el1 = dom.createElement('style');
  el1.append('\n    .lh-footer {\n      padding: var(--footer-padding-vertical) calc(var(--default-padding) * 2);\n      max-width: var(--report-width);\n      margin: 0 auto;\n    }\n    .lh-footer .lh-generated {\n      text-align: center;\n    }\n    .lh-env__title {\n      font-size: var(--env-item-font-size-big);\n      line-height: var(--env-item-line-height-big);\n      text-align: center;\n      padding: var(--score-container-padding);\n    }\n    .lh-env {\n      padding: var(--default-padding) 0;\n    }\n    .lh-env__items {\n      padding-left: 16px;\n      margin: 0 0 var(--audits-margin-bottom);\n      padding: 0;\n    }\n    .lh-env__items .lh-env__item:nth-child(2n) {\n      background-color: var(--env-item-background-color);\n    }\n    .lh-env__item {\n      display: flex;\n      padding: var(--env-item-padding);\n      position: relative;\n    }\n    span.lh-env__name {\n      font-weight: bold;\n      min-width: var(--env-name-min-width);\n      flex: 0.5;\n      padding: 0 8px;\n    }\n    span.lh-env__description {\n      text-align: left;\n      flex: 1;\n    }\n  ');
  el0.append(el1);
  const el2 = dom.createElement('footer', 'lh-footer');
  const el3 = dom.createElement('div', 'lh-env');
  const el4 = dom.createElement('div', 'lh-env__title');
  el4.append('Runtime Settings');
  const el5 = dom.createElement('ul', 'lh-env__items');
  el5.append(' ', ' ');
  el3.append(' ', el4, ' ', el5, ' ');
  const el6 = dom.createElement('div', 'lh-generated');
  const el7 = dom.createElement('b');
  el7.append('Lighthouse');
  const el8 = dom.createElement('span', 'lh-footer__version');
  const el9 = dom.createElement('a', 'lh-footer__version_issue');
  el9.setAttribute('href', 'https://github.com/GoogleChrome/Lighthouse/issues');
  el9.setAttribute('target', '_blank');
  el9.setAttribute('rel', 'noopener');
  el9.append('File an issue');
  el6.append(' ', ' Generated by ', el7, ' ', el8, ' | ', el9, ' ');
  el2.append(' ', ' ', el3, ' ', el6, ' ');
  el0.append(el2);
  return el0;
}

/**
 * @param {DOM} dom
 */
function createFractionComponent(dom) {
  const el0 = dom.document().createDocumentFragment();
  const el1 = dom.createElement('a', 'lh-fraction__wrapper');
  el1.setAttribute('href', '#');
  const el2 = dom.createElement('div', 'lh-fraction__content-wrapper');
  const el3 = dom.createElement('div', 'lh-fraction__content');
  const el4 = dom.createElement('div', 'lh-fraction__background');
  el3.append(' ', el4, ' ');
  el2.append(' ', el3, ' ');
  const el5 = dom.createElement('div', 'lh-fraction__label');
  el1.append(' ', el2, ' ', el5, ' ');
  el0.append(el1);
  return el0;
}

/**
 * @param {DOM} dom
 */
function createGaugeComponent(dom) {
  const el0 = dom.document().createDocumentFragment();
  const el1 = dom.createElement('a', 'lh-gauge__wrapper');
  el1.setAttribute('href', '#');
  const el2 = dom.createElement('div', 'lh-gauge__svg-wrapper');
  const el3 = dom.createElementNS('http://www.w3.org/2000/svg', 'svg', 'lh-gauge');
  el3.setAttribute('viewBox', '0 0 120 120');
  const el4 = dom.createElementNS('http://www.w3.org/2000/svg', 'circle', 'lh-gauge-base');
  el4.setAttribute('r', '56');
  el4.setAttribute('cx', '60');
  el4.setAttribute('cy', '60');
  el4.setAttribute('stroke-width', '8');
  const el5 = dom.createElementNS('http://www.w3.org/2000/svg', 'circle', 'lh-gauge-arc');
  el5.setAttribute('r', '56');
  el5.setAttribute('cx', '60');
  el5.setAttribute('cy', '60');
  el5.setAttribute('stroke-width', '8');
  el3.append(' ', el4, ' ', el5, ' ');
  el2.append(' ', el3, ' ');
  const el6 = dom.createElement('div', 'lh-gauge__percentage');
  const el7 = dom.createElement('div', 'lh-gauge__label');
  el1.append(' ', ' ', el2, ' ', el6, ' ', ' ', el7, ' ');
  el0.append(el1);
  return el0;
}

/**
 * @param {DOM} dom
 */
function createGaugePwaComponent(dom) {
  const el0 = dom.document().createDocumentFragment();
  const el1 = dom.createElement('style');
  el1.append('\n    .lh-gauge--pwa .lh-gauge--pwa__component {\n      display: none;\n    }\n    .lh-gauge--pwa__wrapper:not(.lh-badged--all) .lh-gauge--pwa__logo > path {\n      /* Gray logo unless everything is passing. */\n      fill: #B0B0B0;\n    }\n\n    .lh-gauge--pwa__disc {\n      fill: var(--color-gray-200);\n    }\n\n    .lh-gauge--pwa__logo--primary-color {\n      fill: #304FFE;\n    }\n\n    .lh-gauge--pwa__logo--secondary-color {\n      fill: #3D3D3D;\n    }\n    .lh-dark .lh-gauge--pwa__logo--secondary-color {\n      fill: #D8B6B6;\n    }\n\n    /* No passing groups. */\n    .lh-gauge--pwa__wrapper:not([class*=\'lh-badged--\']) .lh-gauge--pwa__na-line {\n      display: inline;\n    }\n    /* Just optimized. Same n/a line as no passing groups. */\n    .lh-gauge--pwa__wrapper.lh-badged--pwa-optimized:not(.lh-badged--pwa-installable) .lh-gauge--pwa__na-line {\n      display: inline;\n    }\n\n    /* Just installable. */\n    .lh-gauge--pwa__wrapper.lh-badged--pwa-installable .lh-gauge--pwa__installable-badge {\n      display: inline;\n    }\n\n    /* All passing groups. */\n    .lh-gauge--pwa__wrapper.lh-badged--all .lh-gauge--pwa__check-circle {\n      display: inline;\n    }\n  ');
  el0.append(el1);
  const el2 = dom.createElement('a', 'lh-gauge__wrapper lh-gauge--pwa__wrapper');
  el2.setAttribute('href', '#');
  const el3 = dom.createElementNS('http://www.w3.org/2000/svg', 'svg', 'lh-gauge lh-gauge--pwa');
  el3.setAttribute('viewBox', '0 0 60 60');
  const el4 = dom.createElementNS('http://www.w3.org/2000/svg', 'defs');
  const el5 = dom.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
  el5.setAttribute('id', 'lh-gauge--pwa__check-circle__gradient');
  el5.setAttribute('x1', '50%');
  el5.setAttribute('y1', '0%');
  el5.setAttribute('x2', '50%');
  el5.setAttribute('y2', '100%');
  const el6 = dom.createElementNS('http://www.w3.org/2000/svg', 'stop');
  el6.setAttribute('stop-color', '#00C852');
  el6.setAttribute('offset', '0%');
  const el7 = dom.createElementNS('http://www.w3.org/2000/svg', 'stop');
  el7.setAttribute('stop-color', '#009688');
  el7.setAttribute('offset', '100%');
  el5.append(' ', el6, ' ', el7, ' ');
  const el8 = dom.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
  el8.setAttribute('id', 'lh-gauge--pwa__installable__shadow-gradient');
  el8.setAttribute('x1', '76.056%');
  el8.setAttribute('x2', '24.111%');
  el8.setAttribute('y1', '82.995%');
  el8.setAttribute('y2', '24.735%');
  const el9 = dom.createElementNS('http://www.w3.org/2000/svg', 'stop');
  el9.setAttribute('stop-color', '#A5D6A7');
  el9.setAttribute('offset', '0%');
  const el10 = dom.createElementNS('http://www.w3.org/2000/svg', 'stop');
  el10.setAttribute('stop-color', '#80CBC4');
  el10.setAttribute('offset', '100%');
  el8.append(' ', el9, ' ', el10, ' ');
  const el11 = dom.createElementNS('http://www.w3.org/2000/svg', 'g');
  el11.setAttribute('id', 'lh-gauge--pwa__installable-badge');
  const el12 = dom.createElementNS('http://www.w3.org/2000/svg', 'circle');
  el12.setAttribute('fill', '#FFFFFF');
  el12.setAttribute('cx', '10');
  el12.setAttribute('cy', '10');
  el12.setAttribute('r', '10');
  const el13 = dom.createElementNS('http://www.w3.org/2000/svg', 'path');
  el13.setAttribute('fill', '#009688');
  el13.setAttribute('d', 'M10 4.167A5.835 5.835 0 0 0 4.167 10 5.835 5.835 0 0 0 10 15.833 5.835 5.835 0 0 0 15.833 10 5.835 5.835 0 0 0 10 4.167zm2.917 6.416h-2.334v2.334H9.417v-2.334H7.083V9.417h2.334V7.083h1.166v2.334h2.334v1.166z');
  el11.append(' ', el12, ' ', el13, ' ');
  el4.append(' ', el5, ' ', el8, ' ', el11, ' ');
  const el14 = dom.createElementNS('http://www.w3.org/2000/svg', 'g');
  el14.setAttribute('stroke', 'none');
  el14.setAttribute('fill-rule', 'nonzero');
  const el15 = dom.createElementNS('http://www.w3.org/2000/svg', 'circle', 'lh-gauge--pwa__disc');
  el15.setAttribute('cx', '30');
  el15.setAttribute('cy', '30');
  el15.setAttribute('r', '30');
  const el16 = dom.createElementNS('http://www.w3.org/2000/svg', 'g', 'lh-gauge--pwa__logo');
  const el17 = dom.createElementNS('http://www.w3.org/2000/svg', 'path', 'lh-gauge--pwa__logo--secondary-color');
  el17.setAttribute('d', 'M35.66 19.39l.7-1.75h2L37.4 15 38.6 12l3.4 9h-2.51l-.58-1.61z');
  const el18 = dom.createElementNS('http://www.w3.org/2000/svg', 'path', 'lh-gauge--pwa__logo--primary-color');
  el18.setAttribute('d', 'M33.52 21l3.65-9h-2.42l-2.5 5.82L30.5 12h-1.86l-1.9 5.82-1.35-2.65-1.21 3.72L25.4 21h2.38l1.72-5.2 1.64 5.2z');
  const el19 = dom.createElementNS('http://www.w3.org/2000/svg', 'path', 'lh-gauge--pwa__logo--secondary-color');
  el19.setAttribute('fill-rule', 'nonzero');
  el19.setAttribute('d', 'M20.3 17.91h1.48c.45 0 .85-.05 1.2-.15l.39-1.18 1.07-3.3a2.64 2.64 0 0 0-.28-.37c-.55-.6-1.36-.91-2.42-.91H18v9h2.3V17.9zm1.96-3.84c.22.22.33.5.33.87 0 .36-.1.65-.29.87-.2.23-.59.35-1.15.35h-.86v-2.41h.87c.52 0 .89.1 1.1.32z');
  el16.append(' ', el17, ' ', el18, ' ', el19, ' ');
  const el20 = dom.createElementNS('http://www.w3.org/2000/svg', 'rect', 'lh-gauge--pwa__component lh-gauge--pwa__na-line');
  el20.setAttribute('fill', '#FFFFFF');
  el20.setAttribute('x', '20');
  el20.setAttribute('y', '32');
  el20.setAttribute('width', '20');
  el20.setAttribute('height', '4');
  el20.setAttribute('rx', '2');
  const el21 = dom.createElementNS('http://www.w3.org/2000/svg', 'g', 'lh-gauge--pwa__component lh-gauge--pwa__installable-badge');
  el21.setAttribute('transform', 'translate(20, 29)');
  const el22 = dom.createElementNS('http://www.w3.org/2000/svg', 'path');
  el22.setAttribute('fill', 'url(#lh-gauge--pwa__installable__shadow-gradient)');
  el22.setAttribute('d', 'M33.629 19.487c-4.272 5.453-10.391 9.39-17.415 10.869L3 17.142 17.142 3 33.63 19.487z');
  const el23 = dom.createElementNS('http://www.w3.org/2000/svg', 'use');
  el23.setAttribute('href', '#lh-gauge--pwa__installable-badge');
  el21.append(' ', el22, ' ', el23, ' ');
  const el24 = dom.createElementNS('http://www.w3.org/2000/svg', 'g', 'lh-gauge--pwa__component lh-gauge--pwa__check-circle');
  el24.setAttribute('transform', 'translate(18, 28)');
  const el25 = dom.createElementNS('http://www.w3.org/2000/svg', 'circle');
  el25.setAttribute('fill', '#FFFFFF');
  el25.setAttribute('cx', '12');
  el25.setAttribute('cy', '12');
  el25.setAttribute('r', '12');
  const el26 = dom.createElementNS('http://www.w3.org/2000/svg', 'path');
  el26.setAttribute('fill', 'url(#lh-gauge--pwa__check-circle__gradient)');
  el26.setAttribute('d', 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z');
  el24.append(' ', el25, ' ', el26, ' ');
  el14.append(' ', ' ', el15, ' ', el16, ' ', ' ', el20, ' ', ' ', el21, ' ', ' ', el24, ' ');
  el3.append(' ', el4, ' ', el14, ' ');
  const el27 = dom.createElement('div', 'lh-gauge__label');
  el2.append(' ', el3, ' ', el27, ' ');
  el0.append(el2);
  return el0;
}

/**
 * @param {DOM} dom
 */
function createHeadingComponent(dom) {
  const el0 = dom.document().createDocumentFragment();
  const el1 = dom.createElement('style');
  el1.append('\n    /* CSS Fireworks. Originally by Eddie Lin\n       https://codepen.io/paulirish/pen/yEVMbP\n    */\n    .lh-pyro {\n      display: none;\n      z-index: 1;\n      pointer-events: none;\n    }\n    .lh-score100 .lh-pyro {\n      display: block;\n    }\n    .lh-score100 .lh-lighthouse stop:first-child {\n      stop-color: hsla(200, 12%, 95%, 0);\n    }\n    .lh-score100 .lh-lighthouse stop:last-child {\n      stop-color: hsla(65, 81%, 76%, 1);\n    }\n\n    .lh-pyro > .lh-pyro-before, .lh-pyro > .lh-pyro-after {\n      position: absolute;\n      width: 5px;\n      height: 5px;\n      border-radius: 2.5px;\n      box-shadow: 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff;\n      animation: 1s bang ease-out infinite backwards,  1s gravity ease-in infinite backwards,  5s position linear infinite backwards;\n      animation-delay: 1s, 1s, 1s;\n    }\n\n    .lh-pyro > .lh-pyro-after {\n      animation-delay: 2.25s, 2.25s, 2.25s;\n      animation-duration: 1.25s, 1.25s, 6.25s;\n    }\n    .lh-fireworks-paused .lh-pyro > div {\n      animation-play-state: paused;\n    }\n\n    @keyframes bang {\n      to {\n        box-shadow: -70px -115.67px #47ebbc, -28px -99.67px #eb47a4, 58px -31.67px #7eeb47, 13px -141.67px #eb47c5, -19px 6.33px #7347eb, -2px -74.67px #ebd247, 24px -151.67px #eb47e0, 57px -138.67px #b4eb47, -51px -104.67px #479eeb, 62px 8.33px #ebcf47, -93px 0.33px #d547eb, -16px -118.67px #47bfeb, 53px -84.67px #47eb83, 66px -57.67px #eb47bf, -93px -65.67px #91eb47, 30px -13.67px #86eb47, -2px -59.67px #83eb47, -44px 1.33px #eb47eb, 61px -58.67px #47eb73, 5px -22.67px #47e8eb, -66px -28.67px #ebe247, 42px -123.67px #eb5547, -75px 26.33px #7beb47, 15px -52.67px #a147eb, 36px -51.67px #eb8347, -38px -12.67px #eb5547, -46px -59.67px #47eb81, 78px -114.67px #eb47ba, 15px -156.67px #eb47bf, -36px 1.33px #eb4783, -72px -86.67px #eba147, 31px -46.67px #ebe247, -68px 29.33px #47e2eb, -55px 19.33px #ebe047, -56px 27.33px #4776eb, -13px -91.67px #eb5547, -47px -138.67px #47ebc7, -18px -96.67px #eb47ac, 11px -88.67px #4783eb, -67px -28.67px #47baeb, 53px 10.33px #ba47eb, 11px 19.33px #5247eb, -5px -11.67px #eb4791, -68px -4.67px #47eba7, 95px -37.67px #eb478b, -67px -162.67px #eb5d47, -54px -120.67px #eb6847, 49px -12.67px #ebe047, 88px 8.33px #47ebda, 97px 33.33px #eb8147, 6px -71.67px #ebbc47;\n      }\n    }\n    @keyframes gravity {\n      to {\n        transform: translateY(80px);\n        opacity: 0;\n      }\n    }\n    @keyframes position {\n      0%, 19.9% {\n        margin-top: 4%;\n        margin-left: 47%;\n      }\n      20%, 39.9% {\n        margin-top: 7%;\n        margin-left: 30%;\n      }\n      40%, 59.9% {\n        margin-top: 6%;\n        margin-left: 70%;\n      }\n      60%, 79.9% {\n        margin-top: 3%;\n        margin-left: 20%;\n      }\n      80%, 99.9% {\n        margin-top: 3%;\n        margin-left: 80%;\n      }\n    }\n  ');
  el0.append(el1);
  const el2 = dom.createElement('div', 'lh-header-container');
  const el3 = dom.createElement('div', 'lh-scores-wrapper-placeholder');
  el2.append(' ', el3, ' ');
  el0.append(el2);
  return el0;
}

/**
 * @param {DOM} dom
 */
function createMetricComponent(dom) {
  const el0 = dom.document().createDocumentFragment();
  const el1 = dom.createElement('div', 'lh-metric');
  const el2 = dom.createElement('div', 'lh-metric__innerwrap');
  const el3 = dom.createElement('div', 'lh-metric__icon');
  const el4 = dom.createElement('span', 'lh-metric__title');
  const el5 = dom.createElement('div', 'lh-metric__value');
  const el6 = dom.createElement('div', 'lh-metric__description');
  el2.append(' ', el3, ' ', el4, ' ', el5, ' ', el6, ' ');
  el1.append(' ', el2, ' ');
  el0.append(el1);
  return el0;
}

/**
 * @param {DOM} dom
 */
function createMetricsToggleComponent(dom) {
  const el0 = dom.document().createDocumentFragment();
  const el1 = dom.createElement('div', 'lh-metrics-toggle');
  const el2 = dom.createElement('input', 'lh-metrics-toggle__input');
  el2.setAttribute('type', 'checkbox');
  el2.setAttribute('id', 'toggle-metric-descriptions');
  el2.setAttribute('aria-label', 'Toggle the display of metric descriptions');
  const el3 = dom.createElement('label', 'lh-metrics-toggle__label');
  el3.setAttribute('for', 'toggle-metric-descriptions');
  const el4 = dom.createElement('div', 'lh-metrics-toggle__icon lh-metrics-toggle__icon--less');
  el4.setAttribute('aria-hidden', 'true');
  const el5 = dom.createElementNS('http://www.w3.org/2000/svg', 'svg');
  el5.setAttribute('width', '24');
  el5.setAttribute('height', '24');
  el5.setAttribute('viewBox', '0 0 24 24');
  const el6 = dom.createElementNS('http://www.w3.org/2000/svg', 'path', 'lh-metrics-toggle__lines');
  el6.setAttribute('d', 'M4 9h16v2H4zm0 4h10v2H4z');
  el5.append(' ', el6, ' ');
  el4.append(' ', el5, ' ');
  const el7 = dom.createElement('div', 'lh-metrics-toggle__icon lh-metrics-toggle__icon--more');
  el7.setAttribute('aria-hidden', 'true');
  const el8 = dom.createElementNS('http://www.w3.org/2000/svg', 'svg');
  el8.setAttribute('width', '24');
  el8.setAttribute('height', '24');
  el8.setAttribute('viewBox', '0 0 24 24');
  const el9 = dom.createElementNS('http://www.w3.org/2000/svg', 'path', 'lh-metrics-toggle__lines');
  el9.setAttribute('d', 'M3 18h12v-2H3v2zM3 6v2h18V6H3zm0 7h18v-2H3v2z');
  el8.append(' ', el9, ' ');
  el7.append(' ', el8, ' ');
  el3.append(' ', el4, ' ', el7, ' ');
  el1.append(' ', el2, ' ', el3, ' ');
  el0.append(el1);
  return el0;
}

/**
 * @param {DOM} dom
 */
function createOpportunityComponent(dom) {
  const el0 = dom.document().createDocumentFragment();
  const el1 = dom.createElement('div', 'lh-audit lh-audit--load-opportunity');
  const el2 = dom.createElement('details', 'lh-expandable-details');
  const el3 = dom.createElement('summary');
  const el4 = dom.createElement('div', 'lh-audit__header lh-expandable-details__summary');
  const el5 = dom.createElement('div', 'lh-load-opportunity__cols');
  const el6 = dom.createElement('div', 'lh-load-opportunity__col lh-load-opportunity__col--one');
  const el7 = dom.createElement('span', 'lh-audit__score-icon');
  const el8 = dom.createElement('div', 'lh-audit__title');
  el6.append(' ', el7, ' ', el8, ' ');
  const el9 = dom.createElement('div', 'lh-load-opportunity__col lh-load-opportunity__col--two');
  const el10 = dom.createElement('div', 'lh-load-opportunity__sparkline');
  const el11 = dom.createElement('div', 'lh-sparkline');
  const el12 = dom.createElement('div', 'lh-sparkline__bar');
  el11.append(el12);
  el10.append(' ', el11, ' ');
  const el13 = dom.createElement('div', 'lh-audit__display-text');
  const el14 = dom.createElement('div', 'lh-chevron-container');
  el9.append(' ', el10, ' ', el13, ' ', el14, ' ');
  el5.append(' ', el6, ' ', el9, ' ');
  el4.append(' ', el5, ' ');
  el3.append(' ', el4, ' ');
  const el15 = dom.createElement('div', 'lh-audit__description');
  const el16 = dom.createElement('div', 'lh-audit__stackpacks');
  el2.append(' ', el3, ' ', el15, ' ', el16, ' ');
  el1.append(' ', el2, ' ');
  el0.append(el1);
  return el0;
}

/**
 * @param {DOM} dom
 */
function createOpportunityHeaderComponent(dom) {
  const el0 = dom.document().createDocumentFragment();
  const el1 = dom.createElement('div', 'lh-load-opportunity__header lh-load-opportunity__cols');
  const el2 = dom.createElement('div', 'lh-load-opportunity__col lh-load-opportunity__col--one');
  const el3 = dom.createElement('div', 'lh-load-opportunity__col lh-load-opportunity__col--two');
  el1.append(' ', el2, ' ', el3, ' ');
  el0.append(el1);
  return el0;
}

/**
 * @param {DOM} dom
 */
function createScorescaleComponent(dom) {
  const el0 = dom.document().createDocumentFragment();
  const el1 = dom.createElement('div', 'lh-scorescale');
  const el2 = dom.createElement('span', 'lh-scorescale-range lh-scorescale-range--fail');
  el2.append('0–49');
  const el3 = dom.createElement('span', 'lh-scorescale-range lh-scorescale-range--average');
  el3.append('50–89');
  const el4 = dom.createElement('span', 'lh-scorescale-range lh-scorescale-range--pass');
  el4.append('90–100');
  el1.append(' ', el2, ' ', el3, ' ', el4, ' ');
  el0.append(el1);
  return el0;
}

/**
 * @param {DOM} dom
 */
function createScoresWrapperComponent(dom) {
  const el0 = dom.document().createDocumentFragment();
  const el1 = dom.createElement('style');
  el1.append('\n    .lh-scores-container {\n      display: flex;\n      flex-direction: column;\n      padding: var(--scores-container-padding);\n      position: relative;\n      width: 100%;\n    }\n\n    .lh-sticky-header {\n      --gauge-circle-size: 36px;\n      --plugin-badge-size: 18px;\n      --plugin-icon-size: 75%;\n      --gauge-wrapper-width: 60px;\n      --gauge-percentage-font-size: 13px;\n      position: fixed;\n      left: 0;\n      right: 0;\n      top: var(--topbar-height);\n      font-weight: 700;\n      display: none;\n      justify-content: center;\n      background-color: var(--sticky-header-background-color);\n      border-bottom: 1px solid var(--color-gray-200);\n      padding-top: var(--score-container-padding);\n      padding-bottom: 4px;\n      z-index: 1;\n      pointer-events: none;\n    }\n\n    .lh-devtools .lh-sticky-header {\n      /* The report within DevTools is placed in a container with overflow, which changes the placement of this header unless we change `position` to `sticky.` */\n      position: sticky;\n    }\n\n    .lh-sticky-header--visible {\n      display: grid;\n      grid-auto-flow: column;\n      pointer-events: auto;\n    }\n\n    /* Disable the gauge arc animation for the sticky header, so toggling display: none\n       does not play the animation. */\n    .lh-sticky-header .lh-gauge-arc {\n      animation: none;\n    }\n\n    .lh-sticky-header .lh-gauge__label {\n      display: none;\n    }\n\n    .lh-highlighter {\n      width: var(--gauge-wrapper-width);\n      height: 1px;\n      background-color: var(--highlighter-background-color);\n      /* Position at bottom of first gauge in sticky header. */\n      position: absolute;\n      grid-column: 1;\n      bottom: -1px;\n    }\n\n    .lh-gauge__wrapper:first-of-type {\n      contain: none;\n    }\n  ');
  el0.append(el1);
  const el2 = dom.createElement('div', 'lh-scores-wrapper');
  const el3 = dom.createElement('div', 'lh-scores-container');
  const el4 = dom.createElement('div', 'lh-pyro');
  const el5 = dom.createElement('div', 'lh-before');
  const el6 = dom.createElement('div', 'lh-after');
  el4.append(' ', el5, ' ', el6, ' ');
  el3.append(' ', el4, ' ');
  el2.append(' ', el3, ' ');
  el0.append(el2);
  return el0;
}

/**
 * @param {DOM} dom
 */
function createSnippetComponent(dom) {
  const el0 = dom.document().createDocumentFragment();
  const el1 = dom.createElement('div', 'lh-snippet');
  const el2 = dom.createElement('style');
  el2.append('\n          :root {\n            --snippet-highlight-light: #fbf1f2;\n            --snippet-highlight-dark: #ffd6d8;\n          }\n\n         .lh-snippet__header {\n          position: relative;\n          overflow: hidden;\n          padding: 10px;\n          border-bottom: none;\n          color: var(--snippet-color);\n          background-color: var(--snippet-background-color);\n          border: 1px solid var(--report-border-color-secondary);\n        }\n        .lh-snippet__title {\n          font-weight: bold;\n          float: left;\n        }\n        .lh-snippet__node {\n          float: left;\n          margin-left: 4px;\n        }\n        .lh-snippet__toggle-expand {\n          padding: 1px 7px;\n          margin-top: -1px;\n          margin-right: -7px;\n          float: right;\n          background: transparent;\n          border: none;\n          cursor: pointer;\n          font-size: 14px;\n          color: #0c50c7;\n        }\n\n        .lh-snippet__snippet {\n          overflow: auto;\n          border: 1px solid var(--report-border-color-secondary);\n        }\n        /* Container needed so that all children grow to the width of the scroll container */\n        .lh-snippet__snippet-inner {\n          display: inline-block;\n          min-width: 100%;\n        }\n\n        .lh-snippet:not(.lh-snippet--expanded) .lh-snippet__show-if-expanded {\n          display: none;\n        }\n        .lh-snippet.lh-snippet--expanded .lh-snippet__show-if-collapsed {\n          display: none;\n        }\n\n        .lh-snippet__line {\n          background: white;\n          white-space: pre;\n          display: flex;\n        }\n        .lh-snippet__line:not(.lh-snippet__line--message):first-child {\n          padding-top: 4px;\n        }\n        .lh-snippet__line:not(.lh-snippet__line--message):last-child {\n          padding-bottom: 4px;\n        }\n        .lh-snippet__line--content-highlighted {\n          background: var(--snippet-highlight-dark);\n        }\n        .lh-snippet__line--message {\n          background: var(--snippet-highlight-light);\n        }\n        .lh-snippet__line--message .lh-snippet__line-number {\n          padding-top: 10px;\n          padding-bottom: 10px;\n        }\n        .lh-snippet__line--message code {\n          padding: 10px;\n          padding-left: 5px;\n          color: var(--color-fail);\n          font-family: var(--report-font-family);\n        }\n        .lh-snippet__line--message code {\n          white-space: normal;\n        }\n        .lh-snippet__line-icon {\n          padding-top: 10px;\n          display: none;\n        }\n        .lh-snippet__line--message .lh-snippet__line-icon {\n          display: block;\n        }\n        .lh-snippet__line-icon:before {\n          content: "";\n          display: inline-block;\n          vertical-align: middle;\n          margin-right: 4px;\n          width: var(--score-icon-size);\n          height: var(--score-icon-size);\n          background-image: var(--fail-icon-url);\n        }\n        .lh-snippet__line-number {\n          flex-shrink: 0;\n          width: 40px;\n          text-align: right;\n          font-family: monospace;\n          padding-right: 5px;\n          margin-right: 5px;\n          color: var(--color-gray-600);\n          user-select: none;\n        }\n    ');
  el1.append(' ', el2, ' ');
  el0.append(el1);
  return el0;
}

/**
 * @param {DOM} dom
 */
function createSnippetContentComponent(dom) {
  const el0 = dom.document().createDocumentFragment();
  const el1 = dom.createElement('div', 'lh-snippet__snippet');
  const el2 = dom.createElement('div', 'lh-snippet__snippet-inner');
  el1.append(' ', el2, ' ');
  el0.append(el1);
  return el0;
}

/**
 * @param {DOM} dom
 */
function createSnippetHeaderComponent(dom) {
  const el0 = dom.document().createDocumentFragment();
  const el1 = dom.createElement('div', 'lh-snippet__header');
  const el2 = dom.createElement('div', 'lh-snippet__title');
  const el3 = dom.createElement('div', 'lh-snippet__node');
  const el4 = dom.createElement('button', 'lh-snippet__toggle-expand');
  const el5 = dom.createElement('span', 'lh-snippet__btn-label-collapse lh-snippet__show-if-expanded');
  const el6 = dom.createElement('span', 'lh-snippet__btn-label-expand lh-snippet__show-if-collapsed');
  el4.append(' ', el5, ' ', el6, ' ');
  el1.append(' ', el2, ' ', el3, ' ', el4, ' ');
  el0.append(el1);
  return el0;
}

/**
 * @param {DOM} dom
 */
function createSnippetLineComponent(dom) {
  const el0 = dom.document().createDocumentFragment();
  const el1 = dom.createElement('div', 'lh-snippet__line');
  const el2 = dom.createElement('div', 'lh-snippet__line-number');
  const el3 = dom.createElement('div', 'lh-snippet__line-icon');
  const el4 = dom.createElement('code');
  el1.append(' ', el2, ' ', el3, ' ', el4, ' ');
  el0.append(el1);
  return el0;
}

/**
 * @param {DOM} dom
 */
function createTopbarComponent(dom) {
  const el0 = dom.document().createDocumentFragment();
  const el1 = dom.createElement('style');
  el1.append('\n    .lh-topbar {\n      position: sticky;\n      top: 0;\n      left: 0;\n      right: 0;\n      z-index: 1000;\n      display: flex;\n      align-items: center;\n      height: var(--topbar-height);\n      background-color: var(--topbar-background-color);\n      padding: var(--topbar-padding);\n    }\n\n    .lh-topbar__logo {\n      width: var(--topbar-logo-size);\n      height: var(--topbar-logo-size);\n      user-select: none;\n      flex: none;\n    }\n\n    .lh-topbar__url {\n      margin: var(--topbar-padding);\n      text-decoration: none;\n      color: var(--report-text-color);\n      text-overflow: ellipsis;\n      overflow: hidden;\n      white-space: nowrap;\n    }\n\n    .lh-tools {\n      margin-left: auto;\n      will-change: transform;\n      min-width: var(--report-icon-size);\n    }\n    .lh-tools__button {\n      width: var(--report-icon-size);\n      height: var(--report-icon-size);\n      cursor: pointer;\n      margin-right: 5px;\n      /* This is actually a button element, but we want to style it like a transparent div. */\n      display: flex;\n      background: none;\n      color: inherit;\n      border: none;\n      padding: 0;\n      font: inherit;\n      outline: inherit;\n    }\n    .lh-tools__button svg {\n      fill: var(--tools-icon-color);\n    }\n    .lh-dark .lh-tools__button svg {\n      filter: invert(1);\n    }\n    .lh-tools__button.lh-active + .lh-tools__dropdown {\n      opacity: 1;\n      clip: rect(-1px, 194px, 242px, -3px);\n      visibility: visible;\n    }\n    .lh-tools__dropdown {\n      position: absolute;\n      background-color: var(--report-background-color);\n      border: 1px solid var(--report-border-color);\n      border-radius: 3px;\n      padding: calc(var(--default-padding) / 2) 0;\n      cursor: pointer;\n      top: 36px;\n      right: 0;\n      box-shadow: 1px 1px 3px #ccc;\n      min-width: 125px;\n      clip: rect(0, 164px, 0, 0);\n      visibility: hidden;\n      opacity: 0;\n      transition: all 200ms cubic-bezier(0,0,0.2,1);\n    }\n    .lh-tools__dropdown a {\n      color: currentColor;\n      text-decoration: none;\n      white-space: nowrap;\n      padding: 0 12px;\n      line-height: 2;\n    }\n    .lh-tools__dropdown a:hover,\n    .lh-tools__dropdown a:focus {\n      background-color: var(--color-gray-200);\n      outline: none;\n    }\n    /* save-gist option hidden in report. */\n    .lh-tools__dropdown a[data-action=\'save-gist\'] {\n      display: none;\n    }\n\n    @media screen and (max-width: 964px) {\n      .lh-tools__dropdown {\n        right: 0;\n        left: initial;\n      }\n    }\n    @media print {\n      .lh-topbar {\n        position: static;\n        margin-left: 0;\n      }\n\n      .lh-tools__dropdown {\n        display: none;\n      }\n    }\n  ');
  el0.append(el1);
  const el2 = dom.createElement('div', 'lh-topbar');
  const el3 = dom.createElementNS('http://www.w3.org/2000/svg', 'svg', 'lh-topbar__logo');
  el3.setAttribute('viewBox', '0 0 24 24');
  const el4 = dom.createElementNS('http://www.w3.org/2000/svg', 'defs');
  const el5 = dom.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
  el5.setAttribute('x1', '57.456%');
  el5.setAttribute('y1', '13.086%');
  el5.setAttribute('x2', '18.259%');
  el5.setAttribute('y2', '72.322%');
  el5.setAttribute('id', 'lh-topbar__logo--a');
  const el6 = dom.createElementNS('http://www.w3.org/2000/svg', 'stop');
  el6.setAttribute('stop-color', '#262626');
  el6.setAttribute('stop-opacity', '.1');
  el6.setAttribute('offset', '0%');
  const el7 = dom.createElementNS('http://www.w3.org/2000/svg', 'stop');
  el7.setAttribute('stop-color', '#262626');
  el7.setAttribute('stop-opacity', '0');
  el7.setAttribute('offset', '100%');
  el5.append(' ', el6, ' ', el7, ' ');
  const el8 = dom.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
  el8.setAttribute('x1', '100%');
  el8.setAttribute('y1', '50%');
  el8.setAttribute('x2', '0%');
  el8.setAttribute('y2', '50%');
  el8.setAttribute('id', 'lh-topbar__logo--b');
  const el9 = dom.createElementNS('http://www.w3.org/2000/svg', 'stop');
  el9.setAttribute('stop-color', '#262626');
  el9.setAttribute('stop-opacity', '.1');
  el9.setAttribute('offset', '0%');
  const el10 = dom.createElementNS('http://www.w3.org/2000/svg', 'stop');
  el10.setAttribute('stop-color', '#262626');
  el10.setAttribute('stop-opacity', '0');
  el10.setAttribute('offset', '100%');
  el8.append(' ', el9, ' ', el10, ' ');
  const el11 = dom.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
  el11.setAttribute('x1', '58.764%');
  el11.setAttribute('y1', '65.756%');
  el11.setAttribute('x2', '36.939%');
  el11.setAttribute('y2', '50.14%');
  el11.setAttribute('id', 'lh-topbar__logo--c');
  const el12 = dom.createElementNS('http://www.w3.org/2000/svg', 'stop');
  el12.setAttribute('stop-color', '#262626');
  el12.setAttribute('stop-opacity', '.1');
  el12.setAttribute('offset', '0%');
  const el13 = dom.createElementNS('http://www.w3.org/2000/svg', 'stop');
  el13.setAttribute('stop-color', '#262626');
  el13.setAttribute('stop-opacity', '0');
  el13.setAttribute('offset', '100%');
  el11.append(' ', el12, ' ', el13, ' ');
  const el14 = dom.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
  el14.setAttribute('x1', '41.635%');
  el14.setAttribute('y1', '20.358%');
  el14.setAttribute('x2', '72.863%');
  el14.setAttribute('y2', '85.424%');
  el14.setAttribute('id', 'lh-topbar__logo--d');
  const el15 = dom.createElementNS('http://www.w3.org/2000/svg', 'stop');
  el15.setAttribute('stop-color', '#FFF');
  el15.setAttribute('stop-opacity', '.1');
  el15.setAttribute('offset', '0%');
  const el16 = dom.createElementNS('http://www.w3.org/2000/svg', 'stop');
  el16.setAttribute('stop-color', '#FFF');
  el16.setAttribute('stop-opacity', '0');
  el16.setAttribute('offset', '100%');
  el14.append(' ', el15, ' ', el16, ' ');
  el4.append(' ', el5, ' ', el8, ' ', el11, ' ', el14, ' ');
  const el17 = dom.createElementNS('http://www.w3.org/2000/svg', 'g');
  el17.setAttribute('fill', 'none');
  el17.setAttribute('fill-rule', 'evenodd');
  const el18 = dom.createElementNS('http://www.w3.org/2000/svg', 'path');
  el18.setAttribute('d', 'M12 3l4.125 2.625v3.75H18v2.25h-1.688l1.5 9.375H6.188l1.5-9.375H6v-2.25h1.875V5.648L12 3zm2.201 9.938L9.54 14.633 9 18.028l5.625-2.062-.424-3.028zM12.005 5.67l-1.88 1.207v2.498h3.75V6.86l-1.87-1.19z');
  el18.setAttribute('fill', '#F44B21');
  const el19 = dom.createElementNS('http://www.w3.org/2000/svg', 'path');
  el19.setAttribute('fill', '#FFF');
  el19.setAttribute('d', 'M14.201 12.938L9.54 14.633 9 18.028l5.625-2.062z');
  const el20 = dom.createElementNS('http://www.w3.org/2000/svg', 'path');
  el20.setAttribute('d', 'M6 18c-2.042 0-3.95-.01-5.813 0l1.5-9.375h4.326L6 18z');
  el20.setAttribute('fill', 'url(#lh-topbar__logo--a)');
  el20.setAttribute('fill-rule', 'nonzero');
  el20.setAttribute('transform', 'translate(6 3)');
  const el21 = dom.createElementNS('http://www.w3.org/2000/svg', 'path');
  el21.setAttribute('fill', '#FFF176');
  el21.setAttribute('fill-rule', 'nonzero');
  el21.setAttribute('d', 'M13.875 9.375v-2.56l-1.87-1.19-1.88 1.207v2.543z');
  const el22 = dom.createElementNS('http://www.w3.org/2000/svg', 'path');
  el22.setAttribute('fill', 'url(#lh-topbar__logo--b)');
  el22.setAttribute('fill-rule', 'nonzero');
  el22.setAttribute('d', 'M0 6.375h6v2.25H0z');
  el22.setAttribute('transform', 'translate(6 3)');
  const el23 = dom.createElementNS('http://www.w3.org/2000/svg', 'path');
  el23.setAttribute('fill', 'url(#lh-topbar__logo--c)');
  el23.setAttribute('fill-rule', 'nonzero');
  el23.setAttribute('d', 'M6 6.375H1.875v-3.75L6 0z');
  el23.setAttribute('transform', 'translate(6 3)');
  const el24 = dom.createElementNS('http://www.w3.org/2000/svg', 'path');
  el24.setAttribute('fill', 'url(#lh-topbar__logo--d)');
  el24.setAttribute('fill-rule', 'nonzero');
  el24.setAttribute('d', 'M6 0l4.125 2.625v3.75H12v2.25h-1.688l1.5 9.375H.188l1.5-9.375H0v-2.25h1.875V2.648z');
  el24.setAttribute('transform', 'translate(6 3)');
  el17.append(' ', el18, ' ', el19, ' ', el20, ' ', el21, ' ', el22, ' ', el23, ' ', el24, ' ');
  el3.append(' ', el4, ' ', el17, ' ');
  const el25 = dom.createElement('a', 'lh-topbar__url');
  el25.setAttribute('href', '');
  el25.setAttribute('target', '_blank');
  el25.setAttribute('rel', 'noopener');
  const el26 = dom.createElement('div', 'lh-tools');
  const el27 = dom.createElement('button', 'lh-tools__button');
  el27.setAttribute('id', 'lh-tools-button');
  el27.setAttribute('title', 'Tools menu');
  el27.setAttribute('aria-label', 'Toggle report tools menu');
  el27.setAttribute('aria-haspopup', 'menu');
  el27.setAttribute('aria-expanded', 'false');
  el27.setAttribute('aria-controls', 'lh-tools-dropdown');
  const el28 = dom.createElementNS('http://www.w3.org/2000/svg', 'svg');
  el28.setAttribute('width', '100%');
  el28.setAttribute('height', '100%');
  el28.setAttribute('viewBox', '0 0 24 24');
  const el29 = dom.createElementNS('http://www.w3.org/2000/svg', 'path');
  el29.setAttribute('d', 'M0 0h24v24H0z');
  el29.setAttribute('fill', 'none');
  const el30 = dom.createElementNS('http://www.w3.org/2000/svg', 'path');
  el30.setAttribute('d', 'M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z');
  el28.append(' ', el29, ' ', el30, ' ');
  el27.append(' ', el28, ' ');
  const el31 = dom.createElement('div', 'lh-tools__dropdown');
  el31.setAttribute('id', 'lh-tools-dropdown');
  el31.setAttribute('role', 'menu');
  el31.setAttribute('aria-labelledby', 'lh-tools-button');
  const el32 = dom.createElement('a', 'lh-report-icon lh-report-icon--print');
  el32.setAttribute('role', 'menuitem');
  el32.setAttribute('tabindex', '-1');
  el32.setAttribute('href', '#');
  el32.setAttribute('data-i18n', 'dropdownPrintSummary');
  el32.setAttribute('data-action', 'print-summary');
  const el33 = dom.createElement('a', 'lh-report-icon lh-report-icon--print');
  el33.setAttribute('role', 'menuitem');
  el33.setAttribute('tabindex', '-1');
  el33.setAttribute('href', '#');
  el33.setAttribute('data-i18n', 'dropdownPrintExpanded');
  el33.setAttribute('data-action', 'print-expanded');
  const el34 = dom.createElement('a', 'lh-report-icon lh-report-icon--copy');
  el34.setAttribute('role', 'menuitem');
  el34.setAttribute('tabindex', '-1');
  el34.setAttribute('href', '#');
  el34.setAttribute('data-i18n', 'dropdownCopyJSON');
  el34.setAttribute('data-action', 'copy');
  const el35 = dom.createElement('a', 'lh-report-icon lh-report-icon--download');
  el35.setAttribute('role', 'menuitem');
  el35.setAttribute('tabindex', '-1');
  el35.setAttribute('href', '#');
  el35.setAttribute('data-i18n', 'dropdownSaveHTML');
  el35.setAttribute('data-action', 'save-html');
  const el36 = dom.createElement('a', 'lh-report-icon lh-report-icon--download');
  el36.setAttribute('role', 'menuitem');
  el36.setAttribute('tabindex', '-1');
  el36.setAttribute('href', '#');
  el36.setAttribute('data-i18n', 'dropdownSaveJSON');
  el36.setAttribute('data-action', 'save-json');
  const el37 = dom.createElement('a', 'lh-report-icon lh-report-icon--open');
  el37.setAttribute('role', 'menuitem');
  el37.setAttribute('tabindex', '-1');
  el37.setAttribute('href', '#');
  el37.setAttribute('data-i18n', 'dropdownViewer');
  el37.setAttribute('data-action', 'open-viewer');
  const el38 = dom.createElement('a', 'lh-report-icon lh-report-icon--open');
  el38.setAttribute('role', 'menuitem');
  el38.setAttribute('tabindex', '-1');
  el38.setAttribute('href', '#');
  el38.setAttribute('data-i18n', 'dropdownSaveGist');
  el38.setAttribute('data-action', 'save-gist');
  const el39 = dom.createElement('a', 'lh-report-icon lh-report-icon--dark');
  el39.setAttribute('role', 'menuitem');
  el39.setAttribute('tabindex', '-1');
  el39.setAttribute('href', '#');
  el39.setAttribute('data-i18n', 'dropdownDarkTheme');
  el39.setAttribute('data-action', 'toggle-dark');
  el31.append(' ', el32, ' ', el33, ' ', el34, ' ', el35, ' ', el36, ' ', el37, ' ', el38, ' ', el39, ' ');
  el26.append(' ', el27, ' ', el31, ' ');
  el2.append(' ', ' ', el3, ' ', el25, ' ', el26, ' ');
  el0.append(el2);
  return el0;
}

/**
 * @param {DOM} dom
 */
function createWarningsToplevelComponent(dom) {
  const el0 = dom.document().createDocumentFragment();
  const el1 = dom.createElement('div', 'lh-warnings lh-warnings--toplevel');
  const el2 = dom.createElement('p', 'lh-warnings__msg');
  const el3 = dom.createElement('ul');
  el1.append(' ', el2, ' ', el3, ' ');
  el0.append(el1);
  return el0;
}


/** @typedef {'3pFilter'|'audit'|'categoryHeader'|'chevron'|'clump'|'crc'|'crcChain'|'elementScreenshot'|'envItem'|'footer'|'fraction'|'gauge'|'gaugePwa'|'heading'|'metric'|'metricsToggle'|'opportunity'|'opportunityHeader'|'scorescale'|'scoresWrapper'|'snippet'|'snippetContent'|'snippetHeader'|'snippetLine'|'topbar'|'warningsToplevel'} ComponentName */
/**
 * @param {DOM} dom
 * @param {ComponentName} componentName
 * @return {DocumentFragment}
 */
function createComponent(dom, componentName) {
  switch (componentName) {
    case '3pFilter': return create3pFilterComponent(dom);
    case 'audit': return createAuditComponent(dom);
    case 'categoryHeader': return createCategoryHeaderComponent(dom);
    case 'chevron': return createChevronComponent(dom);
    case 'clump': return createClumpComponent(dom);
    case 'crc': return createCrcComponent(dom);
    case 'crcChain': return createCrcChainComponent(dom);
    case 'elementScreenshot': return createElementScreenshotComponent(dom);
    case 'envItem': return createEnvItemComponent(dom);
    case 'footer': return createFooterComponent(dom);
    case 'fraction': return createFractionComponent(dom);
    case 'gauge': return createGaugeComponent(dom);
    case 'gaugePwa': return createGaugePwaComponent(dom);
    case 'heading': return createHeadingComponent(dom);
    case 'metric': return createMetricComponent(dom);
    case 'metricsToggle': return createMetricsToggleComponent(dom);
    case 'opportunity': return createOpportunityComponent(dom);
    case 'opportunityHeader': return createOpportunityHeaderComponent(dom);
    case 'scorescale': return createScorescaleComponent(dom);
    case 'scoresWrapper': return createScoresWrapperComponent(dom);
    case 'snippet': return createSnippetComponent(dom);
    case 'snippetContent': return createSnippetContentComponent(dom);
    case 'snippetHeader': return createSnippetHeaderComponent(dom);
    case 'snippetLine': return createSnippetLineComponent(dom);
    case 'topbar': return createTopbarComponent(dom);
    case 'warningsToplevel': return createWarningsToplevelComponent(dom);
  }
  throw new Error('unexpected component: ' + componentName);
}

/**
 * @license
 * Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

class DOM {
  /**
   * @param {Document} document
   */
  constructor(document) {
    /** @type {Document} */
    this._document = document;
    /** @type {string} */
    this._lighthouseChannel = 'unknown';
    /** @type {Map<string, DocumentFragment>} */
    this._componentCache = new Map();
  }

  /**
   * @template {string} T
   * @param {T} name
   * @param {string=} className
   * @return {HTMLElementByTagName[T]}
   */
  createElement(name, className) {
    const element = this._document.createElement(name);
    if (className) {
      for (const token of className.split(/\s+/)) {
        if (token) element.classList.add(token);
      }
    }
    return element;
  }

  /**
   * @param {string} namespaceURI
   * @param {string} name
   * @param {string=} className
   * @return {Element}
   */
  createElementNS(namespaceURI, name, className) {
    const element = this._document.createElementNS(namespaceURI, name);
    if (className) {
      for (const token of className.split(/\s+/)) {
        if (token) element.classList.add(token);
      }
    }
    return element;
  }

  /**
   * @return {!DocumentFragment}
   */
  createFragment() {
    return this._document.createDocumentFragment();
  }

  /**
   * @template {string} T
   * @param {Element} parentElem
   * @param {T} elementName
   * @param {string=} className
   * @return {HTMLElementByTagName[T]}
   */
  createChildOf(parentElem, elementName, className) {
    const element = this.createElement(elementName, className);
    parentElem.appendChild(element);
    return element;
  }

  /**
   * @param {import('./components.js').ComponentName} componentName
   * @return {!DocumentFragment} A clone of the cached component.
   */
  createComponent(componentName) {
    let component = this._componentCache.get(componentName);
    if (component) {
      const cloned = /** @type {DocumentFragment} */ (component.cloneNode(true));
      // Prevent duplicate styles in the DOM. After a template has been stamped
      // for the first time, remove the clone's styles so they're not re-added.
      this.findAll('style', cloned).forEach(style => style.remove());
      return cloned;
    }

    component = createComponent(this, componentName);
    this._componentCache.set(componentName, component);
    const cloned = /** @type {DocumentFragment} */ (component.cloneNode(true));
    return cloned;
  }

  clearComponentCache() {
    this._componentCache.clear();
  }

  /**
   * @param {string} text
   * @return {Element}
   */
  convertMarkdownLinkSnippets(text) {
    const element = this.createElement('span');

    for (const segment of Util.splitMarkdownLink(text)) {
      if (!segment.isLink) {
        // Plain text segment.
        element.appendChild(this._document.createTextNode(segment.text));
        continue;
      }

      // Otherwise, append any links found.
      const url = new URL(segment.linkHref);

      const DOCS_ORIGINS = ['https://developers.google.com', 'https://web.dev'];
      if (DOCS_ORIGINS.includes(url.origin)) {
        url.searchParams.set('utm_source', 'lighthouse');
        url.searchParams.set('utm_medium', this._lighthouseChannel);
      }

      const a = this.createElement('a');
      a.rel = 'noopener';
      a.target = '_blank';
      a.textContent = segment.text;
      this.safelySetHref(a, url.href);
      element.appendChild(a);
    }

    return element;
  }

  /**
   * Set link href, but safely, preventing `javascript:` protocol, etc.
   * @see https://github.com/google/safevalues/
   * @param {HTMLAnchorElement} elem
   * @param {string} url
   */
  safelySetHref(elem, url) {
    // Defaults to '' to fix proto roundtrip issue. See https://github.com/GoogleChrome/lighthouse/issues/12868
    url = url || '';

    // In-page anchor links are safe.
    if (url.startsWith('#')) {
      elem.href = url;
      return;
    }

    const allowedProtocols = ['https:', 'http:'];
    let parsed;
    try {
      parsed = new URL(url);
    } catch (_) {}

    if (parsed && allowedProtocols.includes(parsed.protocol)) {
      elem.href = parsed.href;
    }
  }

  /**
   * Only create blob URLs for JSON & HTML
   * @param {HTMLAnchorElement} elem
   * @param {Blob} blob
   */
  safelySetBlobHref(elem, blob) {
    if (blob.type !== 'text/html' && blob.type !== 'application/json') {
      throw new Error('Unsupported blob type');
    }
    const href = URL.createObjectURL(blob);
    elem.href = href;
  }

  /**
   * @param {string} markdownText
   * @return {Element}
   */
  convertMarkdownCodeSnippets(markdownText) {
    const element = this.createElement('span');

    for (const segment of Util.splitMarkdownCodeSpans(markdownText)) {
      if (segment.isCode) {
        const pre = this.createElement('code');
        pre.textContent = segment.text;
        element.appendChild(pre);
      } else {
        element.appendChild(this._document.createTextNode(segment.text));
      }
    }

    return element;
  }

  /**
   * The channel to use for UTM data when rendering links to the documentation.
   * @param {string} lighthouseChannel
   */
  setLighthouseChannel(lighthouseChannel) {
    this._lighthouseChannel = lighthouseChannel;
  }

  /**
   * @return {Document}
   */
  document() {
    return this._document;
  }

  /**
   * TODO(paulirish): import and conditionally apply the DevTools frontend subclasses instead of this
   * @return {boolean}
   */
  isDevTools() {
    return !!this._document.querySelector('.lh-devtools');
  }

  /**
   * Guaranteed context.querySelector. Always returns an element or throws if
   * nothing matches query.
   * @template {string} T
   * @param {T} query
   * @param {ParentNode} context
   * @return {ParseSelector<T>}
   */
  find(query, context) {
    const result = context.querySelector(query);
    if (result === null) {
      throw new Error(`query ${query} not found`);
    }

    // Because we control the report layout and templates, use the simpler
    // `typed-query-selector` types that don't require differentiating between
    // e.g. HTMLAnchorElement and SVGAElement. See https://github.com/GoogleChrome/lighthouse/issues/12011
    return /** @type {ParseSelector<T>} */ (result);
  }

  /**
   * Helper for context.querySelectorAll. Returns an Array instead of a NodeList.
   * @template {string} T
   * @param {T} query
   * @param {ParentNode} context
   */
  findAll(query, context) {
    const elements = Array.from(context.querySelectorAll(query));
    return elements;
  }

  /**
   * Fires a custom DOM event on target.
   * @param {string} name Name of the event.
   * @param {Node=} target DOM node to fire the event on.
   * @param {*=} detail Custom data to include.
   */
  fireEventOn(name, target = this._document, detail) {
    const event = new CustomEvent(name, detail ? {detail} : undefined);
    target.dispatchEvent(event);
  }
}

/**
 * @license
 * Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

class CategoryRenderer {
  /**
   * @param {DOM} dom
   * @param {DetailsRenderer} detailsRenderer
   */
  constructor(dom, detailsRenderer) {
    /** @type {DOM} */
    this.dom = dom;
    /** @type {DetailsRenderer} */
    this.detailsRenderer = detailsRenderer;
  }

  /**
   * Display info per top-level clump. Define on class to avoid race with Util init.
   */
  get _clumpTitles() {
    return {
      warning: Util.i18n.strings.warningAuditsGroupTitle,
      manual: Util.i18n.strings.manualAuditsGroupTitle,
      passed: Util.i18n.strings.passedAuditsGroupTitle,
      notApplicable: Util.i18n.strings.notApplicableAuditsGroupTitle,
    };
  }

  /**
   * @param {LH.ReportResult.AuditRef} audit
   * @return {Element}
   */
  renderAudit(audit) {
    const component = this.dom.createComponent('audit');
    return this.populateAuditValues(audit, component);
  }

  /**
   * Populate an DOM tree with audit details. Used by renderAudit and renderOpportunity
   * @param {LH.ReportResult.AuditRef} audit
   * @param {DocumentFragment} component
   * @return {!Element}
   */
  populateAuditValues(audit, component) {
    const strings = Util.i18n.strings;
    const auditEl = this.dom.find('.lh-audit', component);
    auditEl.id = audit.result.id;
    const scoreDisplayMode = audit.result.scoreDisplayMode;

    if (audit.result.displayValue) {
      this.dom.find('.lh-audit__display-text', auditEl).textContent = audit.result.displayValue;
    }

    const titleEl = this.dom.find('.lh-audit__title', auditEl);
    titleEl.appendChild(this.dom.convertMarkdownCodeSnippets(audit.result.title));
    const descEl = this.dom.find('.lh-audit__description', auditEl);
    descEl.appendChild(this.dom.convertMarkdownLinkSnippets(audit.result.description));

    for (const relevantMetric of audit.relevantMetrics || []) {
      const adornEl = this.dom.createChildOf(descEl, 'span', 'lh-audit__adorn');
      adornEl.title = `Relevant to ${relevantMetric.result.title}`;
      adornEl.textContent = relevantMetric.acronym || relevantMetric.id;
    }

    if (audit.stackPacks) {
      audit.stackPacks.forEach(pack => {
        const packElm = this.dom.createElement('div');
        packElm.classList.add('lh-audit__stackpack');

        const packElmImg = this.dom.createElement('img');
        packElmImg.classList.add('lh-audit__stackpack__img');
        packElmImg.src = pack.iconDataURL;
        packElmImg.alt = pack.title;
        packElm.appendChild(packElmImg);

        packElm.appendChild(this.dom.convertMarkdownLinkSnippets(pack.description));

        this.dom.find('.lh-audit__stackpacks', auditEl)
          .appendChild(packElm);
      });
    }

    const header = this.dom.find('details', auditEl);
    if (audit.result.details) {
      const elem = this.detailsRenderer.render(audit.result.details);
      if (elem) {
        elem.classList.add('lh-details');
        header.appendChild(elem);
      }
    }

    // Add chevron SVG to the end of the summary
    this.dom.find('.lh-chevron-container', auditEl).appendChild(this._createChevron());
    this._setRatingClass(auditEl, audit.result.score, scoreDisplayMode);

    if (audit.result.scoreDisplayMode === 'error') {
      auditEl.classList.add(`lh-audit--error`);
      const textEl = this.dom.find('.lh-audit__display-text', auditEl);
      textEl.textContent = strings.errorLabel;
      textEl.classList.add('lh-tooltip-boundary');
      const tooltip = this.dom.createChildOf(textEl, 'div', 'lh-tooltip lh-tooltip--error');
      tooltip.textContent = audit.result.errorMessage || strings.errorMissingAuditInfo;
    } else if (audit.result.explanation) {
      const explEl = this.dom.createChildOf(titleEl, 'div', 'lh-audit-explanation');
      explEl.textContent = audit.result.explanation;
    }
    const warnings = audit.result.warnings;
    if (!warnings || warnings.length === 0) return auditEl;

    // Add list of warnings or singular warning
    const summaryEl = this.dom.find('summary', header);
    const warningsEl = this.dom.createChildOf(summaryEl, 'div', 'lh-warnings');
    this.dom.createChildOf(warningsEl, 'span').textContent = strings.warningHeader;
    if (warnings.length === 1) {
      warningsEl.appendChild(this.dom.document().createTextNode(warnings.join('')));
    } else {
      const warningsUl = this.dom.createChildOf(warningsEl, 'ul');
      for (const warning of warnings) {
        const item = this.dom.createChildOf(warningsUl, 'li');
        item.textContent = warning;
      }
    }
    return auditEl;
  }

  /**
   * @return {Element}
   */
  _createChevron() {
    const component = this.dom.createComponent('chevron');
    const chevronEl = this.dom.find('svg.lh-chevron', component);
    return chevronEl;
  }

  /**
   * @param {Element} element DOM node to populate with values.
   * @param {number|null} score
   * @param {string} scoreDisplayMode
   * @return {!Element}
   */
  _setRatingClass(element, score, scoreDisplayMode) {
    const rating = Util.calculateRating(score, scoreDisplayMode);
    element.classList.add(`lh-audit--${scoreDisplayMode.toLowerCase()}`);
    if (scoreDisplayMode !== 'informative') {
      element.classList.add(`lh-audit--${rating}`);
    }
    return element;
  }

  /**
   * @param {LH.ReportResult.Category} category
   * @param {Record<string, LH.Result.ReportGroup>} groupDefinitions
   * @param {{gatherMode: LH.Result.GatherMode}=} options
   * @return {DocumentFragment}
   */
  renderCategoryHeader(category, groupDefinitions, options) {
    const component = this.dom.createComponent('categoryHeader');

    const gaugeContainerEl = this.dom.find('.lh-score__gauge', component);
    const gaugeEl = this.renderCategoryScore(category, groupDefinitions, options);
    gaugeContainerEl.appendChild(gaugeEl);

    if (category.description) {
      const descEl = this.dom.convertMarkdownLinkSnippets(category.description);
      this.dom.find('.lh-category-header__description', component).appendChild(descEl);
    }

    return component;
  }

  /**
   * Renders the group container for a group of audits. Individual audit elements can be added
   * directly to the returned element.
   * @param {LH.Result.ReportGroup} group
   * @return {Element}
   */
  renderAuditGroup(group) {
    const groupEl = this.dom.createElement('div', 'lh-audit-group');

    const auditGroupHeader = this.dom.createElement('div', 'lh-audit-group__header');

    this.dom.createChildOf(auditGroupHeader, 'span', 'lh-audit-group__title')
      .textContent = group.title;
    if (group.description) {
      const descriptionEl = this.dom.convertMarkdownLinkSnippets(group.description);
      descriptionEl.classList.add('lh-audit-group__description');
      auditGroupHeader.appendChild(descriptionEl);
    }
    groupEl.appendChild(auditGroupHeader);

    return groupEl;
  }

  /**
   * Takes an array of auditRefs, groups them if requested, then returns an
   * array of audit and audit-group elements.
   * @param {Array<LH.ReportResult.AuditRef>} auditRefs
   * @param {Object<string, LH.Result.ReportGroup>} groupDefinitions
   * @return {Array<Element>}
   */
  _renderGroupedAudits(auditRefs, groupDefinitions) {
    // Audits grouped by their group (or under notAGroup).
    /** @type {Map<string, Array<LH.ReportResult.AuditRef>>} */
    const grouped = new Map();

    // Add audits without a group first so they will appear first.
    const notAGroup = 'NotAGroup';
    grouped.set(notAGroup, []);

    for (const auditRef of auditRefs) {
      const groupId = auditRef.group || notAGroup;
      const groupAuditRefs = grouped.get(groupId) || [];
      groupAuditRefs.push(auditRef);
      grouped.set(groupId, groupAuditRefs);
    }

    /** @type {Array<Element>} */
    const auditElements = [];

    for (const [groupId, groupAuditRefs] of grouped) {
      if (groupId === notAGroup) {
        // Push not-grouped audits individually.
        for (const auditRef of groupAuditRefs) {
          auditElements.push(this.renderAudit(auditRef));
        }
        continue;
      }

      // Push grouped audits as a group.
      const groupDef = groupDefinitions[groupId];
      const auditGroupElem = this.renderAuditGroup(groupDef);
      for (const auditRef of groupAuditRefs) {
        auditGroupElem.appendChild(this.renderAudit(auditRef));
      }
      auditGroupElem.classList.add(`lh-audit-group--${groupId}`);
      auditElements.push(auditGroupElem);
    }

    return auditElements;
  }

  /**
   * Take a set of audits, group them if they have groups, then render in a top-level
   * clump that can't be expanded/collapsed.
   * @param {Array<LH.ReportResult.AuditRef>} auditRefs
   * @param {Object<string, LH.Result.ReportGroup>} groupDefinitions
   * @return {Element}
   */
  renderUnexpandableClump(auditRefs, groupDefinitions) {
    const clumpElement = this.dom.createElement('div');
    const elements = this._renderGroupedAudits(auditRefs, groupDefinitions);
    elements.forEach(elem => clumpElement.appendChild(elem));
    return clumpElement;
  }

  /**
   * Take a set of audits and render in a top-level, expandable clump that starts
   * in a collapsed state.
   * @param {Exclude<TopLevelClumpId, 'failed'>} clumpId
   * @param {{auditRefs: Array<LH.ReportResult.AuditRef>, description?: string}} clumpOpts
   * @return {!Element}
   */
  renderClump(clumpId, {auditRefs, description}) {
    const clumpComponent = this.dom.createComponent('clump');
    const clumpElement = this.dom.find('.lh-clump', clumpComponent);

    if (clumpId === 'warning') {
      clumpElement.setAttribute('open', '');
    }

    const summaryInnerEl = this.dom.find('div.lh-audit-group__summary', clumpElement);
    summaryInnerEl.appendChild(this._createChevron());

    const headerEl = this.dom.find('.lh-audit-group__header', clumpElement);
    const title = this._clumpTitles[clumpId];
    this.dom.find('.lh-audit-group__title', headerEl).textContent = title;
    if (description) {
      const descriptionEl = this.dom.convertMarkdownLinkSnippets(description);
      descriptionEl.classList.add('lh-audit-group__description');
      headerEl.appendChild(descriptionEl);
    }

    const itemCountEl = this.dom.find('.lh-audit-group__itemcount', clumpElement);
    itemCountEl.textContent = `(${auditRefs.length})`;

    // Add all audit results to the clump.
    const auditElements = auditRefs.map(this.renderAudit.bind(this));
    clumpElement.append(...auditElements);

    clumpElement.classList.add(`lh-clump--${clumpId.toLowerCase()}`);
    return clumpElement;
  }

  /**
   * @param {LH.ReportResult.Category} category
   * @param {Record<string, LH.Result.ReportGroup>} groupDefinitions
   * @param {{gatherMode: LH.Result.GatherMode}=} options
   * @return {DocumentFragment}
   */
  renderCategoryScore(category, groupDefinitions, options) {
    if (options && (options.gatherMode === 'snapshot' || options.gatherMode === 'timespan')) {
      return this.renderCategoryFraction(category);
    }
    return this.renderScoreGauge(category, groupDefinitions);
  }

  /**
   * @param {LH.ReportResult.Category} category
   * @param {Record<string, LH.Result.ReportGroup>} groupDefinitions
   * @return {DocumentFragment}
   */
  renderScoreGauge(category, groupDefinitions) { // eslint-disable-line no-unused-vars
    const tmpl = this.dom.createComponent('gauge');
    const wrapper = this.dom.find('a.lh-gauge__wrapper', tmpl);
    this.dom.safelySetHref(wrapper, `#${category.id}`);

    if (Util.isPluginCategory(category.id)) {
      wrapper.classList.add('lh-gauge__wrapper--plugin');
    }

    // Cast `null` to 0
    const numericScore = Number(category.score);
    const gauge = this.dom.find('.lh-gauge', tmpl);
    const gaugeArc = this.dom.find('circle.lh-gauge-arc', gauge);

    if (gaugeArc) this._setGaugeArc(gaugeArc, numericScore);

    const scoreOutOf100 = Math.round(numericScore * 100);
    const percentageEl = this.dom.find('div.lh-gauge__percentage', tmpl);
    percentageEl.textContent = scoreOutOf100.toString();
    if (category.score === null) {
      percentageEl.textContent = '?';
      percentageEl.title = Util.i18n.strings.errorLabel;
    }

    // Render a numerical score if the category has applicable audits, or no audits whatsoever.
    if (category.auditRefs.length === 0 || this.hasApplicableAudits(category)) {
      wrapper.classList.add(`lh-gauge__wrapper--${Util.calculateRating(category.score)}`);
    } else {
      wrapper.classList.add(`lh-gauge__wrapper--not-applicable`);
      percentageEl.textContent = '-';
      percentageEl.title = Util.i18n.strings.notApplicableAuditsGroupTitle;
    }

    this.dom.find('.lh-gauge__label', tmpl).textContent = category.title;
    return tmpl;
  }

  /**
   * @param {LH.ReportResult.Category} category
   * @return {DocumentFragment}
   */
  renderCategoryFraction(category) {
    const tmpl = this.dom.createComponent('fraction');
    const wrapper = this.dom.find('a.lh-fraction__wrapper', tmpl);
    this.dom.safelySetHref(wrapper, `#${category.id}`);

    const numAudits = category.auditRefs.length;

    let numPassed = 0;
    let totalWeight = 0;
    for (const auditRef of category.auditRefs) {
      totalWeight += auditRef.weight;
      if (Util.showAsPassed(auditRef.result)) numPassed++;
    }

    const fraction = numPassed / numAudits;
    const content = this.dom.find('.lh-fraction__content', tmpl);
    const text = this.dom.createElement('span');
    text.textContent = `${numPassed}/${numAudits}`;
    content.appendChild(text);

    let rating = Util.calculateRating(fraction);

    // If none of the available audits can affect the score, a rating isn't useful.
    // The flow report should display the fraction with neutral icon and coloring in this case.
    if (totalWeight === 0) {
      rating = 'null';
    }

    wrapper.classList.add(`lh-fraction__wrapper--${rating}`);

    this.dom.find('.lh-fraction__label', tmpl).textContent = category.title;
    return tmpl;
  }

  /**
   * Returns true if an LH category has any non-"notApplicable" audits.
   * @param {LH.ReportResult.Category} category
   * @return {boolean}
   */
  hasApplicableAudits(category) {
    return category.auditRefs.some(ref => ref.result.scoreDisplayMode !== 'notApplicable');
  }

  /**
   * Define the score arc of the gauge
   * Credit to xgad for the original technique: https://codepen.io/xgad/post/svg-radial-progress-meters
   * @param {SVGCircleElement} arcElem
   * @param {number} percent
   */
  _setGaugeArc(arcElem, percent) {
    const circumferencePx = 2 * Math.PI * Number(arcElem.getAttribute('r'));
    // The rounded linecap of the stroke extends the arc past its start and end.
    // First, we tweak the -90deg rotation to start exactly at the top of the circle.
    const strokeWidthPx = Number(arcElem.getAttribute('stroke-width'));
    const rotationalAdjustmentPercent = 0.25 * strokeWidthPx / circumferencePx;
    arcElem.style.transform = `rotate(${-90 + rotationalAdjustmentPercent * 360}deg)`;

    // Then, we terminate the line a little early as well.
    let arcLengthPx = percent * circumferencePx - strokeWidthPx / 2;
    // Special cases. No dot for 0, and full ring if 100
    if (percent === 0) arcElem.style.opacity = '0';
    if (percent === 1) arcLengthPx = circumferencePx;

    arcElem.style.strokeDasharray = `${Math.max(arcLengthPx, 0)} ${circumferencePx}`;
  }

  /**
   * @param {LH.ReportResult.AuditRef} audit
   * @return {boolean}
   */
  _auditHasWarning(audit) {
    return Boolean(audit.result.warnings && audit.result.warnings.length);
  }

  /**
   * Returns the id of the top-level clump to put this audit in.
   * @param {LH.ReportResult.AuditRef} auditRef
   * @return {TopLevelClumpId}
   */
  _getClumpIdForAuditRef(auditRef) {
    const scoreDisplayMode = auditRef.result.scoreDisplayMode;
    if (scoreDisplayMode === 'manual' || scoreDisplayMode === 'notApplicable') {
      return scoreDisplayMode;
    }

    if (Util.showAsPassed(auditRef.result)) {
      if (this._auditHasWarning(auditRef)) {
        return 'warning';
      } else {
        return 'passed';
      }
    } else {
      return 'failed';
    }
  }

  /**
   * Renders a set of top level sections (clumps), under a status of failed, warning,
   * manual, passed, or notApplicable. The result ends up something like:
   *
   * failed clump
   *   ├── audit 1 (w/o group)
   *   ├── audit 2 (w/o group)
   *   ├── audit group
   *   |  ├── audit 3
   *   |  └── audit 4
   *   └── audit group
   *      ├── audit 5
   *      └── audit 6
   * other clump (e.g. 'manual')
   *   ├── audit 1
   *   ├── audit 2
   *   ├── …
   *   ⋮
   * @param {LH.ReportResult.Category} category
   * @param {Object<string, LH.Result.ReportGroup>=} groupDefinitions
   * @param {{environment?: 'PSI', gatherMode: LH.Result.GatherMode}=} options
   * @return {Element}
   */
  render(category, groupDefinitions = {}, options) {
    const element = this.dom.createElement('div', 'lh-category');
    this.createPermalinkSpan(element, category.id);
    element.appendChild(this.renderCategoryHeader(category, groupDefinitions, options));

    // Top level clumps for audits, in order they will appear in the report.
    /** @type {Map<TopLevelClumpId, Array<LH.ReportResult.AuditRef>>} */
    const clumps = new Map();
    clumps.set('failed', []);
    clumps.set('warning', []);
    clumps.set('manual', []);
    clumps.set('passed', []);
    clumps.set('notApplicable', []);

    // Sort audits into clumps.
    for (const auditRef of category.auditRefs) {
      const clumpId = this._getClumpIdForAuditRef(auditRef);
      const clump = /** @type {Array<LH.ReportResult.AuditRef>} */ (clumps.get(clumpId)); // already defined
      clump.push(auditRef);
      clumps.set(clumpId, clump);
    }

    // Render each clump.
    for (const [clumpId, auditRefs] of clumps) {
      if (auditRefs.length === 0) continue;

      if (clumpId === 'failed') {
        const clumpElem = this.renderUnexpandableClump(auditRefs, groupDefinitions);
        clumpElem.classList.add(`lh-clump--failed`);
        element.appendChild(clumpElem);
        continue;
      }

      const description = clumpId === 'manual' ? category.manualDescription : undefined;
      const clumpElem = this.renderClump(clumpId, {auditRefs, description});
      element.appendChild(clumpElem);
    }

    return element;
  }

  /**
   * Create a non-semantic span used for hash navigation of categories
   * @param {Element} element
   * @param {string} id
   */
  createPermalinkSpan(element, id) {
    const permalinkEl = this.dom.createChildOf(element, 'span', 'lh-permalink');
    permalinkEl.id = id;
  }
}

/**
 * @license
 * Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

class CriticalRequestChainRenderer {
  /**
   * Create render context for critical-request-chain tree display.
   * @param {LH.Audit.Details.SimpleCriticalRequestNode} tree
   * @return {{tree: LH.Audit.Details.SimpleCriticalRequestNode, startTime: number, transferSize: number}}
   */
  static initTree(tree) {
    let startTime = 0;
    const rootNodes = Object.keys(tree);
    if (rootNodes.length > 0) {
      const node = tree[rootNodes[0]];
      startTime = node.request.startTime;
    }

    return {tree, startTime, transferSize: 0};
  }

  /**
   * Helper to create context for each critical-request-chain node based on its
   * parent. Calculates if this node is the last child, whether it has any
   * children itself and what the tree looks like all the way back up to the root,
   * so the tree markers can be drawn correctly.
   * @param {LH.Audit.Details.SimpleCriticalRequestNode} parent
   * @param {string} id
   * @param {number} startTime
   * @param {number} transferSize
   * @param {Array<boolean>=} treeMarkers
   * @param {boolean=} parentIsLastChild
   * @return {CRCSegment}
   */
  static createSegment(parent, id, startTime, transferSize, treeMarkers, parentIsLastChild) {
    const node = parent[id];
    const siblings = Object.keys(parent);
    const isLastChild = siblings.indexOf(id) === (siblings.length - 1);
    const hasChildren = !!node.children && Object.keys(node.children).length > 0;

    // Copy the tree markers so that we don't change by reference.
    const newTreeMarkers = Array.isArray(treeMarkers) ? treeMarkers.slice(0) : [];

    // Add on the new entry.
    if (typeof parentIsLastChild !== 'undefined') {
      newTreeMarkers.push(!parentIsLastChild);
    }

    return {
      node,
      isLastChild,
      hasChildren,
      startTime,
      transferSize: transferSize + node.request.transferSize,
      treeMarkers: newTreeMarkers,
    };
  }

  /**
   * Creates the DOM for a tree segment.
   * @param {DOM} dom
   * @param {CRCSegment} segment
   * @param {DetailsRenderer} detailsRenderer
   * @return {Node}
   */
  static createChainNode(dom, segment, detailsRenderer) {
    const chainEl = dom.createComponent('crcChain');

    // Hovering over request shows full URL.
    dom.find('.lh-crc-node', chainEl).setAttribute('title', segment.node.request.url);

    const treeMarkeEl = dom.find('.lh-crc-node__tree-marker', chainEl);

    // Construct lines and add spacers for sub requests.
    segment.treeMarkers.forEach(separator => {
      if (separator) {
        treeMarkeEl.appendChild(dom.createElement('span', 'lh-tree-marker lh-vert'));
        treeMarkeEl.appendChild(dom.createElement('span', 'lh-tree-marker'));
      } else {
        treeMarkeEl.appendChild(dom.createElement('span', 'lh-tree-marker'));
        treeMarkeEl.appendChild(dom.createElement('span', 'lh-tree-marker'));
      }
    });

    if (segment.isLastChild) {
      treeMarkeEl.appendChild(dom.createElement('span', 'lh-tree-marker lh-up-right'));
      treeMarkeEl.appendChild(dom.createElement('span', 'lh-tree-marker lh-right'));
    } else {
      treeMarkeEl.appendChild(dom.createElement('span', 'lh-tree-marker lh-vert-right'));
      treeMarkeEl.appendChild(dom.createElement('span', 'lh-tree-marker lh-right'));
    }

    if (segment.hasChildren) {
      treeMarkeEl.appendChild(dom.createElement('span', 'lh-tree-marker lh-horiz-down'));
    } else {
      treeMarkeEl.appendChild(dom.createElement('span', 'lh-tree-marker lh-right'));
    }

    // Fill in url, host, and request size information.
    const url = segment.node.request.url;
    const linkEl = detailsRenderer.renderTextURL(url);
    const treevalEl = dom.find('.lh-crc-node__tree-value', chainEl);
    treevalEl.appendChild(linkEl);

    if (!segment.hasChildren) {
      const {startTime, endTime, transferSize} = segment.node.request;
      const span = dom.createElement('span', 'lh-crc-node__chain-duration');
      span.textContent = ' - ' + Util.i18n.formatMilliseconds((endTime - startTime) * 1000) + ', ';
      const span2 = dom.createElement('span', 'lh-crc-node__chain-duration');
      span2.textContent = Util.i18n.formatBytesToKiB(transferSize, 0.01);

      treevalEl.appendChild(span);
      treevalEl.appendChild(span2);
    }

    return chainEl;
  }

  /**
   * Recursively builds a tree from segments.
   * @param {DOM} dom
   * @param {DocumentFragment} tmpl
   * @param {CRCSegment} segment
   * @param {Element} elem Parent element.
   * @param {LH.Audit.Details.CriticalRequestChain} details
   * @param {DetailsRenderer} detailsRenderer
   */
  static buildTree(dom, tmpl, segment, elem, details, detailsRenderer) {
    elem.appendChild(CRCRenderer.createChainNode(dom, segment, detailsRenderer));
    if (segment.node.children) {
      for (const key of Object.keys(segment.node.children)) {
        const childSegment = CRCRenderer.createSegment(segment.node.children, key,
          segment.startTime, segment.transferSize, segment.treeMarkers, segment.isLastChild);
        CRCRenderer.buildTree(dom, tmpl, childSegment, elem, details, detailsRenderer);
      }
    }
  }

  /**
   * @param {DOM} dom
   * @param {LH.Audit.Details.CriticalRequestChain} details
   * @param {DetailsRenderer} detailsRenderer
   * @return {Element}
   */
  static render(dom, details, detailsRenderer) {
    const tmpl = dom.createComponent('crc');
    const containerEl = dom.find('.lh-crc', tmpl);

    // Fill in top summary.
    dom.find('.lh-crc-initial-nav', tmpl).textContent = Util.i18n.strings.crcInitialNavigation;
    dom.find('.lh-crc__longest_duration_label', tmpl).textContent =
        Util.i18n.strings.crcLongestDurationLabel;
    dom.find('.lh-crc__longest_duration', tmpl).textContent =
        Util.i18n.formatMilliseconds(details.longestChain.duration);

    // Construct visual tree.
    const root = CRCRenderer.initTree(details.chains);
    for (const key of Object.keys(root.tree)) {
      const segment = CRCRenderer.createSegment(root.tree, key, root.startTime, root.transferSize);
      CRCRenderer.buildTree(dom, tmpl, segment, containerEl, details, detailsRenderer);
    }

    return dom.find('.lh-crc-container', tmpl);
  }
}

// Alias b/c the name is really long.
const CRCRenderer = CriticalRequestChainRenderer;

/** @typedef {{
      node: LH.Audit.Details.SimpleCriticalRequestNode[string],
      isLastChild: boolean,
      hasChildren: boolean,
      startTime: number,
      transferSize: number,
      treeMarkers: Array<boolean>
  }} CRCSegment
 */

/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

/** @enum {number} */
const LineVisibility = {
  /** Show regardless of whether the snippet is collapsed or expanded */
  ALWAYS: 0,
  WHEN_COLLAPSED: 1,
  WHEN_EXPANDED: 2,
};

/** @enum {number} */
const LineContentType = {
  /** A line of content */
  CONTENT_NORMAL: 0,
  /** A line of content that's emphasized by setting the CSS background color */
  CONTENT_HIGHLIGHTED: 1,
  /** Use when some lines are hidden, shows the "..." placeholder */
  PLACEHOLDER: 2,
  /** A message about a line of content or the snippet in general */
  MESSAGE: 3,
};

/** @typedef {{
    content: string;
    lineNumber: string | number;
    contentType: LineContentType;
    truncated?: boolean;
    visibility?: LineVisibility;
}} LineDetails */

const classNamesByContentType = {
  [LineContentType.CONTENT_NORMAL]: ['lh-snippet__line--content'],
  [LineContentType.CONTENT_HIGHLIGHTED]: [
    'lh-snippet__line--content',
    'lh-snippet__line--content-highlighted',
  ],
  [LineContentType.PLACEHOLDER]: ['lh-snippet__line--placeholder'],
  [LineContentType.MESSAGE]: ['lh-snippet__line--message'],
};

/**
 * @param {LH.Audit.Details.SnippetValue['lines']} lines
 * @param {number} lineNumber
 * @return {{line?: LH.Audit.Details.SnippetValue['lines'][0], previousLine?: LH.Audit.Details.SnippetValue['lines'][0]}}
 */
function getLineAndPreviousLine(lines, lineNumber) {
  return {
    line: lines.find(l => l.lineNumber === lineNumber),
    previousLine: lines.find(l => l.lineNumber === lineNumber - 1),
  };
}

/**
 * @param {LH.Audit.Details.SnippetValue["lineMessages"]} messages
 * @param {number} lineNumber
 */
function getMessagesForLineNumber(messages, lineNumber) {
  return messages.filter(h => h.lineNumber === lineNumber);
}

/**
 * @param {LH.Audit.Details.SnippetValue} details
 * @return {LH.Audit.Details.SnippetValue['lines']}
 */
function getLinesWhenCollapsed(details) {
  const SURROUNDING_LINES_TO_SHOW_WHEN_COLLAPSED = 2;
  return Util.filterRelevantLines(
    details.lines,
    details.lineMessages,
    SURROUNDING_LINES_TO_SHOW_WHEN_COLLAPSED
  );
}

/**
 * Render snippet of text with line numbers and annotations.
 * By default we only show a few lines around each annotation and the user
 * can click "Expand snippet" to show more.
 * Content lines with annotations are highlighted.
 */
class SnippetRenderer {
  /**
   * @param {DOM} dom
   * @param {LH.Audit.Details.SnippetValue} details
   * @param {DetailsRenderer} detailsRenderer
   * @param {function} toggleExpandedFn
   * @return {DocumentFragment}
   */
  static renderHeader(dom, details, detailsRenderer, toggleExpandedFn) {
    const linesWhenCollapsed = getLinesWhenCollapsed(details);
    const canExpand = linesWhenCollapsed.length < details.lines.length;

    const header = dom.createComponent('snippetHeader');
    dom.find('.lh-snippet__title', header).textContent = details.title;

    const {
      snippetCollapseButtonLabel,
      snippetExpandButtonLabel,
    } = Util.i18n.strings;
    dom.find(
      '.lh-snippet__btn-label-collapse',
      header
    ).textContent = snippetCollapseButtonLabel;
    dom.find(
      '.lh-snippet__btn-label-expand',
      header
    ).textContent = snippetExpandButtonLabel;

    const toggleExpandButton = dom.find('.lh-snippet__toggle-expand', header);
    // If we're already showing all the available lines of the snippet, we don't need an
    // expand/collapse button and can remove it from the DOM.
    // If we leave the button in though, wire up the click listener to toggle visibility!
    if (!canExpand) {
      toggleExpandButton.remove();
    } else {
      toggleExpandButton.addEventListener('click', () => toggleExpandedFn());
    }

    // We only show the source node of the snippet in DevTools because then the user can
    // access the full element detail. Just being able to see the outer HTML isn't very useful.
    if (details.node && dom.isDevTools()) {
      const nodeContainer = dom.find('.lh-snippet__node', header);
      nodeContainer.appendChild(detailsRenderer.renderNode(details.node));
    }

    return header;
  }

  /**
   * Renders a line (text content, message, or placeholder) as a DOM element.
   * @param {DOM} dom
   * @param {DocumentFragment} tmpl
   * @param {LineDetails} lineDetails
   * @return {Element}
   */
  static renderSnippetLine(
      dom,
      tmpl,
      {content, lineNumber, truncated, contentType, visibility}
  ) {
    const clonedTemplate = dom.createComponent('snippetLine');
    const contentLine = dom.find('.lh-snippet__line', clonedTemplate);
    const {classList} = contentLine;

    classNamesByContentType[contentType].forEach(typeClass =>
      classList.add(typeClass)
    );

    if (visibility === LineVisibility.WHEN_COLLAPSED) {
      classList.add('lh-snippet__show-if-collapsed');
    } else if (visibility === LineVisibility.WHEN_EXPANDED) {
      classList.add('lh-snippet__show-if-expanded');
    }

    const lineContent = content + (truncated ? '…' : '');
    const lineContentEl = dom.find('.lh-snippet__line code', contentLine);
    if (contentType === LineContentType.MESSAGE) {
      lineContentEl.appendChild(dom.convertMarkdownLinkSnippets(lineContent));
    } else {
      lineContentEl.textContent = lineContent;
    }

    dom.find(
      '.lh-snippet__line-number',
      contentLine
    ).textContent = lineNumber.toString();

    return contentLine;
  }

  /**
   * @param {DOM} dom
   * @param {DocumentFragment} tmpl
   * @param {{message: string}} message
   * @return {Element}
   */
  static renderMessage(dom, tmpl, message) {
    return SnippetRenderer.renderSnippetLine(dom, tmpl, {
      lineNumber: ' ',
      content: message.message,
      contentType: LineContentType.MESSAGE,
    });
  }

  /**
   * @param {DOM} dom
   * @param {DocumentFragment} tmpl
   * @param {LineVisibility} visibility
   * @return {Element}
   */
  static renderOmittedLinesPlaceholder(dom, tmpl, visibility) {
    return SnippetRenderer.renderSnippetLine(dom, tmpl, {
      lineNumber: '…',
      content: '',
      visibility,
      contentType: LineContentType.PLACEHOLDER,
    });
  }

  /**
   * @param {DOM} dom
   * @param {DocumentFragment} tmpl
   * @param {LH.Audit.Details.SnippetValue} details
   * @return {DocumentFragment}
   */
  static renderSnippetContent(dom, tmpl, details) {
    const template = dom.createComponent('snippetContent');
    const snippetEl = dom.find('.lh-snippet__snippet-inner', template);

    // First render messages that don't belong to specific lines
    details.generalMessages.forEach(m =>
      snippetEl.append(SnippetRenderer.renderMessage(dom, tmpl, m))
    );
    // Then render the lines and their messages, as well as placeholders where lines are omitted
    snippetEl.append(SnippetRenderer.renderSnippetLines(dom, tmpl, details));

    return template;
  }

  /**
   * @param {DOM} dom
   * @param {DocumentFragment} tmpl
   * @param {LH.Audit.Details.SnippetValue} details
   * @return {DocumentFragment}
   */
  static renderSnippetLines(dom, tmpl, details) {
    const {lineMessages, generalMessages, lineCount, lines} = details;
    const linesWhenCollapsed = getLinesWhenCollapsed(details);
    const hasOnlyGeneralMessages =
      generalMessages.length > 0 && lineMessages.length === 0;

    const lineContainer = dom.createFragment();

    // When a line is not shown in the collapsed state we try to see if we also need an
    // omitted lines placeholder for the expanded state, rather than rendering two separate
    // placeholders.
    let hasPendingOmittedLinesPlaceholderForCollapsedState = false;

    for (let lineNumber = 1; lineNumber <= lineCount; lineNumber++) {
      const {line, previousLine} = getLineAndPreviousLine(lines, lineNumber);
      const {
        line: lineWhenCollapsed,
        previousLine: previousLineWhenCollapsed,
      } = getLineAndPreviousLine(linesWhenCollapsed, lineNumber);

      const showLineWhenCollapsed = !!lineWhenCollapsed;
      const showPreviousLineWhenCollapsed = !!previousLineWhenCollapsed;

      // If we went from showing lines in the collapsed state to not showing them
      // we need to render a placeholder
      if (showPreviousLineWhenCollapsed && !showLineWhenCollapsed) {
        hasPendingOmittedLinesPlaceholderForCollapsedState = true;
      }
      // If we are back to lines being visible in the collapsed and the placeholder
      // hasn't been rendered yet then render it now
      if (
        showLineWhenCollapsed &&
        hasPendingOmittedLinesPlaceholderForCollapsedState
      ) {
        lineContainer.append(
          SnippetRenderer.renderOmittedLinesPlaceholder(
            dom,
            tmpl,
            LineVisibility.WHEN_COLLAPSED
          )
        );
        hasPendingOmittedLinesPlaceholderForCollapsedState = false;
      }

      // Render omitted lines placeholder if we have not already rendered one for this gap
      const isFirstOmittedLineWhenExpanded = !line && !!previousLine;
      const isFirstLineOverallAndIsOmittedWhenExpanded =
        !line && lineNumber === 1;
      if (
        isFirstOmittedLineWhenExpanded ||
        isFirstLineOverallAndIsOmittedWhenExpanded
      ) {
        // In the collapsed state we don't show omitted lines placeholders around
        // the edges of the snippet
        const hasRenderedAllLinesVisibleWhenCollapsed = !linesWhenCollapsed.some(
          l => l.lineNumber > lineNumber
        );
        const onlyShowWhenExpanded =
          hasRenderedAllLinesVisibleWhenCollapsed || lineNumber === 1;
        lineContainer.append(
          SnippetRenderer.renderOmittedLinesPlaceholder(
            dom,
            tmpl,
            onlyShowWhenExpanded
              ? LineVisibility.WHEN_EXPANDED
              : LineVisibility.ALWAYS
          )
        );
        hasPendingOmittedLinesPlaceholderForCollapsedState = false;
      }

      if (!line) {
        // Can't render the line if we don't know its content (instead we've rendered a placeholder)
        continue;
      }

      // Now render the line and any messages
      const messages = getMessagesForLineNumber(lineMessages, lineNumber);
      const highlightLine = messages.length > 0 || hasOnlyGeneralMessages;
      const contentLineDetails = Object.assign({}, line, {
        contentType: highlightLine
          ? LineContentType.CONTENT_HIGHLIGHTED
          : LineContentType.CONTENT_NORMAL,
        visibility: lineWhenCollapsed
          ? LineVisibility.ALWAYS
          : LineVisibility.WHEN_EXPANDED,
      });
      lineContainer.append(
        SnippetRenderer.renderSnippetLine(dom, tmpl, contentLineDetails)
      );

      messages.forEach(message => {
        lineContainer.append(SnippetRenderer.renderMessage(dom, tmpl, message));
      });
    }

    return lineContainer;
  }

  /**
   * @param {DOM} dom
   * @param {LH.Audit.Details.SnippetValue} details
   * @param {DetailsRenderer} detailsRenderer
   * @return {!Element}
   */
  static render(dom, details, detailsRenderer) {
    const tmpl = dom.createComponent('snippet');
    const snippetEl = dom.find('.lh-snippet', tmpl);

    const header = SnippetRenderer.renderHeader(
      dom,
      details,
      detailsRenderer,
      () => snippetEl.classList.toggle('lh-snippet--expanded')
    );
    const content = SnippetRenderer.renderSnippetContent(dom, tmpl, details);
    snippetEl.append(header, content);

    return snippetEl;
  }
}

/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

/**
 * @param {LH.Audit.Details.FullPageScreenshot['screenshot']} screenshot
 * @param {LH.Audit.Details.Rect} rect
 * @return {boolean}
 */
function screenshotOverlapsRect(screenshot, rect) {
  return rect.left <= screenshot.width &&
    0 <= rect.right &&
    rect.top <= screenshot.height &&
    0 <= rect.bottom;
}

/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 */
function clamp(value, min, max) {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/**
 * @param {Rect} rect
 */
function getRectCenterPoint(rect) {
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}

class ElementScreenshotRenderer {
  /**
   * Given the location of an element and the sizes of the preview and screenshot,
   * compute the absolute positions (in screenshot coordinate scale) of the screenshot content
   * and the highlighted rect around the element.
   * @param {Rect} elementRectSC
   * @param {Size} elementPreviewSizeSC
   * @param {Size} screenshotSize
   */
  static getScreenshotPositions(elementRectSC, elementPreviewSizeSC, screenshotSize) {
    const elementRectCenter = getRectCenterPoint(elementRectSC);

    // Try to center clipped region.
    const screenshotLeftVisibleEdge = clamp(
      elementRectCenter.x - elementPreviewSizeSC.width / 2,
      0, screenshotSize.width - elementPreviewSizeSC.width
    );
    const screenshotTopVisisbleEdge = clamp(
      elementRectCenter.y - elementPreviewSizeSC.height / 2,
      0, screenshotSize.height - elementPreviewSizeSC.height
    );

    return {
      screenshot: {
        left: screenshotLeftVisibleEdge,
        top: screenshotTopVisisbleEdge,
      },
      clip: {
        left: elementRectSC.left - screenshotLeftVisibleEdge,
        top: elementRectSC.top - screenshotTopVisisbleEdge,
      },
    };
  }

  /**
   * Render a clipPath SVG element to assist marking the element's rect.
   * The elementRect and previewSize are in screenshot coordinate scale.
   * @param {DOM} dom
   * @param {HTMLElement} maskEl
   * @param {{left: number, top: number}} positionClip
   * @param {Rect} elementRect
   * @param {Size} elementPreviewSize
   */
  static renderClipPathInScreenshot(dom, maskEl, positionClip, elementRect, elementPreviewSize) {
    const clipPathEl = dom.find('clipPath', maskEl);
    const clipId = `clip-${Util.getUniqueSuffix()}`;
    clipPathEl.id = clipId;
    maskEl.style.clipPath = `url(#${clipId})`;

    // Normalize values between 0-1.
    const top = positionClip.top / elementPreviewSize.height;
    const bottom = top + elementRect.height / elementPreviewSize.height;
    const left = positionClip.left / elementPreviewSize.width;
    const right = left + elementRect.width / elementPreviewSize.width;

    const polygonsPoints = [
      `0,0             1,0            1,${top}          0,${top}`,
      `0,${bottom}     1,${bottom}    1,1               0,1`,
      `0,${top}        ${left},${top} ${left},${bottom} 0,${bottom}`,
      `${right},${top} 1,${top}       1,${bottom}       ${right},${bottom}`,
    ];
    for (const points of polygonsPoints) {
      const pointEl = dom.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      pointEl.setAttribute('points', points);
      clipPathEl.append(pointEl);
    }
  }

  /**
   * Called by report renderer. Defines a css variable used by any element screenshots
   * in the provided report element.
   * Allows for multiple Lighthouse reports to be rendered on the page, each with their
   * own full page screenshot.
   * @param {HTMLElement} el
   * @param {LH.Audit.Details.FullPageScreenshot['screenshot']} screenshot
   */
  static installFullPageScreenshot(el, screenshot) {
    el.style.setProperty('--element-screenshot-url', `url(${screenshot.data})`);
  }

  /**
   * Installs the lightbox elements and wires up click listeners to all .lh-element-screenshot elements.
   * @param {InstallOverlayFeatureParams} opts
   */
  static installOverlayFeature(opts) {
    const {dom, reportEl, overlayContainerEl, fullPageScreenshot} = opts;
    const screenshotOverlayClass = 'lh-screenshot-overlay--enabled';
    // Don't install the feature more than once.
    if (reportEl.classList.contains(screenshotOverlayClass)) return;
    reportEl.classList.add(screenshotOverlayClass);

    // Add a single listener to the provided element to handle all clicks within (event delegation).
    reportEl.addEventListener('click', e => {
      const target = /** @type {?HTMLElement} */ (e.target);
      if (!target) return;
      // Only activate the overlay for clicks on the screenshot *preview* of an element, not the full-size too.
      const el = /** @type {?HTMLElement} */ (target.closest('.lh-node > .lh-element-screenshot'));
      if (!el) return;

      const overlay = dom.createElement('div', 'lh-element-screenshot__overlay');
      overlayContainerEl.append(overlay);

      // The newly-added overlay has the dimensions we need.
      const maxLightboxSize = {
        width: overlay.clientWidth * 0.95,
        height: overlay.clientHeight * 0.80,
      };

      const elementRectSC = {
        width: Number(el.dataset['rectWidth']),
        height: Number(el.dataset['rectHeight']),
        left: Number(el.dataset['rectLeft']),
        right: Number(el.dataset['rectLeft']) + Number(el.dataset['rectWidth']),
        top: Number(el.dataset['rectTop']),
        bottom: Number(el.dataset['rectTop']) + Number(el.dataset['rectHeight']),
      };
      const screenshotElement = ElementScreenshotRenderer.render(
        dom,
        fullPageScreenshot.screenshot,
        elementRectSC,
        maxLightboxSize
      );

      // This would be unexpected here.
      // When `screenshotElement` is `null`, there is also no thumbnail element for the user to have clicked to make it this far.
      if (!screenshotElement) {
        overlay.remove();
        return;
      }
      overlay.appendChild(screenshotElement);
      overlay.addEventListener('click', () => overlay.remove());
    });
  }

  /**
   * Given the size of the element in the screenshot and the total available size of our preview container,
   * compute the factor by which we need to zoom out to view the entire element with context.
   * @param {Rect} elementRectSC
   * @param {Size} renderContainerSizeDC
   * @return {number}
   */
  static _computeZoomFactor(elementRectSC, renderContainerSizeDC) {
    const targetClipToViewportRatio = 0.75;
    const zoomRatioXY = {
      x: renderContainerSizeDC.width / elementRectSC.width,
      y: renderContainerSizeDC.height / elementRectSC.height,
    };
    const zoomFactor = targetClipToViewportRatio * Math.min(zoomRatioXY.x, zoomRatioXY.y);
    return Math.min(1, zoomFactor);
  }

  /**
   * Renders an element with surrounding context from the full page screenshot.
   * Used to render both the thumbnail preview in details tables and the full-page screenshot in the lightbox.
   * Returns null if element rect is outside screenshot bounds.
   * @param {DOM} dom
   * @param {LH.Audit.Details.FullPageScreenshot['screenshot']} screenshot
   * @param {Rect} elementRectSC Region of screenshot to highlight.
   * @param {Size} maxRenderSizeDC e.g. maxThumbnailSize or maxLightboxSize.
   * @return {Element|null}
   */
  static render(dom, screenshot, elementRectSC, maxRenderSizeDC) {
    if (!screenshotOverlapsRect(screenshot, elementRectSC)) {
      return null;
    }

    const tmpl = dom.createComponent('elementScreenshot');
    const containerEl = dom.find('div.lh-element-screenshot', tmpl);

    containerEl.dataset['rectWidth'] = elementRectSC.width.toString();
    containerEl.dataset['rectHeight'] = elementRectSC.height.toString();
    containerEl.dataset['rectLeft'] = elementRectSC.left.toString();
    containerEl.dataset['rectTop'] = elementRectSC.top.toString();

    // Zoom out when highlighted region takes up most of the viewport.
    // This provides more context for where on the page this element is.
    const zoomFactor = this._computeZoomFactor(elementRectSC, maxRenderSizeDC);

    const elementPreviewSizeSC = {
      width: maxRenderSizeDC.width / zoomFactor,
      height: maxRenderSizeDC.height / zoomFactor,
    };
    elementPreviewSizeSC.width = Math.min(screenshot.width, elementPreviewSizeSC.width);
    /* This preview size is either the size of the thumbnail or size of the Lightbox */
    const elementPreviewSizeDC = {
      width: elementPreviewSizeSC.width * zoomFactor,
      height: elementPreviewSizeSC.height * zoomFactor,
    };

    const positions = ElementScreenshotRenderer.getScreenshotPositions(
      elementRectSC,
      elementPreviewSizeSC,
      {width: screenshot.width, height: screenshot.height}
    );

    const contentEl = dom.find('div.lh-element-screenshot__content', containerEl);
    contentEl.style.top = `-${elementPreviewSizeDC.height}px`;

    const imageEl = dom.find('div.lh-element-screenshot__image', containerEl);
    imageEl.style.width = elementPreviewSizeDC.width + 'px';
    imageEl.style.height = elementPreviewSizeDC.height + 'px';

    imageEl.style.backgroundPositionY = -(positions.screenshot.top * zoomFactor) + 'px';
    imageEl.style.backgroundPositionX = -(positions.screenshot.left * zoomFactor) + 'px';
    imageEl.style.backgroundSize =
      `${screenshot.width * zoomFactor}px ${screenshot.height * zoomFactor}px`;

    const markerEl = dom.find('div.lh-element-screenshot__element-marker', containerEl);
    markerEl.style.width = elementRectSC.width * zoomFactor + 'px';
    markerEl.style.height = elementRectSC.height * zoomFactor + 'px';
    markerEl.style.left = positions.clip.left * zoomFactor + 'px';
    markerEl.style.top = positions.clip.top * zoomFactor + 'px';

    const maskEl = dom.find('div.lh-element-screenshot__mask', containerEl);
    maskEl.style.width = elementPreviewSizeDC.width + 'px';
    maskEl.style.height = elementPreviewSizeDC.height + 'px';

    ElementScreenshotRenderer.renderClipPathInScreenshot(
      dom,
      maskEl,
      positions.clip,
      elementRectSC,
      elementPreviewSizeSC
    );

    return containerEl;
  }
}

/**
 * @license
 * Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const URL_PREFIXES = ['http://', 'https://', 'data:'];

class DetailsRenderer {
  /**
   * @param {DOM} dom
   * @param {{fullPageScreenshot?: LH.Audit.Details.FullPageScreenshot}} [options]
   */
  constructor(dom, options = {}) {
    this._dom = dom;
    this._fullPageScreenshot = options.fullPageScreenshot;
  }

  /**
   * @param {AuditDetails} details
   * @return {Element|null}
   */
  render(details) {
    switch (details.type) {
      case 'filmstrip':
        return this._renderFilmstrip(details);
      case 'list':
        return this._renderList(details);
      case 'table':
        return this._renderTable(details);
      case 'criticalrequestchain':
        return CriticalRequestChainRenderer.render(this._dom, details, this);
      case 'opportunity':
        return this._renderTable(details);

      // Internal-only details, not for rendering.
      case 'screenshot':
      case 'debugdata':
      case 'full-page-screenshot':
      case 'treemap-data':
        return null;

      default: {
        // @ts-expect-error tsc thinks this is unreachable, but be forward compatible
        // with new unexpected detail types.
        return this._renderUnknown(details.type, details);
      }
    }
  }

  /**
   * @param {{value: number, granularity?: number}} details
   * @return {Element}
   */
  _renderBytes(details) {
    // TODO: handle displayUnit once we have something other than 'kb'
    // Note that 'kb' is historical and actually represents KiB.
    const value = Util.i18n.formatBytesToKiB(details.value, details.granularity);
    const textEl = this._renderText(value);
    textEl.title = Util.i18n.formatBytes(details.value);
    return textEl;
  }

  /**
   * @param {{value: number, granularity?: number, displayUnit?: string}} details
   * @return {Element}
   */
  _renderMilliseconds(details) {
    let value = Util.i18n.formatMilliseconds(details.value, details.granularity);
    if (details.displayUnit === 'duration') {
      value = Util.i18n.formatDuration(details.value);
    }

    return this._renderText(value);
  }

  /**
   * @param {string} text
   * @return {HTMLElement}
   */
  renderTextURL(text) {
    const url = text;

    let displayedPath;
    let displayedHost;
    let title;
    try {
      const parsed = Util.parseURL(url);
      displayedPath = parsed.file === '/' ? parsed.origin : parsed.file;
      displayedHost = parsed.file === '/' || parsed.hostname === '' ? '' : `(${parsed.hostname})`;
      title = url;
    } catch (e) {
      displayedPath = url;
    }

    const element = this._dom.createElement('div', 'lh-text__url');
    element.appendChild(this._renderLink({text: displayedPath, url}));

    if (displayedHost) {
      const hostElem = this._renderText(displayedHost);
      hostElem.classList.add('lh-text__url-host');
      element.appendChild(hostElem);
    }

    if (title) {
      element.title = url;
      // set the url on the element's dataset which we use to check 3rd party origins
      element.dataset.url = url;
    }
    return element;
  }

  /**
   * @param {{text: string, url: string}} details
   * @return {HTMLElement}
   */
  _renderLink(details) {
    const a = this._dom.createElement('a');
    this._dom.safelySetHref(a, details.url);

    if (!a.href) {
      // Fall back to just the link text if invalid or protocol not allowed.
      const element = this._renderText(details.text);
      element.classList.add('lh-link');
      return element;
    }

    a.rel = 'noopener';
    a.target = '_blank';
    a.textContent = details.text;
    a.classList.add('lh-link');
    return a;
  }

  /**
   * @param {string} text
   * @return {HTMLDivElement}
   */
  _renderText(text) {
    const element = this._dom.createElement('div', 'lh-text');
    element.textContent = text;
    return element;
  }

  /**
   * @param {{value: number, granularity?: number}} details
   * @return {Element}
   */
  _renderNumeric(details) {
    const value = Util.i18n.formatNumber(details.value, details.granularity);
    const element = this._dom.createElement('div', 'lh-numeric');
    element.textContent = value;
    return element;
  }

  /**
   * Create small thumbnail with scaled down image asset.
   * @param {string} details
   * @return {Element}
   */
  _renderThumbnail(details) {
    const element = this._dom.createElement('img', 'lh-thumbnail');
    const strValue = details;
    element.src = strValue;
    element.title = strValue;
    element.alt = '';
    return element;
  }

  /**
   * @param {string} type
   * @param {*} value
   */
  _renderUnknown(type, value) {
    // eslint-disable-next-line no-console
    console.error(`Unknown details type: ${type}`, value);
    const element = this._dom.createElement('details', 'lh-unknown');
    this._dom.createChildOf(element, 'summary').textContent =
      `We don't know how to render audit details of type \`${type}\`. ` +
      'The Lighthouse version that collected this data is likely newer than the Lighthouse ' +
      'version of the report renderer. Expand for the raw JSON.';
    this._dom.createChildOf(element, 'pre').textContent = JSON.stringify(value, null, 2);
    return element;
  }

  /**
   * Render a details item value for embedding in a table. Renders the value
   * based on the heading's valueType, unless the value itself has a `type`
   * property to override it.
   * @param {TableItemValue} value
   * @param {LH.Audit.Details.OpportunityColumnHeading} heading
   * @return {Element|null}
   */
  _renderTableValue(value, heading) {
    if (value === undefined || value === null) {
      return null;
    }

    // First deal with the possible object forms of value.
    if (typeof value === 'object') {
      // The value's type overrides the heading's for this column.
      switch (value.type) {
        case 'code': {
          return this._renderCode(value.value);
        }
        case 'link': {
          return this._renderLink(value);
        }
        case 'node': {
          return this.renderNode(value);
        }
        case 'numeric': {
          return this._renderNumeric(value);
        }
        case 'source-location': {
          return this.renderSourceLocation(value);
        }
        case 'url': {
          return this.renderTextURL(value.value);
        }
        default: {
          return this._renderUnknown(value.type, value);
        }
      }
    }

    // Next, deal with primitives.
    switch (heading.valueType) {
      case 'bytes': {
        const numValue = Number(value);
        return this._renderBytes({value: numValue, granularity: heading.granularity});
      }
      case 'code': {
        const strValue = String(value);
        return this._renderCode(strValue);
      }
      case 'ms': {
        const msValue = {
          value: Number(value),
          granularity: heading.granularity,
          displayUnit: heading.displayUnit,
        };
        return this._renderMilliseconds(msValue);
      }
      case 'numeric': {
        const numValue = Number(value);
        return this._renderNumeric({value: numValue, granularity: heading.granularity});
      }
      case 'text': {
        const strValue = String(value);
        return this._renderText(strValue);
      }
      case 'thumbnail': {
        const strValue = String(value);
        return this._renderThumbnail(strValue);
      }
      case 'timespanMs': {
        const numValue = Number(value);
        return this._renderMilliseconds({value: numValue});
      }
      case 'url': {
        const strValue = String(value);
        if (URL_PREFIXES.some(prefix => strValue.startsWith(prefix))) {
          return this.renderTextURL(strValue);
        } else {
          // Fall back to <pre> rendering if not actually a URL.
          return this._renderCode(strValue);
        }
      }
      default: {
        return this._renderUnknown(heading.valueType, value);
      }
    }
  }

  /**
   * Get the headings of a table-like details object, converted into the
   * OpportunityColumnHeading type until we have all details use the same
   * heading format.
   * @param {Table|OpportunityTable} tableLike
   * @return {OpportunityTable['headings']}
   */
  _getCanonicalizedHeadingsFromTable(tableLike) {
    if (tableLike.type === 'opportunity') {
      return tableLike.headings;
    }

    return tableLike.headings.map(heading => this._getCanonicalizedHeading(heading));
  }

  /**
   * Get the headings of a table-like details object, converted into the
   * OpportunityColumnHeading type until we have all details use the same
   * heading format.
   * @param {Table['headings'][number]} heading
   * @return {OpportunityTable['headings'][number]}
   */
  _getCanonicalizedHeading(heading) {
    let subItemsHeading;
    if (heading.subItemsHeading) {
      subItemsHeading = this._getCanonicalizedsubItemsHeading(heading.subItemsHeading, heading);
    }

    return {
      key: heading.key,
      valueType: heading.itemType,
      subItemsHeading,
      label: heading.text,
      displayUnit: heading.displayUnit,
      granularity: heading.granularity,
    };
  }

  /**
   * @param {Exclude<LH.Audit.Details.TableColumnHeading['subItemsHeading'], undefined>} subItemsHeading
   * @param {LH.Audit.Details.TableColumnHeading} parentHeading
   * @return {LH.Audit.Details.OpportunityColumnHeading['subItemsHeading']}
   */
  _getCanonicalizedsubItemsHeading(subItemsHeading, parentHeading) {
    // Low-friction way to prevent committing a falsy key (which is never allowed for
    // a subItemsHeading) from passing in CI.
    if (!subItemsHeading.key) {
      // eslint-disable-next-line no-console
      console.warn('key should not be null');
    }

    return {
      key: subItemsHeading.key || '',
      valueType: subItemsHeading.itemType || parentHeading.itemType,
      granularity: subItemsHeading.granularity || parentHeading.granularity,
      displayUnit: subItemsHeading.displayUnit || parentHeading.displayUnit,
    };
  }

  /**
   * Returns a new heading where the values are defined first by `heading.subItemsHeading`,
   * and secondly by `heading`. If there is no subItemsHeading, returns null, which will
   * be rendered as an empty column.
   * @param {LH.Audit.Details.OpportunityColumnHeading} heading
   * @return {LH.Audit.Details.OpportunityColumnHeading | null}
   */
  _getDerivedsubItemsHeading(heading) {
    if (!heading.subItemsHeading) return null;
    return {
      key: heading.subItemsHeading.key || '',
      valueType: heading.subItemsHeading.valueType || heading.valueType,
      granularity: heading.subItemsHeading.granularity || heading.granularity,
      displayUnit: heading.subItemsHeading.displayUnit || heading.displayUnit,
      label: '',
    };
  }

  /**
   * @param {TableItem} item
   * @param {(LH.Audit.Details.OpportunityColumnHeading | null)[]} headings
   */
  _renderTableRow(item, headings) {
    const rowElem = this._dom.createElement('tr');

    for (const heading of headings) {
      // Empty cell if no heading or heading key for this column.
      if (!heading || !heading.key) {
        this._dom.createChildOf(rowElem, 'td', 'lh-table-column--empty');
        continue;
      }

      const value = item[heading.key];
      let valueElement;
      if (value !== undefined && value !== null) {
        valueElement = this._renderTableValue(value, heading);
      }

      if (valueElement) {
        const classes = `lh-table-column--${heading.valueType}`;
        this._dom.createChildOf(rowElem, 'td', classes).appendChild(valueElement);
      } else {
        // Empty cell is rendered for a column if:
        // - the pair is null
        // - the heading key is null
        // - the value is undefined/null
        this._dom.createChildOf(rowElem, 'td', 'lh-table-column--empty');
      }
    }

    return rowElem;
  }

  /**
   * Renders one or more rows from a details table item. A single table item can
   * expand into multiple rows, if there is a subItemsHeading.
   * @param {TableItem} item
   * @param {LH.Audit.Details.OpportunityColumnHeading[]} headings
   */
  _renderTableRowsFromItem(item, headings) {
    const fragment = this._dom.createFragment();
    fragment.append(this._renderTableRow(item, headings));

    if (!item.subItems) return fragment;

    const subItemsHeadings = headings.map(this._getDerivedsubItemsHeading);
    if (!subItemsHeadings.some(Boolean)) return fragment;

    for (const subItem of item.subItems.items) {
      const rowEl = this._renderTableRow(subItem, subItemsHeadings);
      rowEl.classList.add('lh-sub-item-row');
      fragment.append(rowEl);
    }

    return fragment;
  }

  /**
   * @param {OpportunityTable|Table} details
   * @return {Element}
   */
  _renderTable(details) {
    if (!details.items.length) return this._dom.createElement('span');

    const tableElem = this._dom.createElement('table', 'lh-table');
    const theadElem = this._dom.createChildOf(tableElem, 'thead');
    const theadTrElem = this._dom.createChildOf(theadElem, 'tr');

    const headings = this._getCanonicalizedHeadingsFromTable(details);

    for (const heading of headings) {
      const valueType = heading.valueType || 'text';
      const classes = `lh-table-column--${valueType}`;
      const labelEl = this._dom.createElement('div', 'lh-text');
      labelEl.textContent = heading.label;
      this._dom.createChildOf(theadTrElem, 'th', classes).appendChild(labelEl);
    }

    const tbodyElem = this._dom.createChildOf(tableElem, 'tbody');
    let even = true;
    for (const item of details.items) {
      const rowsFragment = this._renderTableRowsFromItem(item, headings);
      for (const rowEl of this._dom.findAll('tr', rowsFragment)) {
        // For zebra styling.
        rowEl.classList.add(even ? 'lh-row--even' : 'lh-row--odd');
      }
      even = !even;
      tbodyElem.append(rowsFragment);
    }

    return tableElem;
  }

  /**
   * @param {LH.Audit.Details.List} details
   * @return {Element}
   */
  _renderList(details) {
    const listContainer = this._dom.createElement('div', 'lh-list');

    details.items.forEach(item => {
      const snippetEl = SnippetRenderer.render(this._dom, item, this);
      listContainer.appendChild(snippetEl);
    });

    return listContainer;
  }

  /**
   * @param {LH.Audit.Details.NodeValue} item
   * @return {Element}
   */
  renderNode(item) {
    const element = this._dom.createElement('span', 'lh-node');
    if (item.nodeLabel) {
      const nodeLabelEl = this._dom.createElement('div');
      nodeLabelEl.textContent = item.nodeLabel;
      element.appendChild(nodeLabelEl);
    }
    if (item.snippet) {
      const snippetEl = this._dom.createElement('div');
      snippetEl.classList.add('lh-node__snippet');
      snippetEl.textContent = item.snippet;
      element.appendChild(snippetEl);
    }
    if (item.selector) {
      element.title = item.selector;
    }
    if (item.path) element.setAttribute('data-path', item.path);
    if (item.selector) element.setAttribute('data-selector', item.selector);
    if (item.snippet) element.setAttribute('data-snippet', item.snippet);

    if (!this._fullPageScreenshot) return element;

    const rect = item.lhId && this._fullPageScreenshot.nodes[item.lhId];
    if (!rect || rect.width === 0 || rect.height === 0) return element;

    const maxThumbnailSize = {width: 147, height: 100};
    const elementScreenshot = ElementScreenshotRenderer.render(
      this._dom,
      this._fullPageScreenshot.screenshot,
      rect,
      maxThumbnailSize
    );
    if (elementScreenshot) element.prepend(elementScreenshot);

    return element;
  }

  /**
   * @param {LH.Audit.Details.SourceLocationValue} item
   * @return {Element|null}
   * @protected
   */
  renderSourceLocation(item) {
    if (!item.url) {
      return null;
    }

    // Lines are shown as one-indexed.
    const generatedLocation = `${item.url}:${item.line + 1}:${item.column}`;
    let sourceMappedOriginalLocation;
    if (item.original) {
      const file = item.original.file || '<unmapped>';
      sourceMappedOriginalLocation = `${file}:${item.original.line + 1}:${item.original.column}`;
    }

    // We render slightly differently based on presence of source map and provenance of URL.
    let element;
    if (item.urlProvider === 'network' && sourceMappedOriginalLocation) {
      element = this._renderLink({
        url: item.url,
        text: sourceMappedOriginalLocation,
      });
      element.title = `maps to generated location ${generatedLocation}`;
    } else if (item.urlProvider === 'network' && !sourceMappedOriginalLocation) {
      element = this.renderTextURL(item.url);
      this._dom.find('.lh-link', element).textContent += `:${item.line + 1}:${item.column}`;
    } else if (item.urlProvider === 'comment' && sourceMappedOriginalLocation) {
      element = this._renderText(`${sourceMappedOriginalLocation} (from source map)`);
      element.title = `${generatedLocation} (from sourceURL)`;
    } else if (item.urlProvider === 'comment' && !sourceMappedOriginalLocation) {
      element = this._renderText(`${generatedLocation} (from sourceURL)`);
    } else {
      return null;
    }

    element.classList.add('lh-source-location');
    element.setAttribute('data-source-url', item.url);
    // DevTools expects zero-indexed lines.
    element.setAttribute('data-source-line', String(item.line));
    element.setAttribute('data-source-column', String(item.column));

    return element;
  }

  /**
   * @param {LH.Audit.Details.Filmstrip} details
   * @return {Element}
   */
  _renderFilmstrip(details) {
    const filmstripEl = this._dom.createElement('div', 'lh-filmstrip');

    for (const thumbnail of details.items) {
      const frameEl = this._dom.createChildOf(filmstripEl, 'div', 'lh-filmstrip__frame');
      const imgEl = this._dom.createChildOf(frameEl, 'img', 'lh-filmstrip__thumbnail');
      imgEl.src = thumbnail.data;
      imgEl.alt = `Screenshot`;
    }
    return filmstripEl;
  }

  /**
   * @param {string} text
   * @return {Element}
   */
  _renderCode(text) {
    const pre = this._dom.createElement('pre', 'lh-code');
    pre.textContent = text;
    return pre;
  }
}

/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

// Not named `NBSP` because that creates a duplicate identifier (util.js).
const NBSP2 = '\xa0';
const KiB = 1024;
const MiB = KiB * KiB;

/**
 * @template T
 */
class I18n {
  /**
   * @param {LH.Locale} locale
   * @param {T} strings
   */
  constructor(locale, strings) {
    // When testing, use a locale with more exciting numeric formatting.
    if (locale === 'en-XA') locale = 'de';

    this._numberDateLocale = locale;
    this._numberFormatter = new Intl.NumberFormat(locale);
    this._percentFormatter = new Intl.NumberFormat(locale, {style: 'percent'});
    this._strings = strings;
  }

  get strings() {
    return this._strings;
  }

  /**
   * Format number.
   * @param {number} number
   * @param {number=} granularity Number of decimal places to include. Defaults to 0.1.
   * @return {string}
   */
  formatNumber(number, granularity = 0.1) {
    const coarseValue = Math.round(number / granularity) * granularity;
    return this._numberFormatter.format(coarseValue);
  }

  /**
   * Format percent.
   * @param {number} number 0–1
   * @return {string}
   */
  formatPercent(number) {
    return this._percentFormatter.format(number);
  }

  /**
   * @param {number} size
   * @param {number=} granularity Controls how coarse the displayed value is, defaults to 0.1
   * @return {string}
   */
  formatBytesToKiB(size, granularity = 0.1) {
    const formatter = this._byteFormatterForGranularity(granularity);
    const kbs = formatter.format(Math.round(size / 1024 / granularity) * granularity);
    return `${kbs}${NBSP2}KiB`;
  }

  /**
   * @param {number} size
   * @param {number=} granularity Controls how coarse the displayed value is, defaults to 0.1
   * @return {string}
   */
  formatBytesToMiB(size, granularity = 0.1) {
    const formatter = this._byteFormatterForGranularity(granularity);
    const kbs = formatter.format(Math.round(size / (1024 ** 2) / granularity) * granularity);
    return `${kbs}${NBSP2}MiB`;
  }

  /**
   * @param {number} size
   * @param {number=} granularity Controls how coarse the displayed value is, defaults to 1
   * @return {string}
   */
  formatBytes(size, granularity = 1) {
    const formatter = this._byteFormatterForGranularity(granularity);
    const kbs = formatter.format(Math.round(size / granularity) * granularity);
    return `${kbs}${NBSP2}bytes`;
  }

  /**
   * @param {number} size
   * @param {number=} granularity Controls how coarse the displayed value is, defaults to 0.1
   * @return {string}
   */
  formatBytesWithBestUnit(size, granularity = 0.1) {
    if (size >= MiB) return this.formatBytesToMiB(size, granularity);
    if (size >= KiB) return this.formatBytesToKiB(size, granularity);
    return this.formatNumber(size, granularity) + '\xa0B';
  }

  /**
   * Format bytes with a constant number of fractional digits, i.e. for a granularity of 0.1, 10 becomes '10.0'
   * @param {number} granularity Controls how coarse the displayed value is
   * @return {Intl.NumberFormat}
   */
  _byteFormatterForGranularity(granularity) {
    // assume any granularity above 1 will not contain fractional parts, i.e. will never be 1.5
    let numberOfFractionDigits = 0;
    if (granularity < 1) {
      numberOfFractionDigits = -Math.floor(Math.log10(granularity));
    }

    return new Intl.NumberFormat(this._numberDateLocale, {
      ...this._numberFormatter.resolvedOptions(),
      maximumFractionDigits: numberOfFractionDigits,
      minimumFractionDigits: numberOfFractionDigits,
    });
  }

  /**
   * @param {number} ms
   * @param {number=} granularity Controls how coarse the displayed value is, defaults to 10
   * @return {string}
   */
  formatMilliseconds(ms, granularity = 10) {
    const coarseTime = Math.round(ms / granularity) * granularity;
    return coarseTime === 0
      ? `${this._numberFormatter.format(0)}${NBSP2}ms`
      : `${this._numberFormatter.format(coarseTime)}${NBSP2}ms`;
  }

  /**
   * @param {number} ms
   * @param {number=} granularity Controls how coarse the displayed value is, defaults to 0.1
   * @return {string}
   */
  formatSeconds(ms, granularity = 0.1) {
    const coarseTime = Math.round(ms / 1000 / granularity) * granularity;
    return `${this._numberFormatter.format(coarseTime)}${NBSP2}s`;
  }

  /**
   * Format time.
   * @param {string} date
   * @return {string}
   */
  formatDateTime(date) {
    /** @type {Intl.DateTimeFormatOptions} */
    const options = {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: 'numeric', timeZoneName: 'short',
    };

    // Force UTC if runtime timezone could not be detected.
    // See https://github.com/GoogleChrome/lighthouse/issues/1056
    // and https://github.com/GoogleChrome/lighthouse/pull/9822
    let formatter;
    try {
      formatter = new Intl.DateTimeFormat(this._numberDateLocale, options);
    } catch (err) {
      options.timeZone = 'UTC';
      formatter = new Intl.DateTimeFormat(this._numberDateLocale, options);
    }

    return formatter.format(new Date(date));
  }

  /**
   * Converts a time in milliseconds into a duration string, i.e. `1d 2h 13m 52s`
   * @param {number} timeInMilliseconds
   * @return {string}
   */
  formatDuration(timeInMilliseconds) {
    let timeInSeconds = timeInMilliseconds / 1000;
    if (Math.round(timeInSeconds) === 0) {
      return 'None';
    }

    /** @type {Array<string>} */
    const parts = [];
    /** @type {Record<string, number>} */
    const unitLabels = {
      d: 60 * 60 * 24,
      h: 60 * 60,
      m: 60,
      s: 1,
    };

    Object.keys(unitLabels).forEach(label => {
      const unit = unitLabels[label];
      const numberOfUnits = Math.floor(timeInSeconds / unit);
      if (numberOfUnits > 0) {
        timeInSeconds -= numberOfUnits * unit;
        parts.push(`${numberOfUnits}\xa0${label}`);
      }
    });

    return parts.join(' ');
  }
}

/**
 * @license
 * Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

class PerformanceCategoryRenderer extends CategoryRenderer {
  /**
   * @param {LH.ReportResult.AuditRef} audit
   * @return {!Element}
   */
  _renderMetric(audit) {
    const tmpl = this.dom.createComponent('metric');
    const element = this.dom.find('.lh-metric', tmpl);
    element.id = audit.result.id;
    const rating = Util.calculateRating(audit.result.score, audit.result.scoreDisplayMode);
    element.classList.add(`lh-metric--${rating}`);

    const titleEl = this.dom.find('.lh-metric__title', tmpl);
    titleEl.textContent = audit.result.title;

    const valueEl = this.dom.find('.lh-metric__value', tmpl);
    valueEl.textContent = audit.result.displayValue || '';

    const descriptionEl = this.dom.find('.lh-metric__description', tmpl);
    descriptionEl.appendChild(this.dom.convertMarkdownLinkSnippets(audit.result.description));

    if (audit.result.scoreDisplayMode === 'error') {
      descriptionEl.textContent = '';
      valueEl.textContent = 'Error!';
      const tooltip = this.dom.createChildOf(descriptionEl, 'span');
      tooltip.textContent = audit.result.errorMessage || 'Report error: no metric information';
    }

    return element;
  }

  /**
   * @param {LH.ReportResult.AuditRef} audit
   * @param {number} scale
   * @return {!Element}
   */
  _renderOpportunity(audit, scale) {
    const oppTmpl = this.dom.createComponent('opportunity');
    const element = this.populateAuditValues(audit, oppTmpl);
    element.id = audit.result.id;

    if (!audit.result.details || audit.result.scoreDisplayMode === 'error') {
      return element;
    }
    const details = audit.result.details;
    if (details.type !== 'opportunity') {
      return element;
    }

    // Overwrite the displayValue with opportunity's wastedMs
    // TODO: normalize this to one tagName.
    const displayEl =
      this.dom.find('span.lh-audit__display-text, div.lh-audit__display-text', element);
    const sparklineWidthPct = `${details.overallSavingsMs / scale * 100}%`;
    this.dom.find('div.lh-sparkline__bar', element).style.width = sparklineWidthPct;
    displayEl.textContent = Util.i18n.formatSeconds(details.overallSavingsMs, 0.01);

    // Set [title] tooltips
    if (audit.result.displayValue) {
      const displayValue = audit.result.displayValue;
      this.dom.find('div.lh-load-opportunity__sparkline', element).title = displayValue;
      displayEl.title = displayValue;
    }

    return element;
  }

  /**
   * Get an audit's wastedMs to sort the opportunity by, and scale the sparkline width
   * Opportunities with an error won't have a details object, so MIN_VALUE is returned to keep any
   * erroring opportunities last in sort order.
   * @param {LH.ReportResult.AuditRef} audit
   * @return {number}
   */
  _getWastedMs(audit) {
    if (audit.result.details && audit.result.details.type === 'opportunity') {
      const details = audit.result.details;
      if (typeof details.overallSavingsMs !== 'number') {
        throw new Error('non-opportunity details passed to _getWastedMs');
      }
      return details.overallSavingsMs;
    } else {
      return Number.MIN_VALUE;
    }
  }

  /**
   * Get a link to the interactive scoring calculator with the metric values.
   * @param {LH.ReportResult.AuditRef[]} auditRefs
   * @return {string}
   */
  _getScoringCalculatorHref(auditRefs) {
    // TODO: filter by !!acronym when dropping renderer support of v7 LHRs.
    const metrics = auditRefs.filter(audit => audit.group === 'metrics');
    const fci = auditRefs.find(audit => audit.id === 'first-cpu-idle');
    const fmp = auditRefs.find(audit => audit.id === 'first-meaningful-paint');
    if (fci) metrics.push(fci);
    if (fmp) metrics.push(fmp);

    /**
     * Clamp figure to 2 decimal places
     * @param {number} val
     * @return {number}
     */
    const clampTo2Decimals = val => Math.round(val * 100) / 100;

    const metricPairs = metrics.map(audit => {
      let value;
      if (typeof audit.result.numericValue === 'number') {
        value = audit.id === 'cumulative-layout-shift' ?
          clampTo2Decimals(audit.result.numericValue) :
          Math.round(audit.result.numericValue);
        value = value.toString();
      } else {
        value = 'null';
      }
      return [audit.acronym || audit.id, value];
    });
    const paramPairs = [...metricPairs];

    if (Util.reportJson) {
      paramPairs.push(['device', Util.reportJson.configSettings.formFactor]);
      paramPairs.push(['version', Util.reportJson.lighthouseVersion]);
    }

    const params = new URLSearchParams(paramPairs);
    const url = new URL('https://googlechrome.github.io/lighthouse/scorecalc/');
    url.hash = params.toString();
    return url.href;
  }

  /**
   * @param {LH.ReportResult.Category} category
   * @param {Object<string, LH.Result.ReportGroup>} groups
   * @param {{gatherMode: LH.Result.GatherMode, environment?: 'PSI'}=} options
   * @return {Element}
   * @override
   */
  render(category, groups, options) {
    const strings = Util.i18n.strings;
    const element = this.dom.createElement('div', 'lh-category');
    if (options && options.environment === 'PSI') {
      const gaugeEl = this.dom.createElement('div', 'lh-score__gauge');
      gaugeEl.appendChild(this.renderCategoryScore(category, groups, options));
      element.appendChild(gaugeEl);
    } else {
      this.createPermalinkSpan(element, category.id);
      element.appendChild(this.renderCategoryHeader(category, groups, options));
    }

    // Metrics.
    const metricAuditsEl = this.renderAuditGroup(groups.metrics);

    // Metric descriptions toggle.
    const toggleTmpl = this.dom.createComponent('metricsToggle');
    const _toggleEl = this.dom.find('.lh-metrics-toggle', toggleTmpl);
    metricAuditsEl.append(..._toggleEl.childNodes);

    const metricAudits = category.auditRefs.filter(audit => audit.group === 'metrics');
    const metricsBoxesEl = this.dom.createChildOf(metricAuditsEl, 'div', 'lh-metrics-container');

    metricAudits.forEach(item => {
      metricsBoxesEl.appendChild(this._renderMetric(item));
    });

    const estValuesEl = this.dom.createChildOf(metricAuditsEl, 'div', 'lh-metrics__disclaimer');
    const disclaimerEl = this.dom.convertMarkdownLinkSnippets(strings.varianceDisclaimer);
    estValuesEl.appendChild(disclaimerEl);

    // Add link to score calculator.
    const calculatorLink = this.dom.createChildOf(estValuesEl, 'a', 'lh-calclink');
    calculatorLink.target = '_blank';
    calculatorLink.textContent = strings.calculatorLink;
    this.dom.safelySetHref(calculatorLink, this._getScoringCalculatorHref(category.auditRefs));


    metricAuditsEl.classList.add('lh-audit-group--metrics');
    element.appendChild(metricAuditsEl);

    // Filmstrip
    const timelineEl = this.dom.createChildOf(element, 'div', 'lh-filmstrip-container');
    const thumbnailAudit = category.auditRefs.find(audit => audit.id === 'screenshot-thumbnails');
    const thumbnailResult = thumbnailAudit && thumbnailAudit.result;
    if (thumbnailResult && thumbnailResult.details) {
      timelineEl.id = thumbnailResult.id;
      const filmstripEl = this.detailsRenderer.render(thumbnailResult.details);
      filmstripEl && timelineEl.appendChild(filmstripEl);
    }

    // Opportunities
    const opportunityAudits = category.auditRefs
        .filter(audit => audit.group === 'load-opportunities' && !Util.showAsPassed(audit.result))
        .sort((auditA, auditB) => this._getWastedMs(auditB) - this._getWastedMs(auditA));


    const filterableMetrics = metricAudits.filter(a => !!a.relevantAudits);
    // TODO: only add if there are opportunities & diagnostics rendered.
    if (filterableMetrics.length) {
      this.renderMetricAuditFilter(filterableMetrics, element);
    }

    if (opportunityAudits.length) {
      // Scale the sparklines relative to savings, minimum 2s to not overstate small savings
      const minimumScale = 2000;
      const wastedMsValues = opportunityAudits.map(audit => this._getWastedMs(audit));
      const maxWaste = Math.max(...wastedMsValues);
      const scale = Math.max(Math.ceil(maxWaste / 1000) * 1000, minimumScale);
      const groupEl = this.renderAuditGroup(groups['load-opportunities']);
      const tmpl = this.dom.createComponent('opportunityHeader');

      this.dom.find('.lh-load-opportunity__col--one', tmpl).textContent =
        strings.opportunityResourceColumnLabel;
      this.dom.find('.lh-load-opportunity__col--two', tmpl).textContent =
        strings.opportunitySavingsColumnLabel;

      const headerEl = this.dom.find('.lh-load-opportunity__header', tmpl);
      groupEl.appendChild(headerEl);
      opportunityAudits.forEach(item => groupEl.appendChild(this._renderOpportunity(item, scale)));
      groupEl.classList.add('lh-audit-group--load-opportunities');
      element.appendChild(groupEl);
    }

    // Diagnostics
    const diagnosticAudits = category.auditRefs
        .filter(audit => audit.group === 'diagnostics' && !Util.showAsPassed(audit.result))
        .sort((a, b) => {
          const scoreA = a.result.scoreDisplayMode === 'informative' ? 100 : Number(a.result.score);
          const scoreB = b.result.scoreDisplayMode === 'informative' ? 100 : Number(b.result.score);
          return scoreA - scoreB;
        });

    if (diagnosticAudits.length) {
      const groupEl = this.renderAuditGroup(groups['diagnostics']);
      diagnosticAudits.forEach(item => groupEl.appendChild(this.renderAudit(item)));
      groupEl.classList.add('lh-audit-group--diagnostics');
      element.appendChild(groupEl);
    }

    // Passed audits
    const passedAudits = category.auditRefs
        .filter(audit => (audit.group === 'load-opportunities' || audit.group === 'diagnostics') &&
            Util.showAsPassed(audit.result));

    if (!passedAudits.length) return element;

    const clumpOpts = {
      auditRefs: passedAudits,
      groupDefinitions: groups,
    };
    const passedElem = this.renderClump('passed', clumpOpts);
    element.appendChild(passedElem);

    // Budgets
    /** @type {Array<Element>} */
    const budgetTableEls = [];
    ['performance-budget', 'timing-budget'].forEach((id) => {
      const audit = category.auditRefs.find(audit => audit.id === id);
      if (audit && audit.result.details) {
        const table = this.detailsRenderer.render(audit.result.details);
        if (table) {
          table.id = id;
          table.classList.add('lh-audit');
          budgetTableEls.push(table);
        }
      }
    });
    if (budgetTableEls.length > 0) {
      const budgetsGroupEl = this.renderAuditGroup(groups.budgets);
      budgetTableEls.forEach(table => budgetsGroupEl.appendChild(table));
      budgetsGroupEl.classList.add('lh-audit-group--budgets');
      element.appendChild(budgetsGroupEl);
    }

    return element;
  }

  /**
   * Render the control to filter the audits by metric. The filtering is done at runtime by CSS only
   * @param {LH.ReportResult.AuditRef[]} filterableMetrics
   * @param {HTMLDivElement} categoryEl
   */
  renderMetricAuditFilter(filterableMetrics, categoryEl) {
    const metricFilterEl = this.dom.createElement('div', 'lh-metricfilter');
    const textEl = this.dom.createChildOf(metricFilterEl, 'span', 'lh-metricfilter__text');
    textEl.textContent = Util.i18n.strings.showRelevantAudits;

    const filterChoices = /** @type {LH.ReportResult.AuditRef[]} */ ([
      ({acronym: 'All'}),
      ...filterableMetrics,
    ]);

    // Form labels need to reference unique IDs, but multiple reports rendered in the same DOM (eg PSI)
    // would mean ID conflict.  To address this, we 'scope' these radio inputs with a unique suffix.
    const uniqSuffix = Util.getUniqueSuffix();
    for (const metric of filterChoices) {
      const elemId = `metric-${metric.acronym}-${uniqSuffix}`;
      const radioEl = this.dom.createChildOf(metricFilterEl, 'input', 'lh-metricfilter__radio');
      radioEl.type = 'radio';
      radioEl.name = `metricsfilter-${uniqSuffix}`;
      radioEl.id = elemId;

      const labelEl = this.dom.createChildOf(metricFilterEl, 'label', 'lh-metricfilter__label');
      labelEl.htmlFor = elemId;
      labelEl.title = metric.result && metric.result.title;
      labelEl.textContent = metric.acronym || metric.id;

      if (metric.acronym === 'All') {
        radioEl.checked = true;
        labelEl.classList.add('lh-metricfilter__label--active');
      }
      categoryEl.append(metricFilterEl);

      // Toggle class/hidden state based on filter choice.
      radioEl.addEventListener('input', _ => {
        for (const elem of categoryEl.querySelectorAll('label.lh-metricfilter__label')) {
          elem.classList.toggle('lh-metricfilter__label--active', elem.htmlFor === elemId);
        }
        categoryEl.classList.toggle('lh-category--filtered', metric.acronym !== 'All');

        for (const perfAuditEl of categoryEl.querySelectorAll('div.lh-audit')) {
          if (metric.acronym === 'All') {
            perfAuditEl.hidden = false;
            continue;
          }

          perfAuditEl.hidden = true;
          if (metric.relevantAudits && metric.relevantAudits.includes(perfAuditEl.id)) {
            perfAuditEl.hidden = false;
          }
        }

        // Hide groups/clumps if all child audits are also hidden.
        const groupEls = categoryEl.querySelectorAll('div.lh-audit-group, details.lh-audit-group');
        for (const groupEl of groupEls) {
          groupEl.hidden = false;
          const childEls = Array.from(groupEl.querySelectorAll('div.lh-audit'));
          const areAllHidden = !!childEls.length && childEls.every(auditEl => auditEl.hidden);
          groupEl.hidden = areAllHidden;
        }
      });
    }
  }
}

/**
 * @license
 * Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

class PwaCategoryRenderer extends CategoryRenderer {
  /**
   * @param {LH.ReportResult.Category} category
   * @param {Object<string, LH.Result.ReportGroup>} [groupDefinitions]
   * @return {Element}
   */
  render(category, groupDefinitions = {}) {
    const categoryElem = this.dom.createElement('div', 'lh-category');
    this.createPermalinkSpan(categoryElem, category.id);
    categoryElem.appendChild(this.renderCategoryHeader(category, groupDefinitions));

    const auditRefs = category.auditRefs;

    // Regular audits aren't split up into pass/fail/notApplicable clumps, they're
    // all put in a top-level clump that isn't expandable/collapsible.
    const regularAuditRefs = auditRefs.filter(ref => ref.result.scoreDisplayMode !== 'manual');
    const auditsElem = this._renderAudits(regularAuditRefs, groupDefinitions);
    categoryElem.appendChild(auditsElem);

    // Manual audits are still in a manual clump.
    const manualAuditRefs = auditRefs.filter(ref => ref.result.scoreDisplayMode === 'manual');
    const manualElem = this.renderClump('manual',
      {auditRefs: manualAuditRefs, description: category.manualDescription});
    categoryElem.appendChild(manualElem);

    return categoryElem;
  }

  /**
   * Alias for backcompat.
   * @param {LH.ReportResult.Category} category
   * @param {Record<string, LH.Result.ReportGroup>} groupDefinitions
   * @return {DocumentFragment}
   */
  renderScoreGauge(category, groupDefinitions) {
    return this.renderCategoryScore(category, groupDefinitions);
  }

  /**
   * @param {LH.ReportResult.Category} category
   * @param {Record<string, LH.Result.ReportGroup>} groupDefinitions
   * @return {DocumentFragment}
   */
  renderCategoryScore(category, groupDefinitions) {
    // Defer to parent-gauge style if category error.
    if (category.score === null) {
      return super.renderScoreGauge(category, groupDefinitions);
    }

    const tmpl = this.dom.createComponent('gaugePwa');
    const wrapper = this.dom.find('a.lh-gauge--pwa__wrapper', tmpl);
    this.dom.safelySetHref(wrapper, `#${category.id}`);

    // Correct IDs in case multiple instances end up in the page.
    const svgRoot = tmpl.querySelector('svg');
    if (!svgRoot) throw new Error('no SVG element found in PWA score gauge template');
    PwaCategoryRenderer._makeSvgReferencesUnique(svgRoot);

    const allGroups = this._getGroupIds(category.auditRefs);
    const passingGroupIds = this._getPassingGroupIds(category.auditRefs);

    if (passingGroupIds.size === allGroups.size) {
      wrapper.classList.add('lh-badged--all');
    } else {
      for (const passingGroupId of passingGroupIds) {
        wrapper.classList.add(`lh-badged--${passingGroupId}`);
      }
    }

    this.dom.find('.lh-gauge__label', tmpl).textContent = category.title;
    wrapper.title = this._getGaugeTooltip(category.auditRefs, groupDefinitions);
    return tmpl;
  }

  /**
   * Returns the group IDs found in auditRefs.
   * @param {Array<LH.ReportResult.AuditRef>} auditRefs
   * @return {!Set<string>}
   */
  _getGroupIds(auditRefs) {
    const groupIds = auditRefs.map(ref => ref.group).filter(/** @return {g is string} */ g => !!g);
    return new Set(groupIds);
  }

  /**
   * Returns the group IDs whose audits are all considered passing.
   * @param {Array<LH.ReportResult.AuditRef>} auditRefs
   * @return {Set<string>}
   */
  _getPassingGroupIds(auditRefs) {
    const uniqueGroupIds = this._getGroupIds(auditRefs);

    // Remove any that have a failing audit.
    for (const auditRef of auditRefs) {
      if (!Util.showAsPassed(auditRef.result) && auditRef.group) {
        uniqueGroupIds.delete(auditRef.group);
      }
    }

    return uniqueGroupIds;
  }

  /**
   * Returns a tooltip string summarizing group pass rates.
   * @param {Array<LH.ReportResult.AuditRef>} auditRefs
   * @param {Record<string, LH.Result.ReportGroup>} groupDefinitions
   * @return {string}
   */
  _getGaugeTooltip(auditRefs, groupDefinitions) {
    const groupIds = this._getGroupIds(auditRefs);

    const tips = [];
    for (const groupId of groupIds) {
      const groupAuditRefs = auditRefs.filter(ref => ref.group === groupId);
      const auditCount = groupAuditRefs.length;
      const passedCount = groupAuditRefs.filter(ref => Util.showAsPassed(ref.result)).length;

      const title = groupDefinitions[groupId].title;
      tips.push(`${title}: ${passedCount}/${auditCount}`);
    }

    return tips.join(', ');
  }

  /**
   * Render non-manual audits in groups, giving a badge to any group that has
   * all passing audits.
   * @param {Array<LH.ReportResult.AuditRef>} auditRefs
   * @param {Object<string, LH.Result.ReportGroup>} groupDefinitions
   * @return {Element}
   */
  _renderAudits(auditRefs, groupDefinitions) {
    const auditsElem = this.renderUnexpandableClump(auditRefs, groupDefinitions);

    // Add a 'badged' class to group if all audits in that group pass.
    const passsingGroupIds = this._getPassingGroupIds(auditRefs);
    for (const groupId of passsingGroupIds) {
      const groupElem = this.dom.find(`.lh-audit-group--${groupId}`, auditsElem);
      groupElem.classList.add('lh-badged');
    }

    return auditsElem;
  }

  /**
   * Alters SVG id references so multiple instances of an SVG element can coexist
   * in a single page. If `svgRoot` has a `<defs>` block, gives all elements defined
   * in it unique ids, then updates id references (`<use xlink:href="...">`,
   * `fill="url(#...)"`) to the altered ids in all descendents of `svgRoot`.
   * @param {SVGElement} svgRoot
   */
  static _makeSvgReferencesUnique(svgRoot) {
    const defsEl = svgRoot.querySelector('defs');
    if (!defsEl) return;

    const idSuffix = Util.getUniqueSuffix();
    const elementsToUpdate = defsEl.querySelectorAll('[id]');
    for (const el of elementsToUpdate) {
      const oldId = el.id;
      const newId = `${oldId}-${idSuffix}`;
      el.id = newId;

      // Update all <use>s.
      const useEls = svgRoot.querySelectorAll(`use[href="#${oldId}"]`);
      for (const useEl of useEls) {
        useEl.setAttribute('href', `#${newId}`);
      }

      // Update all fill="url(#...)"s.
      const fillEls = svgRoot.querySelectorAll(`[fill="url(#${oldId})"]`);
      for (const fillEl of fillEls) {
        fillEl.setAttribute('fill', `url(#${newId})`);
      }
    }
  }
}

/**
 * @license
 * Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * Dummy text for ensuring report robustness: </script> pre$`post %%LIGHTHOUSE_JSON%%
 * (this is handled by terser)
 */

class ReportRenderer {
  /**
   * @param {DOM} dom
   */
  constructor(dom) {
    /** @type {DOM} */
    this._dom = dom;
  }

  /**
   * @param {LH.Result} lhr
   * @param {Element} container Parent element to render the report into.
   * @return {!Element}
   */
  renderReport(lhr, container) {
    this._dom.setLighthouseChannel(lhr.configSettings.channel || 'unknown');

    const report = Util.prepareReportResult(lhr);

    container.textContent = ''; // Remove previous report.
    container.appendChild(this._renderReport(report));

    return container;
  }

  /**
   * @param {LH.ReportResult} report
   * @return {DocumentFragment}
   */
  _renderReportTopbar(report) {
    const el = this._dom.createComponent('topbar');
    const metadataUrl = this._dom.find('a.lh-topbar__url', el);
    metadataUrl.textContent = report.finalUrl;
    metadataUrl.title = report.finalUrl;
    this._dom.safelySetHref(metadataUrl, report.finalUrl);
    return el;
  }

  /**
   * @return {DocumentFragment}
   */
  _renderReportHeader() {
    const el = this._dom.createComponent('heading');
    const domFragment = this._dom.createComponent('scoresWrapper');
    const placeholder = this._dom.find('.lh-scores-wrapper-placeholder', el);
    placeholder.replaceWith(domFragment);
    return el;
  }

  /**
   * @param {LH.ReportResult} report
   * @return {DocumentFragment}
   */
  _renderReportFooter(report) {
    const footer = this._dom.createComponent('footer');

    const env = this._dom.find('.lh-env__items', footer);
    env.id = 'runtime-settings';
    this._dom.find('.lh-env__title', footer).textContent = Util.i18n.strings.runtimeSettingsTitle;

    const envValues = Util.getEnvironmentDisplayValues(report.configSettings || {});
    const runtimeValues = [
      {name: Util.i18n.strings.runtimeSettingsUrl, description: report.finalUrl},
      {name: Util.i18n.strings.runtimeSettingsFetchTime,
        description: Util.i18n.formatDateTime(report.fetchTime)},
      ...envValues,
      {name: Util.i18n.strings.runtimeSettingsChannel, description: report.configSettings.channel},
      {name: Util.i18n.strings.runtimeSettingsUA, description: report.userAgent},
      {name: Util.i18n.strings.runtimeSettingsUANetwork, description: report.environment &&
        report.environment.networkUserAgent},
      {name: Util.i18n.strings.runtimeSettingsBenchmark, description: report.environment &&
        report.environment.benchmarkIndex.toFixed(0)},
    ];
    if (report.environment.credits && report.environment.credits['axe-core']) {
      runtimeValues.push({
        name: Util.i18n.strings.runtimeSettingsAxeVersion,
        description: report.environment.credits['axe-core'],
      });
    }

    for (const runtime of runtimeValues) {
      if (!runtime.description) continue;

      const item = this._dom.createComponent('envItem');
      this._dom.find('.lh-env__name', item).textContent = runtime.name;
      this._dom.find('.lh-env__description', item).textContent = runtime.description;
      env.appendChild(item);
    }

    this._dom.find('.lh-footer__version_issue', footer).textContent = Util.i18n.strings.footerIssue;
    this._dom.find('.lh-footer__version', footer).textContent = report.lighthouseVersion;
    return footer;
  }

  /**
   * Returns a div with a list of top-level warnings, or an empty div if no warnings.
   * @param {LH.ReportResult} report
   * @return {Node}
   */
  _renderReportWarnings(report) {
    if (!report.runWarnings || report.runWarnings.length === 0) {
      return this._dom.createElement('div');
    }

    const container = this._dom.createComponent('warningsToplevel');
    const message = this._dom.find('.lh-warnings__msg', container);
    message.textContent = Util.i18n.strings.toplevelWarningsMessage;

    const warnings = this._dom.find('ul', container);
    for (const warningString of report.runWarnings) {
      const warning = warnings.appendChild(this._dom.createElement('li'));
      warning.appendChild(this._dom.convertMarkdownLinkSnippets(warningString));
    }

    return container;
  }

  /**
   * @param {LH.ReportResult} report
   * @param {CategoryRenderer} categoryRenderer
   * @param {Record<string, CategoryRenderer>} specificCategoryRenderers
   * @return {!DocumentFragment[]}
   */
  _renderScoreGauges(report, categoryRenderer, specificCategoryRenderers) {
    // Group gauges in this order: default, pwa, plugins.
    const defaultGauges = [];
    const customGauges = []; // PWA.
    const pluginGauges = [];

    for (const category of Object.values(report.categories)) {
      const renderer = specificCategoryRenderers[category.id] || categoryRenderer;
      const categoryGauge = renderer.renderCategoryScore(
        category,
        report.categoryGroups || {},
        {gatherMode: report.gatherMode}
      );

      if (Util.isPluginCategory(category.id)) {
        pluginGauges.push(categoryGauge);
      } else if (renderer.renderCategoryScore === categoryRenderer.renderCategoryScore) {
        // The renderer for default categories is just the default CategoryRenderer.
        // If the functions are equal, then renderer is an instance of CategoryRenderer.
        // For example, the PWA category uses PwaCategoryRenderer, which overrides
        // CategoryRenderer.renderScoreGauge, so it would fail this check and be placed
        // in the customGauges bucket.
        defaultGauges.push(categoryGauge);
      } else {
        customGauges.push(categoryGauge);
      }
    }

    return [...defaultGauges, ...customGauges, ...pluginGauges];
  }

  /**
   * @param {LH.ReportResult} report
   * @return {!DocumentFragment}
   */
  _renderReport(report) {
    const i18n = new I18n(report.configSettings.locale, {
      // Set missing renderer strings to default (english) values.
      ...Util.UIStrings,
      ...report.i18n.rendererFormattedStrings,
    });
    Util.i18n = i18n;
    Util.reportJson = report;

    const fullPageScreenshot =
      report.audits['full-page-screenshot'] && report.audits['full-page-screenshot'].details &&
      report.audits['full-page-screenshot'].details.type === 'full-page-screenshot' ?
      report.audits['full-page-screenshot'].details : undefined;
    const detailsRenderer = new DetailsRenderer(this._dom, {
      fullPageScreenshot,
    });

    const categoryRenderer = new CategoryRenderer(this._dom, detailsRenderer);

    /** @type {Record<string, CategoryRenderer>} */
    const specificCategoryRenderers = {
      performance: new PerformanceCategoryRenderer(this._dom, detailsRenderer),
      pwa: new PwaCategoryRenderer(this._dom, detailsRenderer),
    };

    const headerContainer = this._dom.createElement('div');
    headerContainer.appendChild(this._renderReportHeader());

    const reportContainer = this._dom.createElement('div', 'lh-container');
    const reportSection = this._dom.createElement('div', 'lh-report');
    reportSection.appendChild(this._renderReportWarnings(report));

    let scoreHeader;
    const isSoloCategory = Object.keys(report.categories).length === 1;
    if (!isSoloCategory) {
      scoreHeader = this._dom.createElement('div', 'lh-scores-header');
    } else {
      headerContainer.classList.add('lh-header--solo-category');
    }

    if (scoreHeader) {
      const scoreScale = this._dom.createComponent('scorescale');
      const scoresContainer = this._dom.find('.lh-scores-container', headerContainer);
      scoreHeader.append(
        ...this._renderScoreGauges(report, categoryRenderer, specificCategoryRenderers));
      scoresContainer.appendChild(scoreHeader);
      scoresContainer.appendChild(scoreScale);

      const stickyHeader = this._dom.createElement('div', 'lh-sticky-header');
      stickyHeader.append(
        ...this._renderScoreGauges(report, categoryRenderer, specificCategoryRenderers));
      reportContainer.appendChild(stickyHeader);
    }

    const categories = reportSection.appendChild(this._dom.createElement('div', 'lh-categories'));
    const categoryOptions = {gatherMode: report.gatherMode};
    for (const category of Object.values(report.categories)) {
      const renderer = specificCategoryRenderers[category.id] || categoryRenderer;
      // .lh-category-wrapper is full-width and provides horizontal rules between categories.
      // .lh-category within has the max-width: var(--report-width);
      const wrapper = renderer.dom.createChildOf(categories, 'div', 'lh-category-wrapper');
      wrapper.appendChild(renderer.render(
        category,
        report.categoryGroups,
        categoryOptions
      ));
    }

    const reportFragment = this._dom.createFragment();
    const topbarDocumentFragment = this._renderReportTopbar(report);

    reportFragment.appendChild(topbarDocumentFragment);
    reportFragment.appendChild(reportContainer);
    reportContainer.appendChild(headerContainer);
    reportContainer.appendChild(reportSection);
    reportSection.appendChild(this._renderReportFooter(report));

    if (fullPageScreenshot) {
      ElementScreenshotRenderer.installFullPageScreenshot(
        reportContainer, fullPageScreenshot.screenshot);
    }

    return reportFragment;
  }
}

/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

/* eslint-env browser */

/** @typedef {import('./dom.js').DOM} DOM */

/**
 * @param {DOM} dom
 * @param {boolean} [force]
 */
function toggleDarkTheme(dom, force) {
  const el = dom.find('.lh-vars', dom.document());
  // This seems unnecessary, but in DevTools, passing "undefined" as the second
  // parameter acts like passing "false".
  // https://github.com/ChromeDevTools/devtools-frontend/blob/dd6a6d4153647c2a4203c327c595692c5e0a4256/front_end/dom_extension/DOMExtension.js#L809-L819
  if (typeof force === 'undefined') {
    el.classList.toggle('lh-dark');
  } else {
    el.classList.toggle('lh-dark', force);
  }
}

/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

/* global CompressionStream */

const btoa_ = typeof btoa !== 'undefined' ?
  btoa :
  /** @param {string} str */
  (str) => Buffer.from(str).toString('base64');
const atob_ = typeof atob !== 'undefined' ?
  atob :
  /** @param {string} str */
  (str) => Buffer.from(str, 'base64').toString();

/**
 * Takes an UTF-8 string and returns a base64 encoded string.
 * If gzip is true, the UTF-8 bytes are gzipped before base64'd, using
 * CompressionStream (currently only in Chrome), falling back to pako
 * (which is only used to encode in our Node tests).
 * @param {string} string
 * @param {{gzip: boolean}} options
 * @return {Promise<string>}
 */
async function toBase64(string, options) {
  let bytes = new TextEncoder().encode(string);

  if (options.gzip) {
    if (typeof CompressionStream !== 'undefined') {
      const cs = new CompressionStream('gzip');
      const writer = cs.writable.getWriter();
      writer.write(bytes);
      writer.close();
      const compAb = await new Response(cs.readable).arrayBuffer();
      bytes = new Uint8Array(compAb);
    } else {
      /** @type {import('pako')=} */
      const pako = window.pako;
      bytes = pako.gzip(string);
    }
  }

  let binaryString = '';
  // This is ~25% faster than building the string one character at a time.
  // https://jsbench.me/2gkoxazvjl
  const chunkSize = 5000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binaryString += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa_(binaryString);
}

/**
 * @param {string} encoded
 * @param {{gzip: boolean}} options
 * @return {string}
 */
function fromBase64(encoded, options) {
  const binaryString = atob_(encoded);
  const bytes = Uint8Array.from(binaryString, c => c.charCodeAt(0));

  if (options.gzip) {
    /** @type {import('pako')=} */
    const pako = window.pako;
    return pako.ungzip(bytes, {to: 'string'});
  } else {
    return new TextDecoder().decode(bytes);
  }
}

const TextEncoding = {toBase64, fromBase64};

/**
 * @license
 * Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/* eslint-env browser */

function getAppsOrigin() {
  const isVercel = window.location.host.endsWith('.vercel.app');
  const isDev = new URLSearchParams(window.location.search).has('dev');

  if (isVercel) return `https://${window.location.host}/gh-pages`;
  if (isDev) return 'http://localhost:8000';
  return 'https://googlechrome.github.io/lighthouse';
}

/**
 * The popup's window.name is keyed by version+url+fetchTime, so we reuse/select tabs correctly.
 * @param {LH.Result} json
 * @protected
 */
function computeWindowNameSuffix(json) {
  // @ts-expect-error - If this is a v2 LHR, use old `generatedTime`.
  const fallbackFetchTime = /** @type {string} */ (json.generatedTime);
  const fetchTime = json.fetchTime || fallbackFetchTime;
  return `${json.lighthouseVersion}-${json.requestedUrl}-${fetchTime}`;
}

/**
 * Opens a new tab to an external page and sends data using postMessage.
 * @param {{lhr: LH.Result} | LH.Treemap.Options} data
 * @param {string} url
 * @param {string} windowName
 * @protected
 */
function openTabAndSendData(data, url, windowName) {
  const origin = new URL(url).origin;
  // Chrome doesn't allow us to immediately postMessage to a popup right
  // after it's created. Normally, we could also listen for the popup window's
  // load event, however it is cross-domain and won't fire. Instead, listen
  // for a message from the target app saying "I'm open".
  window.addEventListener('message', function msgHandler(messageEvent) {
    if (messageEvent.origin !== origin) {
      return;
    }
    if (popup && messageEvent.data.opened) {
      popup.postMessage(data, origin);
      window.removeEventListener('message', msgHandler);
    }
  });

  const popup = window.open(url, windowName);
}

/**
 * Opens a new tab to an external page and sends data via base64 encoded url params.
 * @param {{lhr: LH.Result} | LH.Treemap.Options} data
 * @param {string} url_
 * @param {string} windowName
 * @protected
 */
async function openTabWithUrlData(data, url_, windowName) {
  const url = new URL(url_);
  const gzip = Boolean(window.CompressionStream);
  url.hash = await TextEncoding.toBase64(JSON.stringify(data), {
    gzip,
  });
  if (gzip) url.searchParams.set('gzip', '1');
  window.open(url.toString(), windowName);
}

/**
 * Opens a new tab to the online viewer and sends the local page's JSON results
 * to the online viewer using URL.fragment
 * @param {LH.Result} lhr
 * @protected
 */
async function openViewer(lhr) {
  const windowName = 'viewer-' + computeWindowNameSuffix(lhr);
  const url = getAppsOrigin() + '/viewer/';
  await openTabWithUrlData({lhr}, url, windowName);
}

/**
 * Same as openViewer, but uses postMessage.
 * @param {LH.Result} lhr
 * @protected
 */
async function openViewerAndSendData(lhr) {
  const windowName = 'viewer-' + computeWindowNameSuffix(lhr);
  const url = getAppsOrigin() + '/viewer/';
  openTabAndSendData({lhr}, url, windowName);
}

/**
 * Opens a new tab to the treemap app and sends the JSON results using URL.fragment
 * @param {LH.Result} json
 */
function openTreemap(json) {
  const treemapData = json.audits['script-treemap-data'].details;
  if (!treemapData) {
    throw new Error('no script treemap data found');
  }

  /** @type {LH.Treemap.Options} */
  const treemapOptions = {
    lhr: {
      requestedUrl: json.requestedUrl,
      finalUrl: json.finalUrl,
      audits: {
        'script-treemap-data': json.audits['script-treemap-data'],
      },
      configSettings: {
        locale: json.configSettings.locale,
      },
    },
  };
  const url = getAppsOrigin() + '/treemap/';
  const windowName = 'treemap-' + computeWindowNameSuffix(json);

  openTabWithUrlData(treemapOptions, url, windowName);
}

/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

/* eslint-env browser */

/** @typedef {import('./dom.js').DOM} DOM */

class DropDownMenu {
  /**
   * @param {DOM} dom
   */
  constructor(dom) {
    /** @type {DOM} */
    this._dom = dom;
    /** @type {HTMLElement} */
    this._toggleEl; // eslint-disable-line no-unused-expressions
    /** @type {HTMLElement} */
    this._menuEl; // eslint-disable-line no-unused-expressions

    this.onDocumentKeyDown = this.onDocumentKeyDown.bind(this);
    this.onToggleClick = this.onToggleClick.bind(this);
    this.onToggleKeydown = this.onToggleKeydown.bind(this);
    this.onMenuFocusOut = this.onMenuFocusOut.bind(this);
    this.onMenuKeydown = this.onMenuKeydown.bind(this);

    this._getNextMenuItem = this._getNextMenuItem.bind(this);
    this._getNextSelectableNode = this._getNextSelectableNode.bind(this);
    this._getPreviousMenuItem = this._getPreviousMenuItem.bind(this);
  }

  /**
   * @param {function(MouseEvent): any} menuClickHandler
   */
  setup(menuClickHandler) {
    this._toggleEl = this._dom.find('button.lh-tools__button', this._dom.document());
    this._toggleEl.addEventListener('click', this.onToggleClick);
    this._toggleEl.addEventListener('keydown', this.onToggleKeydown);

    this._menuEl = this._dom.find('div.lh-tools__dropdown', this._dom.document());
    this._menuEl.addEventListener('keydown', this.onMenuKeydown);
    this._menuEl.addEventListener('click', menuClickHandler);
  }

  close() {
    this._toggleEl.classList.remove('lh-active');
    this._toggleEl.setAttribute('aria-expanded', 'false');
    if (this._menuEl.contains(this._dom.document().activeElement)) {
      // Refocus on the tools button if the drop down last had focus
      this._toggleEl.focus();
    }
    this._menuEl.removeEventListener('focusout', this.onMenuFocusOut);
    this._dom.document().removeEventListener('keydown', this.onDocumentKeyDown);
  }

  /**
   * @param {HTMLElement} firstFocusElement
   */
  open(firstFocusElement) {
    if (this._toggleEl.classList.contains('lh-active')) {
      // If the drop down is already open focus on the element
      firstFocusElement.focus();
    } else {
      // Wait for drop down transition to complete so options are focusable.
      this._menuEl.addEventListener('transitionend', () => {
        firstFocusElement.focus();
      }, {once: true});
    }

    this._toggleEl.classList.add('lh-active');
    this._toggleEl.setAttribute('aria-expanded', 'true');
    this._menuEl.addEventListener('focusout', this.onMenuFocusOut);
    this._dom.document().addEventListener('keydown', this.onDocumentKeyDown);
  }

  /**
   * Click handler for tools button.
   * @param {Event} e
   */
  onToggleClick(e) {
    e.preventDefault();
    e.stopImmediatePropagation();

    if (this._toggleEl.classList.contains('lh-active')) {
      this.close();
    } else {
      this.open(this._getNextMenuItem());
    }
  }

  /**
   * Handler for tool button.
   * @param {KeyboardEvent} e
   */
  onToggleKeydown(e) {
    switch (e.code) {
      case 'ArrowUp':
        e.preventDefault();
        this.open(this._getPreviousMenuItem());
        break;
      case 'ArrowDown':
      case 'Enter':
      case ' ':
        e.preventDefault();
        this.open(this._getNextMenuItem());
        break;
       // no op
    }
  }

  /**
   * Handler for tool DropDown.
   * @param {KeyboardEvent} e
   */
  onMenuKeydown(e) {
    const el = /** @type {?HTMLElement} */ (e.target);

    switch (e.code) {
      case 'ArrowUp':
        e.preventDefault();
        this._getPreviousMenuItem(el).focus();
        break;
      case 'ArrowDown':
        e.preventDefault();
        this._getNextMenuItem(el).focus();
        break;
      case 'Home':
        e.preventDefault();
        this._getNextMenuItem().focus();
        break;
      case 'End':
        e.preventDefault();
        this._getPreviousMenuItem().focus();
        break;
       // no op
    }
  }

  /**
   * Keydown handler for the document.
   * @param {KeyboardEvent} e
   */
  onDocumentKeyDown(e) {
    if (e.keyCode === 27) { // ESC
      this.close();
    }
  }

  /**
   * Focus out handler for the drop down menu.
   * @param {FocusEvent} e
   */
  onMenuFocusOut(e) {
    const focusedEl = /** @type {?HTMLElement} */ (e.relatedTarget);

    if (!this._menuEl.contains(focusedEl)) {
      this.close();
    }
  }

  /**
   * @param {Array<Node>} allNodes
   * @param {?HTMLElement=} startNode
   * @return {HTMLElement}
   */
  _getNextSelectableNode(allNodes, startNode) {
    const nodes = allNodes.filter(/** @return {node is HTMLElement} */ (node) => {
      if (!(node instanceof HTMLElement)) {
        return false;
      }

      // 'Save as Gist' option may be disabled.
      if (node.hasAttribute('disabled')) {
        return false;
      }

      // 'Save as Gist' option may have display none.
      if (window.getComputedStyle(node).display === 'none') {
        return false;
      }

      return true;
    });

    let nextIndex = startNode ? (nodes.indexOf(startNode) + 1) : 0;
    if (nextIndex >= nodes.length) {
      nextIndex = 0;
    }

    return nodes[nextIndex];
  }

  /**
   * @param {?HTMLElement=} startEl
   * @return {HTMLElement}
   */
  _getNextMenuItem(startEl) {
    const nodes = Array.from(this._menuEl.childNodes);
    return this._getNextSelectableNode(nodes, startEl);
  }

  /**
   * @param {?HTMLElement=} startEl
   * @return {HTMLElement}
   */
  _getPreviousMenuItem(startEl) {
    const nodes = Array.from(this._menuEl.childNodes).reverse();
    return this._getNextSelectableNode(nodes, startEl);
  }
}

/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

class TopbarFeatures {
  /**
   * @param {ReportUIFeatures} reportUIFeatures
   * @param {DOM} dom
   */
  constructor(reportUIFeatures, dom) {
    /** @type {LH.Result} */
    this.lhr; // eslint-disable-line no-unused-expressions
    this._reportUIFeatures = reportUIFeatures;
    this._dom = dom;
    /** @type {Document} */
    this._document = this._dom.document();
    this._dropDownMenu = new DropDownMenu(this._dom);
    this._copyAttempt = false;
    /** @type {HTMLElement} */
    this.topbarEl; // eslint-disable-line no-unused-expressions
    /** @type {HTMLElement} */
    this.scoreScaleEl; // eslint-disable-line no-unused-expressions
    /** @type {HTMLElement} */
    this.stickyHeaderEl; // eslint-disable-line no-unused-expressions
    /** @type {HTMLElement} */
    this.highlightEl; // eslint-disable-line no-unused-expressions
    this.onDropDownMenuClick = this.onDropDownMenuClick.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    this.onCopy = this.onCopy.bind(this);
    this.collapseAllDetails = this.collapseAllDetails.bind(this);
    this._updateStickyHeaderOnScroll = this._updateStickyHeaderOnScroll.bind(this);
  }

  /**
   * @param {LH.Result} lhr
   */
  enable(lhr) {
    this.lhr = lhr;
    this._document.addEventListener('keyup', this.onKeyUp);
    this._document.addEventListener('copy', this.onCopy);
    this._dropDownMenu.setup(this.onDropDownMenuClick);
    this._setUpCollapseDetailsAfterPrinting();

    const topbarLogo = this._dom.find('.lh-topbar__logo', this._document);
    topbarLogo.addEventListener('click', () => toggleDarkTheme(this._dom));

    // There is only a sticky header when at least 2 categories are present.
    if (Object.keys(this.lhr.categories).length >= 2) {
      this._setupStickyHeaderElements();
      const containerEl = this._dom.find('.lh-container', this._document);
      const elToAddScrollListener = this._getScrollParent(containerEl);
      elToAddScrollListener.addEventListener('scroll', this._updateStickyHeaderOnScroll);

      // Use ResizeObserver where available.
      // TODO: there is an issue with incorrect position numbers and, as a result, performance
      // issues due to layout thrashing.
      // See https://github.com/GoogleChrome/lighthouse/pull/9023/files#r288822287 for details.
      // For now, limit to DevTools.
      if (this._dom.isDevTools()) {
        const resizeObserver = new window.ResizeObserver(this._updateStickyHeaderOnScroll);
        resizeObserver.observe(containerEl);
      } else {
        window.addEventListener('resize', this._updateStickyHeaderOnScroll);
      }
    }
  }

  /**
   * Handler for tool button.
   * @param {Event} e
   */
  onDropDownMenuClick(e) {
    e.preventDefault();

    const el = /** @type {?Element} */ (e.target);

    if (!el || !el.hasAttribute('data-action')) {
      return;
    }

    switch (el.getAttribute('data-action')) {
      case 'copy':
        this.onCopyButtonClick();
        break;
      case 'print-summary':
        this.collapseAllDetails();
        this._print();
        break;
      case 'print-expanded':
        this.expandAllDetails();
        this._print();
        break;
      case 'save-json': {
        const jsonStr = JSON.stringify(this.lhr, null, 2);
        this._reportUIFeatures._saveFile(new Blob([jsonStr], {type: 'application/json'}));
        break;
      }
      case 'save-html': {
        const htmlStr = this._reportUIFeatures.getReportHtml();
        try {
          this._reportUIFeatures._saveFile(new Blob([htmlStr], {type: 'text/html'}));
        } catch (e) {
          this._dom.fireEventOn('lh-log', this._document, {
            cmd: 'error', msg: 'Could not export as HTML. ' + e.message,
          });
        }
        break;
      }
      case 'open-viewer': {
        // DevTools cannot send data with postMessage, and we only want to use the URL fragment
        // approach for viewer when needed, so check the environment and choose accordingly.
        if (this._dom.isDevTools()) {
          openViewer(this.lhr);
        } else {
          openViewerAndSendData(this.lhr);
        }
        break;
      }
      case 'save-gist': {
        this._reportUIFeatures.saveAsGist();
        break;
      }
      case 'toggle-dark': {
        toggleDarkTheme(this._dom);
        break;
      }
    }

    this._dropDownMenu.close();
  }

  /**
   * Handle copy events.
   * @param {ClipboardEvent} e
   */
  onCopy(e) {
    // Only handle copy button presses (e.g. ignore the user copying page text).
    if (this._copyAttempt && e.clipboardData) {
      // We want to write our own data to the clipboard, not the user's text selection.
      e.preventDefault();
      e.clipboardData.setData('text/plain', JSON.stringify(this.lhr, null, 2));

      this._dom.fireEventOn('lh-log', this._document, {
        cmd: 'log', msg: 'Report JSON copied to clipboard',
      });
    }

    this._copyAttempt = false;
  }

  /**
   * Copies the report JSON to the clipboard (if supported by the browser).
   */
  onCopyButtonClick() {
    this._dom.fireEventOn('lh-analytics', this._document, {
      cmd: 'send',
      fields: {hitType: 'event', eventCategory: 'report', eventAction: 'copy'},
    });

    try {
      if (this._document.queryCommandSupported('copy')) {
        this._copyAttempt = true;

        // Note: In Safari 10.0.1, execCommand('copy') returns true if there's
        // a valid text selection on the page. See http://caniuse.com/#feat=clipboard.
        if (!this._document.execCommand('copy')) {
          this._copyAttempt = false; // Prevent event handler from seeing this as a copy attempt.

          this._dom.fireEventOn('lh-log', this._document, {
            cmd: 'warn', msg: 'Your browser does not support copy to clipboard.',
          });
        }
      }
    } catch (e) {
      this._copyAttempt = false;
      this._dom.fireEventOn('lh-log', this._document, {cmd: 'log', msg: e.message});
    }
  }

  /**
   * Keyup handler for the document.
   * @param {KeyboardEvent} e
   */
  onKeyUp(e) {
    // Ctrl+P - Expands audit details when user prints via keyboard shortcut.
    if ((e.ctrlKey || e.metaKey) && e.keyCode === 80) {
      this._dropDownMenu.close();
    }
  }

  /**
   * Expands all audit `<details>`.
   * Ideally, a print stylesheet could take care of this, but CSS has no way to
   * open a `<details>` element.
   */
  expandAllDetails() {
    const details = this._dom.findAll('.lh-categories details', this._document);
    details.map(detail => detail.open = true);
  }

  /**
   * Collapses all audit `<details>`.
   * open a `<details>` element.
   */
  collapseAllDetails() {
    const details = this._dom.findAll('.lh-categories details', this._document);
    details.map(detail => detail.open = false);
  }

  _print() {
    self.print();
  }

  /**
   * Resets the state of page before capturing the page for export.
   * When the user opens the exported HTML page, certain UI elements should
   * be in their closed state (not opened) and the templates should be unstamped.
   */
  resetUIState() {
    this._dropDownMenu.close();
  }

  /**
   * Finds the first scrollable ancestor of `element`. Falls back to the document.
   * @param {Element} element
   * @return {Node}
   */
  _getScrollParent(element) {
    const {overflowY} = window.getComputedStyle(element);
    const isScrollable = overflowY !== 'visible' && overflowY !== 'hidden';

    if (isScrollable) {
      return element;
    }

    if (element.parentElement) {
      return this._getScrollParent(element.parentElement);
    }

    return document;
  }

  /**
   * Sets up listeners to collapse audit `<details>` when the user closes the
   * print dialog, all `<details>` are collapsed.
   */
  _setUpCollapseDetailsAfterPrinting() {
    // FF and IE implement these old events.
    if ('onbeforeprint' in self) {
      self.addEventListener('afterprint', this.collapseAllDetails);
    } else {
      // Note: FF implements both window.onbeforeprint and media listeners. However,
      // it doesn't matchMedia doesn't fire when matching 'print'.
      self.matchMedia('print').addListener(mql => {
        if (mql.matches) {
          this.expandAllDetails();
        } else {
          this.collapseAllDetails();
        }
      });
    }
  }

  _setupStickyHeaderElements() {
    this.topbarEl = this._dom.find('div.lh-topbar', this._document);
    this.scoreScaleEl = this._dom.find('div.lh-scorescale', this._document);
    this.stickyHeaderEl = this._dom.find('div.lh-sticky-header', this._document);

    // Highlighter will be absolutely positioned at first gauge, then transformed on scroll.
    this.highlightEl = this._dom.createChildOf(this.stickyHeaderEl, 'div', 'lh-highlighter');
  }

  _updateStickyHeaderOnScroll() {
    // Show sticky header when the score scale begins to go underneath the topbar.
    const topbarBottom = this.topbarEl.getBoundingClientRect().bottom;
    const scoreScaleTop = this.scoreScaleEl.getBoundingClientRect().top;
    const showStickyHeader = topbarBottom >= scoreScaleTop;

    // Highlight mini gauge when section is in view.
    // In view = the last category that starts above the middle of the window.
    const categoryEls = Array.from(this._document.querySelectorAll('.lh-category'));
    const categoriesAboveTheMiddle =
      categoryEls.filter(el => el.getBoundingClientRect().top - window.innerHeight / 2 < 0);
    const highlightIndex =
      categoriesAboveTheMiddle.length > 0 ? categoriesAboveTheMiddle.length - 1 : 0;

    // Category order matches gauge order in sticky header.
    const gaugeWrapperEls = this.stickyHeaderEl.querySelectorAll('.lh-gauge__wrapper');
    const gaugeToHighlight = gaugeWrapperEls[highlightIndex];
    const origin = gaugeWrapperEls[0].getBoundingClientRect().left;
    const offset = gaugeToHighlight.getBoundingClientRect().left - origin;

    // Mutate at end to avoid layout thrashing.
    this.highlightEl.style.transform = `translate(${offset}px)`;
    this.stickyHeaderEl.classList.toggle('lh-sticky-header--visible', showStickyHeader);
  }
}

/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

/**
 * @fileoverview
 * @suppress {reportUnknownTypes}
 */

/**
 * Generate a filenamePrefix of hostname_YYYY-MM-DD_HH-MM-SS
 * Date/time uses the local timezone, however Node has unreliable ICU
 * support, so we must construct a YYYY-MM-DD date format manually. :/
 * @param {{finalUrl: string, fetchTime: string}} lhr
 * @return {string}
 */
function getFilenamePrefix(lhr) {
  const hostname = new URL(lhr.finalUrl).hostname;
  const date = (lhr.fetchTime && new Date(lhr.fetchTime)) || new Date();

  const timeStr = date.toLocaleTimeString('en-US', {hour12: false});
  const dateParts = date.toLocaleDateString('en-US', {
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).split('/');
  // @ts-expect-error - parts exists
  dateParts.unshift(dateParts.pop());
  const dateStr = dateParts.join('-');

  const filenamePrefix = `${hostname}_${dateStr}_${timeStr}`;
  // replace characters that are unfriendly to filenames
  return filenamePrefix.replace(/[/?<>\\:*|"]/g, '-');
}

var fileNamer = {getFilenamePrefix};
var fileNamer_1 = fileNamer.getFilenamePrefix;

/**
 * @license
 * Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @param {HTMLTableElement} tableEl
 * @return {Array<HTMLElement>}
 */
function getTableRows(tableEl) {
  return Array.from(tableEl.tBodies[0].rows);
}
class ReportUIFeatures {
  /**
   * @param {DOM} dom
   */
  constructor(dom) {
    /** @type {LH.Result} */
    this.json; // eslint-disable-line no-unused-expressions
    /** @type {DOM} */
    this._dom = dom;
    /** @type {Document} */
    this._document = this._dom.document();
    this._topbar = new TopbarFeatures(this, dom);

    this.onMediaQueryChange = this.onMediaQueryChange.bind(this);
  }

  /**
   * Adds tools button, print, and other functionality to the report. The method
   * should be called whenever the report needs to be re-rendered.
   * @param {LH.Result} lhr
   */
  initFeatures(lhr) {
    this.json = lhr;

    this._topbar.enable(lhr);
    this._topbar.resetUIState();
    this._setupMediaQueryListeners();
    this._setupThirdPartyFilter();
    this._setupElementScreenshotOverlay(this._dom.find('.lh-container', this._document));

    let turnOffTheLights = false;
    // Do not query the system preferences for DevTools - DevTools should only apply dark theme
    // if dark is selected in the settings panel.
    if (!this._dom.isDevTools() && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      turnOffTheLights = true;
    }

    // Fireworks!
    // To get fireworks you need 100 scores in all core categories, except PWA (because going the PWA route is discretionary).
    const fireworksRequiredCategoryIds = ['performance', 'accessibility', 'best-practices', 'seo'];
    const scoresAll100 = fireworksRequiredCategoryIds.every(id => {
      const cat = lhr.categories[id];
      return cat && cat.score === 1;
    });
    if (scoresAll100) {
      turnOffTheLights = true;
      this._enableFireworks();
    }

    if (turnOffTheLights) {
      toggleDarkTheme(this._dom, true);
    }

    // Show the metric descriptions by default when there is an error.
    const hasMetricError = lhr.categories.performance && lhr.categories.performance.auditRefs
      .some(audit => Boolean(audit.group === 'metrics' && lhr.audits[audit.id].errorMessage));
    if (hasMetricError) {
      const toggleInputEl = this._dom.find('input.lh-metrics-toggle__input', this._document);
      toggleInputEl.checked = true;
    }

    const showTreemapApp =
      this.json.audits['script-treemap-data'] && this.json.audits['script-treemap-data'].details;
    if (showTreemapApp) {
      this.addButton({
        text: Util.i18n.strings.viewTreemapLabel,
        icon: 'treemap',
        onClick: () => openTreemap(this.json),
      });
    }

    // Fill in all i18n data.
    for (const node of this._dom.findAll('[data-i18n]', this._dom.document())) {
      // These strings are guaranteed to (at least) have a default English string in Util.UIStrings,
      // so this cannot be undefined as long as `report-ui-features.data-i18n` test passes.
      const i18nKey = node.getAttribute('data-i18n');
      const i18nAttr = /** @type {keyof typeof Util.i18n.strings} */ (i18nKey);
      node.textContent = Util.i18n.strings[i18nAttr];
    }
  }

  /**
   * @param {{container?: Element, text: string, icon?: string, onClick: () => void}} opts
   */
  addButton(opts) {
    // report-ui-features doesn't have a reference to the root report el, and PSI has
    // 2 reports on the page (and not even attached to DOM when installFeatures is called..)
    // so we need a container option to specify where the element should go.
    const metricsEl = this._document.querySelector('.lh-audit-group--metrics');
    const containerEl = opts.container || metricsEl;
    if (!containerEl) return;

    let buttonsEl = containerEl.querySelector('.lh-buttons');
    if (!buttonsEl) buttonsEl = this._dom.createChildOf(containerEl, 'div', 'lh-buttons');

    const classes = [
      'lh-button',
    ];
    if (opts.icon) {
      classes.push('lh-report-icon');
      classes.push(`lh-report-icon--${opts.icon}`);
    }
    const buttonEl = this._dom.createChildOf(buttonsEl, 'button', classes.join(' '));
    buttonEl.textContent = opts.text;
    buttonEl.addEventListener('click', opts.onClick);
    return buttonEl;
  }

  /**
   * Returns the html that recreates this report.
   * @return {string}
   */
  getReportHtml() {
    this._topbar.resetUIState();
    return this._document.documentElement.outerHTML;
  }

  /**
   * Save json as a gist. Unimplemented in base UI features.
   */
  saveAsGist() {
    // TODO ?
    throw new Error('Cannot save as gist from base report');
  }

  _enableFireworks() {
    const scoresContainer = this._dom.find('.lh-scores-container', this._document);
    scoresContainer.classList.add('lh-score100');
    scoresContainer.addEventListener('click', _ => {
      scoresContainer.classList.toggle('lh-fireworks-paused');
    });
  }

  _setupMediaQueryListeners() {
    const mediaQuery = self.matchMedia('(max-width: 500px)');
    mediaQuery.addListener(this.onMediaQueryChange);
    // Ensure the handler is called on init
    this.onMediaQueryChange(mediaQuery);
  }

  /**
   * Resets the state of page before capturing the page for export.
   * When the user opens the exported HTML page, certain UI elements should
   * be in their closed state (not opened) and the templates should be unstamped.
   */
  _resetUIState() {
    this._topbar.resetUIState();
  }

  /**
   * Handle media query change events.
   * @param {MediaQueryList|MediaQueryListEvent} mql
   */
  onMediaQueryChange(mql) {
    const root = this._dom.find('.lh-root', this._document);
    root.classList.toggle('lh-narrow', mql.matches);
  }

  _setupThirdPartyFilter() {
    // Some audits should not display the third party filter option.
    const thirdPartyFilterAuditExclusions = [
      // These audits deal explicitly with third party resources.
      'uses-rel-preconnect',
      'third-party-facades',
    ];
    // Some audits should hide third party by default.
    const thirdPartyFilterAuditHideByDefault = [
      // Only first party resources are actionable.
      'legacy-javascript',
    ];

    // Get all tables with a text url column.
    const tables = Array.from(this._document.querySelectorAll('table.lh-table'));
    const tablesWithUrls = tables
      .filter(el =>
        el.querySelector('td.lh-table-column--url, td.lh-table-column--source-location'))
      .filter(el => {
        const containingAudit = el.closest('.lh-audit');
        if (!containingAudit) throw new Error('.lh-table not within audit');
        return !thirdPartyFilterAuditExclusions.includes(containingAudit.id);
      });

    tablesWithUrls.forEach((tableEl) => {
      const rowEls = getTableRows(tableEl);
      const thirdPartyRows = this._getThirdPartyRows(rowEls, this.json.finalUrl);

      // create input box
      const filterTemplate = this._dom.createComponent('3pFilter');
      const filterInput = this._dom.find('input', filterTemplate);

      filterInput.addEventListener('change', e => {
        const shouldHideThirdParty = e.target instanceof HTMLInputElement && !e.target.checked;
        let even = true;
        let rowEl = rowEls[0];
        while (rowEl) {
          const shouldHide = shouldHideThirdParty && thirdPartyRows.includes(rowEl);

          // Iterate subsequent associated sub item rows.
          do {
            rowEl.classList.toggle('lh-row--hidden', shouldHide);
            // Adjust for zebra styling.
            rowEl.classList.toggle('lh-row--even', !shouldHide && even);
            rowEl.classList.toggle('lh-row--odd', !shouldHide && !even);

            rowEl = /** @type {HTMLElement} */ (rowEl.nextElementSibling);
          } while (rowEl && rowEl.classList.contains('lh-sub-item-row'));

          if (!shouldHide) even = !even;
        }
      });

      this._dom.find('.lh-3p-filter-count', filterTemplate).textContent =
          `${thirdPartyRows.length}`;
      this._dom.find('.lh-3p-ui-string', filterTemplate).textContent =
          Util.i18n.strings.thirdPartyResourcesLabel;

      const allThirdParty = thirdPartyRows.length === rowEls.length;
      const allFirstParty = !thirdPartyRows.length;

      // If all or none of the rows are 3rd party, disable the checkbox.
      if (allThirdParty || allFirstParty) {
        filterInput.disabled = true;
        filterInput.checked = allThirdParty;
      }

      // Add checkbox to the DOM.
      if (!tableEl.parentNode) return; // Keep tsc happy.
      tableEl.parentNode.insertBefore(filterTemplate, tableEl);

      // Hide third-party rows for some audits by default.
      const containingAudit = tableEl.closest('.lh-audit');
      if (!containingAudit) throw new Error('.lh-table not within audit');
      if (thirdPartyFilterAuditHideByDefault.includes(containingAudit.id) && !allThirdParty) {
        filterInput.click();
      }
    });
  }

  /**
   * @param {Element} el
   */
  _setupElementScreenshotOverlay(el) {
    const fullPageScreenshot =
      this.json.audits['full-page-screenshot'] &&
      this.json.audits['full-page-screenshot'].details &&
      this.json.audits['full-page-screenshot'].details.type === 'full-page-screenshot' &&
      this.json.audits['full-page-screenshot'].details;
    if (!fullPageScreenshot) return;

    ElementScreenshotRenderer.installOverlayFeature({
      dom: this._dom,
      reportEl: el,
      overlayContainerEl: el,
      fullPageScreenshot,
    });
  }

  /**
   * From a table with URL entries, finds the rows containing third-party URLs
   * and returns them.
   * @param {HTMLElement[]} rowEls
   * @param {string} finalUrl
   * @return {Array<HTMLElement>}
   */
  _getThirdPartyRows(rowEls, finalUrl) {
    /** @type {Array<HTMLElement>} */
    const thirdPartyRows = [];
    const finalUrlRootDomain = Util.getRootDomain(finalUrl);

    for (const rowEl of rowEls) {
      if (rowEl.classList.contains('lh-sub-item-row')) continue;

      const urlItem = rowEl.querySelector('div.lh-text__url');
      if (!urlItem) continue;

      const datasetUrl = urlItem.dataset.url;
      if (!datasetUrl) continue;
      const isThirdParty = Util.getRootDomain(datasetUrl) !== finalUrlRootDomain;
      if (!isThirdParty) continue;

      thirdPartyRows.push(rowEl);
    }

    return thirdPartyRows;
  }

  /**
   * Downloads a file (blob) using a[download].
   * @param {Blob|File} blob The file to save.
   */
  _saveFile(blob) {
    const filename = fileNamer_1({
      finalUrl: this.json.finalUrl,
      fetchTime: this.json.fetchTime,
    });

    const ext = blob.type.match('json') ? '.json' : '.html';

    const a = this._dom.createElement('a');
    a.download = `${filename}${ext}`;
    this._dom.safelySetBlobHref(a, blob);
    this._document.body.appendChild(a); // Firefox requires anchor to be in the DOM.
    a.click();

    // cleanup.
    this._document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(a.href), 500);
  }
}

export { DOM, ReportRenderer, ReportUIFeatures };
