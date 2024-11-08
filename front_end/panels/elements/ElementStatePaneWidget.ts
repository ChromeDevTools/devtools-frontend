// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import {ElementsPanel} from './ElementsPanel.js';
import elementStatePaneWidgetStyles from './elementStatePaneWidget.css.js';

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
   *@description Text that is usually a hyperlink to more documentation
   */
  learnMore: 'Learn more',
};
const str_ = i18n.i18n.registerUIStrings('panels/elements/ElementStatePaneWidget.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
enum SpecificPseudoStates {
  ENABLED = 'enabled',
  DISABLED = 'disabled',
  VALID = 'valid',
  INVALID = 'invalid',
  USER_VALID = 'user-valid',
  USER_INVALID = 'user-invalid',
  REQUIRED = 'required',
  OPTIONAL = 'optional',
  READ_ONLY = 'read-only',
  READ_WRITE = 'read-write',
  IN_RANGE = 'in-range',
  OUT_OF_RANGE = 'out-of-range',
  VISITED = 'visited',
  LINK = 'link',
  CHECKED = 'checked',
  INDETERMINATE = 'indeterminate',
  PLACEHOLDER_SHOWN = 'placeholder-shown',
  AUTOFILL = 'autofill',
}

export class ElementStatePaneWidget extends UI.Widget.Widget {
  private readonly inputs: HTMLInputElement[];
  private readonly inputStates: WeakMap<HTMLInputElement, string>;
  private readonly duals: Map<SpecificPseudoStates, SpecificPseudoStates>;
  private cssModel?: SDK.CSSModel.CSSModel|null;
  private specificPseudoStateDivs: Map<SpecificPseudoStates, HTMLDivElement>;
  private specificHeader: HTMLDetailsElement;
  private readonly throttler: Common.Throttler.Throttler;

  constructor() {
    super(true);
    this.contentElement.className = 'styles-element-state-pane';
    this.contentElement.setAttribute('jslog', `${VisualLogging.pane('element-states')}`);
    const inputs: HTMLInputElement[] = [];
    this.inputs = inputs;
    this.inputStates = new WeakMap();
    this.duals = new Map();
    const createSectionHeader = (title: string): HTMLDivElement => {
      const sectionHeaderContainer = document.createElement('div');
      sectionHeaderContainer.classList.add('section-header');
      UI.UIUtils.createTextChild(sectionHeaderContainer.createChild('span'), title);

      return sectionHeaderContainer;
    };
    const clickListener = (event: MouseEvent): void => {
      const node = UI.Context.Context.instance().flavor(SDK.DOMModel.DOMNode);
      if (!node || !(event.target instanceof HTMLInputElement)) {
        return;
      }
      const state = this.inputStates.get(event.target);
      if (!state) {
        return;
      }
      const checked = event.target.checked;
      const dual = this.duals.get(state as SpecificPseudoStates);
      if (checked && dual) {
        node.domModel().cssModel().forcePseudoState(node, dual, false);
      }
      node.domModel().cssModel().forcePseudoState(node, state, checked);
    };
    const createElementStateCheckbox = (state: string): HTMLDivElement => {
      const div = document.createElement('div');
      div.id = state;
      const label = UI.UIUtils.CheckboxLabel.create(':' + state, undefined, undefined, undefined, true);
      const input = label.checkboxElement;
      this.inputStates.set(input, state);
      input.addEventListener('click', (clickListener as EventListener), false);
      input.setAttribute('jslog', `${VisualLogging.toggle().track({change: true}).context(state)}`);
      inputs.push(input);
      div.appendChild(label);
      return div;
    };
    const setDualStateCheckboxes = (first: SpecificPseudoStates, second: SpecificPseudoStates): void => {
      this.duals.set(first, second);
      this.duals.set(second, first);
    };
    const createEmulateFocusedPageCheckbox = (): Element => {
      const div = document.createElement('div');
      div.classList.add('page-state-checkbox');
      const label = UI.UIUtils.CheckboxLabel.create(
          i18nString(UIStrings.emulateFocusedPage), undefined, undefined, 'emulate-page-focus', true);
      UI.SettingsUI.bindCheckbox(
          label.checkboxElement, Common.Settings.Settings.instance().moduleSetting('emulate-page-focus'), {
            enable: Host.UserMetrics.Action.ToggleEmulateFocusedPageFromStylesPaneOn,
            disable: Host.UserMetrics.Action.ToggleEmulateFocusedPageFromStylesPaneOff,
          });
      UI.Tooltip.Tooltip.install(label.textElement, i18nString(UIStrings.emulatesAFocusedPage));

      const learnMoreButton = new Buttons.Button.Button();
      learnMoreButton.data = {
        variant: Buttons.Button.Variant.ICON,
        iconName: 'help',
        size: Buttons.Button.Size.SMALL,
        jslogContext: 'learn-more',
        title: i18nString(UIStrings.learnMore),
      };
      learnMoreButton.addEventListener(
          'click',
          () => Host.InspectorFrontendHost.InspectorFrontendHostInstance.openInNewTab(
              'https://goo.gle/devtools-emulate-focused-page' as Platform.DevToolsPath.UrlString));

      div.appendChild(label);
      div.appendChild(learnMoreButton);
      return div;
    };

    this.contentElement.className = 'styles-element-state-pane';

    // Populate page states
    const keepPageFocusedCheckbox = createEmulateFocusedPageCheckbox();

    this.contentElement.appendChild(keepPageFocusedCheckbox);

    // Populate element states
    this.contentElement.appendChild(createSectionHeader(i18nString(UIStrings.forceElementState)));

    const persistentContainer = document.createElement('div');
    persistentContainer.classList.add('source-code');
    persistentContainer.classList.add('pseudo-states-container');
    UI.ARIAUtils.markAsPresentation(persistentContainer);

    persistentContainer.appendChild(createElementStateCheckbox('active'));
    persistentContainer.appendChild(createElementStateCheckbox('hover'));
    persistentContainer.appendChild(createElementStateCheckbox('focus'));
    persistentContainer.appendChild(createElementStateCheckbox('focus-within'));
    persistentContainer.appendChild(createElementStateCheckbox('focus-visible'));
    persistentContainer.appendChild(createElementStateCheckbox('target'));
    this.contentElement.appendChild(persistentContainer);

    const elementSpecificContainer = document.createElement('div');
    elementSpecificContainer.classList.add('source-code');
    elementSpecificContainer.classList.add('pseudo-states-container');
    elementSpecificContainer.classList.add('specific-pseudo-states');
    UI.ARIAUtils.markAsPresentation(elementSpecificContainer);

    this.specificPseudoStateDivs = new Map<SpecificPseudoStates, HTMLDivElement>();
    this.specificPseudoStateDivs.set(
        SpecificPseudoStates.ENABLED, createElementStateCheckbox(SpecificPseudoStates.ENABLED));
    this.specificPseudoStateDivs.set(
        SpecificPseudoStates.DISABLED, createElementStateCheckbox(SpecificPseudoStates.DISABLED));
    this.specificPseudoStateDivs.set(
        SpecificPseudoStates.VALID, createElementStateCheckbox(SpecificPseudoStates.VALID));
    this.specificPseudoStateDivs.set(
        SpecificPseudoStates.INVALID, createElementStateCheckbox(SpecificPseudoStates.INVALID));
    this.specificPseudoStateDivs.set(
        SpecificPseudoStates.USER_VALID, createElementStateCheckbox(SpecificPseudoStates.USER_VALID));
    this.specificPseudoStateDivs.set(
        SpecificPseudoStates.USER_INVALID, createElementStateCheckbox(SpecificPseudoStates.USER_INVALID));
    this.specificPseudoStateDivs.set(
        SpecificPseudoStates.REQUIRED, createElementStateCheckbox(SpecificPseudoStates.REQUIRED));
    this.specificPseudoStateDivs.set(
        SpecificPseudoStates.OPTIONAL, createElementStateCheckbox(SpecificPseudoStates.OPTIONAL));
    this.specificPseudoStateDivs.set(
        SpecificPseudoStates.READ_ONLY, createElementStateCheckbox(SpecificPseudoStates.READ_ONLY));
    this.specificPseudoStateDivs.set(
        SpecificPseudoStates.READ_WRITE, createElementStateCheckbox(SpecificPseudoStates.READ_WRITE));
    this.specificPseudoStateDivs.set(
        SpecificPseudoStates.IN_RANGE, createElementStateCheckbox(SpecificPseudoStates.IN_RANGE));
    this.specificPseudoStateDivs.set(
        SpecificPseudoStates.OUT_OF_RANGE, createElementStateCheckbox(SpecificPseudoStates.OUT_OF_RANGE));
    this.specificPseudoStateDivs.set(
        SpecificPseudoStates.VISITED, createElementStateCheckbox(SpecificPseudoStates.VISITED));
    this.specificPseudoStateDivs.set(SpecificPseudoStates.LINK, createElementStateCheckbox(SpecificPseudoStates.LINK));
    this.specificPseudoStateDivs.set(
        SpecificPseudoStates.CHECKED, createElementStateCheckbox(SpecificPseudoStates.CHECKED));
    this.specificPseudoStateDivs.set(
        SpecificPseudoStates.INDETERMINATE, createElementStateCheckbox(SpecificPseudoStates.INDETERMINATE));
    this.specificPseudoStateDivs.set(
        SpecificPseudoStates.PLACEHOLDER_SHOWN, createElementStateCheckbox(SpecificPseudoStates.PLACEHOLDER_SHOWN));
    this.specificPseudoStateDivs.set(
        SpecificPseudoStates.AUTOFILL, createElementStateCheckbox(SpecificPseudoStates.AUTOFILL));

    this.specificPseudoStateDivs.forEach(div => {
      elementSpecificContainer.appendChild(div);
    });

    setDualStateCheckboxes(SpecificPseudoStates.VALID, SpecificPseudoStates.INVALID);
    setDualStateCheckboxes(SpecificPseudoStates.USER_VALID, SpecificPseudoStates.USER_INVALID);
    setDualStateCheckboxes(SpecificPseudoStates.READ_ONLY, SpecificPseudoStates.READ_WRITE);
    setDualStateCheckboxes(SpecificPseudoStates.IN_RANGE, SpecificPseudoStates.OUT_OF_RANGE);
    setDualStateCheckboxes(SpecificPseudoStates.ENABLED, SpecificPseudoStates.DISABLED);
    setDualStateCheckboxes(SpecificPseudoStates.VISITED, SpecificPseudoStates.LINK);

    this.specificHeader = document.createElement('details');
    this.specificHeader.classList.add('specific-details');

    const sectionHeaderContainer = document.createElement('summary');
    sectionHeaderContainer.classList.add('force-specific-element-header');
    sectionHeaderContainer.classList.add('section-header');
    UI.UIUtils.createTextChild(
        sectionHeaderContainer.createChild('span'), i18nString(UIStrings.forceElementSpecificStates));

    this.specificHeader.appendChild(sectionHeaderContainer);
    this.specificHeader.appendChild(elementSpecificContainer);
    this.contentElement.appendChild(this.specificHeader);

    this.throttler = new Common.Throttler.Throttler(100);
    UI.Context.Context.instance().addFlavorChangeListener(SDK.DOMModel.DOMNode, this.update, this);
  }
  private updateModel(cssModel: SDK.CSSModel.CSSModel|null): void {
    if (this.cssModel === cssModel) {
      return;
    }
    if (this.cssModel) {
      this.cssModel.removeEventListener(SDK.CSSModel.Events.PseudoStateForced, this.update, this);
    }
    this.cssModel = cssModel;
    if (this.cssModel) {
      this.cssModel.addEventListener(SDK.CSSModel.Events.PseudoStateForced, this.update, this);
    }
  }
  override wasShown(): void {
    super.wasShown();
    this.registerCSSFiles([elementStatePaneWidgetStyles]);
    this.update();
  }
  private update(): void {
    let node = UI.Context.Context.instance().flavor(SDK.DOMModel.DOMNode);
    if (node) {
      node = node.enclosingElementOrSelf();
    }
    this.updateModel(node ? node.domModel().cssModel() : null);
    if (node) {
      const nodePseudoState = node.domModel().cssModel().pseudoState(node);
      for (const input of this.inputs) {
        input.disabled = Boolean(node.pseudoType());
        const state = this.inputStates.get(input);
        input.checked = nodePseudoState && state !== undefined ? nodePseudoState.indexOf(state) >= 0 : false;
      }
    } else {
      for (const input of this.inputs) {
        input.disabled = true;
        input.checked = false;
      }
    }
    void this.throttler.schedule(this.updateElementSpecificStatesTable.bind(this, node));
    ButtonProvider.instance().item().setToggled(this.inputs.some(input => input.checked));
  }

  private async updateElementSpecificStatesTable(node: SDK.DOMModel.DOMNode|null = null): Promise<void> {
    if (!node || node.nodeType() !== Node.ELEMENT_NODE) {
      this.specificHeader.hidden = true;
      this.updateElementSpecificStatesTableForTest();
      return;
    }
    let showedACheckbox = false;
    const hideSpecificCheckbox = (pseudoClass: SpecificPseudoStates, hide: boolean): void => {
      const checkbox = this.specificPseudoStateDivs.get(pseudoClass);
      if (checkbox) {
        checkbox.hidden = hide;
      }
      showedACheckbox = showedACheckbox || !hide;
    };
    const isElementOfTypes = (node: SDK.DOMModel.DOMNode, types: string[]): boolean => {
      return types.includes(node.nodeName()?.toLowerCase());
    };
    const isInputWithTypeRadioOrCheckbox = (node: SDK.DOMModel.DOMNode): boolean => {
      return isElementOfTypes(node, ['input']) &&
          (node.getAttribute('type') === 'checkbox' || node.getAttribute('type') === 'radio');
    };
    const isContentEditable = (node: SDK.DOMModel.DOMNode): boolean => {
      return node.getAttribute('contenteditable') !== undefined ||
          Boolean(node.parentNode && isContentEditable(node.parentNode));
    };
    const isDisabled = (node: SDK.DOMModel.DOMNode): boolean => {
      return node.getAttribute('disabled') !== undefined;
    };
    const isMutable = (node: SDK.DOMModel.DOMNode): boolean => {
      if (isElementOfTypes(node, ['input', 'textarea'])) {
        return node.getAttribute('readonly') === undefined && !isDisabled(node);
      }
      return isContentEditable(node);
    };
    // An autonomous custom element is called a form-associated custom element if the element is associated with a custom element definition whose form-associated field is set to true.
    // https://html.spec.whatwg.org/multipage/custom-elements.html#form-associated-custom-element
    const isFormAssociatedCustomElement = async(node: SDK.DOMModel.DOMNode): Promise<boolean> => {
      function getFormAssociatedField(this: HTMLElement): boolean {
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
    } else {
      hideSpecificCheckbox(SpecificPseudoStates.ENABLED, true);
      hideSpecificCheckbox(SpecificPseudoStates.DISABLED, true);
    }

    if (isElementOfTypes(node, ['button', 'fieldset', 'input', 'object', 'output', 'select', 'textarea', 'img']) ||
        isFormAssociated) {
      hideSpecificCheckbox(SpecificPseudoStates.VALID, false);
      hideSpecificCheckbox(SpecificPseudoStates.INVALID, false);
    } else {
      hideSpecificCheckbox(SpecificPseudoStates.VALID, true);
      hideSpecificCheckbox(SpecificPseudoStates.INVALID, true);
    }

    if (isElementOfTypes(node, ['input', 'select', 'textarea'])) {
      hideSpecificCheckbox(SpecificPseudoStates.USER_VALID, false);
      hideSpecificCheckbox(SpecificPseudoStates.USER_INVALID, false);
      if (node.getAttribute('required') === undefined) {
        hideSpecificCheckbox(SpecificPseudoStates.REQUIRED, false);
        hideSpecificCheckbox(SpecificPseudoStates.OPTIONAL, true);
      } else {
        hideSpecificCheckbox(SpecificPseudoStates.REQUIRED, true);
        hideSpecificCheckbox(SpecificPseudoStates.OPTIONAL, false);
      }
    } else {
      hideSpecificCheckbox(SpecificPseudoStates.USER_VALID, true);
      hideSpecificCheckbox(SpecificPseudoStates.USER_INVALID, true);
      hideSpecificCheckbox(SpecificPseudoStates.REQUIRED, true);
      hideSpecificCheckbox(SpecificPseudoStates.OPTIONAL, true);
    }

    if (isMutable(node)) {
      hideSpecificCheckbox(SpecificPseudoStates.READ_WRITE, true);
      hideSpecificCheckbox(SpecificPseudoStates.READ_ONLY, false);
    } else {
      hideSpecificCheckbox(SpecificPseudoStates.READ_WRITE, false);
      hideSpecificCheckbox(SpecificPseudoStates.READ_ONLY, true);
    }

    if (isElementOfTypes(node, ['input']) &&
        (node.getAttribute('min') !== undefined || node.getAttribute('max') !== undefined)) {
      hideSpecificCheckbox(SpecificPseudoStates.IN_RANGE, false);
      hideSpecificCheckbox(SpecificPseudoStates.OUT_OF_RANGE, false);
    } else {
      hideSpecificCheckbox(SpecificPseudoStates.IN_RANGE, true);
      hideSpecificCheckbox(SpecificPseudoStates.OUT_OF_RANGE, true);
    }

    if (isElementOfTypes(node, ['a', 'area']) && node.getAttribute('href') !== undefined) {
      hideSpecificCheckbox(SpecificPseudoStates.VISITED, false);
      hideSpecificCheckbox(SpecificPseudoStates.LINK, false);
    } else {
      hideSpecificCheckbox(SpecificPseudoStates.VISITED, true);
      hideSpecificCheckbox(SpecificPseudoStates.LINK, true);
    }

    if (isInputWithTypeRadioOrCheckbox(node) || isElementOfTypes(node, ['option'])) {
      hideSpecificCheckbox(SpecificPseudoStates.CHECKED, false);
    } else {
      hideSpecificCheckbox(SpecificPseudoStates.CHECKED, true);
    }

    if (isInputWithTypeRadioOrCheckbox(node) || isElementOfTypes(node, ['progress'])) {
      hideSpecificCheckbox(SpecificPseudoStates.INDETERMINATE, false);
    } else {
      hideSpecificCheckbox(SpecificPseudoStates.INDETERMINATE, true);
    }

    if (isElementOfTypes(node, ['input', 'textarea'])) {
      hideSpecificCheckbox(SpecificPseudoStates.PLACEHOLDER_SHOWN, false);
    } else {
      hideSpecificCheckbox(SpecificPseudoStates.PLACEHOLDER_SHOWN, true);
    }

    if (isElementOfTypes(node, ['input'])) {
      hideSpecificCheckbox(SpecificPseudoStates.AUTOFILL, false);
    } else {
      hideSpecificCheckbox(SpecificPseudoStates.AUTOFILL, true);
    }

    this.specificHeader.hidden = showedACheckbox ? false : true;
    this.updateElementSpecificStatesTableForTest();
  }

  updateElementSpecificStatesTableForTest(): void {
  }
}

let buttonProviderInstance: ButtonProvider;
export class ButtonProvider implements UI.Toolbar.Provider {
  private readonly button: UI.Toolbar.ToolbarToggle;
  private view: ElementStatePaneWidget;
  private constructor() {
    this.button = new UI.Toolbar.ToolbarToggle(i18nString(UIStrings.toggleElementState), 'hover');
    this.button.addEventListener(UI.Toolbar.ToolbarButton.Events.CLICK, this.clicked, this);
    this.button.element.classList.add('element-state');
    this.button.element.setAttribute('jslog', `${VisualLogging.toggleSubpane('element-states').track({click: true})}`);
    this.button.element.style.setProperty('--dot-toggle-top', '12px');
    this.button.element.style.setProperty('--dot-toggle-left', '18px');
    this.view = new ElementStatePaneWidget();
  }
  static instance(opts: {
    forceNew: boolean|null,
  } = {forceNew: null}): ButtonProvider {
    const {forceNew} = opts;
    if (!buttonProviderInstance || forceNew) {
      buttonProviderInstance = new ButtonProvider();
    }
    return buttonProviderInstance;
  }
  private clicked(): void {
    ElementsPanel.instance().showToolbarPane(!this.view.isShowing() ? this.view : null, this.button);
  }
  item(): UI.Toolbar.ToolbarToggle {
    return this.button;
  }
}
