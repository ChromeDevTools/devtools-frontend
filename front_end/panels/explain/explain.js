// gen/front_end/panels/explain/components/ConsoleInsight.js
import "./../../ui/components/spinners/spinners.js";
import * as Common from "./../../core/common/common.js";
import * as Host from "./../../core/host/host.js";
import * as i18n from "./../../core/i18n/i18n.js";
import * as Root from "./../../core/root/root.js";
import * as Marked from "./../../third_party/marked/marked.js";
import * as Buttons from "./../../ui/components/buttons/buttons.js";
import * as Input from "./../../ui/components/input/input.js";
import * as MarkdownView from "./../../ui/components/markdown_view/markdown_view.js";
import * as UI from "./../../ui/legacy/legacy.js";
import * as Lit from "./../../ui/lit/lit.js";
import * as VisualLogging from "./../../ui/visual_logging/visual_logging.js";
import * as Console from "./../console/console.js";

// gen/front_end/panels/explain/components/consoleInsight.css.js
var consoleInsight_css_default = `/*
 * Copyright 2023 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

* {
  padding: 0;
  margin: 0;
  box-sizing: border-box;
}

:host {
  font-family: var(--default-font-family);
  font-size: inherit;
  display: block;
}

.wrapper {
  background-color: var(--sys-color-cdt-base-container);
  border-radius: 16px;
  container-type: inline-size;
  display: grid;
  animation: expand var(--sys-motion-duration-medium2) var(--sys-motion-easing-emphasized) forwards;
}

:host-context(.closing) .wrapper {
  animation: collapse var(--sys-motion-duration-medium2) var(--sys-motion-easing-emphasized) forwards;
}

@keyframes expand {
  from {
    grid-template-rows: 0fr;
  }

  to {
    grid-template-rows: 1fr;
  }
}

@keyframes collapse {
  from {
    grid-template-rows: 1fr;
  }

  to {
    grid-template-rows: 0fr;
    padding-top: 0;
    padding-bottom: 0;
  }
}

.animation-wrapper {
  overflow: hidden;
  padding: var(--sys-size-6) var(--sys-size-8);
}

.wrapper.top {
  border-radius: 16px 16px 4px 4px;
}

.wrapper.bottom {
  margin-top: 5px;
  border-radius: 4px 4px 16px 16px;
}

header {
  display: flex;
  flex-direction: row;
  gap: 6px;
  color: var(--sys-color-on-surface);
  font-size: 13px;
  font-style: normal;
  font-weight: 500;
  margin-bottom: var(--sys-size-6);
  align-items: center;
}

header:focus-visible {
  outline: none;
}

header > .filler {
  display: flex;
  flex-direction: row;
  gap: var(--sys-size-5);
  align-items: center;
  flex: 1;
}

.reminder-container {
  border-radius: var(--sys-size-5);
  background-color: var(--sys-color-surface4);
  padding: var(--sys-size-8);
  font-weight: var(--ref-typeface-weight-medium);

  h3 {
    font: inherit;
  }
}

.reminder-items {
  display: grid;
  grid-template-columns: var(--sys-size-8) auto;
  gap: var(--sys-size-5) var(--sys-size-6);
  margin-top: var(--sys-size-6);
  line-height: var(--sys-size-8);
  font-weight: var(--ref-typeface-weight-regular);
}

main {
  --override-markdown-view-message-color: var(--sys-color-on-surface);

  color: var(--sys-color-on-surface);
  font-size: 12px;
  font-style: normal;
  font-weight: 400;
  line-height: 20px;

  p {
    margin-block: 1em;
  }

  ul {
    list-style-type: none;
    list-style-position: inside;
    padding-inline-start: 0.2em;

    li {
      display: list-item;
      list-style-type: disc;
      list-style-position: outside;
      margin-inline-start: 1em;
    }

    li::marker {
      font-size: 11px;
      line-height: 1;
    }
  }

  label {
    display: inline-flex;
    flex-direction: row;
    gap: 0.5em;

    input,
    span {
      vertical-align: middle;
    }

    input[type="checkbox"] {
      margin-top: 0.3em;
    }
  }
}

.opt-in-teaser {
  display: flex;
  gap: var(--sys-size-5);
}

devtools-markdown-view {
  margin-bottom: 12px;
}

footer {
  display: flex;
  flex-direction: row;
  align-items: center;
  color: var(--sys-color-on-surface);
  font-style: normal;
  font-weight: 400;
  line-height: normal;
  margin-top: 14px;
  gap: 32px;
}

@container (max-width: 600px) {
  footer {
    gap: 8px;
  }
}

footer > .filler {
  flex: 1;
}

footer .rating {
  display: flex;
  flex-direction: row;
  gap: 8px;
}

textarea {
  height: 84px;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid var(--sys-color-neutral-outline);
  width: 100%;
  font-family: var(--default-font-family);
  font-size: inherit;
}

.buttons {
  display: flex;
  gap: 5px;
}

@media (width <= 500px) {
  .buttons {
    flex-wrap: wrap;
  }
}

main .buttons {
  margin-top: 12px;
}

.disclaimer {
  display: flex;
  gap: 2px;
  color: var(--sys-color-on-surface-subtle);
  font-size: 11px;
  align-items: flex-start;
  flex-direction: column;
}

.link {
  color: var(--sys-color-primary);
  text-decoration-line: underline;

  devtools-icon {
    color: var(--sys-color-primary);
    width: 14px;
    height: 14px;
  }
}

button.link {
  border: none;
  background: none;
  cursor: pointer;
  font: inherit;
}

.loader {
  background:
    linear-gradient(
      130deg,
      transparent 0%,
      var(--sys-color-gradient-tertiary) 20%,
      var(--sys-color-gradient-primary) 40%,
      transparent 60%,
      var(--sys-color-gradient-tertiary) 80%,
      var(--sys-color-gradient-primary) 100%
    );
  background-position: 0% 0%;
  background-size: 250% 250%;
  animation: gradient 5s infinite linear;
}

@keyframes gradient {
  0% { background-position: 0 0; }
  100% { background-position: 100% 100%; }
}

summary {
  font-size: 12px;
  font-style: normal;
  font-weight: 400;
  line-height: 20px;
}

details {
  overflow: hidden;
  margin-top: 10px;
}

::details-content {
  height: 0;
  transition:
    height var(--sys-motion-duration-short4) var(--sys-motion-easing-emphasized),
    content-visibility var(--sys-motion-duration-short4) var(--sys-motion-easing-emphasized) allow-discrete;
}

[open]::details-content {
  height: auto;
}

details.references {
  /* This transition is only added because there is no \\'transitionend\\' event in
     JS for the \\'::details-content\\' transition. */
  transition: margin-bottom var(--sys-motion-duration-short4) var(--sys-motion-easing-emphasized);
}

details.references[open] {
  /* This transition does not affect the actual UI because of collapsing margins. */
  margin-bottom: var(--sys-size-1);
}

h2 {
  display: block;
  font-size: var(--sys-size-7);
  margin: 0;
  font-weight: var(--ref-typeface-weight-medium);
  line-height: var(--sys-size-9);
}

h2:focus-visible {
  outline: none;
}

.info {
  width: 20px;
  height: 20px;
}

.badge {
  background: linear-gradient(135deg, var(--sys-color-gradient-primary), var(--sys-color-gradient-tertiary));
  border-radius: var(--sys-size-3);
  height: var(--sys-size-9);

  devtools-icon {
    margin: var(--sys-size-2);
  }
}

.header-icon-container {
  background: linear-gradient(135deg, var(--sys-color-gradient-primary), var(--sys-color-gradient-tertiary));
  border-radius: var(--sys-size-4);
  height: 36px;
  width: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-button {
  align-self: flex-start;
}

.sources-list {
  padding-left: var(--sys-size-6);
  margin-bottom: var(--sys-size-6);
  list-style: none;
  counter-reset: sources;
  display: grid;
  grid-template-columns: var(--sys-size-9) auto;
  list-style-position: inside;
}

.sources-list li {
  display: contents;
}

.sources-list li::before {
  counter-increment: sources;
  content: "[" counter(sources) "]";
  display: table-cell;
}

.sources-list x-link.highlighted {
  animation: highlight-fadeout 2s;
}

@keyframes highlight-fadeout {
  from {
    background-color: var(--sys-color-yellow-container);
  }

  to {
    background-color: transparent;
  }
}

.references-list {
  padding-left: var(--sys-size-8);
}

.references-list li {
  padding-left: var(--sys-size-3);
}

details h3 {
  font-size: 10px;
  font-weight: var(--ref-typeface-weight-medium);
  text-transform: uppercase;
  color: var(--sys-color-on-surface-subtle);
  padding-left: var(--sys-size-6);
}

.error-message {
  font: var(--sys-typescale-body4-bold);
}

/*# sourceURL=${import.meta.resolve("././components/consoleInsight.css")} */`;

