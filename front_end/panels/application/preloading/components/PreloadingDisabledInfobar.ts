// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../../../ui/components/report_view/report_view.js';

import * as i18n from '../../../../core/i18n/i18n.js';
import type * as Platform from '../../../../core/platform/platform.js';
import type * as Protocol from '../../../../generated/protocol.js';
import * as Buttons from '../../../../ui/components/buttons/buttons.js';
import * as ChromeLink from '../../../../ui/components/chrome_link/chrome_link.js';
import * as Dialogs from '../../../../ui/components/dialogs/dialogs.js';
import * as LegacyWrapper from '../../../../ui/components/legacy_wrapper/legacy_wrapper.js';
import * as RenderCoordinator from '../../../../ui/components/render_coordinator/render_coordinator.js';
import * as UI from '../../../../ui/legacy/legacy.js';
import * as Lit from '../../../../ui/lit/lit.js';
import * as VisualLogging from '../../../../ui/visual_logging/visual_logging.js';

import preloadingDisabledInfobarStylesRaw from './preloadingDisabledInfobar.css.js';

// TODO(crbug.com/391381439): Fully migrate off of constructed style sheets.
const preloadingDisabledInfobarStyles = new CSSStyleSheet();
preloadingDisabledInfobarStyles.replaceSync(preloadingDisabledInfobarStylesRaw.cssContent);

const {html} = Lit;

