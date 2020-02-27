// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as UI from '../ui/ui.js';
import * as SDK from '../sdk/sdk.js';

class IssueView extends UI.Widget.Widget {
  constructor(parent, issue) {
    super(false);
    this._parent = parent;
    this._issue = issue;
    this._details = issueDetails[issue.code];

    this.contentElement.classList.add('issue');
    this.contentElement.classList.add('collapsed');

    this.appendHeader();
    this.appendBody();
  }

  appendHeader() {
    const header = createElementWithClass('div', 'header');
    header.addEventListener('click', this._handleSelect.bind(this));
    const icon = UI.Icon.Icon.create('largeicon-breaking-change', 'icon');
    header.appendChild(icon);

    const title = createElementWithClass('div', 'title');
    title.innerText = this._details.title;
    header.appendChild(title);

    const priority = createElementWithClass('div', 'priority');
    switch (this._details.priority) {
      case Priority.High:
        priority.innerText = ls`High Priority`;
        break;
      default:
        console.warn('Unknown issue priority', this._details.priority);
    }
    header.appendChild(priority);
    this.contentElement.appendChild(header);
  }

  appendBody() {
    const body = createElementWithClass('div', 'body');

    const message = createElementWithClass('div', 'message');
    message.innerText = this._details.message;
    body.appendChild(message);

    const code = createElementWithClass('div', 'code');
    code.innerText = this._issue.code;
    body.appendChild(code);

    const link = UI.XLink.XLink.create(this._details.link, 'Read more · ' + this._details.linkTitle, 'link');
    body.appendChild(link);

    const linkIcon = UI.Icon.Icon.create('largeicon-link', 'link-icon');
    link.prepend(linkIcon);

    const bodyWrapper = createElementWithClass('div', 'body-wrapper');
    bodyWrapper.appendChild(body);
    this.contentElement.appendChild(bodyWrapper);
  }

  _handleSelect() {
    this._parent.handleSelect(this);
  }

  toggle() {
    this.contentElement.classList.toggle('collapsed');
  }
}

export class IssuesPaneImpl extends UI.Widget.VBox {
  constructor() {
    super(true);
    this.registerRequiredCSS('issues/issuesPane.css');

    const mainTarget = self.SDK.targetManager.mainTarget();
    this._model = mainTarget.model(SDK.IssuesModel.IssuesModel);
    this._model.addEventListener(SDK.IssuesModel.Events.IssueAdded, this._issueAdded, this);
    this._model.addEventListener(SDK.IssuesModel.Events.AllIssuesCleared, this._issuesCleared, this);
    this._model.ensureEnabled();

    this._issueViews = new Map();
    this._selectedIssue = null;

    const issuesToolbarContainer = this.contentElement.createChild('div', 'issues-toolbar-container');
    new UI.Toolbar.Toolbar('issues-toolbar-left', issuesToolbarContainer);
    const rightToolbar = new UI.Toolbar.Toolbar('issues-toolbar-right', issuesToolbarContainer);
    rightToolbar.appendSeparator();
    const toolbarWarnings = new UI.Toolbar.ToolbarItem(createElement('div'));
    const breakingChangeIcon = UI.Icon.Icon.create('largeicon-breaking-change');
    toolbarWarnings.element.appendChild(breakingChangeIcon);
    this._toolbarIssuesCount = toolbarWarnings.element.createChild('span', 'warnings-count-label');
    this._updateIssuesCount();
    rightToolbar.appendToolbarItem(toolbarWarnings);

    for (const issue of this._model.issues()) {
      this._addIssueView(issue);
    }
  }

  _issueAdded(event) {
    this._addIssueView(event.data);
  }

  _addIssueView(issue) {
    if (!(issue.code in issueDetails)) {
      console.warn('Received issue with unknown code:', issue.code);
      return;
    }

    const view = new IssueView(this, issue);
    view.show(this.contentElement);
    this._issueViews.set(issue.code, view);
    this._updateIssuesCount();
  }

  _issuesCleared() {
    for (const view of this._issueViews.values()) {
      view.detach();
    }
    this._issueViews.clear();
    this._selectedIssue = null;
    this._updateIssuesCount();
  }

  _updateIssuesCount() {
    this._toolbarIssuesCount.textContent = this._model.size();
  }

  handleSelect(issue) {
    issue.toggle();
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
};
