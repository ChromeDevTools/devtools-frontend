// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
// This dialog will be shown during M146 and removed by M147.
//
// To enable:
//   --enable-features=DevToolsGeminiRebranding
import '../../ui/components/switch/switch.js';
import '../../ui/kit/kit.js';
import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Root from '../../core/root/root.js';
import * as Geometry from '../../models/geometry/geometry.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as UI from '../../ui/legacy/legacy.js';
import { html, render } from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import styles from './geminiRebrandPromoDialog.css.js';
const UIStrings = {
    /**
     * @description Aria label for the dialog
     */
    dialogAriaLabel: 'Gemini 3 Flash in DevTools',
    /**
     *
     * @description Button text for dismissing the dialog.
     */
    dismiss: 'Dismiss',
    /**
     * @description Button text for getting started.
     */
    getStarted: 'Get started',
    /**
     * @description Detail message shown in the dialog.
     */
    detailAiCompanion: 'Meet your AI-powered companion for web dev',
    /**
     * @description Detail message shown in the dialog.
     */
    detailConsoleErrors: 'Get instant, accurate answers for console errors',
    /**
     * @description Detail message shown in the dialog.
     */
    detailGenerateCode: 'Generate CSS and JS snippets on the fly',
    /**
     * @description Detail message shown in the dialog.
     */
    detailPerformance: 'Automatically find issues in performance traces',
};
const str_ = i18n.i18n.registerUIStrings('panels/common/GeminiRebrandPromoDialog.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const PROMO_IMAGE_1X = new URL('../../Images/geminiInDevTools.png', import.meta.url).toString();
const PROMO_IMAGE_2X = new URL('../../Images/geminiInDevTools_2x.png', import.meta.url).toString();
export const DEFAULT_VIEW = (input, _output, target) => {
    // clang-format off
    render(html `
      <style>${styles}</style>

      <div class="header">
        <div class="title">Gemini 3 Flash in DevTools</div>
        <div class="close-button">
          <devtools-button
            .iconName=${'cross'}
            .variant=${"icon" /* Buttons.Button.Variant.ICON */}
            .size=${"REGULAR" /* Buttons.Button.Size.REGULAR */}
            .title=${i18nString(UIStrings.dismiss)}
            jslog=${VisualLogging.close().track({ click: true }).context('gemini-promo-dismiss')}
            @click=${() => input.onCancelClick()}
          ></devtools-button>
        </div>
      </div>

      <img class="banner-image" srcset=${`${PROMO_IMAGE_1X} 1x, ${PROMO_IMAGE_2X} 2x`}>

      <div class="main-content">
        <div class="detail-row">
          <devtools-icon name="performance"></devtools-icon>
          <div>${i18nString(UIStrings.detailAiCompanion)}</div>
        </div>
        <div class="detail-row">
          <devtools-icon name="lightbulb-spark"></devtools-icon>
          <div>${i18nString(UIStrings.detailConsoleErrors)}</div>
        </div>
        <div class="detail-row">
          <devtools-icon name="text-analysis"></devtools-icon>
          <div>${i18nString(UIStrings.detailGenerateCode)}</div>
        </div>
        <div class="detail-row">
          <devtools-icon name="smart-assistant"></devtools-icon>
          <div>${i18nString(UIStrings.detailPerformance)}</div>
        </div>
      </div>

      <div class="buttons">
        <devtools-button
          .variant=${"outlined" /* Buttons.Button.Variant.OUTLINED */}
          jslog=${VisualLogging.close().track({ click: true }).context('gemini-promo-dismiss')}
          @click=${input.onCancelClick}>${i18nString(UIStrings.dismiss)}</devtools-button>
        <devtools-button
          .variant=${"primary" /* Buttons.Button.Variant.PRIMARY */}
          .jslogContext=${'gemini-promo-get-started'}
          @click=${input.onGetStartedClick}>${i18nString(UIStrings.getStarted)}</devtools-button>
      </div>
    `, target);
    // clang-format on
};
export class GeminiRebrandPromoDialog extends UI.Widget.VBox {
    #view;
    #dialog;
    constructor(options, view) {
        super();
        this.#dialog = options.dialog;
        this.#view = view ?? DEFAULT_VIEW;
        this.requestUpdate();
    }
    async #onGetStartedClick() {
        this.#dialog.hide();
        await UI.ViewManager.ViewManager.instance().showView('freestyler');
    }
    #onCancelClick() {
        this.#dialog.hide();
    }
    performUpdate() {
        const viewInput = {
            onGetStartedClick: this.#onGetStartedClick.bind(this),
            onCancelClick: this.#onCancelClick.bind(this),
        };
        this.#view(viewInput, undefined, this.contentElement);
    }
    static show() {
        const dialog = new UI.Dialog.Dialog('gemini-promo-dialog');
        dialog.setAriaLabel(i18nString(UIStrings.dialogAriaLabel));
        dialog.setMaxContentSize(new Geometry.Size(384, 500));
        dialog.setSizeBehavior("SetExactWidthMaxHeight" /* UI.GlassPane.SizeBehavior.SET_EXACT_WIDTH_MAX_HEIGHT */);
        dialog.setDimmed(true);
        new GeminiRebrandPromoDialog({ dialog }).show(dialog.contentElement);
        dialog.show(undefined, /* stack */ true);
    }
    static async maybeShow() {
        if (!Root.Runtime.hostConfig.aidaAvailability?.enabled) {
            return;
        }
        const currentAidaAvailability = await Host.AidaClient.AidaClient.checkAccessPreconditions();
        if (currentAidaAvailability !== "available" /* Host.AidaClient.AidaAccessPreconditions.AVAILABLE */) {
            return;
        }
        const setting = Common.Settings.Settings.instance().createSetting('gemini-promo-dialog-shown', false, "Synced" /* Common.Settings.SettingStorageType.SYNCED */);
        if (setting.get()) {
            return;
        }
        setting.set(true);
        GeminiRebrandPromoDialog.show();
    }
}
//# sourceMappingURL=GeminiRebrandPromoDialog.js.map