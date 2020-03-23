// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as UI from '../ui/ui.js';
import * as SDK from '../sdk/sdk.js';

class AffectedResourcesView {
  /**
   * @param {!AggregatedIssueView} parent
   * @param {!{singular:string, plural:string}} resourceName - Singular and plural of the affected resource name.
   */
  constructor(parent, resourceName) {
    /** @type {!AggregatedIssueView} */
    this._parent = parent;
    this._resourceName = resourceName;
    this._wrapper = createElementWithClass('div', 'affected-resource');
    /** @type {!Element} */
    this._affectedResourcesCountElement = this.createAffectedResourcesCounter(this._wrapper);
    /** @type {!Element} */
    this._affectedResources = this.createAffectedResources(this._wrapper);
    this._affectedResourcesCount = 0;
  }

  /**
   * @param {!Element} wrapper
   * @returns {!Element}
   */
  createAffectedResourcesCounter(wrapper) {
    const counterWrapper = createElementWithClass('div', 'affected-resource-label-wrapper');
    counterWrapper.addEventListener('click', () => {
      wrapper.classList.toggle('expanded');
    });
    const counterLabel = createElementWithClass('div', 'affected-resource-label');
    counterWrapper.appendChild(counterLabel);
    wrapper.appendChild(counterWrapper);
    return counterLabel;
  }

