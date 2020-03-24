// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';  // eslint-disable-line no-unused-vars
import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';
import {IssuesPaneImpl} from './IssuesPane.js';  // eslint-disable-line no-unused-vars

/**
 * @implements {Common.Revealer.Revealer}
 * @unrestricted
 */
export class IssueRevealer {
  /**
   * @override
   * @param {!Object} issue
   * @return {!Promise<void>}
   */
  async reveal(issue) {
    if (!(issue instanceof SDK.Issue.Issue)) {
      throw new Error('Internal error: not a issue');
    }
    await UI.ViewManager.ViewManager.instance().showView('issues-pane');
    const view = UI.ViewManager.ViewManager.instance().view('issues-pane');
    if (view) {
      const issuesPane = /** @type {!IssuesPaneImpl} */ (await view.widget());
      issuesPane.revealByCode(issue.code());
    }
  }
}
