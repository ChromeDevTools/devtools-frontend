var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/panels/elements/components/AccessibilityTreeNode.js
var AccessibilityTreeNode_exports = {};
__export(AccessibilityTreeNode_exports, {
  AccessibilityTreeNode: () => AccessibilityTreeNode
});
import * as i18n from "./../../../core/i18n/i18n.js";
import * as Platform from "./../../../core/platform/platform.js";
import * as RenderCoordinator from "./../../../ui/components/render_coordinator/render_coordinator.js";
import * as UI from "./../../../ui/legacy/legacy.js";
import { html, nothing, render } from "./../../../ui/lit/lit.js";

// gen/front_end/panels/elements/components/accessibilityTreeNode.css.js
var accessibilityTreeNode_css_default = `/*
 * Copyright 2021 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.container {
  width: 100%;
  display: inline-block;
}

.container:hover {
  background-color: var(--sys-color-state-hover-on-subtle);
}

span {
  color: var(--sys-color-token-meta);
  font-family: var(--monospace-font-family);
  font-size: var(--monospace-font-size);
}

.role-value {
  color: var(--sys-color-token-tag);
}

.attribute-name {
  color: var(--sys-color-token-attribute);
}

.attribute-value {
  color: var(--sys-color-token-attribute-value);
}

/*# sourceURL=${import.meta.resolve("./accessibilityTreeNode.css")} */`;

// gen/front_end/panels/elements/components/AccessibilityTreeNode.js
var UIStrings = {
  /**
   * @description Ignored node element text content in Accessibility Tree View of the Elements panel
   */
  ignored: "Ignored"
};
var str_ = i18n.i18n.registerUIStrings("panels/elements/components/AccessibilityTreeNode.ts", UIStrings);
var i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
function truncateTextIfNeeded(text) {
  const maxTextContentLength = 1e4;
  if (text.length > maxTextContentLength) {
    return Platform.StringUtilities.trimMiddle(text, maxTextContentLength);
  }
  return text;
}
function isPrintable(valueType) {
  switch (valueType) {
    case "boolean":
    case "booleanOrUndefined":
    case "string":
    case "number":
      return true;
    default:
      return false;
  }
}
var AccessibilityTreeNode = class extends HTMLElement {
  #shadow = UI.UIUtils.createShadowRootWithCoreStyles(this, { cssFile: accessibilityTreeNode_css_default });
  #ignored = true;
  #name = "";
  #role = "";
  #properties = [];
  #id = "";
  set data(data) {
    this.#ignored = data.ignored;
    this.#name = data.name;
    this.#role = data.role;
    this.#properties = data.properties;
    this.#id = data.id;
    void this.#render();
  }
  async #render() {
    const role = html`<span class='role-value'>${truncateTextIfNeeded(this.#role)}</span>`;
    const name = html`"<span class='attribute-value'>${this.#name}</span>"`;
    const properties = this.#properties.map(({ name: name2, value }) => isPrintable(value.type) ? html` <span class='attribute-name'>${name2}</span>:&nbsp;<span class='attribute-value'>${value.value}</span>` : nothing);
    const content = this.#ignored ? html`<span>${i18nString(UIStrings.ignored)}</span>` : html`${role}&nbsp;${name}${properties}`;
    await RenderCoordinator.write(`Accessibility node ${this.#id} render`, () => {
      render(html`<div class='container'>${content}</div>`, this.#shadow, { host: this });
    });
  }
};
customElements.define("devtools-accessibility-tree-node", AccessibilityTreeNode);

// gen/front_end/panels/elements/components/AdornerManager.js
var AdornerManager_exports = {};
__export(AdornerManager_exports, {
  AdornerCategoryOrder: () => AdornerCategoryOrder,
  AdornerManager: () => AdornerManager,
  DefaultAdornerSettings: () => DefaultAdornerSettings,
  RegisteredAdorners: () => RegisteredAdorners,
  compareAdornerNamesByCategory: () => compareAdornerNamesByCategory,
  getRegisteredAdorner: () => getRegisteredAdorner
});
var RegisteredAdorners;
(function(RegisteredAdorners2) {
  RegisteredAdorners2["AD"] = "ad";
  RegisteredAdorners2["CONTAINER"] = "container";
  RegisteredAdorners2["FLEX"] = "flex";
  RegisteredAdorners2["GRID"] = "grid";
  RegisteredAdorners2["GRID_LANES"] = "grid-lanes";
  RegisteredAdorners2["MEDIA"] = "media";
  RegisteredAdorners2["POPOVER"] = "popover";
  RegisteredAdorners2["REVEAL"] = "reveal";
  RegisteredAdorners2["SCROLL"] = "scroll";
  RegisteredAdorners2["SCROLL_SNAP"] = "scroll-snap";
  RegisteredAdorners2["SLOT"] = "slot";
  RegisteredAdorners2["STARTING_STYLE"] = "starting-style";
  RegisteredAdorners2["SUBGRID"] = "subgrid";
  RegisteredAdorners2["TOP_LAYER"] = "top-layer";
})(RegisteredAdorners || (RegisteredAdorners = {}));
function getRegisteredAdorner(which) {
  switch (which) {
    case RegisteredAdorners.GRID:
      return {
        name: "grid",
        category: "Layout",
        enabledByDefault: true
      };
    case RegisteredAdorners.SUBGRID:
      return {
        name: "subgrid",
        category: "Layout",
        enabledByDefault: true
      };
    case RegisteredAdorners.GRID_LANES:
      return {
        name: "grid-lanes",
        category: "Layout",
        enabledByDefault: true
      };
    case RegisteredAdorners.FLEX:
      return {
        name: "flex",
        category: "Layout",
        enabledByDefault: true
      };
    case RegisteredAdorners.AD:
      return {
        name: "ad",
        category: "Security",
        enabledByDefault: true
      };
    case RegisteredAdorners.SCROLL_SNAP:
      return {
        name: "scroll-snap",
        category: "Layout",
        enabledByDefault: true
      };
    case RegisteredAdorners.STARTING_STYLE:
      return {
        name: "starting-style",
        category: "Layout",
        enabledByDefault: true
      };
    case RegisteredAdorners.CONTAINER:
      return {
        name: "container",
        category: "Layout",
        enabledByDefault: true
      };
    case RegisteredAdorners.SLOT:
      return {
        name: "slot",
        category: "Layout",
        enabledByDefault: true
      };
    case RegisteredAdorners.TOP_LAYER:
      return {
        name: "top-layer",
        category: "Layout",
        enabledByDefault: true
      };
    case RegisteredAdorners.REVEAL:
      return {
        name: "reveal",
        category: "Default",
        enabledByDefault: true
      };
    case RegisteredAdorners.MEDIA:
      return {
        name: "media",
        category: "Default",
        enabledByDefault: false
      };
    case RegisteredAdorners.SCROLL:
      return {
        name: "scroll",
        category: "Layout",
        enabledByDefault: true
      };
    case RegisteredAdorners.POPOVER: {
      return {
        name: "popover",
        category: "Layout",
        enabledByDefault: true
      };
    }
  }
}
var adornerNameToCategoryMap = void 0;
function getCategoryFromAdornerName(name) {
  if (!adornerNameToCategoryMap) {
    adornerNameToCategoryMap = /* @__PURE__ */ new Map();
    for (const { name: name2, category } of Object.values(RegisteredAdorners).map(getRegisteredAdorner)) {
      adornerNameToCategoryMap.set(name2, category);
    }
  }
  return adornerNameToCategoryMap.get(name) || "Default";
}
var DefaultAdornerSettings = Object.values(RegisteredAdorners).map(getRegisteredAdorner).map(({ name, enabledByDefault }) => ({
  adorner: name,
  isEnabled: enabledByDefault
}));
var AdornerManager = class {
  #adornerSettings = /* @__PURE__ */ new Map();
  #settingStore;
  constructor(settingStore) {
    this.#settingStore = settingStore;
    this.#syncSettings();
  }
  updateSettings(settings) {
    this.#adornerSettings = settings;
    this.#persistCurrentSettings();
  }
  getSettings() {
    return this.#adornerSettings;
  }
  isAdornerEnabled(adornerText) {
    return this.#adornerSettings.get(adornerText) || false;
  }
  #persistCurrentSettings() {
    const settingList = [];
    for (const [adorner, isEnabled] of this.#adornerSettings) {
      settingList.push({ adorner, isEnabled });
    }
    this.#settingStore.set(settingList);
  }
  #loadSettings() {
    const settingList = this.#settingStore.get();
    for (const setting of settingList) {
      this.#adornerSettings.set(setting.adorner, setting.isEnabled);
    }
  }
  #syncSettings() {
    this.#loadSettings();
    const outdatedAdorners = new Set(this.#adornerSettings.keys());
    for (const { adorner, isEnabled } of DefaultAdornerSettings) {
      outdatedAdorners.delete(adorner);
      if (!this.#adornerSettings.has(adorner)) {
        this.#adornerSettings.set(adorner, isEnabled);
      }
    }
    for (const outdatedAdorner of outdatedAdorners) {
      this.#adornerSettings.delete(outdatedAdorner);
    }
    this.#persistCurrentSettings();
  }
};
var OrderedAdornerCategories = [
  "Security",
  "Layout",
  "Default"
];
var AdornerCategoryOrder = new Map(OrderedAdornerCategories.map((category, idx) => [category, idx + 1]));
function compareAdornerNamesByCategory(nameA, nameB) {
  const orderA = AdornerCategoryOrder.get(getCategoryFromAdornerName(nameA)) || Number.POSITIVE_INFINITY;
  const orderB = AdornerCategoryOrder.get(getCategoryFromAdornerName(nameB)) || Number.POSITIVE_INFINITY;
  return orderA - orderB;
}

