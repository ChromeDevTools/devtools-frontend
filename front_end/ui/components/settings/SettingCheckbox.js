// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-lit-render-outside-of-view */
import './SettingDeprecationWarning.js';
import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as Lit from '../../lit/lit.js';
import * as VisualLogging from '../../visual_logging/visual_logging.js';
import * as Buttons from '../buttons/buttons.js';
import * as Input from '../input/input.js';
import settingCheckboxStyles from './settingCheckbox.css.js';
const { html, Directives: { ifDefined } } = Lit;
const UIStrings = {
    /**
     * @description Text that is usually a hyperlink to more documentation
     */
    learnMore: 'Learn more',
};
const str_ = i18n.i18n.registerUIStrings('ui/components/settings/SettingCheckbox.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
/**
 * A simple checkbox that is backed by a boolean setting.
 */
export class SettingCheckbox extends HTMLElement {
    #shadow = this.attachShadow({ mode: 'open' });
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
            return undefined;
        }
        if (this.#setting.deprecation) {
            return html `<devtools-setting-deprecation-warning .data=${this.#setting.deprecation}></devtools-setting-deprecation-warning>`;
        }
        const learnMore = this.#setting.learnMore();
        if (learnMore?.url) {
            const url = learnMore.url;
            const data = {
                iconName: 'help',
                variant: "icon" /* Buttons.Button.Variant.ICON */,
                size: "SMALL" /* Buttons.Button.Size.SMALL */,
                jslogContext: `${this.#setting.name}-documentation`,
                title: i18nString(UIStrings.learnMore),
            };
            const handleClick = (event) => {
                Host.InspectorFrontendHost.InspectorFrontendHostInstance.openInNewTab(url);
                event.consume();
            };
            return html `<devtools-button
                    class=learn-more
                    @click=${handleClick}
                    .data=${data}></devtools-button>`;
        }
        return undefined;
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
        const title = `${this.#setting.learnMore() ? this.#setting.learnMore()?.tooltip() : ''}`;
        const disabledReasons = this.#setting.disabledReasons();
        const reason = disabledReasons.length ?
            html `
      <devtools-button class="disabled-reason" .iconName=${'info'} .variant=${"icon" /* Buttons.Button.Variant.ICON */} .size=${"SMALL" /* Buttons.Button.Size.SMALL */} title=${ifDefined(disabledReasons.join('\n'))} @click=${onclick}></devtools-button>
    ` :
            Lit.nothing;
        Lit.render(html `
      <style>${Input.checkboxStyles}</style>
      <style>${settingCheckboxStyles}</style>
      <p>
        <label title=${title}>
          <input
            type="checkbox"
            .checked=${this.checked}
            ?disabled=${this.#setting.disabled()}
            @change=${this.#checkboxChanged}
            jslog=${VisualLogging.toggle().track({ click: true }).context(this.#setting.name)}
            aria-label=${this.#setting.title()}
          />
          ${this.#textOverride || this.#setting.title()}${reason}
        </label>
        ${icon}
      </p>`, this.#shadow, { host: this });
    }
    #checkboxChanged(e) {
        this.#setting?.set(e.target.checked);
        this.dispatchEvent(new CustomEvent('change', {
            bubbles: true,
            composed: false,
        }));
    }
}
customElements.define('setting-checkbox', SettingCheckbox);
//# sourceMappingURL=SettingCheckbox.js.map