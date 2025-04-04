// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable rulesdir/no-lit-render-outside-of-view */

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as Persistence from '../../models/persistence/persistence.js';
import type * as Workspace from '../../models/workspace/workspace.js';
import * as WorkspaceDiff from '../../models/workspace_diff/workspace_diff.js';
import type * as Diff from '../../third_party/diff/diff.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import type * as DiffView from '../../ui/components/diff_view/diff_view.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import * as PanelUtils from '../utils/utils.js';

import combinedDiffViewStyles from './combinedDiffView.css.js';

const COPIED_TO_CLIPBOARD_TEXT_TIMEOUT_MS = 1000;

const {html} = Lit;

const UIStrings = {
  /**
   * @description The title of the button after it was pressed and the text was copied to clipboard.
   */
  copied: 'Copied to clipboard',
} as const;

const str_ = i18n.i18n.registerUIStrings('panels/changes/CombinedDiffView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

interface SingleDiffViewInput {
  fileName: string;
  fileUrl: string;
  mimeType: string;
  icon: HTMLElement;
  diff: Diff.Diff.DiffArray;
  copied: boolean;
  onCopy: (fileUrl: string) => void;
  onFileNameClick: (fileUrl: string) => void;
}

export interface ViewInput {
  singleDiffViewInputs: SingleDiffViewInput[];
}

type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;

function renderSingleDiffView(singleDiffViewInput: SingleDiffViewInput): Lit.TemplateResult {
  const {fileName, fileUrl, mimeType, icon, diff, copied, onCopy, onFileNameClick} = singleDiffViewInput;

  return html`
    <details open>
      <summary>
        <div class="summary-left">
          <devtools-icon class="drop-down-icon" .name=${'arrow-drop-down'}></devtools-icon>
          ${icon}
          <button class="file-name-link" @click=${() => onFileNameClick(fileUrl)}>${fileName}</button>
        </div>
        <div class="summary-right">
          ${copied ? html`<span class="copied">${i18nString(UIStrings.copied)}</span>` : html`
            <devtools-button
              title=${'Copy'}
              .size=${Buttons.Button.Size.SMALL}
              .iconName=${'copy'}
              .jslogContext=${'combined-diff-view.copy'}
              .variant=${Buttons.Button.Variant.ICON}
              @click=${() => onCopy(fileUrl)}></devtools-button>
          `}
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
  /**
   * Ignores urls that start with any in the list
   */
  ignoredUrls: string[] = [];

  #workspaceDiff?: WorkspaceDiff.WorkspaceDiff.WorkspaceDiffImpl;
  #modifiedUISourceCodes: Workspace.UISourceCode.UISourceCode[] = [];
  #copiedFiles: Record<string, boolean> = {};
  #view: View;
  constructor(element?: HTMLElement, view: View = (input, _output, target) => {
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

  async #onCopyFileContent(fileUrl: string): Promise<void> {
    const file = this.#modifiedUISourceCodes.find(uiSource => uiSource.url() === fileUrl);
    if (!file) {
      return;
    }
    const content = file.workingCopyContentData();
    if (!content.isTextContent) {
      return;
    }

    Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(content.text);
    this.#copiedFiles[fileUrl] = true;
    this.requestUpdate();
    setTimeout(() => {
      delete this.#copiedFiles[fileUrl];
      this.requestUpdate();
    }, COPIED_TO_CLIPBOARD_TEXT_TIMEOUT_MS);
  }

  #onFileNameClick(fileUrl: string): void {
    const uiSourceCode = this.#modifiedUISourceCodes.find(uiSourceCode => uiSourceCode.url() === fileUrl);
    void Common.Revealer.reveal(uiSourceCode);
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
    const uiSourceCodeAndDiffs = (await Promise.all(this.#modifiedUISourceCodes.map(async modifiedUISourceCode => {
                                   for (const ignoredUrl of this.ignoredUrls) {
                                     if (modifiedUISourceCode.url().startsWith(ignoredUrl)) {
                                       return;
                                     }
                                   }

                                   // `requestDiff` caches the response from the previous `requestDiff` calls if the file did not change
                                   // so we can safely call it here without concerns for performance.
                                   const diffResponse = await this.#workspaceDiff?.requestDiff(modifiedUISourceCode);
                                   if (!diffResponse || diffResponse.diff.length === 0) {
                                     return;
                                   }

                                   return {
                                     diff: diffResponse.diff,
                                     uiSourceCode: modifiedUISourceCode,
                                   };
                                 }))).filter(uiSourceCodeAndDiff => !!uiSourceCodeAndDiff);

    const singleDiffViewInputs =
        uiSourceCodeAndDiffs
            .map(({uiSourceCode, diff}) => {
              let displayText = uiSourceCode.fullDisplayName();
              // If the UISourceCode is backed by a workspace, we show the path as "{workspace-name}/path/relative/to/workspace"
              const fileSystemUiSourceCode =
                  Persistence.Persistence.PersistenceImpl.instance().fileSystem(uiSourceCode);
              if (fileSystemUiSourceCode) {
                displayText = [
                  fileSystemUiSourceCode.project().displayName(),
                  ...Persistence.FileSystemWorkspaceBinding.FileSystemWorkspaceBinding.relativePath(
                      fileSystemUiSourceCode)
                ].join('/');
              }
              return {
                diff,
                fileName: `${uiSourceCode.isDirty() ? '*' : ''}${displayText}`,
                fileUrl: uiSourceCode.url(),
                mimeType: uiSourceCode.mimeType(),
                icon: PanelUtils.PanelUtils.getIconForSourceFile(uiSourceCode, {width: 18, height: 18}),
                copied: this.#copiedFiles[uiSourceCode.url()],
                onCopy: this.#onCopyFileContent.bind(this),
                onFileNameClick: this.#onFileNameClick.bind(this),
              };
            })
            .sort((a, b) => Platform.StringUtilities.compare(a.fileName, b.fileName));

    this.#view({singleDiffViewInputs}, undefined, this.contentElement);
  }
}
