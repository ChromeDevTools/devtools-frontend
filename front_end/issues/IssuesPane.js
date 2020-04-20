// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Network from '../network/network.js';
import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';

class AffectedResourcesView extends UI.TreeOutline.TreeElement {
  /**
   * @param {!AggregatedIssueView} parent
   * @param {!{singular:string, plural:string}} resourceName - Singular and plural of the affected resource name.
   */
  constructor(parent, resourceName) {
    super();
    this.toggleOnClick = true;
    /** @type {!AggregatedIssueView} */
    this._parent = parent;
    this._resourceName = resourceName;
    /** @type {!Element} */
    this._affectedResourcesCountElement = this.createAffectedResourcesCounter();
    /** @type {!Element} */
    this._affectedResources = this.createAffectedResources();
    this._affectedResourcesCount = 0;
  }

  /**
   * @returns {!Element}
   */
  createAffectedResourcesCounter() {
    const counterLabel = createElementWithClass('div', 'affected-resource-label');
    this.listItemElement.appendChild(counterLabel);
    return counterLabel;
  }

  /**
   * @returns {!Element}
   */
  createAffectedResources() {
    const body = new UI.TreeOutline.TreeElement();
    const affectedResources = createElementWithClass('table', 'affected-resource-list');
    const header = createElementWithClass('tr');

    const name = createElementWithClass('td', 'affected-resource-header');
    name.textContent = 'Name';
    header.appendChild(name);

    const info = createElementWithClass('td', 'affected-resource-header affected-resource-header-info');
    // Prepend a space to align them better with cookie domains starting with a "."
    info.textContent = '\u2009Context';
    header.appendChild(info);

    affectedResources.appendChild(header);
    body.listItemElement.appendChild(affectedResources);
    this.appendChild(body);

    return affectedResources;
  }

  /**
   *
   * @param {number} count
   */
  getResourceName(count) {
    if (count === 1) {
      return this._resourceName.singular;
    }
    return this._resourceName.plural;
  }

  /**
   * @param {number} count
   */
  updateAffectedResourceCount(count) {
    this._affectedResourcesCount = count;
    this._affectedResourcesCountElement.textContent = `${count} ${this.getResourceName(count)}`;
    this.hidden = this._affectedResourcesCount === 0;
    this._parent.updateAffectedResourceVisibility();
  }

  /**
   * @returns {boolean}
   */
  isEmpty() {
    return this._affectedResourcesCount === 0;
  }

  clear() {
    this._affectedResources.textContent = '';
  }
}

class AffectedCookiesView extends AffectedResourcesView {
  /**
   * @param {!AggregatedIssueView} parent
   * @param {!SDK.Issue.AggregatedIssue} issue
   */
  constructor(parent, issue) {
    super(parent, {singular: ls`cookie`, plural: ls`cookies`});
    /** @type {!SDK.Issue.AggregatedIssue} */
    this._issue = issue;
  }

  /**
   * @param {!Iterable<!Protocol.Audits.AffectedCookie>} cookies
   */
  _appendAffectedCookies(cookies) {
    let count = 0;
    for (const cookie of cookies) {
      count++;
      this.appendAffectedCookie(/** @type{!{name:string,path:string,domain:string,siteForCookies:string}} */ (cookie));
    }
    this.updateAffectedResourceCount(count);
  }

  /**
   *
   * @param {!{name:string,path:string,domain:string,siteForCookies:string}} cookie
   */
  appendAffectedCookie(cookie) {
    const element = createElementWithClass('tr', 'affected-resource-cookie');
    const name = createElementWithClass('td', '');
    name.appendChild(UI.UIUtils.createTextButton(cookie.name, () => {
      Network.NetworkPanel.NetworkPanel.revealAndFilter([
        {
          filterType: 'cookie-domain',
          filterValue: cookie.domain,
        },
        {
          filterType: 'cookie-name',
          filterValue: cookie.name,
        },
        {
          filterType: 'cookie-path',
          filterValue: cookie.path,
        }
      ]);
    }, 'link-style devtools-link'));
    const info = createElementWithClass('td', 'affected-resource-cookie-info');

    // Prepend a space for all domains not starting with a "." to align them better.
    info.textContent = (cookie.domain[0] !== '.' ? '\u2008' : '') + cookie.domain + cookie.path;

    element.appendChild(name);
    element.appendChild(info);
    this._affectedResources.appendChild(element);
  }

