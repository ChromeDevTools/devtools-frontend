var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/panels/linear_memory_inspector/components/LinearMemoryHighlightChipList.js
var LinearMemoryHighlightChipList_exports = {};
__export(LinearMemoryHighlightChipList_exports, {
  LinearMemoryHighlightChipList: () => LinearMemoryHighlightChipList
});
import "./../../../ui/kit/kit.js";
import * as i18n from "./../../../core/i18n/i18n.js";
import { Directives, html, render } from "./../../../ui/lit/lit.js";
import * as VisualLogging from "./../../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/linear_memory_inspector/components/linearMemoryHighlightChipList.css.js
var linearMemoryHighlightChipList_css_default = `/*
 * Copyright 2022 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.highlight-chip-list {
  min-height: 20px;
  display: flex;
  flex-wrap: wrap;
  justify-content: left;
  align-items: center;
  background-color: var(--sys-color-cdt-base-container);
  margin: 8px 0;
  gap: 8px;
  row-gap: 6px;
}

.highlight-chip {
  background: var(--sys-color-cdt-base-container);
  border: 1px solid var(--sys-color-divider);
  height: 18px;
  border-radius: 4px;
  flex: 0 0 auto;
  max-width: 250px;
  position: relative;
  padding: 0 6px;
}

.highlight-chip:hover {
  background-color: var(--sys-color-state-hover-on-subtle);
}

.delete-highlight-container {
  display: none;
  height: 100%;
  position: absolute;
  right: 0;
  top: 0;
  border-radius: 4px;
  width: 24px;
  align-items: center;
  justify-content: center;
}

.delete-highlight-button {
  cursor: pointer;
  width: 13px;
  height: 13px;
  border: none;
  background-color: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
}

.delete-highlight-button:hover {
  background-color: var(--sys-color-state-hover-on-subtle);
  border-radius: 50%;
}

.jump-to-highlight-button {
  cursor: pointer;
  padding: 0;
  border: none;
  background: none;
  height: 100%;
  align-items: center;
  max-width: 100%;
  overflow: hidden;
}

.delete-highlight-button devtools-icon {
  width: 13px;
  height: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.source-code {
  font-family: var(--source-code-font-family);
  font-size: var(--source-code-font-size);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--sys-color-on-surface);
}

.value {
  color: var(--sys-color-token-tag);
}

.separator {
  white-space: pre;
  flex-shrink: 0;
}

.highlight-chip.focused {
  outline: 2px solid var(--sys-color-state-focus-ring);
  outline-offset: 2px;
}

.highlight-chip:hover > .delete-highlight-container {
  display: flex;
  /* To avoid issues with stacking semi-transparent colors, we use a hardcoded solid color here. */
  /* stylelint-disable-next-line plugin/use_theme_colors */
  background: linear-gradient(90deg, transparent 0%, rgb(241 243 244) 25%)
}

.highlight-chip.focused:hover > .delete-highlight-container {
  /* To avoid issues with stacking semi-transparent colors, we use a hardcoded solid color here. */
  /* stylelint-disable-next-line plugin/use_theme_colors */
  background: linear-gradient(90deg, transparent 0%, rgb(231 241 253) 25%);
}

:host-context(.theme-with-dark-background) .highlight-chip:hover > .delete-highlight-container {
  display: flex;
  /* To avoid issues with stacking semi-transparent colors, we use a hardcoded solid color here. */
  /* stylelint-disable-next-line plugin/use_theme_colors */
  background: linear-gradient(90deg, transparent 0%, rgb(41 42 45) 25%);
}

:host-context(.theme-with-dark-background) .highlight-chip.focused:hover > .delete-highlight-container {
  /* To avoid issues with stacking semi-transparent colors, we use a hardcoded solid color here. */
  /* stylelint-disable-next-line plugin/use_theme_colors */
  background: linear-gradient(90deg, transparent 0%, rgb(48 55 68) 25%);
}

/*# sourceURL=${import.meta.resolve("./linearMemoryHighlightChipList.css")} */`;

// gen/front_end/panels/linear_memory_inspector/components/LinearMemoryHighlightChipList.js
var UIStrings = {
  /**
   * @description Tooltip text that appears when hovering over an inspected variable's button in the Linear Memory Highlight Chip List.
   * Clicking the button changes the displayed slice of computer memory in the Linear Memory inspector to contain the inspected variable's bytes.
   */
  jumpToAddress: "Jump to this memory",
  /**
   * @description Tooltip text that appears when hovering over an inspected variable's delete button in the Linear Memory Highlight Chip List.
   * Clicking the delete button stops highlighting the variable's memory in the Linear Memory inspector.
   * 'Memory' is a slice of bytes in the computer memory.
   */
  deleteHighlight: "Stop highlighting this memory"
};
var str_ = i18n.i18n.registerUIStrings("panels/linear_memory_inspector/components/LinearMemoryHighlightChipList.ts", UIStrings);
var i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
var { classMap } = Directives;
var LinearMemoryHighlightChipList = class extends HTMLElement {
  #shadow = this.attachShadow({ mode: "open" });
  #highlightedAreas = [];
  #focusedMemoryHighlight;
  #jumpToAddress;
  #deleteHighlight;
  set data(data) {
    this.#highlightedAreas = data.highlightInfos;
    this.#focusedMemoryHighlight = data.focusedMemoryHighlight;
    this.#jumpToAddress = data.jumpToAddress;
    this.#deleteHighlight = data.deleteHighlight;
    this.#render();
  }
  #render() {
    render(html`
      <style>${linearMemoryHighlightChipList_css_default}</style>
      <div class="highlight-chip-list">
        ${this.#highlightedAreas.map((highlightInfo) => this.#createChip(highlightInfo))}
      </div>`, this.#shadow);
  }
  #createChip(highlightInfo) {
    const expressionName = highlightInfo.name || "<anonymous>";
    const expressionType = highlightInfo.type;
    const isFocused = highlightInfo === this.#focusedMemoryHighlight;
    return html`
      <div class=${classMap({ focused: isFocused, "highlight-chip": true })}>
        <button class="jump-to-highlight-button"
                title=${i18nString(UIStrings.jumpToAddress)}
                jslog=${VisualLogging.action("linear-memory-inspector.jump-to-highlight").track({ click: true })}
                @click=${() => this.#onJumpToHighlightClick(highlightInfo.startAddress)}>
          <span class="source-code">
            <span class="value">${expressionName}</span>
            <span class="separator">: </span>
            <span>${expressionType}</span>
          </span>
        </button>
        <div class="delete-highlight-container">
          <button class="delete-highlight-button" title=${i18nString(UIStrings.deleteHighlight)}
              jslog=${VisualLogging.action("linear-memory-inspector.delete-highlight").track({ click: true })}
              @click=${() => this.#onDeleteHighlightClick(highlightInfo)}>
            <devtools-icon name="cross" class="medium">
            </devtools-icon>
          </button>
        </div>
      </div>`;
  }
  #onJumpToHighlightClick(startAddress) {
    this.#jumpToAddress?.(startAddress);
  }
  #onDeleteHighlightClick(highlight) {
    this.#deleteHighlight?.(highlight);
  }
};
customElements.define("devtools-linear-memory-highlight-chip-list", LinearMemoryHighlightChipList);

// gen/front_end/panels/linear_memory_inspector/components/LinearMemoryInspector.js
var LinearMemoryInspector_exports = {};
__export(LinearMemoryInspector_exports, {
  DEFAULT_VIEW: () => DEFAULT_VIEW,
  LinearMemoryInspector: () => LinearMemoryInspector
});

// gen/front_end/panels/linear_memory_inspector/components/LinearMemoryValueInterpreter.js
var LinearMemoryValueInterpreter_exports = {};
__export(LinearMemoryValueInterpreter_exports, {
  EndiannessChangedEvent: () => EndiannessChangedEvent,
  LinearMemoryValueInterpreter: () => LinearMemoryValueInterpreter,
  ValueTypeToggledEvent: () => ValueTypeToggledEvent
});
import "./../../../ui/kit/kit.js";

// gen/front_end/panels/linear_memory_inspector/components/ValueInterpreterDisplay.js
var ValueInterpreterDisplay_exports = {};
__export(ValueInterpreterDisplay_exports, {
  JumpToPointerAddressEvent: () => JumpToPointerAddressEvent,
  ValueInterpreterDisplay: () => ValueInterpreterDisplay,
  ValueTypeModeChangedEvent: () => ValueTypeModeChangedEvent
});
import "./../../../ui/kit/kit.js";
import * as i18n5 from "./../../../core/i18n/i18n.js";
import * as UI from "./../../../ui/legacy/legacy.js";
import * as Lit from "./../../../ui/lit/lit.js";
import * as VisualLogging2 from "./../../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/linear_memory_inspector/components/valueInterpreterDisplay.css.js
var valueInterpreterDisplay_css_default = `/*
 * Copyright 2021 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

:host {
  flex: auto;
  display: flex;
}

.value-types {
  width: 100%;
  display: grid;
  grid-template-columns: auto auto 1fr;
  gap: 4px 24px;
  min-height: 24px;
  overflow: hidden;
  padding: 2px 12px;
  align-items: baseline;
  justify-content: start;
}

.value-type-cell {
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 24px;
}

.value-type-value-with-link {
  display: flex;
  align-items: center;
}

.value-type-cell-no-mode {
  grid-column: 1 / 3;
}

.jump-to-button {
  display: flex;
  width: 20px;
  height: 20px;
  border: none;
  padding: 0;
  outline: none;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  background-color: var(--sys-color-cdt-base-container);
}

.signed-divider {
  width: 1px;
  height: 15px;
  background-color: var(--sys-color-divider);
  margin: 0 4px;
}

.selectable-text {
  user-select: text;
}

.selectable-text::selection {
  background-color: var(--sys-color-tonal-container);
  color: currentcolor;
}

/*# sourceURL=${import.meta.resolve("./valueInterpreterDisplay.css")} */`;

