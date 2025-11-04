// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../../core/common/common.js';
import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as Input from '../../../ui/components/input/input.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';
import userActionRowStyles from './userActionRow.css.js';
const { html, Directives: { ref } } = Lit;
/*
* Strings that don't need to be translated at this time.
*/
const UIStringsNotTranslate = {
    /**
     * @description The title of the button that allows submitting positive
     * feedback about the response for AI assistance.
     */
    thumbsUp: 'Good response',
    /**
     * @description The title of the button that allows submitting negative
     * feedback about the response for AI assistance.
     */
    thumbsDown: 'Bad response',
    /**
     * @description The placeholder text for the feedback input.
     */
    provideFeedbackPlaceholder: 'Provide additional feedback',
    /**
     * @description The disclaimer text that tells the user what will be shared
     * and what will be stored.
     */
    disclaimer: 'Submitted feedback will also include your conversation',
    /**
     * @description The button text for the action of submitting feedback.
     */
    submit: 'Submit',
    /**
     * @description The header of the feedback form asking.
     */
    whyThisRating: 'Why did you choose this rating? (optional)',
    /**
     * @description The button text for the action that hides the feedback form.
     */
    close: 'Close',
    /**
     * @description The title of the button that opens a page to report a legal
     * issue with the AI assistance message.
     */
    report: 'Report legal issue',
    /**
     * @description The title of the button for scrolling to see next suggestions
     */
    scrollToNext: 'Scroll to next suggestions',
    /**
     * @description The title of the button for scrolling to see previous suggestions
     */
    scrollToPrevious: 'Scroll to previous suggestions',
    /**
     * @description The title of the button that copies the AI-generated response to the clipboard.
     */
    copyResponse: 'Copy response',
};
const lockedString = i18n.i18n.lockedString;
const REPORT_URL = 'https://support.google.com/legal/troubleshooter/1114905?hl=en#ts=1115658%2C13380504';
const SCROLL_ROUNDING_OFFSET = 1;
export const DEFAULT_VIEW = (input, output, target) => {
    // clang-format off
    Lit.render(html `
    <style>${Input.textInputStyles}</style>
    <style>${userActionRowStyles}</style>
    <div class="ai-assistance-feedback-row">
      <div class="action-buttons">
        ${input.showRateButtons ? html `
          <devtools-button
            .data=${{
        variant: "icon" /* Buttons.Button.Variant.ICON */,
        size: "SMALL" /* Buttons.Button.Size.SMALL */,
        iconName: 'thumb-up',
        toggledIconName: 'thumb-up-filled',
        toggled: input.currentRating === "POSITIVE" /* Host.AidaClient.Rating.POSITIVE */,
        toggleType: "primary-toggle" /* Buttons.Button.ToggleType.PRIMARY */,
        title: lockedString(UIStringsNotTranslate.thumbsUp),
        jslogContext: 'thumbs-up',
    }}
            @click=${() => input.onRatingClick("POSITIVE" /* Host.AidaClient.Rating.POSITIVE */)}
          ></devtools-button>
          <devtools-button
            .data=${{
        variant: "icon" /* Buttons.Button.Variant.ICON */,
        size: "SMALL" /* Buttons.Button.Size.SMALL */,
        iconName: 'thumb-down',
        toggledIconName: 'thumb-down-filled',
        toggled: input.currentRating === "NEGATIVE" /* Host.AidaClient.Rating.NEGATIVE */,
        toggleType: "primary-toggle" /* Buttons.Button.ToggleType.PRIMARY */,
        title: lockedString(UIStringsNotTranslate.thumbsDown),
        jslogContext: 'thumbs-down',
    }}
            @click=${() => input.onRatingClick("NEGATIVE" /* Host.AidaClient.Rating.NEGATIVE */)}
          ></devtools-button>
          <div class="vertical-separator"></div>
        ` : Lit.nothing}
        <devtools-button
          .data=${{
        variant: "icon" /* Buttons.Button.Variant.ICON */,
        size: "SMALL" /* Buttons.Button.Size.SMALL */,
        title: lockedString(UIStringsNotTranslate.report),
        iconName: 'report',
        jslogContext: 'report',
    }}
          @click=${input.onReportClick}
        ></devtools-button>
        <div class="vertical-separator"></div>
          <devtools-button
            .data=${{
        variant: "icon" /* Buttons.Button.Variant.ICON */,
        size: "SMALL" /* Buttons.Button.Size.SMALL */,
        title: lockedString(UIStringsNotTranslate.copyResponse),
        iconName: 'copy',
        jslogContext: 'copy-ai-response',
    }}
            aria-label=${lockedString(UIStringsNotTranslate.copyResponse)}
            @click=${input.onCopyResponseClick}></devtools-button>
      </div>
      ${input.suggestions ? html `<div class="suggestions-container">
        <div class="scroll-button-container left hidden" ${ref(element => { output.suggestionsLeftScrollButtonContainer = element; })}>
          <devtools-button
            class='scroll-button'
            .data=${{
        variant: "icon" /* Buttons.Button.Variant.ICON */,
        size: "SMALL" /* Buttons.Button.Size.SMALL */,
        iconName: 'chevron-left',
        title: lockedString(UIStringsNotTranslate.scrollToPrevious),
        jslogContext: 'chevron-left',
    }}
            @click=${() => input.scrollSuggestionsScrollContainer('left')}
          ></devtools-button>
        </div>
        <div class="suggestions-scroll-container" @scroll=${input.onSuggestionsScrollOrResize} ${ref(element => { output.suggestionsScrollContainer = element; })}>
          ${input.suggestions.map(suggestion => html `<devtools-button
            class='suggestion'
            .data=${{
        variant: "outlined" /* Buttons.Button.Variant.OUTLINED */,
        title: suggestion,
        jslogContext: 'suggestion',
    }}
            @click=${() => input.onSuggestionClick(suggestion)}
          >${suggestion}</devtools-button>`)}
        </div>
        <div class="scroll-button-container right hidden" ${ref(element => { output.suggestionsRightScrollButtonContainer = element; })}>
          <devtools-button
            class='scroll-button'
            .data=${{
        variant: "icon" /* Buttons.Button.Variant.ICON */,
        size: "SMALL" /* Buttons.Button.Size.SMALL */,
        iconName: 'chevron-right',
        title: lockedString(UIStringsNotTranslate.scrollToNext),
        jslogContext: 'chevron-right',
    }}
            @click=${() => input.scrollSuggestionsScrollContainer('right')}
          ></devtools-button>
        </div>
      </div>` : Lit.nothing}
    </div>
    ${input.isShowingFeedbackForm ? html `
      <form class="feedback-form" @submit=${input.onSubmit}>
        <div class="feedback-header">
          <h4 class="feedback-title">${lockedString(UIStringsNotTranslate.whyThisRating)}</h4>
          <devtools-button
            aria-label=${lockedString(UIStringsNotTranslate.close)}
            @click=${input.onClose}
            .data=${{
        variant: "icon" /* Buttons.Button.Variant.ICON */,
        iconName: 'cross',
        size: "SMALL" /* Buttons.Button.Size.SMALL */,
        title: lockedString(UIStringsNotTranslate.close),
        jslogContext: 'close',
    }}
          ></devtools-button>
        </div>
        <input
          type="text"
          class="devtools-text-input feedback-input"
          @input=${(event) => input.onInputChange(event.target.value)}
          placeholder=${lockedString(UIStringsNotTranslate.provideFeedbackPlaceholder)}
          jslog=${VisualLogging.textField('feedback').track({ keydown: 'Enter' })}
        >
        <span class="feedback-disclaimer">${lockedString(UIStringsNotTranslate.disclaimer)}</span>
        <div>
          <devtools-button
          aria-label=${lockedString(UIStringsNotTranslate.submit)}
          .data=${{
        type: 'submit',
        disabled: input.isSubmitButtonDisabled,
        variant: "outlined" /* Buttons.Button.Variant.OUTLINED */,
        size: "SMALL" /* Buttons.Button.Size.SMALL */,
        title: lockedString(UIStringsNotTranslate.submit),
        jslogContext: 'send',
    }}
          >${lockedString(UIStringsNotTranslate.submit)}</devtools-button>
        </div>
      </div>
    </form>
    ` : Lit.nothing}
  `, target);
    // clang-format on
};
/**
 * This presenter has too many responsibilities (rating buttons, feedback
 * form, suggestions).
 */
