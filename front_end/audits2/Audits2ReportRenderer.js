// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @override
 */
Audits2.ReportRenderer = class extends ReportRenderer {
  /**
   * Provides empty element for left nav
   * @override
   * @returns {!DocumentFragment}
   */
  _renderReportNav() {
    return createDocumentFragment();
  }

  /**
   * @param {!ReportRenderer.ReportJSON} report
   * @override
   * @return {!DocumentFragment}
   */
  _renderReportHeader(report) {
    return createDocumentFragment();
  }
};

class ReportUIFeatures {
  /**
   * @param {!ReportRenderer.ReportJSON} report
   */
  initFeatures(report) {
  }
}

Audits2.CategoryRenderer = class extends CategoryRenderer {
  /**
   * @override
   * @param {!DOM} dom
   * @param {!DetailsRenderer} detailsRenderer
   */
  constructor(dom, detailsRenderer) {
    super(dom, detailsRenderer);
    this._defaultPassTrace = null;
  }

  /**
   * @param {!ReportRenderer.ReportJSON} lhr
   */
  setTraceArtifact(lhr) {
    if (!lhr.artifacts || !lhr.artifacts.traces || !lhr.artifacts.traces.defaultPass)
      return;
    this._defaultPassTrace = lhr.artifacts.traces.defaultPass;
  }

  /**
   * @override
   * @param {!ReportRenderer.CategoryJSON} category
   * @param {!Object<string, !ReportRenderer.GroupJSON>} groups
   * @return {!Element}
   */
  renderPerformanceCategory(category, groups) {
    const defaultPassTrace = this._defaultPassTrace;
    const element = super.renderPerformanceCategory(category, groups);
    if (!defaultPassTrace)
      return element;

    const timelineButton = UI.createTextButton(Common.UIString('View Trace'), onViewTraceClick, 'view-trace');
    element.querySelector('.lh-audit-group').prepend(timelineButton);
    return element;

    async function onViewTraceClick() {
      await UI.inspectorView.showPanel('timeline');
      Timeline.TimelinePanel.instance().loadFromEvents(defaultPassTrace.traceEvents);
    }
  }
};

Audits2.DetailsRenderer = class extends DetailsRenderer {
  /**
   * @param {!DOM} dom
   */
  constructor(dom) {
    super(dom);
    this._onLoadPromise = null;
  }

  /**
   * @override
   * @param {!DetailsRenderer.NodeDetailsJSON} item
   * @return {!Element}
   */
  renderNode(item) {
    const element = super.renderNode(item);
    this._replaceWithDeferredNodeBlock(element, item);
    return element;
  }

  /**
   * @param {!Element} origElement
   * @param {!DetailsRenderer.NodeDetailsJSON} detailsItem
   */
  async _replaceWithDeferredNodeBlock(origElement, detailsItem) {
    const mainTarget = SDK.targetManager.mainTarget();
    if (!this._onLoadPromise) {
      const resourceTreeModel = mainTarget.model(SDK.ResourceTreeModel);
      this._onLoadPromise = resourceTreeModel.once(SDK.ResourceTreeModel.Events.Load);
    }

    await this._onLoadPromise;

    const domModel = mainTarget.model(SDK.DOMModel);
    if (!detailsItem.path)
      return;

    const nodeId = await domModel.pushNodeByPathToFrontend(detailsItem.path);

    if (!nodeId)
      return;
    const node = domModel.nodeForId(nodeId);
    if (!node)
      return;

    const element =
        await Common.Linkifier.linkify(node, /** @type {!Common.Linkifier.Options} */ ({title: detailsItem.snippet}));
    origElement.title = '';
    origElement.textContent = '';
    origElement.appendChild(element);
  }
};