// gen/front_end/panels/explain/components/consoleInsightSourcesList.css.js
var consoleInsightSourcesList_css_default = `/*
 * Copyright 2023 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

* {
  padding: 0;
  margin: 0;
  box-sizing: border-box;
}

:host {
  display: block;
}

ul {
  color: var(--sys-color-primary);
  font-size: 12px;
  font-style: normal;
  font-weight: 400;
  line-height: 18px;
  margin-top: 8px;
  padding-left: var(--sys-size-6);
}

li {
  list-style-type: none;
}

ul .link {
  color: var(--sys-color-primary);
  display: inline-flex !important; /* stylelint-disable-line declaration-no-important */
  align-items: center;
  gap: 4px;
  text-decoration-line: underline;
}

devtools-icon {
  height: 16px;
  width: 16px;
  margin-right: var(--sys-size-1);
}

devtools-icon[name="open-externally"] {
  color: var(--icon-link);
}

.source-disclaimer {
  color: var(--sys-color-on-surface-subtle);
}

/*# sourceURL=${import.meta.resolve("././components/consoleInsightSourcesList.css")} */`;

// gen/front_end/panels/explain/components/ConsoleInsight.js
var UIStrings = {
  /**
   * @description The title of the insight source "Console message".
   */
  consoleMessage: "Console message",
  /**
   * @description The title of the insight source "Stacktrace".
   */
  stackTrace: "Stacktrace",
  /**
   * @description The title of the insight source "Network request".
   */
  networkRequest: "Network request",
  /**
   * @description The title of the insight source "Related code".
   */
  relatedCode: "Related code",
  /**
   * @description The title that is shown while the insight is being generated.
   */
  generating: "Generating explanation\u2026",
  /**
   * @description The header that indicates that the content shown is a console
   * insight.
   */
  insight: "Explanation",
  /**
   * @description The title of the a button that closes the insight pane.
   */
  closeInsight: "Close explanation",
  /**
   * @description The title of the list of source data that was used to generate the insight.
   */
  inputData: "Data used to understand this message",
  /**
   * @description The title of the button that allows submitting positive
   * feedback about the console insight.
   */
  goodResponse: "Good response",
  /**
   * @description The title of the button that allows submitting negative
   * feedback about the console insight.
   */
  badResponse: "Bad response",
  /**
   * @description The title of the button that opens a page to report a legal
   * issue with the console insight.
   */
  report: "Report legal issue",
  /**
   * @description The text of the header inside the console insight pane when there was an error generating an insight.
   */
  error: "DevTools has encountered an error",
  /**
   * @description The message shown when an error has been encountered.
   */
  errorBody: "Something went wrong. Try again.",
  /**
   * @description Label for screen readers that is added to the end of the link
   * title to indicate that the link will be opened in a new tab.
   */
  opensInNewTab: "(opens in a new tab)",
  /**
   * @description The title of a link that allows the user to learn more about
   * the feature.
   */
  learnMore: "Learn more",
  /**
   * @description The error message when the user is not logged in into Chrome.
   */
  notLoggedIn: "This feature is only available when you sign into Chrome with your Google account.",
  /**
   * @description The title of a button which opens the Chrome SignIn page.
   */
  signIn: "Sign in",
  /**
   * @description The header shown when the internet connection is not
   * available.
   */
  offlineHeader: "DevTools can\u2019t reach the internet",
  /**
   * @description Message shown when the user is offline.
   */
  offline: "Check your internet connection and try again.",
  /**
   * @description The message shown if the user is not logged in.
   */
  signInToUse: "Sign in to use this feature",
  /**
   * @description The title of the button that searches for the console
   * insight using a search engine instead of using console insights.
   */
  search: "Use search instead",
  /**
   * @description Shown to the user when the network request data is not
   * available and a page reload might populate it.
   */
  reloadRecommendation: "Reload the page to capture related network request data for this message in order to create a better insight.",
  /**
   * @description Shown to the user when they need to enable the console insights feature in settings in order to use it.
   * @example {Console insights in Settings} PH1
   */
  turnOnInSettings: "Turn on {PH1} to receive AI assistance for understanding and addressing console warnings and errors.",
  /**
   * @description Text for a link to Chrome DevTools Settings.
   */
  settingsLink: "`Console insights` in Settings",
  /**
   * @description The title of the list of references/recitations that were used to generate the insight.
   */
  references: "Sources and related content",
  /**
   * @description Sub-heading for a list of links to URLs which are related to the AI-generated response.
   */
  relatedContent: "Related content",
  /**
   * @description Error message shown when the request to get an AI response times out.
   */
  timedOut: "Generating a response took too long. Please try again.",
  /**
   * @description Text informing the user that AI assistance is not available in Incognito mode or Guest mode.
   */
  notAvailableInIncognitoMode: "AI assistance is not available in Incognito mode or Guest mode"
};
var str_ = i18n.i18n.registerUIStrings("panels/explain/components/ConsoleInsight.ts", UIStrings);
var i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
var i18nTemplate2 = Lit.i18nTemplate.bind(void 0, str_);
var { render, html, Directives: Directives2 } = Lit;
var CloseEvent = class _CloseEvent extends Event {
  static eventName = "close";
  constructor() {
    super(_CloseEvent.eventName, { composed: true, bubbles: true });
  }
};
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
var TERMS_OF_SERVICE_URL = "https://policies.google.com/terms";
var PRIVACY_POLICY_URL = "https://policies.google.com/privacy";
var CODE_SNIPPET_WARNING_URL = "https://support.google.com/legal/answer/13505487";
var LEARN_MORE_URL = "https://goo.gle/devtools-console-messages-ai";
var REPORT_URL = "https://support.google.com/legal/troubleshooter/1114905?hl=en#ts=1115658%2C13380504";
var SIGN_IN_URL = "https://accounts.google.com";
var markedExtension = {
  name: "citation",
  level: "inline",
  start(src) {
    return src.match(/\[\^/)?.index;
  },
  tokenizer(src) {
    const match = src.match(/^\[\^(\d+)\]/);
    if (match) {
      return {
        type: "citation",
        raw: match[0],
        linkText: Number(match[1])
      };
    }
    return false;
  },
  renderer: () => ""
};
function isSearchRagResponse(metadata) {
  return Boolean(metadata.factualityMetadata?.facts.length);
}
function renderSearchButton(onSearch) {
  return html`<devtools-button
    @click=${onSearch}
    class="search-button"
    .variant=${"outlined"}
    .jslogContext=${"search"}
  >
    ${i18nString(UIStrings.search)}
  </devtools-button>`;
}
function renderLearnMoreAboutInsights() {
  return html`<x-link href=${LEARN_MORE_URL} class="link" jslog=${VisualLogging.link("learn-more").track({ click: true })}>
    ${i18nString(UIStrings.learnMore)}
  </x-link>`;
}
function maybeRenderSources(directCitationUrls) {
  if (!directCitationUrls.length) {
    return Lit.nothing;
  }
  return html`
    <ol class="sources-list">
      ${directCitationUrls.map((url, index) => html`
        <li>
          <x-link
            href=${url}
            class="link"
            data-index=${index + 1}
            jslog=${VisualLogging.link("references.console-insights").track({ click: true })}
          >
            ${url}
          </x-link>
        </li>
      `)}
    </ol>
  `;
}
function maybeRenderRelatedContent(relatedUrls, directCitationUrls) {
  if (relatedUrls.length === 0) {
    return Lit.nothing;
  }
  return html`
    ${directCitationUrls.length ? html`<h3>${i18nString(UIStrings.relatedContent)}</h3>` : Lit.nothing}
    <ul class="references-list">
      ${relatedUrls.map((relatedUrl) => html`
        <li>
          <x-link
            href=${relatedUrl}
            class="link"
            jslog=${VisualLogging.link("references.console-insights").track({ click: true })}
          >
            ${relatedUrl}
          </x-link>
        </li>
      `)}
    </ul>
  `;
}
function renderLoading() {
  return html`
    <div role="presentation" aria-label="Loading" class="loader" style="clip-path: url('#clipPath');">
      <svg width="100%" height="64">
        <clipPath id="clipPath">
          <rect x="0" y="0" width="100%" height="16" rx="8"></rect>
          <rect x="0" y="24" width="100%" height="16" rx="8"></rect>
          <rect x="0" y="48" width="100%" height="16" rx="8"></rect>
        </clipPath>
      </svg>
    </div>`;
}
function renderInsight(insight, renderer, disableAnimations, callbacks, output) {
  return html`
        ${insight.validMarkdown ? html`<devtools-markdown-view
            .data=${{ tokens: insight.tokens, renderer, animationEnabled: !disableAnimations }}>
          </devtools-markdown-view>` : insight.explanation}
        ${insight.timedOut ? html`<p class="error-message">${i18nString(UIStrings.timedOut)}</p>` : Lit.nothing}
        ${isSearchRagResponse(insight.metadata) ? html`
          <details class="references" ${Directives2.ref(output.referenceDetailsRef)} @toggle=${callbacks.onToggleReferenceDetails} jslog=${VisualLogging.expand("references").track({ click: true })}>
            <summary>${i18nString(UIStrings.references)}</summary>
            ${maybeRenderSources(insight.directCitationUrls)}
            ${maybeRenderRelatedContent(insight.relatedUrls, insight.directCitationUrls)}
          </details>
        ` : Lit.nothing}
        <details jslog=${VisualLogging.expand("sources").track({ click: true })}>
          <summary>${i18nString(UIStrings.inputData)}</summary>
          <devtools-console-insight-sources-list .sources=${insight.sources} .isPageReloadRecommended=${insight.isPageReloadRecommended}>
          </devtools-console-insight-sources-list>
        </details>
        <div class="buttons">
          ${renderSearchButton(callbacks.onSearch)}
        </div>`;
}
function renderError(message) {
  return html`<div class="error">${message}</div>`;
}
function renderConsentReminder(noLogging) {
  return html`
    <h3>Things to consider</h3>
    <div class="reminder-items">
      <div>
        <devtools-icon name="google" class="medium">
        </devtools-icon>
      </div>
      <div>The console message, associated stack trace, related source code, and the associated network headers are sent to Google to generate explanations. ${noLogging ? "The content you submit and that is generated by this feature will not be used to improve Google\u2019s AI models." : "This data may be seen by human reviewers to improve this feature. Avoid sharing sensitive or personal information."}
      </div>
      <div>
        <devtools-icon name="policy" class="medium">
        </devtools-icon>
      </div>
      <div>Use of this feature is subject to the <x-link
          href=${TERMS_OF_SERVICE_URL}
          class="link"
          jslog=${VisualLogging.link("terms-of-service.console-insights").track({ click: true })}>
        Google Terms of Service
        </x-link> and <x-link
          href=${PRIVACY_POLICY_URL}
          class="link"
          jslog=${VisualLogging.link("privacy-policy.console-insights").track({ click: true })}>
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
          jslog=${VisualLogging.link("code-snippets-explainer.console-insights").track({ click: true })}
        >Use generated code snippets with caution</x-link>
      </div>
    </div>`;
}
function renderSettingIsNotTrue(onEnableInsightsInSettingsLink) {
  const settingsLink = html`
    <button
      class="link" role="link"
      jslog=${VisualLogging.action("open-ai-settings").track({ click: true })}
      @click=${onEnableInsightsInSettingsLink}
    >${i18nString(UIStrings.settingsLink)}</button>`;
  return html`
    <div class="badge">
      <devtools-icon name="lightbulb-spark" class="medium">
      </devtools-icon>
    </div>
    <div>
      ${i18nTemplate2(UIStrings.turnOnInSettings, { PH1: settingsLink })} ${renderLearnMoreAboutInsights()}
    </div>`;
}
function renderNotLoggedIn() {
  return renderError(Root.Runtime.hostConfig.isOffTheRecord ? i18nString(UIStrings.notAvailableInIncognitoMode) : i18nString(UIStrings.notLoggedIn));
}
function renderDisclaimer(noLogging, onDisclaimerSettingsLink) {
  return html`<span>
    AI tools may generate inaccurate info that doesn't represent Google's views. ${noLogging ? "The content you submit and that is generated by this feature will not be used to improve Google\u2019s AI models." : "Data sent to Google may be seen by human reviewers to improve this feature."} <button class="link" role="link" @click=${onDisclaimerSettingsLink}
              jslog=${VisualLogging.action("open-ai-settings").track({ click: true })}>
      Open settings
    </button> or <x-link href=${LEARN_MORE_URL}
        class="link" jslog=${VisualLogging.link("learn-more").track({ click: true })}>
      learn more
    </x-link>
  </span>`;
}
function renderDisclaimerFooter(noLogging, onDisclaimerSettingsLink) {
  return html`
    <div class="disclaimer">
      ${renderDisclaimer(noLogging, onDisclaimerSettingsLink)}
    </div>`;
}
function renderSignInFooter(onGoToSignIn) {
  if (Root.Runtime.hostConfig.isOffTheRecord) {
    return Lit.nothing;
  }
  return html`
    <div class="filler"></div>
    <div>
      <devtools-button
        @click=${onGoToSignIn}
        .variant=${"primary"}
        .jslogContext=${"update-settings"}
      >
        ${UIStrings.signIn}
      </devtools-button>
    </div>`;
}
function renderConsentReminderFooter(onReminderSettingsLink, onConsentReminderConfirmed) {
  return html`
    <div class="filler"></div>
    <div class="buttons">
      <devtools-button
        @click=${onReminderSettingsLink}
          .variant=${"tonal"}
          jslogContext=${"settings"}
          title=${"Settings"}
      >
        Settings
      </devtools-button>
      <devtools-button
        class='continue-button'
        @click=${onConsentReminderConfirmed}
        .variant=${"primary"}
        .jslogContext=${"continue"}
        .title=${"continue"}
      >
        Continue
      </devtools-button>
    </div>`;
}
function renderInsightFooter(noLogging, selectedRating, callbacks) {
  return html`
  <div class="disclaimer">
    ${renderDisclaimer(noLogging, callbacks.onDisclaimerSettingsLink)}
  </div>
  <div class="filler"></div>
  <div class="rating">
    <devtools-button
      data-rating="true"
      .iconName=${"thumb-up"}
      .toggledIconName=${"thumb-up"}
      .variant=${"icon_toggle"}
      .size=${"SMALL"}
      .toggleOnClick=${false}
      .toggleType=${"primary-toggle"}
      .disabled=${selectedRating !== void 0}
      .toggled=${selectedRating === true}
      .title=${i18nString(UIStrings.goodResponse)}
      .jslogContext=${"thumbs-up"}
      @click=${callbacks.onRating}
    ></devtools-button>
    <devtools-button
      data-rating="false"
      .iconName=${"thumb-down"}
      .toggledIconName=${"thumb-down"}
      .variant=${"icon_toggle"}
      .size=${"SMALL"}
      .toggleOnClick=${false}
      .toggleType=${"primary-toggle"}
      .disabled=${selectedRating !== void 0}
      .toggled=${selectedRating === false}
      .title=${i18nString(UIStrings.badResponse)}
      .jslogContext=${"thumbs-down"}
      @click=${callbacks.onRating}
    ></devtools-button>
    <devtools-button
      .iconName=${"report"}
      .variant=${"icon"}
      .size=${"SMALL"}
      .title=${i18nString(UIStrings.report)}
      .jslogContext=${"report"}
      @click=${callbacks.onReport}
    ></devtools-button>
  </div>`;
}
function renderHeaderIcon() {
  return html`
    <div class="header-icon-container">
      <devtools-icon name="lightbulb-spark" class="large">
      </devtools-icon>
    </div>`;
}
function renderHeader({ headerText, showIcon = false, showSpinner = false, onClose }) {
  return html`
    <header>
      ${showIcon ? renderHeaderIcon() : Lit.nothing}
      <div class="filler">
        <h2 tabindex="-1">
          ${headerText}
        </h2>
        ${showSpinner ? html`<devtools-spinner></devtools-spinner>` : Lit.nothing}
      </div>
      <div class="close-button">
        <devtools-button
          .iconName=${"cross"}
          .variant=${"icon"}
          .size=${"SMALL"}
          .title=${i18nString(UIStrings.closeInsight)}
          jslog=${VisualLogging.close().track({ click: true })}
          @click=${onClose}
        ></devtools-button>
      </div>
    </header>
  `;
}
var ConsoleInsight = class _ConsoleInsight extends HTMLElement {
  static async create(promptBuilder, aidaClient) {
    const aidaPreconditions = await Host.AidaClient.AidaClient.checkAccessPreconditions();
    return new _ConsoleInsight(promptBuilder, aidaClient, aidaPreconditions);
  }
  #shadow = this.attachShadow({ mode: "open" });
  disableAnimations = false;
  #promptBuilder;
  #aidaClient;
  #renderer;
  // Main state.
  #state;
  #referenceDetailsRef = Lit.Directives.createRef();
  #areReferenceDetailsOpen = false;
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
    this.addEventListener("keydown", (e) => {
      e.stopPropagation();
    });
    this.addEventListener("keyup", (e) => {
      e.stopPropagation();
    });
    this.addEventListener("keypress", (e) => {
      e.stopPropagation();
    });
    this.addEventListener("click", (e) => {
      e.stopPropagation();
    });
    this.focus();
  }
  #citationClickHandler(index) {
    if (this.#state.type !== "insight" || !this.#referenceDetailsRef.value) {
      return;
    }
    const areDetailsAlreadyExpanded = this.#referenceDetailsRef.value.open;
    this.#areReferenceDetailsOpen = true;
    this.#render();
    const highlightedElement = this.#shadow.querySelector(`.sources-list x-link[data-index="${index}"]`);
    if (highlightedElement) {
      UI.UIUtils.runCSSAnimationOnce(highlightedElement, "highlighted");
      if (areDetailsAlreadyExpanded) {
        highlightedElement.scrollIntoView({ behavior: "auto" });
        highlightedElement.focus();
      } else {
        this.#referenceDetailsRef.value.addEventListener("transitionend", () => {
          highlightedElement.scrollIntoView({ behavior: "auto" });
          highlightedElement.focus();
        }, { once: true });
      }
    }
  }
  #getStateFromAidaAvailability() {
    switch (this.#aidaPreconditions) {
      case "available": {
        const skipReminder = Common.Settings.Settings.instance().createSetting(
          "console-insights-skip-reminder",
          false,
          "Session"
          /* Common.Settings.SettingStorageType.SESSION */
        ).get();
        return {
          type: "loading",
          consentOnboardingCompleted: this.#getOnboardingCompletedSetting().get() || skipReminder
        };
      }
      case "no-account-email":
        return {
          type: "not-logged-in"
        };
      case "sync-is-paused":
        return {
          type: "sync-is-paused"
        };
      case "no-internet":
        return {
          type: "offline"
        };
    }
  }
  // off -> entrypoints are shown, and point to the AI setting panel where the setting can be turned on
  // on -> entrypoints are shown, and console insights can be generated
  #getConsoleInsightsEnabledSetting() {
    try {
      return Common.Settings.moduleSetting("console-insights-enabled");
    } catch {
      return;
    }
  }
  // off -> consent reminder is shown, unless the 'console-insights-enabled'-setting has been enabled in the current DevTools session
  // on -> no consent reminder shown
  #getOnboardingCompletedSetting() {
    return Common.Settings.Settings.instance().createLocalSetting("console-insights-onboarding-finished", false);
  }
  connectedCallback() {
    this.#consoleInsightsEnabledSetting?.addChangeListener(this.#onConsoleInsightsSettingChanged, this);
    const blockedByAge = Root.Runtime.hostConfig.aidaAvailability?.blockedByAge === true;
    if (this.#state.type === "loading" && this.#consoleInsightsEnabledSetting?.getIfNotDisabled() === true && !blockedByAge && this.#state.consentOnboardingCompleted) {
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.GeneratingInsightWithoutDisclaimer);
    }
    Host.AidaClient.HostConfigTracker.instance().addEventListener("aidaAvailabilityChanged", this.#boundOnAidaAvailabilityChange);
    void this.#onAidaAvailabilityChange();
    if (this.#state.type !== "insight" && this.#state.type !== "error") {
      this.#state = this.#getStateFromAidaAvailability();
    }
    void this.#generateInsightIfNeeded();
  }
  disconnectedCallback() {
    this.#consoleInsightsEnabledSetting?.removeChangeListener(this.#onConsoleInsightsSettingChanged, this);
    Host.AidaClient.HostConfigTracker.instance().removeEventListener("aidaAvailabilityChanged", this.#boundOnAidaAvailabilityChange);
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
    if (this.#state.type === "setting-is-not-true" && this.#consoleInsightsEnabledSetting?.getIfNotDisabled() === true) {
      this.#transitionTo({
        type: "loading",
        consentOnboardingCompleted: true
      });
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.InsightsOptInTeaserConfirmedInSettings);
      void this.#generateInsightIfNeeded();
    }
    if (this.#state.type === "consent-reminder" && this.#consoleInsightsEnabledSetting?.getIfNotDisabled() === false) {
      this.#transitionTo({
        type: "loading",
        consentOnboardingCompleted: false
      });
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.InsightsReminderTeaserAbortedInSettings);
      void this.#generateInsightIfNeeded();
    }
  }
  #transitionTo(newState) {
    const previousState = this.#state;
    this.#state = newState;
    this.#render();
    if (newState.type !== previousState.type) {
      this.#focusHeader();
    }
  }
  async #generateInsightIfNeeded() {
    if (this.#state.type !== "loading") {
      return;
    }
    const blockedByAge = Root.Runtime.hostConfig.aidaAvailability?.blockedByAge === true;
    if (this.#consoleInsightsEnabledSetting?.getIfNotDisabled() !== true || blockedByAge) {
      this.#transitionTo({
        type: "setting-is-not-true"
      });
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.InsightsOptInTeaserShown);
      return;
    }
    if (!this.#state.consentOnboardingCompleted) {
      const { sources, isPageReloadRecommended } = await this.#promptBuilder.buildPrompt();
      this.#transitionTo({
        type: "consent-reminder",
        sources,
        isPageReloadRecommended
      });
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.InsightsReminderTeaserShown);
      return;
    }
    await this.#generateInsight();
  }
  #onClose() {
    if (this.#state.type === "consent-reminder") {
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.InsightsReminderTeaserCanceled);
    }
    this.shadowRoot?.addEventListener("animationend", () => {
      this.dispatchEvent(new CloseEvent());
    }, { once: true });
    this.classList.add("closing");
  }
  #onRating(event) {
    if (this.#state.type !== "insight") {
      throw new Error("Unexpected state");
    }
    if (this.#state.metadata?.rpcGlobalId === void 0) {
      throw new Error("RPC Id not in metadata");
    }
    if (this.#selectedRating !== void 0) {
      return;
    }
    this.#selectedRating = event.target.dataset.rating === "true";
    this.#render();
    if (this.#selectedRating) {
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.InsightRatedPositive);
    } else {
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.InsightRatedNegative);
    }
    const disallowLogging = Root.Runtime.hostConfig.aidaAvailability?.disallowLogging ?? true;
    void this.#aidaClient.registerClientEvent({
      corresponding_aida_rpc_global_id: this.#state.metadata.rpcGlobalId,
      disable_user_content_logging: disallowLogging,
      do_conversation_client_event: {
        user_feedback: {
          sentiment: this.#selectedRating ? "POSITIVE" : "NEGATIVE"
        }
      }
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
      type: "loading",
      consentOnboardingCompleted: true
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
    const sortedCitations = attributionMetadata.citations.filter((citation) => citation.sourceType === Host.AidaClient.CitationSourceType.WORLD_FACTS).sort((a, b) => (b.endIndex || 0) - (a.endIndex || 0));
    let explanationWithCitations = explanation;
    for (const [index, citation] of sortedCitations.entries()) {
      const myRegex = /[.,:;!?]*\s/g;
      myRegex.lastIndex = citation.endIndex || 0;
      const result = myRegex.exec(explanationWithCitations);
      if (result && citation.uri) {
        explanationWithCitations = explanationWithCitations.slice(0, result.index) + `[^${sortedCitations.length - index}]` + explanationWithCitations.slice(result.index);
        directCitationUrls.push(citation.uri);
      }
    }
    directCitationUrls.reverse();
    return { explanationWithCitations, directCitationUrls };
  }
  #modifyTokensToHandleCitationsInCode(tokens) {
    for (const token of tokens) {
      if (token.type === "code") {
        const matches = token.text.match(/\[\^\d+\]/g);
        token.text = token.text.replace(/\[\^\d+\]/g, "");
        if (matches?.length) {
          const citations = matches.map((match) => {
            const index = parseInt(match.slice(2, -1), 10);
            return {
              index,
              clickHandler: this.#citationClickHandler.bind(this, index)
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
    const relatedUrls = metadata.factualityMetadata.facts.filter((fact) => fact.sourceUri && !directCitationUrls.includes(fact.sourceUri)).map((fact) => fact.sourceUri) || [];
    const trainingDataUrls = metadata.attributionMetadata?.citations.filter((citation) => citation.sourceType === Host.AidaClient.CitationSourceType.TRAINING_DATA && (citation.uri || citation.repository)).map((citation) => citation.uri || `https://www.github.com/${citation.repository}`) || [];
    const dedupedTrainingDataUrls = [...new Set(trainingDataUrls.filter((url) => !relatedUrls.includes(url) && !directCitationUrls.includes(url)))];
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
          type: "insight",
          tokens: valid ? tokens : [],
          validMarkdown: valid,
          explanation,
          sources,
          metadata,
          isPageReloadRecommended,
          completed,
          directCitationUrls,
          relatedUrls
        });
      }
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.InsightGenerated);
    } catch (err) {
      console.error("[ConsoleInsight] Error in #generateInsight:", err);
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.InsightErrored);
      if (err.message === "doAidaConversation timed out" && this.#state.type === "insight") {
        this.#state.timedOut = true;
        this.#transitionTo({ ...this.#state, completed: true, timedOut: true });
      } else {
        this.#transitionTo({
          type: "error",
          error: err.message
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
    } catch {
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
    } catch (err) {
      if (err.message === "Server responded: permission denied") {
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.InsightErroredPermissionDenied);
      } else if (err.message.startsWith("Cannot send request:")) {
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.InsightErroredCannotSend);
      } else if (err.message.startsWith("Request failed:")) {
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.InsightErroredRequestFailed);
      } else if (err.message.startsWith("Cannot parse chunk:")) {
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.InsightErroredCannotParseChunk);
      } else if (err.message === "Unknown chunk result") {
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.InsightErroredUnknownChunk);
      } else if (err.message.startsWith("Server responded:")) {
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.InsightErroredApi);
      } else {
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.InsightErroredOther);
      }
      throw err;
    }
  }
  #onGoToSignIn() {
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.openInNewTab(SIGN_IN_URL);
  }
  #focusHeader() {
    this.addEventListener("animationend", () => {
      this.#shadow.querySelector("header h2")?.focus();
    }, { once: true });
  }
  #onToggleReferenceDetails() {
    if (this.#referenceDetailsRef.value) {
      this.#areReferenceDetailsOpen = this.#referenceDetailsRef.value.open;
    }
  }
  #onDisclaimerSettingsLink() {
    void UI.ViewManager.ViewManager.instance().showView("chrome-ai");
  }
  #onReminderSettingsLink() {
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.InsightsReminderTeaserSettingsLinkClicked);
    void UI.ViewManager.ViewManager.instance().showView("chrome-ai");
  }
  #onEnableInsightsInSettingsLink() {
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.InsightsOptInTeaserSettingsLinkClicked);
    void UI.ViewManager.ViewManager.instance().showView("chrome-ai");
  }
  #render() {
    const input = {
      state: this.#state,
      disableAnimations: this.disableAnimations,
      renderer: this.#renderer,
      selectedRating: this.#selectedRating,
      noLogging: Root.Runtime.hostConfig.aidaAvailability?.enterprisePolicyValue === Root.Runtime.GenAiEnterprisePolicyValue.ALLOW_WITHOUT_LOGGING,
      callbacks: {
        onClose: this.#onClose.bind(this),
        onSearch: this.#onSearch.bind(this),
        onRating: this.#onRating.bind(this),
        onReport: this.#onReport.bind(this),
        onGoToSignIn: this.#onGoToSignIn.bind(this),
        onConsentReminderConfirmed: this.#onConsentReminderConfirmed.bind(this),
        onToggleReferenceDetails: this.#onToggleReferenceDetails.bind(this),
        onDisclaimerSettingsLink: this.#onDisclaimerSettingsLink.bind(this),
        onReminderSettingsLink: this.#onReminderSettingsLink.bind(this),
        onEnableInsightsInSettingsLink: this.#onEnableInsightsInSettingsLink.bind(this)
      }
    };
    const output = {
      referenceDetailsRef: this.#referenceDetailsRef
    };
    const { state, noLogging, callbacks } = input;
    const { onClose, onDisclaimerSettingsLink } = callbacks;
    const jslog = `${VisualLogging.section(state.type).track({ resize: true })}`;
    let header = Lit.nothing;
    let main = Lit.nothing;
    const mainClasses = {};
    let footer;
    switch (state.type) {
      case "loading":
        header = renderHeader({ headerText: i18nString(UIStrings.generating), onClose });
        main = renderLoading();
        break;
      case "insight":
        header = renderHeader({ headerText: i18nString(UIStrings.insight), onClose, showSpinner: !state.completed });
        main = renderInsight(state, input.renderer, input.disableAnimations, callbacks, output);
        footer = renderInsightFooter(noLogging, input.selectedRating, callbacks);
        break;
      case "error":
        header = renderHeader({ headerText: i18nString(UIStrings.error), onClose });
        main = renderError(i18nString(UIStrings.errorBody));
        footer = renderDisclaimerFooter(noLogging, onDisclaimerSettingsLink);
        break;
      case "consent-reminder":
        header = renderHeader({ headerText: "Understand console messages with AI", onClose, showIcon: true });
        mainClasses["reminder-container"] = true;
        main = renderConsentReminder(noLogging);
        footer = renderConsentReminderFooter(callbacks.onReminderSettingsLink, callbacks.onConsentReminderConfirmed);
        break;
      case "setting-is-not-true":
        mainClasses["opt-in-teaser"] = true;
        main = renderSettingIsNotTrue(callbacks.onEnableInsightsInSettingsLink);
        break;
      case "not-logged-in":
      case "sync-is-paused":
        header = renderHeader({ headerText: i18nString(UIStrings.signInToUse), onClose });
        main = renderNotLoggedIn();
        footer = renderSignInFooter(callbacks.onGoToSignIn);
        break;
      case "offline":
        header = renderHeader({ headerText: i18nString(UIStrings.offlineHeader), onClose });
        main = renderError(i18nString(UIStrings.offline));
        footer = renderDisclaimerFooter(noLogging, onDisclaimerSettingsLink);
        break;
    }
    render(html`
      <style>${consoleInsight_css_default}</style>
      <style>${Input.checkboxStyles}</style>
      <div class="wrapper" jslog=${VisualLogging.pane("console-insights").track({ resize: true })}>
        <div class="animation-wrapper">
          ${header}
          <main jslog=${jslog} class=${Directives2.classMap(mainClasses)}>
            ${main}
          </main>
          ${footer ? html`<footer jslog=${VisualLogging.section("footer")}>
            ${footer}
          </footer>` : Lit.nothing}
        </div>
      </div>
    `, this.#shadow, {
      host: this
    });
    if (this.#referenceDetailsRef.value) {
      this.#referenceDetailsRef.value.open = this.#areReferenceDetailsOpen;
    }
  }
};
var ConsoleInsightSourcesList = class extends HTMLElement {
  #shadow = this.attachShadow({ mode: "open" });
  #sources = [];
  #isPageReloadRecommended = false;
  #render() {
    render(html`
      <style>${consoleInsightSourcesList_css_default}</style>
      <style>${Input.checkboxStyles}</style>
      <ul>
        ${Directives2.repeat(this.#sources, (item) => item.value, (item) => {
      return html`<li><x-link class="link" title="${localizeType(item.type)} ${i18nString(UIStrings.opensInNewTab)}" href="data:text/plain;charset=utf-8,${encodeURIComponent(item.value)}" jslog=${VisualLogging.link("source-" + item.type).track({ click: true })}>
            <devtools-icon name="open-externally"></devtools-icon>
            ${localizeType(item.type)}
          </x-link></li>`;
    })}
        ${this.#isPageReloadRecommended ? html`<li class="source-disclaimer">
          <devtools-icon name="warning"></devtools-icon>
          ${i18nString(UIStrings.reloadRecommendation)}</li>` : Lit.nothing}
      </ul>
    `, this.#shadow, {
      host: this
    });
  }
  set sources(values) {
    this.#sources = values;
    this.#render();
  }
  set isPageReloadRecommended(isPageReloadRecommended) {
    this.#isPageReloadRecommended = isPageReloadRecommended;
    this.#render();
  }
};
customElements.define("devtools-console-insight", ConsoleInsight);
customElements.define("devtools-console-insight-sources-list", ConsoleInsightSourcesList);

