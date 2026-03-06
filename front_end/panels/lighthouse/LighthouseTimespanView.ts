// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */

import * as i18n from '../../core/i18n/i18n.js';
import * as Geometry from '../../models/geometry/geometry.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as UI from '../../ui/legacy/legacy.js';
import {Directives, html, render} from '../../ui/lit/lit.js';

import lighthouseDialogStyles from './lighthouseDialog.css.js';
import type {LighthousePanel} from './LighthousePanel.js';

const UIStrings = {
  /**
   * @description Header indicating that a Lighthouse timespan is starting. "Timespan" is a Lighthouse mode that analyzes user interactions over a period of time.
   */
  timespanStarting: 'Timespan starting…',
  /**
   * @description Header indicating that a Lighthouse timespan has started. "Timespan" is a Lighthouse mode that analyzes user interactions over a period of time. "interact with the page" is a call to action for the user to interact with the web page.
   */
  timespanStarted: 'Timespan started',
  /**
   * @description Call to action for the user to interact with the web page.
   */
  interactWithPage: 'Interact with the page.',
  /**
   * @description Label for a button that ends a Lighthouse timespan. "timespan" is a Lighthouse mode that analyzes user interactions over a period of time.
   */
  endTimespan: 'End timespan',
  /**
   * @description Label for a button that cancels a Lighthouse timespan.
   */
  cancel: 'Cancel',
} as const;

const str_ = i18n.i18n.registerUIStrings('panels/lighthouse/LighthouseTimespanView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

const renderTimespanView = (
    input: {
      cancelButton: Element,
      endButton: Element,
    },
    output: {
      statusHeader?: HTMLElement,
      contentContainer?: HTMLElement,
    },
    target: ShadowRoot,
    ): void => {
  // clang-format off
  render(
    html`
      <div class="lighthouse-view vbox">
        <span
          ${Directives.ref(e => {
            output.statusHeader = e as HTMLElement;
          })}
          class="header"
        ></span>
        <span
          ${Directives.ref(e => {
            output.contentContainer = e as HTMLElement;
          })}
          class="lighthouse-dialog-text"
        ></span>
        <div class="lighthouse-action-buttons hbox">
          ${input.cancelButton} ${input.endButton}
        </div>
      </div>
    `,
    target,
  );
  // clang-format on
};

export class TimespanView extends UI.Dialog.Dialog {
  private panel: LighthousePanel;
  private statusHeader: Element|null;
  private contentContainer: Element|null;
  private endButton: Buttons.Button.Button|null;

  constructor(panel: LighthousePanel) {
    super();
    this.panel = panel;
    this.statusHeader = null;
    this.contentContainer = null;
    this.endButton = null;
    this.setDimmed(true);
    this.setCloseOnEscape(false);
    this.setOutsideClickCallback(event => event.consume(true));
    this.render();
  }

  override show(dialogRenderElement: Element): void {
    this.reset();
    super.show(dialogRenderElement);
  }

  reset(): void {
    if (this.statusHeader && this.contentContainer && this.endButton) {
      this.statusHeader.textContent = i18nString(UIStrings.timespanStarting);
      this.contentContainer.textContent = '';
      this.endButton.disabled = true;
    }
  }

  ready(): void {
    if (this.statusHeader && this.contentContainer && this.endButton) {
      this.statusHeader.textContent = i18nString(UIStrings.timespanStarted);
      this.contentContainer.textContent = i18nString(UIStrings.interactWithPage);
      this.endButton.disabled = false;
      this.endButton.focus();
    }
  }

  render(): void {
    const dialogRoot =
        UI.UIUtils.createShadowRootWithCoreStyles(this.contentElement, {cssFile: lighthouseDialogStyles});

    this.endButton = UI.UIUtils.createTextButton(
        i18nString(UIStrings.endTimespan),
        this.endTimespan.bind(this),
        {variant: Buttons.Button.Variant.PRIMARY, jslogContext: 'lighthouse.end-time-span', className: 'end-timespan'},
    );
    const cancelButton = UI.UIUtils.createTextButton(i18nString(UIStrings.cancel), this.cancel.bind(this), {
      className: 'cancel',
      jslogContext: 'lighthouse.cancel',
    });

    const output = {
      statusHeader: undefined as HTMLElement | undefined,
      contentContainer: undefined as HTMLElement | undefined,
    };

    renderTimespanView(
        {
          cancelButton,
          endButton: this.endButton,
        },
        output, dialogRoot);

    this.statusHeader = output.statusHeader ?? null;
    this.contentContainer = output.contentContainer ?? null;

    this.setSizeBehavior(UI.GlassPane.SizeBehavior.SET_EXACT_WIDTH_MAX_HEIGHT);
    this.setMaxContentSize(new Geometry.Size(500, 400));
    this.reset();
  }

  private async endTimespan(): Promise<void> {
    await this.panel.handleTimespanEnd();
  }

  private async cancel(): Promise<void> {
    await this.panel.handleRunCancel();
  }
}
