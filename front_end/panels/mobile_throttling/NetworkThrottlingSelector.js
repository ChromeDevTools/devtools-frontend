// Copyright 2017 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import { ThrottlingManager } from './ThrottlingManager.js';
const { render, html, Directives, nothing } = Lit;
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
     * @description  Title for a network throttling group containing the request blocking option
     */
    blockingGroup: 'Blocking',
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
};
const str_ = i18n.i18n.registerUIStrings('panels/mobile_throttling/NetworkThrottlingSelector.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export const DEFAULT_VIEW = (input, output, target) => {
    // The title is usually an i18nLazyString except for custom values that are stored in the local storage in the form of a string.
    const title = (conditions) => typeof conditions.title === 'function' ? conditions.title() : conditions.title;
    const jslog = (group, condition) => `${VisualLogging
        .item(Platform.StringUtilities.toKebabCase(('i18nTitleKey' in condition && condition.i18nTitleKey) || title(condition)))
        .track({ click: true })}`;
    const optionsMap = new WeakMap();
    let selectedConditions = input.selectedConditions;
    function onSelect(event) {
        const element = event.target;
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
            if (selectedConditions) {
                element.value = title(selectedConditions);
            }
        }
        else {
            const conditions = optionsMap.get(option);
            if (conditions) {
                selectedConditions = conditions;
                input.onSelect(conditions);
            }
        }
    }
    render(
    // clang-format off
    html `<select
      aria-label=${input.title ?? nothing}
      jslog=${VisualLogging.dropDown().track({ change: true }).context(input.jslogContext)}
      @change=${onSelect}>
          ${input.throttlingGroups.map(group => html `<optgroup
            label=${group.title}>
            ${group.items.map(condition => html `<option
              ${Directives.ref(option => option && optionsMap.set(option, condition))}
              ?selected=${selectedConditions ?
        SDK.NetworkManager.networkConditionsEqual(condition, selectedConditions) :
        (group === input.throttlingGroups[0])}
              value=${title(condition)}
              aria-label=${i18nString(UIStrings.sS, { PH1: group.title, PH2: title(condition) })}
              jslog=${jslog(group, condition)}>
                ${condition === input.recommendedConditions ?
        i18nString(UIStrings.recommendedThrottling, { PH1: title(condition) }) :
        title(condition)}
            </option>`)}
        </optgroup>`)}
        <optgroup label=${input.customConditionsGroup.title}>
          ${input.customConditionsGroup.items.map(condition => html `<option
              ${Directives.ref(option => option && optionsMap.set(option, condition))}
              ?selected=${selectedConditions && SDK.NetworkManager.networkConditionsEqual(condition, selectedConditions)}
              value=${title(condition)}
              aria-label=${i18nString(UIStrings.sS, { PH1: input.customConditionsGroup.title, PH2: title(condition) })}
              jslog=${VisualLogging.item('custom-network-throttling-item').track({ click: true })}>
                ${condition === input.recommendedConditions ?
        i18nString(UIStrings.recommendedThrottling, { PH1: title(condition) }) :
        title(condition)}
          </option>`)}
          <option
            value=${i18nString(UIStrings.add)}
            aria-label=${i18nString(UIStrings.addS, { PH1: input.customConditionsGroup.title })}
            jslog=${VisualLogging.action('add').track({ click: true })}>
              ${i18nString(UIStrings.add)}
          </option>
        </optgroup>
      </select>`, // clang-format on
    target);
};
export class NetworkThrottlingSelect extends Common.ObjectWrapper.ObjectWrapper {
    #recommendedConditions = null;
    #element;
    #jslogContext;
    #currentConditions;
    #title;
    #view;
    #variant = "global-conditions" /* NetworkThrottlingSelect.Variant.GLOBAL_CONDITIONS */;
    static createForGlobalConditions(element, title) {
        ThrottlingManager.instance(); // Instantiate the throttling manager to connect network manager with the setting
        const select = new NetworkThrottlingSelect(element, {
            title,
            jslogContext: SDK.NetworkManager.activeNetworkThrottlingKeySetting().name,
            currentConditions: SDK.NetworkManager.MultitargetNetworkManager.instance().networkConditions()
        });
        select.addEventListener("conditionsChanged" /* Events.CONDITIONS_CHANGED */, ev => !('block' in ev.data) &&
            SDK.NetworkManager.MultitargetNetworkManager.instance().setNetworkConditions(ev.data));
        SDK.NetworkManager.MultitargetNetworkManager.instance().addEventListener("ConditionsChanged" /* SDK.NetworkManager.MultitargetNetworkManager.Events.CONDITIONS_CHANGED */, () => {
            select.currentConditions = SDK.NetworkManager.MultitargetNetworkManager.instance().networkConditions();
        });
        return select;
    }
    constructor(element, options = {}, view = DEFAULT_VIEW) {
        super();
        SDK.NetworkManager.customUserNetworkConditionsSetting().addChangeListener(this.#performUpdate, this);
        this.#element = element;
        this.#jslogContext = options.jslogContext;
        this.#currentConditions = options.currentConditions;
        this.#title = options.title;
        this.#view = view;
        this.#performUpdate();
    }
    get recommendedConditions() {
        return this.#recommendedConditions;
    }
    set recommendedConditions(recommendedConditions) {
        this.#recommendedConditions = recommendedConditions;
        this.#performUpdate();
    }
    get currentConditions() {
        return this.#currentConditions;
    }
    set currentConditions(currentConditions) {
        this.#currentConditions = currentConditions;
        this.#performUpdate();
    }
    get jslogContext() {
        return this.#jslogContext;
    }
    set jslogContext(jslogContext) {
        this.#jslogContext = jslogContext;
        this.#performUpdate();
    }
    get variant() {
        return this.#variant;
    }
    set variant(variant) {
        this.#variant = variant;
        this.#performUpdate();
    }
    // FIXME Should use requestUpdate once we merge this with the widget
    #performUpdate() {
        const customNetworkConditionsSetting = SDK.NetworkManager.customUserNetworkConditionsSetting();
        const customNetworkConditions = customNetworkConditionsSetting.get();
        const onAddCustomConditions = () => {
            void Common.Revealer.reveal(SDK.NetworkManager.customUserNetworkConditionsSetting());
        };
        const onSelect = (conditions) => {
            this.dispatchEventToListeners("conditionsChanged" /* Events.CONDITIONS_CHANGED */, conditions);
        };
        const throttlingGroups = [];
        switch (this.#variant) {
            case "global-conditions" /* NetworkThrottlingSelect.Variant.GLOBAL_CONDITIONS */:
                throttlingGroups.push({ title: i18nString(UIStrings.disabled), items: [SDK.NetworkManager.NoThrottlingConditions] }, {
                    title: i18nString(UIStrings.presets),
                    items: [
                        SDK.NetworkManager.Fast4GConditions,
                        SDK.NetworkManager.Slow4GConditions,
                        SDK.NetworkManager.Slow3GConditions,
                        SDK.NetworkManager.OfflineConditions,
                    ]
                });
                break;
            case "individual-request-conditions" /* NetworkThrottlingSelect.Variant.INDIVIDUAL_REQUEST_CONDITIONS */:
                throttlingGroups.push({ title: i18nString(UIStrings.blockingGroup), items: [SDK.NetworkManager.BlockingConditions] }, {
                    title: i18nString(UIStrings.presets),
                    items: [
                        SDK.NetworkManager.Fast4GConditions,
                        SDK.NetworkManager.Slow4GConditions,
                        SDK.NetworkManager.Slow3GConditions,
                    ]
                });
                break;
        }
        const customConditionsGroup = { title: i18nString(UIStrings.custom), items: customNetworkConditions };
        const viewInput = {
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
export class NetworkThrottlingSelectorWidget extends UI.Widget.VBox {
    #select;
    #conditionsChangedHandler;
    constructor(element, view = DEFAULT_VIEW) {
        super(element, { useShadowDom: true });
        this.#select = new NetworkThrottlingSelect(this.contentElement, {}, view);
        this.#select.addEventListener("conditionsChanged" /* Events.CONDITIONS_CHANGED */, ({ data }) => this.#conditionsChangedHandler?.(data));
    }
    set variant(variant) {
        this.#select.variant = variant;
    }
    set jslogContext(context) {
        this.#select.jslogContext = context;
    }
    set currentConditions(currentConditions) {
        this.#select.currentConditions = currentConditions;
    }
    set onConditionsChanged(handler) {
        this.#conditionsChangedHandler = handler;
    }
}
//# sourceMappingURL=NetworkThrottlingSelector.js.map