// gen/front_end/panels/linear_memory_inspector/components/ValueInterpreterDisplayUtils.js
var ValueInterpreterDisplayUtils_exports = {};
__export(ValueInterpreterDisplayUtils_exports, {
  VALUE_INTEPRETER_MAX_NUM_BYTES: () => VALUE_INTEPRETER_MAX_NUM_BYTES,
  VALUE_TYPE_MODE_LIST: () => VALUE_TYPE_MODE_LIST,
  format: () => format,
  formatFloat: () => formatFloat,
  formatInteger: () => formatInteger,
  getDefaultValueTypeMapping: () => getDefaultValueTypeMapping,
  getPointerAddress: () => getPointerAddress,
  isNumber: () => isNumber,
  isPointer: () => isPointer,
  isValidMode: () => isValidMode,
  valueTypeToLocalizedString: () => valueTypeToLocalizedString
});
import * as i18n3 from "./../../../core/i18n/i18n.js";
import * as Platform from "./../../../core/platform/platform.js";
var UIStrings2 = {
  /**
   * @description Text that is shown in the LinearMemoryInspector if a value could not be correctly formatted
   *             for the requested mode (e.g. we do not floats to be represented as hexadecimal numbers).
   *             Abbreviation stands for 'not applicable'.
   */
  notApplicable: "N/A"
};
var str_2 = i18n3.i18n.registerUIStrings("panels/linear_memory_inspector/components/ValueInterpreterDisplayUtils.ts", UIStrings2);
var i18nString2 = i18n3.i18n.getLocalizedString.bind(void 0, str_2);
var VALUE_INTEPRETER_MAX_NUM_BYTES = 8;
function getDefaultValueTypeMapping() {
  return new Map(DEFAULT_MODE_MAPPING);
}
var DEFAULT_MODE_MAPPING = /* @__PURE__ */ new Map([
  [
    "Integer 8-bit",
    "dec"
    /* ValueTypeMode.DECIMAL */
  ],
  [
    "Integer 16-bit",
    "dec"
    /* ValueTypeMode.DECIMAL */
  ],
  [
    "Integer 32-bit",
    "dec"
    /* ValueTypeMode.DECIMAL */
  ],
  [
    "Integer 64-bit",
    "dec"
    /* ValueTypeMode.DECIMAL */
  ],
  [
    "Float 32-bit",
    "dec"
    /* ValueTypeMode.DECIMAL */
  ],
  [
    "Float 64-bit",
    "dec"
    /* ValueTypeMode.DECIMAL */
  ],
  [
    "Pointer 32-bit",
    "hex"
    /* ValueTypeMode.HEXADECIMAL */
  ],
  [
    "Pointer 64-bit",
    "hex"
    /* ValueTypeMode.HEXADECIMAL */
  ]
]);
var VALUE_TYPE_MODE_LIST = [
  "dec",
  "hex",
  "oct",
  "sci"
];
function valueTypeToLocalizedString(valueType) {
  return i18n3.i18n.lockedString(valueType);
}
function isValidMode(type, mode) {
  switch (type) {
    case "Integer 8-bit":
    case "Integer 16-bit":
    case "Integer 32-bit":
    case "Integer 64-bit":
      return mode === "dec" || mode === "hex" || mode === "oct";
    case "Float 32-bit":
    case "Float 64-bit":
      return mode === "sci" || mode === "dec";
    case "Pointer 32-bit":
    // fallthrough
    case "Pointer 64-bit":
      return mode === "hex";
    default:
      return Platform.assertNever(type, `Unknown value type: ${type}`);
  }
}
function isNumber(type) {
  switch (type) {
    case "Integer 8-bit":
    case "Integer 16-bit":
    case "Integer 32-bit":
    case "Integer 64-bit":
    case "Float 32-bit":
    case "Float 64-bit":
      return true;
    default:
      return false;
  }
}
function getPointerAddress(type, buffer, endianness) {
  if (!isPointer(type)) {
    console.error(`Requesting address of a non-pointer type: ${type}.
`);
    return NaN;
  }
  try {
    const dataView = new DataView(buffer);
    const isLittleEndian = endianness === "Little Endian";
    return type === "Pointer 32-bit" ? dataView.getUint32(0, isLittleEndian) : dataView.getBigUint64(0, isLittleEndian);
  } catch {
    return NaN;
  }
}
function isPointer(type) {
  return type === "Pointer 32-bit" || type === "Pointer 64-bit";
}
function format(formatData) {
  if (!formatData.mode) {
    console.error(`No known way of showing value for ${formatData.type}`);
    return i18nString2(UIStrings2.notApplicable);
  }
  const valueView = new DataView(formatData.buffer);
  const isLittleEndian = formatData.endianness === "Little Endian";
  let value;
  try {
    switch (formatData.type) {
      case "Integer 8-bit":
        value = formatData.signed ? valueView.getInt8(0) : valueView.getUint8(0);
        return formatInteger(value, formatData.mode);
      case "Integer 16-bit":
        value = formatData.signed ? valueView.getInt16(0, isLittleEndian) : valueView.getUint16(0, isLittleEndian);
        return formatInteger(value, formatData.mode);
      case "Integer 32-bit":
        value = formatData.signed ? valueView.getInt32(0, isLittleEndian) : valueView.getUint32(0, isLittleEndian);
        return formatInteger(value, formatData.mode);
      case "Integer 64-bit":
        value = formatData.signed ? valueView.getBigInt64(0, isLittleEndian) : valueView.getBigUint64(0, isLittleEndian);
        return formatInteger(value, formatData.mode);
      case "Float 32-bit":
        value = valueView.getFloat32(0, isLittleEndian);
        return formatFloat(value, formatData.mode);
      case "Float 64-bit":
        value = valueView.getFloat64(0, isLittleEndian);
        return formatFloat(value, formatData.mode);
      case "Pointer 32-bit":
        value = valueView.getUint32(0, isLittleEndian);
        return formatInteger(
          value,
          "hex"
          /* ValueTypeMode.HEXADECIMAL */
        );
      case "Pointer 64-bit":
        value = valueView.getBigUint64(0, isLittleEndian);
        return formatInteger(
          value,
          "hex"
          /* ValueTypeMode.HEXADECIMAL */
        );
      default:
        return Platform.assertNever(formatData.type, `Unknown value type: ${formatData.type}`);
    }
  } catch {
    return i18nString2(UIStrings2.notApplicable);
  }
}
function formatFloat(value, mode) {
  switch (mode) {
    case "dec":
      return value.toFixed(2).toString();
    case "sci":
      return value.toExponential(2).toString();
    default:
      throw new Error(`Unknown mode for floats: ${mode}.`);
  }
}
function formatInteger(value, mode) {
  switch (mode) {
    case "dec":
      return value.toString();
    case "hex":
      if (value < 0) {
        return i18nString2(UIStrings2.notApplicable);
      }
      return "0x" + value.toString(16).toUpperCase();
    case "oct":
      if (value < 0) {
        return i18nString2(UIStrings2.notApplicable);
      }
      return value.toString(8);
    default:
      throw new Error(`Unknown mode for integers: ${mode}.`);
  }
}