  update() {
    this.clear();
    this._appendAffectedCookies(this._issue.cookies());
  }
}

class AffectedRequestsView extends AffectedResourcesView {
  /**
   * @param {!AggregatedIssueView} parent
   * @param {!SDK.Issue.AggregatedIssue} issue
   */
  constructor(parent, issue) {
    super(parent, {singular: ls`request`, plural: ls`requests`});
    /** @type {!SDK.Issue.AggregatedIssue} */
    this._issue = issue;
  }

  /**
   * @param {!Iterable<!SDK.NetworkRequest.NetworkRequest>} requests
   */
  _appendAffectedRequests(requests) {
    let count = 0;
    for (const request of requests) {
      count++;
      this.appendAffectedRequest(request);
    }
    this.updateAffectedResourceCount(count);
  }

  /**
   *
   * @param {!SDK.NetworkRequest.NetworkRequest} request
   */
  appendAffectedRequest(request) {
    const nameText = request.name().trimMiddle(100);
    const nameElement = createElementWithClass('td', '');
    nameElement.appendChild(UI.UIUtils.createTextButton(nameText, () => {
      Network.NetworkPanel.NetworkPanel.selectAndShowRequest(request, Network.NetworkItemView.Tabs.Headers);
    }, 'link-style devtools-link'));
    const element = createElementWithClass('tr', 'affected-resource-request');
    element.appendChild(nameElement);
    this._affectedResources.appendChild(element);
  }

  update() {
    this.clear();
    this._appendAffectedRequests(this._issue.requests());
  }
}


class AggregatedIssueView extends UI.TreeOutline.TreeElement {
  /**
   *
   * @param {!IssuesPaneImpl} parent
   * @param {!SDK.Issue.AggregatedIssue} issue
   * @param {!SDK.Issue.IssueDescription} description
   */
  constructor(parent, issue, description) {
    super();
    this._parent = parent;
    this._issue = issue;
    /** @type {!SDK.Issue.IssueDescription} */
    this._description = description;

    this.toggleOnClick = true;
    this.listItemElement.classList.add('issue');
    this.childrenListElement.classList.add('body');

    this._affectedResources = this._createAffectedResources();
    this._affectedCookiesView = new AffectedCookiesView(this, this._issue);
    this._affectedRequestsView = new AffectedRequestsView(this, this._issue);
  }

  /**
   * @override
   */
  onattach() {
    this._appendHeader();
    this._createBody();
    this.appendChild(this._affectedResources);
    this.appendAffectedResource(this._affectedCookiesView);
    this._affectedCookiesView.update();
    this.appendAffectedResource(this._affectedRequestsView);
    this._affectedRequestsView.update();
    this._createReadMoreLink();

    this.updateAffectedResourceVisibility();
  }

  /**
   * @param {!UI.TreeOutline.TreeElement} resource
   */
  appendAffectedResource(resource) {
    this._affectedResources.appendChild(resource);
  }

  _appendHeader() {
    const header = createElementWithClass('div', 'header');
    const icon = UI.Icon.Icon.create('largeicon-breaking-change', 'icon');
    header.appendChild(icon);

    const title = createElementWithClass('div', 'title');
    title.textContent = this._description.title;
    header.appendChild(title);

    this.listItemElement.appendChild(header);
  }

  updateAffectedResourceVisibility() {
    const noCookies = !this._affectedCookiesView || this._affectedCookiesView.isEmpty();
    const noRequests = !this._affectedRequestsView || this._affectedRequestsView.isEmpty();
    const noResources = noCookies && noRequests;
    this._affectedResources.hidden = noResources;
  }

  /**
   *
   * @returns {!UI.TreeOutline.TreeElement}
   */
  _createAffectedResources() {
    const wrapper = new UI.TreeOutline.TreeElement();
    wrapper.setCollapsible(false);
    wrapper.setExpandable(true);
    wrapper.expand();
    wrapper.selectable = false;
    wrapper.listItemElement.classList.add('affected-resources-label');
    wrapper.listItemElement.textContent = ls`Affected Resources`;
    wrapper.childrenListElement.classList.add('affected-resources');
    return wrapper;
  }

