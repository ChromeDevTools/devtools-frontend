// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as GreenDev from '../../models/greendev/greendev.js';
import * as WorkspaceDiff from '../../models/workspace_diff/workspace_diff.js';
import * as Diff from '../../third_party/diff/diff.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as Snackbars from '../../ui/components/snackbars/snackbars.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
const { render, html } = Lit;
const UIStrings = {
    /**
     * @description The message shown in a toast when the response is copied to the clipboard.
     */
    responseCopiedToClipboard: 'Response copied to clipboard',
};
const str_ = i18n.i18n.registerUIStrings('panels/common/CopyChangesToPrompt.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class CopyChangesToPrompt extends UI.Widget.Widget {
    #workspaceDiff;
    #view;
    #patchAgentCSSChange = null;
    constructor(target, view = GEMINI_CHANGES_VIEW) {
        super(target);
        this.#view = view;
        this.#workspaceDiff = WorkspaceDiff.WorkspaceDiff.workspaceDiff();
    }
    get patchAgentCSSChange() {
        return this.#patchAgentCSSChange;
    }
    set patchAgentCSSChange(code) {
        this.#patchAgentCSSChange = code;
        this.requestUpdate();
    }
    wasShown() {
        super.wasShown();
        this.#workspaceDiff.addEventListener("ModifiedStatusChanged" /* WorkspaceDiff.WorkspaceDiff.Events.MODIFIED_STATUS_CHANGED */, this.#onDiffChange, this);
    }
    willHide() {
        super.willHide();
        this.#workspaceDiff.removeEventListener("ModifiedStatusChanged" /* WorkspaceDiff.WorkspaceDiff.Events.MODIFIED_STATUS_CHANGED */, this.#onDiffChange, this);
    }
    #getModifiledFiles() {
        return this.#workspaceDiff.modifiedUISourceCodes().filter(modified => {
            return !modified.url().startsWith('inspector://');
        });
    }
    #onDiffChange() {
        // TODO: track this and unsubscribe to files?
        for (const file of this.#getModifiledFiles()) {
            this.#workspaceDiff.subscribeToDiffChange(file, this.requestUpdate, this);
        }
        this.requestUpdate();
    }
    set workspaceDiff(diff) {
        this.#workspaceDiff = diff;
        this.requestUpdate();
    }
    async performUpdate() {
        if (!GreenDev.Prototypes.instance().isEnabled('copyToGemini')) {
            // We expect code that renders this component to only do so based on this flag, but this is a double-check.
            return;
        }
        const diffs = await Promise.all(this.#getModifiledFiles().map(async (modifiedUISourceCode) => {
            const diffResponse = await this.#workspaceDiff?.requestDiff(modifiedUISourceCode);
            return { diff: diffResponse?.diff ?? [], uiSourceCode: modifiedUISourceCode };
        }));
        this.#view({
            diffs,
            patchAgentCSSChange: this.#patchAgentCSSChange,
            onCopyToClipboard: (text) => {
                Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(text);
                Snackbars.Snackbar.Snackbar.show({
                    message: i18nString(UIStrings.responseCopiedToClipboard),
                });
            }
        }, {}, this.contentElement);
    }
}
const GEMINI_CHANGES_VIEW = (input, _output, target) => {
    const hasDiffs = input.diffs.some(d => {
        return d.diff !== undefined && d.diff.length > 0;
    });
    if (!hasDiffs && !input.patchAgentCSSChange) {
        render(Lit.nothing, target);
        return;
    }
    const promptForChangesPanel = hasDiffs ? buildGeminiCommand(input.diffs) : '';
    const promptForPatchAgentCSS = input.patchAgentCSSChange ? buildPatchAgentCSSPrompt(input.patchAgentCSSChange) : '';
    const finalPrompt = [PREAMBLE, promptForChangesPanel, promptForPatchAgentCSS].filter(x => x.length > 0).join(`\n`);
    function copyClick() {
        input.onCopyToClipboard(finalPrompt);
    }
    // clang-format off
    render(html `<devtools-button
      .iconName=${'copy'}
      .variant=${"outlined" /* Buttons.Button.Variant.OUTLINED */}
      @click=${copyClick}>Copy prompt to clipboard</devtools-button>
    `, target);
    // clang-format on
};
function buildPatchAgentCSSPrompt(code) {
    // clang-format off
    return `The DevTools CSS Patching Agent has also made some CSS changes on behalf of the user. These changes are listed below. Think carefully about how best to apply these changes.

**DevTools Patch Agent changes**
\`\`\`
${code}
\`\`\``;
    // clang-format on
}
function buildGeminiCommand(diffs) {
    // clang-format off
    const output = `Below this line are a list of files and the diff for each of them. Consider this diff and apply it to the codebase but remembering that the changes in DevTools may not be the most accurate fixes and you should not necessarily apply them directly as DevTools works with the deployed code and not the source code.

Within the diffs you will often see lines of code commented out. If the diff contains a new line that was some code being wrapped in comments, treat that as if the intent is to delete the code.

How to read a diff:
* If a line starts with \`-\` , DevTools removed it.
* If a line starts with \`+\` , DevTools added it.
* If a line starts with neither a \`+\` or \`-\` , DevTools did not change the line and you can safely ignore it.

${diffs.map(diff => {
        if (!diff.diff || diff.diff.length === 0) {
            return '';
        }
        return `Filename: ${diff.uiSourceCode.fullDisplayName()}

Diff:
${formatDiffForLLM(diff.diff)}`;
    }).filter(x => x.length).join('\n')}`;
    // clang-format on
    return output;
}
function formatDiffForLLM(diffArray) {
    let formattedDiff = '';
    for (const diffItem of diffArray) {
        const operation = diffItem[0];
        const lines = diffItem[1];
        for (const line of lines) {
            if (operation === Diff.Diff.Operation.Equal) {
                formattedDiff += '  ' + line + '\n';
            }
            else if (operation === Diff.Diff.Operation.Insert) {
                formattedDiff += '+ ' + line + '\n';
            }
            else if (operation === Diff.Diff.Operation.Delete) {
                formattedDiff += '- ' + line + '\n';
            }
        }
    }
    return formattedDiff;
}
const PREAMBLE = `You are receiving a set of runtime changes (CSS, HTML, and JS) captured via Browser DevTools. Your goal is to persist these changes into the local source code by identifying the original source-of-truth.

Because DevTools reflects the "Flattened Result" of complex build logic, you must follow this "Source-Aware" strategy:

1. **Structural Mapping (HTML/DOM):**
    - If a DOM element was added/removed, identify the source template (JSX, Vue, Svelte, HTML) responsible.
    - **Logic Check:** Determine if the change should be a static element or if it requires a new conditional (\`if/else\`) or loop (\`map\`) based on existing component patterns.

2. **Style Mapping (CSS/Attributes):**
    - Map raw styles to the project's specific styling architecture (Tailwind, SCSS, Styled-Components).
    - Replace hard-coded values with existing Design Tokens or Theme Variables (\`var(--color-primary)\`, etc.) found in the codebase.
    - CSS changes may not be applied to CSS files directly. Consider that CSS could be applied via JavaScript, especially if the codebase is using a component based frontend framework or web components.


3. **Behavioral Mapping (JS/Event Listeners):**
    - If logic or event handlers were modified, locate the corresponding functions or hooks in the source.
    - Ensure new logic follows the project's state management patterns (e.g., React \`useState\`, Redux, or standard ES6+ modules).

4. **Safety & Ambiguity Protocol:**
    - **Third-Party Code:** If a change targets a DOM element or style generated by an external library (e.g., a UI kit's internal wrapper), do not modify the library's source. Instead, find the appropriate override mechanism in the codebase.
    - **Uncertainty:** If a DevTools change cannot be mapped to the source with 100% confidence (e.g., minified selectors or ambiguous origin), stop and report the conflict rather than guessing.

5. **Agentic Execution Workflow:**
    - **Discovery:** Use your tools (\`grep\`, \`find\`, etc.) to locate unique strings or class names from the DevTools log.
    - **Analysis:** Determine if the target is a reusable component or a specific page instance.
    - **Implementation:** Execute file edits using the project's idiomatic syntax and formatting standards.

**INSTRUCTION:**
Begin by searching for the relevant source files. Explain your mapping logic before performing the edits.
`;
//# sourceMappingURL=CopyChangesToPrompt.js.map