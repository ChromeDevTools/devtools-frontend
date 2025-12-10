var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/ui/components/settings/SettingCheckbox.js
var SettingCheckbox_exports = {};
__export(SettingCheckbox_exports, {
  SettingCheckbox: () => SettingCheckbox
});
import "./../tooltips/tooltips.js";

// gen/front_end/ui/components/settings/SettingDeprecationWarning.js
var SettingDeprecationWarning_exports = {};
__export(SettingDeprecationWarning_exports, {
  SettingDeprecationWarning: () => SettingDeprecationWarning
});
import "./../../kit/kit.js";
import * as Common from "./../../../core/common/common.js";
import * as Lit from "./../../lit/lit.js";

// gen/front_end/ui/components/settings/settingDeprecationWarning.css.js
var settingDeprecationWarning_css_default = `/*
 * Copyright 2022 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.clickable {
  cursor: pointer;
}

devtools-icon {
  vertical-align: text-bottom;
  padding-left: 2px;
}

/*# sourceURL=${import.meta.resolve("./settingDeprecationWarning.css")} */`;

// gen/front_end/ui/components/settings/SettingDeprecationWarning.js
var { html } = Lit;
var SettingDeprecationWarning = class extends HTMLElement {
  #shadow = this.attachShadow({ mode: "open" });
  set data(data) {
    this.#render(data);
  }
  #render({ disabled, warning, experiment }) {
    const classes = { clickable: false, medium: true };
    let onclick2;
    if (disabled && experiment) {
      classes.clickable = true;
      onclick2 = () => {
        void Common.Revealer.reveal(experiment);
      };
    }
    Lit.render(html`
        <style>${settingDeprecationWarning_css_default}</style>
        <devtools-icon class=${Lit.Directives.classMap(classes)} name="info" title=${warning} @click=${onclick2}></devtools-icon>`, this.#shadow, { host: this });
  }
};
customElements.define("devtools-setting-deprecation-warning", SettingDeprecationWarning);

// gen/front_end/ui/components/settings/SettingCheckbox.js
import "./../../kit/kit.js";
import * as Host from "./../../../core/host/host.js";
import * as i18n from "./../../../core/i18n/i18n.js";
import * as Lit2 from "./../../lit/lit.js";
import * as VisualLogging from "./../../visual_logging/visual_logging.js";
import * as Buttons from "./../buttons/buttons.js";
import * as Input from "./../input/input.js";

// gen/front_end/ui/components/settings/settingCheckbox.css.js
var settingCheckbox_css_default = `/*
 * Copyright 2021 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

:host {
  padding: 0;
  margin: 0;
}

input {
  height: 12px;
  width: 12px;
  min-height: 12px;
  min-width: 12px;
  margin: 6px;
}

label {
  display: inline-flex;
  align-items: center;
  overflow: hidden;
  text-overflow: ellipsis;
}

p {
  margin: 6px 0;
}

.disabled-reason {
  box-sizing: border-box;
  margin-left: var(--sys-size-2);
  width: var(--sys-size-9);
  height: var(--sys-size-9);
}

.info-icon {
  cursor: pointer;
  position: relative;
  margin-left: var(--sys-size-2);
  top: var(--sys-size-2);
  width: var(--sys-size-9);
  height: var(--sys-size-9);
}

.link {
  color: var(--text-link);
  text-decoration: underline;
}

/*# sourceURL=${import.meta.resolve("./settingCheckbox.css")} */`;