  _createBody() {
    const kindAndCode = new UI.TreeOutline.TreeElement();
    kindAndCode.setCollapsible(false);
    kindAndCode.selectable = false;
    kindAndCode.listItemElement.classList.add('kind-code-line');
    const kind = createElementWithClass('span', 'issue-kind');
    kind.textContent = issueKindToString(this._description.issueKind);
    kindAndCode.listItemElement.appendChild(kind);
    kindAndCode.listItemElement.appendChild(createElementWithClass('span', 'separator'));
    const code = createElementWithClass('span', 'issue-code');
    code.textContent = this._issue.code();
    kindAndCode.listItemElement.appendChild(code);

    this.appendChild(kindAndCode);

    const messageElement = new UI.TreeOutline.TreeElement();
    messageElement.setCollapsible(false);
    messageElement.selectable = false;
    const message = this._description.message();
    messageElement.listItemElement.appendChild(message);
    this.appendChild(messageElement);
  }

  _createReadMoreLink() {
    const link = UI.XLink.XLink.create(this._description.link, ls`Learn more: ${this._description.linkTitle}`, 'link');
    const linkIcon = UI.Icon.Icon.create('largeicon-link', 'link-icon');
    link.prepend(linkIcon);
    const linkWrapper = new UI.TreeOutline.TreeElement();
    linkWrapper.setCollapsible(false);
    linkWrapper.listItemElement.classList.add('link-wrapper');
    linkWrapper.listItemElement.appendChild(link);
    this.appendChild(linkWrapper);
  }

  update() {
    this._affectedCookiesView.update();
    this._affectedRequestsView.update();
    this.updateAffectedResourceVisibility();
  }


  /**
   * @param {(boolean|undefined)=} expand - Expands the issue if `true`, collapses if `false`, toggles collapse if undefined
   */
  toggle(expand) {
    if (expand || (expand === undefined && !this.expanded)) {
      this.expand();
    } else {
      this.collapse();
    }
  }
}

export class IssuesPaneImpl extends UI.Widget.VBox {
  constructor() {
    super(true);
    this.registerRequiredCSS('issues/issuesPane.css');
    this._issueViews = new Map();

    const {toolbarContainer, updateToolbarIssuesCount} = this._createToolbars();
    this._issuesToolbarContainer = toolbarContainer;
    this._updateToolbarIssuesCount = updateToolbarIssuesCount;

    this._issuesTree = new UI.TreeOutline.TreeOutlineInShadow();
    this._issuesTree.registerRequiredCSS('issues/issuesTree.css');
    this._issuesTree.setShowSelectionOnKeyboardFocus(true);
    this._issuesTree.contentElement.classList.add('issues');
    this.contentElement.appendChild(this._issuesTree.element);

    const mainTarget = SDK.SDKModel.TargetManager.instance().mainTarget();
    this._model = null;
    if (mainTarget) {
      this._model = mainTarget.model(SDK.IssuesModel.IssuesModel);
      if (this._model) {
        this._model.addEventListener(SDK.IssuesModel.Events.AggregatedIssueUpdated, this._aggregatedIssueUpdated, this);
        this._model.addEventListener(SDK.IssuesModel.Events.FullUpdateRequired, this._fullUpdate, this);
        this._model.ensureEnabled();
      }
    }

    if (this._model) {
      for (const issue of this._model.aggregatedIssues()) {
        this._updateAggregatedIssueView(issue);
      }
    }
    this._updateCounts();

    /** @type {?UI.Infobar.Infobar} */
    this._reloadInfobar = null;
    /** @type {?Element} */
    this._infoBarDiv = null;
    this._showReloadInfobarIfNeeded();
  }