// gen/front_end/panels/linear_memory_inspector/components/ValueInterpreterDisplay.js
var UIStrings3 = {
  /**
   * @description Tooltip text that appears when hovering over an unsigned interpretation of the memory under the Value Interpreter
   */
  unsignedValue: "`Unsigned` value",
  /**
   * @description Tooltip text that appears when hovering over the element to change value type modes of under the Value Interpreter. Value type modes
   *             are different ways of viewing a certain value, e.g.: 10 (decimal) can be 0xa in hexadecimal mode, or 12 in octal mode.
   */
  changeValueTypeMode: "Change mode",
  /**
   * @description Tooltip text that appears when hovering over a signed interpretation of the memory under the Value Interpreter
   */
  signedValue: "`Signed` value",
  /**
   * @description Tooltip text that appears when hovering over a 'jump-to-address' button that is next to a pointer (32-bit or 64-bit) under the Value Interpreter
   */
  jumpToPointer: "Jump to address",
  /**
   * @description Tooltip text that appears when hovering over a 'jump-to-address' button that is next to a pointer (32-bit or 64-bit) with an invalid address under the Value Interpreter.
   */
  addressOutOfRange: "Address out of memory range"
};
var str_3 = i18n5.i18n.registerUIStrings("panels/linear_memory_inspector/components/ValueInterpreterDisplay.ts", UIStrings3);
var i18nString3 = i18n5.i18n.getLocalizedString.bind(void 0, str_3);
var { render: render2, html: html2 } = Lit;
var SORTED_VALUE_TYPES = Array.from(getDefaultValueTypeMapping().keys());
var ValueTypeModeChangedEvent = class _ValueTypeModeChangedEvent extends Event {
  static eventName = "valuetypemodechanged";
  data;
  constructor(type, mode) {
    super(_ValueTypeModeChangedEvent.eventName, {
      composed: true
    });
    this.data = { type, mode };
  }
};
var JumpToPointerAddressEvent = class _JumpToPointerAddressEvent extends Event {
  static eventName = "jumptopointeraddress";
  data;
  constructor(address) {
    super(_JumpToPointerAddressEvent.eventName, {
      composed: true
    });
    this.data = address;
  }
};
var ValueInterpreterDisplay = class extends HTMLElement {
  #shadow = this.attachShadow({ mode: "open" });
  #endianness = "Little Endian";
  #buffer = new ArrayBuffer(0);
  #valueTypes = /* @__PURE__ */ new Set();
  #valueTypeModeConfig = getDefaultValueTypeMapping();
  #memoryLength = 0;
  set data(data) {
    this.#buffer = data.buffer;
    this.#endianness = data.endianness;
    this.#valueTypes = data.valueTypes;
    this.#memoryLength = data.memoryLength;
    if (data.valueTypeModes) {
      data.valueTypeModes.forEach((mode, valueType) => {
        if (isValidMode(valueType, mode)) {
          this.#valueTypeModeConfig.set(valueType, mode);
        }
      });
    }
    this.#render();
  }
  #render() {
    render2(html2`
      <style>${UI.inspectorCommonStyles}</style>
      <style>${valueInterpreterDisplay_css_default}</style>
      <div class="value-types">
        ${SORTED_VALUE_TYPES.map((type) => this.#valueTypes.has(type) ? this.#showValue(type) : "")}
      </div>
    `, this.#shadow, { host: this });
  }
  #showValue(type) {
    if (isNumber(type)) {
      return this.#renderNumberValues(type);
    }
    if (isPointer(type)) {
      return this.#renderPointerValue(type);
    }
    throw new Error(`No known way to format ${type}`);
  }
  #renderPointerValue(type) {
    const unsignedValue = this.#parse({ type, signed: false });
    const address = getPointerAddress(type, this.#buffer, this.#endianness);
    const jumpDisabled = Number.isNaN(address) || BigInt(address) >= BigInt(this.#memoryLength);
    const buttonTitle = jumpDisabled ? i18nString3(UIStrings3.addressOutOfRange) : i18nString3(UIStrings3.jumpToPointer);
    const iconColor = jumpDisabled ? "var(--icon-default)" : "var(--icon-link)";
    return html2`
      <span class="value-type-cell-no-mode value-type-cell selectable-text">${i18n5.i18n.lockedString(type)}</span>
      <div class="value-type-cell">
        <div class="value-type-value-with-link" data-value="true">
        <span class="selectable-text">${unsignedValue}</span>
          ${html2`
              <button class="jump-to-button" data-jump="true" title=${buttonTitle} ?disabled=${jumpDisabled}
                jslog=${VisualLogging2.action("linear-memory-inspector.jump-to-address").track({ click: true })}
                @click=${this.#onJumpToAddressClicked.bind(this, Number(address))}>
                <devtools-icon name="open-externally" class="medium" style="color: ${iconColor}">
                </devtools-icon>
              </button>`}
        </div>
      </div>
    `;
  }
  #onJumpToAddressClicked(address) {
    this.dispatchEvent(new JumpToPointerAddressEvent(address));
  }
  #renderNumberValues(type) {
    return html2`
      <span class="value-type-cell selectable-text">${i18n5.i18n.lockedString(type)}</span>
      <div>
        <select title=${i18nString3(UIStrings3.changeValueTypeMode)}
          data-mode-settings="true"
          jslog=${VisualLogging2.dropDown("linear-memory-inspector.value-type-mode").track({ change: true })}
          @change=${this.#onValueTypeModeChange.bind(this, type)}>
            ${VALUE_TYPE_MODE_LIST.filter((x) => isValidMode(type, x)).map((mode) => {
      return html2`
                <option value=${mode} .selected=${this.#valueTypeModeConfig.get(type) === mode}
                        jslog=${VisualLogging2.item(mode).track({ click: true })}>${i18n5.i18n.lockedString(mode)}
                </option>`;
    })}
        </select>
      </div>
      ${this.#renderSignedAndUnsigned(type)}
    `;
  }
  #renderSignedAndUnsigned(type) {
    const unsignedValue = this.#parse({ type, signed: false });
    const signedValue = this.#parse({ type, signed: true });
    const mode = this.#valueTypeModeConfig.get(type);
    const showSignedAndUnsigned = signedValue !== unsignedValue && mode !== "hex" && mode !== "oct";
    const unsignedRendered = html2`<span class="value-type-cell selectable-text"  title=${i18nString3(UIStrings3.unsignedValue)} data-value="true">${unsignedValue}</span>`;
    if (!showSignedAndUnsigned) {
      return unsignedRendered;
    }
    const showInMultipleLines = type === "Integer 32-bit" || type === "Integer 64-bit";
    const signedRendered = html2`<span class="selectable-text" data-value="true" title=${i18nString3(UIStrings3.signedValue)}>${signedValue}</span>`;
    if (showInMultipleLines) {
      return html2`
        <div class="value-type-cell">
          ${unsignedRendered}
          ${signedRendered}
        </div>
        `;
    }
    return html2`
      <div class="value-type-cell" style="flex-direction: row;">
        ${unsignedRendered}
        <span class="signed-divider"></span>
        ${signedRendered}
      </div>
    `;
  }
  #onValueTypeModeChange(type, event) {
    event.preventDefault();
    const select = event.target;
    const mode = select.value;
    this.dispatchEvent(new ValueTypeModeChangedEvent(type, mode));
  }
  #parse(data) {
    const mode = this.#valueTypeModeConfig.get(data.type);
    return format({ buffer: this.#buffer, type: data.type, endianness: this.#endianness, signed: data.signed || false, mode });
  }
};
customElements.define("devtools-linear-memory-inspector-interpreter-display", ValueInterpreterDisplay);

// gen/front_end/panels/linear_memory_inspector/components/ValueInterpreterSettings.js
var ValueInterpreterSettings_exports = {};
__export(ValueInterpreterSettings_exports, {
  TypeToggleEvent: () => TypeToggleEvent,
  ValueInterpreterSettings: () => ValueInterpreterSettings
});
import "./../../../ui/legacy/legacy.js";
import * as i18n7 from "./../../../core/i18n/i18n.js";
import * as Platform2 from "./../../../core/platform/platform.js";
import * as Lit2 from "./../../../ui/lit/lit.js";
import * as VisualLogging3 from "./../../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/linear_memory_inspector/components/valueInterpreterSettings.css.js
var valueInterpreterSettings_css_default = `/*
 * Copyright 2021 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

:host {
  flex: auto;
  display: flex;
  min-height: 20px;
}

.settings {
  display: flex;
  flex-wrap: wrap;
  margin: 0 12px 12px;
  gap: 15px 45px;
}

.value-types-selection {
  display: flex;
  flex-direction: column;
}

.group {
  font-weight: bold;
  margin-bottom: var(--sys-size-6);
}

/*# sourceURL=${import.meta.resolve("./valueInterpreterSettings.css")} */`;

