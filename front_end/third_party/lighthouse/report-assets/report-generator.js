(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}(g.Lighthouse || (g.Lighthouse = {})).ReportGenerator = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({"./html/html-report-assets.js":[function(require,module,exports){
/**
 * @license Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @fileoverview Instead of loading report assets form the filesystem, in Devtools we must load
 * them via self.Runtime.cachedResources. We use this module to shim
 * lighthouse-core/report/html/html-report-assets.js in Devtools.
 */

// @ts-ignore: self.Runtime exists in Devtools.
const cachedResources = self.Runtime.cachedResources;

// Getters are necessary because the DevTools bundling processes
// resources after this module is resolved. These properties are not
// read from immediately, so we can defer reading with getters and everything
// is going to be OK.
module.exports = {
  get REPORT_CSS() {
    return cachedResources['third_party/lighthouse/report-assets/report.css'];
  },
  get REPORT_JAVASCRIPT() {
    return cachedResources['third_party/lighthouse/report-assets/report.js'];
  },
  get REPORT_TEMPLATE() {
    return cachedResources['third_party/lighthouse/report-assets/template.html'];
  },
  get REPORT_TEMPLATES() {
    return cachedResources['third_party/lighthouse/report-assets/templates.html'];
  },
};

},{}],1:[function(require,module,exports){
/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const htmlReportAssets = require('./html/html-report-assets.js');

class ReportGenerator {
  /**
   * Replaces all the specified strings in source without serial replacements.
   * @param {string} source
   * @param {!Array<{search: string, replacement: string}>} replacements
   * @return {string}
   */
  static replaceStrings(source, replacements) {
    if (replacements.length === 0) {
      return source;
    }

    const firstReplacement = replacements[0];
    const nextReplacements = replacements.slice(1);
    return source
        .split(firstReplacement.search)
        .map(part => ReportGenerator.replaceStrings(part, nextReplacements))
        .join(firstReplacement.replacement);
  }

  /**
   * Returns the report HTML as a string with the report JSON and renderer JS inlined.
   * @param {LH.Result} lhr
   * @return {string}
   */
  static generateReportHtml(lhr) {
    const sanitizedJson = JSON.stringify(lhr)
      .replace(/</g, '\\u003c') // replaces opening script tags
      .replace(/\u2028/g, '\\u2028') // replaces line separators ()
      .replace(/\u2029/g, '\\u2029'); // replaces paragraph separators
    const sanitizedJavascript = htmlReportAssets.REPORT_JAVASCRIPT.replace(/<\//g, '\\u003c/');

    return ReportGenerator.replaceStrings(htmlReportAssets.REPORT_TEMPLATE, [
      {search: '%%LIGHTHOUSE_JSON%%', replacement: sanitizedJson},
      {search: '%%LIGHTHOUSE_JAVASCRIPT%%', replacement: sanitizedJavascript},
      {search: '/*%%LIGHTHOUSE_CSS%%*/', replacement: htmlReportAssets.REPORT_CSS},
      {search: '%%LIGHTHOUSE_TEMPLATES%%', replacement: htmlReportAssets.REPORT_TEMPLATES},
    ]);
  }

  /**
   * Converts the results to a CSV formatted string
   * Each row describes the result of 1 audit with
   *  - the name of the category the audit belongs to
   *  - the name of the audit
   *  - a description of the audit
   *  - the score type that is used for the audit
   *  - the score value of the audit
   *
   * @param {LH.Result} lhr
   * @return {string}
   */
  static generateReportCSV(lhr) {
    // To keep things "official" we follow the CSV specification (RFC4180)
    // The document describes how to deal with escaping commas and quotes etc.
    const CRLF = '\r\n';
    const separator = ',';
    /** @param {string} value @return {string} */
    const escape = value => `"${value.replace(/"/g, '""')}"`;

    // Possible TODO: tightly couple headers and row values
    const header = ['category', 'name', 'title', 'type', 'score'];
    const table = Object.values(lhr.categories).map(category => {
      return category.auditRefs.map(auditRef => {
        const audit = lhr.audits[auditRef.id];
        // CSV validator wants all scores to be numeric, use -1 for now
        const numericScore = audit.score === null ? -1 : audit.score;
        return [category.title, audit.id, audit.title, audit.scoreDisplayMode, numericScore]
          .map(value => value.toString())
          .map(escape);
      });
    });

    return [header].concat(...table)
      .map(row => row.join(separator)).join(CRLF);
  }

  /**
   * Creates the results output in a format based on the `mode`.
   * @param {LH.Result} lhr
   * @param {LH.Config.Settings['output']} outputModes
   * @return {string|string[]}
   */
  static generateReport(lhr, outputModes) {
    const outputAsArray = Array.isArray(outputModes);
    if (typeof outputModes === 'string') outputModes = [outputModes];

    const output = outputModes.map(outputMode => {
      // HTML report.
      if (outputMode === 'html') {
        return ReportGenerator.generateReportHtml(lhr);
      }
      // CSV report.
      if (outputMode === 'csv') {
        return ReportGenerator.generateReportCSV(lhr);
      }
      // JSON report.
      if (outputMode === 'json') {
        return JSON.stringify(lhr, null, 2);
      }

      throw new Error('Invalid output mode: ' + outputMode);
    });

    return outputAsArray ? output : output[0];
  }
}

module.exports = ReportGenerator;

},{"./html/html-report-assets.js":"./html/html-report-assets.js"}]},{},[1])(1)
});
