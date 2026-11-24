// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as DevToolsState from '../../models/devtools_state/devtools_state.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as UI from '../../ui/legacy/legacy.js';
import {Directives, html, nothing, render} from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import stateChangesStatusBarPillsStyles from './stateChangesStatusBarPills.css.js';

const UIStrings = {
  /**
   * @description Text of a pill in the status bar at the bottom of DevTools. The pill tells the user
   * that the CPU of the inspected page is throttled. The placeholder is the slowdown factor of the CPU.
   * @example {4} PH1
   */
  cpuThrottling: 'CPU ({PH1}×)',
  /**
   * @description Tooltip and accessible name of the button in the CPU throttling pill in the status bar at
   * the bottom of DevTools. Clicking the button turns off CPU throttling on the inspected page.
   */
  stopCpuThrottling: 'Stop CPU throttling',
  /**
   * @description Text of a pill in the status bar at the bottom of DevTools. The pill tells the user
   * that the browser cache is disabled while DevTools is open.
   */
  cacheDisabled: 'Cache disabled',
  /**
   * @description Tooltip and accessible name of the button in the disabled-cache pill in the status bar at
   * the bottom of DevTools. Clicking the button turns the browser cache back on.
   */
  enableCache: 'Enable cache',
  /**
   * @description Text of a pill in the status bar at the bottom of DevTools. The pill tells the user
   * that JavaScript is disabled on the inspected page.
   */
  javaScriptDisabled: 'JavaScript disabled',
  /**
   * @description Tooltip and accessible name of the button in the disabled-JavaScript pill in the status
   * bar at the bottom of DevTools. Clicking the button turns JavaScript back on for the inspected page.
   */
  enableJavaScript: 'Enable JavaScript',
  /**
   * @description Label of a menu item in a submenu in the status bar at the bottom of DevTools.
   * Clicking it opens the panel or setting where the changed setting is configured.
   */
  inspectMenuItem: 'Inspect',
  /**
   * @description Label of a menu item in a submenu in the status bar at the bottom of DevTools.
   * Clicking it resets the changed setting back to its default value.
   */
  resetMenuItem: 'Reset',
  /**
   * @description Tooltip and accessible name of the button in the status bar at the bottom of DevTools.
   * The button opens a menu with the changed settings pills that do not fit.
   */
  morePills: 'Show more',
  /**
   * @description Text and tooltip of a button in the status bar at the bottom of DevTools. The button
   * changes all settings that have a pill in the status bar back to their default values.
   */
  resetAll: 'Reset all',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/common/StateChangesStatusBarPills.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

const {classMap, ref, repeat} = Directives;

const cpuThrottlingRateFormatter = i18n.NumberFormatter.defineFormatter({maximumFractionDigits: 1});

export interface Pill {
  /** Identifies the pill in the list of pills and in visual logging. */
  id: string;
  title: Platform.UIString.LocalizedString;
  resetTitle: Platform.UIString.LocalizedString;
  onReveal: () => void;
  onReset: () => void;
}

export interface ViewInput {
  pills: Pill[];
  visiblePillCount: number;
  showMoreMenuOpen: boolean;
  onResetAll: () => void;
  onShowMoreMenuOpen: () => void;
  onShowMoreMenuClosed: () => void;
}

export interface ViewOutput {
  containerWidth?: () => number;
  containerColumnGap?: () => number;
  pillsColumnGap?: () => number;
  pillWidths?: Array<() => number>;
  moreButtonWidth?: () => number;
  resetAllButtonWidth?: () => number;
}

export type View = (input: ViewInput, output: ViewOutput, target: HTMLElement) => void;

function openShowMoreMenu(event: Event, overflowPills: Pill[], onOpen: () => void, onClosed: () => void): void {
  const button = event.currentTarget as HTMLElement;
  const rect = button.getBoundingClientRect();
  const menu = new UI.ContextMenu.ContextMenu(event, {
    x: rect.left,
    y: rect.bottom,
    onSoftMenuClosed: onClosed,
  });
  for (const pill of overflowPills) {
    const subMenu = menu.defaultSection().appendSubMenuItem(pill.title, false, pill.id);
    subMenu.defaultSection().appendItem(i18nString(UIStrings.inspectMenuItem), pill.onReveal, {
      jslogContext: 'inspect',
    });
    subMenu.defaultSection().appendItem(i18nString(UIStrings.resetMenuItem), pill.onReset, {
      jslogContext: 'reset',
    });
  }
  onOpen();
  void menu.show();
}

export const DEFAULT_VIEW: View = (input, output, target) => {
  const overflowPills = input.pills.slice(input.visiblePillCount);
  const focusableElements: Array<Element|undefined> = [];
  const handlePillReset = (pill: Pill, index: number): void => {
    const nextElement = focusableElements[index + 1];
    if (target.hasFocus() && nextElement instanceof HTMLElement) {
      nextElement.focus();
    }
    pill.onReset();
  };
  output.containerWidth = () => target.clientWidth;
  output.containerColumnGap = () => parseFloat(getComputedStyle(target).columnGap) || 0;
  output.pillWidths = [];

  // clang-format off
  render(html`
    <style>${stateChangesStatusBarPillsStyles}</style>
    ${input.pills.length === 0 ? nothing : html`
      <div class="pills" ${ref(element => {
        output.pillsColumnGap = element ? () => parseFloat(getComputedStyle(element).columnGap) || 0 : undefined;
      })}>${repeat(input.pills, pill => pill.id, (pill, index) => html`
        <span
          ${ref(element => {
            if (element instanceof HTMLElement && output.pillWidths) {
              output.pillWidths[index] = () => element.offsetWidth;
            }
          })}
          class=${classMap({'devtools-pill': true, pill: true, collapsed: index >= input.visiblePillCount})}
          jslog=${VisualLogging.item(pill.id)}>
          <button
            class="pill-label"
            type="button"
            jslog=${VisualLogging.action('reveal').track({click: true})}
            ${ref(element => {
              if (index < input.visiblePillCount) {
                focusableElements[index] = element;
              }
            })}
            @click=${pill.onReveal}>${pill.title}</button>
          <devtools-button
            .iconName=${'cross'}
            .variant=${Buttons.Button.Variant.ICON}
            .size=${Buttons.Button.Size.MICRO}
            .title=${pill.resetTitle}
            .accessibleLabel=${pill.resetTitle}
            .jslogContext=${'reset'}
            @click=${() => handlePillReset(pill, index)}></devtools-button>
        </span>`)}</div>
      <devtools-button
        ${ref(element => {
          output.moreButtonWidth = element instanceof HTMLElement ? () => element.offsetWidth : undefined;
          if (overflowPills.length > 0) {
            focusableElements[input.visiblePillCount] = element;
          }
        })}
        class=${classMap({'more-pills': true, collapsed: overflowPills.length === 0})}
        .iconName=${'chevron-double-right'}
        .variant=${Buttons.Button.Variant.ICON}
        .size=${Buttons.Button.Size.SMALL}
        .title=${i18nString(UIStrings.morePills)}
        .accessibleLabel=${i18nString(UIStrings.morePills)}
        .accessibleExpanded=${input.showMoreMenuOpen}
        .jslogContext=${'more'}
        @click=${(event: Event) => openShowMoreMenu(event, overflowPills, input.onShowMoreMenuOpen, input.onShowMoreMenuClosed)}></devtools-button>
      <devtools-button
        ${ref(element => {
          output.resetAllButtonWidth = element instanceof HTMLElement ? () => element.offsetWidth : undefined;
          focusableElements[input.visiblePillCount] = element;
        })}
        class="reset-all"
        .variant=${Buttons.Button.Variant.TEXT}
        .title=${i18nString(UIStrings.resetAll)}
        .jslogContext=${'state-reset-all'}
        @click=${input.onResetAll}>${i18nString(UIStrings.resetAll)}</devtools-button>
    `}
  `, target, {container: {attributes: {jslog: `${VisualLogging.section('state-changes')}`}}});
  // clang-format on
};

function pillTitle(state: DevToolsState.State.State): Platform.UIString.LocalizedString {
  switch (state.kind) {
    case DevToolsState.State.StateKind.CPU_THROTTLING:
      return i18nString(UIStrings.cpuThrottling, {PH1: cpuThrottlingRateFormatter.format(Number(state.value))});
    case DevToolsState.State.StateKind.CACHE_DISABLED:
      return i18nString(UIStrings.cacheDisabled);
    case DevToolsState.State.StateKind.JAVASCRIPT_DISABLED:
      return i18nString(UIStrings.javaScriptDisabled);
    default:
      Platform.assertNever(state.kind, 'Unknown state');
  }
}

function pillResetTitle(state: DevToolsState.State.State): Platform.UIString.LocalizedString {
  switch (state.kind) {
    case DevToolsState.State.StateKind.CPU_THROTTLING:
      return i18nString(UIStrings.stopCpuThrottling);
    case DevToolsState.State.StateKind.CACHE_DISABLED:
      return i18nString(UIStrings.enableCache);
    case DevToolsState.State.StateKind.JAVASCRIPT_DISABLED:
      return i18nString(UIStrings.enableJavaScript);
    default:
      Platform.assertNever(state.kind, 'Unknown state');
  }
}

function countFittingPills(pillWidths: Array<() => number>, maxWidth: number, gap: number): number {
  let usedWidth = 0;
  for (let i = 0; i < pillWidths.length; i++) {
    usedWidth += pillWidths[i]() + (i > 0 ? gap : 0);
    if (usedWidth > maxWidth) {
      return i;
    }
  }
  return pillWidths.length;
}

/** Shows a pill for each state change in the status bar. The user can reveal or reset a change, or reset all changes. */
export class StateChangesStatusBarPills extends UI.Widget.Widget {
  static override readonly INJECT: readonly[typeof DevToolsState.StateManager.StateManager] =
      [DevToolsState.StateManager.StateManager] as const;

  readonly #view: View;
  readonly #viewOutput: ViewOutput = {};
  readonly #stateManager: DevToolsState.StateManager.StateManager;
  readonly #resizeObserver = new ResizeObserver(() => {
    if (this.#updateVisiblePillCount()) {
      this.requestUpdate();
    }
  });
  #visiblePillCount = Infinity;
  #showMoreMenuOpen = false;

  #onShowMoreMenuOpen = (): void => {
    if (!this.#showMoreMenuOpen) {
      this.#showMoreMenuOpen = true;
      this.requestUpdate();
    }
  };

  #onShowMoreMenuClosed = (): void => {
    if (this.#showMoreMenuOpen) {
      this.#showMoreMenuOpen = false;
      this.requestUpdate();
    }
  };

  constructor(
      element: HTMLElement|undefined,
      [stateManager]: UI.Widget.WidgetDependencies<typeof StateChangesStatusBarPills>,
      view: View = DEFAULT_VIEW,
  ) {
    super(element);
    this.#view = view;
    this.#stateManager = stateManager;
  }

  override wasShown(): void {
    super.wasShown();
    this.#stateManager.addEventListener(DevToolsState.State.Events.STATE_CHANGED, this.requestUpdate, this);
    this.#resizeObserver.observe(this.contentElement);
    this.requestUpdate();
  }

  override willHide(): void {
    this.#resizeObserver.disconnect();
    this.#stateManager.removeEventListener(DevToolsState.State.Events.STATE_CHANGED, this.requestUpdate, this);
    super.willHide();
  }

  override performUpdate(): void {
    const pills: Pill[] =
        this.#stateManager.nonDefaultStates().map(state => ({
                                                    id: state.kind,
                                                    title: pillTitle(state),
                                                    resetTitle: pillResetTitle(state),
                                                    onReveal: () => void this.#stateManager.reveal(state.kind),
                                                    onReset: () => this.#stateManager.reset(state.kind),
                                                  }));
    const onResetAll = (): void => {
      for (const pill of pills) {
        pill.onReset();
      }
    };
    const renderView = (): void => {
      const visiblePillCount = Math.min(this.#visiblePillCount, pills.length);
      this.#view({
        pills,
        visiblePillCount,
        showMoreMenuOpen: this.#showMoreMenuOpen,
        onResetAll,
        onShowMoreMenuOpen: this.#onShowMoreMenuOpen,
        onShowMoreMenuClosed: this.#onShowMoreMenuClosed,
      },
                 this.#viewOutput, this.contentElement);
    };
    renderView();
    if (this.#updateVisiblePillCount()) {
      renderView();
    }
  }

  #updateVisiblePillCount(): boolean {
    const pillWidths = this.#viewOutput.pillWidths;
    if (!pillWidths?.length) {
      this.#visiblePillCount = Infinity;
      return false;
    }
    const containerWidth = this.#viewOutput.containerWidth?.();
    const moreButtonWidth = this.#viewOutput.moreButtonWidth?.();
    const resetAllButtonWidth = this.#viewOutput.resetAllButtonWidth?.();
    if (!containerWidth || !moreButtonWidth || !resetAllButtonWidth) {
      return false;
    }
    const containerColumnGap = this.#viewOutput.containerColumnGap?.() ?? 0;
    const pillsColumnGap = this.#viewOutput.pillsColumnGap?.() ?? 0;
    const maxWidth = containerWidth - resetAllButtonWidth - containerColumnGap;
    let nextCount = countFittingPills(pillWidths, maxWidth, pillsColumnGap);
    if (nextCount < pillWidths.length) {
      nextCount = countFittingPills(pillWidths, maxWidth - moreButtonWidth - containerColumnGap, pillsColumnGap);
    }
    const displayedCount = Math.min(this.#visiblePillCount, pillWidths.length);
    this.#visiblePillCount = nextCount < pillWidths.length ? nextCount : Infinity;
    return nextCount !== displayedCount;
  }
}
