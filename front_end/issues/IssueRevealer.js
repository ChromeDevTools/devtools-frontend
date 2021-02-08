// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';  // eslint-disable-line no-unused-vars
import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';
import {IssuesPane} from './IssuesPane.js';  // eslint-disable-line no-unused-vars

/** @type {!IssueRevealer} */
let issueRevealerInstance;

/**
 * @implements {Common.Revealer.Revealer}
 */
export class IssueRevealer {
  /**
   * @param {{forceNew: ?boolean}} opts
   */
  static instance(opts = {forceNew: null}) {
    const {forceNew} = opts;
    if (!issueRevealerInstance || forceNew) {
      issueRevealerInstance = new IssueRevealer();
    }

    return issueRevealerInstance;
  }


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
      const issuesPane = /** @type {!IssuesPane} */ (await view.widget());
      issuesPane.revealByCode(issue.code());
    }
  }
}