// gen/front_end/panels/elements/components/ComputedStyleProperty.js
var ComputedStyleProperty_exports = {};
__export(ComputedStyleProperty_exports, {
  ComputedStyleProperty: () => ComputedStyleProperty,
  NavigateToSourceEvent: () => NavigateToSourceEvent
});
import { html as html2, render as render2 } from "./../../../ui/lit/lit.js";
import * as VisualLogging from "./../../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/elements/components/computedStyleProperty.css.js
var computedStyleProperty_css_default = `/*
 * Copyright 2021 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

:host {
  position: relative;
  overflow: hidden;
  flex: auto;
  text-overflow: ellipsis;
}

.computed-style-property {
  --goto-size: 16px;

  font-family: var(--monospace-font-family);
  font-size: var(--monospace-font-size);
  min-height: 16px;
  box-sizing: border-box;
  padding-top: 2px;
  white-space: nowrap;
  user-select: text;
}

.computed-style-property:hover {
  background-color: var(--sys-color-state-hover-on-subtle);
  cursor: text;
}

.computed-style-property.inherited {
  opacity: 75%;
  font-style: italic;
}

.property-name,
.property-value {
  display: contents;
  overflow: hidden;
  text-overflow: ellipsis;
}

.property-name {
  width: 16em;
  max-width: 52%;
  margin-right: calc(var(--goto-size) / 2);
  display: inline-block;
  vertical-align: text-top;
  color: var(--webkit-css-property-color, var(--sys-color-token-property-special)); /* stylelint-disable-line plugin/use_theme_colors */ /* See: crbug.com/1152736 for color variable migration. */
}

.property-value {
  margin-left: 2em;
}

.goto {
  display: none;
  cursor: pointer;
  position: absolute;
  width: var(--goto-size);
  height: var(--goto-size);
  margin: -1px 0 0 calc(-1 * var(--goto-size));
  mask: var(--image-file-goto-filled) center / contain no-repeat;
  background-color: var(--sys-color-primary-bright);
}

.computed-style-property:hover .goto {
  display: inline-block;
}

.hidden {
  display: none;
}
/* narrowed styles */
:host-context(.computed-narrow) .computed-style-property {
  white-space: normal;

  & .goto {
    display: none;
    margin-left: 0;
  }
}

:host-context(.computed-narrow) .property-name,
:host-context(.computed-narrow) .property-value {
  display: inline-block;
  width: 100%;
  max-width: 100%;
  margin-left: 0;
  white-space: nowrap;
}

:host-context(.computed-narrow) .computed-style-property:not(.inherited):hover {
  & .property-value {
    margin-left: var(--goto-size);
  }

  & .goto {
    display: inline-block;
  }
}
/* high-contrast styles */
@media (forced-colors: active) {
  .computed-style-property.inherited {
    opacity: 100%;
  }

  .computed-style-property:hover {
    forced-color-adjust: none;
    background-color: Highlight;
  }

  .computed-style-property:hover * {
    color: HighlightText;
  }

  .goto {
    background-color: HighlightText;
  }
}

/*# sourceURL=${import.meta.resolve("./computedStyleProperty.css")} */`;