// gen/front_end/panels/linear_memory_inspector/components/ValueInterpreterSettings.js
var { render: render3, html: html3 } = Lit2;
var UIStrings4 = {
  /**
   * @description Name of a group of selectable value types that do not fall under integer and floating point value types, e.g. Pointer32. The group appears name appears under the Value Interpreter Settings.
   */
  otherGroup: "Other"
};
var str_4 = i18n7.i18n.registerUIStrings("panels/linear_memory_inspector/components/ValueInterpreterSettings.ts", UIStrings4);
var i18nString4 = i18n7.i18n.getLocalizedString.bind(void 0, str_4);
var GROUP_TO_TYPES = /* @__PURE__ */ new Map([
  ["Integer", [
    "Integer 8-bit",
    "Integer 16-bit",
    "Integer 32-bit",
    "Integer 64-bit"
    /* ValueType.INT64 */
  ]],
  ["Floating point", [
    "Float 32-bit",
    "Float 64-bit"
    /* ValueType.FLOAT64 */
  ]],
  ["Other", [
    "Pointer 32-bit",
    "Pointer 64-bit"
    /* ValueType.POINTER64 */
  ]]
]);
function valueTypeGroupToLocalizedString(group) {
  if (group === "Other") {
    return i18nString4(UIStrings4.otherGroup);
  }
  return group;
}
var TypeToggleEvent = class _TypeToggleEvent extends Event {
  static eventName = "typetoggle";
  data;
  constructor(type, checked) {
    super(_TypeToggleEvent.eventName);
    this.data = { type, checked };
  }
};
var ValueInterpreterSettings = class extends HTMLElement {
  #shadow = this.attachShadow({ mode: "open" });
  #valueTypes = /* @__PURE__ */ new Set();
  set data(data) {
    this.#valueTypes = data.valueTypes;
    this.#render();
  }
  #render() {
    render3(html3`
      <style>${valueInterpreterSettings_css_default}</style>
      <div class="settings" jslog=${VisualLogging3.pane("settings")}>
       ${[...GROUP_TO_TYPES.keys()].map((group) => {
      return html3`
          <div class="value-types-selection">
            <span class="group">${valueTypeGroupToLocalizedString(group)}</span>
            ${this.#plotTypeSelections(group)}
          </div>
        `;
    })}
      </div>
      `, this.#shadow, { host: this });
  }
  #plotTypeSelections(group) {
    const types = GROUP_TO_TYPES.get(group);
    if (!types) {
      throw new Error(`Unknown group ${group}`);
    }
    return html3`
      ${types.map((type) => {
      return html3`
            <devtools-checkbox
              title=${valueTypeToLocalizedString(type)}
              ?checked=${this.#valueTypes.has(type)}
              @change=${(e) => this.#onTypeToggle(type, e)} jslog=${VisualLogging3.toggle().track({ change: true }).context(Platform2.StringUtilities.toKebabCase(type))}
              >${valueTypeToLocalizedString(type)}</devtools-checkbox>
     `;
    })}`;
  }
  #onTypeToggle(type, event) {
    const checkbox = event.target;
    this.dispatchEvent(new TypeToggleEvent(type, checkbox.checked));
  }
};
customElements.define("devtools-linear-memory-inspector-interpreter-settings", ValueInterpreterSettings);

// gen/front_end/panels/linear_memory_inspector/components/LinearMemoryValueInterpreter.js
import * as i18n9 from "./../../../core/i18n/i18n.js";
import * as Platform3 from "./../../../core/platform/platform.js";
import * as Buttons from "./../../../ui/components/buttons/buttons.js";
import * as UI2 from "./../../../ui/legacy/legacy.js";
import * as Lit3 from "./../../../ui/lit/lit.js";
import * as VisualLogging4 from "./../../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/linear_memory_inspector/components/linearMemoryValueInterpreter.css.js
var linearMemoryValueInterpreter_css_default = `/*
 * Copyright 2021 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

:host {
  flex: auto;
  display: flex;
}

.value-interpreter {
  border: 1px solid var(--sys-color-divider);
  background-color: var(--sys-color-cdt-base-container);
  overflow: hidden;
  width: 400px;
}

.settings-toolbar {
  min-height: 26px;
  display: flex;
  flex-wrap: nowrap;
  justify-content: space-between;
  padding-left: var(--sys-size-3);
  padding-right: var(--sys-size-3);
  align-items: center;
}

.settings-toolbar-button {
  padding: 0;
  width: 20px;
  height: 20px;
  border: none;
  outline: none;
  background-color: transparent;
}

.settings-toolbar-button.active devtools-icon {
  color: var(--icon-toggled);
}

.divider {
  display: block;
  height: 1px;
  margin-bottom: 12px;
  background-color: var(--sys-color-divider);
}

/*# sourceURL=${import.meta.resolve("./linearMemoryValueInterpreter.css")} */`;

// gen/front_end/panels/linear_memory_inspector/components/LinearMemoryValueInterpreter.js
var UIStrings5 = {
  /**
   * @description Tooltip text that appears when hovering over the gear button to open and close settings in the Linear memory inspector. These settings
   *             allow the user to change the value type to view, such as 32-bit Integer, or 32-bit Float.
   */
  toggleValueTypeSettings: "Toggle value type settings",
  /**
   * @description Tooltip text that appears when hovering over the 'Little Endian' or 'Big Endian' setting in the Linear memory inspector.
   */
  changeEndianness: "Change `Endianness`"
};
var str_5 = i18n9.i18n.registerUIStrings("panels/linear_memory_inspector/components/LinearMemoryValueInterpreter.ts", UIStrings5);
var i18nString5 = i18n9.i18n.getLocalizedString.bind(void 0, str_5);
var { render: render4, html: html4 } = Lit3;
var EndiannessChangedEvent = class _EndiannessChangedEvent extends Event {
  static eventName = "endiannesschanged";
  data;
  constructor(endianness) {
    super(_EndiannessChangedEvent.eventName);
    this.data = endianness;
  }
};
var ValueTypeToggledEvent = class _ValueTypeToggledEvent extends Event {
  static eventName = "valuetypetoggled";
  data;
  constructor(type, checked) {
    super(_ValueTypeToggledEvent.eventName);
    this.data = { type, checked };
  }
};
var LinearMemoryValueInterpreter = class extends HTMLElement {
  #shadow = this.attachShadow({ mode: "open" });
  #endianness = "Little Endian";
  #buffer = new ArrayBuffer(0);
  #valueTypes = /* @__PURE__ */ new Set();
  #valueTypeModeConfig = /* @__PURE__ */ new Map();
  #memoryLength = 0;
  #showSettings = false;
  set data(data) {
    this.#endianness = data.endianness;
    this.#buffer = data.value;
    this.#valueTypes = data.valueTypes;
    this.#valueTypeModeConfig = data.valueTypeModes || /* @__PURE__ */ new Map();
    this.#memoryLength = data.memoryLength;
    this.#render();
  }
  #render() {
    render4(html4`
      <style>${UI2.inspectorCommonStyles}</style>
      <style>${linearMemoryValueInterpreter_css_default}</style>
      <div class="value-interpreter">
        <div class="settings-toolbar">
          ${this.#renderEndiannessSetting()}
          <devtools-button data-settings="true" class="toolbar-button ${this.#showSettings ? "" : "disabled"}"
              title=${i18nString5(UIStrings5.toggleValueTypeSettings)} @click=${this.#onSettingsToggle}
              jslog=${VisualLogging4.toggleSubpane("linear-memory-inspector.toggle-value-settings").track({ click: true })}
              .iconName=${"gear"}
              .toggledIconName=${"gear-filled"}
              .toggleType=${"primary-toggle"}
              .variant=${"icon_toggle"}
          ></devtools-button>
        </div>
        <span class="divider"></span>
        <div>
          ${this.#showSettings ? html4`
              <devtools-linear-memory-inspector-interpreter-settings
                .data=${{ valueTypes: this.#valueTypes }}
                @typetoggle=${this.#onTypeToggle}>
              </devtools-linear-memory-inspector-interpreter-settings>` : html4`
              <devtools-linear-memory-inspector-interpreter-display
                .data=${{
      buffer: this.#buffer,
      valueTypes: this.#valueTypes,
      endianness: this.#endianness,
      valueTypeModes: this.#valueTypeModeConfig,
      memoryLength: this.#memoryLength
    }}>
              </devtools-linear-memory-inspector-interpreter-display>`}
        </div>
      </div>
    `, this.#shadow, { host: this });
  }
  #onEndiannessChange(event) {
    event.preventDefault();
    const select = event.target;
    const endianness = select.value;
    this.dispatchEvent(new EndiannessChangedEvent(endianness));
  }
  #renderEndiannessSetting() {
    const onEnumSettingChange = this.#onEndiannessChange.bind(this);
    return html4`
    <label data-endianness-setting="true" title=${i18nString5(UIStrings5.changeEndianness)}>
      <select
        jslog=${VisualLogging4.dropDown("linear-memory-inspector.endianess").track({ change: true })}
        style="border: none;"
        data-endianness="true" @change=${onEnumSettingChange}>
        ${[
      "Little Endian",
      "Big Endian"
      /* Endianness.BIG */
    ].map((endianness) => {
      return html4`<option value=${endianness} .selected=${this.#endianness === endianness}
            jslog=${VisualLogging4.item(Platform3.StringUtilities.toKebabCase(endianness)).track({ click: true })}>${i18n9.i18n.lockedString(endianness)}</option>`;
    })}
      </select>
    </label>
    `;
  }
  #onSettingsToggle() {
    this.#showSettings = !this.#showSettings;
    this.#render();
  }
  #onTypeToggle(e) {
    this.dispatchEvent(new ValueTypeToggledEvent(e.data.type, e.data.checked));
  }
};
customElements.define("devtools-linear-memory-inspector-interpreter", LinearMemoryValueInterpreter);

// gen/front_end/panels/linear_memory_inspector/components/LinearMemoryViewer.js
var LinearMemoryViewer_exports = {};
__export(LinearMemoryViewer_exports, {
  ByteSelectedEvent: () => ByteSelectedEvent,
  LinearMemoryViewer: () => LinearMemoryViewer,
  ResizeEvent: () => ResizeEvent
});
import * as Lit4 from "./../../../ui/lit/lit.js";
import * as VisualLogging5 from "./../../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/linear_memory_inspector/components/LinearMemoryInspectorUtils.js
var LinearMemoryInspectorUtils_exports = {};
__export(LinearMemoryInspectorUtils_exports, {
  DECIMAL_REGEXP: () => DECIMAL_REGEXP,
  HEXADECIMAL_REGEXP: () => HEXADECIMAL_REGEXP,
  formatAddress: () => formatAddress,
  parseAddress: () => parseAddress,
  toHexString: () => toHexString
});
var HEXADECIMAL_REGEXP = /^0x[a-fA-F0-9]+$/;
var DECIMAL_REGEXP = /^0$|[1-9]\d*$/;
function toHexString(data) {
  const hex = data.number.toString(16).padStart(data.pad, "0");
  const upperHex = hex.toUpperCase();
  return data.prefix ? "0x" + upperHex : upperHex;
}
function formatAddress(address) {
  return toHexString({ number: address, pad: 8, prefix: true });
}
function parseAddress(address) {
  const hexMatch = address.match(HEXADECIMAL_REGEXP);
  const decMatch = address.match(DECIMAL_REGEXP);
  let newAddress = void 0;
  if (hexMatch && hexMatch[0].length === address.length) {
    newAddress = parseInt(address, 16);
  } else if (decMatch && decMatch[0].length === address.length) {
    newAddress = parseInt(address, 10);
  }
  return newAddress;
}

// gen/front_end/panels/linear_memory_inspector/components/linearMemoryViewer.css.js
var linearMemoryViewer_css_default = `/*
 * Copyright 2021 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

:host {
  flex: auto;
  display: flex;
  min-height: 20px;
}

.view {
  overflow: hidden;
  text-overflow: ellipsis;
  box-sizing: border-box;
  background: var(--sys-color-cdt-base-container);
  outline: none;
}

.row {
  display: flex;
  height: 20px;
  align-items: center;
}

.cell {
  text-align: center;
  border: 1px solid transparent;
  border-radius: 2px;

  &.focused-area {
    background-color: var(--sys-color-tonal-container);
    color: var(--sys-color-on-tonal-container);
  }

  &.selected {
    border-color: var(--sys-color-state-focus-ring);
    color: var(--sys-color-on-tonal-container);
    background-color: var(--sys-color-state-focus-select);
  }
}

.byte-cell {
  min-width: 21px;
  color: var(--sys-color-on-surface);
}

.byte-group-margin {
  margin-left: var(--byte-group-margin);
}

.text-cell {
  min-width: 14px;
  color: var(--sys-color-on-surface-subtle);
}

.address {
  color: var(--sys-color-state-disabled);
}

.address.selected {
  font-weight: bold;
  color: var(--sys-color-on-surface);
}

.divider {
  width: 1px;
  height: inherit;
  background-color: var(--sys-color-divider);
  margin: 0 4px;
}

.highlight-area {
  background-color: var(--sys-color-surface-variant);
}

/*# sourceURL=${import.meta.resolve("./linearMemoryViewer.css")} */`;

// gen/front_end/panels/linear_memory_inspector/components/LinearMemoryViewer.js
var { render: render5, html: html5 } = Lit4;
var ByteSelectedEvent = class _ByteSelectedEvent extends Event {
  static eventName = "byteselected";
  data;
  constructor(address) {
    super(_ByteSelectedEvent.eventName);
    this.data = address;
  }
};
var ResizeEvent = class _ResizeEvent extends Event {
  static eventName = "resize";
  data;
  constructor(numBytesPerPage) {
    super(_ResizeEvent.eventName);
    this.data = numBytesPerPage;
  }
};
var BYTE_GROUP_MARGIN = 8;
var BYTE_GROUP_SIZE = 4;
var LinearMemoryViewer = class extends HTMLElement {
  #shadow = this.attachShadow({ mode: "open" });
  #resizeObserver = new ResizeObserver(() => this.#resize());
  #isObservingResize = false;
  #memory = new Uint8Array();
  #address = 0;
  #memoryOffset = 0;
  #highlightInfo;
  #focusedMemoryHighlight;
  #numRows = 1;
  #numBytesInRow = BYTE_GROUP_SIZE;
  #focusOnByte = true;
  #lastKeyUpdateSent = void 0;
  set data(data) {
    if (data.address < data.memoryOffset || data.address > data.memoryOffset + data.memory.length || data.address < 0) {
      throw new Error("Address is out of bounds.");
    }
    if (data.memoryOffset < 0) {
      throw new Error("Memory offset has to be greater or equal to zero.");
    }
    this.#memory = data.memory;
    this.#address = data.address;
    this.#highlightInfo = data.highlightInfo;
    this.#focusedMemoryHighlight = data.focusedMemoryHighlight;
    this.#memoryOffset = data.memoryOffset;
    this.#focusOnByte = data.focus;
    this.#update();
  }
  connectedCallback() {
    this.style.setProperty("--byte-group-margin", `${BYTE_GROUP_MARGIN}px`);
  }
  disconnectedCallback() {
    this.#isObservingResize = false;
    this.#resizeObserver.disconnect();
  }
  #update() {
    this.#updateDimensions();
    this.#render();
    this.#focusOnView();
    this.#engageResizeObserver();
  }
  #focusOnView() {
    if (this.#focusOnByte) {
      const view = this.#shadow.querySelector(".view");
      if (view) {
        view.focus();
      }
    }
  }
  #resize() {
    this.#update();
    this.dispatchEvent(new ResizeEvent(this.#numBytesInRow * this.#numRows));
  }
  /** Recomputes the number of rows and (byte) columns that fit into the current view. */
  #updateDimensions() {
    if (this.clientWidth === 0 || this.clientHeight === 0 || !this.shadowRoot) {
      this.#numBytesInRow = BYTE_GROUP_SIZE;
      this.#numRows = 1;
      return;
    }
    const firstByteCell = this.shadowRoot.querySelector(".byte-cell");
    const textCell = this.shadowRoot.querySelector(".text-cell");
    const divider = this.shadowRoot.querySelector(".divider");
    const rowElement = this.shadowRoot.querySelector(".row");
    const addressText = this.shadowRoot.querySelector(".address");
    if (!firstByteCell || !textCell || !divider || !rowElement || !addressText) {
      this.#numBytesInRow = BYTE_GROUP_SIZE;
      this.#numRows = 1;
      return;
    }
    const byteCellWidth = firstByteCell.getBoundingClientRect().width;
    const textCellWidth = textCell.getBoundingClientRect().width;
    const groupWidth = BYTE_GROUP_SIZE * (byteCellWidth + textCellWidth) + BYTE_GROUP_MARGIN;
    const dividerWidth = divider.getBoundingClientRect().width;
    const addressTextAndDividerWidth = firstByteCell.getBoundingClientRect().left - addressText.getBoundingClientRect().left;
    const widthToFill = this.clientWidth - 1 - addressTextAndDividerWidth - dividerWidth;
    if (widthToFill < groupWidth) {
      this.#numBytesInRow = BYTE_GROUP_SIZE;
      this.#numRows = 1;
      return;
    }
    this.#numBytesInRow = Math.floor(widthToFill / groupWidth) * BYTE_GROUP_SIZE;
    this.#numRows = Math.floor(this.clientHeight / rowElement.clientHeight);
  }
  #engageResizeObserver() {
    if (!this.#resizeObserver || this.#isObservingResize) {
      return;
    }
    this.#resizeObserver.observe(this);
    this.#isObservingResize = true;
  }
  #render() {
    const jslog = VisualLogging5.section().track({ keydown: "ArrowUp|ArrowDown|ArrowLeft|ArrowRight|PageUp|PageDown" }).context("linear-memory-inspector.viewer");
    render5(html5`
      <style>${linearMemoryViewer_css_default}</style>
      <div class="view" tabindex="0" @keydown=${this.#onKeyDown} jslog=${jslog}>
        ${this.#renderView()}
      </div>
      `, this.#shadow, { host: this });
  }
  #onKeyDown(event) {
    const keyboardEvent = event;
    let newAddress = void 0;
    if (keyboardEvent.code === "ArrowUp") {
      newAddress = this.#address - this.#numBytesInRow;
    } else if (keyboardEvent.code === "ArrowDown") {
      newAddress = this.#address + this.#numBytesInRow;
    } else if (keyboardEvent.code === "ArrowLeft") {
      newAddress = this.#address - 1;
    } else if (keyboardEvent.code === "ArrowRight") {
      newAddress = this.#address + 1;
    } else if (keyboardEvent.code === "PageUp") {
      newAddress = this.#address - this.#numBytesInRow * this.#numRows;
    } else if (keyboardEvent.code === "PageDown") {
      newAddress = this.#address + this.#numBytesInRow * this.#numRows;
    }
    if (newAddress !== void 0 && newAddress !== this.#lastKeyUpdateSent) {
      this.#lastKeyUpdateSent = newAddress;
      this.dispatchEvent(new ByteSelectedEvent(newAddress));
    }
  }
  #renderView() {
    const itemTemplates = [];
    for (let i = 0; i < this.#numRows; ++i) {
      itemTemplates.push(this.#renderRow(i));
    }
    return html5`${itemTemplates}`;
  }
  #renderRow(row) {
    const { startIndex, endIndex } = { startIndex: row * this.#numBytesInRow, endIndex: (row + 1) * this.#numBytesInRow };
    const classMap2 = {
      address: true,
      selected: Math.floor((this.#address - this.#memoryOffset) / this.#numBytesInRow) === row
    };
    return html5`
    <div class="row">
      <span class=${Lit4.Directives.classMap(classMap2)}>${toHexString({ number: startIndex + this.#memoryOffset, pad: 8, prefix: false })}</span>
      <span class="divider"></span>
      ${this.#renderByteValues(startIndex, endIndex)}
      <span class="divider"></span>
      ${this.#renderCharacterValues(startIndex, endIndex)}
    </div>
    `;
  }
  #renderByteValues(startIndex, endIndex) {
    const cells = [];
    for (let i = startIndex; i < endIndex; ++i) {
      const actualIndex = i + this.#memoryOffset;
      const addMargin = i !== startIndex && (i - startIndex) % BYTE_GROUP_SIZE === 0;
      const selected = i === this.#address - this.#memoryOffset;
      const shouldBeHighlighted = this.#shouldBeHighlighted(actualIndex);
      const focusedMemoryArea = this.#isFocusedArea(actualIndex);
      const classMap2 = {
        cell: true,
        "byte-cell": true,
        "byte-group-margin": addMargin,
        selected,
        "highlight-area": shouldBeHighlighted,
        "focused-area": focusedMemoryArea
      };
      const isSelectableCell = i < this.#memory.length;
      const byteValue = isSelectableCell ? html5`${toHexString({ number: this.#memory[i], pad: 2, prefix: false })}` : "";
      const onSelectedByte = isSelectableCell ? this.#onSelectedByte.bind(this, actualIndex) : "";
      const jslog = VisualLogging5.tableCell("linear-memory-inspector.byte-cell").track({ click: true });
      cells.push(html5`<span class=${Lit4.Directives.classMap(classMap2)} @click=${onSelectedByte} jslog=${jslog}>${byteValue}</span>`);
    }
    return html5`${cells}`;
  }
  #renderCharacterValues(startIndex, endIndex) {
    const cells = [];
    for (let i = startIndex; i < endIndex; ++i) {
      const actualIndex = i + this.#memoryOffset;
      const shouldBeHighlighted = this.#shouldBeHighlighted(actualIndex);
      const focusedMemoryArea = this.#isFocusedArea(actualIndex);
      const classMap2 = {
        cell: true,
        "text-cell": true,
        selected: this.#address - this.#memoryOffset === i,
        "highlight-area": shouldBeHighlighted,
        "focused-area": focusedMemoryArea
      };
      const isSelectableCell = i < this.#memory.length;
      const value = isSelectableCell ? html5`${this.#toAscii(this.#memory[i])}` : "";
      const onSelectedByte = isSelectableCell ? this.#onSelectedByte.bind(this, i + this.#memoryOffset) : "";
      const jslog = VisualLogging5.tableCell("linear-memory-inspector.text-cell").track({ click: true });
      cells.push(html5`<span class=${Lit4.Directives.classMap(classMap2)} @click=${onSelectedByte} jslog=${jslog}>${value}</span>`);
    }
    return html5`${cells}`;
  }
  #toAscii(byte) {
    if (byte >= 20 && byte <= 127) {
      return String.fromCharCode(byte);
    }
    return ".";
  }
  #onSelectedByte(index) {
    this.dispatchEvent(new ByteSelectedEvent(index));
  }
  #shouldBeHighlighted(index) {
    if (this.#highlightInfo === void 0) {
      return false;
    }
    return this.#highlightInfo.startAddress <= index && index < this.#highlightInfo.startAddress + this.#highlightInfo.size;
  }
  #isFocusedArea(index) {
    if (!this.#focusedMemoryHighlight) {
      return false;
    }
    return this.#focusedMemoryHighlight.startAddress <= index && index < this.#focusedMemoryHighlight.startAddress + this.#focusedMemoryHighlight.size;
  }
};
customElements.define("devtools-linear-memory-inspector-viewer", LinearMemoryViewer);