// gen/front_end/panels/explain/ActionDelegate.js
import * as Host2 from "./../../core/host/host.js";
import * as Console2 from "./../console/console.js";
var ActionDelegate = class {
  handleAction(context, actionId) {
    switch (actionId) {
      case "explain.console-message.context":
      case "explain.console-message.context.error":
      case "explain.console-message.context.warning":
      case "explain.console-message.context.other":
      case "explain.console-message.teaser":
      case "explain.console-message.hover": {
        const consoleViewMessage = context.flavor(Console2.ConsoleViewMessage.ConsoleViewMessage);
        if (consoleViewMessage) {
          if (actionId.startsWith("explain.console-message.context")) {
            Host2.userMetrics.actionTaken(Host2.UserMetrics.Action.InsightRequestedViaContextMenu);
          } else if (actionId === "explain.console-message.teaser") {
            Host2.userMetrics.actionTaken(Host2.UserMetrics.Action.InsightRequestedViaTeaser);
          } else if (actionId === "explain.console-message.hover") {
            Host2.userMetrics.actionTaken(Host2.UserMetrics.Action.InsightRequestedViaHoverButton);
          }
          const promptBuilder = new Console2.PromptBuilder.PromptBuilder(consoleViewMessage);
          const aidaClient = new Host2.AidaClient.AidaClient();
          void ConsoleInsight.create(promptBuilder, aidaClient).then((insight) => {
            consoleViewMessage.setInsight(insight);
          });
          return true;
        }
        return false;
      }
    }
    return false;
  }
};
export {
  ActionDelegate,
  CloseEvent,
  ConsoleInsight
};
//# sourceMappingURL=explain.js.map
