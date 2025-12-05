// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../../../../ui/components/report_view/report_view.js';
import '../../../../ui/kit/kit.js';
import * as i18n from '../../../../core/i18n/i18n.js';
import * as Platform from '../../../../core/platform/platform.js';
import * as Buttons from '../../../../ui/components/buttons/buttons.js';
import * as Dialogs from '../../../../ui/components/dialogs/dialogs.js';
import * as UI from '../../../../ui/legacy/legacy.js';
import { html, i18nTemplate, nothing, render } from '../../../../ui/lit/lit.js';
import * as VisualLogging from '../../../../ui/visual_logging/visual_logging.js';
import preloadingDisabledInfobarStyles from './preloadingDisabledInfobar.css.js';
const { urlString } = Platform.DevToolsPath;
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
export const DEFAULT_VIEW = (input, _output, target) => {
    let template = nothing;
    if (input.header !== null) {
        // Disabled until https://crbug.com/1079231 is fixed.
        // clang-format off
        template = html `
        <style>${preloadingDisabledInfobarStyles}</style>
        <div id="container">
          <span id="header">${input.header}</span>
          <devtools-button-dialog .data=${{
            iconName: 'info',
            variant: "icon" /* Buttons.Button.Variant.ICON */,
            closeButton: true,
            position: "auto" /* Dialogs.Dialog.DialogVerticalPosition.AUTO */,
            horizontalAlignment: "auto" /* Dialogs.Dialog.DialogHorizontalAlignment.AUTO */,
            closeOnESC: true,
            closeOnScroll: false,
            dialogTitle: i18nString(UIStrings.titleReasonsPreventingPreloading),
        }}
                                  jslog=${VisualLogging.dialog('preloading-disabled').track({ resize: true, keydown: 'Escape' })}>
            <div id="contents">
              <devtools-report>
                ${input.warnings.map(({ key, valueId, placeholders = {} }) => {
            const value = i18nTemplate(str_, valueId, Object.fromEntries(Object.entries(placeholders).map(([key, { title, href }]) => [key, html `<devtools-link href=${href}>${title}</devtools-link>`])));
            return html `
                      <div class="key">${key}</div>
                      <div class="value">${value}</div>
                    `;
        })}
              </devtools-report>
              <div id="footer">
                <devtools-link href=${LINK} jslogcontext="learn-more">
                  ${i18nString(UIStrings.footerLearnMore)}
                </devtools-link>
              </div>
            </div>
          </devtools-button-dialog>
        </div>`;
        // clang-format on
    }
    render(template, target);
};
export class PreloadingDisabledInfobar extends UI.Widget.VBox {
    #view;
    #disabledByPreference = false;
    #disabledByDataSaver = false;
    #disabledByBatterySaver = false;
    #disabledByHoldbackPrefetchSpeculationRules = false;
    #disabledByHoldbackPrerenderSpeculationRules = false;
    constructor(view = DEFAULT_VIEW) {
        super({ useShadowDom: true });
        this.#view = view;
    }
    get disabledByPreference() {
        return this.#disabledByPreference;
    }
    set disabledByPreference(value) {
        if (this.#disabledByPreference !== value) {
            this.#disabledByPreference = value;
            this.requestUpdate();
        }
    }
    get disabledByDataSaver() {
        return this.#disabledByDataSaver;
    }
    set disabledByDataSaver(value) {
        if (this.#disabledByDataSaver !== value) {
            this.#disabledByDataSaver = value;
            this.requestUpdate();
        }
    }
    get disabledByBatterySaver() {
        return this.#disabledByBatterySaver;
    }
    set disabledByBatterySaver(value) {
        if (this.#disabledByBatterySaver !== value) {
            this.#disabledByBatterySaver = value;
            this.requestUpdate();
        }
    }
    get disabledByHoldbackPrefetchSpeculationRules() {
        return this.#disabledByHoldbackPrefetchSpeculationRules;
    }
    set disabledByHoldbackPrefetchSpeculationRules(value) {
        if (this.#disabledByHoldbackPrefetchSpeculationRules !== value) {
            this.#disabledByHoldbackPrefetchSpeculationRules = value;
            this.requestUpdate();
        }
    }
    get disabledByHoldbackPrerenderSpeculationRules() {
        return this.#disabledByHoldbackPrerenderSpeculationRules;
    }
    set disabledByHoldbackPrerenderSpeculationRules(value) {
        if (this.#disabledByHoldbackPrerenderSpeculationRules !== value) {
            this.#disabledByHoldbackPrerenderSpeculationRules = value;
            this.requestUpdate();
        }
    }
    wasShown() {
        super.wasShown();
        this.requestUpdate();
    }
    performUpdate() {
        let header = null;
        if (this.#disabledByPreference || this.#disabledByDataSaver || this.#disabledByBatterySaver) {
            header = i18nString(UIStrings.infobarPreloadingIsDisabled);
        }
        else if (this.#disabledByHoldbackPrefetchSpeculationRules || this.#disabledByHoldbackPrerenderSpeculationRules) {
            header = i18nString(UIStrings.infobarPreloadingIsForceEnabled);
        }
        const warnings = [];
        if (this.#disabledByPreference) {
            warnings.push({
                key: i18nString(UIStrings.headerDisabledByPreference),
                valueId: UIStrings.descriptionDisabledByPreference,
                placeholders: {
                    PH1: {
                        title: i18nString(UIStrings.preloadingPagesSettings),
                        href: urlString `chrome://settings/performance`,
                    },
                    PH2: {
                        title: i18nString(UIStrings.extensionsSettings),
                        href: urlString `chrome://extensions`,
                    },
                },
            });
        }
        if (this.#disabledByDataSaver) {
            warnings.push({
                key: i18nString(UIStrings.headerDisabledByDataSaver),
                valueId: UIStrings.descriptionDisabledByDataSaver,
            });
        }
        if (this.#disabledByBatterySaver) {
            warnings.push({
                key: i18nString(UIStrings.headerDisabledByBatterySaver),
                valueId: UIStrings.descriptionDisabledByBatterySaver,
            });
        }
        if (this.#disabledByHoldbackPrefetchSpeculationRules) {
            warnings.push({
                key: i18nString(UIStrings.headerDisabledByHoldbackPrefetchSpeculationRules),
                valueId: UIStrings.descriptionDisabledByHoldbackPrefetchSpeculationRules,
            });
        }
        if (this.#disabledByHoldbackPrerenderSpeculationRules) {
            warnings.push({
                key: i18nString(UIStrings.headerDisabledByHoldbackPrerenderSpeculationRules),
                valueId: UIStrings.descriptionDisabledByHoldbackPrerenderSpeculationRules,
            });
        }
        const input = {
            header,
            warnings,
        };
        const output = undefined;
        this.#view(input, output, this.contentElement);
    }
}
//# sourceMappingURL=PreloadingDisabledInfobar.js.map