// gen/front_end/panels/linear_memory_inspector/components/LinearMemoryInspector.js
import * as Common from "./../../../core/common/common.js";
import * as i18n11 from "./../../../core/i18n/i18n.js";
import * as UI3 from "./../../../ui/legacy/legacy.js";
import { html as html6, nothing, render as render6 } from "./../../../ui/lit/lit.js";

// gen/front_end/panels/linear_memory_inspector/components/linearMemoryInspector.css.js
var linearMemoryInspector_css_default = `/*
 * Copyright 2021 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

@scope to (devtools-widget > *) {
  :scope {
    flex: auto;
    display: flex;
  }

  * {
      min-width: unset;
      box-sizing: content-box;
  }

  .view {
    width: 100%;
    display: flex;
    flex: 1;
    flex-direction: column;
    font-family: var(--monospace-font-family);
    font-size: var(--monospace-font-size);
    padding: 9px 12px 9px 7px;
  }

  devtools-linear-memory-inspector-viewer {
    justify-content: center;
  }

  devtools-linear-memory-inspector-navigator + devtools-linear-memory-inspector-viewer {
    margin-top: 12px;
  }

  .value-interpreter {
    display: flex;
}
}

/*# sourceURL=${import.meta.resolve("./linearMemoryInspector.css")} */`;

