var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/panels/issues/components/ElementsPanelLink.js
var ElementsPanelLink_exports = {};
__export(ElementsPanelLink_exports, {
  ElementsPanelLink: () => ElementsPanelLink
});
import { html, render } from "./../../../ui/lit/lit.js";
import * as VisualLogging from "./../../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/issues/components/elementsPanelLink.css.js
var elementsPanelLink_css_default = `/*
 * Copyright 2021 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.element-reveal-icon {
  display: inline-block;
  width: 20px;
  height: 20px;
  mask-image: var(--image-file-select-element);
  background-color: var(--icon-default);
}

/*# sourceURL=${import.meta.resolve("././elementsPanelLink.css")} */`;

// gen/front_end/panels/issues/components/ElementsPanelLink.js
var ElementsPanelLink = class extends HTMLElement {
  #shadow = this.attachShadow({ mode: "open" });
  #onElementRevealIconClick = () => {
  };
  #onElementRevealIconMouseEnter = () => {
  };
  #onElementRevealIconMouseLeave = () => {
  };
  set data(data) {
    this.#onElementRevealIconClick = data.onElementRevealIconClick;
    this.#onElementRevealIconMouseEnter = data.onElementRevealIconMouseEnter;
    this.#onElementRevealIconMouseLeave = data.onElementRevealIconMouseLeave;
    this.#update();
  }
  #update() {
    this.#render();
  }
  #render() {
    render(html`
      <style>${elementsPanelLink_css_default}</style>
      <span
        class="element-reveal-icon"
        jslog=${VisualLogging.link("elements-panel").track({ click: true })}
        @click=${this.#onElementRevealIconClick}
        @mouseenter=${this.#onElementRevealIconMouseEnter}
        @mouseleave=${this.#onElementRevealIconMouseLeave}></span>
      `, this.#shadow, { host: this });
  }
};
customElements.define("devtools-elements-panel-link", ElementsPanelLink);

// gen/front_end/panels/issues/components/HideIssuesMenu.js
var HideIssuesMenu_exports = {};
__export(HideIssuesMenu_exports, {
  HideIssuesMenu: () => HideIssuesMenu
});
import * as Common from "./../../../core/common/common.js";
import * as i18n from "./../../../core/i18n/i18n.js";
import * as Buttons from "./../../../ui/components/buttons/buttons.js";
import * as UI from "./../../../ui/legacy/legacy.js";
import { html as html2, render as render2 } from "./../../../ui/lit/lit.js";

// gen/front_end/panels/issues/components/hideIssuesMenu.css.js
var hideIssuesMenu_css_default = `/*
 * Copyright 2021 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.hide-issues-menu-btn {
  position: relative;
  display: flex;
  background-color: transparent;
  flex: none;
  align-items: center;
  justify-content: center;
  padding: 0;
  margin: 0 -2px 0 4px;
  overflow: hidden;
  border-radius: 0;
  border: none;

  &:hover > devtools-icon {
    color: var(--icon-default-hover);
  }
}

/*# sourceURL=${import.meta.resolve("././hideIssuesMenu.css")} */`;

// gen/front_end/panels/issues/components/HideIssuesMenu.js
var UIStrings = {
  /**
   * @description Title for the tooltip of the (3 dots) Hide Issues menu icon.
   */
  tooltipTitle: "Hide issues"
};
var str_ = i18n.i18n.registerUIStrings("panels/issues/components/HideIssuesMenu.ts", UIStrings);
var i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
var HideIssuesMenu = class extends HTMLElement {
  #shadow = this.attachShadow({ mode: "open" });
  #menuItemLabel = Common.UIString.LocalizedEmptyString;
  #menuItemAction = () => {
  };
  set data(data) {
    this.#menuItemLabel = data.menuItemLabel;
    this.#menuItemAction = data.menuItemAction;
    this.#render();
  }
  onMenuOpen(event) {
    event.stopPropagation();
    const buttonElement = this.#shadow.querySelector("devtools-button");
    const contextMenu = new UI.ContextMenu.ContextMenu(event, {
      x: buttonElement?.getBoundingClientRect().left,
      y: buttonElement?.getBoundingClientRect().bottom
    });
    contextMenu.headerSection().appendItem(this.#menuItemLabel, () => this.#menuItemAction(), { jslogContext: "toggle-similar-issues" });
    void contextMenu.show();
  }
  onKeydown(event) {
    if (event.key === "Enter" || event.key === "Space") {
      event.stopImmediatePropagation();
    }
  }
  #render() {
    render2(html2`
    <style>${hideIssuesMenu_css_default}</style>
    <devtools-button
      .data=${{ variant: "icon", iconName: "dots-vertical", title: i18nString(UIStrings.tooltipTitle) }}
      .jslogContext=${"hide-issues"}
      class="hide-issues-menu-btn"
      @click=${this.onMenuOpen}
      @keydown=${this.onKeydown}></devtools-button>
    `, this.#shadow, { host: this });
  }
};
customElements.define("devtools-hide-issues-menu", HideIssuesMenu);
export {
  ElementsPanelLink_exports as ElementsPanelLink,
  HideIssuesMenu_exports as HideIssuesMenu
};
//# sourceMappingURL=components.js.map
