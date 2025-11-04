// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Persistence from '../../models/persistence/persistence.js';
import * as WorkspaceDiff from '../../models/workspace_diff/workspace_diff.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import * as PanelUtils from '../utils/utils.js';
import combinedDiffViewStyles from './combinedDiffView.css.js';
const COPIED_TO_CLIPBOARD_TEXT_TIMEOUT_MS = 1000;
const { html, Directives: { classMap } } = Lit;
const UIStrings = {
    /**
     * @description The title of the button after it was pressed and the text was copied to clipboard.
     */
    copied: 'Copied to clipboard',
    /**
     * @description The title of the copy file to clipboard button
     * @example {index.css} PH1
     */
    copyFile: 'Copy file {PH1} to clipboard',
};
const str_ = i18n.i18n.registerUIStrings('panels/changes/CombinedDiffView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
function renderSingleDiffView(singleDiffViewInput) {
    const { fileName, fileUrl, mimeType, icon, diff, copied, selectedFileUrl, onCopy, onFileNameClick } = singleDiffViewInput;
    const classes = classMap({
        selected: selectedFileUrl === fileUrl,
    });
    // clang-format off
    return html `
    <details open class=${classes}>
      <summary>
        <div class="summary-left">
          <devtools-icon class="drop-down-icon" name="arrow-drop-down"></devtools-icon>
          ${icon}
          <button class="file-name-link" jslog=${VisualLogging.action('jump-to-file')} @click=${() => onFileNameClick(fileUrl)}>${fileName}</button>
        </div>
        <div class="summary-right">
          <devtools-button
            .title=${i18nString(UIStrings.copyFile, { PH1: fileName })}
            .size=${"SMALL" /* Buttons.Button.Size.SMALL */}
            .iconName=${'copy'}
            .jslogContext=${'combined-diff-view.copy'}
            .variant=${"icon" /* Buttons.Button.Variant.ICON */}
            @click=${() => onCopy(fileUrl)}
          ></devtools-button>
          ${copied
        ? html `<span class="copied">${i18nString(UIStrings.copied)}</span>`
        : Lit.nothing}
        </div>
      </summary>
      <div class="diff-view-container">
        <devtools-diff-view
          .data=${{ diff, mimeType }}>
        </devtools-diff-view>
      </div>
    </details>
  `;
    // clang-format on
}
const DEFAULT_VIEW = (input, output, target) => {
    // clang-format off
    Lit.render(html `
      <div class="combined-diff-view">
        ${input.singleDiffViewInputs.map(singleDiffViewInput => renderSingleDiffView(singleDiffViewInput))}
      </div>
    `, target);
    // clang-format on
};
export class CombinedDiffView extends UI.Widget.Widget {
    /**
     * Ignores urls that start with any in the list
     */
    ignoredUrls = [];
    #selectedFileUrl;
    #workspaceDiff;
    #modifiedUISourceCodes = [];
    #copiedFiles = {};
    #view;
    #viewOutput = {};
    constructor(element, view = DEFAULT_VIEW) {
        super(element);
        this.registerRequiredCSS(combinedDiffViewStyles);
        this.#view = view;
    }
    wasShown() {
        super.wasShown();
        this.#workspaceDiff?.addEventListener("ModifiedStatusChanged" /* WorkspaceDiff.WorkspaceDiff.Events.MODIFIED_STATUS_CHANGED */, this.#onDiffModifiedStatusChanged, this);
        void this.#initializeModifiedUISourceCodes();
    }
    willHide() {
        super.willHide();
        this.#workspaceDiff?.removeEventListener("ModifiedStatusChanged" /* WorkspaceDiff.WorkspaceDiff.Events.MODIFIED_STATUS_CHANGED */, this.#onDiffModifiedStatusChanged, this);
    }
    set workspaceDiff(workspaceDiff) {
        this.#workspaceDiff = workspaceDiff;
        void this.#initializeModifiedUISourceCodes();
    }
    set selectedFileUrl(fileUrl) {
        this.#selectedFileUrl = fileUrl;
        this.requestUpdate();
        void this.updateComplete.then(() => {
            this.#viewOutput.scrollToSelectedDiff?.();
        });
    }
    async #onCopyFileContent(fileUrl) {
        const file = this.#modifiedUISourceCodes.find(uiSource => uiSource.url() === fileUrl);
        if (!file) {
            return;
        }
        const content = file.workingCopyContentData();
        if (!content.isTextContent) {
            return;
        }
        UI.UIUtils.copyTextToClipboard(content.text, i18nString(UIStrings.copied));
        this.#copiedFiles[fileUrl] = true;
        this.requestUpdate();
        setTimeout(() => {
            delete this.#copiedFiles[fileUrl];
            this.requestUpdate();
        }, COPIED_TO_CLIPBOARD_TEXT_TIMEOUT_MS);
    }
    #onFileNameClick(fileUrl) {
        const uiSourceCode = this.#modifiedUISourceCodes.find(uiSourceCode => uiSourceCode.url() === fileUrl);
        void Common.Revealer.reveal(uiSourceCode);
    }
    async #initializeModifiedUISourceCodes() {
        if (!this.#workspaceDiff) {
            return;
        }
        const currentModifiedUISourceCodes = this.#modifiedUISourceCodes;
        const nextModifiedUISourceCodes = this.#workspaceDiff.modifiedUISourceCodes();
        // Find the now non modified UI source codes and unsubscribe from their diff changes.
        const nowNonModifiedUISourceCodes = currentModifiedUISourceCodes.filter(uiSourceCode => !nextModifiedUISourceCodes.includes(uiSourceCode));
        nowNonModifiedUISourceCodes.forEach(nonModifiedUISourceCode => this.#workspaceDiff?.unsubscribeFromDiffChange(nonModifiedUISourceCode, this.requestUpdate, this));
        // Find the newly modified UI source codes and subscribe for their diff changes.
        const newlyModifiedUISourceCodes = nextModifiedUISourceCodes.filter(uiSourceCode => !currentModifiedUISourceCodes.includes(uiSourceCode));
        newlyModifiedUISourceCodes.forEach(modifiedUISourceCode => this.#workspaceDiff?.subscribeToDiffChange(modifiedUISourceCode, this.requestUpdate, this));
        this.#modifiedUISourceCodes = nextModifiedUISourceCodes;
        if (this.isShowing()) {
            this.requestUpdate();
        }
    }
    async #onDiffModifiedStatusChanged() {
        if (!this.#workspaceDiff) {
            return;
        }
        await this.#initializeModifiedUISourceCodes();
    }
    async performUpdate() {
        const uiSourceCodeAndDiffs = (await Promise.all(this.#modifiedUISourceCodes.map(async (modifiedUISourceCode) => {
            for (const ignoredUrl of this.ignoredUrls) {
                if (modifiedUISourceCode.url().startsWith(ignoredUrl)) {
                    return;
                }
            }
            // `requestDiff` caches the response from the previous `requestDiff` calls if the file did not change
            // so we can safely call it here without concerns for performance.
            const diffResponse = await this.#workspaceDiff?.requestDiff(modifiedUISourceCode);
            return {
                diff: diffResponse?.diff ?? [],
                uiSourceCode: modifiedUISourceCode,
            };
        }))).filter(uiSourceCodeAndDiff => !!uiSourceCodeAndDiff);
        const singleDiffViewInputs = uiSourceCodeAndDiffs.map(({ uiSourceCode, diff }) => {
            let displayText = uiSourceCode.fullDisplayName();
            // If the UISourceCode is backed by a workspace, we show the path as "{workspace-name}/path/relative/to/workspace"
            const fileSystemUiSourceCode = Persistence.Persistence.PersistenceImpl.instance().fileSystem(uiSourceCode);
            if (fileSystemUiSourceCode) {
                displayText = [
                    fileSystemUiSourceCode.project().displayName(),
                    ...Persistence.FileSystemWorkspaceBinding.FileSystemWorkspaceBinding.relativePath(fileSystemUiSourceCode)
                ].join('/');
            }
            return {
                diff,
                fileName: `${uiSourceCode.isDirty() ? '*' : ''}${displayText}`,
                fileUrl: uiSourceCode.url(),
                mimeType: uiSourceCode.mimeType(),
                icon: PanelUtils.PanelUtils.getIconForSourceFile(uiSourceCode),
                copied: this.#copiedFiles[uiSourceCode.url()],
                selectedFileUrl: this.#selectedFileUrl,
                onCopy: this.#onCopyFileContent.bind(this),
                onFileNameClick: this.#onFileNameClick.bind(this),
            };
        });
        this.#view({ singleDiffViewInputs }, this.#viewOutput, this.contentElement);
    }
}
//# sourceMappingURL=CombinedDiffView.js.map