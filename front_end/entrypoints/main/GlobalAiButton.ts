// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Root from '../../core/root/root.js';
import * as AIAssistance from '../../models/ai_assistance/ai_assistance.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import globalAiButtonStyles from './globalAiButton.css.js';

const {render, html, Directives: {classMap}} = Lit;

const UIStrings = {
  /**
   * @description Text label for the AI assistance button in the main DevTools toolbar when expanded.
   */
  aiAssistance: 'AI assistance',
  /**
   * @description Tooltip for the AI assistance button in the main DevTools toolbar.
   */
  openAiAssistance: 'Open AI assistance panel',
  /**
   * @description Tooltip for the Gemini button in the main DevTools toolbar.
   */
  openGemini: 'Open `Gemini` panel',
} as const;
const str_ = i18n.i18n.registerUIStrings('entrypoints/main/GlobalAiButton.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

const DELAY_BEFORE_PROMOTION_COLLAPSE_IN_MS = 5000;
const PROMOTION_END_DATE = new Date('2026-09-30');

function getClickCountSetting(settings: Common.Settings.Settings): Common.Settings.Setting<number> {
  return settings.createSetting<number>('global-ai-button-click-count', 0, Common.Settings.SettingStorageType.SYNCED);
}

function incrementClickCountSetting(settings: Common.Settings.Settings): void {
  const setting = getClickCountSetting(settings);
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

  const strings = AIAssistance.AiUtils.isGeminiBranding() ?
      {title: i18nString(UIStrings.openGemini), label: i18n.i18n.lockedString('Gemini')} :
      {title: i18nString(UIStrings.openAiAssistance), label: i18nString(UIStrings.aiAssistance)};
  const icon = AIAssistance.AiUtils.getIconName();

  // clang-format off
  render(html`
    <style>${globalAiButtonStyles}</style>
    <div class="global-ai-button-container">
      <button class=${classes} @click=${input.onClick} title=${strings.title} jslog=${VisualLogging.action().track({click: true}).context('global-ai-button')}>
        <devtools-icon name=${icon}></devtools-icon>
        <span class="button-text">${` ${strings.label}`}</span>
      </button>
    </div>
  `, target);
  // clang-format on
};

export type View = typeof DEFAULT_VIEW;
export class GlobalAiButton extends UI.Widget.Widget {
  #view: View;
  #buttonState: GlobalAiButtonState = GlobalAiButtonState.DEFAULT;
  #mouseOnMainToolbar = false;
  #returnToDefaultStateTimeout?: number;
  readonly #settings: Common.Settings.Settings;
  readonly #inspectorView: UI.InspectorView.InspectorView;
  readonly #viewManager: UI.ViewManager.ViewManager;

  constructor(element?: HTMLElement, view?: View,
              settings: Common.Settings.Settings = Common.Settings.Settings.instance(),
              inspectorView: UI.InspectorView.InspectorView = UI.InspectorView.InspectorView.instance(),
              viewManager: UI.ViewManager.ViewManager = UI.ViewManager.ViewManager.instance()) {
    super(element);
    this.#view = view ?? DEFAULT_VIEW;
    this.#settings = settings;
    this.#inspectorView = inspectorView;
    this.#viewManager = viewManager;
    this.requestUpdate();

    if (this.#shouldTriggerPromotion()) {
      this.#triggerPromotion();
    }
  }

  override willHide(): void {
    super.willHide();
    this.#removeHoverEventListeners();

    if (this.#returnToDefaultStateTimeout) {
      window.clearTimeout(this.#returnToDefaultStateTimeout);
    }
  }

  #handleMainToolbarMouseEnter = (): void => {
    this.#mouseOnMainToolbar = true;
  };

  #handleMainToolbarMouseLeave = (): void => {
    this.#mouseOnMainToolbar = false;
  };

  #addHoverEventListeners(): void {
    this.#inspectorView.tabbedPane.headerElement().addEventListener('mouseenter', this.#handleMainToolbarMouseEnter);
    this.#inspectorView.tabbedPane.headerElement().addEventListener('mouseleave', this.#handleMainToolbarMouseLeave);
  }

  #removeHoverEventListeners(): void {
    this.#inspectorView.tabbedPane.headerElement().removeEventListener('mouseenter', this.#handleMainToolbarMouseEnter);
    this.#inspectorView.tabbedPane.headerElement().removeEventListener('mouseleave', this.#handleMainToolbarMouseLeave);
  }

  // We only want to enable promotion when:
  // * The flag is enabled,
  // * The current date is before the promotion end date,
  // * The click count on this button is less than 2.
  #shouldTriggerPromotion(): boolean {
    const isFlagEnabled = Boolean(Root.Runtime.hostConfig.devToolsGlobalAiButton?.promotionEnabled);
    const isBeforeEndDate = (new Date()) < PROMOTION_END_DATE;
    return isFlagEnabled && isBeforeEndDate && getClickCountSetting(this.#settings).get() < 2;
  }

  #triggerPromotion(): void {
    // Set up hover listeners for making sure that we don't return to default state from promotion state
    // when the user's cursor is on the main toolbar.
    this.#buttonState = GlobalAiButtonState.PROMOTION;
    this.requestUpdate();
    this.#addHoverEventListeners();
    this.#scheduleReturnToDefaultState();
  }

  #scheduleReturnToDefaultState(): void {
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

  #onClick(): void {
    this.#viewManager.showViewInLocation('freestyler', 'drawer-view');
    incrementClickCountSetting(this.#settings);

    const hasExplicitUserPreference = this.#inspectorView.isUserExplicitlyUpdatedDrawerOrientation();
    const isVerticalDrawerFeatureEnabled =
        Boolean(Root.Runtime.hostConfig.devToolsFlexibleLayout?.verticalDrawerEnabled);
    if (isVerticalDrawerFeatureEnabled && !hasExplicitUserPreference) {
      // This mimics what we're doing while showing the drawer via `ESC`.
      // There is a bug where opening the sidebar directly for the first time,
      // and triggering a drawer rotation without calling `showDrawer({focus: true})` makes the drawer disappear.
      this.#inspectorView.showDrawer({
        focus: true,
        hasTargetDrawer: false,
      });
      this.#inspectorView.toggleDrawerOrientation({force: UI.InspectorView.DrawerOrientation.VERTICAL});
    }
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

export class GlobalAiButtonToolbarProvider implements UI.Toolbar.Provider {
  #toolbarItem: UI.Toolbar.ToolbarItemWithCompactLayout;
  #widgetElement: UI.Widget.WidgetElement<GlobalAiButton>;

  constructor(settings: Common.Settings.Settings = Common.Settings.Settings.instance(),
              inspectorView: UI.InspectorView.InspectorView = UI.InspectorView.InspectorView.instance(),
              viewManager: UI.ViewManager.ViewManager = UI.ViewManager.ViewManager.instance()) {
    this.#widgetElement = document.createElement('devtools-widget') as UI.Widget.WidgetElement<GlobalAiButton>;
    new GlobalAiButton(this.#widgetElement, undefined, settings, inspectorView, viewManager);

    this.#toolbarItem = new UI.Toolbar.ToolbarItemWithCompactLayout(this.#widgetElement);
    this.#toolbarItem.setVisible(false);
  }

  item(): UI.Toolbar.ToolbarItem|null {
    return this.#toolbarItem;
  }
}
