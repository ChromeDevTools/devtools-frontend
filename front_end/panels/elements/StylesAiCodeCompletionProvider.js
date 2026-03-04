// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as AiCodeCompletion from '../../models/ai_code_completion/ai_code_completion.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as TextEditor from '../../ui/components/text_editor/text_editor.js';
export class StylesAiCodeCompletionProvider {
    #aidaClient = new Host.AidaClient.AidaClient();
    #aiCodeCompletionSetting = Common.Settings.Settings.instance().createSetting('ai-code-completion-enabled', false);
    #aiCodeCompletion;
    #aiCodeCompletionConfig;
    #boundOnUpdateAiCodeCompletionState = this.#updateAiCodeCompletionState.bind(this);
    #debouncedRequestAidaSuggestion = Common.Debouncer.debounce((prefix, suffix, cursorPositionAtRequest) => {
        void this.#requestAidaSuggestion(prefix, suffix, cursorPositionAtRequest);
    }, TextEditor.AiCodeCompletionProvider.AIDA_REQUEST_DEBOUNCE_TIMEOUT_MS);
    constructor(aiCodeCompletionConfig) {
        const devtoolsLocale = i18n.DevToolsLocale.DevToolsLocale.instance();
        if (!AiCodeCompletion.AiCodeCompletion.AiCodeCompletion.isAiCodeCompletionStylesEnabled(devtoolsLocale.locale)) {
            throw new Error('AI code completion feature in Styles is not enabled.');
        }
        this.#aiCodeCompletionConfig = aiCodeCompletionConfig;
        Host.AidaClient.HostConfigTracker.instance().addEventListener("aidaAvailabilityChanged" /* Host.AidaClient.Events.AIDA_AVAILABILITY_CHANGED */, this.#boundOnUpdateAiCodeCompletionState);
        this.#aiCodeCompletionSetting.addChangeListener(this.#boundOnUpdateAiCodeCompletionState);
        void this.#updateAiCodeCompletionState();
    }
    static createInstance(aiCodeCompletionConfig) {
        return new StylesAiCodeCompletionProvider(aiCodeCompletionConfig);
    }
    #setupAiCodeCompletion() {
        if (!this.#aiCodeCompletionConfig) {
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
        this.#aiCodeCompletion = undefined;
        this.#aiCodeCompletionConfig?.onFeatureDisabled();
    }
    async #updateAiCodeCompletionState() {
        const aidaAvailability = await Host.AidaClient.AidaClient.checkAccessPreconditions();
        const isAvailable = aidaAvailability === "available" /* Host.AidaClient.AidaAccessPreconditions.AVAILABLE */;
        const isEnabled = this.#aiCodeCompletionSetting.get();
        if (isAvailable && isEnabled) {
            this.#setupAiCodeCompletion();
        }
        else {
            this.#cleanupAiCodeCompletion();
        }
    }
    async triggerAiCodeCompletion(text, cursorPosition, isEditingName, cssProperty, cssModel) {
        const styleSheetId = cssProperty.ownerStyle.styleSheetId;
        if (!styleSheetId) {
            return;
        }
        const header = cssModel.styleSheetHeaderForId(styleSheetId);
        if (!header) {
            return;
        }
        const contentData = await header.requestContentData();
        if (TextUtils.ContentData.ContentData.isError(contentData)) {
            AiCodeCompletion.debugLog('Error while fetching content from stylesheet', contentData.error);
            return;
        }
        const content = contentData.text;
        const propertyRange = cssProperty.range;
        if (!content || !propertyRange) {
            return;
        }
        const contentText = new TextUtils.Text.Text(content);
        const propertyStartOffset = contentText.offsetFromPosition(propertyRange.startLine, propertyRange.startColumn);
        const propertyEndOffset = contentText.offsetFromPosition(propertyRange.endLine, propertyRange.endColumn);
        let prefix = content.substring(0, propertyStartOffset);
        if (!isEditingName) {
            const nameRange = cssProperty.nameRange();
            if (nameRange) {
                const nameEndOffset = contentText.offsetFromPosition(nameRange.endLine, nameRange.endColumn);
                prefix = prefix + content.substring(propertyStartOffset, nameEndOffset) + ': ';
            }
        }
        prefix = prefix + text;
        const suffix = content.substring(propertyEndOffset);
        // TODO(b/476098133): Consider adjusting cursor position
        this.#debouncedRequestAidaSuggestion(prefix, suffix, cursorPosition);
    }
    async #requestAidaSuggestion(prefix, suffix, cursorPositionAtRequest) {
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
            const completionResponse = await this.#aiCodeCompletion.completeCode(prefix, suffix, cursorPositionAtRequest, "CSS" /* Host.AidaClient.AidaInferenceLanguage.CSS */);
            this.#aiCodeCompletionConfig?.onResponseReceived();
            if (!completionResponse) {
                return;
            }
            const { response, fromCache } = completionResponse;
            if (!response) {
                return;
            }
            const sampleResponse = await this.#generateSampleForRequest(response, prefix, suffix);
            if (!sampleResponse) {
                return;
            }
            if (fromCache) {
                Host.userMetrics.actionTaken(Host.UserMetrics.Action.AiCodeCompletionResponseServedFromCache);
            }
            this.#aiCodeCompletionConfig?.setAiAutoCompletion?.({
                text: sampleResponse.suggestionText,
                from: cursorPositionAtRequest,
                rpcGlobalId: sampleResponse.rpcGlobalId,
                sampleId: sampleResponse.sampleId,
                startTime,
                clearCachedRequest: this.clearCache.bind(this),
                onImpression: this.#aiCodeCompletion?.registerUserImpression.bind(this.#aiCodeCompletion),
            });
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
        const suggestionText = TextEditor.AiCodeCompletionProvider.AiCodeCompletionProvider.trimSuggestionOverlap(suggestionSample.generationString, suffix);
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
        const completionHint = this.#aiCodeCompletionConfig?.getCompletionHint?.();
        if (!completionHint) {
            return response.generatedSamples[0];
        }
        return response.generatedSamples.find(sample => sample.generationString.startsWith(completionHint)) ??
            response.generatedSamples[0];
    }
    clearCache() {
        this.#aiCodeCompletion?.clearCachedRequest();
    }
}
//# sourceMappingURL=StylesAiCodeCompletionProvider.js.map