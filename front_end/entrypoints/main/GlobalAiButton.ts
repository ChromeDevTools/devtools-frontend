// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Root from '../../core/root/root.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import globalAiButtonStyles from './globalAiButton.css.js';

const {render, html, Directives: {classMap}} = Lit;

const UIStrings = {
  /**
   * @description Button's string in promotion state.
   */
  aiAssistance: 'AI assistance',
} as const;
const str_ = i18n.i18n.registerUIStrings('entrypoints/main/GlobalAiButton.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

const DELAY_BEFORE_PROMOTION_COLLAPSE_IN_MS = 5000;
const PROMOTION_END_DATE = new Date('2026-09-30');

function getClickCountSetting(): Common.Settings.Setting<number> {
  return Common.Settings.Settings.instance().createSetting<number>(
      'global-ai-button-click-count', 0, Common.Settings.SettingStorageType.SYNCED);
}

function incrementClickCountSetting(): void {
  const setting = getClickCountSetting();
  setting.set(setting.get() + 1);
}

export enum GlobalAiButtonState {
  PROMOTION = 'promotion',
  DEFAULT = 'default',
}

interface ViewInput {
  state: GlobalAiButtonState;
  onClick: () => void;
}

export const DEFAULT_VIEW = (input: ViewInput, output: undefined, target: HTMLElement): void => {
  const inPromotionState = input.state === GlobalAiButtonState.PROMOTION;
  const classes = classMap({
    'global-ai-button': true,
    expanded: inPromotionState,
  });
  // clang-format off
  render(html`
    <style>${globalAiButtonStyles}</style>
    <div class="global-ai-button-container">
      <button class=${classes} @click=${input.onClick} jslog=${VisualLogging.action().track({click: true}).context('global-ai-button')}>
        <devtools-icon name="smart-assistant"></devtools-icon>
        <span class="button-text">${` ${i18nString(UIStrings.aiAssistance)}`}</span>
      </button>
    </div>
  `, target);
  // clang-format on
};

export type View = typeof DEFAULT_VIEW;
export class GlobalAiButton extends UI.Widget.Widget {
  #view: View;
  #buttonState: GlobalAiButtonState = GlobalAiButtonState.DEFAULT;

  constructor(element?: HTMLElement, view?: View) {
    super(element);
    this.#view = view ?? DEFAULT_VIEW;
    this.requestUpdate();

    if (this.#shouldTriggerPromotion()) {
      this.#triggerPromotion();
    }
  }

  // We only want to enable promotion when:
  // * The flag is enabled,
  // * The current date is before the promotion end date,
  // * The click count on this button is less than 2.
  #shouldTriggerPromotion(): boolean {
    const isFlagEnabled = Boolean(Root.Runtime.hostConfig.devToolsGlobalAiButton?.promotionEnabled);
    const isBeforeEndDate = (new Date()) < PROMOTION_END_DATE;
    return isFlagEnabled && isBeforeEndDate && getClickCountSetting().get() < 2;
  }

  #triggerPromotion(): void {
    this.#buttonState = GlobalAiButtonState.PROMOTION;
    this.requestUpdate();
    window.setTimeout(() => {
      this.#buttonState = GlobalAiButtonState.DEFAULT;
      this.requestUpdate();
    }, DELAY_BEFORE_PROMOTION_COLLAPSE_IN_MS);
  }

  #onClick(): void {
    UI.ViewManager.ViewManager.instance().showViewInLocation('freestyler', 'drawer-view');
    incrementClickCountSetting();
  }

  override performUpdate(): Promise<void>|void {
    this.#view(
        {
          state: this.#buttonState,
          onClick: this.#onClick.bind(this),
        },
        undefined, this.contentElement);
  }
}

let globalAiButtonToolbarProviderInstance: GlobalAiButtonToolbarProvider;
export class GlobalAiButtonToolbarProvider implements UI.Toolbar.Provider {
  #toolbarItem: UI.Toolbar.ToolbarItemWithCompactLayout;
  #widgetElement: UI.Widget.WidgetElement<GlobalAiButton>;

  private constructor() {
    this.#widgetElement = document.createElement('devtools-widget') as UI.Widget.WidgetElement<GlobalAiButton>;
    this.#widgetElement.widgetConfig = UI.Widget.widgetConfig(GlobalAiButton);

    this.#toolbarItem = new UI.Toolbar.ToolbarItemWithCompactLayout(this.#widgetElement);
    this.#toolbarItem.setVisible(false);
  }

  item(): UI.Toolbar.ToolbarItem|null {
    return this.#toolbarItem;
  }

  static instance(opts: {forceNew: boolean|null} = {forceNew: null}): GlobalAiButtonToolbarProvider {
    const {forceNew} = opts;
    if (!globalAiButtonToolbarProviderInstance || forceNew) {
      globalAiButtonToolbarProviderInstance = new GlobalAiButtonToolbarProvider();
    }

    return globalAiButtonToolbarProviderInstance;
  }
}
