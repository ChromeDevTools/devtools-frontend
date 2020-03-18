// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as Components from '../components/components.js';
import * as HostModule from '../host/host.js';
import * as SDK from '../sdk/sdk.js';
import * as Timeline from '../timeline/timeline.js';
import * as UI from '../ui/ui.js';

const MaxLengthForLinks = 40;

/**
 * @override
 */
export class LighthouseReportRenderer extends ReportRenderer {
  /**
   * @param {!Element} el Parent element to render the report into.
   * @param {!ReportRenderer.RunnerResultArtifacts=} artifacts
   */
  static addViewTraceButton(el, artifacts) {
    if (!artifacts || !artifacts.traces || !artifacts.traces.defaultPass) {
      return;
    }

    const container = el.querySelector('.lh-audit-group');
    const columnsEl = container.querySelector('.lh-columns');
    // There will be no columns if just the PWA category.
    if (!columnsEl) {
      return;
    }

    const defaultPassTrace = artifacts.traces.defaultPass;
    const timelineButton =
        UI.UIUtils.createTextButton(Common.UIString.UIString('View Trace'), onViewTraceClick, 'view-trace');
    container.insertBefore(timelineButton, columnsEl.nextSibling);

    async function onViewTraceClick() {
      HostModule.userMetrics.actionTaken(Host.UserMetrics.Action.LighthouseViewTrace);
      await self.UI.inspectorView.showPanel('timeline');
      Timeline.TimelinePanel.TimelinePanel.instance().loadFromEvents(defaultPassTrace.traceEvents);
    }
  }

  /**
   * @param {!Element} el
   */
  static async linkifyNodeDetails(el) {
    const mainTarget = SDK.SDKModel.TargetManager.instance().mainTarget();
    const domModel = mainTarget.model(SDK.DOMModel.DOMModel);

    for (const origElement of el.getElementsByClassName('lh-node')) {
      /** @type {!DetailsRenderer.NodeDetailsJSON} */
      const detailsItem = origElement.dataset;
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

      const element = await Common.Linkifier.Linkifier.linkify(node, {tooltip: detailsItem.snippet});
      origElement.title = '';
      origElement.textContent = '';
      origElement.appendChild(element);
    }
  }

  /**
   * @param {!Element} el
   */
  static async linkifySourceLocationDetails(el) {
    for (const origElement of el.getElementsByClassName('lh-source-location')) {
      /** @type {!DetailsRenderer.SourceLocationDetailsJSON} */
      const detailsItem = origElement.dataset;
      if (!detailsItem.sourceUrl || !detailsItem.sourceLine || !detailsItem.sourceColumn) {
        continue;
      }
      const url = detailsItem.sourceUrl;
      const line = Number(detailsItem.sourceLine);
      const column = Number(detailsItem.sourceColumn);
      const element = await Components.Linkifier.Linkifier.linkifyURL(
          url, {lineNumber: line, column, maxLength: MaxLengthForLinks});
      origElement.title = '';
      origElement.textContent = '';
      origElement.appendChild(element);
    }
  }

  /**
   * @param {!Element} el
   */
  static handleDarkMode(el) {
    if (self.UI.themeSupport.themeName() === 'dark') {
      el.classList.add('dark');
    }
  }
}

/**
 * @override
 */
export class LighthouseReportUIFeatures extends ReportUIFeatures {
  /**
   * @param {!DOM} dom
   */
  constructor(dom) {
    super(dom);
    this._beforePrint = null;
    this._afterPrint = null;
  }

  /**
   * @param {?function()} beforePrint
   */
  setBeforePrint(beforePrint) {
    this._beforePrint = beforePrint;
  }

  /**
   * @param {?function()} afterPrint
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
    return Lighthouse.ReportGenerator.generateReportHtml(this.json);
  }

  /**
   * Downloads a file (blob) using the system dialog prompt.
   * @param {!Blob|!File} blob The file to save.
   */
  async _saveFile(blob) {
    const domain = new Common.ParsedURL.ParsedURL(this.json.finalUrl).domain();
    const sanitizedDomain = domain.replace(/[^a-z0-9.-]+/gi, '_');
    const timestamp = new Date(this.json.fetchTime).toISO8601Compact();
    const ext = blob.type.match('json') ? '.json' : '.html';
    const basename = `${sanitizedDomain}-${timestamp}${ext}`;
    const text = await blob.text();
    self.Workspace.fileManager.save(basename, text, true /* forceSaveAs */);
  }

  async _print() {
    const document = this.getDocument();
    const clonedReport = document.querySelector('.lh-root').cloneNode(true /* deep */);
    const printWindow = window.open('', '_blank', 'channelmode=1,status=1,resizable=1');
    const style = printWindow.document.createElement('style');
    style.textContent = self.Runtime.cachedResources['third_party/lighthouse/report-assets/report.css'];
    printWindow.document.head.appendChild(style);
    printWindow.document.body.replaceWith(clonedReport);
    // Linkified nodes are shadow elements, which aren't exposed via `cloneNode`.
    await LighthouseReportRenderer.linkifyNodeDetails(clonedReport);

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
