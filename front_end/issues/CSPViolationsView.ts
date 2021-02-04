// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as BrowserSDK from '../browser_sdk/browser_sdk.js';
import * as Common from '../common/common.js';  // eslint-disable-line no-unused-vars
import * as i18n from '../i18n/i18n.js';
import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';

import {ComboBoxOfCheckBoxes} from './ComboBoxOfCheckBoxes.js';
import {CSPViolationsListView} from './CSPViolationsListView.js';

export const UIStrings = {
  /**
  *@description Text to filter result items
  */
  filter: 'Filter',
};
const str_ = i18n.i18n.registerUIStrings('issues/CSPViolationsView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
let cspViolationsViewInstance: CSPViolationsView;
export class CSPViolationsView extends UI.Widget.VBox {
  private listView = new CSPViolationsListView();
  private issuesManager = BrowserSDK.IssuesManager.IssuesManager.instance();

  /**
   * @private
   */
  constructor() {
    super(true);
    this.registerRequiredCSS('issues/cspViolationsView.css', {enableLegacyPatching: false});
    this.contentElement.classList.add('csp-violations-pane');

    const topToolbar = new UI.Toolbar.Toolbar('csp-violations-toolbar', this.contentElement);
    const textFilterUI = new UI.Toolbar.ToolbarInput(i18nString(UIStrings.filter), '', 1, .2, '');
    textFilterUI.addEventListener(UI.Toolbar.ToolbarInput.Event.TextChanged, () => {
      this.listView.updateTextFilter(textFilterUI.value());
    });
    topToolbar.appendToolbarItem(textFilterUI);

    const levelMenuButton = new ComboBoxOfCheckBoxes('Categories');
    levelMenuButton.setText('Categories');
    levelMenuButton.addOption(
        'Trusted Type Policy', SDK.ContentSecurityPolicyIssue.trustedTypesPolicyViolationCode, true);
    levelMenuButton.addOption('Trusted Type Sink', SDK.ContentSecurityPolicyIssue.trustedTypesSinkViolationCode, true);
    levelMenuButton.addOption('CSP Inline', SDK.ContentSecurityPolicyIssue.inlineViolationCode, true);
    levelMenuButton.addOption('CSP Eval', SDK.ContentSecurityPolicyIssue.evalViolationCode, true);
    levelMenuButton.addOption('CSP URL', SDK.ContentSecurityPolicyIssue.urlViolationCode, true);
    levelMenuButton.addHeader('Reset', () => {
      levelMenuButton.getOptions().forEach((x, i) => levelMenuButton.setOptionEnabled(i, x.default));
    });
    levelMenuButton.setOnOptionClicked(() => {
      const categories = new Set(levelMenuButton.getOptions().filter(x => x.enabled).map(x => x.value));
      this.listView.updateCategoryFilter(categories);
    });
    topToolbar.appendToolbarItem(levelMenuButton);
    this.listView.show(this.contentElement);

    this.issuesManager.addEventListener(BrowserSDK.IssuesManager.Events.IssueAdded, this.onIssueAdded, this);
    this.issuesManager.addEventListener(
        BrowserSDK.IssuesManager.Events.FullUpdateRequired, this.onFullUpdateRequired, this);

    this.addAllIssues();
  }

  static instance(opts = {forceNew: null}): CSPViolationsView {
    const {forceNew} = opts;
    if (!cspViolationsViewInstance || forceNew) {
      cspViolationsViewInstance = new CSPViolationsView();
    }

    return cspViolationsViewInstance;
  }

  private onIssueAdded(event: Common.EventTarget.EventTargetEvent): void {
    const {issue} =
        /** @type {!{issuesModel: !SDK.IssuesModel.IssuesModel, issue: !SDK.Issue.Issue}} */ (event.data);
    if (issue instanceof SDK.ContentSecurityPolicyIssue.ContentSecurityPolicyIssue) {
      this.listView.addIssue(issue);
    }
  }

  private onFullUpdateRequired(): void {
    this.listView.clearIssues();
    this.addAllIssues();
  }

  private addAllIssues(): void {
    for (const issue of this.issuesManager.issues()) {
      if (issue instanceof SDK.ContentSecurityPolicyIssue.ContentSecurityPolicyIssue) {
        this.listView.addIssue(issue);
      }
    }
  }
}
