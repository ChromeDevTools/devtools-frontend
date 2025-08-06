// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable rulesdir/no-imperative-dom-api */

import '../../ui/legacy/legacy.js';

import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import type * as Workspace from '../../models/workspace/workspace.js';
import * as WorkspaceDiff from '../../models/workspace_diff/workspace_diff.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import {ChangesSidebar, Events} from './ChangesSidebar.js';
import changesViewStyles from './changesView.css.js';
import * as CombinedDiffView from './CombinedDiffView.js';

const CHANGES_VIEW_URL = 'https://developer.chrome.com/docs/devtools/changes' as Platform.DevToolsPath.UrlString;

const UIStrings = {
  /**
   * @description Text in Changes View of the Changes tab if no change has been made so far.
   */
  noChanges: 'No changes yet',
  /**
   * @description Text in Changes View of the Changes tab to explain the Changes panel.
   */
  changesViewDescription: 'On this page you can track code changes made within DevTools.',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/changes/ChangesView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class ChangesView extends UI.Widget.VBox {
  private emptyWidget: UI.EmptyWidget.EmptyWidget;
  private readonly workspaceDiff: WorkspaceDiff.WorkspaceDiff.WorkspaceDiffImpl;
  readonly changesSidebar: ChangesSidebar;
  private selectedUISourceCode: Workspace.UISourceCode.UISourceCode|null;
  private readonly diffContainer: HTMLElement;
  private readonly combinedDiffView: CombinedDiffView.CombinedDiffView;

  constructor() {
    super({
      jslog: `${VisualLogging.panel('changes').track({resize: true})}`,
      useShadowDom: true,
    });
    this.registerRequiredCSS(changesViewStyles);

    const splitWidget = new UI.SplitWidget.SplitWidget(true /* vertical */, false /* sidebar on left */);
    const mainWidget = new UI.Widget.VBox();
    splitWidget.setMainWidget(mainWidget);
    splitWidget.show(this.contentElement);

    this.emptyWidget = new UI.EmptyWidget.EmptyWidget('', '');
    this.emptyWidget.show(mainWidget.element);

    this.workspaceDiff = WorkspaceDiff.WorkspaceDiff.workspaceDiff();
    this.changesSidebar = new ChangesSidebar(this.workspaceDiff);
    this.changesSidebar.addEventListener(
        Events.SELECTED_UI_SOURCE_CODE_CHANGED, this.selectedUISourceCodeChanged, this);
    splitWidget.setSidebarWidget(this.changesSidebar);

    this.selectedUISourceCode = null;

    this.diffContainer = mainWidget.element.createChild('div', 'diff-container');
    UI.ARIAUtils.markAsTabpanel(this.diffContainer);
    this.combinedDiffView = new CombinedDiffView.CombinedDiffView();
    this.combinedDiffView.workspaceDiff = this.workspaceDiff;
    this.combinedDiffView.show(this.diffContainer);

    this.hideDiff();
    this.selectedUISourceCodeChanged();
  }

  private renderDiffOrEmptyState(): void {
    // There are modified UI source codes, we should render the combined diff view.
    if (this.workspaceDiff.modifiedUISourceCodes().length > 0) {
      this.showDiff();
    } else {
      this.hideDiff();
    }
  }

  private selectedUISourceCodeChanged(): void {
    const selectedUISourceCode = this.changesSidebar.selectedUISourceCode();
    if (!selectedUISourceCode || this.selectedUISourceCode === selectedUISourceCode) {
      return;
    }

    this.selectedUISourceCode = selectedUISourceCode;
    this.combinedDiffView.selectedFileUrl = selectedUISourceCode.url();
  }

  override wasShown(): void {
    UI.Context.Context.instance().setFlavor(ChangesView, this);
    super.wasShown();
    this.renderDiffOrEmptyState();
    this.workspaceDiff.addEventListener(
        WorkspaceDiff.WorkspaceDiff.Events.MODIFIED_STATUS_CHANGED, this.renderDiffOrEmptyState, this);
  }

  override willHide(): void {
    super.willHide();
    UI.Context.Context.instance().setFlavor(ChangesView, null);
    this.workspaceDiff.removeEventListener(
        WorkspaceDiff.WorkspaceDiff.Events.MODIFIED_STATUS_CHANGED, this.renderDiffOrEmptyState, this);
  }

  private hideDiff(): void {
    this.diffContainer.style.display = 'none';
    this.emptyWidget.header = i18nString(UIStrings.noChanges);
    this.emptyWidget.text = i18nString(UIStrings.changesViewDescription);

    this.emptyWidget.link = CHANGES_VIEW_URL;
    this.emptyWidget.showWidget();
  }

  private showDiff(): void {
    this.emptyWidget.hideWidget();
    this.diffContainer.style.display = 'block';
  }
}
