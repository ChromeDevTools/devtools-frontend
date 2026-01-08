// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../../core/common/common.js';
import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as AiCodeCompletion from '../../../models/ai_code_completion/ai_code_completion.js';
import * as PanelCommon from '../../../panels/common/common.js';
import * as CodeMirror from '../../../third_party/codemirror.next/codemirror.next.js';
import * as UI from '../../legacy/legacy.js';
import * as VisualLogging from '../../visual_logging/visual_logging.js';
import { AccessiblePlaceholder } from './AccessiblePlaceholder.js';
import { acceptAiAutoCompleteSuggestion, aiAutoCompleteSuggestion, aiAutoCompleteSuggestionState, hasActiveAiSuggestion, setAiAutoCompleteSuggestion, showCompletionHint, } from './config.js';
export var AiCodeCompletionTeaserMode;
(function (AiCodeCompletionTeaserMode) {
    AiCodeCompletionTeaserMode["OFF"] = "off";
    AiCodeCompletionTeaserMode["ON"] = "on";
    AiCodeCompletionTeaserMode["ONLY_SHOW_ON_EMPTY"] = "onlyShowOnEmpty";
})(AiCodeCompletionTeaserMode || (AiCodeCompletionTeaserMode = {}));
export const setAiCodeCompletionTeaserMode = CodeMirror.StateEffect.define();
export const aiCodeCompletionTeaserModeState = CodeMirror.StateField.define({
    create: () => AiCodeCompletionTeaserMode.OFF,
    update(value, tr) {
        return tr.effects.find(effect => effect.is(setAiCodeCompletionTeaserMode))?.value ?? value;
    },
});
export const DELAY_BEFORE_SHOWING_RESPONSE_MS = 500;
export const AIDA_REQUEST_DEBOUNCE_TIMEOUT_MS = 200;
const MAX_PREFIX_SUFFIX_LENGTH = 20_000;
export class AiCodeCompletionProvider {
    #aidaClient = new Host.AidaClient.AidaClient();
    #aiCodeCompletion;
    #aiCodeCompletionSetting = Common.Settings.Settings.instance().createSetting('ai-code-completion-enabled', false);
    #aiCodeCompletionTeaserDismissedSetting = Common.Settings.Settings.instance().createSetting('ai-code-completion-teaser-dismissed', false);
    #teaserCompartment = new CodeMirror.Compartment();
    #teaser;
    #suggestionRenderingTimeout;
    #editor;
    #aiCodeCompletionCitations = [];
    #aiCodeCompletionConfig;
    #boundOnUpdateAiCodeCompletionState = this.#updateAiCodeCompletionState.bind(this);
    constructor(aiCodeCompletionConfig) {
        const devtoolsLocale = i18n.DevToolsLocale.DevToolsLocale.instance();
        if (!AiCodeCompletion.AiCodeCompletion.AiCodeCompletion.isAiCodeCompletionEnabled(devtoolsLocale.locale)) {
            throw new Error('AI code completion feature is not enabled.');
        }
        this.#aiCodeCompletionConfig = aiCodeCompletionConfig;
    }
    static createInstance(aiCodeCompletionConfig) {
        return new AiCodeCompletionProvider(aiCodeCompletionConfig);
    }
    extension() {
        return [
            CodeMirror.EditorView.updateListener.of(update => this.#triggerAiCodeCompletion(update)),
            this.#teaserCompartment.of([]),
            aiAutoCompleteSuggestion,
            aiCodeCompletionTeaserModeState,
            aiAutoCompleteSuggestionState,
            CodeMirror.Prec.highest(CodeMirror.keymap.of(this.#editorKeymap())),
        ];
    }
    dispose() {
        this.#detachTeaser();
        this.#teaser = undefined;
        this.#aiCodeCompletionSetting.removeChangeListener(this.#boundOnUpdateAiCodeCompletionState);
        Host.AidaClient.HostConfigTracker.instance().removeEventListener("aidaAvailabilityChanged" /* Host.AidaClient.Events.AIDA_AVAILABILITY_CHANGED */, this.#boundOnUpdateAiCodeCompletionState);
        this.#cleanupAiCodeCompletion();
    }
    editorInitialized(editor) {
        this.#editor = editor;
        if (!this.#aiCodeCompletionSetting.get() && !this.#aiCodeCompletionTeaserDismissedSetting.get()) {
            this.#teaser = new PanelCommon.AiCodeCompletionTeaser({
                onDetach: () => this.#detachTeaser.bind(this),
            });
            this.#editor.editor.dispatch({ effects: this.#teaserCompartment.reconfigure([aiCodeCompletionTeaserExtension(this.#teaser)]) });
        }
        Host.AidaClient.HostConfigTracker.instance().addEventListener("aidaAvailabilityChanged" /* Host.AidaClient.Events.AIDA_AVAILABILITY_CHANGED */, this.#boundOnUpdateAiCodeCompletionState);
        this.#aiCodeCompletionSetting.addChangeListener(this.#boundOnUpdateAiCodeCompletionState);
        void this.#updateAiCodeCompletionState();
    }
    clearCache() {
        this.#aiCodeCompletion?.clearCachedRequest();
    }
    #setupAiCodeCompletion() {
        if (!this.#editor || !this.#aiCodeCompletionConfig) {
            return;
        }
        if (this.#aiCodeCompletion) {
            // early return as this means that code completion was previously setup
            return;
        }
        this.#aiCodeCompletion = new AiCodeCompletion.AiCodeCompletion.AiCodeCompletion({ aidaClient: this.#aidaClient }, this.#aiCodeCompletionConfig.panel, undefined, this.#aiCodeCompletionConfig.completionContext.stopSequences);
        this.#aiCodeCompletionConfig.onFeatureEnabled();
    }
    #cleanupAiCodeCompletion() {
        if (!this.#aiCodeCompletion) {
            // early return as this means there is no code completion to clean up
            return;
        }
        if (this.#suggestionRenderingTimeout) {
            clearTimeout(this.#suggestionRenderingTimeout);
            this.#suggestionRenderingTimeout = undefined;
        }
        this.#editor?.dispatch({
            effects: setAiAutoCompleteSuggestion.of(null),
        });
        this.#aiCodeCompletion = undefined;
        this.#aiCodeCompletionConfig?.onFeatureDisabled();
    }
    async #updateAiCodeCompletionState() {
        const aidaAvailability = await Host.AidaClient.AidaClient.checkAccessPreconditions();
        const isAvailable = aidaAvailability === "available" /* Host.AidaClient.AidaAccessPreconditions.AVAILABLE */;
        const isEnabled = this.#aiCodeCompletionSetting.get();
        if (isAvailable && isEnabled) {
            this.#detachTeaser();
            this.#setupAiCodeCompletion();
        }
        else if (isAvailable && !isEnabled) {
            if (this.#teaser && !this.#aiCodeCompletionTeaserDismissedSetting.get()) {
                this.#editor?.editor.dispatch({ effects: this.#teaserCompartment.reconfigure([aiCodeCompletionTeaserExtension(this.#teaser)]) });
            }
            this.#cleanupAiCodeCompletion();
        }
        else if (!isAvailable) {
            this.#detachTeaser();
            this.#cleanupAiCodeCompletion();
        }
    }
    #editorKeymap() {
        return [
            {
                key: 'Escape',
                run: () => {
                    if (!this.#aiCodeCompletion || !this.#editor || !hasActiveAiSuggestion(this.#editor.state)) {
                        return false;
                    }
                    this.#editor.dispatch({
                        effects: setAiAutoCompleteSuggestion.of(null),
                    });
                    return true;
                },
            },
            {
                key: 'Tab',
                run: () => {
                    if (!this.#aiCodeCompletion || !this.#editor || !hasActiveAiSuggestion(this.#editor.state)) {
                        return false;
                    }
                    const { accepted, suggestion } = acceptAiAutoCompleteSuggestion(this.#editor.editor);
                    if (!accepted) {
                        return false;
                    }
                    if (suggestion?.rpcGlobalId) {
                        this.#aiCodeCompletion?.registerUserAcceptance(suggestion.rpcGlobalId, suggestion.sampleId);
                    }
                    this.#aiCodeCompletionConfig?.onSuggestionAccepted(this.#aiCodeCompletionCitations);
                    return true;
                },
            },
        ];
    }
    #detachTeaser() {
        if (!this.#teaser) {
            return;
        }
        this.#editor?.editor.dispatch({ effects: this.#teaserCompartment.reconfigure([]) });
    }
    /**
     * This method is responsible for fetching code completion suggestions and
     * displaying them in the text editor.
     *
     * 1. **Debouncing requests:** As the user types, we don't want to send a request
     *    for every keystroke. Instead, we use debouncing to schedule a request
     *    only after the user has paused typing for a short period
     *    (AIDA_REQUEST_THROTTLER_TIMEOUT_MS). This prevents spamming the backend with
     *    requests for intermediate typing states.
     *
     * 2. **Delaying suggestions:** When a suggestion is received from the AIDA
     *    backend, we don't show it immediately. There is a minimum delay
     *    (DELAY_BEFORE_SHOWING_RESPONSE_MS) from when the request was sent to when
     *    the suggestion is displayed.
     */
    #triggerAiCodeCompletion(update) {
        if (!update.docChanged || !this.#editor || !this.#aiCodeCompletion) {
            return;
        }
        const { doc, selection } = update.state;
        const query = doc.toString();
        const cursor = selection.main.head;
        let prefix = query.substring(0, cursor);
        if (prefix.trim().length === 0) {
            return;
        }
        const completionContextPrefix = this.#aiCodeCompletionConfig?.completionContext.getPrefix?.();
        if (completionContextPrefix) {
            prefix = completionContextPrefix + prefix;
        }
        if (prefix.length > MAX_PREFIX_SUFFIX_LENGTH) {
            prefix = prefix.substring(prefix.length - MAX_PREFIX_SUFFIX_LENGTH);
        }
        const suffix = query.substring(cursor, cursor + MAX_PREFIX_SUFFIX_LENGTH);
        this.#debouncedRequestAidaSuggestion(prefix, suffix, cursor, this.#aiCodeCompletionConfig?.completionContext.inferenceLanguage, this.#aiCodeCompletionConfig?.completionContext.additionalFiles);
    }
    #debouncedRequestAidaSuggestion = Common.Debouncer.debounce((prefix, suffix, cursorPositionAtRequest, inferenceLanguage, additionalFiles) => {
        void this.#requestAidaSuggestion(prefix, suffix, cursorPositionAtRequest, inferenceLanguage, additionalFiles);
    }, AIDA_REQUEST_DEBOUNCE_TIMEOUT_MS);
    async #requestAidaSuggestion(prefix, suffix, cursorPositionAtRequest, inferenceLanguage, additionalFiles) {
        this.#aiCodeCompletionCitations = [];
        if (!this.#aiCodeCompletion) {
            AiCodeCompletion.debugLog('Ai Code Completion is not initialized');
            this.#aiCodeCompletionConfig?.onResponseReceived();
            Host.userMetrics.actionTaken(Host.UserMetrics.Action.AiCodeCompletionError);
            return;
        }
        const startTime = performance.now();
        this.#aiCodeCompletionConfig?.onRequestTriggered();
        // Registering AiCodeCompletionRequestTriggered metric even if the request is served from cache
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.AiCodeCompletionRequestTriggered);
        try {
            const completionResponse = await this.#aiCodeCompletion.completeCode(prefix, suffix, cursorPositionAtRequest, inferenceLanguage, additionalFiles);
            if (!completionResponse) {
                this.#aiCodeCompletionConfig?.onResponseReceived();
                return;
            }
            const { response, fromCache } = completionResponse;
            if (!response) {
                this.#aiCodeCompletionConfig?.onResponseReceived();
                return;
            }
            const sampleResponse = await this.#generateSampleForRequest(response, prefix, suffix);
            if (!sampleResponse) {
                this.#aiCodeCompletionConfig?.onResponseReceived();
                return;
            }
            const { suggestionText, sampleId, citations, rpcGlobalId, } = sampleResponse;
            const remainingDelay = Math.max(DELAY_BEFORE_SHOWING_RESPONSE_MS - (performance.now() - startTime), 0);
            this.#suggestionRenderingTimeout = window.setTimeout(() => {
                const currentCursorPosition = this.#editor?.editor.state.selection.main.head;
                if (currentCursorPosition !== cursorPositionAtRequest) {
                    this.#aiCodeCompletionConfig?.onResponseReceived();
                    return;
                }
                if (this.#aiCodeCompletion) {
                    this.#editor?.dispatch({
                        effects: setAiAutoCompleteSuggestion.of({
                            text: suggestionText,
                            from: cursorPositionAtRequest,
                            rpcGlobalId,
                            sampleId,
                            startTime,
                            clearCachedRequest: this.clearCache.bind(this),
                            onImpression: this.#aiCodeCompletion?.registerUserImpression.bind(this.#aiCodeCompletion),
                        })
                    });
                }
                if (fromCache) {
                    Host.userMetrics.actionTaken(Host.UserMetrics.Action.AiCodeCompletionResponseServedFromCache);
                }
                AiCodeCompletion.debugLog('Suggestion dispatched to the editor', suggestionText, 'at cursor position', cursorPositionAtRequest);
                this.#aiCodeCompletionCitations = citations;
                this.#aiCodeCompletionConfig?.onResponseReceived();
            }, remainingDelay);
        }
        catch (e) {
            AiCodeCompletion.debugLog('Error while fetching code completion suggestions from AIDA', e);
            this.#aiCodeCompletionConfig?.onResponseReceived();
            Host.userMetrics.actionTaken(Host.UserMetrics.Action.AiCodeCompletionError);
        }
    }
    async #generateSampleForRequest(response, prefix, suffix) {
        const suggestionSample = this.#pickSampleFromResponse(response);
        if (!suggestionSample) {
            return null;
        }
        const shouldBlock = suggestionSample.attributionMetadata?.attributionAction === Host.AidaClient.RecitationAction.BLOCK;
        if (shouldBlock) {
            return null;
        }
        const isRepetitive = this.#checkIfSuggestionRepeatsExistingText(suggestionSample.generationString, prefix, suffix);
        if (isRepetitive) {
            return null;
        }
        const suggestionText = this.#trimSuggestionOverlap(suggestionSample.generationString, suffix);
        if (suggestionText.length === 0) {
            return null;
        }
        return {
            suggestionText,
            sampleId: suggestionSample.sampleId,
            citations: suggestionSample.attributionMetadata?.citations ?? [],
            rpcGlobalId: response.metadata.rpcGlobalId,
        };
    }
    #pickSampleFromResponse(response) {
        if (!response.generatedSamples.length) {
            return null;
        }
        // `currentHint` is the portion of a standard autocomplete suggestion that the user has not yet typed.
        // For example, if the user types `document.queryS` and the autocomplete suggests `document.querySelector`,
        // the `currentHint` is `elector`.
        const currentHintInMenu = this.#editor?.editor.plugin(showCompletionHint)?.currentHint;
        if (!currentHintInMenu) {
            return response.generatedSamples[0];
        }
        // TODO(ergunsh): This does not handle looking for `selectedCompletion`. The `currentHint` is `null`
        // for the Sources panel case.
        // Even though there is no match, we still return the first suggestion which will be displayed
        // when the traditional autocomplete menu is closed.
        return response.generatedSamples.find(sample => sample.generationString.startsWith(currentHintInMenu)) ??
            response.generatedSamples[0];
    }
    #checkIfSuggestionRepeatsExistingText(generationString, prefix, suffix) {
        return Boolean(prefix.includes(generationString.trim()) || suffix?.includes(generationString.trim()));
    }
    /**
     * Removes the end of a suggestion if it overlaps with the start of the suffix.
     */
    #trimSuggestionOverlap(generationString, suffix) {
        if (!suffix) {
            return generationString;
        }
        // Iterate from the longest possible overlap down to the shortest
        for (let i = Math.min(generationString.length, suffix.length); i > 0; i--) {
            const overlapCandidate = suffix.substring(0, i);
            if (generationString.endsWith(overlapCandidate)) {
                return generationString.slice(0, -i);
            }
        }
        return generationString;
    }
}
function aiCodeCompletionTeaserExtension(teaser) {
    return CodeMirror.ViewPlugin.fromClass(class {
        view;
        teaser;
        #teaserDecoration = CodeMirror.Decoration.none;
        #teaserMode;
        #teaserDisplayTimeout;
        constructor(view) {
            this.view = view;
            this.teaser = teaser;
            this.#teaserMode = view.state.field(aiCodeCompletionTeaserModeState);
            this.#setupDecoration();
        }
        destroy() {
            window.clearTimeout(this.#teaserDisplayTimeout);
        }
        update(update) {
            const currentTeaserMode = update.state.field(aiCodeCompletionTeaserModeState);
            if (currentTeaserMode !== this.#teaserMode) {
                this.#teaserMode = currentTeaserMode;
                this.#setupDecoration();
                return;
            }
            if (this.#teaserMode === AiCodeCompletionTeaserMode.ONLY_SHOW_ON_EMPTY && update.docChanged) {
                this.#updateTeaserDecorationForOnlyShowOnEmptyMode();
            }
            else if (this.#teaserMode === AiCodeCompletionTeaserMode.ON) {
                if (update.docChanged) {
                    this.#teaserDecoration = CodeMirror.Decoration.none;
                    window.clearTimeout(this.#teaserDisplayTimeout);
                    this.#updateTeaserDecorationForOnMode();
                }
                else if (update.selectionSet && update.state.doc.length > 0) {
                    this.#teaserDecoration = CodeMirror.Decoration.none;
                }
            }
        }
        get decorations() {
            return this.#teaserDecoration;
        }
        #setupDecoration() {
            switch (this.#teaserMode) {
                case AiCodeCompletionTeaserMode.ON:
                    this.#updateTeaserDecorationForOnModeImmediately();
                    return;
                case AiCodeCompletionTeaserMode.ONLY_SHOW_ON_EMPTY:
                    this.#updateTeaserDecorationForOnlyShowOnEmptyMode();
                    return;
                case AiCodeCompletionTeaserMode.OFF:
                    this.#teaserDecoration = CodeMirror.Decoration.none;
                    return;
            }
        }
        #updateTeaserDecorationForOnlyShowOnEmptyMode() {
            if (this.view.state.doc.length === 0) {
                this.#addTeaserWidget(0);
            }
            else {
                this.#teaserDecoration = CodeMirror.Decoration.none;
            }
        }
        #updateTeaserDecorationForOnMode = Common.Debouncer.debounce(() => {
            this.#teaserDisplayTimeout = window.setTimeout(() => {
                this.#updateTeaserDecorationForOnModeImmediately();
                this.view.dispatch({});
            }, DELAY_BEFORE_SHOWING_RESPONSE_MS);
        }, AIDA_REQUEST_DEBOUNCE_TIMEOUT_MS);
        #updateTeaserDecorationForOnModeImmediately() {
            const cursorPosition = this.view.state.selection.main.head;
            const line = this.view.state.doc.lineAt(cursorPosition);
            if (cursorPosition >= line.to) {
                this.#addTeaserWidget(cursorPosition);
            }
        }
        #addTeaserWidget(pos) {
            this.#teaserDecoration = CodeMirror.Decoration.set([
                CodeMirror.Decoration.widget({ widget: new AccessiblePlaceholder(this.teaser), side: 1 }).range(pos),
            ]);
        }
    }, {
        decorations: v => v.decorations,
        eventHandlers: {
            mousedown(event) {
                // Required for mouse click to propagate to the "Don't show again" span in teaser.
                return (event.target instanceof Node && teaser.contentElement.contains(event.target));
            },
            keydown(event) {
                if (!UI.KeyboardShortcut.KeyboardShortcut.eventHasCtrlEquivalentKey(event) || !teaser.isShowing()) {
                    return false;
                }
                if (event.key === 'i') {
                    event.consume(true);
                    void VisualLogging.logKeyDown(event.currentTarget, event, 'ai-code-completion-teaser.fre');
                    void this.teaser.onAction(event);
                    return true;
                }
                if (event.key === 'x') {
                    event.consume(true);
                    void VisualLogging.logKeyDown(event.currentTarget, event, 'ai-code-completion-teaser.dismiss');
                    this.teaser.onDismiss(event);
                    return true;
                }
                return false;
            }
        },
    });
}
//# sourceMappingURL=AiCodeCompletionProvider.js.map