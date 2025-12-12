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
import { acceptAiAutoCompleteSuggestion, aiAutoCompleteSuggestion, aiAutoCompleteSuggestionState, hasActiveAiSuggestion, setAiAutoCompleteSuggestion, } from './config.js';
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
    #aiCodeGenerationConfig;
    #aiCodeGeneration;
    #aidaClient = new Host.AidaClient.AidaClient();
    #boundOnUpdateAiCodeGenerationState = this.#updateAiCodeGenerationState.bind(this);
    #controller = new AbortController();
    constructor(aiCodeGenerationConfig) {
        this.#devtoolsLocale = i18n.DevToolsLocale.DevToolsLocale.instance().locale;
        if (!AiCodeGeneration.AiCodeGeneration.AiCodeGeneration.isAiCodeGenerationEnabled(this.#devtoolsLocale)) {
            throw new Error('AI code generation feature is not enabled.');
        }
        this.#generationTeaser = new PanelCommon.AiCodeGenerationTeaser();
        this.#aiCodeGenerationConfig = aiCodeGenerationConfig;
    }
    static createInstance(aiCodeGenerationConfig) {
        return new AiCodeGenerationProvider(aiCodeGenerationConfig);
    }
    extension() {
        return [
            CodeMirror.EditorView.updateListener.of(update => this.activateTeaser(update)),
            aiAutoCompleteSuggestion,
            aiAutoCompleteSuggestionState,
            aiCodeGenerationTeaserModeState,
            this.#generationTeaserCompartment.of([]),
            CodeMirror.Prec.highest(CodeMirror.keymap.of(this.#editorKeymap())),
        ];
    }
    dispose() {
        this.#controller.abort();
        this.#cleanupAiCodeGeneration();
    }
    editorInitialized(editor) {
        this.#editor = editor;
        Host.AidaClient.HostConfigTracker.instance().addEventListener("aidaAvailabilityChanged" /* Host.AidaClient.Events.AIDA_AVAILABILITY_CHANGED */, this.#boundOnUpdateAiCodeGenerationState);
        this.#aiCodeCompletionSetting.addChangeListener(this.#boundOnUpdateAiCodeGenerationState);
        void this.#updateAiCodeGenerationState();
    }
    #setupAiCodeGeneration() {
        if (this.#aiCodeGeneration) {
            return;
        }
        this.#aiCodeGeneration = new AiCodeGeneration.AiCodeGeneration.AiCodeGeneration({ aidaClient: this.#aidaClient });
        this.#editor?.dispatch({
            effects: [this.#generationTeaserCompartment.reconfigure([aiCodeGenerationTeaserExtension(this.#generationTeaser)])],
        });
    }
    #cleanupAiCodeGeneration() {
        if (!this.#aiCodeGeneration) {
            return;
        }
        this.#aiCodeGeneration = undefined;
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
                    if (!this.#editor || !this.#aiCodeGeneration) {
                        return false;
                    }
                    if (hasActiveAiSuggestion(this.#editor.state)) {
                        this.#editor.dispatch({
                            effects: setAiAutoCompleteSuggestion.of(null),
                        });
                        return true;
                    }
                    if (this.#generationTeaser.isShowing() && this.#generationTeaser.loading) {
                        this.#controller.abort();
                        this.#controller = new AbortController();
                        this.#dismissTeaser();
                        return true;
                    }
                    return false;
                },
            },
            {
                key: 'Tab',
                run: () => {
                    if (!this.#aiCodeGeneration || !this.#editor || !hasActiveAiSuggestion(this.#editor.state)) {
                        return false;
                    }
                    const { accepted, suggestion } = acceptAiAutoCompleteSuggestion(this.#editor.editor);
                    if (!accepted) {
                        return false;
                    }
                    if (suggestion?.rpcGlobalId) {
                        this.#aiCodeGeneration.registerUserAcceptance(suggestion.rpcGlobalId, suggestion.sampleId);
                    }
                    this.#aiCodeGenerationConfig?.onSuggestionAccepted();
                    return true;
                },
            },
            {
                any: (_view, event) => {
                    if (!this.#editor || !this.#aiCodeGeneration || !this.#generationTeaser.isShowing()) {
                        return false;
                    }
                    if (UI.KeyboardShortcut.KeyboardShortcut.eventHasCtrlEquivalentKey(event)) {
                        if (event.key === 'i') {
                            event.consume(true);
                            void VisualLogging.logKeyDown(event.currentTarget, event, 'ai-code-generation.triggered');
                            void this.#triggerAiCodeGeneration({ signal: this.#controller.signal });
                            return true;
                        }
                    }
                    return false;
                }
            }
        ];
    }
    #dismissTeaser() {
        this.#generationTeaser.loading = false;
        this.#editor?.dispatch({ effects: setAiCodeGenerationTeaserMode.of(AiCodeGenerationTeaserMode.DISMISSED) });
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
    async #triggerAiCodeGeneration(options) {
        if (!this.#editor || !this.#aiCodeGeneration) {
            return;
        }
        this.#generationTeaser.loading = true;
        const cursor = this.#editor.state.selection.main.head;
        // TODO(b/445899453): Detect all types of comments
        const query = this.#editor.state.doc.lineAt(cursor).text;
        if (query.trim().length === 0) {
            return;
        }
        try {
            const startTime = performance.now();
            this.#aiCodeGenerationConfig?.onRequestTriggered();
            Host.userMetrics.actionTaken(Host.UserMetrics.Action.AiCodeGenerationRequestTriggered);
            const generationResponse = await this.#aiCodeGeneration.generateCode(query, AiCodeGeneration.AiCodeGeneration.basePreamble, this.#aiCodeGenerationConfig?.generationContext.inferenceLanguage, options);
            if (this.#generationTeaser) {
                this.#dismissTeaser();
            }
            if (!generationResponse || generationResponse.samples.length === 0) {
                this.#aiCodeGenerationConfig?.onResponseReceived([]);
                return;
            }
            const topSample = generationResponse.samples[0];
            const shouldBlock = topSample.attributionMetadata?.attributionAction === Host.AidaClient.RecitationAction.BLOCK;
            if (shouldBlock) {
                return;
            }
            this.#editor.dispatch({
                effects: setAiAutoCompleteSuggestion.of({
                    text: '\n' + topSample.generationString,
                    from: cursor,
                    rpcGlobalId: generationResponse.metadata.rpcGlobalId,
                    sampleId: topSample.sampleId,
                    startTime,
                    onImpression: this.#aiCodeGeneration?.registerUserImpression.bind(this.#aiCodeGeneration),
                })
            });
            AiCodeGeneration.debugLog('Suggestion dispatched to the editor', topSample.generationString);
            const citations = topSample.attributionMetadata?.citations ?? [];
            this.#aiCodeGenerationConfig?.onResponseReceived(citations);
        }
        catch (e) {
            AiCodeGeneration.debugLog('Error while fetching code generation suggestions from AIDA', e);
            this.#aiCodeGenerationConfig?.onResponseReceived([]);
            Host.userMetrics.actionTaken(Host.UserMetrics.Action.AiCodeGenerationError);
        }
        if (this.#generationTeaser) {
            this.#dismissTeaser();
        }
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