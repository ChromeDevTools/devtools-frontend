// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as IssuesManager from '../../models/issues_manager/issues_manager.js';

import {AffectedElementsView} from './AffectedElementsView.js';

const UIStrings = {
  /**
   *@description Noun for singular or plural number of affected document nodes indication in issue view.
   */
  nDocuments: '{n, plural, =1 { document} other { documents}}',
  /**
   *@description Column title for the Document in the DOM tree column in the quirks mode issue view
   */
  documentInTheDOMTree: 'Document in the DOM tree',
  /**
   *@description Column title for the url column in the quirks mode issue view
   */
  url: 'URL',
  /**
   *@description Column title for the Mode column in the quirks mode issue view
   */
  mode: 'Mode',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/issues/AffectedDocumentsInQuirksModeView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class AffectedDocumentsInQuirksModeView extends AffectedElementsView {
  #runningUpdatePromise: Promise<void> = Promise.resolve();

  override update(): void {
    // Ensure that doUpdate is invoked atomically by serializing the update calls
    // because it's not re-entrace safe.
    this.#runningUpdatePromise = this.#runningUpdatePromise.then(this.#doUpdate.bind(this));
  }

  protected getResourceName(count: number): Platform.UIString.LocalizedString {
    return i18nString(UIStrings.nDocuments, {n: count});
  }

  async #doUpdate(): Promise<void> {
    this.clear();
    await this.#appendQuirksModeDocuments(this.issue.getQuirksModeIssues());
  }

  async #appendQuirksModeDocument(issue: IssuesManager.QuirksModeIssue.QuirksModeIssue): Promise<void> {
    const row = document.createElement('tr');
    row.classList.add('affected-resource-quirks-mode');

    const details = issue.details();

    const target =
        SDK.FrameManager.FrameManager.instance().getFrame(details.frameId)?.resourceTreeModel().target() || null;
    row.appendChild(await this.createElementCell(
        {nodeName: 'document', backendNodeId: details.documentNodeId, target}, issue.getCategory()));
    this.appendIssueDetailCell(row, details.isLimitedQuirksMode ? 'Limited Quirks Mode' : 'Quirks Mode');
    this.appendIssueDetailCell(row, details.url);

    this.affectedResources.appendChild(row);
  }

  async #appendQuirksModeDocuments(issues: Iterable<IssuesManager.QuirksModeIssue.QuirksModeIssue>): Promise<void> {
    const header = document.createElement('tr');
    this.appendColumnTitle(header, i18nString(UIStrings.documentInTheDOMTree));
    this.appendColumnTitle(header, i18nString(UIStrings.mode));
    this.appendColumnTitle(header, i18nString(UIStrings.url));

    this.affectedResources.appendChild(header);
    let count = 0;
    for (const issue of issues) {
      count++;
      await this.#appendQuirksModeDocument(issue);
    }
    this.updateAffectedResourceCount(count);
  }
}
