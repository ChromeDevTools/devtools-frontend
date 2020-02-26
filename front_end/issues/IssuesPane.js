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
    this._model.addEventListener(SDK.IssuesModel.Events.IssueAdded, this._issueAdded.bind(this));
    this._model.ensureEnabled();

    this._issues = new Map();
    this._issueViews = new Map();

    this._selectedIssue = null;

    const issues = this._model.issues();
    for (const issue of issues) {
      this._issueAdded(issue);
    }
  }

  _issueAdded(event) {
    if (!(event.data.code in issueDetails)) {
      console.warn('Received issue with unknow code:', event.data.code);
      return;
    }

    const view = new IssueView(this, event.data);
    view.show(this.contentElement);
    this._issueViews.set(event.data.code, view);
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