// gen/front_end/panels/elements/components/ComputedStyleProperty.js
var NavigateToSourceEvent = class _NavigateToSourceEvent extends Event {
  static eventName = "onnavigatetosource";
  constructor() {
    super(_NavigateToSourceEvent.eventName, { bubbles: true, composed: true });
  }
};
var ComputedStyleProperty = class extends HTMLElement {
  #shadow = this.attachShadow({ mode: "open" });
  #inherited = false;
  #traceable = false;
  connectedCallback() {
    this.#render();
  }
  set inherited(inherited) {
    if (inherited === this.#inherited) {
      return;
    }
    this.#inherited = inherited;
    this.#render();
  }
  set traceable(traceable) {
    if (traceable === this.#traceable) {
      return;
    }
    this.#traceable = traceable;
    this.#render();
  }
  #onNavigateToSourceClick() {
    this.dispatchEvent(new NavigateToSourceEvent());
  }
  #render() {
    render2(html2`
      <style>${computedStyleProperty_css_default}</style>
      <div class="computed-style-property ${this.#inherited ? "inherited" : ""}">
        <div class="property-name">
          <slot name="name"></slot>
        </div>
        <span class="hidden" aria-hidden="false">: </span>
        ${this.#traceable ? html2`<span class="goto" @click=${this.#onNavigateToSourceClick} jslog=${VisualLogging.action("elements.jump-to-style").track({ click: true })}></span>` : null}
        <div class="property-value">
          <slot name="value"></slot>
        </div>
        <span class="hidden" aria-hidden="false">;</span>
      </div>
    `, this.#shadow, {
      host: this
    });
  }
};
customElements.define("devtools-computed-style-property", ComputedStyleProperty);

// gen/front_end/panels/elements/components/ComputedStyleTrace.js
var ComputedStyleTrace_exports = {};
__export(ComputedStyleTrace_exports, {
  ComputedStyleTrace: () => ComputedStyleTrace
});
import * as Buttons from "./../../../ui/components/buttons/buttons.js";
import * as UI2 from "./../../../ui/legacy/legacy.js";
import { html as html3, render as render3 } from "./../../../ui/lit/lit.js";

// gen/front_end/panels/elements/components/computedStyleTrace.css.js
var computedStyleTrace_css_default = `/*
 * Copyright 2021 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

:host {
  text-overflow: ellipsis;
  overflow: hidden;
  flex-grow: 1;
}

.computed-style-trace {
  margin-left: 16px;
  font-family: var(--monospace-font-family);
  font-size: var(--monospace-font-size);
}

.computed-style-trace:hover {
  background-color: var(--sys-color-state-hover-on-subtle);
  cursor: text;
}

.goto {
  /* TODO: reuse with ComputedStyleProperty */
  --size: 16px;

  display: none;
  cursor: pointer;
  position: absolute;
  width: var(--size);
  height: var(--size);
  margin: -1px 0 0 calc(-1 * var(--size));
  mask: var(--image-file-goto-filled) center / contain no-repeat;
  background-color: var(--sys-color-primary-bright);
}

.computed-style-trace:hover .goto {
  display: inline-block;
}

.devtools-link {
  color: var(--sys-color-on-surface);
  text-decoration-color: var(--sys-color-token-subtle);
  text-decoration-line: underline;
  cursor: pointer;
}

.trace-value {
  margin-left: 16px;
}

.computed-style-trace.inactive slot[name="trace-value"] {
  text-decoration: line-through;
}

.trace-selector {
  --override-trace-selector-color: var(--sys-color-neutral-bright);

  color: var(--override-trace-selector-color);
  padding-left: 2em;
}

.trace-link {
  user-select: none;
  float: right;
  padding-left: 1em;
  position: relative;
  z-index: 1;
}
/* high-contrast styles */
@media (forced-colors: active) {
  .computed-style-trace:hover {
    forced-color-adjust: none;
    background-color: Highlight;
  }

  .goto {
    background-color: Highlight;
  }

  .computed-style-trace:hover * {
    color: HighlightText;
  }

  .computed-style-trace:hover .trace-selector {
    --override-trace-selector-color: HighlightText;
  }
}

/*# sourceURL=${import.meta.resolve("./computedStyleTrace.css")} */`;

// gen/front_end/panels/elements/components/ComputedStyleTrace.js
var ComputedStyleTrace = class extends HTMLElement {
  #shadow = this.attachShadow({ mode: "open" });
  #selector = "";
  #active = false;
  #onNavigateToSource = () => {
  };
  #ruleOriginNode;
  set data(data) {
    this.#selector = data.selector;
    this.#active = data.active;
    this.#onNavigateToSource = data.onNavigateToSource;
    this.#ruleOriginNode = data.ruleOriginNode;
    this.#render();
  }
  #render() {
    render3(html3`
      <style>${Buttons.textButtonStyles}</style>
      <style>${UI2.inspectorCommonStyles}</style>
      <style>${computedStyleTrace_css_default}</style>
      <div class="computed-style-trace ${this.#active ? "active" : "inactive"}">
        <span class="goto" @click=${this.#onNavigateToSource}></span>
        <slot name="trace-value" @click=${this.#onNavigateToSource}></slot>
        <span class="trace-selector">${this.#selector}</span>
        <span class="trace-link">${this.#ruleOriginNode}</span>
      </div>
    `, this.#shadow, {
      host: this
    });
  }
};
customElements.define("devtools-computed-style-trace", ComputedStyleTrace);

// gen/front_end/panels/elements/components/CSSHintDetailsView.js
var CSSHintDetailsView_exports = {};
__export(CSSHintDetailsView_exports, {
  CSSHintDetailsView: () => CSSHintDetailsView
});
import "./../../../ui/legacy/legacy.js";
import * as i18n3 from "./../../../core/i18n/i18n.js";
import { Directives, html as html4, render as render4 } from "./../../../ui/lit/lit.js";

// gen/front_end/panels/elements/components/cssHintDetailsView.css.js
var cssHintDetailsView_css_default = `/*
 * Copyright 2022 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.hint-popup-wrapper {
  max-width: 232px;
}

code {
  font-weight: bold;
  font-family: inherit;
}

.hint-popup-possible-fix {
  margin-top: 8px;
}

.clickable {
  color: var(--sys-color-primary);
}

.underlined {
  text-decoration: underline;
}

.unbreakable-text {
  white-space: nowrap;
}

.footer {
  margin-top: var(--sys-size-5);
}

/*# sourceURL=${import.meta.resolve("./cssHintDetailsView.css")} */`;

// gen/front_end/panels/elements/components/CSSHintDetailsView.js
var UIStrings2 = {
  /**
   * @description Text for button that redirects to CSS property documentation.
   */
  learnMore: "Learn More"
};
var str_2 = i18n3.i18n.registerUIStrings("panels/elements/components/CSSHintDetailsView.ts", UIStrings2);
var i18nString2 = i18n3.i18n.getLocalizedString.bind(void 0, str_2);
var CSSHintDetailsView = class extends HTMLElement {
  #shadow = this.attachShadow({ mode: "open" });
  #authoringHint;
  constructor(authoringHint) {
    super();
    this.#authoringHint = authoringHint;
    this.#render();
  }
  #render() {
    const link = this.#authoringHint.getLearnMoreLink();
    render4(html4`
        <style>${cssHintDetailsView_css_default}</style>
        <div class="hint-popup-wrapper">
          <div class="hint-popup-reason">
            ${Directives.unsafeHTML(this.#authoringHint.getMessage())}
          </div>
          ${this.#authoringHint.getPossibleFixMessage() ? html4`
              <div class="hint-popup-possible-fix">
                  ${Directives.unsafeHTML(this.#authoringHint.getPossibleFixMessage())}
              </div>
          ` : ""}
          ${link ? html4`
                      <div class="footer">
                        <x-link id="learn-more" href=${link} class="clickable underlined unbreakable-text">
                            ${i18nString2(UIStrings2.learnMore)}
                        </x-link>
                      </div>
                  ` : ""}
        </div>
      `, this.#shadow, {
      host: this
    });
  }
};
customElements.define("devtools-css-hint-details-view", CSSHintDetailsView);

// gen/front_end/panels/elements/components/CSSPropertyDocsView.js
var CSSPropertyDocsView_exports = {};
__export(CSSPropertyDocsView_exports, {
  CSSPropertyDocsView: () => CSSPropertyDocsView
});
import "./../../../ui/legacy/legacy.js";
import * as Common from "./../../../core/common/common.js";
import * as i18n5 from "./../../../core/i18n/i18n.js";
import { html as html5, nothing as nothing2, render as render5 } from "./../../../ui/lit/lit.js";
import * as VisualLogging2 from "./../../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/elements/components/cssPropertyDocsView.css.js
var cssPropertyDocsView_css_default = `/*
 * Copyright 2023 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.docs-popup-wrapper {
  max-width: 420px;
  font-size: 12px;
  line-height: 1.4;
}

.docs-popup-section {
  margin-top: 8px;
}

.clickable {
  color: var(--sys-color-primary);
}

.underlined {
  text-decoration: underline;
}

.unbreakable-text {
  white-space: nowrap;
}

.footer {
  display: flex;
  justify-content: space-between;
}

#baseline {
  display: inline-flex;
  align-items: flex-start;
  gap: 4px;
}

#baseline-icon {
  width: 18px;
  height: 18px;
}

/*# sourceURL=${import.meta.resolve("./cssPropertyDocsView.css")} */`;

// gen/front_end/panels/elements/components/CSSPropertyDocsView.js
var UIStrings3 = {
  /**
   * @description Text for button that redirects to CSS property documentation.
   */
  learnMore: "Learn more",
  /**
   * @description Text for a checkbox to turn off the CSS property documentation.
   */
  dontShow: "Don't show",
  /**
   * @description Text indicating that the CSS property has limited availability across major browsers.
   */
  limitedAvailability: "Limited availability across major browsers",
  /**
   * @description Text indicating that the CSS property has limited availability across major browsers, with a list of unsupported browsers.
   * @example {Firefox} PH1
   * @example {Safari on iOS} PH1
   * @example {Chrome, Firefox on Android, or Safari} PH1
   */
  limitedAvailabilityInBrowsers: "Limited availability across major browsers (not fully implemented in {PH1})",
  /**
   * @description Text to display a combination of browser name and platform name.
   * @example {Safari} PH1
   * @example {iOS} PH2
   */
  browserOnPlatform: "{PH1} on {PH2}",
  /**
   * @description Text indicating that the CSS property is newly available across major browsers since a certain time.
   * @example {September 2015} PH1
   */
  newlyAvailableSince: "Newly available across major browsers (`Baseline` since {PH1})",
  /**
   * @description Text indicating that the CSS property is widely available across major browsers since a certain time.
   * @example {September 2015} PH1
   * @example {an unknown date} PH1
   */
  widelyAvailableSince: "Widely available across major browsers (`Baseline` since {PH1})",
  /**
   * @description Text indicating that a specific date is not known.
   */
  unknownDate: "an unknown date"
};
var str_3 = i18n5.i18n.registerUIStrings("panels/elements/components/CSSPropertyDocsView.ts", UIStrings3);
var i18nString3 = i18n5.i18n.getLocalizedString.bind(void 0, str_3);
var BASELINE_HIGH_AVAILABILITY_ICON = "../../../Images/baseline-high-availability.svg";
var BASELINE_LOW_AVAILABILITY_ICON = "../../../Images/baseline-low-availability.svg";
var BASELINE_LIMITED_AVAILABILITY_ICON = "../../../Images/baseline-limited-availability.svg";
var getBaselineIconPath = (baseline) => {
  let relativePath;
  switch (baseline.status) {
    case "high":
      relativePath = BASELINE_HIGH_AVAILABILITY_ICON;
      break;
    case "low":
      relativePath = BASELINE_LOW_AVAILABILITY_ICON;
      break;
    default:
      relativePath = BASELINE_LIMITED_AVAILABILITY_ICON;
  }
  return new URL(relativePath, import.meta.url).toString();
};
var allBrowserIds = /* @__PURE__ */ new Set([
  "C",
  "CA",
  "E",
  "FF",
  "FFA",
  "S",
  "SM"
  /* BrowserId.SM */
]);
var browserIdToNameAndPlatform = /* @__PURE__ */ new Map([
  ["C", {
    name: "Chrome",
    platform: "desktop"
    /* BrowserPlatform.DESKTOP */
  }],
  ["CA", {
    name: "Chrome",
    platform: "Android"
    /* BrowserPlatform.ANDROID */
  }],
  ["E", {
    name: "Edge",
    platform: "desktop"
    /* BrowserPlatform.DESKTOP */
  }],
  ["FF", {
    name: "Firefox",
    platform: "desktop"
    /* BrowserPlatform.DESKTOP */
  }],
  ["FFA", {
    name: "Firefox",
    platform: "Android"
    /* BrowserPlatform.ANDROID */
  }],
  ["S", {
    name: "Safari",
    platform: "macOS"
    /* BrowserPlatform.MACOS */
  }],
  ["SM", {
    name: "Safari",
    platform: "iOS"
    /* BrowserPlatform.IOS */
  }]
]);
function formatBrowserList(browserNames) {
  const formatter = new Intl.ListFormat(i18n5.DevToolsLocale.DevToolsLocale.instance().locale, {
    style: "long",
    type: "disjunction"
  });
  return formatter.format(browserNames.entries().map(([name, platforms]) => platforms.length !== 1 || platforms[0] === "desktop" ? name : i18nString3(UIStrings3.browserOnPlatform, { PH1: name, PH2: platforms[0] })));
}
var formatBaselineDate = (date) => {
  if (!date) {
    return i18nString3(UIStrings3.unknownDate);
  }
  const parsedDate = new Date(date);
  const formatter = new Intl.DateTimeFormat(i18n5.DevToolsLocale.DevToolsLocale.instance().locale, {
    month: "long",
    year: "numeric"
  });
  return formatter.format(parsedDate);
};
var getBaselineMissingBrowsers = (browsers) => {
  const browserIds = browsers.map((v) => v.replace(/\d*$/, ""));
  const missingBrowserIds = allBrowserIds.difference(new Set(browserIds));
  const missingBrowsers = /* @__PURE__ */ new Map();
  for (const id of missingBrowserIds) {
    const browserInfo = browserIdToNameAndPlatform.get(id);
    if (browserInfo) {
      const { name, platform } = browserInfo;
      missingBrowsers.set(name, [...missingBrowsers.get(name) ?? [], platform]);
    }
  }
  return missingBrowsers;
};
var getBaselineText = (baseline, browsers) => {
  if (baseline.status === "false") {
    const missingBrowsers = browsers && getBaselineMissingBrowsers(browsers);
    if (missingBrowsers) {
      return i18nString3(UIStrings3.limitedAvailabilityInBrowsers, { PH1: formatBrowserList(missingBrowsers) });
    }
    return i18nString3(UIStrings3.limitedAvailability);
  }
  if (baseline.status === "low") {
    return i18nString3(UIStrings3.newlyAvailableSince, { PH1: formatBaselineDate(baseline.baseline_low_date) });
  }
  return i18nString3(UIStrings3.widelyAvailableSince, { PH1: formatBaselineDate(baseline.baseline_high_date) });
};
var CSSPropertyDocsView = class extends HTMLElement {
  #shadow = this.attachShadow({ mode: "open" });
  #cssProperty;
  constructor(cssProperty) {
    super();
    this.#cssProperty = cssProperty;
    this.#render();
  }
  #dontShowChanged(e) {
    const showDocumentation = !e.target.checked;
    Common.Settings.Settings.instance().moduleSetting("show-css-property-documentation-on-hover").set(showDocumentation);
  }
  #render() {
    const { description, references, baseline, browsers } = this.#cssProperty;
    const link = references?.[0].url;
    render5(html5`
      <style>${cssPropertyDocsView_css_default}</style>
      <div class="docs-popup-wrapper">
        ${description ? html5`
          <div id="description">
            ${description}
          </div>
        ` : nothing2}
        ${baseline ? html5`
          <div id="baseline" class="docs-popup-section">
            <img
              id="baseline-icon"
              src=${getBaselineIconPath(baseline)}
              role="presentation"
            >
            <span>
              ${getBaselineText(baseline, browsers)}
            </span>
          </div>
        ` : nothing2}
        ${link ? html5`
          <div class="docs-popup-section footer">
            <x-link
              id="learn-more"
              href=${link}
              class="clickable underlined unbreakable-text"
            >
              ${i18nString3(UIStrings3.learnMore)}
            </x-link>
            <devtools-checkbox
              @change=${this.#dontShowChanged}
              jslog=${VisualLogging2.toggle("css-property-doc").track({ change: true })}>
              ${i18nString3(UIStrings3.dontShow)}
            </devtools-checkbox>
          </div>
        ` : nothing2}
      </div>
    `, this.#shadow, {
      host: this
    });
  }
};
customElements.define("devtools-css-property-docs-view", CSSPropertyDocsView);

// gen/front_end/panels/elements/components/CSSPropertyIconResolver.js
var CSSPropertyIconResolver_exports = {};
__export(CSSPropertyIconResolver_exports, {
  findFlexContainerIcon: () => findFlexContainerIcon,
  findFlexItemIcon: () => findFlexItemIcon,
  findGridContainerIcon: () => findGridContainerIcon,
  findGridItemIcon: () => findGridItemIcon,
  findIcon: () => findIcon,
  getPhysicalDirections: () => getPhysicalDirections,
  reverseDirection: () => reverseDirection,
  rotateAlignContentIcon: () => rotateAlignContentIcon,
  rotateAlignItemsIcon: () => rotateAlignItemsIcon,
  rotateFlexDirectionIcon: () => rotateFlexDirectionIcon,
  rotateFlexWrapIcon: () => rotateFlexWrapIcon,
  rotateJustifyContentIcon: () => rotateJustifyContentIcon,
  rotateJustifyItemsIcon: () => rotateJustifyItemsIcon
});
var writingModesAffectingFlexDirection = /* @__PURE__ */ new Set([
  "tb",
  "tb-rl",
  "vertical-lr",
  "vertical-rl"
]);
function reverseDirection(direction) {
  if (direction === "left-to-right") {
    return "right-to-left";
  }
  if (direction === "right-to-left") {
    return "left-to-right";
  }
  if (direction === "top-to-bottom") {
    return "bottom-to-top";
  }
  if (direction === "bottom-to-top") {
    return "top-to-bottom";
  }
  throw new Error("Unknown PhysicalFlexDirection");
}
function extendWithReverseDirections(directions) {
  return {
    ...directions,
    "row-reverse": reverseDirection(directions.row),
    "column-reverse": reverseDirection(directions.column)
  };
}
function getPhysicalDirections(computedStyles) {
  const isRtl = computedStyles.get("direction") === "rtl";
  const writingMode = computedStyles.get("writing-mode");
  const isVertical = writingMode && writingModesAffectingFlexDirection.has(writingMode);
  if (isVertical) {
    return extendWithReverseDirections({
      row: isRtl ? "bottom-to-top" : "top-to-bottom",
      column: writingMode === "vertical-lr" ? "left-to-right" : "right-to-left"
    });
  }
  return extendWithReverseDirections({
    row: isRtl ? "right-to-left" : "left-to-right",
    column: "top-to-bottom"
  });
}
function rotateFlexDirectionIcon(direction) {
  let flipX = true;
  let flipY = false;
  let rotate = -90;
  if (direction === "right-to-left") {
    rotate = 90;
    flipY = false;
    flipX = false;
  } else if (direction === "top-to-bottom") {
    rotate = 0;
    flipX = false;
    flipY = false;
  } else if (direction === "bottom-to-top") {
    rotate = 0;
    flipX = false;
    flipY = true;
  }
  return {
    iconName: "flex-direction",
    rotate,
    scaleX: flipX ? -1 : 1,
    scaleY: flipY ? -1 : 1
  };
}
function rotateAlignContentIcon(iconName, direction) {
  return {
    iconName,
    rotate: direction === "right-to-left" ? 90 : direction === "left-to-right" ? -90 : 0,
    scaleX: 1,
    scaleY: 1
  };
}
function rotateJustifyContentIcon(iconName, direction) {
  return {
    iconName,
    rotate: direction === "top-to-bottom" ? 90 : direction === "bottom-to-top" ? -90 : 0,
    scaleX: direction === "right-to-left" ? -1 : 1,
    scaleY: 1
  };
}
function rotateJustifyItemsIcon(iconName, direction) {
  return {
    iconName,
    rotate: direction === "top-to-bottom" ? 90 : direction === "bottom-to-top" ? -90 : 0,
    scaleX: direction === "right-to-left" ? -1 : 1,
    scaleY: 1
  };
}
function rotateAlignItemsIcon(iconName, direction) {
  return {
    iconName,
    rotate: direction === "right-to-left" ? 90 : direction === "left-to-right" ? -90 : 0,
    scaleX: 1,
    scaleY: 1
  };
}
function flexDirectionIcon(value) {
  function getIcon(computedStyles) {
    const directions = getPhysicalDirections(computedStyles);
    return rotateFlexDirectionIcon(directions[value]);
  }
  return getIcon;
}
function flexAlignContentIcon(iconName) {
  function getIcon(computedStyles) {
    const directions = getPhysicalDirections(computedStyles);
    const flexDirectionToPhysicalDirection = /* @__PURE__ */ new Map([
      ["column", directions.row],
      ["row", directions.column],
      ["column-reverse", directions.row],
      ["row-reverse", directions.column]
    ]);
    const computedFlexDirection = computedStyles.get("flex-direction") || "row";
    const iconDirection = flexDirectionToPhysicalDirection.get(computedFlexDirection);
    if (!iconDirection) {
      throw new Error("Unknown direction for flex-align icon");
    }
    return rotateAlignContentIcon(iconName, iconDirection);
  }
  return getIcon;
}
function gridAlignContentIcon(iconName) {
  function getIcon(computedStyles) {
    const directions = getPhysicalDirections(computedStyles);
    return rotateAlignContentIcon(iconName, directions.column);
  }
  return getIcon;
}
function flexJustifyContentIcon(iconName) {
  function getIcon(computedStyles) {
    const directions = getPhysicalDirections(computedStyles);
    return rotateJustifyContentIcon(iconName, directions[computedStyles.get("flex-direction") || "row"]);
  }
  return getIcon;
}
function gridJustifyContentIcon(iconName) {
  function getIcon(computedStyles) {
    const directions = getPhysicalDirections(computedStyles);
    return rotateJustifyContentIcon(iconName, directions.row);
  }
  return getIcon;
}
function gridJustifyItemsIcon(iconName) {
  function getIcon(computedStyles) {
    const directions = getPhysicalDirections(computedStyles);
    return rotateJustifyItemsIcon(iconName, directions.row);
  }
  return getIcon;
}
function flexAlignItemsIcon(iconName) {
  function getIcon(computedStyles) {
    const directions = getPhysicalDirections(computedStyles);
    const flexDirectionToPhysicalDirection = /* @__PURE__ */ new Map([
      ["column", directions.row],
      ["row", directions.column],
      ["column-reverse", directions.row],
      ["row-reverse", directions.column]
    ]);
    const computedFlexDirection = computedStyles.get("flex-direction") || "row";
    const iconDirection = flexDirectionToPhysicalDirection.get(computedFlexDirection);
    if (!iconDirection) {
      throw new Error("Unknown direction for flex-align icon");
    }
    return rotateAlignItemsIcon(iconName, iconDirection);
  }
  return getIcon;
}
function gridAlignItemsIcon(iconName) {
  function getIcon(computedStyles) {
    const directions = getPhysicalDirections(computedStyles);
    return rotateAlignItemsIcon(iconName, directions.column);
  }
  return getIcon;
}
function baselineIcon() {
  return {
    iconName: "align-items-baseline",
    rotate: 0,
    scaleX: 1,
    scaleY: 1
  };
}
function flexAlignSelfIcon(iconName) {
  function getIcon(parentComputedStyles) {
    return flexAlignItemsIcon(iconName)(parentComputedStyles);
  }
  return getIcon;
}
function gridAlignSelfIcon(iconName) {
  function getIcon(parentComputedStyles) {
    return gridAlignItemsIcon(iconName)(parentComputedStyles);
  }
  return getIcon;
}
function rotateFlexWrapIcon(iconName, direction) {
  return {
    iconName,
    rotate: direction === "bottom-to-top" || direction === "top-to-bottom" ? 90 : 0,
    scaleX: 1,
    scaleY: 1
  };
}
function flexWrapIcon(iconName) {
  function getIcon(computedStyles) {
    const directions = getPhysicalDirections(computedStyles);
    const computedFlexDirection = computedStyles.get("flex-direction") || "row";
    return rotateFlexWrapIcon(iconName, directions[computedFlexDirection]);
  }
  return getIcon;
}
var flexContainerIcons = /* @__PURE__ */ new Map([
  ["flex-direction: row", flexDirectionIcon("row")],
  ["flex-direction: column", flexDirectionIcon("column")],
  ["flex-direction: column-reverse", flexDirectionIcon("column-reverse")],
  ["flex-direction: row-reverse", flexDirectionIcon("row-reverse")],
  ["flex-direction: initial", flexDirectionIcon("row")],
  ["flex-direction: unset", flexDirectionIcon("row")],
  ["flex-direction: revert", flexDirectionIcon("row")],
  ["align-content: center", flexAlignContentIcon("align-content-center")],
  ["align-content: space-around", flexAlignContentIcon("align-content-space-around")],
  ["align-content: space-between", flexAlignContentIcon("align-content-space-between")],
  ["align-content: stretch", flexAlignContentIcon("align-content-stretch")],
  ["align-content: space-evenly", flexAlignContentIcon("align-content-space-evenly")],
  ["align-content: flex-end", flexAlignContentIcon("align-content-end")],
  ["align-content: flex-start", flexAlignContentIcon("align-content-start")],
  ["align-content: start", flexAlignContentIcon("align-content-start")],
  ["align-content: end", flexAlignContentIcon("align-content-end")],
  ["align-content: normal", flexAlignContentIcon("align-content-stretch")],
  ["align-content: revert", flexAlignContentIcon("align-content-stretch")],
  ["align-content: unset", flexAlignContentIcon("align-content-stretch")],
  ["align-content: initial", flexAlignContentIcon("align-content-stretch")],
  ["justify-content: center", flexJustifyContentIcon("justify-content-center")],
  ["justify-content: space-around", flexJustifyContentIcon("justify-content-space-around")],
  ["justify-content: space-between", flexJustifyContentIcon("justify-content-space-between")],
  ["justify-content: space-evenly", flexJustifyContentIcon("justify-content-space-evenly")],
  ["justify-content: flex-end", flexJustifyContentIcon("justify-content-end")],
  ["justify-content: flex-start", flexJustifyContentIcon("justify-content-start")],
  ["justify-content: end", flexJustifyContentIcon("justify-content-end")],
  ["justify-content: start", flexJustifyContentIcon("justify-content-start")],
  ["justify-content: right", flexJustifyContentIcon("justify-content-end")],
  ["justify-content: left", flexJustifyContentIcon("justify-content-start")],
  ["align-items: stretch", flexAlignItemsIcon("align-items-stretch")],
  ["align-items: flex-end", flexAlignItemsIcon("align-items-end")],
  ["align-items: flex-start", flexAlignItemsIcon("align-items-start")],
  ["align-items: end", flexAlignItemsIcon("align-items-end")],
  ["align-items: start", flexAlignItemsIcon("align-items-start")],
  ["align-items: self-end", flexAlignItemsIcon("align-items-end")],
  ["align-items: self-start", flexAlignItemsIcon("align-items-start")],
  ["align-items: center", flexAlignItemsIcon("align-items-center")],
  ["align-items: baseline", baselineIcon],
  ["align-content: baseline", baselineIcon],
  ["flex-wrap: wrap", flexWrapIcon("flex-wrap")],
  ["flex-wrap: nowrap", flexWrapIcon("flex-no-wrap")]
]);
var flexItemIcons = /* @__PURE__ */ new Map([
  ["align-self: baseline", baselineIcon],
  ["align-self: center", flexAlignSelfIcon("align-self-center")],
  ["align-self: flex-start", flexAlignSelfIcon("align-self-start")],
  ["align-self: flex-end", flexAlignSelfIcon("align-self-end")],
  ["align-self: start", gridAlignSelfIcon("align-self-start")],
  ["align-self: end", gridAlignSelfIcon("align-self-end")],
  ["align-self: self-start", gridAlignSelfIcon("align-self-start")],
  ["align-self: self-end", gridAlignSelfIcon("align-self-end")],
  ["align-self: stretch", flexAlignSelfIcon("align-self-stretch")]
]);
var gridContainerIcons = /* @__PURE__ */ new Map([
  ["align-content: center", gridAlignContentIcon("align-content-center")],
  ["align-content: space-around", gridAlignContentIcon("align-content-space-around")],
  ["align-content: space-between", gridAlignContentIcon("align-content-space-between")],
  ["align-content: stretch", gridAlignContentIcon("align-content-stretch")],
  ["align-content: space-evenly", gridAlignContentIcon("align-content-space-evenly")],
  ["align-content: end", gridAlignContentIcon("align-content-end")],
  ["align-content: start", gridAlignContentIcon("align-content-start")],
  ["align-content: baseline", baselineIcon],
  ["justify-content: center", gridJustifyContentIcon("justify-content-center")],
  ["justify-content: space-around", gridJustifyContentIcon("justify-content-space-around")],
  ["justify-content: space-between", gridJustifyContentIcon("justify-content-space-between")],
  ["justify-content: space-evenly", gridJustifyContentIcon("justify-content-space-evenly")],
  ["justify-content: end", gridJustifyContentIcon("justify-content-end")],
  ["justify-content: start", gridJustifyContentIcon("justify-content-start")],
  ["justify-content: right", gridJustifyContentIcon("justify-content-end")],
  ["justify-content: left", gridJustifyContentIcon("justify-content-start")],
  ["justify-content: stretch", gridJustifyContentIcon("justify-content-stretch")],
  ["align-items: stretch", gridAlignItemsIcon("align-items-stretch")],
  ["align-items: end", gridAlignItemsIcon("align-items-end")],
  ["align-items: start", gridAlignItemsIcon("align-items-start")],
  ["align-items: self-end", gridAlignItemsIcon("align-items-end")],
  ["align-items: self-start", gridAlignItemsIcon("align-items-start")],
  ["align-items: center", gridAlignItemsIcon("align-items-center")],
  ["align-items: baseline", baselineIcon],
  ["justify-items: center", gridJustifyItemsIcon("justify-items-center")],
  ["justify-items: stretch", gridJustifyItemsIcon("justify-items-stretch")],
  ["justify-items: end", gridJustifyItemsIcon("justify-items-end")],
  ["justify-items: start", gridJustifyItemsIcon("justify-items-start")],
  ["justify-items: self-end", gridJustifyItemsIcon("justify-items-end")],
  ["justify-items: self-start", gridJustifyItemsIcon("justify-items-start")],
  ["justify-items: right", gridJustifyItemsIcon("justify-items-end")],
  ["justify-items: left", gridJustifyItemsIcon("justify-items-start")],
  ["justify-items: baseline", baselineIcon]
]);
var gridItemIcons = /* @__PURE__ */ new Map([
  ["align-self: baseline", baselineIcon],
  ["align-self: center", gridAlignSelfIcon("align-self-center")],
  ["align-self: start", gridAlignSelfIcon("align-self-start")],
  ["align-self: end", gridAlignSelfIcon("align-self-end")],
  ["align-self: self-start", gridAlignSelfIcon("align-self-start")],
  ["align-self: self-end", gridAlignSelfIcon("align-self-end")],
  ["align-self: stretch", gridAlignSelfIcon("align-self-stretch")]
]);
var isFlexContainer = (computedStyles) => {
  const display = computedStyles?.get("display");
  return display === "flex" || display === "inline-flex";
};
var isGridContainer = (computedStyles) => {
  const display = computedStyles?.get("display");
  return display === "grid" || display === "inline-grid";
};
function findIcon(text, computedStyles, parentComputedStyles) {
  if (isFlexContainer(computedStyles)) {
    const icon = findFlexContainerIcon(text, computedStyles);
    if (icon) {
      return icon;
    }
  }
  if (isFlexContainer(parentComputedStyles)) {
    const icon = findFlexItemIcon(text, parentComputedStyles);
    if (icon) {
      return icon;
    }
  }
  if (isGridContainer(computedStyles)) {
    const icon = findGridContainerIcon(text, computedStyles);
    if (icon) {
      return icon;
    }
  }
  if (isGridContainer(parentComputedStyles)) {
    const icon = findGridItemIcon(text, parentComputedStyles);
    if (icon) {
      return icon;
    }
  }
  return null;
}
function findFlexContainerIcon(text, computedStyles) {
  const resolver = flexContainerIcons.get(text);
  if (resolver) {
    return resolver(computedStyles || /* @__PURE__ */ new Map());
  }
  return null;
}
function findFlexItemIcon(text, parentComputedStyles) {
  const resolver = flexItemIcons.get(text);
  if (resolver) {
    return resolver(parentComputedStyles || /* @__PURE__ */ new Map());
  }
  return null;
}
function findGridContainerIcon(text, computedStyles) {
  const resolver = gridContainerIcons.get(text);
  if (resolver) {
    return resolver(computedStyles || /* @__PURE__ */ new Map());
  }
  return null;
}
function findGridItemIcon(text, parentComputedStyles) {
  const resolver = gridItemIcons.get(text);
  if (resolver) {
    return resolver(parentComputedStyles || /* @__PURE__ */ new Map());
  }
  return null;
}

// gen/front_end/panels/elements/components/CSSQuery.js
var CSSQuery_exports = {};
__export(CSSQuery_exports, {
  CSSQuery: () => CSSQuery
});
import * as UI3 from "./../../../ui/legacy/legacy.js";
import * as Lit from "./../../../ui/lit/lit.js";
import * as VisualLogging3 from "./../../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/elements/components/cssQuery.css.js
var cssQuery_css_default = `/*
 * Copyright 2021 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.query:not(.editing-query) {
  overflow: hidden;
}

.editable .query-text {
  color: var(--sys-color-on-surface);
}

.editable .query-text:hover {
  text-decoration: var(--override-styles-section-text-hover-text-decoration);
  cursor: var(--override-styles-section-text-hover-cursor);
}

/*# sourceURL=${import.meta.resolve("./cssQuery.css")} */`;

// gen/front_end/panels/elements/components/CSSQuery.js
var { render: render6, html: html6 } = Lit;
var CSSQuery = class extends HTMLElement {
  #shadow = this.attachShadow({ mode: "open" });
  #queryPrefix = "";
  #queryName;
  #queryText = "";
  #onQueryTextClick;
  #jslogContext;
  set data(data) {
    this.#queryPrefix = data.queryPrefix;
    this.#queryName = data.queryName;
    this.#queryText = data.queryText;
    this.#onQueryTextClick = data.onQueryTextClick;
    this.#jslogContext = data.jslogContext;
    this.#render();
  }
  #render() {
    const queryClasses = Lit.Directives.classMap({
      query: true,
      editable: Boolean(this.#onQueryTextClick)
    });
    const queryText = html6`
      <span class="query-text" @click=${this.#onQueryTextClick}>${this.#queryText}</span>
    `;
    render6(html6`
        <style>${cssQuery_css_default}</style>
        <style>${UI3.inspectorCommonStyles}</style>
        <div class=${queryClasses} jslog=${VisualLogging3.cssRuleHeader(this.#jslogContext).track({ click: true, change: true })}>
          <slot name="indent"></slot>
          ${this.#queryPrefix ? html6`<span>${this.#queryPrefix + " "}</span>` : Lit.nothing}
          ${this.#queryName ? html6`<span>${this.#queryName + " "}</span>` : Lit.nothing}
          ${queryText} {
        </div>`, this.#shadow, { host: this });
  }
};
customElements.define("devtools-css-query", CSSQuery);

// gen/front_end/panels/elements/components/CSSVariableValueView.js
var CSSVariableValueView_exports = {};
__export(CSSVariableValueView_exports, {
  CSSVariableParserError: () => CSSVariableParserError,
  CSSVariableValueView: () => CSSVariableValueView
});
import * as i18n7 from "./../../../core/i18n/i18n.js";
import * as Lit2 from "./../../../ui/lit/lit.js";

// gen/front_end/panels/elements/components/cssVariableValueView.css.js
var cssVariableValueView_css_default = `/*
 * Copyright 2023 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.registered-property-popup-wrapper {
  max-width: 232px;
  font-size: 12px;
  line-height: 1.4;
  word-break: break-all;
}

.monospace {
  font-family: var(--monospace-font-family);
  font-size: var(--monospace-font-size);
}

.divider {
  margin: 8px -7px;
  border: 1px solid var(--sys-color-divider);
}

.registered-property-links {
  margin-top: 8px;
}

.clickable {
  color: var(--sys-color-primary);
  cursor: pointer;
}

.underlined {
  text-decoration: underline;
}

.unbreakable-text {
  white-space: nowrap;
}

.css-property {
  color: var(--webkit-css-property-color, var(--sys-color-token-property-special)); /* stylelint-disable-line plugin/use_theme_colors */ /* See: crbug.com/1152736 for color variable migration. */
}

.title {
  color: var(--sys-color-state-disabled);
}

/*# sourceURL=${import.meta.resolve("./cssVariableValueView.css")} */`;

// gen/front_end/panels/elements/components/CSSVariableValueView.js
var UIStrings4 = {
  /**
   * @description Text for a link from custom property to its defining registration
   */
  registeredPropertyLinkTitle: "View registered property",
  /**
   * @description Error message for a property value that failed to parse because it had an incorrect type. The message
   * is shown in a popover when hovering the property value. The `type` placeholder will be rendered as an HTML element
   * to apply some styling (color and monospace font)
   * @example {<color>} type
   */
  invalidPropertyValue: "Invalid property value, expected type {type}",
  /**
   * @description Text displayed in a tooltip shown when hovering over a var() CSS function in the Styles pane when the custom property in this function does not exist. The parameter is the name of the property.
   * @example {--my-custom-property-name} PH1
   */
  sIsNotDefined: "{PH1} is not defined"
};
var str_4 = i18n7.i18n.registerUIStrings("panels/elements/components/CSSVariableValueView.ts", UIStrings4);
var i18nString4 = i18n7.i18n.getLocalizedString.bind(void 0, str_4);
var i18nTemplate2 = Lit2.i18nTemplate.bind(void 0, str_4);
var { render: render7, html: html7 } = Lit2;
function getLinkSection(details) {
  return html7`<div class="registered-property-links">
            <span role="button" @click=${details?.goToDefinition} class="clickable underlined unbreakable-text">
              ${i18nString4(UIStrings4.registeredPropertyLinkTitle)}
            </span>
          </div>`;
}
var CSSVariableParserError = class extends HTMLElement {
  #shadow = this.attachShadow({ mode: "open" });
  constructor(details) {
    super();
    this.#render(details);
  }
  #render(details) {
    const type = html7`<span class="monospace css-property">${details.registration.syntax()}</span>`;
    render7(html7`
      <style>${cssVariableValueView_css_default}</style>
      <div class="variable-value-popup-wrapper">
        ${i18nTemplate2(UIStrings4.invalidPropertyValue, { type })}
        ${getLinkSection(details)}
      </div>`, this.#shadow, {
      host: this
    });
  }
};
var CSSVariableValueView = class extends HTMLElement {
  #shadow = this.attachShadow({ mode: "open" });
  variableName;
  #value;
  details;
  constructor({ variableName, value, details }) {
    super();
    this.variableName = variableName;
    this.details = details;
    this.value = value;
  }
  get value() {
    return this.#value;
  }
  set value(value) {
    this.#value = value;
    this.#render();
  }
  #render() {
    const initialValue = this.details?.registration.initialValue();
    const registrationView = this.details ? html7`
        <hr class=divider />
        <div class=registered-property-popup-wrapper>
          <div class="monospace">
            <div><span class="css-property">syntax:</span> ${this.details.registration.syntax()}</div>
            <div><span class="css-property">inherits:</span> ${this.details.registration.inherits()}</div>
            ${initialValue ? html7`<div><span class="css-property">initial-value:</span> ${initialValue}</div>` : ""}
          </div>
          ${getLinkSection(this.details)}
        </div>` : "";
    const valueText = this.value ?? i18nString4(UIStrings4.sIsNotDefined, { PH1: this.variableName });
    render7(html7`<style>${cssVariableValueView_css_default}</style>
             <div class="variable-value-popup-wrapper">
               ${valueText}
             </div>
             ${registrationView}
             `, this.#shadow, {
      host: this
    });
  }
};
customElements.define("devtools-css-variable-value-view", CSSVariableValueView);
customElements.define("devtools-css-variable-parser-error", CSSVariableParserError);

// gen/front_end/panels/elements/components/ElementsBreadcrumbs.js
var ElementsBreadcrumbs_exports = {};
__export(ElementsBreadcrumbs_exports, {
  ElementsBreadcrumbs: () => ElementsBreadcrumbs,
  NodeSelectedEvent: () => NodeSelectedEvent
});
import "./../../../ui/components/icon_button/icon_button.js";
import "./../../../ui/components/node_text/node_text.js";
import * as i18n11 from "./../../../core/i18n/i18n.js";
import * as ComponentHelpers from "./../../../ui/components/helpers/helpers.js";
import * as RenderCoordinator2 from "./../../../ui/components/render_coordinator/render_coordinator.js";
import * as Lit3 from "./../../../ui/lit/lit.js";
import * as VisualLogging4 from "./../../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/elements/components/elementsBreadcrumbs.css.js
var elementsBreadcrumbs_css_default = `/*
 * Copyright 2021 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

:host {
  --override-node-text-label-color: var(--sys-color-token-tag);
  --override-node-text-class-color: var(--sys-color-token-attribute);
  --override-node-text-id-color: var(--sys-color-token-attribute);
  --override-node-text-multiple-descriptors-id: var(--sys-color-on-surface);
  --override-node-text-multiple-descriptors-class: var(--sys-color-token-property);
}

.crumbs {
  display: inline-flex;
  align-items: stretch;
  width: 100%;
  overflow: hidden;
  pointer-events: auto;
  cursor: default;
  white-space: nowrap;
  position: relative;
  background: var(--sys-color-cdt-base-container);
  font-size: inherit;
  font-family: inherit;
}

.crumbs-window {
  flex-grow: 2;
  overflow: hidden;
}

.crumbs-scroll-container {
  display: inline-flex;
  margin: 0;
  padding: 0;
}

.crumb {
  display: block;
  padding: 0 7px;
  line-height: 23px;
  white-space: nowrap;
}

.overflow {
  padding: 0 5px;
  font-weight: bold;
  display: block;
  border: none;
  flex-grow: 0;
  flex-shrink: 0;
  text-align: center;
  background-color: var(--sys-color-cdt-base-container);
  color: var(--sys-color-token-subtle);
  margin: 1px;
  outline: 1px solid var(--sys-color-neutral-outline);
}

.overflow.hidden {
  display: none;
}

.overflow:disabled {
  opacity: 50%;
}

.overflow:focus {
  outline-color: var(--sys-color-primary);
}

.overflow:not(:disabled):hover {
  background-color: var(--sys-color-state-hover-on-subtle);
  color: var(--sys-color-on-surface);
}

.crumb-link {
  text-decoration: none;
  color: inherit;
}

.crumb:hover {
  background: var(--sys-color-state-hover-on-subtle);
}

.crumb.selected {
  background: var(--sys-color-tonal-container);
}

.crumb:focus {
  outline: var(--sys-color-primary) auto 1px;
}

/*# sourceURL=${import.meta.resolve("./elementsBreadcrumbs.css")} */`;

// gen/front_end/panels/elements/components/ElementsBreadcrumbsUtils.js
var ElementsBreadcrumbsUtils_exports = {};
__export(ElementsBreadcrumbsUtils_exports, {
  crumbsToRender: () => crumbsToRender,
  determineElementTitle: () => determineElementTitle
});
import * as i18n9 from "./../../../core/i18n/i18n.js";
var UIStrings5 = {
  /**
   * @description Text in Elements Breadcrumbs of the Elements panel. Indicates that a HTML element
   * is a text node, meaning it contains text only and no other HTML elements. Should be translatd.
   */
  text: "(text)"
};
var str_5 = i18n9.i18n.registerUIStrings("panels/elements/components/ElementsBreadcrumbsUtils.ts", UIStrings5);
var i18nString5 = i18n9.i18n.getLocalizedString.bind(void 0, str_5);
var crumbsToRender = (crumbs, selectedNode) => {
  if (!selectedNode) {
    return [];
  }
  return crumbs.filter((crumb) => {
    return crumb.nodeType !== Node.DOCUMENT_NODE;
  }).map((crumb) => {
    return {
      title: determineElementTitle(crumb),
      selected: crumb.id === selectedNode.id,
      node: crumb,
      originalNode: crumb.legacyDomNode
    };
  }).reverse();
};
var makeCrumbTitle = (main, extras = {}) => {
  return {
    main,
    extras
  };
};
var determineElementTitle = (domNode) => {
  switch (domNode.nodeType) {
    case Node.ELEMENT_NODE: {
      if (domNode.pseudoType) {
        return makeCrumbTitle("::" + domNode.pseudoType);
      }
      const crumbTitle = makeCrumbTitle(domNode.nodeNameNicelyCased);
      const id = domNode.getAttribute("id");
      if (id) {
        crumbTitle.extras.id = id;
      }
      const classAttribute = domNode.getAttribute("class");
      if (classAttribute) {
        const classes = new Set(classAttribute.split(/\s+/));
        crumbTitle.extras.classes = Array.from(classes);
      }
      return crumbTitle;
    }
    case Node.TEXT_NODE:
      return makeCrumbTitle(i18nString5(UIStrings5.text));
    case Node.COMMENT_NODE:
      return makeCrumbTitle("<!-->");
    case Node.DOCUMENT_TYPE_NODE:
      return makeCrumbTitle("<!doctype>");
    case Node.DOCUMENT_FRAGMENT_NODE:
      return makeCrumbTitle(domNode.shadowRootType ? "#shadow-root" : domNode.nodeNameNicelyCased);
    default:
      return makeCrumbTitle(domNode.nodeNameNicelyCased);
  }
};

// gen/front_end/panels/elements/components/ElementsBreadcrumbs.js
var { html: html8 } = Lit3;
var UIStrings6 = {
  /**
   * @description Accessible name for DOM tree breadcrumb navigation.
   */
  breadcrumbs: "DOM tree breadcrumbs",
  /**
   * @description A label/tooltip for a button that scrolls the breadcrumbs bar to the left to show more entries.
   */
  scrollLeft: "Scroll left",
  /**
   * @description A label/tooltip for a button that scrolls the breadcrumbs bar to the right to show more entries.
   */
  scrollRight: "Scroll right"
};
var str_6 = i18n11.i18n.registerUIStrings("panels/elements/components/ElementsBreadcrumbs.ts", UIStrings6);
var i18nString6 = i18n11.i18n.getLocalizedString.bind(void 0, str_6);
var NodeSelectedEvent = class _NodeSelectedEvent extends Event {
  static eventName = "breadcrumbsnodeselected";
  legacyDomNode;
  constructor(node) {
    super(_NodeSelectedEvent.eventName, {});
    this.legacyDomNode = node.legacyDomNode;
  }
};
var ElementsBreadcrumbs = class extends HTMLElement {
  #shadow = this.attachShadow({ mode: "open" });
  #resizeObserver = new ResizeObserver(() => this.#checkForOverflowOnResize());
  #crumbsData = [];
  #selectedDOMNode = null;
  #overflowing = false;
  #userScrollPosition = "start";
  #isObservingResize = false;
  #userHasManuallyScrolled = false;
  set data(data) {
    this.#selectedDOMNode = data.selectedNode;
    this.#crumbsData = data.crumbs;
    this.#userHasManuallyScrolled = false;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
  }
  disconnectedCallback() {
    this.#isObservingResize = false;
    this.#resizeObserver.disconnect();
  }
  #onCrumbClick(node) {
    return (event) => {
      event.preventDefault();
      this.dispatchEvent(new NodeSelectedEvent(node));
    };
  }
  /*
   * When the window is resized, we need to check if we either:
   * 1) overflowing, and now the window is big enough that we don't need to
   * 2) not overflowing, and now the window is small and we do need to
   *
   * If either of these are true, we toggle the overflowing state accordingly and trigger a re-render.
   */
  async #checkForOverflowOnResize() {
    const crumbScrollContainer = this.#shadow.querySelector(".crumbs-scroll-container");
    const crumbWindow = this.#shadow.querySelector(".crumbs-window");
    if (!crumbScrollContainer || !crumbWindow) {
      return;
    }
    const crumbWindowWidth = await RenderCoordinator2.read(() => {
      return crumbWindow.clientWidth;
    });
    const scrollContainerWidth = await RenderCoordinator2.read(() => {
      return crumbScrollContainer.clientWidth;
    });
    if (this.#overflowing) {
      if (scrollContainerWidth < crumbWindowWidth) {
        this.#overflowing = false;
      }
    } else if (scrollContainerWidth > crumbWindowWidth) {
      this.#overflowing = true;
    }
    void this.#ensureSelectedNodeIsVisible();
    void this.#updateScrollState(crumbWindow);
  }
  #onCrumbMouseMove(node) {
    return () => node.highlightNode();
  }
  #onCrumbMouseLeave(node) {
    return () => node.clearHighlight();
  }
  #onCrumbFocus(node) {
    return () => node.highlightNode();
  }
  #onCrumbBlur(node) {
    return () => node.clearHighlight();
  }
  #engageResizeObserver() {
    if (!this.#resizeObserver || this.#isObservingResize === true) {
      return;
    }
    const crumbs = this.#shadow.querySelector(".crumbs");
    if (!crumbs) {
      return;
    }
    this.#resizeObserver.observe(crumbs);
    this.#isObservingResize = true;
  }
  /**
   * This method runs after render or resize and checks if the crumbs are too large
   * for their container and therefore we need to render the overflow buttons at
   * either end which the user can use to scroll back and forward through the crumbs.
   * If it finds that we are overflowing, it sets the instance variable and
   * triggers a re-render. If we are not overflowing, this method returns and
   * does nothing.
   */
  async #checkForOverflow() {
    const crumbScrollContainer = this.#shadow.querySelector(".crumbs-scroll-container");
    const crumbWindow = this.#shadow.querySelector(".crumbs-window");
    if (!crumbScrollContainer || !crumbWindow) {
      return;
    }
    const crumbWindowWidth = await RenderCoordinator2.read(() => {
      return crumbWindow.clientWidth;
    });
    const scrollContainerWidth = await RenderCoordinator2.read(() => {
      return crumbScrollContainer.clientWidth;
    });
    if (this.#overflowing) {
      if (scrollContainerWidth < crumbWindowWidth) {
        this.#overflowing = false;
        void this.#render();
      }
    } else if (scrollContainerWidth > crumbWindowWidth) {
      this.#overflowing = true;
      void this.#render();
    }
  }
  #onCrumbsWindowScroll(event) {
    if (!event.target) {
      return;
    }
    const scrollWindow = event.target;
    this.#updateScrollState(scrollWindow);
  }
  #updateScrollState(scrollWindow) {
    const maxScrollLeft = scrollWindow.scrollWidth - scrollWindow.clientWidth;
    const currentScroll = scrollWindow.scrollLeft;
    const scrollBeginningAndEndPadding = 10;
    if (currentScroll < scrollBeginningAndEndPadding) {
      this.#userScrollPosition = "start";
    } else if (currentScroll >= maxScrollLeft - scrollBeginningAndEndPadding) {
      this.#userScrollPosition = "end";
    } else {
      this.#userScrollPosition = "middle";
    }
    void this.#render();
  }
  #onOverflowClick(direction) {
    return () => {
      this.#userHasManuallyScrolled = true;
      const scrollWindow = this.#shadow.querySelector(".crumbs-window");
      if (!scrollWindow) {
        return;
      }
      const amountToScrollOnClick = scrollWindow.clientWidth / 2;
      const newScrollAmount = direction === "left" ? Math.max(Math.floor(scrollWindow.scrollLeft - amountToScrollOnClick), 0) : scrollWindow.scrollLeft + amountToScrollOnClick;
      scrollWindow.scrollTo({
        behavior: "smooth",
        left: newScrollAmount
      });
    };
  }
  #renderOverflowButton(direction, disabled) {
    const buttonStyles = Lit3.Directives.classMap({
      overflow: true,
      [direction]: true,
      hidden: !this.#overflowing
    });
    const tooltipString = direction === "left" ? i18nString6(UIStrings6.scrollLeft) : i18nString6(UIStrings6.scrollRight);
    return html8`
      <button
        class=${buttonStyles}
        @click=${this.#onOverflowClick(direction)}
        ?disabled=${disabled}
        aria-label=${tooltipString}
        title=${tooltipString}>
        <devtools-icon name=${"triangle-" + direction} style="width: var(--sys-size-6); height: 10px;">
        </devtools-icon>
      </button>
      `;
  }
  #render() {
    const crumbs = crumbsToRender(this.#crumbsData, this.#selectedDOMNode);
    Lit3.render(html8`
      <style>${elementsBreadcrumbs_css_default}</style>
      <nav class="crumbs" aria-label=${i18nString6(UIStrings6.breadcrumbs)} jslog=${VisualLogging4.elementsBreadcrumbs()}>
        ${this.#renderOverflowButton("left", this.#userScrollPosition === "start")}

        <div class="crumbs-window" @scroll=${this.#onCrumbsWindowScroll}>
          <ul class="crumbs-scroll-container">
            ${crumbs.map((crumb) => {
      const crumbClasses = {
        crumb: true,
        selected: crumb.selected
      };
      return html8`
                <li class=${Lit3.Directives.classMap(crumbClasses)}
                  data-node-id=${crumb.node.id}
                  data-crumb="true"
                >
                  <a href="#" draggable=false class="crumb-link"
                    jslog=${VisualLogging4.item().track({ click: true })}
                    @click=${this.#onCrumbClick(crumb.node)}
                    @mousemove=${this.#onCrumbMouseMove(crumb.node)}
                    @mouseleave=${this.#onCrumbMouseLeave(crumb.node)}
                    @focus=${this.#onCrumbFocus(crumb.node)}
                    @blur=${this.#onCrumbBlur(crumb.node)}
                  >
                    <devtools-node-text data-node-title=${crumb.title.main} .data=${{
        nodeTitle: crumb.title.main,
        nodeId: crumb.title.extras.id,
        nodeClasses: crumb.title.extras.classes
      }}>
                    </devtools-node-text>
                  </a>
                </li>`;
    })}
          </ul>
        </div>
        ${this.#renderOverflowButton("right", this.#userScrollPosition === "end")}
      </nav>
    `, this.#shadow, { host: this });
    void this.#checkForOverflow();
    this.#engageResizeObserver();
    void this.#ensureSelectedNodeIsVisible();
  }
  async #ensureSelectedNodeIsVisible() {
    if (!this.#selectedDOMNode || !this.#shadow || !this.#overflowing || this.#userHasManuallyScrolled) {
      return;
    }
    const activeCrumbId = this.#selectedDOMNode.id;
    const activeCrumb = this.#shadow.querySelector(`.crumb[data-node-id="${activeCrumbId}"]`);
    if (activeCrumb) {
      await RenderCoordinator2.scroll(() => {
        activeCrumb.scrollIntoView({
          // We only want to scroll smoothly when the user is clicking the
          // buttons manually. If we are automatically scrolling, we could be
          // scrolling a long distance, so just jump there right away. This
          // most commonly occurs when the user first opens DevTools on a
          // deeply nested element, and the slow scrolling of the breadcrumbs
          // is just a distraction and not useful.
          behavior: "auto"
        });
      });
    }
  }
};
customElements.define("devtools-elements-breadcrumbs", ElementsBreadcrumbs);

// gen/front_end/panels/elements/components/ElementsTreeExpandButton.js
var ElementsTreeExpandButton_exports = {};
__export(ElementsTreeExpandButton_exports, {
  ElementsTreeExpandButton: () => ElementsTreeExpandButton
});
import "./../../../ui/components/icon_button/icon_button.js";
import * as i18n13 from "./../../../core/i18n/i18n.js";
import { html as html9, render as render9 } from "./../../../ui/lit/lit.js";
import * as VisualLogging5 from "./../../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/elements/components/elementsTreeExpandButton.css.js
var elementsTreeExpandButton_css_default = `/*
 * Copyright 2022 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

:host {
  display: inline-flex;
  vertical-align: middle;
}

:host(.hidden) {
  display: none;
}

.expand-button {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  box-sizing: border-box;
  width: 14px;
  height: 10px;
  margin: 0 2px;
  border: 1px solid var(--override-adorner-border-color, var(--sys-color-tonal-outline));
  border-radius: 10px;
  background: var(--override-adorner-background-color, var(--sys-color-cdt-base-container));
  padding: 0;
  position: relative;

  &:hover::after,
  &:active::before {
    content: "";
    height: 100%;
    width: 100%;
    border-radius: inherit;
    position: absolute;
    top: 0;
    left: 0;
  }

  &:hover::after {
    background-color: var(--sys-color-state-hover-on-subtle);
  }

  &:active::before {
    background-color: var(--sys-color-state-ripple-neutral-on-subtle);
  }
}

.expand-button devtools-icon {
  width: 14px;
  height: 14px;
  color: var(--sys-color-primary);
}

/*# sourceURL=${import.meta.resolve("./elementsTreeExpandButton.css")} */`;

// gen/front_end/panels/elements/components/ElementsTreeExpandButton.js
var UIStrings7 = {
  /**
   * @description Aria label for a button expanding collapsed subtree
   */
  expand: "Expand"
};
var str_7 = i18n13.i18n.registerUIStrings("panels/elements/components/ElementsTreeExpandButton.ts", UIStrings7);
var i18nString7 = i18n13.i18n.getLocalizedString.bind(void 0, str_7);
var ElementsTreeExpandButton = class extends HTMLElement {
  #shadow = this.attachShadow({ mode: "open" });
  #clickHandler = () => {
  };
  set data(data) {
    this.#clickHandler = data.clickHandler;
    this.#update();
  }
  #update() {
    this.#render();
  }
  #render() {
    render9(html9`
      <style>${elementsTreeExpandButton_css_default}</style>
      <button
        class="expand-button"
        tabindex="-1"
        aria-label=${i18nString7(UIStrings7.expand)}
        jslog=${VisualLogging5.action("expand").track({ click: true })}
        @click=${this.#clickHandler}><devtools-icon name="dots-horizontal"></devtools-icon></button>`, this.#shadow, { host: this });
  }
};
customElements.define("devtools-elements-tree-expand-button", ElementsTreeExpandButton);

// gen/front_end/panels/elements/components/Helper.js
var Helper_exports = {};
__export(Helper_exports, {
  legacyNodeToElementsComponentsNode: () => legacyNodeToElementsComponentsNode
});
import * as SDK from "./../../../core/sdk/sdk.js";
var legacyNodeToElementsComponentsNode = (node) => {
  return {
    parentNode: node.parentNode ? legacyNodeToElementsComponentsNode(node.parentNode) : null,
    id: node.id,
    nodeType: node.nodeType(),
    pseudoType: node.pseudoType(),
    shadowRootType: node.shadowRootType(),
    nodeName: node.nodeName(),
    nodeNameNicelyCased: node.nodeNameInCorrectCase(),
    legacyDomNode: node,
    highlightNode: (mode) => node.highlight(mode),
    clearHighlight: () => SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight(),
    getAttribute: node.getAttribute.bind(node)
  };
};

// gen/front_end/panels/elements/components/QueryContainer.js
var QueryContainer_exports = {};
__export(QueryContainer_exports, {
  QueriedSizeRequestedEvent: () => QueriedSizeRequestedEvent,
  QueryContainer: () => QueryContainer
});
import "./../../../ui/components/icon_button/icon_button.js";
import "./../../../ui/components/node_text/node_text.js";
import * as SDK2 from "./../../../core/sdk/sdk.js";
import * as Lit4 from "./../../../ui/lit/lit.js";
import * as VisualLogging6 from "./../../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/elements/components/queryContainer.css.js
var queryContainer_css_default = `/*
 * Copyright 2021 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.container-link {
  display: inline-block;
  color: var(--sys-color-state-disabled);
}

.container-link:hover {
  color: var(--sys-color-primary);
}

.queried-size-details {
  color: var(--sys-color-on-surface);
}

.axis-icon {
  margin-left: 0.4em;
  width: 16px;
  height: 12px;
  vertical-align: text-top;
}

.axis-icon.hidden {
  display: none;
}

.axis-icon.vertical {
  transform: rotate(90deg);
}

/*# sourceURL=${import.meta.resolve("./queryContainer.css")} */`;

// gen/front_end/panels/elements/components/QueryContainer.js
var { render: render10, html: html10 } = Lit4;
var { PhysicalAxis, QueryAxis } = SDK2.CSSContainerQuery;
var QueriedSizeRequestedEvent = class _QueriedSizeRequestedEvent extends Event {
  static eventName = "queriedsizerequested";
  constructor() {
    super(_QueriedSizeRequestedEvent.eventName, {});
  }
};
var QueryContainer = class extends HTMLElement {
  #shadow = this.attachShadow({ mode: "open" });
  #queryName;
  #container;
  #onContainerLinkClick;
  #isContainerLinkHovered = false;
  #queriedSizeDetails;
  set data(data) {
    this.#queryName = data.queryName;
    this.#container = data.container;
    this.#onContainerLinkClick = data.onContainerLinkClick;
    this.#render();
  }
  updateContainerQueriedSizeDetails(details) {
    this.#queriedSizeDetails = details;
    this.#render();
  }
  async #onContainerLinkMouseEnter() {
    this.#container?.highlightNode("container-outline");
    this.#isContainerLinkHovered = true;
    this.dispatchEvent(new QueriedSizeRequestedEvent());
  }
  #onContainerLinkMouseLeave() {
    this.#container?.clearHighlight();
    this.#isContainerLinkHovered = false;
    this.#render();
  }
  #render() {
    if (!this.#container) {
      return;
    }
    let idToDisplay, classesToDisplay;
    if (!this.#queryName) {
      idToDisplay = this.#container.getAttribute("id");
      classesToDisplay = this.#container.getAttribute("class")?.split(/\s+/).filter(Boolean);
    }
    const nodeTitle = this.#queryName || this.#container.nodeNameNicelyCased;
    render10(html10`
      <style>${queryContainer_css_default}</style>
      →
      <a href="#" draggable=false class="container-link"
         jslog=${VisualLogging6.cssRuleHeader("container-query").track({ click: true })}
         @click=${this.#onContainerLinkClick}
         @mouseenter=${this.#onContainerLinkMouseEnter}
         @mouseleave=${this.#onContainerLinkMouseLeave}>
        <devtools-node-text data-node-title=${nodeTitle} .data=${{
      nodeTitle,
      nodeId: idToDisplay,
      nodeClasses: classesToDisplay
    }}>
        </devtools-node-text>
      </a>
      ${this.#isContainerLinkHovered ? this.#renderQueriedSizeDetails() : Lit4.nothing}
    `, this.#shadow, {
      host: this
    });
  }
  #renderQueriedSizeDetails() {
    if (!this.#queriedSizeDetails || this.#queriedSizeDetails.queryAxis === "") {
      return Lit4.nothing;
    }
    const areBothAxesQueried = this.#queriedSizeDetails.queryAxis === "size";
    const axisIconClasses = Lit4.Directives.classMap({
      "axis-icon": true,
      hidden: areBothAxesQueried,
      vertical: this.#queriedSizeDetails.physicalAxis === "Vertical"
    });
    return html10`
      <span class="queried-size-details">
        (${this.#queriedSizeDetails.queryAxis}
        <devtools-icon
          class=${axisIconClasses} name="width"></devtools-icon>
        ) ${areBothAxesQueried && this.#queriedSizeDetails.width ? " width: " : Lit4.nothing}
        ${this.#queriedSizeDetails.width || Lit4.nothing}
        ${areBothAxesQueried && this.#queriedSizeDetails.height ? " height: " : Lit4.nothing}
        ${this.#queriedSizeDetails.height || Lit4.nothing}
      </span>
    `;
  }
};
customElements.define("devtools-query-container", QueryContainer);

// gen/front_end/panels/elements/components/StylePropertyEditor.js
var StylePropertyEditor_exports = {};
__export(StylePropertyEditor_exports, {
  FlexboxEditableProperties: () => FlexboxEditableProperties,
  FlexboxEditor: () => FlexboxEditor,
  GridEditableProperties: () => GridEditableProperties,
  GridEditor: () => GridEditor,
  GridLanesEditableProperties: () => GridLanesEditableProperties,
  GridLanesEditor: () => GridLanesEditor,
  PropertyDeselectedEvent: () => PropertyDeselectedEvent,
  PropertySelectedEvent: () => PropertySelectedEvent,
  StylePropertyEditor: () => StylePropertyEditor
});
import "./../../../ui/components/icon_button/icon_button.js";
import * as i18n15 from "./../../../core/i18n/i18n.js";
import * as Lit5 from "./../../../ui/lit/lit.js";
import * as VisualLogging7 from "./../../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/elements/components/stylePropertyEditor.css.js
var stylePropertyEditor_css_default = `/*
 * Copyright 2021 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.container {
  min-width: 170px;
}

.row {
  padding: 0;
  color: var(--sys-color-on-surface);
  padding-bottom: 16px;
}

.row:last-child {
  padding-bottom: 0;
}

.property {
  padding-bottom: 4px;
  white-space: nowrap;
}

.property-name {
  color: var(--sys-color-token-property-special);
}

.property-value {
  color: var(--sys-color-on-surface);
}

.property-value.not-authored {
  color: var(--sys-color-state-disabled);
}

.buttons {
  display: flex;
  flex-direction: row;
}

.buttons > :first-child {
  border-radius: 3px 0 0 3px;
}

.buttons > :last-child {
  border-radius: 0 3px 3px 0;
}

.button {
  border: 1px solid var(--sys-color-neutral-outline);
  background-color: var(--sys-color-cdt-base-container);
  width: 24px;
  height: 24px;
  min-width: 24px;
  min-height: 24px;
  padding: 0;
  margin: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
}

.button:focus-visible {
  outline: auto 5px -webkit-focus-ring-color;
}

.button devtools-icon {
  color: var(--icon-default);
}

.button:hover devtools-icon {
  color: var(--icon-default-hover);
}

.button.selected devtools-icon {
  color: var(--icon-toggled);
}

/*# sourceURL=${import.meta.resolve("./stylePropertyEditor.css")} */`;

// gen/front_end/panels/elements/components/StylePropertyEditor.js
var UIStrings8 = {
  /**
   * @description Title of the button that selects a flex property.
   * @example {flex-direction} propertyName
   * @example {column} propertyValue
   */
  selectButton: "Add {propertyName}: {propertyValue}",
  /**
   * @description Title of the button that deselects a flex property.
   * @example {flex-direction} propertyName
   * @example {row} propertyValue
   */
  deselectButton: "Remove {propertyName}: {propertyValue}"
};
var str_8 = i18n15.i18n.registerUIStrings("panels/elements/components/StylePropertyEditor.ts", UIStrings8);
var i18nString8 = i18n15.i18n.getLocalizedString.bind(void 0, str_8);
var { render: render11, html: html11, Directives: Directives5 } = Lit5;
var PropertySelectedEvent = class _PropertySelectedEvent extends Event {
  static eventName = "propertyselected";
  data;
  constructor(name, value) {
    super(_PropertySelectedEvent.eventName, {});
    this.data = { name, value };
  }
};
var PropertyDeselectedEvent = class _PropertyDeselectedEvent extends Event {
  static eventName = "propertydeselected";
  data;
  constructor(name, value) {
    super(_PropertyDeselectedEvent.eventName, {});
    this.data = { name, value };
  }
};
var StylePropertyEditor = class extends HTMLElement {
  #shadow = this.attachShadow({ mode: "open" });
  #authoredProperties = /* @__PURE__ */ new Map();
  #computedProperties = /* @__PURE__ */ new Map();
  editableProperties = [];
  getEditableProperties() {
    return this.editableProperties;
  }
  set data(data) {
    this.#authoredProperties = data.authoredProperties;
    this.#computedProperties = data.computedProperties;
    this.#render();
  }
  #render() {
    render11(html11`
      <style>${stylePropertyEditor_css_default}</style>
      <div class="container">
        ${this.editableProperties.map((prop) => this.#renderProperty(prop))}
      </div>
    `, this.#shadow, {
      host: this
    });
  }
  #renderProperty(prop) {
    const authoredValue = this.#authoredProperties.get(prop.propertyName);
    const notAuthored = !authoredValue;
    const shownValue = authoredValue || this.#computedProperties.get(prop.propertyName);
    const classes = Directives5.classMap({
      "property-value": true,
      "not-authored": notAuthored
    });
    return html11`<div class="row">
      <div class="property">
        <span class="property-name">${prop.propertyName}</span>: <span class=${classes}>${shownValue}</span>
      </div>
      <div class="buttons">
        ${prop.propertyValues.map((value) => this.#renderButton(value, prop.propertyName, value === authoredValue))}
      </div>
    </div>`;
  }
  #renderButton(propertyValue, propertyName, selected = false) {
    const query = `${propertyName}: ${propertyValue}`;
    const iconInfo = this.findIcon(query, this.#computedProperties);
    if (!iconInfo) {
      throw new Error(`Icon for ${query} is not found`);
    }
    const transform = `transform: rotate(${iconInfo.rotate}deg) scale(${iconInfo.scaleX}, ${iconInfo.scaleY})`;
    const classes = Directives5.classMap({
      button: true,
      selected
    });
    const values = { propertyName, propertyValue };
    const title = selected ? i18nString8(UIStrings8.deselectButton, values) : i18nString8(UIStrings8.selectButton, values);
    return html11`
      <button title=${title}
              class=${classes}
              jslog=${VisualLogging7.item().track({ click: true }).context(`${propertyName}-${propertyValue}`)}
              @click=${() => this.#onButtonClick(propertyName, propertyValue, selected)}>
        <devtools-icon style=${transform} name=${iconInfo.iconName}>
        </devtools-icon>
      </button>
    `;
  }
  #onButtonClick(propertyName, propertyValue, selected) {
    if (selected) {
      this.dispatchEvent(new PropertyDeselectedEvent(propertyName, propertyValue));
    } else {
      this.dispatchEvent(new PropertySelectedEvent(propertyName, propertyValue));
    }
  }
  findIcon(_query, _computedProperties) {
    throw new Error("Not implemented");
  }
};
var FlexboxEditor = class extends StylePropertyEditor {
  jslogContext = "cssFlexboxEditor";
  editableProperties = FlexboxEditableProperties;
  findIcon(query, computedProperties) {
    return findFlexContainerIcon(query, computedProperties);
  }
};
customElements.define("devtools-flexbox-editor", FlexboxEditor);
var GridEditor = class extends StylePropertyEditor {
  jslogContext = "cssGridEditor";
  editableProperties = GridEditableProperties;
  findIcon(query, computedProperties) {
    return findGridContainerIcon(query, computedProperties);
  }
};
customElements.define("devtools-grid-editor", GridEditor);
var GridLanesEditor = class extends StylePropertyEditor {
  jslogContext = "cssGridLanesEditor";
  editableProperties = GridLanesEditableProperties;
  findIcon(query, computedProperties) {
    return findGridContainerIcon(query, computedProperties);
  }
};
customElements.define("devtools-grid-lanes-editor", GridLanesEditor);
var FlexboxEditableProperties = [
  {
    propertyName: "flex-direction",
    propertyValues: [
      "row",
      "column",
      "row-reverse",
      "column-reverse"
    ]
  },
  {
    propertyName: "flex-wrap",
    propertyValues: [
      "nowrap",
      "wrap"
    ]
  },
  {
    propertyName: "align-content",
    propertyValues: [
      "center",
      "flex-start",
      "flex-end",
      "space-around",
      "space-between",
      "stretch"
    ]
  },
  {
    propertyName: "justify-content",
    propertyValues: [
      "center",
      "flex-start",
      "flex-end",
      "space-between",
      "space-around",
      "space-evenly"
    ]
  },
  {
    propertyName: "align-items",
    propertyValues: [
      "center",
      "flex-start",
      "flex-end",
      "stretch",
      "baseline"
    ]
  }
];
var GridEditableProperties = [
  {
    propertyName: "align-content",
    propertyValues: [
      "center",
      "start",
      "end",
      "space-between",
      "space-around",
      "space-evenly",
      "stretch"
    ]
  },
  {
    propertyName: "justify-content",
    propertyValues: [
      "center",
      "start",
      "end",
      "space-between",
      "space-around",
      "space-evenly",
      "stretch"
    ]
  },
  {
    propertyName: "align-items",
    propertyValues: [
      "center",
      "start",
      "end",
      "stretch",
      "baseline"
    ]
  },
  {
    propertyName: "justify-items",
    propertyValues: [
      "center",
      "start",
      "end",
      "stretch"
    ]
  }
];
var GridLanesEditableProperties = [
  {
    propertyName: "align-content",
    propertyValues: [
      "center",
      "start",
      "end",
      "space-between",
      "space-around",
      "space-evenly",
      "stretch"
    ]
  },
  {
    propertyName: "justify-content",
    propertyValues: [
      "center",
      "start",
      "end",
      "space-between",
      "space-around",
      "space-evenly",
      "stretch"
    ]
  },
  {
    propertyName: "align-items",
    propertyValues: [
      "center",
      "start",
      "end",
      "stretch"
    ]
  },
  {
    propertyName: "justify-items",
    propertyValues: [
      "center",
      "start",
      "end",
      "stretch"
    ]
  }
];
export {
  AccessibilityTreeNode_exports as AccessibilityTreeNode,
  AdornerManager_exports as AdornerManager,
  CSSHintDetailsView_exports as CSSHintDetailsView,
  CSSPropertyDocsView_exports as CSSPropertyDocsView,
  CSSPropertyIconResolver_exports as CSSPropertyIconResolver,
  CSSQuery_exports as CSSQuery,
  CSSVariableValueView_exports as CSSVariableValueView,
  ComputedStyleProperty_exports as ComputedStyleProperty,
  ComputedStyleTrace_exports as ComputedStyleTrace,
  ElementsBreadcrumbs_exports as ElementsBreadcrumbs,
  ElementsBreadcrumbsUtils_exports as ElementsBreadcrumbsUtils,
  ElementsTreeExpandButton_exports as ElementsTreeExpandButton,
  Helper_exports as Helper,
  QueryContainer_exports as QueryContainer,
  StylePropertyEditor_exports as StylePropertyEditor
};
//# sourceMappingURL=components.js.map
