// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../ui/components/spinners/spinners.js';
import '../../ui/components/tooltips/tooltips.js';
import '../../ui/kit/kit.js';

import type * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as UI from '../../ui/legacy/legacy.js';
import {Directives, html, nothing, render} from '../../ui/lit/lit.js';

import {AiCodeCompletionDisclaimer, type DisclaimerTextVariant} from './AiCodeCompletionDisclaimer.js';
import styles from './aiCodeCompletionSummaryToolbar.css.js';

const UIStringsNotTranslate = {
  /**
   * @description Text for recitation notice
   */
  generatedCodeMayBeSubjectToALicense: 'Generated code may be subject to a license.',
  /**
   * @description Text for citations
   */
  viewSources: 'View Sources',
} as const;

const lockedString = i18n.i18n.lockedString;
const {widget} = UI.Widget;

export interface AiCodeCompletionSummaryToolbarProps {
  citationsTooltipId: string;
  disclaimerTooltipId?: string;
  spinnerTooltipId?: string;
  hasTopBorder?: boolean;
  disclaimerTextVariant?: DisclaimerTextVariant;
}

export interface ViewInput {
  disclaimerTooltipId?: string;
  spinnerTooltipId?: string;
  citations?: Set<string>;
  citationsTooltipId: string;
  loading: boolean;
  hasTopBorder: boolean;
  aidaAvailability?: Host.AidaClient.AidaAccessPreconditions;
  disclaimerTextVariant?: DisclaimerTextVariant;
}

export type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;

export const DEFAULT_SUMMARY_TOOLBAR_VIEW: View = (input, _output, target) => {
  if (input.aidaAvailability !== Host.AidaClient.AidaAccessPreconditions.AVAILABLE) {
    render(nothing, target);
    return;
  }
  const toolbarClasses = Directives.classMap({
    'ai-code-completion-summary-toolbar': true,
    'has-disclaimer': Boolean(input.disclaimerTooltipId),
    'has-recitation-notice': Boolean(input.citations && input.citations.size > 0),
    'has-top-border': input.hasTopBorder,
  });

  // clang-format off
  const disclaimer = input.disclaimerTooltipId && input.spinnerTooltipId ?
    html`<devtools-widget
            ${widget(AiCodeCompletionDisclaimer, {
      disclaimerTooltipId: input.disclaimerTooltipId,
      spinnerTooltipId: input.spinnerTooltipId,
      loading: input.loading,
      disclaimerTextVariant: input.disclaimerTextVariant,
    })} class="disclaimer-widget"></devtools-widget>` : nothing;

  const recitationNotice = input.citations && input.citations.size > 0 ?
    html`<div class="ai-code-completion-recitation-notice">
                ${lockedString(UIStringsNotTranslate.generatedCodeMayBeSubjectToALicense)}
                <span class="link"
                    role="link"
                    aria-details=${input.citationsTooltipId}
                    aria-describedby=${input.citationsTooltipId}
                    tabIndex="0">
                  ${lockedString(UIStringsNotTranslate.viewSources)}&nbsp;${lockedString('(' + input.citations.size + ')')}
                </span>
                <devtools-tooltip
                    id=${input.citationsTooltipId}
                    variant="rich"
                    jslogContext="ai-code-completion-citations"
                ><div class="citations-tooltip-container">
                    ${Directives.repeat(input.citations, citation => html`<devtools-link
                        tabIndex="0"
                        href=${citation}
                        jslogcontext="ai-code-completion-citations.citation-link">${citation}</devtools-link>`)}</div></devtools-tooltip>
            </div>` : nothing;

  render(
    html`
        <style>${styles}</style>
        <div class=${toolbarClasses}>
          ${disclaimer}
          ${recitationNotice}
        </div>
        `, target);
  // clang-format on
};

export class AiCodeCompletionSummaryToolbar extends UI.Widget.Widget {
  readonly #view: View;

  #disclaimerTooltipId?: string;
  #spinnerTooltipId?: string;
  #citationsTooltipId: string;
  #citations = new Set<string>();
  #loading = false;
  #hasTopBorder = false;
  #disclaimerTextVariant?: DisclaimerTextVariant;

  #aidaAvailability?: Host.AidaClient.AidaAccessPreconditions;
  #boundOnAidaAvailabilityChange:
      (ev: Common.EventTarget.EventTargetEvent<Host.AidaClient.AidaAccessPreconditions>) => void;

  constructor(props: AiCodeCompletionSummaryToolbarProps, view?: View) {
    super();
    this.#disclaimerTooltipId = props.disclaimerTooltipId;
    this.#spinnerTooltipId = props.spinnerTooltipId;
    this.#citationsTooltipId = props.citationsTooltipId;
    this.#hasTopBorder = props.hasTopBorder ?? false;
    this.#disclaimerTextVariant = props.disclaimerTextVariant;
    this.#boundOnAidaAvailabilityChange = this.#onAidaAvailabilityChange.bind(this);
    this.#view = view ?? DEFAULT_SUMMARY_TOOLBAR_VIEW;
    this.requestUpdate();
  }

  #updateAidaAvailability(aidaAvailability: Host.AidaClient.AidaAccessPreconditions): void {
    if (aidaAvailability !== this.#aidaAvailability) {
      this.#aidaAvailability = aidaAvailability;
      this.requestUpdate();
    }
  }

  #onAidaAvailabilityChange(ev: Common.EventTarget.EventTargetEvent<Host.AidaClient.AidaAccessPreconditions>): void {
    this.#updateAidaAvailability(ev.data);
  }

  setLoading(loading: boolean): void {
    this.#loading = loading;
    this.requestUpdate();
  }

  updateCitations(citations: string[]): void {
    citations.forEach(citation => this.#citations.add(citation));
    this.requestUpdate();
  }

  clearCitations(): void {
    this.#citations.clear();
    this.requestUpdate();
  }

  override performUpdate(): void {
    this.#view({
      disclaimerTooltipId: this.#disclaimerTooltipId,
      spinnerTooltipId: this.#spinnerTooltipId,
      citations: this.#citations,
      citationsTooltipId: this.#citationsTooltipId,
      loading: this.#loading,
      hasTopBorder: this.#hasTopBorder,
      aidaAvailability: this.#aidaAvailability,
      disclaimerTextVariant: this.#disclaimerTextVariant,
    },
               undefined, this.contentElement);
  }

  override wasShown(): void {
    super.wasShown();
    Host.AidaClient.HostConfigTracker.instance().addEventListener(
        Host.AidaClient.Events.AIDA_AVAILABILITY_CHANGED, this.#boundOnAidaAvailabilityChange);
    const initialAvailability = Host.AidaClient.HostConfigTracker.instance().aidaAvailability;
    if (initialAvailability !== undefined) {
      this.#updateAidaAvailability(initialAvailability);
    }
  }

  override willHide(): void {
    super.willHide();
    Host.AidaClient.HostConfigTracker.instance().removeEventListener(
        Host.AidaClient.Events.AIDA_AVAILABILITY_CHANGED, this.#boundOnAidaAvailabilityChange);
  }
}
