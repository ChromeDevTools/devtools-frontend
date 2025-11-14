// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as AiCodeCompletion from '../../models/ai_code_completion/ai_code_completion.js';
import * as TextEditor from '../../ui/components/text_editor/text_editor.js';
import * as SourceFrame from '../../ui/legacy/components/source_frame/source_frame.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as PanelCommon from '../common/common.js';
import { Plugin } from './Plugin.js';
const DISCLAIMER_TOOLTIP_ID = 'sources-ai-code-completion-disclaimer-tooltip';
const SPINNER_TOOLTIP_ID = 'sources-ai-code-completion-spinner-tooltip';
const CITATIONS_TOOLTIP_ID = 'sources-ai-code-completion-citations-tooltip';
export class AiCodeCompletionPlugin extends Plugin {
    #editor;
    #aiCodeCompletionDisclaimer;
    #aiCodeCompletionDisclaimerContainer = document.createElement('div');
    #aiCodeCompletionDisclaimerToolbarItem = new UI.Toolbar.ToolbarItem(this.#aiCodeCompletionDisclaimerContainer);
    #aiCodeCompletionCitations = [];
    #aiCodeCompletionCitationsToolbar;
    #aiCodeCompletionCitationsToolbarContainer = document.createElement('div');
    #aiCodeCompletionCitationsToolbarAttached = false;
    aiCodeCompletionConfig;
    #aiCodeCompletionProvider;
    constructor(uiSourceCode) {
        super(uiSourceCode);
        const devtoolsLocale = i18n.DevToolsLocale.DevToolsLocale.instance();
        if (!AiCodeCompletion.AiCodeCompletion.AiCodeCompletion.isAiCodeCompletionEnabled(devtoolsLocale.locale)) {
            throw new Error('AI code completion feature is not enabled.');
        }
        this.aiCodeCompletionConfig = {
            completionContext: {
                additionalFiles: this.uiSourceCode.url().startsWith('snippet://') ? [{
                        path: 'devtools-console-context.js',
                        content: AiCodeCompletion.AiCodeCompletion.consoleAdditionalContextFileContent,
                        included_reason: Host.AidaClient.Reason.RELATED_FILE,
                    }] :
                    undefined,
                inferenceLanguage: this.#getInferenceLanguage()
            },
            onFeatureEnabled: () => {
                this.#setupAiCodeCompletion();
            },
            onFeatureDisabled: () => {
                this.#cleanupAiCodeCompletion();
            },
            onSuggestionAccepted: this.#onAiCodeCompletionSuggestionAccepted.bind(this),
            onRequestTriggered: this.#onAiRequestTriggered.bind(this),
            onResponseReceived: this.#onAiResponseReceived.bind(this),
            panel: "sources" /* AiCodeCompletion.AiCodeCompletion.ContextFlavor.SOURCES */,
        };
        this.#aiCodeCompletionProvider =
            TextEditor.AiCodeCompletionProvider.AiCodeCompletionProvider.createInstance(this.aiCodeCompletionConfig);
        this.#aiCodeCompletionDisclaimerContainer.classList.add('ai-code-completion-disclaimer-container');
        this.#aiCodeCompletionDisclaimerContainer.style.paddingInline = 'var(--sys-size-3)';
    }
    static accepts(uiSourceCode) {
        return uiSourceCode.contentType().hasScripts() || uiSourceCode.contentType().hasStyleSheets();
    }
    dispose() {
        this.#aiCodeCompletionProvider.dispose();
        super.dispose();
    }
    editorInitialized(editor) {
        this.#editor = editor;
        this.#aiCodeCompletionProvider.editorInitialized(editor);
        this.#editor.editor.dispatch({
            effects: TextEditor.AiCodeCompletionProvider.setAiCodeCompletionTeaserMode.of(TextEditor.AiCodeCompletionProvider.AiCodeCompletionTeaserMode.ON)
        });
    }
    editorExtension() {
        return this.#aiCodeCompletionProvider.extension();
    }
    rightToolbarItems() {
        return [this.#aiCodeCompletionDisclaimerToolbarItem];
    }
    #setupAiCodeCompletion() {
        this.#createAiCodeCompletionDisclaimer();
        this.#createAiCodeCompletionCitationsToolbar();
    }
    #createAiCodeCompletionDisclaimer() {
        if (this.#aiCodeCompletionDisclaimer) {
            return;
        }
        this.#aiCodeCompletionDisclaimer = new PanelCommon.AiCodeCompletionDisclaimer();
        this.#aiCodeCompletionDisclaimer.disclaimerTooltipId = DISCLAIMER_TOOLTIP_ID;
        this.#aiCodeCompletionDisclaimer.spinnerTooltipId = SPINNER_TOOLTIP_ID;
        this.#aiCodeCompletionDisclaimer.show(this.#aiCodeCompletionDisclaimerContainer, undefined, true);
    }
    #createAiCodeCompletionCitationsToolbar() {
        if (this.#aiCodeCompletionCitationsToolbar) {
            return;
        }
        this.#aiCodeCompletionCitationsToolbar =
            new PanelCommon.AiCodeCompletionSummaryToolbar({ citationsTooltipId: CITATIONS_TOOLTIP_ID, hasTopBorder: true });
        this.#aiCodeCompletionCitationsToolbar.show(this.#aiCodeCompletionCitationsToolbarContainer, undefined, true);
    }
    #attachAiCodeCompletionCitationsToolbar() {
        if (this.#editor) {
            this.#editor.dispatch({
                effects: SourceFrame.SourceFrame.addSourceFrameInfobar.of({ element: this.#aiCodeCompletionCitationsToolbarContainer, order: 100 })
            });
            this.#aiCodeCompletionCitationsToolbarAttached = true;
        }
    }
    #removeAiCodeCompletionCitationsToolbar() {
        this.#aiCodeCompletionCitationsToolbar?.detach();
        if (this.#editor) {
            this.#editor.dispatch({
                effects: SourceFrame.SourceFrame.removeSourceFrameInfobar.of({ element: this.#aiCodeCompletionCitationsToolbarContainer })
            });
            this.#aiCodeCompletionCitationsToolbarAttached = false;
        }
    }
    #cleanupAiCodeCompletion() {
        this.#aiCodeCompletionDisclaimerContainer.removeChildren();
        this.#aiCodeCompletionDisclaimer = undefined;
        this.#removeAiCodeCompletionCitationsToolbar();
    }
    #onAiRequestTriggered = () => {
        if (this.#aiCodeCompletionDisclaimer) {
            this.#aiCodeCompletionDisclaimer.loading = true;
        }
    };
    #onAiResponseReceived = (citations) => {
        this.#aiCodeCompletionCitations = citations;
        if (this.#aiCodeCompletionDisclaimer) {
            this.#aiCodeCompletionDisclaimer.loading = false;
        }
    };
    #onAiCodeCompletionSuggestionAccepted() {
        if (!this.#aiCodeCompletionCitationsToolbar || this.#aiCodeCompletionCitations.length === 0) {
            return;
        }
        const citations = this.#aiCodeCompletionCitations.map(citation => citation.uri).filter((uri) => Boolean(uri));
        this.#aiCodeCompletionCitationsToolbar.updateCitations(citations);
        if (!this.#aiCodeCompletionCitationsToolbarAttached && citations.length > 0) {
            this.#attachAiCodeCompletionCitationsToolbar();
        }
    }
    #getInferenceLanguage() {
        const mimeType = this.uiSourceCode.mimeType();
        switch (mimeType) {
            case 'application/javascript':
            case 'application/ecmascript':
            case 'application/x-ecmascript':
            case 'application/x-javascript':
            case 'text/ecmascript':
            case 'text/javascript1.0':
            case 'text/javascript1.1':
            case 'text/javascript1.2':
            case 'text/javascript1.3':
            case 'text/javascript1.4':
            case 'text/javascript1.5':
            case 'text/jscript':
            case 'text/livescript ':
            case 'text/x-ecmascript':
            case 'text/x-javascript':
            case 'text/javascript':
            case 'text/jsx':
                return "JAVASCRIPT" /* Host.AidaClient.AidaInferenceLanguage.JAVASCRIPT */;
            case 'text/typescript':
            case 'text/typescript-jsx':
            case 'application/typescript':
                return "TYPESCRIPT" /* Host.AidaClient.AidaInferenceLanguage.TYPESCRIPT */;
            case 'text/css':
                return "CSS" /* Host.AidaClient.AidaInferenceLanguage.CSS */;
            case 'text/html':
                return "HTML" /* Host.AidaClient.AidaInferenceLanguage.HTML */;
            case 'text/x-python':
            case 'application/python':
                return "PYTHON" /* Host.AidaClient.AidaInferenceLanguage.PYTHON */;
            case 'text/x-java':
            case 'text/x-java-source':
                return "JAVA" /* Host.AidaClient.AidaInferenceLanguage.JAVA */;
            case 'text/x-c++src':
            case 'text/x-csrc':
            case 'text/x-c':
                return "CPP" /* Host.AidaClient.AidaInferenceLanguage.CPP */;
            case 'application/json':
            case 'application/manifest+json':
                return "JSON" /* Host.AidaClient.AidaInferenceLanguage.JSON */;
            case 'text/markdown':
                return "MARKDOWN" /* Host.AidaClient.AidaInferenceLanguage.MARKDOWN */;
            case 'application/xml':
            case 'application/xhtml+xml':
            case 'text/xml':
                return "XML" /* Host.AidaClient.AidaInferenceLanguage.XML */;
            case 'text/x-go':
                return "GO" /* Host.AidaClient.AidaInferenceLanguage.GO */;
            case 'application/x-sh':
            case 'text/x-sh':
                return "BASH" /* Host.AidaClient.AidaInferenceLanguage.BASH */;
            case 'text/x-kotlin':
                return "KOTLIN" /* Host.AidaClient.AidaInferenceLanguage.KOTLIN */;
            case 'text/x-vue':
            case 'text/x.vue':
                return "VUE" /* Host.AidaClient.AidaInferenceLanguage.VUE */;
            case 'application/vnd.dart':
                return "DART" /* Host.AidaClient.AidaInferenceLanguage.DART */;
            default:
                return undefined;
        }
    }
}
//# sourceMappingURL=AiCodeCompletionPlugin.js.map