  /**
   * @returns {!{toolbarContainer: !Element, updateToolbarIssuesCount: function(number):void}}
   */
  _createToolbars() {
    const toolbarContainer = this.contentElement.createChild('div', 'issues-toolbar-container');
    new UI.Toolbar.Toolbar('issues-toolbar-left', toolbarContainer);
    const rightToolbar = new UI.Toolbar.Toolbar('issues-toolbar-right', toolbarContainer);
    rightToolbar.appendSeparator();
    const toolbarWarnings = createElementWithClass('div', 'toolbar-warnings');
    const breakingChangeIcon = UI.Icon.Icon.create('largeicon-breaking-change');
    toolbarWarnings.appendChild(breakingChangeIcon);
    const toolbarIssuesCount = toolbarWarnings.createChild('span', 'warnings-count-label');
    const toolbarIssuesItem = new UI.Toolbar.ToolbarItem(toolbarWarnings);
    rightToolbar.appendToolbarItem(toolbarIssuesItem);
    /** @param {number} count */
    const updateToolbarIssuesCount = count => {
      toolbarIssuesCount.textContent = `${count}`;
    };
    return {toolbarContainer, updateToolbarIssuesCount};
  }

  /**
   * @param {!{data: !SDK.Issue.AggregatedIssue}} event
   */
  _aggregatedIssueUpdated(event) {
    const aggregatedIssue = /** @type {!SDK.Issue.AggregatedIssue} */ (event.data);
    this._updateAggregatedIssueView(aggregatedIssue);
  }

  /**
   * @param {!SDK.Issue.AggregatedIssue} aggregatedIssue
   */
  _updateAggregatedIssueView(aggregatedIssue) {
    const description = aggregatedIssue.getDescription();
    if (!description) {
      console.warn('Could not find description for issue code:', aggregatedIssue.code());
      return;
    }
    if (!this._issueViews.has(aggregatedIssue.code())) {
      const view = new AggregatedIssueView(this, aggregatedIssue, description);
      this._issueViews.set(aggregatedIssue.code(), view);
      this._issuesTree.appendChild(view);
    }
    this._issueViews.get(aggregatedIssue.code()).update();
    this._updateCounts();
  }

  _fullUpdate() {
    this._hideReloadInfoBar();
    for (const view of this._issueViews.values()) {
      this._issuesTree.removeChild(view);
    }
    this._issueViews.clear();
    for (const aggregatedIssue of this._model.aggregatedIssues()) {
      this._updateAggregatedIssueView(aggregatedIssue);
    }
    this._updateCounts();
  }

  _updateCounts() {
    this._updateToolbarIssuesCount(this._model.numberOfAggregatedIssues());
  }

  /**
   * @param {string} code
   */
  revealByCode(code) {
    const issueView = this._issueViews.get(code);
    if (issueView) {
      issueView.reveal();
    }
  }

  _showReloadInfobarIfNeeded() {
    if (!this._model || !this._model.reloadForAccurateInformationRequired()) {
      return;
    }

    function reload() {
      const mainTarget = SDK.SDKModel.TargetManager.instance().mainTarget();
      if (mainTarget) {
        const resourceModel = mainTarget.model(SDK.ResourceTreeModel.ResourceTreeModel);
        if (resourceModel) {
          resourceModel.reloadPage();
        }
      }
    }

    const infobar = new UI.Infobar.Infobar(
        UI.Infobar.Type.Warning,
        ls`Some issues might be missing or incomplete, reload the inspected page to get full information`,
        [{text: ls`Reload page`, highlight: false, delegate: reload, dismiss: true}]);

    this._reloadInfobar = infobar;
    this._attachReloadInfoBar(infobar);
  }

  /** @param {!UI.Infobar.Infobar} infobar */
  _attachReloadInfoBar(infobar) {
    if (!this._infoBarDiv) {
      this._infoBarDiv = createElementWithClass('div', 'flex-none');
      this.contentElement.insertBefore(this._infoBarDiv, this._issuesToolbarContainer.nextSibling);
    }
    this._infoBarDiv.appendChild(infobar.element);
    infobar.setParentView(this);
    this.doResize();
  }

  _hideReloadInfoBar() {
    if (this._reloadInfobar) {
      this._reloadInfobar.dispose();
      this._reloadInfobar = null;
    }
  }
}

/**
 * @param {!SDK.Issue.IssueKind} kind
 * @return {string}
 */
function issueKindToString(kind) {
  switch (kind) {
    case SDK.Issue.IssueKind.BreakingChange:
      return ls`Breaking change`;
  }
  return '';
}
