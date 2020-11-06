// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export class ReportRenderer {
  /**
   * @param {!DOM} dom
   */
  constructor(dom) {
  }

  /**
   * @param {!ReportJSON} report
   * @param {!Element} container Parent element to render the report into.
   * @return {!Element}
   */
  renderReport(report, container) {
    throw new Error('Not implemented yet!');
  }

  /**
   * @param {!Document|!Element} context
   */
  setTemplateContext(context) {
  }
}

/** @type {function(new:ReportRenderer, !DOM)} */
// @ts-ignore
self.ReportRenderer;

export class ReportUIFeatures {
  /**
   * @param {!DOM} dom
   */
  constructor(dom) {
    /** @type {!ReportJSON} */
    this.json;
    /** @type {!Document} */
    this._document;
  }

  /**
   * @param {!Document|!Element} context
   */
  setTemplateContext(context) {
  }

  /**
   * @param {!ReportJSON} report
   */
  initFeatures(report) {
  }

  _resetUIState() {
  }
  /**
   * @param {?function():void} beforePrint
   */
  setBeforePrint(beforePrint) {
  }

  /**
   * @param {?function():void} afterPrint
   */
  setAfterPrint(afterPrint) {
  }
}

/** @type {function(new:ReportUIFeatures)} */
// @ts-ignore
self.ReportUIFeatures;

export class CategoryRenderer {
  /**
   * @param {!DOM} dom
   * @param {!DetailsRenderer} detailsRenderer
   */
  constructor(dom, detailsRenderer) {
  }
}

export class DetailsRenderer {
  /**
   * @param {!DOM} dom
   */
  constructor(dom) {
  }

  /**
   * @param {!NodeDetailsJSON} item
   * @return {!Element}
   */
  renderNode(item) {
    throw new Error('Not implemented yet!');
  }
}

export class LighthouseReportGenerator {
  /**
   * @param {!ReportJSON} lhr
   * @return {string}
   */
  generateReportHtml(lhr) {
    return '';
  }
}

/**
 * @typedef {{
 *     rawValue: (number|boolean|undefined),
 *     id: string,
 *     title: string,
 *     description: string,
 *     explanation: (string|undefined),
 *     errorMessage: (string|undefined),
 *     displayValue: (string|Array<string|number>|undefined),
 *     scoreDisplayMode: string,
 *     error: boolean,
 *     score: (number|null),
 *     details: (!DetailsJSON|undefined),
 * }}
 */
// @ts-ignore typedef
export let AuditResultJSON;

/**
 * @typedef {{
 *     id: string,
 *     score: (number|null),
 *     weight: number,
 *     group: (string|undefined),
 *     result: !AuditResultJSON
 * }}
 */
// @ts-ignore typedef
export let AuditJSON;

/**
 * @typedef {{
 *     title: string,
 *     id: string,
 *     score: (number|null),
 *     description: (string|undefined),
 *     manualDescription: string,
 *     auditRefs: !Array<!AuditJSON>
 * }}
 */
// @ts-ignore typedef
export let CategoryJSON;

/**
 * @typedef {{
 *     title: string,
 *     description: (string|undefined),
 * }}
 */
// @ts-ignore typedef
export let GroupJSON;

/**
 * @typedef {{
 *     lighthouseVersion: string,
 *     userAgent: string,
 *     fetchTime: string,
 *     timing: {total: number},
 *     requestedUrl: string,
 *     finalUrl: string,
 *     runWarnings: (!Array<string>|undefined),
 *     artifacts: {traces: {defaultPass: {traceEvents: !Array<?>}}},
 *     audits: !Object<string, !AuditResultJSON>,
 *     categories: !Object<string, !CategoryJSON>,
 *     categoryGroups: !Object<string, !GroupJSON>,
 * }}
 */
// @ts-ignore typedef
export let ReportJSON;

/**
 * @typedef {{
 *     type: string,
 *     value: (string|number|undefined),
 *     summary: (!OpportunitySummary|undefined),
 *     granularity: (number|undefined),
 *     displayUnit: (string|undefined)
 * }}
 */
// @ts-ignore typedef
export let DetailsJSON;

/**
 * @typedef {{
 *     traces: {defaultPass: {traceEvents: !Array<?>}},
 *     settings: {throttlingMethod: string},
 * }}
 */
// @ts-ignore typedef
export let RunnerResultArtifacts;

/**
 * @typedef {{
 *     lhr: !ReportJSON,
 *     artifacts: RunnerResultArtifacts,
 *     report: string,
 *     stack: string,
 *     fatal: boolean,
 *     message: (string|undefined),
 * }}
 */
// @ts-ignore typedef
export let RunnerResult;

/**
 * @typedef {{
 *     type: string,
 *     path: (string|undefined),
 *     selector: (string|undefined),
 *     snippet:(string|undefined)
 * }}
 */
// @ts-ignore typedef
export let NodeDetailsJSON;

/**
 * @typedef {{
 *     sourceUrl: (string|undefined),
 *     sourceLine: (string|undefined),
 *     sourceColumn: (string|undefined),
 * }}
 */
// @ts-ignore typedef
export let SourceLocationDetailsJSON;

/** @typedef {{
 *     wastedMs: (number|undefined),
 *     wastedBytes: (number|undefined),
 * }}
*/
// @ts-ignore typedef
export let OpportunitySummary;
