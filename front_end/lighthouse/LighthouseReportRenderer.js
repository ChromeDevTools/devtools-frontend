// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as Components from '../components/components.js';
import * as Host from '../host/host.js';
import * as Platform from '../platform/platform.js';
import * as Root from '../root/root.js';
import * as SDK from '../sdk/sdk.js';
import * as ThemeSupport from '../theme_support/theme_support.js';
import * as Timeline from '../timeline/timeline.js';
import * as UI from '../ui/ui.js';
import * as Workspace from '../workspace/workspace.js';

import * as ReportRenderer from './LighthouseReporterTypes.js';  // eslint-disable-line no-unused-vars

const MaxLengthForLinks = 40;

/**
 * @override
 * @extends {ReportRenderer.ReportRenderer}
 */
// @ts-ignore https://github.com/GoogleChrome/lighthouse/issues/11628
export class LighthouseReportRenderer extends self.ReportRenderer {
  /**
   * @param {!DOM} dom
   */
  constructor(dom) {
    super(dom);
  }
  /**
   * @param {!Element} el Parent element to render the report into.
   * @param {!ReportRenderer.RunnerResultArtifacts=} artifacts
   */
  static addViewTraceButton(el, artifacts) {
    if (!artifacts || !artifacts.traces || !artifacts.traces.defaultPass) {
      return;
    }

    const simulated = artifacts.settings.throttlingMethod === 'simulate';
    const container = el.querySelector('.lh-audit-group');
    if (!container) {
      return;
    }
    const disclaimerEl = container.querySelector('.lh-metrics__disclaimer');
    // If it was a PWA-only run, we'd have a trace but no perf category to add the button to
    if (!disclaimerEl) {
      return;
    }

    const defaultPassTrace = artifacts.traces.defaultPass;
    const label = simulated ? Common.UIString.UIString('View Original Trace') : Common.UIString.UIString('View Trace');
    const timelineButton = UI.UIUtils.createTextButton(label, onViewTraceClick, 'view-trace');
    if (simulated) {
      timelineButton.title = Common.UIString.UIString(
          'The performance metrics above are simulated and won\'t match the timings found in this trace. Disable simulated throttling in "Lighthouse Settings" if you want the timings to match.');
    }
    container.insertBefore(timelineButton, disclaimerEl.nextSibling);

    async function onViewTraceClick() {
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.LighthouseViewTrace);
      await UI.InspectorView.InspectorView.instance().showPanel('timeline');
      Timeline.TimelinePanel.TimelinePanel.instance().loadFromEvents(defaultPassTrace.traceEvents);
    }
  }

  /**
   * @param {!Element} el
   */
  static async linkifyNodeDetails(el) {
    const mainTarget = SDK.SDKModel.TargetManager.instance().mainTarget();
    if (!mainTarget) {
      return;
    }
    const domModel = mainTarget.model(SDK.DOMModel.DOMModel);
    if (!domModel) {
      return;
    }

    for (const origElement of el.getElementsByClassName('lh-node')) {
      const origHTMLElement = /** @type {!HTMLElement} */ (origElement);
      const detailsItem = /** @type {!ReportRenderer.NodeDetailsJSON} */ (origHTMLElement.dataset);
      if (!detailsItem.path) {
        continue;
      }

      const nodeId = await domModel.pushNodeByPathToFrontend(detailsItem.path);

      if (!nodeId) {
        continue;
      }
      const node = domModel.nodeForId(nodeId);
      if (!node) {
        continue;
      }

      const element = await Common.Linkifier.Linkifier.linkify(
          node, {tooltip: detailsItem.snippet, preventKeyboardFocus: undefined});
      origHTMLElement.title = '';
      origHTMLElement.textContent = '';
      origHTMLElement.appendChild(element);
    }
  }

  /**
   * @param {!Element} el
   */
  static async linkifySourceLocationDetails(el) {
    for (const origElement of el.getElementsByClassName('lh-source-location')) {
      const origHTMLElement = /** @type {!HTMLElement} */ (origElement);
      const detailsItem = /** @type {!ReportRenderer.SourceLocationDetailsJSON} */ (origHTMLElement.dataset);
      if (!detailsItem.sourceUrl || !detailsItem.sourceLine || !detailsItem.sourceColumn) {
        continue;
      }
      const url = detailsItem.sourceUrl;
      const line = Number(detailsItem.sourceLine);
      const column = Number(detailsItem.sourceColumn);
      const element = await Components.Linkifier.Linkifier.linkifyURL(url, {
        lineNumber: line,
        columnNumber: column,
        maxLength: MaxLengthForLinks,
        bypassURLTrimming: undefined,
        className: undefined,
        preventClick: undefined,
        tabStop: undefined,
        text: undefined
      });
      origHTMLElement.title = '';
      origHTMLElement.textContent = '';
      origHTMLElement.appendChild(element);
    }
  }

  /**
   * @param {!Element} el
   */
  static handleDarkMode(el) {
    if (ThemeSupport.ThemeSupport.instance().themeName() === 'dark') {
      el.classList.add('dark');
    }
  }
}

