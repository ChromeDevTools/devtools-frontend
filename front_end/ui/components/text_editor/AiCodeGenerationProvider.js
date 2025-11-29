// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../../core/common/common.js';
import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as AiCodeGeneration from '../../../models/ai_code_generation/ai_code_generation.js';
import * as PanelCommon from '../../../panels/common/common.js';
import * as CodeMirror from '../../../third_party/codemirror.next/codemirror.next.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as VisualLogging from '../../visual_logging/visual_logging.js';
import { AiCodeCompletionTeaserPlaceholder } from './AiCodeCompletionTeaserPlaceholder.js';
export var AiCodeGenerationTeaserMode;
(function (AiCodeGenerationTeaserMode) {
    AiCodeGenerationTeaserMode["ACTIVE"] = "active";
    AiCodeGenerationTeaserMode["DISMISSED"] = "dismissed";
})(AiCodeGenerationTeaserMode || (AiCodeGenerationTeaserMode = {}));
export const setAiCodeGenerationTeaserMode = CodeMirror.StateEffect.define();
const aiCodeGenerationTeaserModeState = CodeMirror.StateField.define({
    create: () => AiCodeGenerationTeaserMode.ACTIVE,
    update(value, tr) {
        return tr.effects.find(effect => effect.is(setAiCodeGenerationTeaserMode))?.value ?? value;
    },
});
export class AiCodeGenerationProvider {
    #devtoolsLocale;
    #aiCodeCompletionSetting = Common.Settings.Settings.instance().createSetting('ai-code-completion-enabled', false);
    #generationTeaserCompartment = new CodeMirror.Compartment();
    #generationTeaser;
    #editor;
    #boundOnUpdateAiCodeGenerationState = this.#updateAiCodeGenerationState.bind(this);
    constructor() {
        this.#devtoolsLocale = i18n.DevToolsLocale.DevToolsLocale.instance().locale;
        if (!AiCodeGeneration.AiCodeGeneration.AiCodeGeneration.isAiCodeGenerationEnabled(this.#devtoolsLocale)) {
            throw new Error('AI code generation feature is not enabled.');
        }
        this.#generationTeaser = new PanelCommon.AiCodeGenerationTeaser();
    }
    static createInstance() {
        return new AiCodeGenerationProvider();
    }
    extension() {
        return [
            CodeMirror.EditorView.updateListener.of(update => this.activateTeaser(update)),
            aiCodeGenerationTeaserModeState,
            this.#generationTeaserCompartment.of([]),
            CodeMirror.Prec.highest(CodeMirror.keymap.of(this.#editorKeymap())),
        ];
    }
    dispose() {
        this.#cleanupAiCodeGeneration();
    }
    editorInitialized(editor) {
        this.#editor = editor;
        Host.AidaClient.HostConfigTracker.instance().addEventListener("aidaAvailabilityChanged" /* Host.AidaClient.Events.AIDA_AVAILABILITY_CHANGED */, this.#boundOnUpdateAiCodeGenerationState);
        this.#aiCodeCompletionSetting.addChangeListener(this.#boundOnUpdateAiCodeGenerationState);
        void this.#updateAiCodeGenerationState();
    }
    #setupAiCodeGeneration() {
        this.#editor?.dispatch({
            effects: [this.#generationTeaserCompartment.reconfigure([aiCodeGenerationTeaserExtension(this.#generationTeaser)])],
        });
    }
    #cleanupAiCodeGeneration() {
        this.#editor?.dispatch({
            effects: [this.#generationTeaserCompartment.reconfigure([])],
        });
    }
    async #updateAiCodeGenerationState() {
        const aidaAvailability = await Host.AidaClient.AidaClient.checkAccessPreconditions();
        const isAvailable = aidaAvailability === "available" /* Host.AidaClient.AidaAccessPreconditions.AVAILABLE */;
        const isEnabled = this.#aiCodeCompletionSetting.get();
        if (isAvailable && isEnabled) {
            this.#setupAiCodeGeneration();
        }
        else {
            this.#cleanupAiCodeGeneration();
        }
    }
    #editorKeymap() {
        return [
            {
                key: 'Escape',
                run: () => {
                    if (!this.#editor || !this.#generationTeaser.isShowing() || !this.#generationTeaser.loading) {
                        return false;
                    }
                    this.#editor.dispatch({ effects: setAiCodeGenerationTeaserMode.of(AiCodeGenerationTeaserMode.DISMISSED) });
                    return true;
                },
            },
            {
                any: (_view, event) => {
                    if (!this.#editor || !this.#generationTeaser.isShowing()) {
                        return false;
                    }
                    if (UI.KeyboardShortcut.KeyboardShortcut.eventHasCtrlEquivalentKey(event)) {
                        if (event.key === 'i') {
                            event.consume(true);
                            void VisualLogging.logKeyDown(event.currentTarget, event, 'ai-code-generation.triggered');
                            this.#generationTeaser.loading = true;
                            return true;
                        }
                    }
                    return false;
                }
            }
        ];
    }
    async activateTeaser(update) {
        const currentTeaserMode = update.state.field(aiCodeGenerationTeaserModeState);
        if (currentTeaserMode === AiCodeGenerationTeaserMode.ACTIVE) {
            return;
        }
        if (!update.docChanged && update.state.selection.main.head === update.startState.selection.main.head) {
            return;
        }
        update.view.dispatch({ effects: setAiCodeGenerationTeaserMode.of(AiCodeGenerationTeaserMode.ACTIVE) });
    }
}
// TODO(b/445899453): Handle teaser's discovery mode
function aiCodeGenerationTeaserExtension(teaser) {
    return CodeMirror.ViewPlugin.fromClass(class {
        view;
        #teaserMode;
        constructor(view) {
            this.view = view;
            this.#teaserMode = view.state.field(aiCodeGenerationTeaserModeState);
        }
        update(update) {
            const currentTeaserMode = update.state.field(aiCodeGenerationTeaserModeState);
            if (currentTeaserMode !== this.#teaserMode) {
                this.#teaserMode = currentTeaserMode;
            }
            if (!update.docChanged && update.state.selection.main.head === update.startState.selection.main.head) {
                return;
            }
            if (teaser.loading) {
                teaser.loading = false;
            }
        }
        get decorations() {
            if (this.#teaserMode === AiCodeGenerationTeaserMode.DISMISSED) {
                return CodeMirror.Decoration.none;
            }
            const cursorPosition = this.view.state.selection.main.head;
            const line = this.view.state.doc.lineAt(cursorPosition);
            // TODO(b/445899453): Detect all types of comments
            const isComment = line.text.startsWith('//');
            const isCursorAtEndOfLine = cursorPosition >= line.to;
            if (!isComment || !isCursorAtEndOfLine) {
                return CodeMirror.Decoration.none;
            }
            return CodeMirror.Decoration.set([
                CodeMirror.Decoration.widget({ widget: new AiCodeCompletionTeaserPlaceholder(teaser), side: 1 })
                    .range(cursorPosition),
            ]);
        }
    }, {
        decorations: v => v.decorations,
    });
}
//# sourceMappingURL=AiCodeGenerationProvider.js.map