  /**
   * @param {!Element} wrapper
   * @returns {!Element}
   */
  createAffectedResources(wrapper) {
    const body = createElementWithClass('div', 'affected-resource-list-wrapper');
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
    body.appendChild(affectedResources);
    wrapper.appendChild(body);

    this._parent.appendAffectedResource(wrapper);
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
    this._wrapper.style.display = this._affectedResourcesCount === 0 ? 'none' : '';
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
   * TODO(chromium:1063765): Strengthen types.
   * @param {!Iterable<*>} cookies
   */
  _appendAffectedCookies(cookies) {
    let count = 1;
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
    name.appendChild(Components.Linkifier.linkifyRevealable(
        new SDK.Cookie.CookieReference(cookie.name, cookie.domain, cookie.path, cookie.siteForCookies), cookie.name));
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

class AggregatedIssueView extends UI.Widget.Widget {
  /**
   *
   * @param {!IssuesPaneImpl} parent
   * @param {!SDK.Issue.AggregatedIssue} issue
   */
  constructor(parent, issue) {
    super(false);
    this._parent = parent;
    this._issue = issue;
    this._details = issueDetails[issue.code()];
    this._appendHeader();
    this._body = this._createBody();
    this._affectedResources = this._createAffectedResources(this._body);
    this._affectedCookiesView = new AffectedCookiesView(this, this._issue);
    this._affectedCookiesView.update();
    this._createReadMoreLink();

    this.contentElement.classList.add('issue');
    this.contentElement.classList.add('collapsed');

    this.updateAffectedResourceVisibility();
  }

  /**
   * @param {!Element} resource
   */
  appendAffectedResource(resource) {
    this._affectedResources.appendChild(resource);
  }

  _appendHeader() {
    const header = createElementWithClass('div', 'header');
    header.addEventListener('click', this._handleClick.bind(this));
    const icon = UI.Icon.Icon.create('largeicon-breaking-change', 'icon');
    header.appendChild(icon);

    const title = createElementWithClass('div', 'title');
    title.textContent = this._details.title;
    header.appendChild(title);

    const priority = createElementWithClass('div', 'priority');
    switch (this._details.priority) {
      case Priority.High:
        priority.textContent = ls`High Priority`;
        break;
      default:
        console.warn('Unknown issue priority', this._details.priority);
    }
    header.appendChild(priority);
    this.contentElement.appendChild(header);
  }

  updateAffectedResourceVisibility() {
    const noResources = !this._affectedCookiesView || this._affectedCookiesView.isEmpty();
    this._affectedResources.style.display = noResources ? 'none' : '';
  }

  /**
   *
   * @param {!Element} body
   * @returns {!Element}
   */
  _createAffectedResources(body) {
    const wrapper = createElementWithClass('div', 'affected-resources');
    const label = createElementWithClass('div', 'affected-resources-label');
    label.textContent = ls`Affected Resources`;
    wrapper.appendChild(label);
    body.appendChild(wrapper);
    return wrapper;
  }

  _createBody() {
    const body = createElementWithClass('div', 'body');

    const message = createElementWithClass('div', 'message');
    message.textContent = this._details.message;
    body.appendChild(message);

    const code = createElementWithClass('div', 'code');
    code.textContent = this._issue.code();
    body.appendChild(code);

    const bodyWrapper = createElementWithClass('div', 'body-wrapper');
    bodyWrapper.appendChild(body);
    this.contentElement.appendChild(bodyWrapper);
    return body;
  }

  _createReadMoreLink() {
    const link = UI.XLink.XLink.create(this._details.link, ls`Learn more: ${this._details.linkTitle}`, 'link');
    const linkIcon = UI.Icon.Icon.create('largeicon-link', 'link-icon');
    link.prepend(linkIcon);
    this._body.appendChild(link);
  }

  _handleClick() {
    this._parent.handleSelect(this);
  }

  update() {
    this._affectedCookiesView.update();
    this.updateAffectedResourceVisibility();
  }


  /**
   * @param {(boolean|undefined)=} expand - Expands the issue if `true`, collapses if `false`, toggles collapse if undefined
   */
  toggle(expand) {
    if (expand === undefined) {
      this.contentElement.classList.toggle('collapsed');
    } else {
      this.contentElement.classList.toggle('collapsed', !expand);
    }
  }

  reveal() {
    this.toggle(true);
    this.contentElement.scrollIntoView(true);
  }

  /**
   * @override
   */
  detach() {
    super.detach();
  }
}

export class IssuesPaneImpl extends UI.Widget.VBox {
  constructor() {
    super(true);
    this.registerRequiredCSS('issues/issuesPane.css');

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

    this._issueViews = new Map();

    const issuesToolbarContainer = this.contentElement.createChild('div', 'issues-toolbar-container');
    new UI.Toolbar.Toolbar('issues-toolbar-left', issuesToolbarContainer);
    const rightToolbar = new UI.Toolbar.Toolbar('issues-toolbar-right', issuesToolbarContainer);
    rightToolbar.appendSeparator();
    const toolbarWarnings = new UI.Toolbar.ToolbarItem(createElement('div'));
    const breakingChangeIcon = UI.Icon.Icon.create('largeicon-breaking-change');
    toolbarWarnings.element.appendChild(breakingChangeIcon);
    this._toolbarIssuesCount = toolbarWarnings.element.createChild('span', 'warnings-count-label');
    this._updateCounts();
    rightToolbar.appendToolbarItem(toolbarWarnings);

    if (this._model) {
      for (const issue of this._model.aggregatedIssues()) {
        this._updateAggregatedIssueView(issue);
      }
    }
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
    if (!(aggregatedIssue.code() in issueDetails)) {
      console.warn('Unknown issue code:', aggregatedIssue.code());
      return;
    }
    if (!this._issueViews.has(aggregatedIssue.code())) {
      const view = new AggregatedIssueView(this, aggregatedIssue);
      this._issueViews.set(aggregatedIssue.code(), view);
      view.show(this.contentElement);
    }
    this._issueViews.get(aggregatedIssue.code()).update();
    this._updateCounts();
  }

  _fullUpdate() {
    for (const view of this._issueViews.values()) {
      view.detach();
    }
    this._issueViews.clear();
    for (const aggregatedIssue of this._model.aggregatedIssues()) {
      this._updateAggregatedIssueView(aggregatedIssue);
    }
    this._updateCounts();
  }

  _updateCounts() {
    this._toolbarIssuesCount.textContent = this._model.numberOfAggregatedIssues();
  }

  /**
   * @param {!AggregatedIssueView} issueView
   */
  handleSelect(issueView) {
    issueView.toggle();
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
}

/** @enum {symbol} */
export const Priority = {
  High: Symbol('PriorityHigh'),
};

export default IssuesPaneImpl;

const issueDetails = {
  'SameSiteCookies::SameSiteNoneWithoutSecure':
      {title: ls`A Cookie has been set with SameSite=None but without Secure`, message: ls
    `In a future version of chrome, third party cookies will only be sent when marked as SameSite=None and Secure to prevent them from being accessed in a man in the middle scenario.`,
    priority: Priority.High,
    link: ls`https://web.dev/samesite-cookies-explained/`,
    linkTitle: ls`SameSite cookies explained`,
  },
  'SameSiteCookies::SameSiteNoneMissingForThirdParty': {
    title: ls`A Cookie in a third party context has been set without SameSite=None`,
    message: ls
    `In a future version of chrome, third party cookies will only be sent when marked as SameSite=None and Secure to prevent them from being accessed in a man in the middle szenario.`,
    priority: Priority.High,
    link: ls`https://web.dev/samesite-cookies-explained/`,
    linkTitle: ls`SameSite cookies explained`,
  },
  'SameSiteCookieIssue': {
    title: ls`A Cookie in a third party context has been set without SameSite=None`,
    message: ls
    `In a future version of chrome, third party cookies will only be sent when marked as SameSite=None and Secure to prevent them from being accessed in a man in the middle szenario.`,
    priority: Priority.High,
    link: ls`https://web.dev/samesite-cookies-explained/`,
    linkTitle: ls`SameSite cookies explained`,
  },
};
