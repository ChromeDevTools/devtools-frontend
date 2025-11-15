var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/ui/legacy/components/object_ui/CustomPreviewComponent.js
var CustomPreviewComponent_exports = {};
__export(CustomPreviewComponent_exports, {
  CustomPreviewComponent: () => CustomPreviewComponent,
  CustomPreviewSection: () => CustomPreviewSection
});
import * as Common2 from "./../../../../core/common/common.js";
import * as i18n5 from "./../../../../core/i18n/i18n.js";
import * as IconButton from "./../../../components/icon_button/icon_button.js";
import * as UI3 from "./../../legacy.js";

// gen/front_end/ui/legacy/components/object_ui/customPreviewComponent.css.js
var customPreviewComponent_css_default = `/*
 * Copyright 2015 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.custom-expandable-section {
  display: inline-flex;
  flex-direction: column;
}

.custom-expand-icon {
  user-select: none;
  margin-right: 4px;
  margin-bottom: -4px;
}

.custom-expandable-section-standard-section {
  display: inline-flex;
}

.custom-expandable-section-default-body {
  padding-left: 12px;
}

/*# sourceURL=${import.meta.resolve("./customPreviewComponent.css")} */`;

// gen/front_end/ui/legacy/components/object_ui/ObjectPropertiesSection.js
var ObjectPropertiesSection_exports = {};
__export(ObjectPropertiesSection_exports, {
  ArrayGroupingTreeElement: () => ArrayGroupingTreeElement,
  ExpandableTextPropertyValue: () => ExpandableTextPropertyValue,
  InitialVisibleChildrenLimit: () => InitialVisibleChildrenLimit,
  ObjectPropertiesSection: () => ObjectPropertiesSection,
  ObjectPropertiesSectionsTreeExpandController: () => ObjectPropertiesSectionsTreeExpandController,
  ObjectPropertiesSectionsTreeOutline: () => ObjectPropertiesSectionsTreeOutline,
  ObjectPropertyPrompt: () => ObjectPropertyPrompt,
  ObjectPropertyTreeElement: () => ObjectPropertyTreeElement,
  ObjectTree: () => ObjectTree,
  ObjectTreeNode: () => ObjectTreeNode,
  Renderer: () => Renderer,
  RootElement: () => RootElement,
  TREE_ELEMENT_DEFAULT_VIEW: () => TREE_ELEMENT_DEFAULT_VIEW,
  getObjectPropertiesSectionFrom: () => getObjectPropertiesSectionFrom
});
import * as Common from "./../../../../core/common/common.js";
import * as Host from "./../../../../core/host/host.js";
import * as i18n3 from "./../../../../core/i18n/i18n.js";
import * as Platform3 from "./../../../../core/platform/platform.js";
import * as SDK3 from "./../../../../core/sdk/sdk.js";
import * as TextUtils from "./../../../../models/text_utils/text_utils.js";
import * as uiI18n from "./../../../i18n/i18n.js";
import * as TextEditor from "./../../../components/text_editor/text_editor.js";
import { Directives as Directives2, html as html2, nothing as nothing2, render as render2 } from "./../../../lit/lit.js";
import * as VisualLogging from "./../../../visual_logging/visual_logging.js";
import * as UI2 from "./../../legacy.js";

// gen/front_end/ui/legacy/components/object_ui/JavaScriptREPL.js
var JavaScriptREPL_exports = {};
__export(JavaScriptREPL_exports, {
  JavaScriptREPL: () => JavaScriptREPL
});
import * as Platform2 from "./../../../../core/platform/platform.js";
import * as SDK2 from "./../../../../core/sdk/sdk.js";
import * as Formatter from "./../../../../models/formatter/formatter.js";
import * as SourceMapScopes from "./../../../../models/source_map_scopes/source_map_scopes.js";
import * as Acorn from "./../../../../third_party/acorn/acorn.js";
import { render } from "./../../../lit/lit.js";
import * as UI from "./../../legacy.js";

