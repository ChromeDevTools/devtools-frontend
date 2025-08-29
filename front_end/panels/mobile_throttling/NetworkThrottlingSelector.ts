// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Lit from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import {ThrottlingManager} from './ThrottlingManager.js';
import {type NetworkThrottlingConditionsGroup, ThrottlingPresets} from './ThrottlingPresets.js';

const {render, html, Directives} = Lit;

const UIStrings = {
  /**
   * @description Text to indicate something is not enabled
   */
  disabled: 'Disabled',
  /**
   * @description Title for a group of configuration options
   */
  presets: 'Presets',
  /**
   * @description Text in Network Throttling Selector of the Network panel
   */
  custom: 'Custom',
  /**
   *@description Text with two placeholders separated by a colon
   *@example {Node removed} PH1
   *@example {div#id1} PH2
   */
  sS: '{PH1}: {PH2}',
  /**
   *@description Accessibility label for custom add network throttling option
   *@example {Custom} PH1
   */
  addS: 'Add {PH1}',
  /**
   *@description Text in Throttling Manager of the Network panel
   */
  add: 'Add…',
  /**
   * @description Text label for a selection box showing that a specific option is recommended for CPU or Network throttling.
   * @example {Fast 4G} PH1
   * @example {4x slowdown} PH1
   */
  recommendedThrottling: '{PH1} – recommended',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/mobile_throttling/NetworkThrottlingSelector.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

interface ViewInput {
  recommendedConditions: SDK.NetworkManager.Conditions|null;
  selectedConditions: SDK.NetworkManager.Conditions;
  throttlingGroups: NetworkThrottlingConditionsGroup[];
  customConditionsGroup: NetworkThrottlingConditionsGroup;
  jslogContext: string;
  title: string;
  onSelect: (conditions: SDK.NetworkManager.Conditions) => void;
  onAddCustomConditions: () => void;
}
export type ViewFunction = (input: ViewInput, output: object, target: HTMLElement) => void;

export const DEFAULT_VIEW: ViewFunction = (input, output, target) => {
  // The title is usually an i18nLazyString except for custom values that are stored in the local storage in the form of a string.
  const title = (conditions: SDK.NetworkManager.Conditions): string =>
      typeof conditions.title === 'function' ? conditions.title() : conditions.title;
  const jslog = (group: NetworkThrottlingConditionsGroup, condition: SDK.NetworkManager.Conditions): string =>
      `${VisualLogging.item(Platform.StringUtilities.toKebabCase(condition.i18nTitleKey || title(condition))).track({
        click: true
      })}`;
  const optionsMap = new WeakMap<HTMLOptionElement, SDK.NetworkManager.Conditions>();
  let selectedConditions = input.selectedConditions;
  function onSelect(event: Event): void {
    const element = (event.target as HTMLSelectElement | null);
    if (!element) {
      return;
    }
    const option = element.selectedOptions[0];
    if (!option) {
      return;
    }
    if (option === element.options[element.options.length - 1]) {
      input.onAddCustomConditions();
      event.consume(true);
      element.value = title(selectedConditions);
    } else {
      const conditions = optionsMap.get(option);
      if (conditions) {
        selectedConditions = conditions;
        input.onSelect(conditions);
      }
    }
  }
  render(
      // clang-format off
    html`<select
      aria-label=${input.title}
      jslog=${VisualLogging.dropDown().track({change: true}).context(input.jslogContext)}
      @change=${onSelect}>
          ${input.throttlingGroups.map(
          group =>
          html`<optgroup
            label=${group.title}>
            ${group.items.map(condition => html`<option
              ${Directives.ref(option => option && optionsMap.set(option as HTMLOptionElement, condition))}
              ?selected=${SDK.NetworkManager.networkConditionsEqual(condition, selectedConditions)}
              value=${title(condition)}
              aria-label=${i18nString(UIStrings.sS, {PH1: group.title, PH2: title(condition)})}
              jslog=${jslog(group, condition)}>
                ${condition === input.recommendedConditions ?
                  i18nString(UIStrings.recommendedThrottling, {PH1: title(condition)}):
                  title(condition)}
            </option>`)}
        </optgroup>`)}
        <optgroup label=${input.customConditionsGroup.title}>
          ${input.customConditionsGroup.items.map(condition => html`<option
              ${Directives.ref(option => option && optionsMap.set(option as HTMLOptionElement, condition))}
              ?selected=${SDK.NetworkManager.networkConditionsEqual(condition, selectedConditions)}
              value=${title(condition)}
              aria-label=${i18nString(UIStrings.sS, {PH1: input.customConditionsGroup.title, PH2: title(condition)})}
              jslog=${VisualLogging.item('custom-network-throttling-item').track({click: true})}>
                ${condition === input.recommendedConditions ?
                  i18nString(UIStrings.recommendedThrottling, {PH1: title(condition)}):
                  title(condition)}
          </option>`)}
          <option
            value=${i18nString(UIStrings.add)}
            aria-label=${i18nString(UIStrings.addS, {PH1: input.customConditionsGroup.title})}
            jslog=${VisualLogging.action('add').track({click: true})}>
              ${i18nString(UIStrings.add)}
          </option>
        </optgroup>
      </select>`,  // clang-format on
      target);
};

export const enum Events {
  CONDITIONS_CHANGED = 'conditionsChanged',
}

export interface EventTypes {
  [Events.CONDITIONS_CHANGED]: SDK.NetworkManager.Conditions;
}

export class NetworkThrottlingSelect extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
  #recommendedConditions: SDK.NetworkManager.Conditions|null = null;
  readonly #element: HTMLElement;
  readonly #jslogContext: string;
  #currentConditions: SDK.NetworkManager.Conditions;
  readonly #title: string;
  readonly #view: ViewFunction;

  static createForGlobalConditions(element: HTMLElement, title: string): NetworkThrottlingSelect {
    ThrottlingManager.instance();  // Instantiate the throttling manager to connect network manager with the setting
    const select = new NetworkThrottlingSelect(
        element, title, SDK.NetworkManager.activeNetworkThrottlingKeySetting().name,
        SDK.NetworkManager.MultitargetNetworkManager.instance().networkConditions());
    select.addEventListener(
        Events.CONDITIONS_CHANGED,
        ev => SDK.NetworkManager.MultitargetNetworkManager.instance().setNetworkConditions(ev.data));
    SDK.NetworkManager.MultitargetNetworkManager.instance().addEventListener(
        SDK.NetworkManager.MultitargetNetworkManager.Events.CONDITIONS_CHANGED, () => {
          select.currentConditions = SDK.NetworkManager.MultitargetNetworkManager.instance().networkConditions();
        });
    return select;
  }

  constructor(
      element: HTMLElement, title: string, jslogContext: string, currentConditions: SDK.NetworkManager.Conditions,
      view = DEFAULT_VIEW) {
    super();
    SDK.NetworkManager.customUserNetworkConditionsSetting().addChangeListener(this.#performUpdate, this);
    this.#element = element;
    this.#jslogContext = jslogContext;
    this.#currentConditions = currentConditions;
    this.#title = title;
    this.#view = view;

    this.#performUpdate();
  }

  set recommendedConditions(recommendedConditions: SDK.NetworkManager.Conditions|null) {
    this.#recommendedConditions = recommendedConditions;
    this.#performUpdate();
  }

  set currentConditions(currentConditions: SDK.NetworkManager.Conditions) {
    this.#currentConditions = currentConditions;
    this.#performUpdate();
  }

  #performUpdate(): void {
    const customNetworkConditionsSetting = SDK.NetworkManager.customUserNetworkConditionsSetting();
    const customNetworkConditions = customNetworkConditionsSetting.get();
    const onAddCustomConditions = (): void => {
      void Common.Revealer.reveal(SDK.NetworkManager.customUserNetworkConditionsSetting());
    };

    const onSelect = (conditions: SDK.NetworkManager.Conditions): void => {
      this.dispatchEventToListeners(Events.CONDITIONS_CHANGED, conditions);
    };

    const throttlingGroups = [
      {title: i18nString(UIStrings.disabled), items: [SDK.NetworkManager.NoThrottlingConditions]},
      {title: i18nString(UIStrings.presets), items: ThrottlingPresets.networkPresets},
    ];
    const customConditionsGroup = {title: i18nString(UIStrings.custom), items: customNetworkConditions};
    const viewInput: ViewInput = {
      recommendedConditions: this.#recommendedConditions,
      selectedConditions: this.#currentConditions,
      jslogContext: this.#jslogContext,
      title: this.#title,
      onSelect,
      onAddCustomConditions,
      throttlingGroups,
      customConditionsGroup,
    };
    this.#view(viewInput, {}, this.#element);
  }
}