// gen/front_end/panels/linear_memory_inspector/components/LinearMemoryInspector.js
var UIStrings6 = {
  /**
   * @description Tooltip text that appears when hovering over an invalid address in the address line in the Linear memory inspector
   * @example {0x00000000} PH1
   * @example {0x00400000} PH2
   */
  addressHasToBeANumberBetweenSAnd: "Address has to be a number between {PH1} and {PH2}"
};
var str_6 = i18n11.i18n.registerUIStrings("panels/linear_memory_inspector/components/LinearMemoryInspector.ts", UIStrings6);
var i18nString6 = i18n11.i18n.getLocalizedString.bind(void 0, str_6);
var AddressHistoryEntry = class {
  #address = 0;
  #callback;
  constructor(address, callback) {
    if (address < 0) {
      throw new Error("Address should be a greater or equal to zero");
    }
    this.#address = address;
    this.#callback = callback;
  }
  valid() {
    return true;
  }
  reveal() {
    this.#callback(this.#address);
  }
};
var DEFAULT_VIEW = (input, _output, target) => {
  const navigatorAddressToShow = input.currentNavigatorMode === "Submitted" ? formatAddress(input.address) : input.currentNavigatorAddressLine;
  const navigatorAddressIsValid = isValidAddress(navigatorAddressToShow, input.outerMemoryLength);
  const invalidAddressMsg = i18nString6(UIStrings6.addressHasToBeANumberBetweenSAnd, { PH1: formatAddress(0), PH2: formatAddress(input.outerMemoryLength) });
  const errorMsg = navigatorAddressIsValid ? void 0 : invalidAddressMsg;
  const highlightedMemoryAreas = input.highlightInfo ? [input.highlightInfo] : [];
  const focusedMemoryHighlight = getSmallestEnclosingMemoryHighlight(highlightedMemoryAreas, input.address);
  render6(html6`
    <style>${linearMemoryInspector_css_default}</style>
    <div class="view">
      <devtools-linear-memory-inspector-navigator
        .data=${{
    address: navigatorAddressToShow,
    valid: navigatorAddressIsValid,
    mode: input.currentNavigatorMode,
    error: errorMsg,
    canGoBackInHistory: input.canGoBackInHistory,
    canGoForwardInHistory: input.canGoForwardInHistory
  }}
        @refreshrequested=${input.onRefreshRequest}
        @addressinputchanged=${input.onAddressChange}
        @pagenavigation=${input.onNavigatePage}
        @historynavigation=${input.onNavigateHistory}></devtools-linear-memory-inspector-navigator>
        <devtools-linear-memory-highlight-chip-list
        .data=${{
    highlightInfos: highlightedMemoryAreas,
    focusedMemoryHighlight,
    jumpToAddress: (address) => input.onJumpToAddress({ data: address }),
    deleteHighlight: input.onDeleteMemoryHighlight
  }}
        >
        </devtools-linear-memory-highlight-chip-list>
      <devtools-linear-memory-inspector-viewer
        .data=${{
    memory: input.memorySlice,
    address: input.address,
    memoryOffset: input.viewerStart,
    focus: input.currentNavigatorMode === "Submitted",
    highlightInfo: input.highlightInfo,
    focusedMemoryHighlight
  }}
        @byteselected=${input.onByteSelected}
        @resize=${input.onResize}>
      </devtools-linear-memory-inspector-viewer>
    </div>
    ${input.hideValueInspector ? nothing : html6`
    <div class="value-interpreter">
      <devtools-linear-memory-inspector-interpreter
        .data=${{
    value: input.memory.slice(input.address - input.memoryOffset, input.address + VALUE_INTEPRETER_MAX_NUM_BYTES).buffer,
    valueTypes: input.valueTypes,
    valueTypeModes: input.valueTypeModes,
    endianness: input.endianness,
    memoryLength: input.outerMemoryLength
  }}
        @valuetypetoggled=${input.onValueTypeToggled}
        @valuetypemodechanged=${input.onValueTypeModeChanged}
        @endiannesschanged=${input.onEndiannessChanged}
        @jumptopointeraddress=${input.onJumpToAddress}
        >
      </devtools-linear-memory-inspector-interpreter>
    </div>`}
    `, target);
};
function getPageRangeForAddress(address, numBytesPerPage, outerMemoryLength) {
  const pageNumber = Math.floor(address / numBytesPerPage);
  const pageStartAddress = pageNumber * numBytesPerPage;
  const pageEndAddress = Math.min(pageStartAddress + numBytesPerPage, outerMemoryLength);
  return { start: pageStartAddress, end: pageEndAddress };
}
function isValidAddress(address, outerMemoryLength) {
  const newAddress = parseAddress(address);
  return newAddress !== void 0 && newAddress >= 0 && newAddress < outerMemoryLength;
}
function getSmallestEnclosingMemoryHighlight(highlightedMemoryAreas, address) {
  let smallestEnclosingHighlight;
  for (const highlightedMemory of highlightedMemoryAreas) {
    if (highlightedMemory.startAddress <= address && address < highlightedMemory.startAddress + highlightedMemory.size) {
      if (!smallestEnclosingHighlight) {
        smallestEnclosingHighlight = highlightedMemory;
      } else if (highlightedMemory.size < smallestEnclosingHighlight.size) {
        smallestEnclosingHighlight = highlightedMemory;
      }
    }
  }
  return smallestEnclosingHighlight;
}
var LinearMemoryInspector = class extends Common.ObjectWrapper.eventMixin(UI3.Widget.Widget) {
  #history = new Common.SimpleHistoryManager.SimpleHistoryManager(10);
  #memory = new Uint8Array();
  #memoryOffset = 0;
  #outerMemoryLength = 0;
  #address = -1;
  #highlightInfo;
  #currentNavigatorMode = "Submitted";
  #currentNavigatorAddressLine = `${this.#address}`;
  #numBytesPerPage = 4;
  #valueTypeModes = getDefaultValueTypeMapping();
  #valueTypes = new Set(this.#valueTypeModes.keys());
  #endianness = "Little Endian";
  #hideValueInspector = false;
  #view;
  constructor(element, view) {
    super(element);
    this.#view = view ?? DEFAULT_VIEW;
  }
  set memory(value) {
    this.#memory = value;
    void this.requestUpdate();
  }
  set memoryOffset(value) {
    this.#memoryOffset = value;
    void this.requestUpdate();
  }
  set outerMemoryLength(value) {
    this.#outerMemoryLength = value;
    void this.requestUpdate();
  }
  set highlightInfo(value) {
    this.#highlightInfo = value;
    void this.requestUpdate();
  }
  set valueTypeModes(value) {
    this.#valueTypeModes = value;
    void this.requestUpdate();
  }
  set valueTypes(value) {
    this.#valueTypes = value;
    void this.requestUpdate();
  }
  set endianness(value) {
    this.#endianness = value;
    void this.requestUpdate();
  }
  set hideValueInspector(value) {
    this.#hideValueInspector = value;
    void this.requestUpdate();
  }
  get hideValueInspector() {
    return this.#hideValueInspector;
  }
  performUpdate() {
    const { start, end } = getPageRangeForAddress(this.#address, this.#numBytesPerPage, this.#outerMemoryLength);
    if (start < this.#memoryOffset || end > this.#memoryOffset + this.#memory.length) {
      this.dispatchEventToListeners("MemoryRequest", { start, end, address: this.#address });
      return;
    }
    if (this.#address < this.#memoryOffset || this.#address > this.#memoryOffset + this.#memory.length || this.#address < 0) {
      throw new Error("Address is out of bounds.");
    }
    if (this.#highlightInfo) {
      if (this.#highlightInfo.size < 0) {
        this.#highlightInfo = void 0;
        throw new Error("Object size has to be greater than or equal to zero");
      }
      if (this.#highlightInfo.startAddress < 0 || this.#highlightInfo.startAddress >= this.#outerMemoryLength) {
        this.#highlightInfo = void 0;
        throw new Error("Object start address is out of bounds.");
      }
    }
    const viewInput = {
      memory: this.#memory,
      address: this.#address,
      memoryOffset: this.#memoryOffset,
      outerMemoryLength: this.#outerMemoryLength,
      valueTypes: this.#valueTypes,
      valueTypeModes: this.#valueTypeModes,
      endianness: this.#endianness,
      highlightInfo: this.#highlightInfo,
      hideValueInspector: this.#hideValueInspector,
      currentNavigatorMode: this.#currentNavigatorMode,
      currentNavigatorAddressLine: this.#currentNavigatorAddressLine,
      canGoBackInHistory: this.#history.canRollback(),
      canGoForwardInHistory: this.#history.canRollover(),
      onRefreshRequest: this.#onRefreshRequest.bind(this),
      onAddressChange: this.#onAddressChange.bind(this),
      onNavigatePage: this.#navigatePage.bind(this),
      onNavigateHistory: this.#navigateHistory.bind(this),
      onJumpToAddress: this.#onJumpToAddress.bind(this),
      onDeleteMemoryHighlight: this.#onDeleteMemoryHighlight.bind(this),
      onByteSelected: this.#onByteSelected.bind(this),
      onResize: this.#resize.bind(this),
      onValueTypeToggled: this.#onValueTypeToggled.bind(this),
      onValueTypeModeChanged: this.#onValueTypeModeChanged.bind(this),
      onEndiannessChanged: this.#onEndiannessChanged.bind(this),
      memorySlice: this.#memory.slice(start - this.#memoryOffset, end - this.#memoryOffset),
      viewerStart: start
    };
    this.#view(viewInput, {}, this.contentElement);
  }
  #onJumpToAddress(e) {
    if (e instanceof Event) {
      e.stopPropagation();
    }
    this.#currentNavigatorMode = "Submitted";
    const addressInRange = Math.max(0, Math.min(e.data, this.#outerMemoryLength - 1));
    this.#jumpToAddress(addressInRange);
  }
  #onDeleteMemoryHighlight(highlight) {
    this.dispatchEventToListeners("DeleteMemoryHighlight", highlight);
  }
  #onRefreshRequest() {
    const { start, end } = getPageRangeForAddress(this.#address, this.#numBytesPerPage, this.#outerMemoryLength);
    this.dispatchEventToListeners("MemoryRequest", { start, end, address: this.#address });
  }
  #onByteSelected(e) {
    this.#currentNavigatorMode = "Submitted";
    const addressInRange = Math.max(0, Math.min(e.data, this.#outerMemoryLength - 1));
    this.#jumpToAddress(addressInRange);
  }
  #createSettings() {
    return { valueTypes: this.#valueTypes, modes: this.#valueTypeModes, endianness: this.#endianness };
  }
  #onEndiannessChanged(e) {
    this.#endianness = e.data;
    this.dispatchEventToListeners("SettingsChanged", this.#createSettings());
    void this.requestUpdate();
  }
  #onAddressChange(e) {
    const { address, mode } = e.data;
    const isValid = isValidAddress(address, this.#outerMemoryLength);
    const newAddress = parseAddress(address);
    this.#currentNavigatorAddressLine = address;
    if (newAddress !== void 0 && isValid) {
      this.#currentNavigatorMode = mode;
      this.#jumpToAddress(newAddress);
      return;
    }
    if (mode === "Submitted" && !isValid) {
      this.#currentNavigatorMode = "InvalidSubmit";
    } else {
      this.#currentNavigatorMode = "Edit";
    }
    void this.requestUpdate();
  }
  #onValueTypeToggled(e) {
    const { type, checked } = e.data;
    if (checked) {
      this.#valueTypes.add(type);
    } else {
      this.#valueTypes.delete(type);
    }
    this.dispatchEventToListeners("SettingsChanged", this.#createSettings());
    void this.requestUpdate();
  }
  #onValueTypeModeChanged(e) {
    e.stopImmediatePropagation();
    const { type, mode } = e.data;
    this.#valueTypeModes.set(type, mode);
    this.dispatchEventToListeners("SettingsChanged", this.#createSettings());
    void this.requestUpdate();
  }
  #navigateHistory(e) {
    return e.data === "Forward" ? this.#history.rollover() : this.#history.rollback();
  }
  #navigatePage(e) {
    const newAddress = e.data === "Forward" ? this.#address + this.#numBytesPerPage : this.#address - this.#numBytesPerPage;
    const addressInRange = Math.max(0, Math.min(newAddress, this.#outerMemoryLength - 1));
    this.#jumpToAddress(addressInRange);
  }
  #jumpToAddress(address) {
    if (address < 0 || address >= this.#outerMemoryLength) {
      console.warn(`Specified address is out of bounds: ${address}`);
      return;
    }
    this.address = address;
    void this.requestUpdate();
  }
  #resize(event) {
    this.#numBytesPerPage = event.data;
    void this.requestUpdate();
  }
  set address(address) {
    if (this.#address === address) {
      return;
    }
    const historyEntry = new AddressHistoryEntry(address, () => this.#jumpToAddress(address));
    this.#history.push(historyEntry);
    this.#address = address;
    this.dispatchEventToListeners("AddressChanged", this.#address);
    void this.requestUpdate();
  }
};

// gen/front_end/panels/linear_memory_inspector/components/LinearMemoryNavigator.js
var LinearMemoryNavigator_exports = {};
__export(LinearMemoryNavigator_exports, {
  AddressInputChangedEvent: () => AddressInputChangedEvent,
  HistoryNavigationEvent: () => HistoryNavigationEvent,
  LinearMemoryNavigator: () => LinearMemoryNavigator,
  PageNavigationEvent: () => PageNavigationEvent,
  RefreshRequestedEvent: () => RefreshRequestedEvent
});
import "./../../../ui/kit/kit.js";
import * as i18n13 from "./../../../core/i18n/i18n.js";
import * as Buttons2 from "./../../../ui/components/buttons/buttons.js";
import * as Lit5 from "./../../../ui/lit/lit.js";
import * as VisualLogging6 from "./../../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/linear_memory_inspector/components/linearMemoryNavigator.css.js
var linearMemoryNavigator_css_default = `/*
 * Copyright 2021 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.navigator {
  min-height: 24px;
  display: flex;
  flex-wrap: nowrap;
  justify-content: space-between;
  overflow: hidden;
  align-items: center;
  background-color: var(--sys-color-cdt-base-container);
  color: var(--sys-color-on-surface);
}

.navigator-item {
  display: flex;
  white-space: nowrap;
  overflow: hidden;
}

.address-input {
  height: var(--sys-size-11);
  padding: 0 var(--sys-size-5);
  margin: 0 var(--sys-size-3);
  text-align: center;
  align-items: center;
  outline: none;
  color: var(--sys-color-on-surface);
  border: var(--sys-size-1) solid var(--sys-color-neutral-outline);
  border-radius: var(--sys-shape-corner-extra-small);
  background: transparent;
}

.address-input.invalid {
  color: var(--sys-color-error);
}

.navigator-button {
  display: flex;
  background: transparent;
  overflow: hidden;
  border: none;
  padding: 0;
  outline: none;
  justify-content: center;
  align-items: center;
}

.navigator-button:disabled devtools-icon {
  opacity: 50%;
}

.navigator-button:enabled:hover devtools-icon {
  color: var(--icon-default-hover);
}

.navigator-button:enabled:focus devtools-icon {
  color: var(--icon-default-hover);
}

/*# sourceURL=${import.meta.resolve("./linearMemoryNavigator.css")} */`;

// gen/front_end/panels/linear_memory_inspector/components/LinearMemoryNavigator.js
var UIStrings7 = {
  /**
   * @description Tooltip text that appears when hovering over a valid memory address (e.g. 0x0) in the address line in the Linear memory inspector.
   */
  enterAddress: "Enter address",
  /**
   * @description Tooltip text that appears when hovering over the button to go back in history in the Linear Memory Navigator
   */
  goBackInAddressHistory: "Go back in address history",
  /**
   * @description Tooltip text that appears when hovering over the button to go forward in history in the Linear Memory Navigator
   */
  goForwardInAddressHistory: "Go forward in address history",
  /**
   * @description Tooltip text that appears when hovering over the page back icon in the Linear Memory Navigator
   */
  previousPage: "Previous page",
  /**
   * @description Tooltip text that appears when hovering over the next page icon in the Linear Memory Navigator
   */
  nextPage: "Next page",
  /**
   * @description Text to refresh the page
   */
  refresh: "Refresh"
};
var str_7 = i18n13.i18n.registerUIStrings("panels/linear_memory_inspector/components/LinearMemoryNavigator.ts", UIStrings7);
var i18nString7 = i18n13.i18n.getLocalizedString.bind(void 0, str_7);
var { render: render7, html: html7, Directives: { ifDefined } } = Lit5;
var AddressInputChangedEvent = class _AddressInputChangedEvent extends Event {
  static eventName = "addressinputchanged";
  data;
  constructor(address, mode) {
    super(_AddressInputChangedEvent.eventName);
    this.data = { address, mode };
  }
};
var PageNavigationEvent = class _PageNavigationEvent extends Event {
  static eventName = "pagenavigation";
  data;
  constructor(navigation) {
    super(_PageNavigationEvent.eventName, {});
    this.data = navigation;
  }
};
var HistoryNavigationEvent = class _HistoryNavigationEvent extends Event {
  static eventName = "historynavigation";
  data;
  constructor(navigation) {
    super(_HistoryNavigationEvent.eventName, {});
    this.data = navigation;
  }
};
var RefreshRequestedEvent = class _RefreshRequestedEvent extends Event {
  static eventName = "refreshrequested";
  constructor() {
    super(_RefreshRequestedEvent.eventName, {});
  }
};
var LinearMemoryNavigator = class extends HTMLElement {
  #shadow = this.attachShadow({ mode: "open" });
  #address = "0";
  #error = void 0;
  #valid = true;
  #canGoBackInHistory = false;
  #canGoForwardInHistory = false;
  set data(data) {
    this.#address = data.address;
    this.#error = data.error;
    this.#valid = data.valid;
    this.#canGoBackInHistory = data.canGoBackInHistory;
    this.#canGoForwardInHistory = data.canGoForwardInHistory;
    this.#render();
    const addressInput = this.#shadow.querySelector(".address-input");
    if (addressInput) {
      if (data.mode === "Submitted") {
        addressInput.blur();
      } else if (data.mode === "InvalidSubmit") {
        addressInput.select();
      }
    }
  }
  #render() {
    const result = html7`
      <style>${linearMemoryNavigator_css_default}</style>
      <div class="navigator">
        <div class="navigator-item">
          ${this.#createButton({
      icon: "undo",
      title: i18nString7(UIStrings7.goBackInAddressHistory),
      event: new HistoryNavigationEvent(
        "Backward"
        /* Navigation.BACKWARD */
      ),
      enabled: this.#canGoBackInHistory,
      jslogContext: "linear-memory-inspector.history-back"
    })}
          ${this.#createButton({
      icon: "redo",
      title: i18nString7(UIStrings7.goForwardInAddressHistory),
      event: new HistoryNavigationEvent(
        "Forward"
        /* Navigation.FORWARD */
      ),
      enabled: this.#canGoForwardInHistory,
      jslogContext: "linear-memory-inspector.history-forward"
    })}
        </div>
        <div class="navigator-item">
          ${this.#createButton({
      icon: "chevron-left",
      title: i18nString7(UIStrings7.previousPage),
      event: new PageNavigationEvent(
        "Backward"
        /* Navigation.BACKWARD */
      ),
      enabled: true,
      jslogContext: "linear-memory-inspector.previous-page"
    })}
          ${this.#createAddressInput()}
          ${this.#createButton({
      icon: "chevron-right",
      title: i18nString7(UIStrings7.nextPage),
      event: new PageNavigationEvent(
        "Forward"
        /* Navigation.FORWARD */
      ),
      enabled: true,
      jslogContext: "linear-memory-inspector.next-page"
    })}
        </div>
        ${this.#createButton({
      icon: "refresh",
      title: i18nString7(UIStrings7.refresh),
      event: new RefreshRequestedEvent(),
      enabled: true,
      jslogContext: "linear-memory-inspector.refresh"
    })}
      </div>
      `;
    render7(result, this.#shadow, { host: this });
  }
  #createAddressInput() {
    const classMap2 = {
      "address-input": true,
      invalid: !this.#valid
    };
    return html7`<input
      class=${Lit5.Directives.classMap(classMap2)}
      data-input="true"
      .value=${this.#address}
      jslog=${VisualLogging6.textField("linear-memory-inspector.address").track({
      change: true
    })}
      title=${ifDefined(this.#valid ? i18nString7(UIStrings7.enterAddress) : this.#error)}
      @change=${this.#onAddressChange.bind(
      this,
      "Submitted"
      /* Mode.SUBMITTED */
    )}
      @input=${this.#onAddressChange.bind(
      this,
      "Edit"
      /* Mode.EDIT */
    )}
    />`;
  }
  #onAddressChange(mode, event) {
    const addressInput = event.target;
    this.dispatchEvent(new AddressInputChangedEvent(addressInput.value, mode));
  }
  #createButton(data) {
    return html7`
      <devtools-button class="navigator-button"
        .data=${{ variant: "icon", iconName: data.icon, disabled: !data.enabled }}
        jslog=${VisualLogging6.action().track({ click: true, keydown: "Enter" }).context(data.jslogContext)}
        data-button=${data.event.type} title=${data.title}
        @click=${this.dispatchEvent.bind(this, data.event)}
      ></devtools-button>`;
  }
};
customElements.define("devtools-linear-memory-inspector-navigator", LinearMemoryNavigator);

// gen/front_end/panels/linear_memory_inspector/components/LinearMemoryViewerUtils.js
var LinearMemoryViewerUtils_exports = {};
export {
  LinearMemoryHighlightChipList_exports as LinearMemoryHighlightChipList,
  LinearMemoryInspector_exports as LinearMemoryInspector,
  LinearMemoryInspectorUtils_exports as LinearMemoryInspectorUtils,
  LinearMemoryNavigator_exports as LinearMemoryNavigator,
  LinearMemoryValueInterpreter_exports as LinearMemoryValueInterpreter,
  LinearMemoryViewer_exports as LinearMemoryViewer,
  LinearMemoryViewerUtils_exports as LinearMemoryViewerUtils,
  ValueInterpreterDisplay_exports as ValueInterpreterDisplay,
  ValueInterpreterDisplayUtils_exports as ValueInterpreterDisplayUtils,
  ValueInterpreterSettings_exports as ValueInterpreterSettings
};
//# sourceMappingURL=components.js.map