// gen/front_end/ui/components/settings/SettingCheckbox.js
var { html: html2, Directives: { ifDefined } } = Lit2;
var UIStrings = {
  /**
   * @description Text that is usually a hyperlink to more documentation
   */
  learnMore: "Learn more"
};
var str_ = i18n.i18n.registerUIStrings("ui/components/settings/SettingCheckbox.ts", UIStrings);
var i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
var SettingCheckbox = class extends HTMLElement {
  #shadow = this.attachShadow({ mode: "open" });
  #setting;
  #changeListenerDescriptor;
  #textOverride;
  set data(data) {
    if (this.#changeListenerDescriptor && this.#setting) {
      this.#setting.removeChangeListener(this.#changeListenerDescriptor.listener);
    }
    this.#setting = data.setting;
    this.#textOverride = data.textOverride;
    this.#changeListenerDescriptor = this.#setting.addChangeListener(() => {
      this.#render();
    });
    this.#render();
  }
  icon() {
    if (!this.#setting) {
      return void 0;
    }
    if (this.#setting.deprecation) {
      return html2`<devtools-setting-deprecation-warning .data=${this.#setting.deprecation}></devtools-setting-deprecation-warning>`;
    }
    const learnMore = this.#setting.learnMore();
    if (learnMore) {
      const jsLogContext = `${this.#setting.name}-documentation`;
      const data = {
        iconName: "info",
        variant: "icon",
        size: "SMALL",
        jslogContext: jsLogContext
      };
      const url = learnMore.url;
      if (learnMore.tooltip) {
        const id = `${this.#setting.name}-information`;
        return html2`
          <devtools-button
            class="info-icon"
            aria-details=${id}
            .data=${data}
          ></devtools-button>
          <devtools-tooltip id=${id} variant="rich">
            <span>${learnMore.tooltip()}</span><br />
            ${url ? html2`<devtools-link
                  href=${url}
                  class="link"
                  .jslogContext=${jsLogContext}
                  >${i18nString(UIStrings.learnMore)}</devtools-link
                >` : Lit2.nothing}
          </devtools-tooltip>
        `;
      }
      if (url) {
        const handleClick = (event) => {
          Host.InspectorFrontendHost.InspectorFrontendHostInstance.openInNewTab(url);
          event.consume();
        };
        data.iconName = "help";
        data.title = i18nString(UIStrings.learnMore);
        return html2`<devtools-button
          class="info-icon"
          @click=${handleClick}
          .data=${data}
        ></devtools-button>`;
      }
    }
    return void 0;
  }
  get checked() {
    if (!this.#setting || this.#setting.disabledReasons().length > 0) {
      return false;
    }
    return this.#setting.get();
  }
  #render() {
    if (!this.#setting) {
      throw new Error('No "Setting" object provided for rendering');
    }
    const icon = this.icon();
    const title = `${this.#setting.learnMore() ? this.#setting.learnMore()?.tooltip?.() : ""}`;
    const disabledReasons = this.#setting.disabledReasons();
    const reason = disabledReasons.length ? html2`
      <devtools-button class="disabled-reason" .iconName=${"info"} .variant=${"icon"} .size=${"SMALL"} title=${ifDefined(disabledReasons.join("\n"))} @click=${onclick}></devtools-button>
    ` : Lit2.nothing;
    Lit2.render(html2`
      <style>${Input.checkboxStyles}</style>
      <style>${settingCheckbox_css_default}</style>
      <p>
        <label title=${title}>
          <input
            type="checkbox"
            .checked=${this.checked}
            ?disabled=${this.#setting.disabled()}
            @change=${this.#checkboxChanged}
            jslog=${VisualLogging.toggle().track({ change: true }).context(this.#setting.name)}
            aria-label=${this.#setting.title()}
          />
          ${this.#textOverride || this.#setting.title()}${reason}
        </label>
        ${icon}
      </p>`, this.#shadow, { host: this });
  }
  #checkboxChanged(e) {
    this.#setting?.set(e.target.checked);
    this.dispatchEvent(new CustomEvent("change", {
      bubbles: true,
      composed: false
    }));
  }
};
customElements.define("setting-checkbox", SettingCheckbox);
export {
  SettingCheckbox_exports as SettingCheckbox,
  SettingDeprecationWarning_exports as SettingDeprecationWarning
};
//# sourceMappingURL=settings.js.map
