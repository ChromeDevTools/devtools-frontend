// Copyright 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as Host from '../host/host.js';
import * as i18n from '../i18n/i18n.js';
import * as QuickOpen from '../quick_open/quick_open.js';
import * as Workspace from '../workspace/workspace.js';  // eslint-disable-line no-unused-vars

import {FilteredUISourceCodeListProvider} from './FilteredUISourceCodeListProvider.js';
import {SourcesView} from './SourcesView.js';

export const UIStrings = {
  /**
  *@description Text to open a file
  */
  openFile: 'Open file',
};
const str_ = i18n.i18n.registerUIStrings('sources/OpenFileQuickOpen.js', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);


/** @type {!OpenFileQuickOpen} */
let openFileQuickOpenInstance;

export class OpenFileQuickOpen extends FilteredUISourceCodeListProvider {
  /**
   * @param {{forceNew: ?boolean}} opts
   */
  static instance(opts = {forceNew: null}) {
    const {forceNew} = opts;
    if (!openFileQuickOpenInstance || forceNew) {
      openFileQuickOpenInstance = new OpenFileQuickOpen();
    }

    return openFileQuickOpenInstance;
  }

  /**
   * @override
   */
  attach() {
    this.setDefaultScores(SourcesView.defaultUISourceCodeScores());
    super.attach();
  }

  /**
   * @override
   * @param {?Workspace.UISourceCode.UISourceCode} uiSourceCode
   * @param {number=} lineNumber
   * @param {number=} columnNumber
   */
  uiSourceCodeSelected(uiSourceCode, lineNumber, columnNumber) {
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.SelectFileFromFilePicker);

    if (!uiSourceCode) {
      return;
    }
    if (typeof lineNumber === 'number') {
      Common.Revealer.reveal(uiSourceCode.uiLocation(lineNumber, columnNumber));
    } else {
      Common.Revealer.reveal(uiSourceCode);
    }
  }

  /**
   * @override
   * @param {!Workspace.Workspace.Project} project
   * @return {boolean}
   */
  filterProject(project) {
    return !project.isServiceProject();
  }

  /**
   * @override
   * @return {boolean}
   */
  renderAsTwoRows() {
    return true;
  }
}

QuickOpen.FilteredListWidget.registerProvider({
  prefix: '',
  title: i18nLazyString(UIStrings.openFile),
  provider: OpenFileQuickOpen.instance,
});
