// Copyright 2015 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as UIHelpers from '../../ui/helpers/helpers.js';
import * as UI from '../../ui/legacy/legacy.js';
import { html, render } from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import { ElementsPanel } from './ElementsPanel.js';
import elementStatePaneWidgetStyles from './elementStatePaneWidget.css.js';
const { bindToSetting } = UI.UIUtils;
const UIStrings = {
    /**
     * @description Title of a section in the Element State Pane Widget of the Elements panel. The
     * controls in this section allow users to force a particular state on the selected element, e.g. a
     * focused state via :focus or a hover state via :hover.
     */
    forceElementState: 'Force element state',
    /**
     * @description Tooltip text in Element State Pane Widget of the Elements panel. For a button that
     * opens a tool that toggles the various states of the selected element on/off.
     */
    toggleElementState: 'Toggle Element State',
    /**
     * @description The name of a checkbox setting in the Element & Page State Pane Widget of the Elements panel.. This setting
     * emulates/pretends that the webpage is focused.
     */
    emulateFocusedPage: 'Emulate a focused page',
    /**
     * @description Explanation text for the 'Emulate a focused page' setting in the Rendering tool.
     */
    emulatesAFocusedPage: 'Keep page focused. Commonly used for debugging disappearing elements.',
    /**
     * @description Similar with forceElementState but allows users to force specific state of the selected element.
     */
    forceElementSpecificStates: 'Force specific element state',
    /**
     * @description Text that is usually a hyperlink to more documentation
     */
    learnMore: 'Learn more',
};
const str_ = i18n.i18n.registerUIStrings('panels/elements/ElementStatePaneWidget.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
var SpecificPseudoStates;
(function (SpecificPseudoStates) {
    SpecificPseudoStates["ENABLED"] = "enabled";
    SpecificPseudoStates["DISABLED"] = "disabled";
    SpecificPseudoStates["VALID"] = "valid";
    SpecificPseudoStates["INVALID"] = "invalid";
    SpecificPseudoStates["USER_VALID"] = "user-valid";
    SpecificPseudoStates["USER_INVALID"] = "user-invalid";
    SpecificPseudoStates["REQUIRED"] = "required";
    SpecificPseudoStates["OPTIONAL"] = "optional";
    SpecificPseudoStates["READ_ONLY"] = "read-only";
    SpecificPseudoStates["READ_WRITE"] = "read-write";
    SpecificPseudoStates["IN_RANGE"] = "in-range";
    SpecificPseudoStates["OUT_OF_RANGE"] = "out-of-range";
    SpecificPseudoStates["VISITED"] = "visited";
    SpecificPseudoStates["LINK"] = "link";
    SpecificPseudoStates["CHECKED"] = "checked";
    SpecificPseudoStates["INDETERMINATE"] = "indeterminate";
    SpecificPseudoStates["PLACEHOLDER_SHOWN"] = "placeholder-shown";
    SpecificPseudoStates["AUTOFILL"] = "autofill";
    SpecificPseudoStates["OPEN"] = "open";
    SpecificPseudoStates["TARGET_CURRENT"] = "target-current";
})(SpecificPseudoStates || (SpecificPseudoStates = {}));
export const DEFAULT_VIEW = (input, _output, target) => {
    const createElementStateCheckbox = (state) => {
        // clang-format off
        return html `
        <div id=${state.state}>
          <devtools-checkbox class="small" @click=${input.onStateCheckboxClicked}
              jslog=${VisualLogging.toggle(state.state).track({ change: true })} ?checked=${state.checked} ?disabled=${state.disabled}
              title=${':' + state.state}>
          <span class="source-code">${':' + state.state}</span>
        </devtools-checkbox>
        </div>`;
        // clang-format on
    };
    // clang-format off
    render(html `
    <style>${elementStatePaneWidgetStyles}</style>
    <div class="styles-element-state-pane"
        jslog=${VisualLogging.pane('element-states')}>
      <div class="page-state-checkbox">
        <devtools-checkbox class="small" title=${i18nString(UIStrings.emulatesAFocusedPage)}
            jslog=${VisualLogging.toggle('emulate-page-focus').track({ change: true })} ${bindToSetting('emulate-page-focus')}>${i18nString(UIStrings.emulateFocusedPage)}</devtools-checkbox>
        <devtools-button
            @click=${() => UIHelpers.openInNewTab('https://developer.chrome.com/docs/devtools/rendering/apply-effects#emulate_a_focused_page')}
           .data=${{
        variant: "icon" /* Buttons.Button.Variant.ICON */,
        iconName: 'help',
        size: "SMALL" /* Buttons.Button.Size.SMALL */,
        jslogContext: 'learn-more',
        title: i18nString(UIStrings.learnMore),
    }}></devtools-button>
      </div>
      <div class="section-header">
        <span>${i18nString(UIStrings.forceElementState)}</span>
      </div>
      <div class="pseudo-states-container" role="presentation">
        ${input.states.filter(({ type }) => type === 'persistent').map(state => createElementStateCheckbox(state))}
      </div>
      <details class="specific-details" ?hidden=${input.states.filter(({ type }) => type === 'specific').every(state => state.hidden)}>
        <summary class="force-specific-element-header section-header">
          <span>${i18nString(UIStrings.forceElementSpecificStates)}</span>
        </summary>
        <div class="pseudo-states-container specific-pseudo-states" role="presentation">
          ${input.states
        .filter(({ type, hidden }) => type === 'specific' && !hidden)
        .map(state => createElementStateCheckbox(state))}
        </div>
      </details>
    </div>`, target);
    // clang-format on
};
export class ElementStatePaneWidget extends UI.Widget.Widget {
    #duals;
    #cssModel;
    #states = new Map();
    #view;
    constructor(view = DEFAULT_VIEW) {
        super({ useShadowDom: true });
        this.#view = view;
        this.#duals = new Map();
        const setDualStateCheckboxes = (first, second) => {
            this.#duals.set(first, second);
            this.#duals.set(second, first);
        };
        // Populate element states
        this.#states.set('active', { state: 'active', type: 'persistent' });
        this.#states.set('hover', { state: 'hover', type: 'persistent' });
        this.#states.set('focus', { state: 'focus', type: 'persistent' });
        this.#states.set('focus-within', { state: 'focus-within', type: 'persistent' });
        this.#states.set('focus-visible', { state: 'focus-visible', type: 'persistent' });
        this.#states.set('target', { state: 'target', type: 'persistent' });
        this.#states.set(SpecificPseudoStates.ENABLED, { state: SpecificPseudoStates.ENABLED, type: 'specific' });
        this.#states.set(SpecificPseudoStates.DISABLED, { state: SpecificPseudoStates.DISABLED, type: 'specific' });
        this.#states.set(SpecificPseudoStates.VALID, { state: SpecificPseudoStates.VALID, type: 'specific' });
        this.#states.set(SpecificPseudoStates.INVALID, { state: SpecificPseudoStates.INVALID, type: 'specific' });
        this.#states.set(SpecificPseudoStates.USER_VALID, { state: SpecificPseudoStates.USER_VALID, type: 'specific' });
        this.#states.set(SpecificPseudoStates.USER_INVALID, { state: SpecificPseudoStates.USER_INVALID, type: 'specific' });
        this.#states.set(SpecificPseudoStates.REQUIRED, { state: SpecificPseudoStates.REQUIRED, type: 'specific' });
        this.#states.set(SpecificPseudoStates.OPTIONAL, { state: SpecificPseudoStates.OPTIONAL, type: 'specific' });
        this.#states.set(SpecificPseudoStates.READ_ONLY, { state: SpecificPseudoStates.READ_ONLY, type: 'specific' });
        this.#states.set(SpecificPseudoStates.READ_WRITE, { state: SpecificPseudoStates.READ_WRITE, type: 'specific' });
        this.#states.set(SpecificPseudoStates.IN_RANGE, { state: SpecificPseudoStates.IN_RANGE, type: 'specific' });
        this.#states.set(SpecificPseudoStates.OUT_OF_RANGE, { state: SpecificPseudoStates.OUT_OF_RANGE, type: 'specific' });
        this.#states.set(SpecificPseudoStates.VISITED, { state: SpecificPseudoStates.VISITED, type: 'specific' });
        this.#states.set(SpecificPseudoStates.LINK, { state: SpecificPseudoStates.LINK, type: 'specific' });
        this.#states.set(SpecificPseudoStates.CHECKED, { state: SpecificPseudoStates.CHECKED, type: 'specific' });
        this.#states.set(SpecificPseudoStates.INDETERMINATE, { state: SpecificPseudoStates.INDETERMINATE, type: 'specific' });
        this.#states.set(SpecificPseudoStates.PLACEHOLDER_SHOWN, { state: SpecificPseudoStates.PLACEHOLDER_SHOWN, type: 'specific' });
        this.#states.set(SpecificPseudoStates.AUTOFILL, { state: SpecificPseudoStates.AUTOFILL, type: 'specific' });
        this.#states.set(SpecificPseudoStates.OPEN, { state: SpecificPseudoStates.OPEN, type: 'specific' });
        this.#states.set(SpecificPseudoStates.TARGET_CURRENT, { state: SpecificPseudoStates.TARGET_CURRENT, type: 'specific' });
        setDualStateCheckboxes(SpecificPseudoStates.VALID, SpecificPseudoStates.INVALID);
        setDualStateCheckboxes(SpecificPseudoStates.USER_VALID, SpecificPseudoStates.USER_INVALID);
        setDualStateCheckboxes(SpecificPseudoStates.READ_ONLY, SpecificPseudoStates.READ_WRITE);
        setDualStateCheckboxes(SpecificPseudoStates.IN_RANGE, SpecificPseudoStates.OUT_OF_RANGE);
        setDualStateCheckboxes(SpecificPseudoStates.ENABLED, SpecificPseudoStates.DISABLED);
        setDualStateCheckboxes(SpecificPseudoStates.VISITED, SpecificPseudoStates.LINK);
        UI.Context.Context.instance().addFlavorChangeListener(SDK.DOMModel.DOMNode, this.requestUpdate, this);
    }
    onStateCheckboxClicked(event) {
        const node = UI.Context.Context.instance().flavor(SDK.DOMModel.DOMNode);
        if (!node || !(event.target instanceof UI.UIUtils.CheckboxLabel)) {
            return;
        }
        const state = event.target.title.slice(1);
        if (!state) {
            return;
        }
        const checked = event.target.checked;
        const dual = this.#duals.get(state);
        if (checked && dual) {
            node.domModel().cssModel().forcePseudoState(node, dual, false);
        }
        node.domModel().cssModel().forcePseudoState(node, state, checked);
    }
    updateModel(cssModel) {
        if (this.#cssModel === cssModel) {
            return;
        }
        if (this.#cssModel) {
            this.#cssModel.removeEventListener(SDK.CSSModel.Events.PseudoStateForced, this.requestUpdate, this);
        }
        this.#cssModel = cssModel;
        if (this.#cssModel) {
            this.#cssModel.addEventListener(SDK.CSSModel.Events.PseudoStateForced, this.requestUpdate, this);
        }
    }
    wasShown() {
        super.wasShown();
        this.requestUpdate();
    }
    async performUpdate() {
        let node = UI.Context.Context.instance().flavor(SDK.DOMModel.DOMNode);
        if (node) {
            node = node.enclosingElementOrSelf();
        }
        this.updateModel(node ? node.domModel().cssModel() : null);
        if (node) {
            const nodePseudoState = node.domModel().cssModel().pseudoState(node);
            for (const state of this.#states.values()) {
                state.disabled = Boolean(node.pseudoType());
                state.checked = Boolean(nodePseudoState && nodePseudoState.indexOf(state.state) >= 0);
            }
        }
        else {
            for (const state of this.#states.values()) {
                state.disabled = true;
                state.checked = false;
            }
        }
        await this.#updateElementSpecificStatesTable(node);
        ButtonProvider.instance().item().setToggled([...this.#states.values()].some(input => input.checked));
        const viewInput = {
            states: [...this.#states.values()],
            onStateCheckboxClicked: this.onStateCheckboxClicked.bind(this),
        };
        this.#view(viewInput, {}, this.contentElement);
    }
    async #updateElementSpecificStatesTable(node = null) {
        if (!node || node.nodeType() !== Node.ELEMENT_NODE) {
            [...this.#states.values()].filter(({ type }) => type === 'specific').forEach(state => {
                state.hidden = true;
            });
            return;
        }
        const hideSpecificCheckbox = (pseudoClass, hide) => {
            const state = this.#states.get(pseudoClass);
            if (state) {
                state.hidden = hide;
            }
        };
        const isElementOfTypes = (node, types) => {
            return types.includes(node.nodeName()?.toLowerCase());
        };
        const isAnchorElementWithHref = (node) => {
            return isElementOfTypes(node, ['a']) && node.getAttribute('href') !== undefined;
        };
        const isInputWithTypeRadioOrCheckbox = (node) => {
            return isElementOfTypes(node, ['input']) &&
                (node.getAttribute('type') === 'checkbox' || node.getAttribute('type') === 'radio');
        };
        const isContentEditable = (node) => {
            return node.getAttribute('contenteditable') !== undefined ||
                Boolean(node.parentNode && isContentEditable(node.parentNode));
        };
        const isDisabled = (node) => {
            return node.getAttribute('disabled') !== undefined;
        };
        const isMutable = (node) => {
            if (isElementOfTypes(node, ['input', 'textarea'])) {
                return node.getAttribute('readonly') === undefined && !isDisabled(node);
            }
            return isContentEditable(node);
        };
        // An autonomous custom element is called a form-associated custom element if the element is associated with a custom element definition whose form-associated field is set to true.
        // https://html.spec.whatwg.org/multipage/custom-elements.html#form-associated-custom-element
        const isFormAssociatedCustomElement = async (node) => {
            function getFormAssociatedField() {
                return ('formAssociated' in this.constructor && this.constructor.formAssociated === true);
            }
            const response = await node.callFunction(getFormAssociatedField);
            return response ? response.value : false;
        };
        const isFormAssociated = await isFormAssociatedCustomElement(node);
        if (isElementOfTypes(node, ['button', 'input', 'select', 'textarea', 'optgroup', 'option', 'fieldset']) ||
            isFormAssociated) {
            hideSpecificCheckbox(SpecificPseudoStates.ENABLED, !isDisabled(node));
            hideSpecificCheckbox(SpecificPseudoStates.DISABLED, isDisabled(node));
        }
        else {
            hideSpecificCheckbox(SpecificPseudoStates.ENABLED, true);
            hideSpecificCheckbox(SpecificPseudoStates.DISABLED, true);
        }
        if (isElementOfTypes(node, ['button', 'fieldset', 'input', 'object', 'output', 'select', 'textarea', 'img']) ||
            isFormAssociated) {
            hideSpecificCheckbox(SpecificPseudoStates.VALID, false);
            hideSpecificCheckbox(SpecificPseudoStates.INVALID, false);
        }
        else {
            hideSpecificCheckbox(SpecificPseudoStates.VALID, true);
            hideSpecificCheckbox(SpecificPseudoStates.INVALID, true);
        }
        if (isElementOfTypes(node, ['input', 'select', 'textarea'])) {
            hideSpecificCheckbox(SpecificPseudoStates.USER_VALID, false);
            hideSpecificCheckbox(SpecificPseudoStates.USER_INVALID, false);
            if (node.getAttribute('required') === undefined) {
                hideSpecificCheckbox(SpecificPseudoStates.REQUIRED, false);
                hideSpecificCheckbox(SpecificPseudoStates.OPTIONAL, true);
            }
            else {
                hideSpecificCheckbox(SpecificPseudoStates.REQUIRED, true);
                hideSpecificCheckbox(SpecificPseudoStates.OPTIONAL, false);
            }
        }
        else {
            hideSpecificCheckbox(SpecificPseudoStates.USER_VALID, true);
            hideSpecificCheckbox(SpecificPseudoStates.USER_INVALID, true);
            hideSpecificCheckbox(SpecificPseudoStates.REQUIRED, true);
            hideSpecificCheckbox(SpecificPseudoStates.OPTIONAL, true);
        }
        if (isMutable(node)) {
            hideSpecificCheckbox(SpecificPseudoStates.READ_WRITE, true);
            hideSpecificCheckbox(SpecificPseudoStates.READ_ONLY, false);
        }
        else {
            hideSpecificCheckbox(SpecificPseudoStates.READ_WRITE, false);
            hideSpecificCheckbox(SpecificPseudoStates.READ_ONLY, true);
        }
        if (isElementOfTypes(node, ['input']) &&
            (node.getAttribute('min') !== undefined || node.getAttribute('max') !== undefined)) {
            hideSpecificCheckbox(SpecificPseudoStates.IN_RANGE, false);
            hideSpecificCheckbox(SpecificPseudoStates.OUT_OF_RANGE, false);
        }
        else {
            hideSpecificCheckbox(SpecificPseudoStates.IN_RANGE, true);
            hideSpecificCheckbox(SpecificPseudoStates.OUT_OF_RANGE, true);
        }
        if (isElementOfTypes(node, ['a', 'area']) && node.getAttribute('href') !== undefined) {
            hideSpecificCheckbox(SpecificPseudoStates.VISITED, false);
            hideSpecificCheckbox(SpecificPseudoStates.LINK, false);
        }
        else {
            hideSpecificCheckbox(SpecificPseudoStates.VISITED, true);
            hideSpecificCheckbox(SpecificPseudoStates.LINK, true);
        }
        if (isInputWithTypeRadioOrCheckbox(node) || isElementOfTypes(node, ['option'])) {
            hideSpecificCheckbox(SpecificPseudoStates.CHECKED, false);
        }
        else {
            hideSpecificCheckbox(SpecificPseudoStates.CHECKED, true);
        }
        if (isInputWithTypeRadioOrCheckbox(node) || isElementOfTypes(node, ['progress'])) {
            hideSpecificCheckbox(SpecificPseudoStates.INDETERMINATE, false);
        }
        else {
            hideSpecificCheckbox(SpecificPseudoStates.INDETERMINATE, true);
        }
        if (isElementOfTypes(node, ['input', 'textarea'])) {
            hideSpecificCheckbox(SpecificPseudoStates.PLACEHOLDER_SHOWN, false);
        }
        else {
            hideSpecificCheckbox(SpecificPseudoStates.PLACEHOLDER_SHOWN, true);
        }
        if (isElementOfTypes(node, ['input'])) {
            hideSpecificCheckbox(SpecificPseudoStates.AUTOFILL, false);
        }
        else {
            hideSpecificCheckbox(SpecificPseudoStates.AUTOFILL, true);
        }
        if (isElementOfTypes(node, ['input', 'select', 'dialog', 'details'])) {
            hideSpecificCheckbox(SpecificPseudoStates.OPEN, false);
        }
        else {
            hideSpecificCheckbox(SpecificPseudoStates.OPEN, true);
        }
        if (isAnchorElementWithHref(node) || node.pseudoType() === 'scroll-marker') {
            hideSpecificCheckbox(SpecificPseudoStates.TARGET_CURRENT, false);
        }
        else {
            hideSpecificCheckbox(SpecificPseudoStates.TARGET_CURRENT, true);
        }
    }
}
let buttonProviderInstance;
export class ButtonProvider {
    button;
    view;
    constructor() {
        this.button = new UI.Toolbar.ToolbarToggle(i18nString(UIStrings.toggleElementState), 'hover');
        this.button.addEventListener("Click" /* UI.Toolbar.ToolbarButton.Events.CLICK */, this.clicked, this);
        this.button.element.classList.add('element-state');
        this.button.element.setAttribute('jslog', `${VisualLogging.toggleSubpane('element-states').track({ click: true })}`);
        this.button.element.style.setProperty('--dot-toggle-top', '12px');
        this.button.element.style.setProperty('--dot-toggle-left', '18px');
        this.view = new ElementStatePaneWidget();
    }
    static instance(opts = { forceNew: null }) {
        const { forceNew } = opts;
        if (!buttonProviderInstance || forceNew) {
            buttonProviderInstance = new ButtonProvider();
        }
        return buttonProviderInstance;
    }
    clicked() {
        ElementsPanel.instance().showToolbarPane(!this.view.isShowing() ? this.view : null, this.button);
    }
    item() {
        return this.button;
    }
}
//# sourceMappingURL=ElementStatePaneWidget.js.map