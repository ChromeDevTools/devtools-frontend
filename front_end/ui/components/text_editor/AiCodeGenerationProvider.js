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
import { AccessiblePlaceholder } from './AccessiblePlaceholder.js';
import { AiCodeGenerationParser } from './AiCodeGenerationParser.js';
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
    #aiCodeGenerationCitations = [];
    #aidaClient = new Host.AidaClient.AidaClient();
    #boundOnUpdateAiCodeGenerationState = this.#updateAiCodeGenerationState.bind(this);
    #controller = new AbortController();
    constructor(aiCodeGenerationConfig) {
        this.#devtoolsLocale = i18n.DevToolsLocale.DevToolsLocale.instance().locale;
        if (!AiCodeGeneration.AiCodeGeneration.AiCodeGeneration.isAiCodeGenerationEnabled(this.#devtoolsLocale)) {
            throw new Error('AI code generation feature is not enabled.');
        }
        this.#generationTeaser = new PanelCommon.AiCodeGenerationTeaser.AiCodeGenerationTeaser();
        this.#generationTeaser.disclaimerTooltipId =
            aiCodeGenerationConfig.panel + '-ai-code-generation-disclaimer-tooltip';
        this.#generationTeaser.panel = aiCodeGenerationConfig.panel;
        this.#aiCodeGenerationConfig = aiCodeGenerationConfig;
    }
    static createInstance(aiCodeGenerationConfig) {
        return new AiCodeGenerationProvider(aiCodeGenerationConfig);
    }
    extension() {
        return [
            CodeMirror.EditorView.updateListener.of(update => this.#activateTeaser(update)),
            CodeMirror.EditorView.updateListener.of(update => this.#abortOrDismissGenerationDuringUpdate(update)),
            aiAutoCompleteSuggestion,
            aiAutoCompleteSuggestionState,
            aiCodeGenerationTeaserModeState,
            CodeMirror.Prec.highest(this.#generationTeaserCompartment.of([])),
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
                        this.#dismissTeaserAndSuggestion();
                        return true;
                    }
                    const generationTeaserIsLoading = this.#generationTeaser.displayState ===
                        PanelCommon.AiCodeGenerationTeaser.AiCodeGenerationTeaserDisplayState.LOADING;
                    if (this.#generationTeaser.isShowing() && generationTeaserIsLoading) {
                        this.#controller.abort();
                        this.#controller = new AbortController();
                        this.#dismissTeaserAndSuggestion();
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
                    this.#aiCodeGenerationConfig?.onSuggestionAccepted(this.#aiCodeGenerationCitations);
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
    #dismissTeaserAndSuggestion() {
        this.#generationTeaser.displayState = PanelCommon.AiCodeGenerationTeaser.AiCodeGenerationTeaserDisplayState.TRIGGER;
        this.#editor?.dispatch({
            effects: [
                setAiCodeGenerationTeaserMode.of(AiCodeGenerationTeaserMode.DISMISSED),
                setAiAutoCompleteSuggestion.of(null),
            ]
        });
    }
    #activateTeaser(update) {
        const currentTeaserMode = update.state.field(aiCodeGenerationTeaserModeState);
        if (currentTeaserMode === AiCodeGenerationTeaserMode.ACTIVE) {
            return;
        }
        if (!update.docChanged && update.state.selection.main.head === update.startState.selection.main.head) {
            return;
        }
        update.view.dispatch({ effects: setAiCodeGenerationTeaserMode.of(AiCodeGenerationTeaserMode.ACTIVE) });
    }
    /**
     * Monitors editor changes to cancel an ongoing AI generation or dismiss one
     * if it already exists.
     * We abort the request (or dismiss suggestion) and dismiss the teaser if the
     * user modifies the document or moves their cursor/selection. These actions
     * indicate the user is no longer focused on the current generation point or
     * has manually resumed editing, making the suggestion irrelevant.
     */
    #abortOrDismissGenerationDuringUpdate(update) {
        if (!update.docChanged && update.state.selection.main.head === update.startState.selection.main.head) {
            return;
        }
        const currentTeaserMode = update.state.field(aiCodeGenerationTeaserModeState);
        if (currentTeaserMode === AiCodeGenerationTeaserMode.DISMISSED) {
            return;
        }
        if (this.#generationTeaser.displayState ===
            PanelCommon.AiCodeGenerationTeaser.AiCodeGenerationTeaserDisplayState.LOADING) {
            this.#controller.abort();
            this.#controller = new AbortController();
            this.#dismissTeaserAndSuggestion();
            return;
        }
        if (this.#generationTeaser.displayState ===
            PanelCommon.AiCodeGenerationTeaser.AiCodeGenerationTeaserDisplayState.GENERATED) {
            update.view.dispatch({ effects: setAiAutoCompleteSuggestion.of(null) });
            this.#generationTeaser.displayState =
                PanelCommon.AiCodeGenerationTeaser.AiCodeGenerationTeaserDisplayState.TRIGGER;
            return;
        }
    }
    async #triggerAiCodeGeneration(options) {
        if (!this.#editor || !this.#aiCodeGeneration) {
            return;
        }
        this.#aiCodeGenerationCitations = [];
        this.#generationTeaser.displayState = PanelCommon.AiCodeGenerationTeaser.AiCodeGenerationTeaserDisplayState.LOADING;
        const cursor = this.#editor.state.selection.main.head;
        const query = AiCodeGenerationParser.extractCommentText(this.#editor.state, cursor);
        if (!query || query.trim().length === 0) {
            return;
        }
        try {
            const startTime = performance.now();
            this.#aiCodeGenerationConfig?.onRequestTriggered();
            Host.userMetrics.actionTaken(Host.UserMetrics.Action.AiCodeGenerationRequestTriggered);
            const generationResponse = await this.#aiCodeGeneration.generateCode(query, AiCodeGeneration.AiCodeGeneration.basePreamble, this.#aiCodeGenerationConfig?.generationContext.inferenceLanguage, options);
            if (this.#generationTeaser) {
                this.#dismissTeaserAndSuggestion();
            }
            if (!generationResponse || generationResponse.samples.length === 0) {
                this.#aiCodeGenerationConfig?.onResponseReceived();
                return;
            }
            const topSample = generationResponse.samples[0];
            const shouldBlock = topSample.attributionMetadata?.attributionAction === Host.AidaClient.RecitationAction.BLOCK;
            if (shouldBlock) {
                return;
            }
            const backtickRegex = /^```(?:\w+)?\n([\s\S]*?)\n```$/;
            const matchArray = topSample.generationString.match(backtickRegex);
            const suggestionText = matchArray ? matchArray[1].trim() : topSample.generationString;
            this.#editor.dispatch({
                effects: [
                    setAiAutoCompleteSuggestion.of({
                        text: '\n' + suggestionText,
                        from: cursor,
                        rpcGlobalId: generationResponse.metadata.rpcGlobalId,
                        sampleId: topSample.sampleId,
                        startTime,
                        onImpression: this.#aiCodeGeneration?.registerUserImpression.bind(this.#aiCodeGeneration),
                    }),
                    setAiCodeGenerationTeaserMode.of(AiCodeGenerationTeaserMode.ACTIVE)
                ]
            });
            this.#generationTeaser.displayState =
                PanelCommon.AiCodeGenerationTeaser.AiCodeGenerationTeaserDisplayState.GENERATED;
            AiCodeGeneration.debugLog('Suggestion dispatched to the editor', suggestionText);
            const citations = topSample.attributionMetadata?.citations ?? [];
            this.#aiCodeGenerationCitations = citations;
            this.#aiCodeGenerationConfig?.onResponseReceived();
            return;
        }
        catch (e) {
            AiCodeGeneration.debugLog('Error while fetching code generation suggestions from AIDA', e);
            this.#aiCodeGenerationConfig?.onResponseReceived();
            Host.userMetrics.actionTaken(Host.UserMetrics.Action.AiCodeGenerationError);
        }
        if (this.#generationTeaser) {
            this.#dismissTeaserAndSuggestion();
        }
    }
}
function aiCodeGenerationTeaserExtension(teaser) {
    return CodeMirror.ViewPlugin.fromClass(class {
        #view;
        constructor(view) {
            this.#view = view;
            this.#updateTeaserState(view.state);
        }
        update(update) {
            if (!update.docChanged && update.state.selection.main.head === update.startState.selection.main.head) {
                return;
            }
            this.#updateTeaserState(update.state);
        }
        get decorations() {
            const teaserMode = this.#view.state.field(aiCodeGenerationTeaserModeState);
            if (teaserMode === AiCodeGenerationTeaserMode.DISMISSED) {
                return CodeMirror.Decoration.none;
            }
            const cursorPosition = this.#view.state.selection.main.head;
            const line = this.#view.state.doc.lineAt(cursorPosition);
            const isEmptyLine = line.length === 0;
            const isComment = Boolean(AiCodeGenerationParser.extractCommentText(this.#view.state, cursorPosition));
            const isCursorAtEndOfLine = cursorPosition >= line.to;
            if ((isEmptyLine) || (isComment && isCursorAtEndOfLine)) {
                return CodeMirror.Decoration.set([
                    CodeMirror.Decoration.widget({ widget: new AccessiblePlaceholder(teaser), side: 1 }).range(cursorPosition),
                ]);
            }
            return CodeMirror.Decoration.none;
        }
        #updateTeaserState(state) {
            // Only handle non loading and non generated states, as updates during and after generation are handled by
            // #abortOrDismissGenerationDuringUpdate in AiCodeGenerationProvider
            if (teaser.displayState === PanelCommon.AiCodeGenerationTeaser.AiCodeGenerationTeaserDisplayState.LOADING ||
                teaser.displayState === PanelCommon.AiCodeGenerationTeaser.AiCodeGenerationTeaserDisplayState.GENERATED) {
                return;
            }
            const cursorPosition = state.selection.main.head;
            const line = state.doc.lineAt(cursorPosition);
            const isEmptyLine = line.length === 0;
            if (isEmptyLine) {
                teaser.displayState = PanelCommon.AiCodeGenerationTeaser.AiCodeGenerationTeaserDisplayState.DISCOVERY;
            }
            else {
                teaser.displayState = PanelCommon.AiCodeGenerationTeaser.AiCodeGenerationTeaserDisplayState.TRIGGER;
            }
        }
    }, {
        decorations: v => v.decorations,
        eventHandlers: {
            mousemove(event) {
                // Required for mouse hover to propagate to the info button in teaser.
                return (event.target instanceof Node && teaser.contentElement.contains(event.target));
            },
            mousedown(event) {
                // Required for mouse click to propagate to the info tooltip in teaser.
                return (event.target instanceof Node && teaser.contentElement.contains(event.target));
            },
        },
    });
}
//# sourceMappingURL=AiCodeGenerationProvider.js.map