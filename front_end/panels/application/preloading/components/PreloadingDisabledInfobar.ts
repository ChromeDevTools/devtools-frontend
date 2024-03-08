// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../../core/i18n/i18n.js';
import type * as Platform from '../../../../core/platform/platform.js';
import type * as Protocol from '../../../../generated/protocol.js';
import * as ChromeLink from '../../../../ui/components/chrome_link/chrome_link.js';
import * as Dialogs from '../../../../ui/components/dialogs/dialogs.js';
import * as IconButton from '../../../../ui/components/icon_button/icon_button.js';
import * as LegacyWrapper from '../../../../ui/components/legacy_wrapper/legacy_wrapper.js';
import * as Coordinator from '../../../../ui/components/render_coordinator/render_coordinator.js';
import * as ReportView from '../../../../ui/components/report_view/report_view.js';
import * as UI from '../../../../ui/legacy/legacy.js';
import * as LitHtml from '../../../../ui/lit-html/lit-html.js';
import * as VisualLogging from '../../../../ui/visual_logging/visual_logging.js';

import preloadingDisabledInfobarStyles from './preloadingDisabledInfobar.css.js';

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
};
const str_ =
    i18n.i18n.registerUIStrings('panels/application/preloading/components/PreloadingDisabledInfobar.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

export class PreloadingDisabledInfobar extends LegacyWrapper.LegacyWrapper.WrappableComponent<UI.Widget.VBox> {
  static readonly litTagName = LitHtml.literal`devtools-resources-preloading-disabled-infobar`;

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
    await coordinator.write('PreloadingDisabledInfobar render', () => {
      LitHtml.render(this.#renderInternal(), this.#shadow, {host: this});
    });
  }

  #renderInternal(): LitHtml.LitTemplate {
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
      return LitHtml.nothing;
    }

    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    return LitHtml.html`
      <div id='container'>
        <span id='header'>
          ${header}
        </span>

        <${Dialogs.IconDialog.IconDialog.litTagName}
          .data=${{
            iconData: {
              iconName: 'info',
              color: 'var(--icon-default-hover)',
              width: '16px',
              height: '16px',
            },
            closeButton: true,
            position: Dialogs.Dialog.DialogVerticalPosition.AUTO,
            horizontalAlignment: Dialogs.Dialog.DialogHorizontalAlignment.AUTO,
            closeOnESC: true,
            closeOnScroll: false,
          } as Dialogs.IconDialog.IconDialogData}
          jslog=${VisualLogging.dialog('preloading-disabled').track({resize: true, keydown: 'Escape'})}
        >
          ${this.#dialogContents()}
        </${Dialogs.IconDialog.IconDialog.litTagName}>
      </div>
    `;
    // clang-format on
  }

  #dialogContents(): LitHtml.LitTemplate {
    const LINK = 'https://developer.chrome.com/blog/prerender-pages/';

    const learnMoreLink =
        UI.XLink.XLink.create(LINK, i18nString(UIStrings.footerLearnMore), undefined, undefined, 'learn-more');
    const iconLink = UI.Fragment.html`
      <x-link class="icon-link devtools-link" tabindex="0" href="${LINK}"></x-link>
    ` as UI.XLink.XLink;
    const iconLinkIcon = new IconButton.Icon.Icon();
    iconLinkIcon
        .data = {iconName: 'open-externally', color: 'var(--icon-default-hover)', width: '16px', height: '16px'};
    iconLink.append(iconLinkIcon);

    return LitHtml.html`
      <div id='contents'>
        <div id='title'>${i18nString(UIStrings.titleReasonsPreventingPreloading)}</div>

        <${ReportView.ReportView.Report.litTagName}>
          ${this.#maybeDisalebByPreference()}
          ${this.#maybeDisalebByDataSaver()}
          ${this.#maybeDisalebByBatterySaver()}
          ${this.#maybeDisalebByHoldbackPrefetchSpeculationRules()}
          ${this.#maybeDisalebByHoldbackPrerenderSpeculationRules()}

          <${ReportView.ReportView.ReportSectionDivider.litTagName}>
          </${ReportView.ReportView.ReportSectionDivider.litTagName}>
        </${ReportView.ReportView.Report.litTagName}>

        <div id='footer'>
          ${learnMoreLink}
          ${iconLink}
        </div>
      </div>
    `;
  }

  #maybeKeyValue(shouldShow: boolean, header: string, description: string|Element): LitHtml.LitTemplate {
    if (!shouldShow) {
      return LitHtml.nothing;
    }

    return LitHtml.html`
      <div class='key'>
        ${header}
      </div>
      <div class='value'>
        ${description}
      </div>
    `;
  }

  #maybeDisalebByPreference(): LitHtml.LitTemplate {
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

  #maybeDisalebByDataSaver(): LitHtml.LitTemplate {
    return this.#maybeKeyValue(
        this.#data.disabledByDataSaver, i18nString(UIStrings.headerDisabledByDataSaver),
        i18nString(UIStrings.descriptionDisabledByDataSaver));
  }

  #maybeDisalebByBatterySaver(): LitHtml.LitTemplate {
    return this.#maybeKeyValue(
        this.#data.disabledByBatterySaver, i18nString(UIStrings.headerDisabledByBatterySaver),
        i18nString(UIStrings.descriptionDisabledByBatterySaver));
  }

  #maybeDisalebByHoldbackPrefetchSpeculationRules(): LitHtml.LitTemplate {
    return this.#maybeKeyValue(
        this.#data.disabledByHoldbackPrefetchSpeculationRules,
        i18nString(UIStrings.headerDisabledByHoldbackPrefetchSpeculationRules),
        i18nString(UIStrings.descriptionDisabledByHoldbackPrefetchSpeculationRules));
  }

  #maybeDisalebByHoldbackPrerenderSpeculationRules(): LitHtml.LitTemplate {
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
