// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../../core/common/common.js';
import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as Root from '../../../core/root/root.js';
import * as PanelCommon from '../../../panels/common/common.js';
import * as CodeMirror from '../../../third_party/codemirror.next/codemirror.next.js';
import * as UI from '../../legacy/legacy.js';
import * as VisualLogging from '../../visual_logging/visual_logging.js';
import { AiCodeCompletionTeaserPlaceholder } from './AiCodeCompletionTeaserPlaceholder.js';
import { aiAutoCompleteSuggestion, aiAutoCompleteSuggestionState, setAiAutoCompleteSuggestion, } from './config.js';
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
// TODO(samiyac): Add code relevant to AiCodeCompletion and for triggering requests
export class AiCodeCompletionProvider {
    #aidaClient;
    #aiCodeCompletionSetting = Common.Settings.Settings.instance().createSetting('ai-code-completion-enabled', false);
    #aiCodeCompletionTeaserDismissedSetting = Common.Settings.Settings.instance().createSetting('ai-code-completion-teaser-dismissed', false);
    #teaserCompartment = new CodeMirror.Compartment();
    #teaser;
    #suggestionRenderingTimeout;
    #editor;
    #aiCodeCompletionConfig;
    #boundOnUpdateAiCodeCompletionState = this.#updateAiCodeCompletionState.bind(this);
    constructor(aiCodeCompletionConfig) {
        if (!this.#isAiCodeCompletionEnabled()) {
            throw new Error('AI code completion feature is not enabled.');
        }
        this.#aiCodeCompletionConfig = aiCodeCompletionConfig;
    }
    extension() {
        return [
            this.#teaserCompartment.of([]),
            aiAutoCompleteSuggestion,
            aiCodeCompletionTeaserModeState,
            aiAutoCompleteSuggestionState,
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
    #setupAiCodeCompletion() {
        if (!this.#editor || !this.#aiCodeCompletionConfig) {
            return;
        }
        if (!this.#aidaClient) {
            this.#aidaClient = new Host.AidaClient.AidaClient();
        }
        this.#aiCodeCompletionConfig.onFeatureEnabled();
    }
    #cleanupAiCodeCompletion() {
        if (this.#suggestionRenderingTimeout) {
            clearTimeout(this.#suggestionRenderingTimeout);
            this.#suggestionRenderingTimeout = undefined;
        }
        this.#editor?.dispatch({
            effects: setAiAutoCompleteSuggestion.of(null),
        });
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
    #detachTeaser() {
        if (!this.#teaser) {
            return;
        }
        this.#editor?.editor.dispatch({ effects: this.#teaserCompartment.reconfigure([]) });
    }
    // TODO(samiyac): Define static method in AiCodeCompletion and use that instead
    #isAiCodeCompletionEnabled() {
        const devtoolsLocale = i18n.DevToolsLocale.DevToolsLocale.instance();
        const aidaAvailability = Root.Runtime.hostConfig.aidaAvailability;
        if (!devtoolsLocale.locale.startsWith('en-')) {
            return false;
        }
        if (!aidaAvailability || aidaAvailability.blockedByGeo || aidaAvailability.blockedByAge ||
            aidaAvailability.blockedByEnterprisePolicy) {
            return false;
        }
        return Boolean(aidaAvailability.enabled && Root.Runtime.hostConfig.devToolsAiCodeCompletion?.enabled);
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
                CodeMirror.Decoration.widget({ widget: new AiCodeCompletionTeaserPlaceholder(this.teaser), side: 1 }).range(pos),
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