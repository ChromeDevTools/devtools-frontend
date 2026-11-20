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
   * @description Text and tooltip of a button in the status bar at the bottom of DevTools. The button
   * changes all settings that have a pill in the status bar back to their default values.
   */
  resetAll: 'Reset all',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/common/StateChangesStatusBarPills.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

const {ref, repeat} = Directives;

const cpuThrottlingRateFormatter = i18n.NumberFormatter.defineFormatter({maximumFractionDigits: 1});

export interface Pill {
  /** Identifies the pill in the list of pills and in visual logging. */
  id: string;
  title: Platform.UIString.LocalizedString;
  resetTitle: Platform.UIString.LocalizedString;
  onReset: () => void;
}

export interface ViewInput {
  pills: Pill[];
  onResetAll: () => void;
}

export type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;

export const DEFAULT_VIEW: View = (input, _output, target) => {
  const focusableElements: Array<Element|undefined> = [];
  const handlePillReset = (pill: Pill, index: number): void => {
    const currElement = focusableElements[index];
    const nextElement = focusableElements[index + 1];
    if (currElement?.hasFocus() && nextElement instanceof HTMLElement) {
      nextElement.focus();
    }
    pill.onReset();
  };
  // clang-format off
  render(html`
    <style>${stateChangesStatusBarPillsStyles}</style>
    ${input.pills.length === 0 ? nothing : html`
      <div class="pills">${repeat(input.pills, pill => pill.id, (pill, index) => html`
        <span class="devtools-pill pill" jslog=${VisualLogging.item(pill.id)}>
          ${pill.title}
          <devtools-button
            .iconName=${'cross'}
            .variant=${Buttons.Button.Variant.ICON}
            .size=${Buttons.Button.Size.MICRO}
            .title=${pill.resetTitle}
            .accessibleLabel=${pill.resetTitle}
            .jslogContext=${'reset'}
            ${ref(element => {
              focusableElements[index] = element;
            })}
            @click=${() => handlePillReset(pill, index)}></devtools-button>
        </span>`)}</div>
      <devtools-button
        class="reset-all"
        .variant=${Buttons.Button.Variant.TEXT}
        .title=${i18nString(UIStrings.resetAll)}
        .jslogContext=${'state-reset-all'}
        ${ref(element => {
          if (input.pills.length > 1) {
            focusableElements[input.pills.length] = element;
          }
        })}
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

function toPill(state: DevToolsState.State.State, onReset: () => void): Pill {
  return {id: state.kind, title: pillTitle(state), resetTitle: pillResetTitle(state), onReset};
}

/** Shows a pill for each state change in the status bar. The user can reset one change or all changes. */
export class StateChangesStatusBarPills extends UI.Widget.Widget {
  static override readonly INJECT: readonly[typeof DevToolsState.StateManager.StateManager] =
      [DevToolsState.StateManager.StateManager] as const;

  readonly #view: View;
  readonly #stateManager: DevToolsState.StateManager.StateManager;

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
    this.requestUpdate();
  }

  override willHide(): void {
    this.#stateManager.removeEventListener(DevToolsState.State.Events.STATE_CHANGED, this.requestUpdate, this);
    super.willHide();
  }

  override performUpdate(): void {
    const pills =
        this.#stateManager.nonDefaultStates().map(state => toPill(state, () => this.#stateManager.reset(state.kind)));
    const viewInput: ViewInput = {
      pills,
      onResetAll: () => {
        for (const pill of pills) {
          pill.onReset();
        }
      },
    };
    this.#view(viewInput, undefined, this.contentElement);
  }
}
