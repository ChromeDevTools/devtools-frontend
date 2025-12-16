// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Root from '../../core/root/root.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import globalAiButtonStyles from './globalAiButton.css.js';
const { render, html, Directives: { classMap } } = Lit;
const UIStrings = {
    /**
     * @description Button's string in promotion state.
     */
    aiAssistance: 'AI assistance',
    /**
     * @description Button's tooltip text.
     */
    openAiAssistance: 'Open AI assistance panel',
};
const str_ = i18n.i18n.registerUIStrings('entrypoints/main/GlobalAiButton.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const DELAY_BEFORE_PROMOTION_COLLAPSE_IN_MS = 5000;
const PROMOTION_END_DATE = new Date('2026-09-30');
function getClickCountSetting() {
    return Common.Settings.Settings.instance().createSetting('global-ai-button-click-count', 0, "Synced" /* Common.Settings.SettingStorageType.SYNCED */);
}
function incrementClickCountSetting() {
    const setting = getClickCountSetting();
    setting.set(setting.get() + 1);
}
export var GlobalAiButtonState;
(function (GlobalAiButtonState) {
    GlobalAiButtonState["PROMOTION"] = "promotion";
    GlobalAiButtonState["DEFAULT"] = "default";
})(GlobalAiButtonState || (GlobalAiButtonState = {}));
export const DEFAULT_VIEW = (input, output, target) => {
    const inPromotionState = input.state === GlobalAiButtonState.PROMOTION;
    const classes = classMap({
        'global-ai-button': true,
        expanded: inPromotionState,
    });
    // clang-format off
    render(html `
    <style>${globalAiButtonStyles}</style>
    <div class="global-ai-button-container">
      <button class=${classes} @click=${input.onClick} title=${i18nString(UIStrings.openAiAssistance)} jslog=${VisualLogging.action().track({ click: true }).context('global-ai-button')}>
        <devtools-icon name="smart-assistant"></devtools-icon>
        <span class="button-text">${` ${i18nString(UIStrings.aiAssistance)}`}</span>
      </button>
    </div>
  `, target);
    // clang-format on
};
export class GlobalAiButton extends UI.Widget.Widget {
    #view;
    #buttonState = GlobalAiButtonState.DEFAULT;
    #mouseOnMainToolbar = false;
    #returnToDefaultStateTimeout;
    constructor(element, view) {
        super(element);
        this.#view = view ?? DEFAULT_VIEW;
        this.requestUpdate();
        if (this.#shouldTriggerPromotion()) {
            this.#triggerPromotion();
        }
    }
    willHide() {
        super.willHide();
        this.#removeHoverEventListeners();
        if (this.#returnToDefaultStateTimeout) {
            window.clearTimeout(this.#returnToDefaultStateTimeout);
        }
    }
    #handleMainToolbarMouseEnter = () => {
        this.#mouseOnMainToolbar = true;
    };
    #handleMainToolbarMouseLeave = () => {
        this.#mouseOnMainToolbar = false;
    };
    #addHoverEventListeners() {
        UI.InspectorView.InspectorView.instance().tabbedPane.headerElement().addEventListener('mouseenter', this.#handleMainToolbarMouseEnter);
        UI.InspectorView.InspectorView.instance().tabbedPane.headerElement().addEventListener('mouseleave', this.#handleMainToolbarMouseLeave);
    }
    #removeHoverEventListeners() {
        UI.InspectorView.InspectorView.instance().tabbedPane.headerElement().removeEventListener('mouseenter', this.#handleMainToolbarMouseEnter);
        UI.InspectorView.InspectorView.instance().tabbedPane.headerElement().removeEventListener('mouseleave', this.#handleMainToolbarMouseLeave);
    }
    // We only want to enable promotion when:
    // * The flag is enabled,
    // * The current date is before the promotion end date,
    // * The click count on this button is less than 2.
    #shouldTriggerPromotion() {
        const isFlagEnabled = Boolean(Root.Runtime.hostConfig.devToolsGlobalAiButton?.promotionEnabled);
        const isBeforeEndDate = (new Date()) < PROMOTION_END_DATE;
        return isFlagEnabled && isBeforeEndDate && getClickCountSetting().get() < 2;
    }
    #triggerPromotion() {
        // Set up hover listeners for making sure that we don't return to default state from promotion state
        // when the user's cursor is on the main toolbar.
        this.#buttonState = GlobalAiButtonState.PROMOTION;
        this.requestUpdate();
        this.#addHoverEventListeners();
        this.#scheduleReturnToDefaultState();
    }
    #scheduleReturnToDefaultState() {
        if (this.#returnToDefaultStateTimeout) {
            window.clearTimeout(this.#returnToDefaultStateTimeout);
        }
        this.#returnToDefaultStateTimeout = window.setTimeout(() => {
            // If the mouse is currently on the main toolbar,
            // we don't want to trigger the animation from promotion & to the default
            // state to not cause a layout shift when the user is not expecting it
            // (e.g. while they were going to click on a button on the toolbar).
            if (this.#mouseOnMainToolbar) {
                this.#scheduleReturnToDefaultState();
                return;
            }
            this.#buttonState = GlobalAiButtonState.DEFAULT;
            this.requestUpdate();
            // Remove hover listeners once the button is in its default state.
            this.#removeHoverEventListeners();
        }, DELAY_BEFORE_PROMOTION_COLLAPSE_IN_MS);
    }
    #onClick() {
        UI.ViewManager.ViewManager.instance().showViewInLocation('freestyler', 'drawer-view');
        incrementClickCountSetting();
        const hasExplicitUserPreference = UI.InspectorView.InspectorView.instance().isUserExplicitlyUpdatedDrawerOrientation();
        const isVerticalDrawerFeatureEnabled = Boolean(Root.Runtime.hostConfig.devToolsFlexibleLayout?.verticalDrawerEnabled);
        if (isVerticalDrawerFeatureEnabled && !hasExplicitUserPreference) {
            // This mimics what we're doing while showing the drawer via `ESC`.
            // There is a bug where opening the sidebar directly for the first time,
            // and triggering a drawer rotation without calling `showDrawer({focus: true})` makes the drawer disappear.
            UI.InspectorView.InspectorView.instance().showDrawer({
                focus: true,
                hasTargetDrawer: false,
            });
            UI.InspectorView.InspectorView.instance().toggleDrawerOrientation({ force: UI.InspectorView.DrawerOrientation.VERTICAL });
        }
    }
    performUpdate() {
        this.#view({
            state: this.#buttonState,
            onClick: this.#onClick.bind(this),
        }, undefined, this.contentElement);
    }
}
let globalAiButtonToolbarProviderInstance;
export class GlobalAiButtonToolbarProvider {
    #toolbarItem;
    #widgetElement;
    constructor() {
        this.#widgetElement = document.createElement('devtools-widget');
        this.#widgetElement.widgetConfig = UI.Widget.widgetConfig(GlobalAiButton);
        this.#toolbarItem = new UI.Toolbar.ToolbarItemWithCompactLayout(this.#widgetElement);
        this.#toolbarItem.setVisible(false);
    }
    item() {
        return this.#toolbarItem;
    }
    static instance(opts = { forceNew: null }) {
        const { forceNew } = opts;
        if (!globalAiButtonToolbarProviderInstance || forceNew) {
            globalAiButtonToolbarProviderInstance = new GlobalAiButtonToolbarProvider();
        }
        return globalAiButtonToolbarProviderInstance;
    }
}
//# sourceMappingURL=GlobalAiButton.js.map