const UIStrings = {
  /**
   *@description Infobar text for disabled case
   */
  infobarPreloadingIsDisabled: 'Speculative loading is disabled',
  /**
   *@description Infobar text for force-enabled case
   */
  infobarPreloadingIsForceEnabled: 'Speculative loading is force-enabled',
  /**
   *@description Title for dialog
   */
  titleReasonsPreventingPreloading: 'Reasons preventing speculative loading',
  /**
   *@description Header in dialog
   */
  headerDisabledByPreference: 'User settings or extensions',
  /**
   *@description Description in dialog
   *@example {Preload pages settings (linked to chrome://settings/performance)} PH1
   *@example {Extensions settings (linked to chrome://extensions)} PH2
   */
  descriptionDisabledByPreference:
      'Speculative loading is disabled because of user settings or an extension. Go to {PH1} to update your preference. Go to {PH2} to disable any extension that blocks speculative loading.',
  /**
   *@description Text of link
   */
  preloadingPagesSettings: 'Preload pages settings',
  /**
   *@description Text of link
   */
  extensionsSettings: 'Extensions settings',
  /**
   *@description Header in dialog
   */
  headerDisabledByDataSaver: 'Data Saver',
  /**
   *@description Description in dialog
   */
  descriptionDisabledByDataSaver: 'Speculative loading is disabled because of the operating system\'s Data Saver mode.',
  /**
   *@description Header in dialog
   */
  headerDisabledByBatterySaver: 'Battery Saver',
  /**
   *@description Description in dialog
   */
  descriptionDisabledByBatterySaver:
      'Speculative loading is disabled because of the operating system\'s Battery Saver mode.',
  /**
   *@description Header in dialog
   */
  headerDisabledByHoldbackPrefetchSpeculationRules: 'Prefetch was disabled, but is force-enabled now',
  /**
   *@description Description in infobar
   */
  descriptionDisabledByHoldbackPrefetchSpeculationRules:
      'Prefetch is forced-enabled because DevTools is open. When DevTools is closed, prefetch will be disabled because this browser session is part of a holdback group used for performance comparisons.',
  /**
   *@description Header in dialog
   */
  headerDisabledByHoldbackPrerenderSpeculationRules: 'Prerendering was disabled, but is force-enabled now',
  /**
   *@description Description in infobar
   */
  descriptionDisabledByHoldbackPrerenderSpeculationRules:
      'Prerendering is forced-enabled because DevTools is open. When DevTools is closed, prerendering will be disabled because this browser session is part of a holdback group used for performance comparisons.',
  /**
   *@description Footer link for more details
   */
  footerLearnMore: 'Learn more',
} as const;
const str_ =
    i18n.i18n.registerUIStrings('panels/application/preloading/components/PreloadingDisabledInfobar.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class PreloadingDisabledInfobar extends LegacyWrapper.LegacyWrapper.WrappableComponent<UI.Widget.VBox> {

  readonly #shadow = this.attachShadow({mode: 'open'});
  #data: Protocol.Preload.PreloadEnabledStateUpdatedEvent = {
    disabledByPreference: false,
    disabledByDataSaver: false,
    disabledByBatterySaver: false,
    disabledByHoldbackPrefetchSpeculationRules: false,
    disabledByHoldbackPrerenderSpeculationRules: false,
  };

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [preloadingDisabledInfobarStyles];
    void this.#render();
  }

  set data(data: Protocol.Preload.PreloadEnabledStateUpdatedEvent) {
    this.#data = data;
    void this.#render();
  }

  async #render(): Promise<void> {
    await RenderCoordinator.write('PreloadingDisabledInfobar render', () => {
      Lit.render(this.#renderInternal(), this.#shadow, {host: this});
    });
  }

  #renderInternal(): Lit.LitTemplate {
    const forceEnabled =
        this.#data.disabledByHoldbackPrefetchSpeculationRules || this.#data.disabledByHoldbackPrerenderSpeculationRules;
    const disabled =
        this.#data.disabledByPreference || this.#data.disabledByDataSaver || this.#data.disabledByBatterySaver;

    let header;
    if (disabled) {
      header = i18nString(UIStrings.infobarPreloadingIsDisabled);
    } else if (forceEnabled) {
      header = i18nString(UIStrings.infobarPreloadingIsForceEnabled);
    } else {
      return Lit.nothing;
    }

    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    return html`
      <div id='container'>
        <span id='header'>
          ${header}
        </span>

        <devtools-button-dialog
          .data=${{
            iconName: 'info',
            variant: Buttons.Button.Variant.ICON,
            closeButton: true,
            position: Dialogs.Dialog.DialogVerticalPosition.AUTO,
            horizontalAlignment: Dialogs.Dialog.DialogHorizontalAlignment.AUTO,
            closeOnESC: true,
            closeOnScroll: false,
            dialogTitle: i18nString(UIStrings.titleReasonsPreventingPreloading),
          } as Dialogs.ButtonDialog.ButtonDialogData}
          jslog=${VisualLogging.dialog('preloading-disabled').track({resize: true, keydown: 'Escape'})}
        >
          ${this.#dialogContents()}
        </devtools-button-dialog>
      </div>
    `;
    // clang-format on
  }

  #dialogContents(): Lit.LitTemplate {
    const LINK = 'https://developer.chrome.com/blog/prerender-pages/';

    const learnMoreLink =
        UI.XLink.XLink.create(LINK, i18nString(UIStrings.footerLearnMore), undefined, undefined, 'learn-more');
    const iconLink = UI.Fragment.html`
      <x-link class="icon-link devtools-link" tabindex="0" href="${LINK}"></x-link>
    ` as UI.XLink.XLink;

    return html`
      <div id='contents'>
        <devtools-report>
          ${this.#maybeDisalebByPreference()}
          ${this.#maybeDisalebByDataSaver()}
          ${this.#maybeDisalebByBatterySaver()}
          ${this.#maybeDisalebByHoldbackPrefetchSpeculationRules()}
          ${this.#maybeDisalebByHoldbackPrerenderSpeculationRules()}
        </devtools-report>
        <div id='footer'>
          ${learnMoreLink}
          ${iconLink}
        </div>
      </div>
    `;
  }

  #maybeKeyValue(shouldShow: boolean, header: string, description: string|Element): Lit.LitTemplate {
    if (!shouldShow) {
      return Lit.nothing;
    }

    return html`
      <div class='key'>
        ${header}
      </div>
      <div class='value'>
        ${description}
      </div>
    `;
  }

  #maybeDisalebByPreference(): Lit.LitTemplate {
    const preloadingSettingLink = new ChromeLink.ChromeLink.ChromeLink();
    preloadingSettingLink.href = 'chrome://settings/performance' as Platform.DevToolsPath.UrlString;
    preloadingSettingLink.textContent = i18nString(UIStrings.preloadingPagesSettings);
    const extensionsSettingLink = new ChromeLink.ChromeLink.ChromeLink();
    extensionsSettingLink.href = 'chrome://extensions' as Platform.DevToolsPath.UrlString;
    extensionsSettingLink.textContent = i18nString(UIStrings.extensionsSettings);
    const description = i18n.i18n.getFormatLocalizedString(
        str_, UIStrings.descriptionDisabledByPreference, {PH1: preloadingSettingLink, PH2: extensionsSettingLink});
    return this.#maybeKeyValue(
        this.#data.disabledByPreference, i18nString(UIStrings.headerDisabledByPreference), description);
  }

  #maybeDisalebByDataSaver(): Lit.LitTemplate {
    return this.#maybeKeyValue(
        this.#data.disabledByDataSaver, i18nString(UIStrings.headerDisabledByDataSaver),
        i18nString(UIStrings.descriptionDisabledByDataSaver));
  }

  #maybeDisalebByBatterySaver(): Lit.LitTemplate {
    return this.#maybeKeyValue(
        this.#data.disabledByBatterySaver, i18nString(UIStrings.headerDisabledByBatterySaver),
        i18nString(UIStrings.descriptionDisabledByBatterySaver));
  }

  #maybeDisalebByHoldbackPrefetchSpeculationRules(): Lit.LitTemplate {
    return this.#maybeKeyValue(
        this.#data.disabledByHoldbackPrefetchSpeculationRules,
        i18nString(UIStrings.headerDisabledByHoldbackPrefetchSpeculationRules),
        i18nString(UIStrings.descriptionDisabledByHoldbackPrefetchSpeculationRules));
  }

  #maybeDisalebByHoldbackPrerenderSpeculationRules(): Lit.LitTemplate {
    return this.#maybeKeyValue(
        this.#data.disabledByHoldbackPrerenderSpeculationRules,
        i18nString(UIStrings.headerDisabledByHoldbackPrerenderSpeculationRules),
        i18nString(UIStrings.descriptionDisabledByHoldbackPrerenderSpeculationRules));
  }
}

customElements.define('devtools-resources-preloading-disabled-infobar', PreloadingDisabledInfobar);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-resources-preloading-disabled-infobar': PreloadingDisabledInfobar;
  }
}
