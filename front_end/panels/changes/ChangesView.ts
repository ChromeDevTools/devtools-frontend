// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import type * as Formatter from '../../models/formatter/formatter.js';
import type * as Workspace from '../../models/workspace/workspace.js';
import * as WorkspaceDiff from '../../models/workspace_diff/workspace_diff.js';
import {PanelUtils} from '../../panels/utils/utils.js';
import * as Diff from '../../third_party/diff/diff.js';
import * as DiffView from '../../ui/components/diff_view/diff_view.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import {ChangesSidebar, Events} from './ChangesSidebar.js';
import changesViewStyles from './changesView.css.js';

const UIStrings = {
  /**
   *@description Text in Changes View of the Changes tab
   */
  noChanges: 'No changes',
  /**
   *@description Text in Changes View of the Changes tab
   */
  binaryData: 'Binary data',
  /**
   * @description Text in the Changes tab that indicates how many lines of code have changed in the
   * selected file. An insertion refers to an added line of code. The (+) is a visual cue to indicate
   * lines were added (not translatable).
   */
  sInsertions: '{n, plural, =1 {# insertion (+)} other {# insertions (+)}}',
  /**
   * @description Text in the Changes tab that indicates how many lines of code have changed in the
   * selected file. A deletion refers to a removed line of code. The (-) is a visual cue to indicate
   * lines were removed (not translatable).
   */
  sDeletions: '{n, plural, =1 {# deletion (-)} other {# deletions (-)}}',
  /**
   *@description Text for a button in the Changes tool that copies all the changes from the currently open file.
   */
  copy: 'Copy',
};
const str_ = i18n.i18n.registerUIStrings('panels/changes/ChangesView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

function diffStats(diff: Diff.Diff.DiffArray): string {
  const insertions =
      diff.reduce((ins, token) => ins + (token[0] === Diff.Diff.Operation.Insert ? token[1].length : 0), 0);
  const deletions =
      diff.reduce((ins, token) => ins + (token[0] === Diff.Diff.Operation.Delete ? token[1].length : 0), 0);
  const deletionText = i18nString(UIStrings.sDeletions, {n: deletions});
  const insertionText = i18nString(UIStrings.sInsertions, {n: insertions});
  return `${insertionText}, ${deletionText}`;
}

export class ChangesView extends UI.Widget.VBox {
  private emptyWidget: UI.EmptyWidget.EmptyWidget;
  private readonly workspaceDiff: WorkspaceDiff.WorkspaceDiff.WorkspaceDiffImpl;
  readonly changesSidebar: ChangesSidebar;
  private selectedUISourceCode: Workspace.UISourceCode.UISourceCode|null;
  #selectedSourceCodeFormattedMapping?: Formatter.ScriptFormatter.FormatterSourceMapping;
  private readonly diffContainer: HTMLElement;
  private readonly toolbar: UI.Toolbar.Toolbar;
  private readonly diffStats: UI.Toolbar.ToolbarText;
  private readonly diffView: DiffView.DiffView.DiffView;

  constructor() {
    super(true);

    this.element.setAttribute('jslog', `${VisualLogging.panel('changes').track({resize: true})}`);

    const splitWidget = new UI.SplitWidget.SplitWidget(true /* vertical */, false /* sidebar on left */);
    const mainWidget = new UI.Widget.Widget();
    splitWidget.setMainWidget(mainWidget);
    splitWidget.show(this.contentElement);

    this.emptyWidget = new UI.EmptyWidget.EmptyWidget('');
    this.emptyWidget.show(mainWidget.element);

    this.workspaceDiff = WorkspaceDiff.WorkspaceDiff.workspaceDiff();
    this.changesSidebar = new ChangesSidebar(this.workspaceDiff);
    this.changesSidebar.addEventListener(
        Events.SELECTED_UI_SOURCE_CODE_CHANGED, this.selectedUISourceCodeChanged, this);
    splitWidget.setSidebarWidget(this.changesSidebar);

    this.selectedUISourceCode = null;

    this.diffContainer = mainWidget.element.createChild('div', 'diff-container');
    UI.ARIAUtils.markAsTabpanel(this.diffContainer);
    this.diffContainer.addEventListener('click', event => this.click(event));

    this.diffView = this.diffContainer.appendChild(new DiffView.DiffView.DiffView());

    this.toolbar = new UI.Toolbar.Toolbar('changes-toolbar', mainWidget.element);
    this.toolbar.element.setAttribute('jslog', `${VisualLogging.toolbar()}`);
    this.toolbar.appendToolbarItem(UI.Toolbar.Toolbar.createActionButtonForId('changes.revert'));
    this.diffStats = new UI.Toolbar.ToolbarText('');
    this.toolbar.appendToolbarItem(this.diffStats);

    this.toolbar.appendToolbarItem(new UI.Toolbar.ToolbarSeparator());
    this.toolbar.appendToolbarItem(UI.Toolbar.Toolbar.createActionButtonForId('changes.copy', {
      showLabel: true,
      label() {
        return i18nString(UIStrings.copy);
      },
    }));

    this.hideDiff(i18nString(UIStrings.noChanges));
    this.selectedUISourceCodeChanged();
  }

  private selectedUISourceCodeChanged(): void {
    this.revealUISourceCode(this.changesSidebar.selectedUISourceCode());
    UI.ActionRegistry.ActionRegistry.instance()
        .getAction('changes.copy')
        .setEnabled(this.selectedUISourceCode?.contentType() === Common.ResourceType.resourceTypes.Stylesheet);
  }

  revert(): void {
    const uiSourceCode = this.selectedUISourceCode;
    if (!uiSourceCode) {
      return;
    }
    void this.workspaceDiff.revertToOriginal(uiSourceCode);
  }

  async copy(): Promise<void> {
    const uiSourceCode = this.selectedUISourceCode;
    if (!uiSourceCode) {
      return;
    }
    const diffResponse = await this.workspaceDiff.requestDiff(uiSourceCode, {shouldFormatDiff: true});
    // Diff array with real diff will contain at least 2 lines.
    if (!diffResponse || diffResponse?.diff.length < 2) {
      return;
    }
    const changes = await PanelUtils.formatCSSChangesFromDiff(diffResponse.diff);
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(changes);
  }

  private click(event: MouseEvent): void {
    if (!this.selectedUISourceCode) {
      return;
    }

    for (const target of event.composedPath()) {
      if (!(target instanceof HTMLElement)) {
        continue;
      }
      const selection = target.ownerDocument.getSelection();
      if (selection?.toString()) {
        // We abort source revelation when user has text selection.
        break;
      }
      if (target.classList.contains('diff-line-content') && target.hasAttribute('data-line-number')) {
        let lineNumber = Number(target.dataset.lineNumber) - 1;
        // Unfortunately, caretRangeFromPoint is broken in shadow
        // roots, which makes determining the character offset more
        // work than justified here.
        if (this.#selectedSourceCodeFormattedMapping) {
          lineNumber = this.#selectedSourceCodeFormattedMapping.formattedToOriginal(lineNumber, 0)[0];
        }
        void Common.Revealer.reveal(this.selectedUISourceCode.uiLocation(lineNumber, 0), false);
        event.consume(true);
        break;
      } else if (target.classList.contains('diff-listing')) {
        break;
      }
    }
  }

  private revealUISourceCode(uiSourceCode: Workspace.UISourceCode.UISourceCode|null): void {
    if (this.selectedUISourceCode === uiSourceCode) {
      return;
    }

    if (this.selectedUISourceCode) {
      this.workspaceDiff.unsubscribeFromDiffChange(this.selectedUISourceCode, this.refreshDiff, this);
    }
    if (uiSourceCode && this.isShowing()) {
      this.workspaceDiff.subscribeToDiffChange(uiSourceCode, this.refreshDiff, this);
    }

    this.selectedUISourceCode = uiSourceCode;
    void this.refreshDiff();
  }

  override wasShown(): void {
    UI.Context.Context.instance().setFlavor(ChangesView, this);
    this.registerCSSFiles([changesViewStyles]);
    super.wasShown();
    void this.refreshDiff();
  }

  override willHide(): void {
    super.willHide();
    UI.Context.Context.instance().setFlavor(ChangesView, null);
  }

  private async refreshDiff(): Promise<void> {
    if (!this.isShowing()) {
      return;
    }

    if (!this.selectedUISourceCode) {
      this.renderDiffRows();
      return;
    }
    const uiSourceCode = this.selectedUISourceCode;
    if (!uiSourceCode.contentType().isTextType()) {
      this.hideDiff(i18nString(UIStrings.binaryData));
      return;
    }
    const diffResponse = await this.workspaceDiff.requestDiff(uiSourceCode, {shouldFormatDiff: true});
    if (this.selectedUISourceCode !== uiSourceCode) {
      return;
    }
    this.#selectedSourceCodeFormattedMapping = diffResponse?.formattedCurrentMapping;
    this.renderDiffRows(diffResponse?.diff);
  }

  private hideDiff(message: string): void {
    this.diffStats.setText('');
    this.toolbar.setEnabled(false);
    this.diffContainer.style.display = 'none';
    this.emptyWidget.text = message;
    this.emptyWidget.showWidget();
  }

  private renderDiffRows(diff?: Diff.Diff.DiffArray): void {
    if (!diff || (diff.length === 1 && diff[0][0] === Diff.Diff.Operation.Equal)) {
      this.hideDiff(i18nString(UIStrings.noChanges));
    } else {
      this.diffStats.setText(diffStats(diff));
      this.toolbar.setEnabled(true);
      this.emptyWidget.hideWidget();
      const mimeType = (this.selectedUISourceCode as Workspace.UISourceCode.UISourceCode).mimeType();
      this.diffContainer.style.display = 'block';
      this.diffView.data = {diff, mimeType};
    }
  }
}

export class ActionDelegate implements UI.ActionRegistration.ActionDelegate {
  handleAction(context: UI.Context.Context, actionId: string): boolean {
    const changesView = context.flavor(ChangesView);
    if (changesView === null) {
      return false;
    }
    switch (actionId) {
      case 'changes.revert':
        changesView.revert();
        return true;
      case 'changes.copy':
        void changesView.copy();
        return true;
    }
    return false;
  }
}
