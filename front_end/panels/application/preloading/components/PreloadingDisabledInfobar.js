// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-lit-render-outside-of-view */
import '../../../../ui/components/report_view/report_view.js';
import * as i18n from '../../../../core/i18n/i18n.js';
import * as Buttons from '../../../../ui/components/buttons/buttons.js';
import * as ChromeLink from '../../../../ui/components/chrome_link/chrome_link.js';
import * as Dialogs from '../../../../ui/components/dialogs/dialogs.js';
import * as LegacyWrapper from '../../../../ui/components/legacy_wrapper/legacy_wrapper.js';
import * as RenderCoordinator from '../../../../ui/components/render_coordinator/render_coordinator.js';
import * as uiI18n from '../../../../ui/i18n/i18n.js';
import * as Lit from '../../../../ui/lit/lit.js';
import * as VisualLogging from '../../../../ui/visual_logging/visual_logging.js';
import preloadingDisabledInfobarStyles from './preloadingDisabledInfobar.css.js';
const { html } = Lit;
const UIStrings = {
    /**
     * @description Infobar text for disabled case
     */
    infobarPreloadingIsDisabled: 'Speculative loading is disabled',
    /**
     * @description Infobar text for force-enabled case
     */
    infobarPreloadingIsForceEnabled: 'Speculative loading is force-enabled',
    /**
     * @description Title for dialog
     */
    titleReasonsPreventingPreloading: 'Reasons preventing speculative loading',
    /**
     * @description Header in dialog
     */
    headerDisabledByPreference: 'User settings or extensions',
    /**
     * @description Description in dialog
     * @example {Preload pages settings (linked to chrome://settings/performance)} PH1
     * @example {Extensions settings (linked to chrome://extensions)} PH2
     */
    descriptionDisabledByPreference: 'Speculative loading is disabled because of user settings or an extension. Go to {PH1} to update your preference. Go to {PH2} to disable any extension that blocks speculative loading.',
    /**
     * @description Text of link
     */
    preloadingPagesSettings: 'Preload pages settings',
    /**
     * @description Text of link
     */
    extensionsSettings: 'Extensions settings',
    /**
     * @description Header in dialog
     */
    headerDisabledByDataSaver: 'Data Saver',
    /**
     * @description Description in dialog
     */
    descriptionDisabledByDataSaver: 'Speculative loading is disabled because of the operating system\'s Data Saver mode.',
    /**
     * @description Header in dialog
     */
    headerDisabledByBatterySaver: 'Battery Saver',
    /**
     * @description Description in dialog
     */
    descriptionDisabledByBatterySaver: 'Speculative loading is disabled because of the operating system\'s Battery Saver mode.',
    /**
     * @description Header in dialog
     */
    headerDisabledByHoldbackPrefetchSpeculationRules: 'Prefetch was disabled, but is force-enabled now',
    /**
     * @description Description in infobar
     */
    descriptionDisabledByHoldbackPrefetchSpeculationRules: 'Prefetch is forced-enabled because DevTools is open. When DevTools is closed, prefetch will be disabled because this browser session is part of a holdback group used for performance comparisons.',
    /**
     * @description Header in dialog
     */
    headerDisabledByHoldbackPrerenderSpeculationRules: 'Prerendering was disabled, but is force-enabled now',
    /**
     * @description Description in infobar
     */
    descriptionDisabledByHoldbackPrerenderSpeculationRules: 'Prerendering is forced-enabled because DevTools is open. When DevTools is closed, prerendering will be disabled because this browser session is part of a holdback group used for performance comparisons.',
    /**
     * @description Footer link for more details
     */
    footerLearnMore: 'Learn more',
};
const str_ = i18n.i18n.registerUIStrings('panels/application/preloading/components/PreloadingDisabledInfobar.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const LINK = 'https://developer.chrome.com/blog/prerender-pages/';
export class PreloadingDisabledInfobar extends LegacyWrapper.LegacyWrapper.WrappableComponent {
    #shadow = this.attachShadow({ mode: 'open' });
    #data = {
        disabledByPreference: false,
        disabledByDataSaver: false,
        disabledByBatterySaver: false,
        disabledByHoldbackPrefetchSpeculationRules: false,
        disabledByHoldbackPrerenderSpeculationRules: false,
    };
    connectedCallback() {
        void this.#render();
    }
    set data(data) {
        this.#data = data;
        void this.#render();
    }
    async #render() {
        await RenderCoordinator.write('PreloadingDisabledInfobar render', () => {
            Lit.render(this.#renderTemplate(), this.#shadow, { host: this });
        });
    }
    #renderTemplate() {
        const forceEnabled = this.#data.disabledByHoldbackPrefetchSpeculationRules || this.#data.disabledByHoldbackPrerenderSpeculationRules;
        const disabled = this.#data.disabledByPreference || this.#data.disabledByDataSaver || this.#data.disabledByBatterySaver;
        let header;
        if (disabled) {
            header = i18nString(UIStrings.infobarPreloadingIsDisabled);
        }
        else if (forceEnabled) {
            header = i18nString(UIStrings.infobarPreloadingIsForceEnabled);
        }
        else {
            return Lit.nothing;
        }
        // Disabled until https://crbug.com/1079231 is fixed.
        // clang-format off
        return html `
      <style>${preloadingDisabledInfobarStyles}</style>
      <div id='container'>
        <span id='header'>
          ${header}
        </span>

        <devtools-button-dialog
          .data=${{
            iconName: 'info',
            variant: "icon" /* Buttons.Button.Variant.ICON */,
            closeButton: true,
            position: "auto" /* Dialogs.Dialog.DialogVerticalPosition.AUTO */,
            horizontalAlignment: "auto" /* Dialogs.Dialog.DialogHorizontalAlignment.AUTO */,
            closeOnESC: true,
            closeOnScroll: false,
            dialogTitle: i18nString(UIStrings.titleReasonsPreventingPreloading),
        }}
          jslog=${VisualLogging.dialog('preloading-disabled').track({ resize: true, keydown: 'Escape' })}
        >
          ${this.#dialogContents()}
        </devtools-button-dialog>
      </div>
    `;
        // clang-format on
    }
    #dialogContents() {
        return html `
      <div id='contents'>
        <devtools-report>
          ${this.#maybeDisableByPreference()}
          ${this.#maybeDisableByDataSaver()}
          ${this.#maybeDisableByBatterySaver()}
          ${this.#maybeDisableByHoldbackPrefetchSpeculationRules()}
          ${this.#maybeDisableByHoldbackPrerenderSpeculationRules()}
        </devtools-report>
        <div id='footer'>
          <x-link class="devtools-link" tabindex="0" href=${LINK} 
          jslog=${VisualLogging.link().track({ click: true, keydown: 'Enter|Space' }).context('learn-more')}
          >${i18nString(UIStrings.footerLearnMore)}</x-link>
          <x-link class="icon-link devtools-link" tabindex="0" href=${LINK}></x-link>
        </div>
      </div>
    `;
    }
    #maybeKeyValue(shouldShow, header, description) {
        if (!shouldShow) {
            return Lit.nothing;
        }
        return html `
      <div class='key'>
        ${header}
      </div>
      <div class='value'>
        ${description}
      </div>
    `;
    }
    #maybeDisableByPreference() {
        const preloadingSettingLink = new ChromeLink.ChromeLink.ChromeLink();
        preloadingSettingLink.href = 'chrome://settings/performance';
        preloadingSettingLink.textContent = i18nString(UIStrings.preloadingPagesSettings);
        const extensionsSettingLink = new ChromeLink.ChromeLink.ChromeLink();
        extensionsSettingLink.href = 'chrome://extensions';
        extensionsSettingLink.textContent = i18nString(UIStrings.extensionsSettings);
        const description = uiI18n.getFormatLocalizedString(str_, UIStrings.descriptionDisabledByPreference, { PH1: preloadingSettingLink, PH2: extensionsSettingLink });
        return this.#maybeKeyValue(this.#data.disabledByPreference, i18nString(UIStrings.headerDisabledByPreference), description);
    }
    #maybeDisableByDataSaver() {
        return this.#maybeKeyValue(this.#data.disabledByDataSaver, i18nString(UIStrings.headerDisabledByDataSaver), i18nString(UIStrings.descriptionDisabledByDataSaver));
    }
    #maybeDisableByBatterySaver() {
        return this.#maybeKeyValue(this.#data.disabledByBatterySaver, i18nString(UIStrings.headerDisabledByBatterySaver), i18nString(UIStrings.descriptionDisabledByBatterySaver));
    }
    #maybeDisableByHoldbackPrefetchSpeculationRules() {
        return this.#maybeKeyValue(this.#data.disabledByHoldbackPrefetchSpeculationRules, i18nString(UIStrings.headerDisabledByHoldbackPrefetchSpeculationRules), i18nString(UIStrings.descriptionDisabledByHoldbackPrefetchSpeculationRules));
    }
    #maybeDisableByHoldbackPrerenderSpeculationRules() {
        return this.#maybeKeyValue(this.#data.disabledByHoldbackPrerenderSpeculationRules, i18nString(UIStrings.headerDisabledByHoldbackPrerenderSpeculationRules), i18nString(UIStrings.descriptionDisabledByHoldbackPrerenderSpeculationRules));
    }
}
customElements.define('devtools-resources-preloading-disabled-infobar', PreloadingDisabledInfobar);
//# sourceMappingURL=PreloadingDisabledInfobar.js.map