// gen/front_end/ui/legacy/components/object_ui/RemoteObjectPreviewFormatter.js
var RemoteObjectPreviewFormatter_exports = {};
__export(RemoteObjectPreviewFormatter_exports, {
  RemoteObjectPreviewFormatter: () => RemoteObjectPreviewFormatter,
  renderNodeTitle: () => renderNodeTitle,
  renderTrustedType: () => renderTrustedType
});
import * as i18n from "./../../../../core/i18n/i18n.js";
import * as Platform from "./../../../../core/platform/platform.js";
import * as SDK from "./../../../../core/sdk/sdk.js";
import { Directives, html, nothing } from "./../../../lit/lit.js";
var { ifDefined, repeat } = Directives;
var UIStrings = {
  /**
   * @description Text shown in the console object preview. Shown when the user is inspecting a
   * JavaScript object and there are multiple empty properties on the object (x =
   * 'times'/'multiply').
   * @example {3} PH1
   */
  emptyD: "empty \xD7 {PH1}",
  /**
   * @description Shown when the user is inspecting a JavaScript object in the console and there is
   * an empty property on the object..
   */
  empty: "empty",
  /**
   * @description Text shown when the user is inspecting a JavaScript object, but of the properties
   * is not immediately available because it is a JavaScript 'getter' function, which means we have
   * to run some code first in order to compute this property.
   */
  thePropertyIsComputedWithAGetter: "The property is computed with a getter"
};
var str_ = i18n.i18n.registerUIStrings("ui/legacy/components/object_ui/RemoteObjectPreviewFormatter.ts", UIStrings);
var i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
var RemoteObjectPreviewFormatter = class _RemoteObjectPreviewFormatter {
  static objectPropertyComparator(a, b) {
    return sortValue(a) - sortValue(b);
    function sortValue(property) {
      if (property.name === "[[PromiseState]]") {
        return 1;
      }
      if (property.name === "[[PromiseResult]]") {
        return 2;
      }
      if (property.name === "[[GeneratorState]]" || property.name === "[[PrimitiveValue]]" || property.name === "[[WeakRefTarget]]") {
        return 3;
      }
      if (property.type !== "function" && !property.name.startsWith("#")) {
        return 4;
      }
      return 5;
    }
  }
  renderObjectPreview(preview) {
    const description = preview.description;
    const subTypesWithoutValuePreview = /* @__PURE__ */ new Set([
      "arraybuffer",
      "dataview",
      "error",
      "null",
      "regexp",
      "webassemblymemory",
      "internal#entry",
      "trustedtype"
    ]);
    if (preview.type !== "object" || preview.subtype && subTypesWithoutValuePreview.has(preview.subtype)) {
      return this.renderPropertyPreview(preview.type, preview.subtype, void 0, description);
    }
    const isArrayOrTypedArray = preview.subtype === "array" || preview.subtype === "typedarray";
    let objectDescription = "";
    if (description) {
      if (isArrayOrTypedArray) {
        const arrayLength = SDK.RemoteObject.RemoteObject.arrayLength(preview);
        const arrayLengthText = arrayLength > 1 ? "(" + arrayLength + ")" : "";
        const arrayName = SDK.RemoteObject.RemoteObject.arrayNameFromDescription(description);
        objectDescription = arrayName === "Array" ? arrayLengthText : arrayName + arrayLengthText;
      } else {
        const hideDescription = description === "Object";
        objectDescription = hideDescription ? "" : description;
      }
    }
    const items = Array.from(preview.entries ? this.renderEntries(preview) : isArrayOrTypedArray ? this.renderArrayProperties(preview) : this.renderObjectProperties(preview));
    const renderName = (name) => html`<span class=name>${/^\s|\s$|^$|\n/.test(name) ? '"' + name.replace(/\n/g, "\u21B5") + '"' : name}</span>`;
    const renderPlaceholder = (placeholder) => html`<span class=object-value-undefined>${placeholder}</span>`;
    const renderValue = (value) => this.renderPropertyPreview(value.type, value.subtype, value.name, value.value);
    const renderEntry = (entry) => html`${entry.key && html`${this.renderPropertyPreview(entry.key.type, entry.key.subtype, void 0, entry.key.description)} => `}
          ${this.renderPropertyPreview(entry.value.type, entry.value.subtype, void 0, entry.value.description)}`;
    const renderItem = ({ name, entry, value, placeholder }, index) => html`${index > 0 ? ", " : ""}${placeholder !== void 0 ? renderPlaceholder(placeholder) : nothing}${name !== void 0 ? renderName(name) : nothing}${name !== void 0 && value ? ": " : ""}${value ? renderValue(value) : nothing}${entry ? renderEntry(entry) : nothing}`;
    return html`${objectDescription.length > 0 ? html`<span class=object-description>${objectDescription + "\xA0"}</span>` : nothing}<span class=object-properties-preview>${isArrayOrTypedArray ? "[" : "{"}${repeat(items, renderItem)}${preview.overflow ? html`<span>${items.length > 0 ? ",\xA0\u2026" : "\u2026"}</span>` : ""}
    ${isArrayOrTypedArray ? "]" : "}"}</span>`;
  }
  *renderObjectProperties(preview) {
    const properties = preview.properties.filter((p) => p.type !== "accessor").sort(_RemoteObjectPreviewFormatter.objectPropertyComparator);
    for (let i = 0; i < properties.length; ++i) {
      const property = properties[i];
      const name = property.name;
      if (preview.subtype === "promise" && name === "[[PromiseState]]") {
        const promiseResult = properties.at(i + 1)?.name === "[[PromiseResult]]" ? properties.at(i + 1) : void 0;
        if (promiseResult) {
          i++;
        }
        yield { name: "<" + property.value + ">", value: property.value !== "pending" ? promiseResult : void 0 };
      } else if (preview.subtype === "generator" && name === "[[GeneratorState]]") {
        yield { name: "<" + property.value + ">" };
      } else if (name === "[[PrimitiveValue]]") {
        yield { value: property };
      } else if (name === "[[WeakRefTarget]]") {
        if (property.type === "undefined") {
          yield { name: "<cleared>" };
        } else {
          yield { value: property };
        }
      } else {
        yield { name, value: property };
      }
    }
  }
  *renderArrayProperties(preview) {
    const arrayLength = SDK.RemoteObject.RemoteObject.arrayLength(preview);
    const indexProperties = preview.properties.filter((p) => toArrayIndex(p.name) !== -1).sort(arrayEntryComparator);
    const otherProperties = preview.properties.filter((p) => toArrayIndex(p.name) === -1).sort(_RemoteObjectPreviewFormatter.objectPropertyComparator);
    function arrayEntryComparator(a, b) {
      return toArrayIndex(a.name) - toArrayIndex(b.name);
    }
    function toArrayIndex(name) {
      const index = Number(name) >>> 0;
      if (String(index) === name && index < arrayLength) {
        return index;
      }
      return -1;
    }
    const canShowGaps = !preview.overflow;
    const indexedProperties = [];
    for (const property of indexProperties) {
      const index = toArrayIndex(property.name);
      const gap = index - (indexedProperties.at(-1)?.index ?? -1) - 1;
      const hasGaps = index !== indexedProperties.length;
      indexedProperties.push({ property, index, gap, hasGaps });
    }
    const trailingGap = arrayLength - (indexedProperties.at(-1)?.index ?? -1) - 1;
    const renderGap = (count) => ({ placeholder: count !== 1 ? i18nString(UIStrings.emptyD, { PH1: count }) : i18nString(UIStrings.empty) });
    for (const { property, gap, hasGaps } of indexedProperties) {
      if (canShowGaps && gap > 0) {
        yield renderGap(gap);
      }
      yield { name: !canShowGaps && hasGaps ? property.name : void 0, value: property };
    }
    if (canShowGaps && trailingGap > 0) {
      yield renderGap(trailingGap);
    }
    for (const property of otherProperties) {
      yield { name: property.name, value: property };
    }
  }
  *renderEntries(preview) {
    for (const entry of preview.entries ?? []) {
      yield { entry };
    }
  }
  renderPropertyPreview(type, subtype, className, description) {
    const title = type === "accessor" ? i18nString(UIStrings.thePropertyIsComputedWithAGetter) : type === "object" && !subtype ? description : void 0;
    const abbreviateFullQualifiedClassName = (description2) => {
      const abbreviatedDescription = description2.split(".");
      for (let i = 0; i < abbreviatedDescription.length - 1; ++i) {
        abbreviatedDescription[i] = Platform.StringUtilities.trimMiddle(abbreviatedDescription[i], 3);
      }
      return abbreviatedDescription.length === 1 && abbreviatedDescription[0] === "Object" ? "{\u2026}" : abbreviatedDescription.join(".");
    };
    const preview = () => type === "accessor" ? "(...)" : type === "function" ? "\u0192" : type === "object" && subtype === "trustedtype" && className ? renderTrustedType(description ?? "", className) : type === "object" && subtype === "node" && description ? renderNodeTitle(description) : type === "string" ? Platform.StringUtilities.formatAsJSLiteral(description ?? "") : type === "object" && !subtype ? abbreviateFullQualifiedClassName(description ?? "") : description;
    return html`<span class='object-value-${subtype || type}' title=${ifDefined(title)}>${preview()}</span>`;
  }
};
function renderNodeTitle(nodeTitle) {
  const match = nodeTitle.match(/([^#.]+)(#[^.]+)?(\..*)?/);
  if (!match) {
    return null;
  }
  return html`<span class=webkit-html-tag-name>${match[1]}</span>${match[2] && html`<span class=webkit-html-attribute-value>${match[2]}</span>`}${match[3] && html`<span class=webkit-html-attribute-name>${match[3]}</span>`}`;
}
function renderTrustedType(description, className) {
  return html`${className} <span class=object-value-string>"${description.replace(/\n/g, "\u21B5")}"</span>`;
}

// gen/front_end/ui/legacy/components/object_ui/JavaScriptREPL.js
var JavaScriptREPL = class _JavaScriptREPL {
  static wrapObjectLiteral(code) {
    const result = /^\s*\{\s*(.*)\s*\}[\s;]*$/.exec(code);
    if (result === null) {
      return code;
    }
    const [, body] = result;
    let level = 0;
    for (const c of body) {
      if (c === "{") {
        level++;
      } else if (c === "}" && --level < 0) {
        return code;
      }
    }
    const parse2 = (expression) => void Acorn.parse(expression, { ecmaVersion: 2022, allowAwaitOutsideFunction: true, ranges: false, allowReturnOutsideFunction: true });
    try {
      parse2("return {" + body + "};");
      const wrappedCode = "({" + body + "})";
      parse2(wrappedCode);
      return wrappedCode;
    } catch {
      return code;
    }
  }
  static async evaluateAndBuildPreview(text, throwOnSideEffect, replMode, timeout, allowErrors, objectGroup, awaitPromise = false, silent = false) {
    const executionContext = UI.Context.Context.instance().flavor(SDK2.RuntimeModel.ExecutionContext);
    const isTextLong = text.length > maxLengthForEvaluation;
    if (!text || !executionContext || throwOnSideEffect && isTextLong) {
      return { preview: document.createDocumentFragment(), result: null };
    }
    let expression = text;
    const callFrame = executionContext.debuggerModel.selectedCallFrame();
    if (callFrame?.script.isJavaScript()) {
      const nameMap = await SourceMapScopes.NamesResolver.allVariablesInCallFrame(callFrame);
      try {
        expression = await Formatter.FormatterWorkerPool.formatterWorkerPool().javaScriptSubstitute(expression, nameMap);
      } catch {
      }
    }
    expression = _JavaScriptREPL.wrapObjectLiteral(expression);
    const options = {
      expression,
      generatePreview: true,
      includeCommandLineAPI: true,
      throwOnSideEffect,
      timeout,
      objectGroup,
      disableBreaks: true,
      replMode,
      silent
    };
    const result = await executionContext.evaluate(options, false, awaitPromise);
    const preview = _JavaScriptREPL.buildEvaluationPreview(result, allowErrors);
    return { preview, result };
  }
  static buildEvaluationPreview(result, allowErrors) {
    const fragment = document.createDocumentFragment();
    if ("error" in result) {
      return fragment;
    }
    if (result.exceptionDetails?.exception?.description) {
      const exception = result.exceptionDetails.exception.description;
      if (exception.startsWith("TypeError: ") || allowErrors) {
        fragment.createChild("span").textContent = result.exceptionDetails.text + " " + exception;
      }
      return fragment;
    }
    const formatter = new RemoteObjectPreviewFormatter();
    const { preview, type, subtype, className, description } = result.object;
    if (preview && type === "object" && subtype !== "node" && subtype !== "trustedtype") {
      render(formatter.renderObjectPreview(preview), fragment);
    } else {
      render(formatter.renderPropertyPreview(type, subtype, className, Platform2.StringUtilities.trimEndWithMaxLength(description || "", 400)), fragment);
    }
    return fragment;
  }
};
var maxLengthForEvaluation = 2e3;

// gen/front_end/ui/legacy/components/object_ui/objectPropertiesSection.css.js
var objectPropertiesSection_css_default = `/*
 * Copyright 2015 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.object-properties-section-dimmed {
  opacity: 60%;
}

.object-properties-section {
  padding: 0;
  color: var(--sys-color-on-surface);
  display: flex;
  flex-direction: column;
  overflow-x: auto;
}

.object-properties-section li {
  user-select: text;

  &::before {
    flex-shrink: 0;
    margin-right: 2px;
    align-self: flex-start;
  }
}

.object-properties-section li.editing-sub-part {
  padding: 3px 12px 8px 6px;
  margin: -1px -6px -8px;
  text-overflow: clip;
}

.object-properties-section li.editing {
  margin-left: 10px;
  text-overflow: clip;
}

.tree-outline ol.title-less-mode {
  padding-left: 0;
}

.object-properties-section .own-property {
  font-weight: bold;
}

.object-properties-section .synthetic-property {
  color: var(--sys-color-token-subtle);
}

.object-properties-section .private-property-hash {
  color: var(--sys-color-on-surface);
}

.object-properties-section-root-element {
  display: flex;
  flex-direction: row;
}

.object-properties-section .editable-div {
  overflow: hidden;
}

.name-and-value {
  line-height: 16px;
  display: flex;
  white-space: nowrap;
}

.name-and-value .separator {
  white-space: pre;
  flex-shrink: 0;
}

.editing-sub-part .name-and-value {
  overflow: visible;
  display: inline-flex;
}

.property-prompt {
  margin-left: 4px;
}

.tree-outline.hide-selection-when-blurred .selected:focus-visible {
  background: none;
}

.tree-outline.hide-selection-when-blurred .selected:focus-visible ::slotted(*),
.tree-outline.hide-selection-when-blurred .selected:focus-visible .tree-element-title,
.tree-outline.hide-selection-when-blurred .selected:focus-visible .name-and-value,
.tree-outline.hide-selection-when-blurred .selected:focus-visible .gray-info-message {
  background: var(--sys-color-state-focus-highlight);
  border-radius: 2px;
}

@media (forced-colors: active) {
  .object-properties-section-dimmed {
    opacity: 100%;
  }

  .tree-outline.hide-selection-when-blurred .selected:focus-visible {
    background: Highlight;
  }

  .tree-outline li:hover .tree-element-title,
  .tree-outline li.selected .tree-element-title {
    color: ButtonText;
  }

  .tree-outline.hide-selection-when-blurred .selected:focus-visible .tree-element-title,
  .tree-outline.hide-selection-when-blurred .selected:focus-visible .name-and-value {
    background: transparent;
    box-shadow: none;
  }

  .tree-outline.hide-selection-when-blurred .selected:focus-visible span,
  .tree-outline.hide-selection-when-blurred .selected:focus-visible .gray-info-message {
    color: HighlightText;
  }

  .tree-outline-disclosure:hover li.parent::before {
    background-color: ButtonText;
  }
}

/*# sourceURL=${import.meta.resolve("./objectPropertiesSection.css")} */`;

// gen/front_end/ui/legacy/components/object_ui/objectValue.css.js
var objectValue_css_default = `/*
 * Copyright 2015 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.value.object-value-node:hover {
  background-color: var(--sys-color-state-hover-on-subtle);
}

.object-value-function-prefix,
.object-value-boolean {
  color: var(--sys-color-token-attribute-value);
}

.object-value-function {
  font-style: italic;
}

.object-value-function.linkified:hover {
  --override-linkified-hover-background: rgb(0 0 0 / 10%);

  background-color: var(--override-linkified-hover-background);
  cursor: pointer;
}

.theme-with-dark-background .object-value-function.linkified:hover,
:host-context(.theme-with-dark-background) .object-value-function.linkified:hover {
  --override-linkified-hover-background: rgb(230 230 230 / 10%);
}

.object-value-number {
  color: var(--sys-color-token-attribute-value);
}

.object-value-bigint {
  color: var(--sys-color-token-comment);
}

.object-value-string,
.object-value-regexp,
.object-value-symbol {
  white-space: pre;
  unicode-bidi: -webkit-isolate;
  color: var(--sys-color-token-property-special);
}

.object-value-node {
  position: relative;
  vertical-align: baseline;
  color: var(--sys-color-token-variable);
  white-space: nowrap;
}

.object-value-null,
.object-value-undefined {
  color: var(--sys-color-state-disabled);
}

.object-value-unavailable {
  color: var(--sys-color-token-tag);
}

.object-value-calculate-value-button:hover {
  text-decoration: underline;
}

.object-properties-section-custom-section {
  display: inline-flex;
  flex-direction: column;
}

.theme-with-dark-background .object-value-number,
:host-context(.theme-with-dark-background) .object-value-number,
.theme-with-dark-background .object-value-boolean,
:host-context(.theme-with-dark-background) .object-value-boolean {
  --override-primitive-dark-mode-color: hsl(252deg 100% 75%);

  color: var(--override-primitive-dark-mode-color);
}

.object-properties-section .object-description {
  color: var(--sys-color-token-subtle);
}

.value .object-properties-preview {
  white-space: nowrap;
}

.name {
  color: var(--sys-color-token-tag);
  flex-shrink: 0;
}

.object-properties-preview .name {
  color: var(--sys-color-token-subtle);
}

@media (forced-colors: active) {
  .object-value-calculate-value-button:hover {
    forced-color-adjust: none;
    color: Highlight;
  }
}

/*# sourceURL=${import.meta.resolve("./objectValue.css")} */`;

// gen/front_end/ui/legacy/components/object_ui/ObjectPropertiesSection.js
var { ref, repeat: repeat2, ifDefined: ifDefined2, classMap } = Directives2;
var UIStrings2 = {
  /**
   * @description Text in Object Properties Section
   * @example {function alert()  [native code] } PH1
   */
  exceptionS: "[Exception: {PH1}]",
  /**
   * @description Text in Object Properties Section
   */
  unknown: "unknown",
  /**
   * @description Text to expand something recursively
   */
  expandRecursively: "Expand recursively",
  /**
   * @description Text to collapse children of a parent group
   */
  collapseChildren: "Collapse children",
  /**
   * @description Text in Object Properties Section
   */
  noProperties: "No properties",
  /**
   * @description Element text content in Object Properties Section
   */
  dots: "(...)",
  /**
   * @description Element title in Object Properties Section
   */
  invokePropertyGetter: "Invoke property getter",
  /**
   * @description Show all text content in Show More Data Grid Node of a data grid
   * @example {50} PH1
   */
  showAllD: "Show all {PH1}",
  /**
   * @description Value element text content in Object Properties Section. Shown when the developer is
   * viewing a variable in the Scope view, whose value is not available (i.e. because it was optimized
   * out) by the JavaScript engine, or inspecting a JavaScript object accessor property, which has no
   * getter. This string should be translated.
   */
  valueUnavailable: "<value unavailable>",
  /**
   * @description Tooltip for value elements in the Scope view that refer to variables whose values
   * aren't accessible to the debugger (potentially due to being optimized out by the JavaScript
   * engine), or for JavaScript object accessor properties which have no getter.
   */
  valueNotAccessibleToTheDebugger: "Value is not accessible to the debugger",
  /**
   * @description A context menu item in the Watch Expressions Sidebar Pane of the Sources panel and Network pane request.
   */
  copyValue: "Copy value",
  /**
   * @description A context menu item in the Object Properties Section
   */
  copyPropertyPath: "Copy property path",
  /**
   * @description Text shown when displaying a JavaScript object that has a string property that is
   * too large for DevTools to properly display a text editor. This is shown instead of the string in
   * question. Should be translated.
   */
  stringIsTooLargeToEdit: "<string is too large to edit>",
  /**
   * @description Text of attribute value when text is too long
   * @example {30 MB} PH1
   */
  showMoreS: "Show more ({PH1})",
  /**
   * @description Text of attribute value when text is too long
   * @example {30 MB} PH1
   */
  longTextWasTruncatedS: "long text was truncated ({PH1})",
  /**
   * @description Text for copying
   */
  copy: "Copy",
  /**
   * @description A tooltip text that shows when hovering over a button next to value objects,
   * which are based on bytes and can be shown in a hexadecimal viewer.
   * Clicking on the button will display that object in the Memory inspector panel.
   */
  openInMemoryInpector: "Open in Memory inspector panel"
};
var str_2 = i18n3.i18n.registerUIStrings("ui/legacy/components/object_ui/ObjectPropertiesSection.ts", UIStrings2);
var i18nString2 = i18n3.i18n.getLocalizedString.bind(void 0, str_2);
var EXPANDABLE_MAX_LENGTH = 50;
var EXPANDABLE_MAX_DEPTH = 100;
var objectPropertiesSectionMap = /* @__PURE__ */ new WeakMap();
var ObjectTreeNodeBase = class {
  parent;
  propertiesMode;
  #children;
  extraProperties = [];
  constructor(parent, propertiesMode = 1) {
    this.parent = parent;
    this.propertiesMode = propertiesMode;
  }
  removeChildren() {
    this.#children = void 0;
  }
  removeChild(child) {
    remove(this.#children?.arrayRanges, child);
    remove(this.#children?.internalProperties, child);
    remove(this.#children?.properties, child);
    function remove(array, element) {
      if (!array) {
        return;
      }
      const index = array.indexOf(element);
      if (index >= 0) {
        array.splice(index, 1);
      }
    }
  }
  selfOrParentIfInternal() {
    return this;
  }
  async children() {
    if (!this.#children) {
      this.#children = await this.populateChildren();
    }
    return this.#children;
  }
  async populateChildren() {
    const object = this.object;
    if (!object) {
      return {};
    }
    const effectiveParent = this.selfOrParentIfInternal();
    if (this.arrayLength > ARRAY_LOAD_THRESHOLD) {
      const ranges = await arrayRangeGroups(object, 0, this.arrayLength - 1);
      const arrayRanges = ranges?.ranges.map(([fromIndex, toIndex, count]) => new ArrayGroupTreeNode(object, { fromIndex, toIndex, count }));
      if (!arrayRanges) {
        return {};
      }
      const { properties: objectProperties2, internalProperties: objectInternalProperties2 } = await SDK3.RemoteObject.RemoteObject.loadFromObjectPerProto(
        this.object,
        true,
        true
        /* nonIndexedPropertiesOnly */
      );
      const properties2 = objectProperties2?.map((p) => new ObjectTreeNode(p, void 0, effectiveParent, void 0));
      const internalProperties2 = objectInternalProperties2?.map((p) => new ObjectTreeNode(p, void 0, effectiveParent, void 0));
      return { arrayRanges, properties: properties2, internalProperties: internalProperties2 };
    }
    let objectProperties = null;
    let objectInternalProperties = null;
    switch (this.propertiesMode) {
      case 0:
        ({ properties: objectProperties } = await object.getAllProperties(
          false,
          true
          /* generatePreview */
        ));
        break;
      case 1:
        ({ properties: objectProperties, internalProperties: objectInternalProperties } = await SDK3.RemoteObject.RemoteObject.loadFromObjectPerProto(
          object,
          true
          /* generatePreview */
        ));
        break;
    }
    const properties = objectProperties?.map((p) => new ObjectTreeNode(p, void 0, effectiveParent, void 0));
    properties?.push(...this.extraProperties);
    const internalProperties = objectInternalProperties?.map((p) => new ObjectTreeNode(p, void 0, effectiveParent, void 0));
    return { properties, internalProperties };
  }
  get hasChildren() {
    return this.object?.hasChildren ?? false;
  }
  get arrayLength() {
    return this.object?.arrayLength() ?? 0;
  }
  // This is used in web tests
  async setPropertyValue(name, value) {
    return await this.object?.setPropertyValue(name, value);
  }
  addExtraProperties(...properties) {
    this.extraProperties.push(...properties.map((p) => new ObjectTreeNode(p, void 0, this, void 0)));
  }
};
var ObjectTree = class extends ObjectTreeNodeBase {
  #object;
  constructor(object, propertiesMode = 1) {
    super(void 0, propertiesMode);
    this.#object = object;
  }
  get object() {
    return this.#object;
  }
};
var ArrayGroupTreeNode = class _ArrayGroupTreeNode extends ObjectTreeNodeBase {
  #object;
  #range;
  constructor(object, range, parent, propertiesMode = 1) {
    super(parent, propertiesMode);
    this.#object = object;
    this.#range = range;
  }
  async populateChildren() {
    if (this.#range.count > ArrayGroupingTreeElement.bucketThreshold) {
      const ranges = await arrayRangeGroups(this.object, this.#range.fromIndex, this.#range.toIndex);
      const arrayRanges = ranges?.ranges.map(([fromIndex, toIndex, count]) => new _ArrayGroupTreeNode(this.object, { fromIndex, toIndex, count }));
      return { arrayRanges };
    }
    const result = await this.#object.callFunction(buildArrayFragment, [
      { value: this.#range.fromIndex },
      { value: this.#range.toIndex },
      { value: ArrayGroupingTreeElement.sparseIterationThreshold }
    ]);
    if (!result.object || result.wasThrown) {
      return {};
    }
    const arrayFragment = result.object;
    const allProperties = await arrayFragment.getAllProperties(
      false,
      true
      /* generatePreview */
    );
    arrayFragment.release();
    const properties = allProperties.properties?.map((p) => new ObjectTreeNode(p, this.propertiesMode, this, void 0));
    properties?.push(...this.extraProperties);
    properties?.sort(ObjectPropertiesSection.compareProperties);
    return { properties };
  }
  get singular() {
    return this.#range.fromIndex === this.#range.toIndex;
  }
  get range() {
    return this.#range;
  }
  get object() {
    return this.#object;
  }
};
var ObjectTreeNode = class _ObjectTreeNode extends ObjectTreeNodeBase {
  property;
  nonSyntheticParent;
  #path;
  constructor(property, propertiesMode = 1, parent, nonSyntheticParent) {
    super(parent, propertiesMode);
    this.property = property;
    this.nonSyntheticParent = nonSyntheticParent;
  }
  get object() {
    return this.property.value;
  }
  get name() {
    return this.property.name;
  }
  get path() {
    if (!this.#path) {
      if (this.property.synthetic) {
        this.#path = this.name;
        return this.name;
      }
      const useDotNotation = /^(?:[$_\p{ID_Start}])(?:[$_\u200C\u200D\p{ID_Continue}])*$/u;
      const isInteger = /^(?:0|[1-9]\d*)$/;
      const parentPath = this.parent instanceof _ObjectTreeNode && !this.parent.property.synthetic ? this.parent.path : "";
      if (this.property.private || useDotNotation.test(this.name)) {
        this.#path = parentPath ? `${parentPath}.${this.name}` : this.name;
      } else if (isInteger.test(this.name)) {
        this.#path = `${parentPath}[${this.name}]`;
      } else {
        this.#path = `${parentPath}[${JSON.stringify(this.name)}]`;
      }
    }
    return this.#path;
  }
  selfOrParentIfInternal() {
    return this.name === "[[Prototype]]" ? this.parent ?? this : this;
  }
};
var getObjectPropertiesSectionFrom = (element) => {
  return objectPropertiesSectionMap.get(element);
};
var ObjectPropertiesSection = class _ObjectPropertiesSection extends UI2.TreeOutline.TreeOutlineInShadow {
  root;
  editable;
  #objectTreeElement;
  titleElement;
  skipProtoInternal;
  constructor(object, title, linkifier, showOverflow) {
    super();
    this.root = new ObjectTree(object);
    this.editable = true;
    if (!showOverflow) {
      this.setHideOverflow(true);
    }
    this.setFocusable(true);
    this.setShowSelectionOnKeyboardFocus(true);
    this.#objectTreeElement = new RootElement(this.root, linkifier);
    this.appendChild(this.#objectTreeElement);
    if (typeof title === "string" || !title) {
      this.titleElement = this.element.createChild("span");
      this.titleElement.textContent = title || "";
    } else {
      this.titleElement = title;
      this.element.appendChild(title);
    }
    if (this.titleElement instanceof HTMLElement && !this.titleElement.hasAttribute("tabIndex")) {
      this.titleElement.tabIndex = -1;
    }
    objectPropertiesSectionMap.set(this.element, this);
    this.registerRequiredCSS(objectValue_css_default, objectPropertiesSection_css_default);
    this.rootElement().childrenListElement.classList.add("source-code", "object-properties-section");
  }
  static defaultObjectPresentation(object, linkifier, skipProto, readOnly) {
    const objectPropertiesSection = _ObjectPropertiesSection.defaultObjectPropertiesSection(object, linkifier, skipProto, readOnly);
    if (!object.hasChildren) {
      return objectPropertiesSection.titleElement;
    }
    return objectPropertiesSection.element;
  }
  static defaultObjectPropertiesSection(object, linkifier, skipProto, readOnly) {
    const titleElement = document.createElement("span");
    titleElement.classList.add("source-code");
    const shadowRoot = UI2.UIUtils.createShadowRootWithCoreStyles(titleElement, { cssFile: objectValue_css_default });
    const propertyValue = _ObjectPropertiesSection.createPropertyValue(
      object,
      /* wasThrown */
      false,
      /* showPreview */
      true
    );
    shadowRoot.appendChild(propertyValue);
    const objectPropertiesSection = new _ObjectPropertiesSection(object, titleElement, linkifier);
    objectPropertiesSection.editable = false;
    if (skipProto) {
      objectPropertiesSection.skipProto();
    }
    if (readOnly) {
      objectPropertiesSection.setEditable(false);
    }
    return objectPropertiesSection;
  }
  // The RemoteObjectProperty overload is kept for web test compatibility for now.
  static compareProperties(propertyA, propertyB) {
    if (propertyA instanceof ObjectTreeNode) {
      propertyA = propertyA.property;
    }
    if (propertyB instanceof ObjectTreeNode) {
      propertyB = propertyB.property;
    }
    if (!propertyA.synthetic && propertyB.synthetic) {
      return 1;
    }
    if (!propertyB.synthetic && propertyA.synthetic) {
      return -1;
    }
    if (!propertyA.isOwn && propertyB.isOwn) {
      return 1;
    }
    if (!propertyB.isOwn && propertyA.isOwn) {
      return -1;
    }
    if (!propertyA.enumerable && propertyB.enumerable) {
      return 1;
    }
    if (!propertyB.enumerable && propertyA.enumerable) {
      return -1;
    }
    if (propertyA.symbol && !propertyB.symbol) {
      return 1;
    }
    if (propertyB.symbol && !propertyA.symbol) {
      return -1;
    }
    if (propertyA.private && !propertyB.private) {
      return 1;
    }
    if (propertyB.private && !propertyA.private) {
      return -1;
    }
    const a = propertyA.name;
    const b = propertyB.name;
    if (a.startsWith("_") && !b.startsWith("_")) {
      return 1;
    }
    if (b.startsWith("_") && !a.startsWith("_")) {
      return -1;
    }
    return Platform3.StringUtilities.naturalOrderComparator(a, b);
  }
  static createNameElement(name, isPrivate) {
    if (name === null) {
      return UI2.Fragment.html`<span class="name"></span>`;
    }
    if (/^\s|\s$|^$|\n/.test(name)) {
      return UI2.Fragment.html`<span class="name">"${name.replace(/\n/g, "\u21B5")}"</span>`;
    }
    if (isPrivate) {
      return UI2.Fragment.html`<span class="name">
  <span class="private-property-hash">${name[0]}</span>${name.substring(1)}
  </span>`;
    }
    return UI2.Fragment.html`<span class="name">${name}</span>`;
  }
  static valueElementForFunctionDescription(description, includePreview, defaultName, className) {
    const contents = (description2, defaultName2) => {
      const text = description2.replace(/^function [gs]et /, "function ").replace(/^function [gs]et\(/, "function(").replace(/^[gs]et /, "");
      const asyncMatch = text.match(/^(async\s+function)/);
      const isGenerator = text.startsWith("function*");
      const isGeneratorShorthand = text.startsWith("*");
      const isBasic = !isGenerator && text.startsWith("function");
      const isClass = text.startsWith("class ") || text.startsWith("class{");
      const firstArrowIndex = text.indexOf("=>");
      const isArrow = !asyncMatch && !isGenerator && !isBasic && !isClass && firstArrowIndex > 0;
      if (isClass) {
        const body2 = text.substring("class".length);
        const classNameMatch = /^[^{\s]+/.exec(body2.trim());
        let className2 = defaultName2;
        if (classNameMatch) {
          className2 = classNameMatch[0].trim() || defaultName2;
        }
        return { prefix: "class", body: body2, abbreviation: className2 };
      }
      if (asyncMatch) {
        const body2 = text.substring(asyncMatch[1].length);
        return { prefix: "async \u0192", body: body2, abbreviation: nameAndArguments(body2) };
      }
      if (isGenerator) {
        const body2 = text.substring("function*".length);
        return { prefix: "\u0192*", body: body2, abbreviation: nameAndArguments(body2) };
      }
      if (isGeneratorShorthand) {
        const body2 = text.substring("*".length);
        return { prefix: "\u0192*", body: body2, abbreviation: nameAndArguments(body2) };
      }
      if (isBasic) {
        const body2 = text.substring("function".length);
        return { prefix: "\u0192", body: body2, abbreviation: nameAndArguments(body2) };
      }
      if (isArrow) {
        const maxArrowFunctionCharacterLength = 60;
        let abbreviation2 = text;
        if (defaultName2) {
          abbreviation2 = defaultName2 + "()";
        } else if (text.length > maxArrowFunctionCharacterLength) {
          abbreviation2 = text.substring(0, firstArrowIndex + 2) + " {\u2026}";
        }
        return { prefix: "", body: text, abbreviation: abbreviation2 };
      }
      return { prefix: "\u0192", body: text, abbreviation: nameAndArguments(text) };
    };
    const { prefix, body, abbreviation } = contents(description ?? "", defaultName ?? "");
    const maxFunctionBodyLength = 200;
    return html2`<span
      class="object-value-function ${className ?? ""}"
      title=${Platform3.StringUtilities.trimEndWithMaxLength(description ?? "", 500)}>${prefix && html2`<span class=object-value-function-prefix>${prefix} </span>`}${includePreview ? Platform3.StringUtilities.trimEndWithMaxLength(body.trim(), maxFunctionBodyLength) : abbreviation.replace(/\n/g, " ")}</span>`;
    function nameAndArguments(contents2) {
      const startOfArgumentsIndex = contents2.indexOf("(");
      const endOfArgumentsMatch = contents2.match(/\)\s*{/);
      if (startOfArgumentsIndex !== -1 && endOfArgumentsMatch?.index !== void 0 && endOfArgumentsMatch.index > startOfArgumentsIndex) {
        const name = contents2.substring(0, startOfArgumentsIndex).trim() || (defaultName ?? "");
        const args = contents2.substring(startOfArgumentsIndex, endOfArgumentsMatch.index + 1);
        return name + args;
      }
      return defaultName + "()";
    }
  }
  static createPropertyValueWithCustomSupport(value, wasThrown, showPreview, linkifier, isSyntheticProperty, variableName) {
    if (value.customPreview()) {
      const result = new CustomPreviewComponent(value).element;
      result.classList.add("object-properties-section-custom-section");
      return result;
    }
    return _ObjectPropertiesSection.createPropertyValue(value, wasThrown, showPreview, linkifier, isSyntheticProperty, variableName);
  }
  static getMemoryIcon(object, expression) {
    return !object.isLinearMemoryInspectable() ? nothing2 : html2`<devtools-icon
      name=memory
      style="width: var(--sys-size-8); height: 13px; vertical-align: sub; cursor: pointer;"
      @click=${(event) => {
      event.consume();
      void Common.Revealer.reveal(new SDK3.RemoteObject.LinearMemoryInspectable(object, expression));
    }}
      jslog=${VisualLogging.action("open-memory-inspector").track({ click: true })}
      title=${i18nString2(UIStrings2.openInMemoryInpector)}
      aria-label=${i18nString2(UIStrings2.openInMemoryInpector)}></devtools-icon>`;
  }
  static appendMemoryIcon(element, object, expression) {
    const fragment = document.createDocumentFragment();
    render2(_ObjectPropertiesSection.getMemoryIcon(object, expression), fragment);
    element.appendChild(fragment);
  }
  static createPropertyValue(value, wasThrown, showPreview, linkifier, isSyntheticProperty = false, variableName) {
    const propertyValue = document.createDocumentFragment();
    const type = value.type;
    const subtype = value.subtype;
    const description = value.description || "";
    const className = value.className;
    const contents = () => {
      if (type === "object" && subtype === "internal#location") {
        const rawLocation = value.debuggerModel().createRawLocationByScriptId(value.value.scriptId, value.value.lineNumber, value.value.columnNumber);
        if (rawLocation && linkifier) {
          return html2`${linkifier.linkifyRawLocation(rawLocation, Platform3.DevToolsPath.EmptyUrlString, "value")}`;
        }
        return html2`<span class=value title=${description}>${"<" + i18nString2(UIStrings2.unknown) + ">"}</span>`;
      }
      if (type === "string" && typeof description === "string") {
        const text = JSON.stringify(description);
        const tooLong = description.length > maxRenderableStringLength;
        return html2`<span class="value object-value-string" title=${ifDefined2(tooLong ? void 0 : description)}>${tooLong ? new ExpandableTextPropertyValue(text, EXPANDABLE_MAX_LENGTH).element : text}</span>`;
      }
      if (type === "object" && subtype === "trustedtype") {
        const text = `${className} '${description}'`;
        const tooLong = text.length > maxRenderableStringLength;
        return html2`<span class="value object-value-trustedtype" title=${ifDefined2(tooLong ? void 0 : text)}>${tooLong ? new ExpandableTextPropertyValue(text, EXPANDABLE_MAX_LENGTH).element : html2`${className} <span class=object-value-string title=${description}>${JSON.stringify(description)}</span>`}</span>`;
      }
      if (type === "function") {
        return _ObjectPropertiesSection.valueElementForFunctionDescription(description, void 0, void 0, "value");
      }
      if (type === "object" && subtype === "node" && description) {
        return html2`<span class="value object-value-node"
            @click=${(event) => {
          void Common.Revealer.reveal(value);
          event.consume(true);
        }}
            @mousemove=${() => SDK3.OverlayModel.OverlayModel.highlightObjectAsDOMNode(value)}
            @mouseleave=${() => SDK3.OverlayModel.OverlayModel.hideDOMNodeHighlight()}
          >${renderNodeTitle(description)}</span>`;
      }
      if (description.length > maxRenderableStringLength) {
        return html2`<span class="value object-value-${subtype || type}" title=${description}>${new ExpandableTextPropertyValue(description, EXPANDABLE_MAX_LENGTH).element}</span>`;
      }
      const hasPreview = value.preview && showPreview;
      return html2`<span class="value object-value-${subtype || type}" title=${description}>${hasPreview ? new RemoteObjectPreviewFormatter().renderObjectPreview(value.preview) : description}${isSyntheticProperty ? nothing2 : this.getMemoryIcon(value, variableName)}</span>`;
    };
    if (wasThrown) {
      render2(html2`<span class="error value">${uiI18n.getFormatLocalizedStringTemplate(str_2, UIStrings2.exceptionS, { PH1: contents() })}</span>`, propertyValue);
    } else {
      render2(contents(), propertyValue);
    }
    const child = propertyValue.firstElementChild;
    if (!(child instanceof HTMLElement)) {
      throw new Error("Expected an HTML element");
    }
    return child;
  }
  static formatObjectAsFunction(func, element, linkify, includePreview) {
    return func.debuggerModel().functionDetailsPromise(func).then(didGetDetails);
    function didGetDetails(response) {
      if (linkify && response?.location) {
        element.classList.add("linkified");
        element.addEventListener("click", () => {
          void Common.Revealer.reveal(response.location);
          return false;
        });
      }
      let defaultName = includePreview ? "" : "anonymous";
      if (response?.functionName) {
        defaultName = response.functionName;
      }
      const valueElement = document.createDocumentFragment();
      render2(_ObjectPropertiesSection.valueElementForFunctionDescription(func.description, includePreview, defaultName), valueElement);
      element.appendChild(valueElement);
    }
  }
  static isDisplayableProperty(property, parentProperty) {
    if (!parentProperty?.synthetic) {
      return true;
    }
    const name = property.name;
    const useless = parentProperty.name === "[[Entries]]" && (name === "length" || name === "__proto__");
    return !useless;
  }
  skipProto() {
    this.skipProtoInternal = true;
  }
  expand() {
    this.#objectTreeElement.expand();
  }
  setEditable(value) {
    this.editable = value;
  }
  objectTreeElement() {
    return this.#objectTreeElement;
  }
  enableContextMenu() {
    this.element.addEventListener("contextmenu", this.contextMenuEventFired.bind(this), false);
  }
  contextMenuEventFired(event) {
    const contextMenu = new UI2.ContextMenu.ContextMenu(event);
    contextMenu.appendApplicableItems(this.root);
    if (this.root.object instanceof SDK3.RemoteObject.LocalJSONObject) {
      contextMenu.viewSection().appendItem(i18nString2(UIStrings2.expandRecursively), this.#objectTreeElement.expandRecursively.bind(this.#objectTreeElement, EXPANDABLE_MAX_DEPTH), { jslogContext: "expand-recursively" });
      contextMenu.viewSection().appendItem(i18nString2(UIStrings2.collapseChildren), this.#objectTreeElement.collapseChildren.bind(this.#objectTreeElement), { jslogContext: "collapse-children" });
    }
    void contextMenu.show();
  }
  titleLessMode() {
    this.#objectTreeElement.listItemElement.classList.add("hidden");
    this.#objectTreeElement.childrenListElement.classList.add("title-less-mode");
    this.#objectTreeElement.expand();
  }
};
var ARRAY_LOAD_THRESHOLD = 100;
var maxRenderableStringLength = 1e4;
var ObjectPropertiesSectionsTreeOutline = class extends UI2.TreeOutline.TreeOutlineInShadow {
  editable;
  constructor(options) {
    super();
    this.registerRequiredCSS(objectValue_css_default, objectPropertiesSection_css_default);
    this.editable = !options?.readOnly;
    this.contentElement.classList.add("source-code");
    this.contentElement.classList.add("object-properties-section");
  }
};
var RootElement = class extends UI2.TreeOutline.TreeElement {
  object;
  linkifier;
  emptyPlaceholder;
  toggleOnClick;
  constructor(object, linkifier, emptyPlaceholder) {
    const contentElement = document.createElement("slot");
    super(contentElement);
    this.object = object;
    this.linkifier = linkifier;
    this.emptyPlaceholder = emptyPlaceholder;
    this.setExpandable(true);
    this.selectable = true;
    this.toggleOnClick = true;
    this.listItemElement.classList.add("object-properties-section-root-element");
    this.listItemElement.addEventListener("contextmenu", this.onContextMenu.bind(this), false);
  }
  invalidateChildren() {
    super.invalidateChildren();
    this.object.removeChildren();
  }
  onexpand() {
    if (this.treeOutline) {
      this.treeOutline.element.classList.add("expanded");
    }
  }
  oncollapse() {
    if (this.treeOutline) {
      this.treeOutline.element.classList.remove("expanded");
    }
  }
  ondblclick(_e) {
    return true;
  }
  onContextMenu(event) {
    const contextMenu = new UI2.ContextMenu.ContextMenu(event);
    contextMenu.appendApplicableItems(this.object.object);
    if (this.object instanceof SDK3.RemoteObject.LocalJSONObject) {
      const { value } = this.object;
      const propertyValue = typeof value === "object" ? JSON.stringify(value, null, 2) : value;
      const copyValueHandler = () => {
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.NetworkPanelCopyValue);
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(propertyValue);
      };
      contextMenu.clipboardSection().appendItem(i18nString2(UIStrings2.copyValue), copyValueHandler, { jslogContext: "copy-value" });
    }
    contextMenu.viewSection().appendItem(i18nString2(UIStrings2.expandRecursively), this.expandRecursively.bind(this, EXPANDABLE_MAX_DEPTH), { jslogContext: "expand-recursively" });
    contextMenu.viewSection().appendItem(i18nString2(UIStrings2.collapseChildren), this.collapseChildren.bind(this), { jslogContext: "collapse-children" });
    void contextMenu.show();
  }
  async onpopulate() {
    const treeOutline = this.treeOutline;
    const skipProto = treeOutline ? Boolean(treeOutline.skipProtoInternal) : false;
    return await ObjectPropertyTreeElement.populate(this, this.object, skipProto, false, this.linkifier, this.emptyPlaceholder);
  }
};
var InitialVisibleChildrenLimit = 200;
var TREE_ELEMENT_DEFAULT_VIEW = (input, output, target) => {
  const { property } = input.node;
  const isInternalEntries = property.synthetic && input.node.name === "[[Entries]]";
  const completionsId = `completions-${input.node.parent?.object?.objectId?.replaceAll(".", "-")}-${input.node.name}`;
  const onAutoComplete = async (e) => {
    if (!(e.target instanceof UI2.TextPrompt.TextPromptElement)) {
      return;
    }
    input.onAutoComplete(e.detail.expression, e.detail.filter, e.detail.force);
  };
  const nameClasses = classMap({
    name: true,
    "object-properties-section-dimmed": !property.enumerable,
    "own-property": property.isOwn,
    "synthetic-property": property.synthetic
  });
  const quotedName = /^\s|\s$|^$|\n/.test(property.name) ? `"${property.name.replace(/\n/g, "\u21B5")}"` : property.name;
  const isExpandable = !isInternalEntries && property.value && !property.wasThrown && property.value.hasChildren && !property.value.customPreview() && property.value.subtype !== "node" && property.value.type !== "function" && (property.value.type !== "object" || property.value.preview);
  const value = () => {
    const valueRef = ref((e) => {
      output.valueElement = e;
    });
    if (isInternalEntries) {
      return html2`<span ${valueRef} class=value></span>`;
    }
    if (property.value) {
      const showPreview = property.name !== "[[Prototype]]";
      const value2 = ObjectPropertiesSection.createPropertyValueWithCustomSupport(
        property.value,
        property.wasThrown,
        showPreview,
        input.linkifier,
        property.synthetic,
        input.node.path
        /* variableName */
      );
      output.valueElement = value2;
      return value2;
    }
    if (property.getter) {
      const getter = property.getter;
      const invokeGetter = (event) => {
        event.consume();
        input.invokeGetter(getter);
      };
      return html2`<span ${valueRef}><span
        class=object-value-calculate-value-button
        title=${i18nString2(UIStrings2.invokePropertyGetter)}
        @click=${invokeGetter}
        >${i18nString2(UIStrings2.dots)}</span></span>`;
    }
    return html2`<span ${valueRef}
        class=object-value-unavailable
        title=${i18nString2(UIStrings2.valueNotAccessibleToTheDebugger)}>${i18nString2(UIStrings2.valueUnavailable)}</span>`;
  };
  const onDblClick = (event) => {
    event.consume(true);
    if (property.value && !property.value.customPreview() && (property.writable || property.setter)) {
      input.startEditing();
    }
  };
  render2(html2`<span class=name-and-value><span
          ${ref((e) => {
    output.nameElement = e;
  })}
          class=${nameClasses}
          title=${input.node.path}>${property.private ? html2`<span class="private-property-hash">${property.name[0]}</span>${property.name.substring(1)}</span>` : quotedName}</span>${isInternalEntries ? nothing2 : html2`<span class='separator'>: </span><devtools-prompt
                @commit=${(e) => input.editingCommitted(e.detail)}
                @cancel=${() => input.editingEnded()}
                @beforeautocomplete=${onAutoComplete}
                @dblclick=${onDblClick}
                completions=${completionsId}
                placeholder=${i18nString2(UIStrings2.stringIsTooLargeToEdit)}
                ?editing=${input.editing}>
                  ${input.expanded && isExpandable && property.value ? html2`<span
                      class="value object-value-${property.value.subtype || property.value.type}"
                      title=${ifDefined2(property.value.description)}>${property.value.description === "Object" ? "" : Platform3.StringUtilities.trimMiddle(property.value.description ?? "", maxRenderableStringLength)}${property.synthetic ? nothing2 : ObjectPropertiesSection.getMemoryIcon(property.value)}</span>` : value()}
                  <datalist id=${completionsId}>${repeat2(input.completions, (c) => html2`<option>${c}</option>`)}</datalist>
                </devtools-prompt></span>`}</span>`, target);
};
var ObjectPropertyTreeElement = class _ObjectPropertyTreeElement extends UI2.TreeOutline.TreeElement {
  property;
  toggleOnClick;
  highlightChanges;
  linkifier;
  maxNumPropertiesToShow;
  readOnly;
  prompt;
  #editing = false;
  #view;
  #completions = [];
  #nameElement;
  #valueElement;
  constructor(property, linkifier, view = TREE_ELEMENT_DEFAULT_VIEW) {
    super();
    this.#view = view;
    this.property = property;
    this.toggleOnClick = true;
    this.highlightChanges = [];
    this.linkifier = linkifier;
    this.maxNumPropertiesToShow = InitialVisibleChildrenLimit;
    this.listItemElement.addEventListener("contextmenu", this.contextMenuFired.bind(this), false);
    this.listItemElement.dataset.objectPropertyNameForTest = property.name;
    this.setExpandRecursively(property.name !== "[[Prototype]]");
  }
  static async populate(treeElement, value, skipProto, skipGettersAndSetters, linkifier, emptyPlaceholder) {
    const properties = await value.children();
    if (properties.arrayRanges) {
      await ArrayGroupingTreeElement.populate(treeElement, properties, linkifier);
    } else {
      _ObjectPropertyTreeElement.populateWithProperties(treeElement, properties, skipProto, skipGettersAndSetters, linkifier, emptyPlaceholder);
    }
  }
  static populateWithProperties(treeNode, { properties, internalProperties }, skipProto, skipGettersAndSetters, linkifier, emptyPlaceholder) {
    properties?.sort(ObjectPropertiesSection.compareProperties);
    const entriesProperty = internalProperties?.find(({ property }) => property.name === "[[Entries]]");
    if (entriesProperty) {
      const treeElement = new _ObjectPropertyTreeElement(entriesProperty, linkifier);
      treeElement.setExpandable(true);
      treeElement.expand();
      treeNode.appendChild(treeElement);
    }
    const tailProperties = [];
    for (const property of properties ?? []) {
      if (treeNode instanceof _ObjectPropertyTreeElement && !ObjectPropertiesSection.isDisplayableProperty(property.property, treeNode.property?.property)) {
        continue;
      }
      if (property.property.isOwn && !skipGettersAndSetters) {
        if (property.property.getter) {
          const getterProperty = new SDK3.RemoteObject.RemoteObjectProperty("get " + property.property.name, property.property.getter, false);
          tailProperties.push(new ObjectTreeNode(getterProperty, property.propertiesMode, property.parent));
        }
        if (property.property.setter) {
          const setterProperty = new SDK3.RemoteObject.RemoteObjectProperty("set " + property.property.name, property.property.setter, false);
          tailProperties.push(new ObjectTreeNode(setterProperty, property.propertiesMode, property.parent));
        }
      }
      const canShowProperty = property.property.getter || !property.property.isAccessorProperty();
      if (canShowProperty) {
        const element = new _ObjectPropertyTreeElement(property, linkifier);
        if (property.property.name === "memories" && property.object?.className === "Memories") {
          element.updateExpandable();
          if (element.isExpandable()) {
            element.expand();
          }
        }
        treeNode.appendChild(element);
      }
    }
    for (let i = 0; i < tailProperties.length; ++i) {
      treeNode.appendChild(new _ObjectPropertyTreeElement(tailProperties[i], linkifier));
    }
    for (const property of internalProperties ?? []) {
      const treeElement = new _ObjectPropertyTreeElement(property, linkifier);
      if (property.property.name === "[[Entries]]") {
        continue;
      }
      if (property.property.name === "[[Prototype]]" && skipProto) {
        continue;
      }
      treeNode.appendChild(treeElement);
    }
    _ObjectPropertyTreeElement.appendEmptyPlaceholderIfNeeded(treeNode, emptyPlaceholder);
  }
  static appendEmptyPlaceholderIfNeeded(treeNode, emptyPlaceholder) {
    if (treeNode.childCount()) {
      return;
    }
    const title = document.createElement("div");
    title.classList.add("gray-info-message");
    title.textContent = emptyPlaceholder || i18nString2(UIStrings2.noProperties);
    const infoElement = new UI2.TreeOutline.TreeElement(title);
    treeNode.appendChild(infoElement);
  }
  static createRemoteObjectAccessorPropertySpan(object, propertyPath, callback) {
    const rootElement = document.createElement("span");
    const element = rootElement.createChild("span");
    element.textContent = i18nString2(UIStrings2.dots);
    if (!object) {
      return rootElement;
    }
    element.classList.add("object-value-calculate-value-button");
    UI2.Tooltip.Tooltip.install(element, i18nString2(UIStrings2.invokePropertyGetter));
    element.addEventListener("click", onInvokeGetterClick, false);
    function onInvokeGetterClick(event) {
      event.consume();
      if (object) {
        void object.callFunction(invokeGetter, [{ value: JSON.stringify(propertyPath) }]).then(callback);
      }
    }
    function invokeGetter(arrayStr) {
      let result = this;
      const properties = JSON.parse(arrayStr);
      for (let i = 0, n = properties.length; i < n; ++i) {
        result = result[properties[i]];
      }
      return result;
    }
    return rootElement;
  }
  get nameElement() {
    return this.#nameElement;
  }
  setSearchRegex(regex, additionalCssClassName) {
    let cssClasses = UI2.UIUtils.highlightedSearchResultClassName;
    if (additionalCssClassName) {
      cssClasses += " " + additionalCssClassName;
    }
    this.revertHighlightChanges();
    if (this.#nameElement) {
      this.applySearch(regex, this.#nameElement, cssClasses);
    }
    if (this.property.object) {
      const valueType = this.property.object.type;
      if (valueType !== "object" && this.#valueElement) {
        this.applySearch(regex, this.#valueElement, cssClasses);
      }
    }
    return Boolean(this.highlightChanges.length);
  }
  applySearch(regex, element, cssClassName) {
    const ranges = [];
    const content = element.textContent || "";
    regex.lastIndex = 0;
    let match = regex.exec(content);
    while (match) {
      ranges.push(new TextUtils.TextRange.SourceRange(match.index, match[0].length));
      match = regex.exec(content);
    }
    if (ranges.length) {
      UI2.UIUtils.highlightRangesWithStyleClass(element, ranges, cssClassName, this.highlightChanges);
    }
  }
  showAllPropertiesElementSelected(element) {
    this.removeChild(element);
    this.children().forEach((x) => {
      x.hidden = false;
    });
    return false;
  }
  createShowAllPropertiesButton() {
    const element = document.createElement("div");
    element.classList.add("object-value-calculate-value-button");
    element.textContent = i18nString2(UIStrings2.dots);
    UI2.Tooltip.Tooltip.install(element, i18nString2(UIStrings2.showAllD, { PH1: this.childCount() }));
    const children = this.children();
    for (let i = this.maxNumPropertiesToShow; i < this.childCount(); ++i) {
      children[i].hidden = true;
    }
    const showAllPropertiesButton = new UI2.TreeOutline.TreeElement(element);
    showAllPropertiesButton.onselect = this.showAllPropertiesElementSelected.bind(this, showAllPropertiesButton);
    this.appendChild(showAllPropertiesButton);
  }
  revertHighlightChanges() {
    UI2.UIUtils.revertDomChanges(this.highlightChanges);
    this.highlightChanges = [];
  }
  async onpopulate() {
    const treeOutline = this.treeOutline;
    const skipProto = treeOutline ? Boolean(treeOutline.skipProtoInternal) : false;
    this.removeChildren();
    this.property.removeChildren();
    if (this.property.object) {
      await _ObjectPropertyTreeElement.populate(this, this.property, skipProto, false, this.linkifier);
      if (this.childCount() > this.maxNumPropertiesToShow) {
        this.createShowAllPropertiesButton();
      }
    }
  }
  onenter() {
    if (this.property.object && !this.property.object.customPreview() && (this.property.property.writable || this.property.property.setter)) {
      this.startEditing();
      return true;
    }
    return false;
  }
  onattach() {
    this.performUpdate();
    this.updateExpandable();
  }
  onexpand() {
    this.performUpdate();
  }
  oncollapse() {
    this.performUpdate();
  }
  async #updateCompletions(expression, filter, force) {
    const suggestions = await TextEditor.JavaScript.completeInContext(expression, filter, force);
    this.#completions = suggestions.map((v) => v.text);
    this.performUpdate();
  }
  performUpdate() {
    const input = {
      expanded: this.expanded,
      editing: this.#editing,
      editingEnded: this.editingEnded.bind(this),
      editingCommitted: this.editingCommitted.bind(this),
      node: this.property,
      linkifier: this.linkifier,
      completions: this.#editing ? this.#completions : [],
      onAutoComplete: this.#updateCompletions.bind(this),
      invokeGetter: this.onInvokeGetterClick.bind(this),
      startEditing: this.startEditing.bind(this)
    };
    const that = this;
    const output = {
      set nameElement(e) {
        that.#nameElement = e;
      },
      set valueElement(e) {
        that.#valueElement = e;
      }
    };
    this.#view(input, output, this.listItemElement);
  }
  getContextMenu(event) {
    const contextMenu = new UI2.ContextMenu.ContextMenu(event);
    contextMenu.appendApplicableItems(this);
    if (this.property.property.symbol) {
      contextMenu.appendApplicableItems(this.property.property.symbol);
    }
    if (this.property.object) {
      contextMenu.appendApplicableItems(this.property.object);
      if (this.property.parent?.object instanceof SDK3.RemoteObject.LocalJSONObject) {
        const propertyValue = typeof this.property.object === "object" ? JSON.stringify(this.property.object, null, 2) : this.property.object;
        const copyValueHandler = () => {
          Host.userMetrics.actionTaken(Host.UserMetrics.Action.NetworkPanelCopyValue);
          Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(propertyValue);
        };
        contextMenu.clipboardSection().appendItem(i18nString2(UIStrings2.copyValue), copyValueHandler, { jslogContext: "copy-value" });
      }
    }
    if (!this.property.property.synthetic && this.property.path) {
      const copyPathHandler = Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText.bind(Host.InspectorFrontendHost.InspectorFrontendHostInstance, this.property.path);
      contextMenu.clipboardSection().appendItem(i18nString2(UIStrings2.copyPropertyPath), copyPathHandler, { jslogContext: "copy-property-path" });
    }
    if (this.property.parent?.object instanceof SDK3.RemoteObject.LocalJSONObject) {
      contextMenu.viewSection().appendItem(i18nString2(UIStrings2.expandRecursively), this.expandRecursively.bind(this, EXPANDABLE_MAX_DEPTH), { jslogContext: "expand-recursively" });
      contextMenu.viewSection().appendItem(i18nString2(UIStrings2.collapseChildren), this.collapseChildren.bind(this), { jslogContext: "collapse-children" });
    }
    return contextMenu;
  }
  contextMenuFired(event) {
    const contextMenu = this.getContextMenu(event);
    void contextMenu.show();
  }
  get editing() {
    return this.#editing;
  }
  startEditing() {
    if (!this.readOnly) {
      this.#editing = true;
      this.performUpdate();
    }
  }
  editingEnded() {
    this.#completions = [];
    this.#editing = false;
    this.performUpdate();
    this.updateExpandable();
    this.select();
  }
  async editingCommitted(newContent) {
    this.editingEnded();
    await this.applyExpression(newContent);
  }
  promptKeyDown(originalContent, event) {
    const keyboardEvent = event;
    if (keyboardEvent.key === "Enter") {
      keyboardEvent.consume();
      void this.editingCommitted(originalContent);
      return;
    }
    if (keyboardEvent.key === Platform3.KeyboardUtilities.ESCAPE_KEY) {
      keyboardEvent.consume();
      this.editingEnded();
      return;
    }
  }
  async applyExpression(expression) {
    const property = SDK3.RemoteObject.RemoteObject.toCallArgument(this.property.property.symbol || this.property.name);
    expression = JavaScriptREPL.wrapObjectLiteral(expression.trim());
    if (this.property.property.synthetic) {
      let invalidate = false;
      if (expression) {
        invalidate = await this.property.property.setSyntheticValue(expression);
      }
      if (invalidate) {
        const parent = this.parent;
        if (parent) {
          parent.invalidateChildren();
          void parent.onpopulate();
        }
      } else {
        this.performUpdate();
      }
      return;
    }
    const parentObject = this.property.parent?.object;
    const errorPromise = expression ? parentObject.setPropertyValue(property, expression) : parentObject.deleteProperty(property);
    const error = await errorPromise;
    if (error) {
      this.performUpdate();
      return;
    }
    if (!expression) {
      this.parent?.removeChild(this);
      this.property.parent?.removeChild(this.property);
    } else {
      const parent = this.parent;
      if (parent) {
        parent.invalidateChildren();
        this.property.parent?.removeChildren();
        void parent.onpopulate();
      }
    }
  }
  invalidateChildren() {
    super.invalidateChildren();
    this.property.removeChildren();
  }
  async onInvokeGetterClick(getter) {
    const invokeGetter = `
          function invokeGetter(getter) {
            return Reflect.apply(getter, this, []);
          }`;
    const result = await this.property.parent?.object?.callFunction(invokeGetter, [SDK3.RemoteObject.RemoteObject.toCallArgument(getter)]);
    if (!result?.object) {
      return;
    }
    this.property.property.value = result.object;
    this.property.property.wasThrown = result.wasThrown || false;
    this.performUpdate();
    this.invalidateChildren();
    this.updateExpandable();
  }
  updateExpandable() {
    if (this.property.object) {
      this.setExpandable(!this.property.object.customPreview() && this.property.object.hasChildren && !this.property.property.wasThrown);
    } else {
      this.setExpandable(false);
    }
  }
  path() {
    return this.property.path;
  }
};
async function arrayRangeGroups(object, fromIndex, toIndex) {
  return await object.callFunctionJSON(packArrayRanges, [
    { value: fromIndex },
    { value: toIndex },
    { value: ArrayGroupingTreeElement.bucketThreshold },
    { value: ArrayGroupingTreeElement.sparseIterationThreshold }
  ]);
  function packArrayRanges(fromIndex2, toIndex2, bucketThreshold, sparseIterationThreshold) {
    if (fromIndex2 === void 0 || toIndex2 === void 0 || sparseIterationThreshold === void 0 || bucketThreshold === void 0) {
      return;
    }
    let ownPropertyNames = null;
    const consecutiveRange = toIndex2 - fromIndex2 >= sparseIterationThreshold && ArrayBuffer.isView(this);
    function* arrayIndexes(object2) {
      if (fromIndex2 === void 0 || toIndex2 === void 0 || sparseIterationThreshold === void 0) {
        return;
      }
      if (toIndex2 - fromIndex2 < sparseIterationThreshold) {
        for (let i = fromIndex2; i <= toIndex2; ++i) {
          if (i in object2) {
            yield i;
          }
        }
      } else {
        ownPropertyNames = ownPropertyNames || Object.getOwnPropertyNames(object2);
        for (let i = 0; i < ownPropertyNames.length; ++i) {
          const name = ownPropertyNames[i];
          const index = Number(name) >>> 0;
          if (String(index) === name && fromIndex2 <= index && index <= toIndex2) {
            yield index;
          }
        }
      }
    }
    let count = 0;
    if (consecutiveRange) {
      count = toIndex2 - fromIndex2 + 1;
    } else {
      for (const ignored of arrayIndexes(this)) {
        ++count;
      }
    }
    let bucketSize = count;
    if (count <= bucketThreshold) {
      bucketSize = count;
    } else {
      bucketSize = Math.pow(bucketThreshold, Math.ceil(Math.log(count) / Math.log(bucketThreshold)) - 1);
    }
    const ranges = [];
    if (consecutiveRange) {
      for (let i = fromIndex2; i <= toIndex2; i += bucketSize) {
        const groupStart = i;
        let groupEnd = groupStart + bucketSize - 1;
        if (groupEnd > toIndex2) {
          groupEnd = toIndex2;
        }
        ranges.push([groupStart, groupEnd, groupEnd - groupStart + 1]);
      }
    } else {
      count = 0;
      let groupStart = -1;
      let groupEnd = 0;
      for (const i of arrayIndexes(this)) {
        if (groupStart === -1) {
          groupStart = i;
        }
        groupEnd = i;
        if (++count === bucketSize) {
          ranges.push([groupStart, groupEnd, count]);
          count = 0;
          groupStart = -1;
        }
      }
      if (count > 0) {
        ranges.push([groupStart, groupEnd, count]);
      }
    }
    return { ranges };
  }
}
function buildArrayFragment(fromIndex, toIndex, sparseIterationThreshold) {
  const result = /* @__PURE__ */ Object.create(null);
  if (fromIndex === void 0 || toIndex === void 0 || sparseIterationThreshold === void 0) {
    return;
  }
  if (toIndex - fromIndex < sparseIterationThreshold) {
    for (let i = fromIndex; i <= toIndex; ++i) {
      if (i in this) {
        result[i] = this[i];
      }
    }
  } else {
    const ownPropertyNames = Object.getOwnPropertyNames(this);
    for (let i = 0; i < ownPropertyNames.length; ++i) {
      const name = ownPropertyNames[i];
      const index = Number(name) >>> 0;
      if (String(index) === name && fromIndex <= index && index <= toIndex) {
        result[index] = this[index];
      }
    }
  }
  return result;
}
var ArrayGroupingTreeElement = class _ArrayGroupingTreeElement extends UI2.TreeOutline.TreeElement {
  toggleOnClick;
  linkifier;
  #child;
  constructor(child, linkifier) {
    super(Platform3.StringUtilities.sprintf("[%d \u2026 %d]", child.range.fromIndex, child.range.toIndex), true);
    this.#child = child;
    this.toggleOnClick = true;
    this.linkifier = linkifier;
  }
  static async populate(treeNode, children, linkifier) {
    if (!children.arrayRanges) {
      return;
    }
    if (children.arrayRanges.length === 1) {
      await ObjectPropertyTreeElement.populate(treeNode, children.arrayRanges[0], false, false, linkifier);
    } else {
      for (const child of children.arrayRanges) {
        if (child.singular) {
          await ObjectPropertyTreeElement.populate(treeNode, child, false, false, linkifier);
        } else {
          treeNode.appendChild(new _ArrayGroupingTreeElement(child, linkifier));
        }
      }
    }
    ObjectPropertyTreeElement.populateWithProperties(treeNode, children, false, false, linkifier);
  }
  invalidateChildren() {
    super.invalidateChildren();
    this.#child.removeChildren();
  }
  async onpopulate() {
    this.removeChildren();
    this.#child.removeChildren();
    await ObjectPropertyTreeElement.populate(this, this.#child, false, false, this.linkifier);
  }
  onattach() {
    this.listItemElement.classList.add("object-properties-section-name");
  }
  // These should be module constants but they are modified by layout tests.
  static bucketThreshold = 100;
  static sparseIterationThreshold = 25e4;
};
var ObjectPropertyPrompt = class extends UI2.TextPrompt.TextPrompt {
  constructor() {
    super();
    this.initialize(TextEditor.JavaScript.completeInContext);
  }
};
var ObjectPropertiesSectionsTreeExpandController = class _ObjectPropertiesSectionsTreeExpandController {
  static #propertyPathCache = /* @__PURE__ */ new WeakMap();
  static #sectionMap = /* @__PURE__ */ new WeakMap();
  #expandedProperties = /* @__PURE__ */ new Set();
  constructor(treeOutline) {
    treeOutline.addEventListener(UI2.TreeOutline.Events.ElementAttached, this.#elementAttached, this);
    treeOutline.addEventListener(UI2.TreeOutline.Events.ElementExpanded, this.#elementExpanded, this);
    treeOutline.addEventListener(UI2.TreeOutline.Events.ElementCollapsed, this.#elementCollapsed, this);
  }
  watchSection(id, section) {
    _ObjectPropertiesSectionsTreeExpandController.#sectionMap.set(section, id);
    if (this.#expandedProperties.has(id)) {
      section.expand();
    }
  }
  stopWatchSectionsWithId(id) {
    for (const property of this.#expandedProperties) {
      if (property.startsWith(id + ":")) {
        this.#expandedProperties.delete(property);
      }
    }
  }
  #elementAttached(event) {
    const element = event.data;
    if (element.isExpandable() && this.#expandedProperties.has(this.#propertyPath(element))) {
      element.expand();
    }
  }
  #elementExpanded(event) {
    const element = event.data;
    this.#expandedProperties.add(this.#propertyPath(element));
  }
  #elementCollapsed(event) {
    const element = event.data;
    this.#expandedProperties.delete(this.#propertyPath(element));
  }
  #propertyPath(treeElement) {
    const cachedPropertyPath = _ObjectPropertiesSectionsTreeExpandController.#propertyPathCache.get(treeElement);
    if (cachedPropertyPath) {
      return cachedPropertyPath;
    }
    let current = treeElement;
    let sectionRoot = current;
    if (!treeElement.treeOutline) {
      throw new Error("No tree outline available");
    }
    const rootElement = treeElement.treeOutline.rootElement();
    let result;
    while (current !== rootElement) {
      let currentName = "";
      if (current instanceof ObjectPropertyTreeElement) {
        currentName = current.property.name;
      } else {
        currentName = typeof current.title === "string" ? current.title : current.title.textContent || "";
      }
      result = currentName + (result ? "." + result : "");
      sectionRoot = current;
      if (current.parent) {
        current = current.parent;
      }
    }
    const treeOutlineId = _ObjectPropertiesSectionsTreeExpandController.#sectionMap.get(sectionRoot);
    result = treeOutlineId + (result ? ":" + result : "");
    _ObjectPropertiesSectionsTreeExpandController.#propertyPathCache.set(treeElement, result);
    return result;
  }
};
var rendererInstance;
var Renderer = class _Renderer {
  static instance(opts = { forceNew: false }) {
    const { forceNew } = opts;
    if (!rendererInstance || forceNew) {
      rendererInstance = new _Renderer();
    }
    return rendererInstance;
  }
  async render(object, options) {
    if (!(object instanceof SDK3.RemoteObject.RemoteObject)) {
      throw new Error("Can't render " + object);
    }
    const title = options?.title;
    const section = new ObjectPropertiesSection(object, title);
    if (!title) {
      section.titleLessMode();
    }
    section.editable = Boolean(options?.editable);
    if (options?.expand) {
      section.firstChild()?.expand();
    }
    return {
      element: section.element,
      forceSelect: section.forceSelect.bind(section)
    };
  }
};
var ExpandableTextPropertyValue = class {
  text;
  maxLength;
  maxDisplayableTextLength;
  #byteCount;
  #expanded = false;
  #element;
  constructor(text, maxLength) {
    this.#element = document.createDocumentFragment();
    this.text = text;
    this.maxLength = maxLength;
    this.maxDisplayableTextLength = 1e7;
    this.#byteCount = Platform3.StringUtilities.countWtf8Bytes(text);
    this.#render();
  }
  get element() {
    return this.#element;
  }
  #render() {
    const totalBytesText = i18n3.ByteUtilities.bytesToString(this.#byteCount);
    const onContextMenu = (e) => {
      const { target } = e;
      if (!(target instanceof Element)) {
        return;
      }
      const listItem = target.closest("li");
      const element = listItem && UI2.TreeOutline.TreeElement.getTreeElementBylistItemNode(listItem);
      if (!(element instanceof ObjectPropertyTreeElement)) {
        return;
      }
      const contextMenu = element.getContextMenu(e);
      if (this.text.length < this.maxDisplayableTextLength && !this.#expanded) {
        contextMenu.clipboardSection().appendItem(i18nString2(UIStrings2.showMoreS, { PH1: totalBytesText }), this.expandText.bind(this), { jslogContext: "show-more" });
      }
      contextMenu.clipboardSection().appendItem(i18nString2(UIStrings2.copy), this.copyText.bind(this), { jslogContext: "copy" });
      void contextMenu.show();
      e.consume(true);
    };
    const croppedText = this.text.slice(0, this.maxLength);
    render2(
      // clang-format off
      html2`<span title=${croppedText + "\u2026"} @contextmenu=${onContextMenu}>
               ${this.#expanded ? this.text : croppedText}
               <button
                 ?hidden=${this.#expanded}
                 @click=${this.#canExpand ? this.expandText.bind(this) : void 0}
                 jslog=${ifDefined2(this.#canExpand ? VisualLogging.action("expand").track({ click: true }) : void 0)}
                 class=${this.#canExpand ? "expandable-inline-button" : "undisplayable-text"}
                 data-text=${this.#canExpand ? i18nString2(UIStrings2.showMoreS, { PH1: totalBytesText }) : i18nString2(UIStrings2.longTextWasTruncatedS, { PH1: totalBytesText })}
                 ></button>
               <button
                 class=expandable-inline-button
                 @click=${this.copyText.bind(this)}
                 data-text=${i18nString2(UIStrings2.copy)}
                 jslog=${VisualLogging.action("copy").track({ click: true })}
                 ></button>
             </span>`,
      // clang-format on
      this.#element
    );
  }
  get #canExpand() {
    return this.text.length < this.maxDisplayableTextLength;
  }
  expandText() {
    if (!this.#expanded) {
      this.#expanded = true;
      this.#render();
    }
  }
  copyText() {
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(this.text);
  }
};

// gen/front_end/ui/legacy/components/object_ui/CustomPreviewComponent.js
var UIStrings3 = {
  /**
   * @description A context menu item in the Custom Preview Component
   */
  showAsJavascriptObject: "Show as JavaScript object"
};
var str_3 = i18n5.i18n.registerUIStrings("ui/legacy/components/object_ui/CustomPreviewComponent.ts", UIStrings3);
var i18nString3 = i18n5.i18n.getLocalizedString.bind(void 0, str_3);
var CustomPreviewSection = class _CustomPreviewSection {
  sectionElement;
  object;
  expanded;
  cachedContent;
  header;
  expandIcon;
  constructor(object) {
    this.sectionElement = document.createElement("span");
    this.sectionElement.classList.add("custom-expandable-section");
    this.object = object;
    this.expanded = false;
    this.cachedContent = null;
    const customPreview = object.customPreview();
    if (!customPreview) {
      return;
    }
    let headerJSON;
    try {
      headerJSON = JSON.parse(customPreview.header);
    } catch (e) {
      Common2.Console.Console.instance().error("Broken formatter: header is invalid json " + e);
      return;
    }
    this.header = this.renderJSONMLTag(headerJSON);
    if (this.header.nodeType === Node.TEXT_NODE) {
      Common2.Console.Console.instance().error("Broken formatter: header should be an element node.");
      return;
    }
    if (customPreview.bodyGetterId) {
      if (this.header instanceof Element) {
        this.header.classList.add("custom-expandable-section-header");
      }
      this.header.addEventListener("click", this.onClick.bind(this), false);
      this.expandIcon = IconButton.Icon.create("triangle-right", "custom-expand-icon");
      this.header.insertBefore(this.expandIcon, this.header.firstChild);
    }
    this.sectionElement.appendChild(this.header);
  }
  element() {
    return this.sectionElement;
  }
  renderJSONMLTag(jsonML) {
    if (!Array.isArray(jsonML)) {
      return document.createTextNode(String(jsonML));
    }
    return jsonML[0] === "object" ? this.layoutObjectTag(jsonML) : this.renderElement(jsonML);
  }
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  renderElement(object) {
    const tagName = object.shift();
    if (!ALLOWED_TAGS.includes(tagName)) {
      Common2.Console.Console.instance().error("Broken formatter: element " + tagName + " is not allowed!");
      return document.createElement("span");
    }
    const element = document.createElement(tagName);
    if (typeof object[0] === "object" && !Array.isArray(object[0])) {
      const attributes = object.shift();
      for (const key in attributes) {
        const value = attributes[key];
        if (key !== "style" || typeof value !== "string") {
          continue;
        }
        element.setAttribute(key, value);
      }
    }
    this.appendJsonMLTags(element, object);
    return element;
  }
  layoutObjectTag(objectTag) {
    objectTag.shift();
    const attributes = objectTag.shift();
    const remoteObject = this.object.runtimeModel().createRemoteObject(attributes);
    if (remoteObject.customPreview()) {
      return new _CustomPreviewSection(remoteObject).element();
    }
    const sectionElement = ObjectPropertiesSection.defaultObjectPresentation(remoteObject);
    sectionElement.classList.toggle("custom-expandable-section-standard-section", remoteObject.hasChildren);
    return sectionElement;
  }
  appendJsonMLTags(parentElement, jsonMLTags) {
    for (let i = 0; i < jsonMLTags.length; ++i) {
      parentElement.appendChild(this.renderJSONMLTag(jsonMLTags[i]));
    }
  }
  onClick(event) {
    event.consume(true);
    if (this.cachedContent) {
      this.toggleExpand();
    } else {
      void this.loadBody();
    }
  }
  toggleExpand() {
    this.expanded = !this.expanded;
    if (this.header instanceof Element) {
      this.header.classList.toggle("expanded", this.expanded);
    }
    if (this.cachedContent instanceof Element) {
      this.cachedContent.classList.toggle("hidden", !this.expanded);
    }
    if (this.expandIcon) {
      if (this.expanded) {
        this.expandIcon.name = "triangle-down";
      } else {
        this.expandIcon.name = "triangle-right";
      }
    }
  }
  defaultBodyTreeOutline;
  async loadBody() {
    const customPreview = this.object.customPreview();
    if (!customPreview) {
      return;
    }
    if (customPreview.bodyGetterId) {
      const bodyJsonML = await this.object.callFunctionJSON((bodyGetter) => bodyGetter(), [{ objectId: customPreview.bodyGetterId }]);
      if (bodyJsonML === null) {
        this.defaultBodyTreeOutline = new ObjectPropertiesSectionsTreeOutline({ readOnly: true });
        this.defaultBodyTreeOutline.setShowSelectionOnKeyboardFocus(
          /* show */
          true,
          /* preventTabOrder */
          false
        );
        this.defaultBodyTreeOutline.element.classList.add("custom-expandable-section-default-body");
        void ObjectPropertyTreeElement.populate(this.defaultBodyTreeOutline.rootElement(), new ObjectTree(this.object), false, false);
        this.cachedContent = this.defaultBodyTreeOutline.element;
      } else {
        this.cachedContent = this.renderJSONMLTag(bodyJsonML);
      }
      this.sectionElement.appendChild(this.cachedContent);
      this.toggleExpand();
    }
  }
};
var ALLOWED_TAGS = ["span", "div", "ol", "li", "table", "tr", "td"];
var CustomPreviewComponent = class {
  object;
  customPreviewSection;
  element;
  constructor(object) {
    this.object = object;
    this.customPreviewSection = new CustomPreviewSection(object);
    this.element = document.createElement("span");
    this.element.classList.add("source-code");
    const shadowRoot = UI3.UIUtils.createShadowRootWithCoreStyles(this.element, { cssFile: customPreviewComponent_css_default });
    this.element.addEventListener("contextmenu", this.contextMenuEventFired.bind(this), false);
    shadowRoot.appendChild(this.customPreviewSection.element());
  }
  expandIfPossible() {
    const customPreview = this.object.customPreview();
    if (customPreview && customPreview.bodyGetterId && this.customPreviewSection) {
      void this.customPreviewSection.loadBody();
    }
  }
  contextMenuEventFired(event) {
    const contextMenu = new UI3.ContextMenu.ContextMenu(event);
    if (this.customPreviewSection) {
      contextMenu.revealSection().appendItem(i18nString3(UIStrings3.showAsJavascriptObject), this.disassemble.bind(this), { jslogContext: "show-as-javascript-object" });
    }
    contextMenu.appendApplicableItems(this.object);
    void contextMenu.show();
  }
  disassemble() {
    if (this.element.shadowRoot) {
      this.element.shadowRoot.textContent = "";
      this.customPreviewSection = null;
      this.element.shadowRoot.appendChild(ObjectPropertiesSection.defaultObjectPresentation(this.object));
    }
  }
};

// gen/front_end/ui/legacy/components/object_ui/ObjectPopoverHelper.js
var ObjectPopoverHelper_exports = {};
__export(ObjectPopoverHelper_exports, {
  ObjectPopoverHelper: () => ObjectPopoverHelper
});
import * as i18n7 from "./../../../../core/i18n/i18n.js";
import * as Platform4 from "./../../../../core/platform/platform.js";
import * as SDK4 from "./../../../../core/sdk/sdk.js";
import * as Geometry from "./../../../../models/geometry/geometry.js";
import { render as render3 } from "./../../../lit/lit.js";
import * as UI4 from "./../../legacy.js";
import * as Components from "./../utils/utils.js";

// gen/front_end/ui/legacy/components/object_ui/objectPopover.css.js
var objectPopover_css_default = `/*
 * Copyright 2017 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.widget:has(.object-popover-tree) {
  padding: 0;
  border-radius: var(--sys-shape-corner-extra-small);
}

.object-popover-content {
  display: flex;
  position: relative;
  overflow: hidden;
  flex: 1 1 auto;
  flex-direction: column;
}

.object-popover-title {
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
  font-weight: bold;
  padding-left: 18px;
  padding-bottom: 2px;
  padding-top: var(--sys-size-3);
  flex-shrink: 0;
}

.object-popover-tree {
  border-top: 1px solid var(--sys-color-divider);
  overflow: auto;
  width: 100%;
  height: calc(100% - 13px);
}

.object-popover-container {
  display: inline-block;
}

.object-popover-description-box {
  padding: 6px;
  max-width: 350px;
  line-height: 1.4;
}

.object-popover-footer {
  margin-top: 8px;
}

/*# sourceURL=${import.meta.resolve("./objectPopover.css")} */`;

// gen/front_end/ui/legacy/components/object_ui/ObjectPopoverHelper.js
var UIStrings4 = {
  /**
   * @description Text that is usually a hyperlink to more documentation
   */
  learnMore: "Learn more"
};
var str_4 = i18n7.i18n.registerUIStrings("ui/legacy/components/object_ui/ObjectPopoverHelper.ts", UIStrings4);
var i18nString4 = i18n7.i18n.getLocalizedString.bind(void 0, str_4);
var ObjectPopoverHelper = class _ObjectPopoverHelper {
  linkifier;
  resultHighlightedAsDOM;
  constructor(linkifier, resultHighlightedAsDOM) {
    this.linkifier = linkifier;
    this.resultHighlightedAsDOM = resultHighlightedAsDOM;
  }
  dispose() {
    if (this.resultHighlightedAsDOM) {
      SDK4.OverlayModel.OverlayModel.hideDOMNodeHighlight();
    }
    if (this.linkifier) {
      this.linkifier.dispose();
    }
  }
  static async buildObjectPopover(result, popover) {
    const description = Platform4.StringUtilities.trimEndWithMaxLength(result.description || "", MaxPopoverTextLength);
    let popoverContentElement = null;
    if (result.type === "function" || result.type === "object") {
      let linkifier = null;
      let resultHighlightedAsDOM = false;
      if (result.subtype === "node") {
        SDK4.OverlayModel.OverlayModel.highlightObjectAsDOMNode(result);
        resultHighlightedAsDOM = true;
      }
      if (result.customPreview()) {
        const customPreviewComponent = new CustomPreviewComponent(result);
        customPreviewComponent.expandIfPossible();
        popoverContentElement = customPreviewComponent.element;
      } else {
        popoverContentElement = document.createElement("div");
        popoverContentElement.classList.add("object-popover-content");
        popover.registerRequiredCSS(objectValue_css_default, objectPopover_css_default);
        const titleElement = popoverContentElement.createChild("div", "object-popover-title");
        if (result.type === "function") {
          titleElement.classList.add("source-code");
          render3(ObjectPropertiesSection.valueElementForFunctionDescription(result.description), titleElement);
        } else {
          titleElement.classList.add("monospace");
          titleElement.createChild("span").textContent = description;
        }
        linkifier = new Components.Linkifier.Linkifier();
        const section = new ObjectPropertiesSection(
          result,
          "",
          linkifier,
          true
          /* showOverflow */
        );
        section.element.classList.add("object-popover-tree");
        section.titleLessMode();
        popoverContentElement.appendChild(section.element);
      }
      popoverContentElement.dataset.stableNameForTest = "object-popover-content";
      popover.setMaxContentSize(new Geometry.Size(300, 250));
      popover.setSizeBehavior(
        "SetExactSize"
        /* UI.GlassPane.SizeBehavior.SET_EXACT_SIZE */
      );
      popover.contentElement.appendChild(popoverContentElement);
      return new _ObjectPopoverHelper(linkifier, resultHighlightedAsDOM);
    }
    popoverContentElement = document.createElement("span");
    popoverContentElement.dataset.stableNameForTest = "object-popover-content";
    popover.registerRequiredCSS(objectValue_css_default, objectPopover_css_default);
    const valueElement = popoverContentElement.createChild("span", "monospace object-value-" + result.type);
    valueElement.style.whiteSpace = "pre";
    if (result.type === "string") {
      UI4.UIUtils.createTextChildren(valueElement, `"${description}"`);
    } else {
      valueElement.textContent = description;
    }
    popover.contentElement.appendChild(popoverContentElement);
    return new _ObjectPopoverHelper(null, false);
  }
  static buildDescriptionPopover(description, link, popover) {
    const popoverContentElement = document.createElement("div");
    popoverContentElement.classList.add("object-popover-description-box");
    const descriptionDiv = document.createElement("div");
    descriptionDiv.dataset.stableNameForTest = "object-popover-content";
    popover.registerRequiredCSS(objectPopover_css_default);
    descriptionDiv.textContent = description;
    const learnMoreLink = UI4.XLink.XLink.create(link, i18nString4(UIStrings4.learnMore), void 0, void 0, "learn-more");
    const footerDiv = document.createElement("div");
    footerDiv.classList.add("object-popover-footer");
    footerDiv.appendChild(learnMoreLink);
    popoverContentElement.appendChild(descriptionDiv);
    popoverContentElement.appendChild(footerDiv);
    popover.contentElement.appendChild(popoverContentElement);
    return new _ObjectPopoverHelper(null, false);
  }
};
var MaxPopoverTextLength = 1e4;
export {
  CustomPreviewComponent_exports as CustomPreviewComponent,
  JavaScriptREPL_exports as JavaScriptREPL,
  ObjectPopoverHelper_exports as ObjectPopoverHelper,
  ObjectPropertiesSection_exports as ObjectPropertiesSection,
  RemoteObjectPreviewFormatter_exports as RemoteObjectPreviewFormatter
};
//# sourceMappingURL=object_ui.js.map