/**
 * @override
 * @extends {ReportRenderer.ReportUIFeatures}
 */
// @ts-ignore https://github.com/GoogleChrome/lighthouse/issues/11628
export class LighthouseReportUIFeatures extends self.ReportUIFeatures {
  /**
   * @param {!DOM} dom
   */
  constructor(dom) {
    super(dom);
    this._beforePrint = null;
    this._afterPrint = null;
  }

  /**
   * @override
   * @param {?function():void} beforePrint
   */
  setBeforePrint(beforePrint) {
    this._beforePrint = beforePrint;
  }

  /**
   * @override
   * @param {?function():void} afterPrint
   */
  setAfterPrint(afterPrint) {
    this._afterPrint = afterPrint;
  }

  /**
   * Returns the html that recreates this report.
   * @return {string}
   * @protected
   */
  getReportHtml() {
    this.resetUIState();
    // @ts-ignore https://github.com/GoogleChrome/lighthouse/issues/11628
    return Lighthouse.ReportGenerator.generateReportHtml(this.json);
  }

  /**
   * Downloads a file (blob) using the system dialog prompt.
   * @param {!Blob|!File} blob The file to save.
   */
  async _saveFile(blob) {
    const domain = new Common.ParsedURL.ParsedURL(this.json.finalUrl).domain();
    const sanitizedDomain = domain.replace(/[^a-z0-9.-]+/gi, '_');
    const timestamp = Platform.DateUtilities.toISO8601Compact(new Date(this.json.fetchTime));
    const ext = blob.type.match('json') ? '.json' : '.html';
    const basename = `${sanitizedDomain}-${timestamp}${ext}`;
    const text = await blob.text();
    Workspace.FileManager.FileManager.instance().save(basename, text, true /* forceSaveAs */);
  }

  async _print() {
    const document = this.getDocument();
    const clonedReport = /** @type {!HTMLElement} */ (document.querySelector('.lh-root')).cloneNode(true /* deep */);
    const printWindow = window.open('', '_blank', 'channelmode=1,status=1,resizable=1');
    if (!printWindow) {
      return;
    }
    const style = printWindow.document.createElement('style');
    style.textContent = Root.Runtime.cachedResources.get('third_party/lighthouse/report-assets/report.css') || '';
    printWindow.document.head.appendChild(style);
    printWindow.document.body.replaceWith(clonedReport);
    // Linkified nodes are shadow elements, which aren't exposed via `cloneNode`.
    await LighthouseReportRenderer.linkifyNodeDetails(/** @type {!HTMLElement} */ (clonedReport));

    if (this._beforePrint) {
      this._beforePrint();
    }
    printWindow.focus();
    printWindow.print();
    printWindow.close();
    if (this._afterPrint) {
      this._afterPrint();
    }
  }

  /**
   * @suppress {visibility}
   * @return {!Document}
   */
  getDocument() {
    return this._document;
  }

  /**
   * @suppress {visibility}
   */
  resetUIState() {
    this._resetUIState();
  }
}
