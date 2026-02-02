// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../../ui/kit/kit.js';

import * as i18n from '../../../core/i18n/i18n.js';
import * as Platform from '../../../core/platform/platform.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';

import linearMemoryValueInterpreterStyles from './linearMemoryValueInterpreter.css.js';
import {ValueInterpreterDisplay} from './ValueInterpreterDisplay.js';
import {Endianness, type ValueType, type ValueTypeMode} from './ValueInterpreterDisplayUtils.js';
import {ValueInterpreterSettings} from './ValueInterpreterSettings.js';

const UIStrings = {
  /**
   * @description Tooltip text that appears when hovering over the gear button to open and close settings in the Linear memory inspector. These settings
   *             allow the user to change the value type to view, such as 32-bit Integer, or 32-bit Float.
   */
  toggleValueTypeSettings: 'Toggle value type settings',
  /**
   * @description Tooltip text that appears when hovering over the 'Little Endian' or 'Big Endian' setting in the Linear memory inspector.
   */
  changeEndianness: 'Change `Endianness`',
} as const;
const str_ =
    i18n.i18n.registerUIStrings('panels/linear_memory_inspector/components/LinearMemoryValueInterpreter.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

const {render, html} = Lit;
const {widgetConfig} = UI.Widget;

export interface ViewInput {
  endianness: Endianness;
  buffer: ArrayBuffer;
  valueTypes: Set<ValueType>;
  valueTypeModes: Map<ValueType, ValueTypeMode>;
  memoryLength: number;
  showSettings: boolean;
  onValueTypeModeChange: (type: ValueType, mode: ValueTypeMode) => void;
  onJumpToAddressClicked: (address: number) => void;
  onEndiannessChanged: (endianness: Endianness) => void;
  onValueTypeToggled: (type: ValueType, checked: boolean) => void;
  onSettingsToggle: () => void;
}

function renderEndiannessSetting(
    onEndiannessChanged: (endianness: Endianness) => void, currentEndiannes: Endianness): Lit.TemplateResult {
  // Disabled until https://crbug.com/1079231 is fixed.
  // clang-format off
    return html`
    <label data-endianness-setting="true" title=${i18nString(UIStrings.changeEndianness)}>
      <select
        jslog=${VisualLogging.dropDown('linear-memory-inspector.endianess').track({change: true})}
        style="border: none;"
        data-endianness="true" @change=${(e: Event) => onEndiannessChanged((e.target as HTMLSelectElement).value as Endianness)}>
        ${[Endianness.LITTLE, Endianness.BIG].map(endianness => {
            return html`<option value=${endianness} .selected=${currentEndiannes === endianness}
            jslog=${VisualLogging.item(Platform.StringUtilities.toKebabCase(endianness)).track({click: true})}>${
                i18n.i18n.lockedString(endianness)}</option>`;
        })}
      </select>
    </label>
    `;
  // clang-format on
}

export const DEFAULT_VIEW = (input: ViewInput, _output: undefined, target: HTMLElement): void => {
  // Disabled until https://crbug.com/1079231 is fixed.
  // clang-format off
  render(html`
    <style>${UI.inspectorCommonStyles}</style>
    <style>${linearMemoryValueInterpreterStyles}</style>
    <div class="value-interpreter">
      <div class="settings-toolbar">
        ${renderEndiannessSetting(input.onEndiannessChanged, input.endianness)}
        <devtools-button data-settings="true" class="toolbar-button ${input.showSettings ? '' : 'disabled'}"
            title=${i18nString(UIStrings.toggleValueTypeSettings)} @click=${input.onSettingsToggle}
            jslog=${VisualLogging.toggleSubpane('linear-memory-inspector.toggle-value-settings').track({ click: true })}
            .iconName=${'gear'}
            .toggledIconName=${'gear-filled'}
            .toggleType=${Buttons.Button.ToggleType.PRIMARY}
            .variant=${Buttons.Button.Variant.ICON_TOGGLE}
        ></devtools-button>
      </div>
      <span class="divider"></span>
      <div>
        ${input.showSettings ?
      html`
            <devtools-widget .widgetConfig=${widgetConfig(ValueInterpreterSettings, {
              valueTypes: input.valueTypes, onToggle: input.onValueTypeToggled
            })}>
            </devtools-widget>` :
      html`
            <devtools-widget .widgetConfig=${widgetConfig(ValueInterpreterDisplay, {
              buffer: input.buffer,
              valueTypes: input.valueTypes,
              endianness: input.endianness,
              valueTypeModes: input.valueTypeModes,
              memoryLength: input.memoryLength,
              onValueTypeModeChange: input.onValueTypeModeChange,
              onJumpToAddressClicked: input.onJumpToAddressClicked,
            })}>
            </devtools-widget>`}
      </div>
    </div>
  `,
    target,
  );
  // clang-format on
};

export type View = typeof DEFAULT_VIEW;

export class LinearMemoryValueInterpreter extends UI.Widget.Widget {
  readonly #view: View;
  #endianness = Endianness.LITTLE;
  #buffer = new ArrayBuffer(0);
  #valueTypes = new Set<ValueType>();
  #valueTypeModeConfig = new Map<ValueType, ValueTypeMode>();
  #memoryLength = 0;
  #showSettings = false;
  #onValueTypeModeChange: (type: ValueType, mode: ValueTypeMode) => void = () => {};
  #onJumpToAddressClicked: (address: number) => void = () => {};
  #onEndiannessChanged: (endianness: Endianness) => void = () => {};
  #onValueTypeToggled: (type: ValueType, checked: boolean) => void = () => {};

  constructor(element?: HTMLElement, view: View = DEFAULT_VIEW) {
    super(element);
    this.#view = view;
  }

  set buffer(value: ArrayBuffer) {
    this.#buffer = value;
    this.requestUpdate();
  }

  get buffer(): ArrayBuffer {
    return this.#buffer;
  }

  set valueTypes(value: Set<ValueType>) {
    this.#valueTypes = value;
    this.requestUpdate();
  }

  get valueTypes(): Set<ValueType> {
    return this.#valueTypes;
  }

  set valueTypeModes(value: Map<ValueType, ValueTypeMode>) {
    this.#valueTypeModeConfig = value;
    this.requestUpdate();
  }

  get valueTypeModes(): Map<ValueType, ValueTypeMode> {
    return this.#valueTypeModeConfig;
  }

  set endianness(value: Endianness) {
    this.#endianness = value;
    this.requestUpdate();
  }

  get endianness(): Endianness {
    return this.#endianness;
  }

  set memoryLength(value: number) {
    this.#memoryLength = value;
    this.requestUpdate();
  }

  get memoryLength(): number {
    return this.#memoryLength;
  }

  get onValueTypeModeChange(): (type: ValueType, mode: ValueTypeMode) => void {
    return this.#onValueTypeModeChange;
  }

  set onValueTypeModeChange(value: (type: ValueType, mode: ValueTypeMode) => void) {
    this.#onValueTypeModeChange = value;
    this.requestUpdate();
  }

  get onJumpToAddressClicked(): (address: number) => void {
    return this.#onJumpToAddressClicked;
  }

  set onJumpToAddressClicked(value: (address: number) => void) {
    this.#onJumpToAddressClicked = value;
    this.requestUpdate();
  }

  get onEndiannessChanged(): (endianness: Endianness) => void {
    return this.#onEndiannessChanged;
  }

  set onEndiannessChanged(value: (endianness: Endianness) => void) {
    this.#onEndiannessChanged = value;
    this.performUpdate();
  }

  get onValueTypeToggled(): (type: ValueType, checked: boolean) => void {
    return this.#onValueTypeToggled;
  }

  set onValueTypeToggled(value: (type: ValueType, checked: boolean) => void) {
    this.#onValueTypeToggled = value;
    this.performUpdate();
  }

  override performUpdate(): void {
    const viewInput: ViewInput = {
      endianness: this.#endianness,
      buffer: this.#buffer,
      valueTypes: this.#valueTypes,
      valueTypeModes: this.#valueTypeModeConfig,
      memoryLength: this.#memoryLength,
      showSettings: this.#showSettings,
      onValueTypeModeChange: this.#onValueTypeModeChange,
      onJumpToAddressClicked: this.#onJumpToAddressClicked,
      onEndiannessChanged: this.#onEndiannessChanged,
      onValueTypeToggled: this.#onValueTypeToggled,
      onSettingsToggle: this.#onSettingsToggle.bind(this),
    };
    this.#view(viewInput, undefined, this.contentElement);
  }

  #onSettingsToggle(): void {
    this.#showSettings = !this.#showSettings;
    this.requestUpdate();
  }
}
