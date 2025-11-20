// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-lit-render-outside-of-view */
import '../../../ui/components/spinners/spinners.js';
import * as Common from '../../../core/common/common.js';
import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as Root from '../../../core/root/root.js';
import * as Marked from '../../../third_party/marked/marked.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as Input from '../../../ui/components/input/input.js';
import * as MarkdownView from '../../../ui/components/markdown_view/markdown_view.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';
import * as Console from '../../console/console.js';
import styles from './consoleInsight.css.js';
// Note: privacy and legal notices are not localized so far.
const UIStrings = {
    /**
     * @description The title of the insight source "Console message".
     */
    consoleMessage: 'Console message',
    /**
     * @description The title of the insight source "Stacktrace".
     */
    stackTrace: 'Stacktrace',
    /**
     * @description The title of the insight source "Network request".
     */
    networkRequest: 'Network request',
    /**
     * @description The title of the insight source "Related code".
     */
    relatedCode: 'Related code',
    /**
     * @description The title that is shown while the insight is being generated.
     */
    generating: 'Generating explanation…',
    /**
     * @description The header that indicates that the content shown is a console
     * insight.
     */
    insight: 'Explanation',
    /**
     * @description The title of the a button that closes the insight pane.
     */
    closeInsight: 'Close explanation',
    /**
     * @description The title of the list of source data that was used to generate the insight.
     */
    inputData: 'Data used to understand this message',
    /**
     * @description The title of the button that allows submitting positive
     * feedback about the console insight.
     */
    goodResponse: 'Good response',
    /**
     * @description The title of the button that allows submitting negative
     * feedback about the console insight.
     */
    badResponse: 'Bad response',
    /**
     * @description The title of the button that opens a page to report a legal
     * issue with the console insight.
     */
    report: 'Report legal issue',
    /**
     * @description The text of the header inside the console insight pane when there was an error generating an insight.
     */
    error: 'DevTools has encountered an error',
    /**
     * @description The message shown when an error has been encountered.
     */
    errorBody: 'Something went wrong. Try again.',
    /**
     * @description Label for screen readers that is added to the end of the link
     * title to indicate that the link will be opened in a new tab.
     */
    opensInNewTab: '(opens in a new tab)',
    /**
     * @description The title of a link that allows the user to learn more about
     * the feature.
     */
    learnMore: 'Learn more',
    /**
     * @description The error message when the user is not logged in into Chrome.
     */
    notLoggedIn: 'This feature is only available when you sign into Chrome with your Google account.',
    /**
     * @description The title of a button which opens the Chrome SignIn page.
     */
    signIn: 'Sign in',
    /**
     * @description The header shown when the internet connection is not
     * available.
     */
    offlineHeader: 'DevTools can’t reach the internet',
    /**
     * @description Message shown when the user is offline.
     */
    offline: 'Check your internet connection and try again.',
    /**
     * @description The message shown if the user is not logged in.
     */
    signInToUse: 'Sign in to use this feature',
    /**
     * @description The title of the button that searches for the console
     * insight using a search engine instead of using console insights.
     */
    search: 'Use search instead',
    /**
     * @description Shown to the user when the network request data is not
     * available and a page reload might populate it.
     */
    reloadRecommendation: 'Reload the page to capture related network request data for this message in order to create a better insight.',
    /**
     * @description Shown to the user when they need to enable the console insights feature in settings in order to use it.
     * @example {Console insights in Settings} PH1
     */
    turnOnInSettings: 'Turn on {PH1} to receive AI assistance for understanding and addressing console warnings and errors.',
    /**
     * @description Text for a link to Chrome DevTools Settings.
     */
    settingsLink: '`Console insights` in Settings',
    /**
     * @description The title of the list of references/recitations that were used to generate the insight.
     */
    references: 'Sources and related content',
    /**
     * @description Sub-heading for a list of links to URLs which are related to the AI-generated response.
     */
    relatedContent: 'Related content',
    /**
     * @description Error message shown when the request to get an AI response times out.
     */
    timedOut: 'Generating a response took too long. Please try again.',
    /**
     * @description Text informing the user that AI assistance is not available in Incognito mode or Guest mode.
     */
    notAvailableInIncognitoMode: 'AI assistance is not available in Incognito mode or Guest mode',
};
const str_ = i18n.i18n.registerUIStrings('panels/explain/components/ConsoleInsight.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const i18nTemplate = Lit.i18nTemplate.bind(undefined, str_);
const { render, html, Directives } = Lit;
export class CloseEvent extends Event {
    static eventName = 'close';
    constructor() {
        super(CloseEvent.eventName, { composed: true, bubbles: true });
    }
}
function localizeType(sourceType) {
    switch (sourceType) {
        case Console.PromptBuilder.SourceType.MESSAGE:
            return i18nString(UIStrings.consoleMessage);
        case Console.PromptBuilder.SourceType.STACKTRACE:
            return i18nString(UIStrings.stackTrace);
        case Console.PromptBuilder.SourceType.NETWORK_REQUEST:
            return i18nString(UIStrings.networkRequest);
        case Console.PromptBuilder.SourceType.RELATED_CODE:
            return i18nString(UIStrings.relatedCode);
    }
}
const TERMS_OF_SERVICE_URL = 'https://policies.google.com/terms';
const PRIVACY_POLICY_URL = 'https://policies.google.com/privacy';
const CODE_SNIPPET_WARNING_URL = 'https://support.google.com/legal/answer/13505487';
const LEARN_MORE_URL = 'https://goo.gle/devtools-console-messages-ai';
const REPORT_URL = 'https://support.google.com/legal/troubleshooter/1114905?hl=en#ts=1115658%2C13380504';
const SIGN_IN_URL = 'https://accounts.google.com';
const markedExtension = {
    name: 'citation',
    level: 'inline',
    start(src) {
        return src.match(/\[\^/)?.index;
    },
    tokenizer(src) {
        const match = src.match(/^\[\^(\d+)\]/);
        if (match) {
            return {
                type: 'citation',
                raw: match[0],
                linkText: Number(match[1]),
            };
        }
        return false;
    },
    renderer: () => '',
};
function isSearchRagResponse(metadata) {
    return Boolean(metadata.factualityMetadata?.facts.length);
}
function renderSearchButton(onSearch) {
    // clang-format off
    return html `<devtools-button
    @click=${onSearch}
    class="search-button"
    .variant=${"outlined" /* Buttons.Button.Variant.OUTLINED */}
    .jslogContext=${'search'}
  >
    ${i18nString(UIStrings.search)}
  </devtools-button>`;
    // clang-format on
}
function renderLearnMoreAboutInsights() {
    // clang-format off
    return html `<x-link href=${LEARN_MORE_URL} class="link" jslog=${VisualLogging.link('learn-more').track({ click: true })}>
    ${i18nString(UIStrings.learnMore)}
  </x-link>`;
    // clang-format on
}
function maybeRenderSources(directCitationUrls, output) {
    if (!directCitationUrls.length) {
        return Lit.nothing;
    }
    // clang-format off
    return html `
    <ol class="sources-list">
      ${directCitationUrls.map((url, index) => html `
        <li>
          <x-link
            href=${url}
            class="link"
            jslog=${VisualLogging.link('references.console-insights').track({ click: true })}
            ${Directives.ref(e => { output.citationLinks[index] = e; })}
          >
            ${url}
          </x-link>
        </li>
      `)}
    </ol>
  `;
    // clang-format on
}
function maybeRenderRelatedContent(relatedUrls, directCitationUrls) {
    if (relatedUrls.length === 0) {
        return Lit.nothing;
    }
    // clang-format off
    return html `
    ${directCitationUrls.length ? html `<h3>${i18nString(UIStrings.relatedContent)}</h3>` : Lit.nothing}
    <ul class="references-list">
      ${relatedUrls.map(relatedUrl => html `
        <li>
          <x-link
            href=${relatedUrl}
            class="link"
            jslog=${VisualLogging.link('references.console-insights').track({ click: true })}
          >
            ${relatedUrl}
          </x-link>
        </li>
      `)}
    </ul>
  `;
    // clang-format on
}
function renderLoading() {
    // clang-format off
    return html `
    <div role="presentation" aria-label="Loading" class="loader" style="clip-path: url('#clipPath');">
      <svg width="100%" height="64">
        <clipPath id="clipPath">
          <rect x="0" y="0" width="100%" height="16" rx="8"></rect>
          <rect x="0" y="24" width="100%" height="16" rx="8"></rect>
          <rect x="0" y="48" width="100%" height="16" rx="8"></rect>
        </clipPath>
      </svg>
    </div>`;
    // clang-format on
}
function renderInsightSourcesList(sources, isPageReloadRecommended) {
    // clang-format off
    return html `
    <div class="insight-sources">style>
      <ul>
        ${Directives.repeat(sources, item => item.value, item => {
        return html `<li><x-link class="link" title="${localizeType(item.type)} ${i18nString(UIStrings.opensInNewTab)}" href="data:text/plain;charset=utf-8,${encodeURIComponent(item.value)}" jslog=${VisualLogging.link('source-' + item.type).track({ click: true })}>
            <devtools-icon name="open-externally"></devtools-icon>
            ${localizeType(item.type)}
          </x-link></li>`;
    })}
        ${isPageReloadRecommended ? html `<li class="source-disclaimer">
          <devtools-icon name="warning"></devtools-icon>
          ${i18nString(UIStrings.reloadRecommendation)}</li>` : Lit.nothing}
      </ul>
    </div>`;
    // clang-format on
}
function renderInsight(insight, renderer, disableAnimations, callbacks, output) {
    // clang-format off
    return html `
        ${insight.validMarkdown ? html `<devtools-markdown-view
            .data=${{ tokens: insight.tokens, renderer, animationEnabled: !disableAnimations }}>
          </devtools-markdown-view>` : insight.explanation}
        ${insight.timedOut ? html `<p class="error-message">${i18nString(UIStrings.timedOut)}</p>` : Lit.nothing}
        ${isSearchRagResponse(insight.metadata) ? html `
          <details class="references" ${Directives.ref(output.referenceDetailsRef)} @toggle=${callbacks.onToggleReferenceDetails} jslog=${VisualLogging.expand('references').track({ click: true })}>
            <summary>${i18nString(UIStrings.references)}</summary>
            ${maybeRenderSources(insight.directCitationUrls, output)}
            ${maybeRenderRelatedContent(insight.relatedUrls, insight.directCitationUrls)}
          </details>
        ` : Lit.nothing}
        <details jslog=${VisualLogging.expand('sources').track({ click: true })}>
          <summary>${i18nString(UIStrings.inputData)}</summary>
          ${renderInsightSourcesList(insight.sources, insight.isPageReloadRecommended)}
        </details>
        <div class="buttons">
          ${renderSearchButton(callbacks.onSearch)}
        </div>`;
    // clang-format on
}
function renderError(message) {
    // clang-format off
    return html `<div class="error">${message}</div>`;
    // clang-format on
}
function renderConsentReminder(noLogging) {
    // clang-format off
    return html `
    <h3>Things to consider</h3>
    <div class="reminder-items">
      <div>
        <devtools-icon name="google" class="medium">
        </devtools-icon>
      </div>
      <div>The console message, associated stack trace, related source code, and the associated network headers are sent to Google to generate explanations. ${noLogging
        ? 'The content you submit and that is generated by this feature will not be used to improve Google’s AI models.'
        : 'This data may be seen by human reviewers to improve this feature. Avoid sharing sensitive or personal information.'}
      </div>
      <div>
        <devtools-icon name="policy" class="medium">
        </devtools-icon>
      </div>
      <div>Use of this feature is subject to the <x-link
          href=${TERMS_OF_SERVICE_URL}
          class="link"
          jslog=${VisualLogging.link('terms-of-service.console-insights').track({ click: true })}>
        Google Terms of Service
        </x-link> and <x-link
          href=${PRIVACY_POLICY_URL}
          class="link"
          jslog=${VisualLogging.link('privacy-policy.console-insights').track({ click: true })}>
        Google Privacy Policy
        </x-link>
      </div>
      <div>
        <devtools-icon name="warning" class="medium">
        </devtools-icon>
      </div>
      <div>
        <x-link
          href=${CODE_SNIPPET_WARNING_URL}
          class="link"
          jslog=${VisualLogging.link('code-snippets-explainer.console-insights').track({ click: true })}
        >Use generated code snippets with caution</x-link>
      </div>
    </div>`;
    // clang-format on
}
function renderSettingIsNotTrue(onEnableInsightsInSettingsLink) {
    // clang-format off
    const settingsLink = html `
    <button
      class="link" role="link"
      jslog=${VisualLogging.action('open-ai-settings').track({ click: true })}
      @click=${onEnableInsightsInSettingsLink}
    >${i18nString(UIStrings.settingsLink)}</button>`;
    return html `
    <div class="badge">
      <devtools-icon name="lightbulb-spark" class="medium">
      </devtools-icon>
    </div>
    <div>
      ${i18nTemplate(UIStrings.turnOnInSettings, { PH1: settingsLink })} ${renderLearnMoreAboutInsights()}
    </div>`;
    // clang-format on
}
function renderNotLoggedIn() {
    return renderError(Root.Runtime.hostConfig.isOffTheRecord ? i18nString(UIStrings.notAvailableInIncognitoMode) :
        i18nString(UIStrings.notLoggedIn));
}
function renderDisclaimer(noLogging, onDisclaimerSettingsLink) {
    // clang-format off
    return html `<span>
    AI tools may generate inaccurate info that doesn't represent Google's views. ${noLogging
        ? 'The content you submit and that is generated by this feature will not be used to improve Google’s AI models.'
        : 'Data sent to Google may be seen by human reviewers to improve this feature.'} <button class="link" role="link" @click=${onDisclaimerSettingsLink}
              jslog=${VisualLogging.action('open-ai-settings').track({ click: true })}>
      Open settings
    </button> or <x-link href=${LEARN_MORE_URL}
        class="link" jslog=${VisualLogging.link('learn-more').track({ click: true })}>
      learn more
    </x-link>
  </span>`;
    // clang-format on
}
function renderDisclaimerFooter(noLogging, onDisclaimerSettingsLink) {
    // clang-format off
    return html `
    <div class="disclaimer">
      ${renderDisclaimer(noLogging, onDisclaimerSettingsLink)}
    </div>`;
    // clang-format on
}
function renderSignInFooter(onGoToSignIn) {
    if (Root.Runtime.hostConfig.isOffTheRecord) {
        return Lit.nothing;
    }
    // clang-format off
    return html `
    <div class="filler"></div>
    <div>
      <devtools-button
        @click=${onGoToSignIn}
        .variant=${"primary" /* Buttons.Button.Variant.PRIMARY */}
        .jslogContext=${'update-settings'}
      >
        ${UIStrings.signIn}
      </devtools-button>
    </div>`;
}
function renderConsentReminderFooter(onReminderSettingsLink, onConsentReminderConfirmed) {
    // clang-format off
    return html `
    <div class="filler"></div>
    <div class="buttons">
      <devtools-button
        @click=${onReminderSettingsLink}
          .variant=${"tonal" /* Buttons.Button.Variant.TONAL */}
          jslogContext=${'settings'}
          title=${'Settings'}
      >
        Settings
      </devtools-button>
      <devtools-button
        class='continue-button'
        @click=${onConsentReminderConfirmed}
        .variant=${"primary" /* Buttons.Button.Variant.PRIMARY */}
        .jslogContext=${'continue'}
        .title=${'continue'}
      >
        Continue
      </devtools-button>
    </div>`;
}
function renderInsightFooter(noLogging, selectedRating, callbacks) {
    // clang-format off
    return html `
  <div class="disclaimer">
    ${renderDisclaimer(noLogging, callbacks.onDisclaimerSettingsLink)}
  </div>
  <div class="filler"></div>
  <div class="rating">
    <devtools-button
      data-rating="true"
      .iconName=${'thumb-up'}
      .toggledIconName=${'thumb-up'}
      .variant=${"icon_toggle" /* Buttons.Button.Variant.ICON_TOGGLE */}
      .size=${"SMALL" /* Buttons.Button.Size.SMALL */}
      .toggleOnClick=${false}
      .toggleType=${"primary-toggle" /* Buttons.Button.ToggleType.PRIMARY */}
      .disabled=${selectedRating !== undefined}
      .toggled=${selectedRating === true}
      .title=${i18nString(UIStrings.goodResponse)}
      .jslogContext=${'thumbs-up'}
      @click=${() => callbacks.onRating(true)}
    ></devtools-button>
    <devtools-button
      data-rating="false"
      .iconName=${'thumb-down'}
      .toggledIconName=${'thumb-down'}
      .variant=${"icon_toggle" /* Buttons.Button.Variant.ICON_TOGGLE */}
      .size=${"SMALL" /* Buttons.Button.Size.SMALL */}
      .toggleOnClick=${false}
      .toggleType=${"primary-toggle" /* Buttons.Button.ToggleType.PRIMARY */}
      .disabled=${selectedRating !== undefined}
      .toggled=${selectedRating === false}
      .title=${i18nString(UIStrings.badResponse)}
      .jslogContext=${'thumbs-down'}
      @click=${() => callbacks.onRating(false)}
    ></devtools-button>
    <devtools-button
      .iconName=${'report'}
      .variant=${"icon" /* Buttons.Button.Variant.ICON */}
      .size=${"SMALL" /* Buttons.Button.Size.SMALL */}
      .title=${i18nString(UIStrings.report)}
      .jslogContext=${'report'}
      @click=${callbacks.onReport}
    ></devtools-button>
  </div>`;
    // clang-format on
}
function renderHeaderIcon() {
    // clang-format off
    return html `
    <div class="header-icon-container">
      <devtools-icon name="lightbulb-spark" class="large">
      </devtools-icon>
    </div>`;
    // clang-format on
}
function renderHeader({ headerText, showIcon = false, showSpinner = false, onClose }, headerRef) {
    // clang-format off
    return html `
    <header>
      ${showIcon ? renderHeaderIcon() : Lit.nothing}
      <div class="filler">
        <h2 tabindex="-1" ${Directives.ref(headerRef)}>
          ${headerText}
        </h2>
        ${showSpinner ? html `<devtools-spinner></devtools-spinner>` : Lit.nothing}
      </div>
      <div class="close-button">
        <devtools-button
          .iconName=${'cross'}
          .variant=${"icon" /* Buttons.Button.Variant.ICON */}
          .size=${"SMALL" /* Buttons.Button.Size.SMALL */}
          .title=${i18nString(UIStrings.closeInsight)}
          jslog=${VisualLogging.close().track({ click: true })}
          @click=${onClose}
        ></devtools-button>
      </div>
    </header>
  `;
    // clang-format on
}
export class ConsoleInsight extends HTMLElement {
    static async create(promptBuilder, aidaClient) {
        const aidaPreconditions = await Host.AidaClient.AidaClient.checkAccessPreconditions();
        return new ConsoleInsight(promptBuilder, aidaClient, aidaPreconditions);
    }
    #shadow = this.attachShadow({ mode: 'open' });
    disableAnimations = false;
    #promptBuilder;
    #aidaClient;
    #renderer;
    // Main state.
    #state;
    #referenceDetailsRef = Directives.createRef();
    #headerRef = Directives.createRef();
    #citationLinks = [];
    #areReferenceDetailsOpen = false;
    #stateChanging = false;
    #closing = false;
    // Rating sub-form state.
    #selectedRating;
    #consoleInsightsEnabledSetting;
    #aidaPreconditions;
    #boundOnAidaAvailabilityChange;
    #marked;
    constructor(promptBuilder, aidaClient, aidaPreconditions) {
        super();
        this.#promptBuilder = promptBuilder;
        this.#aidaClient = aidaClient;
        this.#aidaPreconditions = aidaPreconditions;
        this.#consoleInsightsEnabledSetting = this.#getConsoleInsightsEnabledSetting();
        this.#renderer = new MarkdownView.MarkdownView.MarkdownInsightRenderer(this.#citationClickHandler.bind(this));
        this.#marked = new Marked.Marked.Marked({ extensions: [markedExtension] });
        this.#state = this.#getStateFromAidaAvailability();
        this.#boundOnAidaAvailabilityChange = this.#onAidaAvailabilityChange.bind(this);
        this.#render();
        // Stop keyboard event propagation to avoid Console acting on the events
        // inside the insight component.
        this.addEventListener('keydown', e => {
            e.stopPropagation();
        });
        this.addEventListener('keyup', e => {
            e.stopPropagation();
        });
        this.addEventListener('keypress', e => {
            e.stopPropagation();
        });
        this.addEventListener('click', e => {
            e.stopPropagation();
        });
        this.focus();
    }
    #citationClickHandler(index) {
        if (this.#state.type !== "insight" /* State.INSIGHT */ || !this.#referenceDetailsRef.value) {
            return;
        }
        const areDetailsAlreadyExpanded = this.#referenceDetailsRef.value.open;
        this.#areReferenceDetailsOpen = true;
        this.#render();
        const highlightedElement = this.#citationLinks[index - 1];
        if (highlightedElement) {
            UI.UIUtils.runCSSAnimationOnce(highlightedElement, 'highlighted');
            if (areDetailsAlreadyExpanded) {
                highlightedElement.scrollIntoView({ behavior: 'auto' });
                highlightedElement.focus();
            }
            else { // Wait for the details element to open before scrolling.
                this.#referenceDetailsRef.value.addEventListener('transitionend', () => {
                    highlightedElement.scrollIntoView({ behavior: 'auto' });
                    highlightedElement.focus();
                }, { once: true });
            }
        }
    }
    #getStateFromAidaAvailability() {
        switch (this.#aidaPreconditions) {
            case "available" /* Host.AidaClient.AidaAccessPreconditions.AVAILABLE */: {
                // Allows skipping the consent reminder if the user enabled the feature via settings in the current session
                const skipReminder = Common.Settings.Settings.instance()
                    .createSetting('console-insights-skip-reminder', false, "Session" /* Common.Settings.SettingStorageType.SESSION */)
                    .get();
                return {
                    type: "loading" /* State.LOADING */,
                    consentOnboardingCompleted: this.#getOnboardingCompletedSetting().get() || skipReminder,
                };
            }
            case "no-account-email" /* Host.AidaClient.AidaAccessPreconditions.NO_ACCOUNT_EMAIL */:
                return {
                    type: "not-logged-in" /* State.NOT_LOGGED_IN */,
                };
            case "sync-is-paused" /* Host.AidaClient.AidaAccessPreconditions.SYNC_IS_PAUSED */:
                return {
                    type: "sync-is-paused" /* State.SYNC_IS_PAUSED */,
                };
            case "no-internet" /* Host.AidaClient.AidaAccessPreconditions.NO_INTERNET */:
                return {
                    type: "offline" /* State.OFFLINE */,
                };
        }
    }
    // off -> entrypoints are shown, and point to the AI setting panel where the setting can be turned on
    // on -> entrypoints are shown, and console insights can be generated
    #getConsoleInsightsEnabledSetting() {
        try {
            return Common.Settings.moduleSetting('console-insights-enabled');
        }
        catch {
            return;
        }
    }
    // off -> consent reminder is shown, unless the 'console-insights-enabled'-setting has been enabled in the current DevTools session
    // on -> no consent reminder shown
    #getOnboardingCompletedSetting() {
        return Common.Settings.Settings.instance().createLocalSetting('console-insights-onboarding-finished', false);
    }
    connectedCallback() {
        this.#consoleInsightsEnabledSetting?.addChangeListener(this.#onConsoleInsightsSettingChanged, this);
        const blockedByAge = Root.Runtime.hostConfig.aidaAvailability?.blockedByAge === true;
        if (this.#state.type === "loading" /* State.LOADING */ && this.#consoleInsightsEnabledSetting?.getIfNotDisabled() === true &&
            !blockedByAge && this.#state.consentOnboardingCompleted) {
            Host.userMetrics.actionTaken(Host.UserMetrics.Action.GeneratingInsightWithoutDisclaimer);
        }
        Host.AidaClient.HostConfigTracker.instance().addEventListener("aidaAvailabilityChanged" /* Host.AidaClient.Events.AIDA_AVAILABILITY_CHANGED */, this.#boundOnAidaAvailabilityChange);
        // If AIDA availability has changed while the component was disconnected, we need to update.
        void this.#onAidaAvailabilityChange();
        // The setting might have been turned on/off while the component was disconnected.
        // Update the state, unless the current state is already terminal (`INSIGHT` or `ERROR`).
        if (this.#state.type !== "insight" /* State.INSIGHT */ && this.#state.type !== "error" /* State.ERROR */) {
            this.#state = this.#getStateFromAidaAvailability();
        }
        void this.#generateInsightIfNeeded();
    }
    disconnectedCallback() {
        this.#consoleInsightsEnabledSetting?.removeChangeListener(this.#onConsoleInsightsSettingChanged, this);
        Host.AidaClient.HostConfigTracker.instance().removeEventListener("aidaAvailabilityChanged" /* Host.AidaClient.Events.AIDA_AVAILABILITY_CHANGED */, this.#boundOnAidaAvailabilityChange);
    }
    async #onAidaAvailabilityChange() {
        const currentAidaAvailability = await Host.AidaClient.AidaClient.checkAccessPreconditions();
        if (currentAidaAvailability !== this.#aidaPreconditions) {
            this.#aidaPreconditions = currentAidaAvailability;
            this.#state = this.#getStateFromAidaAvailability();
            void this.#generateInsightIfNeeded();
        }
    }
    #onConsoleInsightsSettingChanged() {
        if (this.#consoleInsightsEnabledSetting?.getIfNotDisabled() === true) {
            this.#getOnboardingCompletedSetting().set(true);
        }
        if (this.#state.type === "setting-is-not-true" /* State.SETTING_IS_NOT_TRUE */ &&
            this.#consoleInsightsEnabledSetting?.getIfNotDisabled() === true) {
            this.#transitionTo({
                type: "loading" /* State.LOADING */,
                consentOnboardingCompleted: true,
            });
            Host.userMetrics.actionTaken(Host.UserMetrics.Action.InsightsOptInTeaserConfirmedInSettings);
            void this.#generateInsightIfNeeded();
        }
        if (this.#state.type === "consent-reminder" /* State.CONSENT_REMINDER */ &&
            this.#consoleInsightsEnabledSetting?.getIfNotDisabled() === false) {
            this.#transitionTo({
                type: "loading" /* State.LOADING */,
                consentOnboardingCompleted: false,
            });
            Host.userMetrics.actionTaken(Host.UserMetrics.Action.InsightsReminderTeaserAbortedInSettings);
            void this.#generateInsightIfNeeded();
        }
    }
    #transitionTo(newState) {
        this.#stateChanging = this.#state.type !== newState.type;
        this.#state = newState;
        this.#render();
    }
    async #generateInsightIfNeeded() {
        if (this.#state.type !== "loading" /* State.LOADING */) {
            return;
        }
        const blockedByAge = Root.Runtime.hostConfig.aidaAvailability?.blockedByAge === true;
        if (this.#consoleInsightsEnabledSetting?.getIfNotDisabled() !== true || blockedByAge) {
            this.#transitionTo({
                type: "setting-is-not-true" /* State.SETTING_IS_NOT_TRUE */,
            });
            Host.userMetrics.actionTaken(Host.UserMetrics.Action.InsightsOptInTeaserShown);
            return;
        }
        if (!this.#state.consentOnboardingCompleted) {
            const { sources, isPageReloadRecommended } = await this.#promptBuilder.buildPrompt();
            this.#transitionTo({
                type: "consent-reminder" /* State.CONSENT_REMINDER */,
                sources,
                isPageReloadRecommended,
            });
            Host.userMetrics.actionTaken(Host.UserMetrics.Action.InsightsReminderTeaserShown);
            return;
        }
        await this.#generateInsight();
    }
    #onClose() {
        if (this.#state.type === "consent-reminder" /* State.CONSENT_REMINDER */) {
            Host.userMetrics.actionTaken(Host.UserMetrics.Action.InsightsReminderTeaserCanceled);
        }
        this.#closing = true;
        this.#render();
    }
    #onAnimationEnd() {
        if (this.#closing) {
            this.dispatchEvent(new CloseEvent());
            return;
        }
        if (this.#stateChanging) {
            this.#headerRef.value?.focus();
        }
    }
    #onRating(isPositive) {
        if (this.#state.type !== "insight" /* State.INSIGHT */) {
            throw new Error('Unexpected state');
        }
        if (this.#state.metadata?.rpcGlobalId === undefined) {
            throw new Error('RPC Id not in metadata');
        }
        // If it was rated, do not record again.
        if (this.#selectedRating !== undefined) {
            return;
        }
        this.#selectedRating = isPositive;
        this.#render();
        if (this.#selectedRating) {
            Host.userMetrics.actionTaken(Host.UserMetrics.Action.InsightRatedPositive);
        }
        else {
            Host.userMetrics.actionTaken(Host.UserMetrics.Action.InsightRatedNegative);
        }
        const disallowLogging = Root.Runtime.hostConfig.aidaAvailability?.disallowLogging ?? true;
        void this.#aidaClient.registerClientEvent({
            corresponding_aida_rpc_global_id: this.#state.metadata.rpcGlobalId,
            disable_user_content_logging: disallowLogging,
            do_conversation_client_event: {
                user_feedback: {
                    sentiment: this.#selectedRating ? "POSITIVE" /* Host.AidaClient.Rating.POSITIVE */ : "NEGATIVE" /* Host.AidaClient.Rating.NEGATIVE */,
                },
            },
        });
    }
    #onReport() {
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.openInNewTab(REPORT_URL);
    }
    #onSearch() {
        const query = this.#promptBuilder.getSearchQuery();
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.openSearchResultsInNewTab(query);
    }
    async #onConsentReminderConfirmed() {
        this.#getOnboardingCompletedSetting().set(true);
        this.#transitionTo({
            type: "loading" /* State.LOADING */,
            consentOnboardingCompleted: true,
        });
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.InsightsReminderTeaserConfirmed);
        await this.#generateInsight();
    }
    #insertCitations(explanation, metadata) {
        const directCitationUrls = [];
        if (!isSearchRagResponse(metadata) || !metadata.attributionMetadata) {
            return { explanationWithCitations: explanation, directCitationUrls };
        }
        const { attributionMetadata } = metadata;
        const sortedCitations = attributionMetadata.citations
            .filter(citation => citation.sourceType === Host.AidaClient.CitationSourceType.WORLD_FACTS)
            .sort((a, b) => (b.endIndex || 0) - (a.endIndex || 0));
        let explanationWithCitations = explanation;
        for (const [index, citation] of sortedCitations.entries()) {
            // Matches optional punctuation mark followed by whitespace.
            // Ensures citation is placed at the end of a word.
            const myRegex = /[.,:;!?]*\s/g;
            myRegex.lastIndex = citation.endIndex || 0;
            const result = myRegex.exec(explanationWithCitations);
            if (result && citation.uri) {
                explanationWithCitations = explanationWithCitations.slice(0, result.index) +
                    `[^${sortedCitations.length - index}]` + explanationWithCitations.slice(result.index);
                directCitationUrls.push(citation.uri);
            }
        }
        directCitationUrls.reverse();
        return { explanationWithCitations, directCitationUrls };
    }
    #modifyTokensToHandleCitationsInCode(tokens) {
        for (const token of tokens) {
            if (token.type === 'code') {
                // Find and remove '[^number]' from within code block
                const matches = token.text.match(/\[\^\d+\]/g);
                token.text = token.text.replace(/\[\^\d+\]/g, '');
                // And add as a citation for the whole code block
                if (matches?.length) {
                    const citations = matches.map(match => {
                        const index = parseInt(match.slice(2, -1), 10);
                        return {
                            index,
                            clickHandler: this.#citationClickHandler.bind(this, index),
                        };
                    });
                    token.citations = citations;
                }
            }
        }
    }
    #deriveRelatedUrls(directCitationUrls, metadata) {
        if (!metadata.factualityMetadata?.facts.length) {
            return [];
        }
        const relatedUrls = metadata.factualityMetadata.facts.filter(fact => fact.sourceUri && !directCitationUrls.includes(fact.sourceUri))
            .map(fact => fact.sourceUri) ||
            [];
        const trainingDataUrls = metadata.attributionMetadata?.citations
            .filter(citation => citation.sourceType === Host.AidaClient.CitationSourceType.TRAINING_DATA &&
            (citation.uri || citation.repository))
            .map(citation => citation.uri || `https://www.github.com/${citation.repository}`) ||
            [];
        const dedupedTrainingDataUrls = [...new Set(trainingDataUrls.filter(url => !relatedUrls.includes(url) && !directCitationUrls.includes(url)))];
        relatedUrls.push(...dedupedTrainingDataUrls);
        return relatedUrls;
    }
    async #generateInsight() {
        try {
            for await (const { sources, isPageReloadRecommended, explanation, metadata, completed } of this.#getInsight()) {
                const { explanationWithCitations, directCitationUrls } = this.#insertCitations(explanation, metadata);
                const relatedUrls = this.#deriveRelatedUrls(directCitationUrls, metadata);
                const tokens = this.#validateMarkdown(explanationWithCitations);
                const valid = tokens !== false;
                if (valid) {
                    this.#modifyTokensToHandleCitationsInCode(tokens);
                }
                this.#transitionTo({
                    type: "insight" /* State.INSIGHT */,
                    tokens: valid ? tokens : [],
                    validMarkdown: valid,
                    explanation,
                    sources,
                    metadata,
                    isPageReloadRecommended,
                    completed,
                    directCitationUrls,
                    relatedUrls,
                });
            }
            Host.userMetrics.actionTaken(Host.UserMetrics.Action.InsightGenerated);
        }
        catch (err) {
            console.error('[ConsoleInsight] Error in #generateInsight:', err);
            Host.userMetrics.actionTaken(Host.UserMetrics.Action.InsightErrored);
            if (err.message === 'doAidaConversation timed out' && this.#state.type === "insight" /* State.INSIGHT */) {
                this.#state.timedOut = true;
                this.#transitionTo({ ...this.#state, completed: true, timedOut: true });
            }
            else {
                this.#transitionTo({
                    type: "error" /* State.ERROR */,
                    error: err.message,
                });
            }
        }
    }
    /**
     * Validates the markdown by trying to render it.
     */
    #validateMarkdown(text) {
        try {
            const tokens = this.#marked.lexer(text);
            for (const token of tokens) {
                this.#renderer.renderToken(token);
            }
            return tokens;
        }
        catch {
            Host.userMetrics.actionTaken(Host.UserMetrics.Action.InsightErroredMarkdown);
            return false;
        }
    }
    async *#getInsight() {
        const { prompt, sources, isPageReloadRecommended } = await this.#promptBuilder.buildPrompt();
        try {
            for await (const response of this.#aidaClient.doConversation(Host.AidaClient.AidaClient.buildConsoleInsightsRequest(prompt))) {
                yield { sources, isPageReloadRecommended, ...response };
            }
        }
        catch (err) {
            if (err.message === 'Server responded: permission denied') {
                Host.userMetrics.actionTaken(Host.UserMetrics.Action.InsightErroredPermissionDenied);
            }
            else if (err.message.startsWith('Cannot send request:')) {
                Host.userMetrics.actionTaken(Host.UserMetrics.Action.InsightErroredCannotSend);
            }
            else if (err.message.startsWith('Request failed:')) {
                Host.userMetrics.actionTaken(Host.UserMetrics.Action.InsightErroredRequestFailed);
            }
            else if (err.message.startsWith('Cannot parse chunk:')) {
                Host.userMetrics.actionTaken(Host.UserMetrics.Action.InsightErroredCannotParseChunk);
            }
            else if (err.message === 'Unknown chunk result') {
                Host.userMetrics.actionTaken(Host.UserMetrics.Action.InsightErroredUnknownChunk);
            }
            else if (err.message.startsWith('Server responded:')) {
                Host.userMetrics.actionTaken(Host.UserMetrics.Action.InsightErroredApi);
            }
            else {
                Host.userMetrics.actionTaken(Host.UserMetrics.Action.InsightErroredOther);
            }
            throw err;
        }
    }
    #onGoToSignIn() {
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.openInNewTab(SIGN_IN_URL);
    }
    #onToggleReferenceDetails() {
        if (this.#referenceDetailsRef.value) {
            this.#areReferenceDetailsOpen = this.#referenceDetailsRef.value.open;
        }
    }
    #onDisclaimerSettingsLink() {
        void UI.ViewManager.ViewManager.instance().showView('chrome-ai');
    }
    #onReminderSettingsLink() {
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.InsightsReminderTeaserSettingsLinkClicked);
        void UI.ViewManager.ViewManager.instance().showView('chrome-ai');
    }
    #onEnableInsightsInSettingsLink() {
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.InsightsOptInTeaserSettingsLinkClicked);
        void UI.ViewManager.ViewManager.instance().showView('chrome-ai');
    }
    #render() {
        const input = {
            state: this.#state,
            closing: this.#closing,
            disableAnimations: this.disableAnimations,
            renderer: this.#renderer,
            selectedRating: this.#selectedRating,
            noLogging: Root.Runtime.hostConfig.aidaAvailability?.enterprisePolicyValue ===
                Root.Runtime.GenAiEnterprisePolicyValue.ALLOW_WITHOUT_LOGGING,
            callbacks: {
                onClose: this.#onClose.bind(this),
                onAnimationEnd: this.#onAnimationEnd.bind(this),
                onSearch: this.#onSearch.bind(this),
                onRating: this.#onRating.bind(this),
                onReport: this.#onReport.bind(this),
                onGoToSignIn: this.#onGoToSignIn.bind(this),
                onConsentReminderConfirmed: this.#onConsentReminderConfirmed.bind(this),
                onToggleReferenceDetails: this.#onToggleReferenceDetails.bind(this),
                onDisclaimerSettingsLink: this.#onDisclaimerSettingsLink.bind(this),
                onReminderSettingsLink: this.#onReminderSettingsLink.bind(this),
                onEnableInsightsInSettingsLink: this.#onEnableInsightsInSettingsLink.bind(this),
            },
        };
        const output = {
            referenceDetailsRef: this.#referenceDetailsRef,
            headerRef: this.#headerRef,
            citationLinks: [],
        };
        // Future Widget view function starts here.
        const { state, noLogging, callbacks } = input;
        const { onClose, onDisclaimerSettingsLink } = callbacks;
        const jslog = `${VisualLogging.section(state.type).track({ resize: true })}`;
        let header = Lit.nothing;
        let main = Lit.nothing;
        const mainClasses = {};
        let footer;
        switch (state.type) {
            case "loading" /* State.LOADING */:
                header = renderHeader({ headerText: i18nString(UIStrings.generating), onClose }, output.headerRef);
                main = renderLoading();
                break;
            case "insight" /* State.INSIGHT */:
                header = renderHeader({ headerText: i18nString(UIStrings.insight), onClose, showSpinner: !state.completed }, output.headerRef);
                main = renderInsight(state, input.renderer, input.disableAnimations, callbacks, output);
                footer = renderInsightFooter(noLogging, input.selectedRating, callbacks);
                break;
            case "error" /* State.ERROR */:
                header = renderHeader({ headerText: i18nString(UIStrings.error), onClose }, output.headerRef);
                main = renderError(i18nString(UIStrings.errorBody));
                footer = renderDisclaimerFooter(noLogging, onDisclaimerSettingsLink);
                break;
            case "consent-reminder" /* State.CONSENT_REMINDER */:
                header = renderHeader({ headerText: 'Understand console messages with AI', onClose, showIcon: true }, output.headerRef);
                mainClasses['reminder-container'] = true;
                main = renderConsentReminder(noLogging);
                footer = renderConsentReminderFooter(callbacks.onReminderSettingsLink, callbacks.onConsentReminderConfirmed);
                break;
            case "setting-is-not-true" /* State.SETTING_IS_NOT_TRUE */:
                mainClasses['opt-in-teaser'] = true;
                main = renderSettingIsNotTrue(callbacks.onEnableInsightsInSettingsLink);
                break;
            case "not-logged-in" /* State.NOT_LOGGED_IN */:
            case "sync-is-paused" /* State.SYNC_IS_PAUSED */:
                header = renderHeader({ headerText: i18nString(UIStrings.signInToUse), onClose }, output.headerRef);
                main = renderNotLoggedIn();
                footer = renderSignInFooter(callbacks.onGoToSignIn);
                break;
            case "offline" /* State.OFFLINE */:
                header = renderHeader({ headerText: i18nString(UIStrings.offlineHeader), onClose }, output.headerRef);
                main = renderError(i18nString(UIStrings.offline));
                footer = renderDisclaimerFooter(noLogging, onDisclaimerSettingsLink);
                break;
        }
        // clang-format off
        render(html `
      <style>${styles}</style>
      <style>${Input.checkboxStyles}</style>
      <div
        class=${Directives.classMap({ wrapper: true, closing: input.closing })}
        jslog=${VisualLogging.pane('console-insights').track({ resize: true })}
        @animationend=${callbacks.onAnimationEnd}
      >
        <div class="animation-wrapper">
          ${header}
          <main jslog=${jslog} class=${Directives.classMap(mainClasses)}>
            ${main}
          </main>
          ${footer ? html `<footer jslog=${VisualLogging.section('footer')}>
            ${footer}
          </footer>` : Lit.nothing}
        </div>
      </div>
    `, this.#shadow, {
            host: this,
        });
        // clang-format on
        this.#citationLinks = output.citationLinks;
        if (this.#referenceDetailsRef.value) {
            this.#referenceDetailsRef.value.open = this.#areReferenceDetailsOpen;
        }
    }
}
customElements.define('devtools-console-insight', ConsoleInsight);
//# sourceMappingURL=ConsoleInsight.js.map