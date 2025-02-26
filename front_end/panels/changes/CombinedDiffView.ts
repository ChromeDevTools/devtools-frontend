// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../core/platform/platform.js';
import type * as Workspace from '../../models/workspace/workspace.js';
import * as WorkspaceDiff from '../../models/workspace_diff/workspace_diff.js';
import type * as Diff from '../../third_party/diff/diff.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import type * as DiffView from '../../ui/components/diff_view/diff_view.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import * as PanelUtils from '../utils/utils.js';

import combinedDiffViewStyles from './combinedDiffView.css.js';

const {html} = Lit;

interface SingleDiffViewInput {
  fileName: string;
  mimeType: string;
  icon: HTMLElement;
  diff: Diff.Diff.DiffArray;
  onCopy: (diff: Diff.Diff.DiffArray) => void;
}

export interface ViewInput {
  singleDiffViewInputs: SingleDiffViewInput[];
}

type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;

function renderSingleDiffView(singleDiffViewInput: SingleDiffViewInput): Lit.TemplateResult {
  const {fileName, mimeType, icon, diff, onCopy} = singleDiffViewInput;
  return html`
    <details open>
      <summary>
        <div class="summary-left">
          <devtools-icon class="drop-down-icon" .name=${'arrow-drop-down'}></devtools-icon>
          ${icon}
          <span class="file-name">${fileName}</span>
        </div>
        <div class="summary-right">
          <devtools-button
            title=${'Copy'}
            .size=${Buttons.Button.Size.SMALL}
            .iconName=${'copy'}
            .jslogContext=${'combined-diff-view.copy'}
            .variant=${Buttons.Button.Variant.ICON}
            @click=${() => onCopy(diff)}></devtools-button>
        </div>
      </summary>
      <div class='diff-view-container'>
        <devtools-diff-view
          .data=${{diff, mimeType} as DiffView.DiffView.DiffViewData}>
        </devtools-diff-view>
      </div>
    </details>
  `;
}

export class CombinedDiffView extends UI.Widget.Widget {
  #workspaceDiff?: WorkspaceDiff.WorkspaceDiff.WorkspaceDiffImpl;
  #modifiedUISourceCodes: Workspace.UISourceCode.UISourceCode[] = [];
  #view: View;
  constructor(element?: HTMLElement, view: View = (input, output, target) => {
    Lit.render(
        html`
      <div class="combined-diff-view">
        ${input.singleDiffViewInputs.map(singleDiffViewInput => renderSingleDiffView(singleDiffViewInput))}
      </div>
    `,
        target, {host: target});
  }) {
    super(false, false, element);
    this.registerRequiredCSS(combinedDiffViewStyles);
    this.#view = view;
  }

  override wasShown(): void {
    super.wasShown();
    this.#workspaceDiff?.addEventListener(
        WorkspaceDiff.WorkspaceDiff.Events.MODIFIED_STATUS_CHANGED, this.#onDiffModifiedStatusChanged, this);
    void this.#initializeModifiedUISourceCodes();
  }

  override willHide(): void {
    this.#workspaceDiff?.removeEventListener(
        WorkspaceDiff.WorkspaceDiff.Events.MODIFIED_STATUS_CHANGED, this.#onDiffModifiedStatusChanged, this);
  }

  set workspaceDiff(workspaceDiff: WorkspaceDiff.WorkspaceDiff.WorkspaceDiffImpl) {
    this.#workspaceDiff = workspaceDiff;
    void this.#initializeModifiedUISourceCodes();
  }

  #onCopyDiff(): void {
    // TODO(ergunsh): Implement copying diff
  }

  async #initializeModifiedUISourceCodes(): Promise<void> {
    if (!this.#workspaceDiff) {
      return;
    }

    const currentModifiedUISourceCodes = this.#modifiedUISourceCodes;
    const nextModifiedUISourceCodes = this.#workspaceDiff.modifiedUISourceCodes();

    // Find the now non modified UI source codes and unsubscribe from their diff changes.
    const nowNonModifiedUISourceCodes =
        currentModifiedUISourceCodes.filter(uiSourceCode => !nextModifiedUISourceCodes.includes(uiSourceCode));
    nowNonModifiedUISourceCodes.forEach(
        nonModifiedUISourceCode =>
            this.#workspaceDiff?.unsubscribeFromDiffChange(nonModifiedUISourceCode, this.requestUpdate, this));

    // Find the newly modified UI source codes and subscribe for their diff changes.
    const newlyModifiedUISourceCodes =
        nextModifiedUISourceCodes.filter(uiSourceCode => !currentModifiedUISourceCodes.includes(uiSourceCode));
    newlyModifiedUISourceCodes.forEach(
        modifiedUISourceCode =>
            this.#workspaceDiff?.subscribeToDiffChange(modifiedUISourceCode, this.requestUpdate, this));
    this.#modifiedUISourceCodes = nextModifiedUISourceCodes;

    if (this.isShowing()) {
      this.requestUpdate();
    }
  }

  async #onDiffModifiedStatusChanged(): Promise<void> {
    if (!this.#workspaceDiff) {
      return;
    }

    await this.#initializeModifiedUISourceCodes();
  }

  override async performUpdate(): Promise<void> {
    const uiSourceCodeAndDiffs = await Promise.all(this.#modifiedUISourceCodes.map(async modifiedUISourceCode => {
      // `requestDiff` caches the response from the previous `requestDiff` calls if the file did not change
      // so we can safely call it here without concerns for performance.
      const diffResponse = await this.#workspaceDiff?.requestDiff(modifiedUISourceCode);
      return {
        diff: diffResponse?.diff,
        uiSourceCode: modifiedUISourceCode,
      };
    }));

    const singleDiffViewInputs =
        uiSourceCodeAndDiffs.filter(uiSourceCodeAndDiff => uiSourceCodeAndDiff.diff)
            .map(({uiSourceCode, diff}) => {
              return {
                diff: diff as Diff.Diff.DiffArray,  // We already filter above the ones that does not have `diff`.
                fileName: `${uiSourceCode.isDirty() ? '*' : ''}${uiSourceCode.displayName()}`,
                mimeType: uiSourceCode.mimeType(),
                icon: PanelUtils.PanelUtils.getIconForSourceFile(uiSourceCode),
                onCopy: this.#onCopyDiff.bind(this),
              };
            })
            .sort((a, b) => Platform.StringUtilities.compare(a.fileName, b.fileName));

    this.#view({singleDiffViewInputs}, undefined, this.contentElement);
  }
}