export class UserActionRow extends UI.Widget.Widget {
    showRateButtons = false;
    onFeedbackSubmit = () => { };
    suggestions;
    onCopyResponseClick = () => { };
    onSuggestionClick = () => { };
    canShowFeedbackForm = false;
    #suggestionsResizeObserver = new ResizeObserver(() => this.#handleSuggestionsScrollOrResize());
    #suggestionsEvaluateLayoutThrottler = new Common.Throttler.Throttler(50);
    #feedbackValue = '';
    #currentRating;
    #isShowingFeedbackForm = false;
    #isSubmitButtonDisabled = true;
    #view;
    #viewOutput = {};
    constructor(element, view) {
        super(element);
        this.#view = view ?? DEFAULT_VIEW;
    }
    wasShown() {
        super.wasShown();
        void this.performUpdate();
        this.#evaluateSuggestionsLayout();
        if (this.#viewOutput.suggestionsScrollContainer) {
            this.#suggestionsResizeObserver.observe(this.#viewOutput.suggestionsScrollContainer);
        }
    }
    performUpdate() {
        this.#view({
            onSuggestionClick: this.onSuggestionClick,
            onRatingClick: this.#handleRateClick.bind(this),
            onReportClick: () => UI.UIUtils.openInNewTab(REPORT_URL),
            onCopyResponseClick: this.onCopyResponseClick,
            scrollSuggestionsScrollContainer: this.#scrollSuggestionsScrollContainer.bind(this),
            onSuggestionsScrollOrResize: this.#handleSuggestionsScrollOrResize.bind(this),
            onSubmit: this.#handleSubmit.bind(this),
            onClose: this.#handleClose.bind(this),
            onInputChange: this.#handleInputChange.bind(this),
            isSubmitButtonDisabled: this.#isSubmitButtonDisabled,
            showRateButtons: this.showRateButtons,
            suggestions: this.suggestions,
            currentRating: this.#currentRating,
            isShowingFeedbackForm: this.#isShowingFeedbackForm,
        }, this.#viewOutput, this.contentElement);
    }
    #handleInputChange(value) {
        this.#feedbackValue = value;
        const disableSubmit = !value;
        if (disableSubmit !== this.#isSubmitButtonDisabled) {
            this.#isSubmitButtonDisabled = disableSubmit;
            void this.performUpdate();
        }
    }
    #evaluateSuggestionsLayout = () => {
        const suggestionsScrollContainer = this.#viewOutput.suggestionsScrollContainer;
        const leftScrollButtonContainer = this.#viewOutput.suggestionsLeftScrollButtonContainer;
        const rightScrollButtonContainer = this.#viewOutput.suggestionsRightScrollButtonContainer;
        if (!suggestionsScrollContainer || !leftScrollButtonContainer || !rightScrollButtonContainer) {
            return;
        }
        const shouldShowLeftButton = suggestionsScrollContainer.scrollLeft > SCROLL_ROUNDING_OFFSET;
        const shouldShowRightButton = suggestionsScrollContainer.scrollLeft +
            suggestionsScrollContainer.offsetWidth + SCROLL_ROUNDING_OFFSET <
            suggestionsScrollContainer.scrollWidth;
        leftScrollButtonContainer.classList.toggle('hidden', !shouldShowLeftButton);
        rightScrollButtonContainer.classList.toggle('hidden', !shouldShowRightButton);
    };
    willHide() {
        super.willHide();
        this.#suggestionsResizeObserver.disconnect();
    }
    #handleSuggestionsScrollOrResize() {
        void this.#suggestionsEvaluateLayoutThrottler.schedule(() => {
            this.#evaluateSuggestionsLayout();
            return Promise.resolve();
        });
    }
    #scrollSuggestionsScrollContainer(direction) {
        const suggestionsScrollContainer = this.#viewOutput.suggestionsScrollContainer;
        if (!suggestionsScrollContainer) {
            return;
        }
        suggestionsScrollContainer.scroll({
            top: 0,
            left: direction === 'left' ? suggestionsScrollContainer.scrollLeft - suggestionsScrollContainer.clientWidth :
                suggestionsScrollContainer.scrollLeft + suggestionsScrollContainer.clientWidth,
            behavior: 'smooth',
        });
    }
    #handleRateClick(rating) {
        if (this.#currentRating === rating) {
            this.#currentRating = undefined;
            this.#isShowingFeedbackForm = false;
            this.#isSubmitButtonDisabled = true;
            // This effectively reset the user rating
            this.onFeedbackSubmit("SENTIMENT_UNSPECIFIED" /* Host.AidaClient.Rating.SENTIMENT_UNSPECIFIED */);
            void this.performUpdate();
            return;
        }
        this.#currentRating = rating;
        this.#isShowingFeedbackForm = this.canShowFeedbackForm;
        this.onFeedbackSubmit(rating);
        void this.performUpdate();
    }
    #handleClose() {
        this.#isShowingFeedbackForm = false;
        this.#isSubmitButtonDisabled = true;
        void this.performUpdate();
    }
    #handleSubmit(ev) {
        ev.preventDefault();
        const input = this.#feedbackValue;
        if (!this.#currentRating || !input) {
            return;
        }
        this.onFeedbackSubmit(this.#currentRating, input);
        this.#isShowingFeedbackForm = false;
        this.#isSubmitButtonDisabled = true;
        void this.performUpdate();
    }
}
//# sourceMappingURL=UserActionRow.js.map