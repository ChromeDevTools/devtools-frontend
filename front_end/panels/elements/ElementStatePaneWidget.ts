// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as IconButton from '../../ui/components/icon_button/icon_button.js';
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
};
const str_ = i18n.i18n.registerUIStrings('panels/elements/ElementStatePaneWidget.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class ElementStatePaneWidget extends UI.Widget.Widget {
  private readonly inputs: HTMLInputElement[];
  private readonly inputStates: WeakMap<HTMLInputElement, string>;
  private cssModel?: SDK.CSSModel.CSSModel|null;
  constructor() {
    super(true);
    this.contentElement.className = 'styles-element-state-pane';
    this.contentElement.setAttribute('jslog', `${VisualLogging.pane('element-states')}`);
    const inputs: HTMLInputElement[] = [];
    this.inputs = inputs;
    this.inputStates = new WeakMap();
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
      node.domModel().cssModel().forcePseudoState(node, state, event.target.checked);
    };
    const createElementStateCheckbox = (state: string): Element => {
      const td = document.createElement('td');
      const label = UI.UIUtils.CheckboxLabel.create(':' + state);
      const input = label.checkboxElement;
      this.inputStates.set(input, state);
      input.addEventListener('click', (clickListener as EventListener), false);
      input.setAttribute('jslog', `${VisualLogging.toggle().track({click: true}).context(state)}`);
      inputs.push(input);
      td.appendChild(label);
      return td;
    };
    const createEmulateFocusedPageCheckbox = (): Element => {
      const div = document.createElement('div');
      div.classList.add('page-state-checkbox');
      const label = UI.UIUtils.CheckboxLabel.create(i18nString(UIStrings.emulateFocusedPage));
      UI.SettingsUI.bindCheckbox(
          label.checkboxElement, Common.Settings.Settings.instance().moduleSetting('emulate-page-focus'), {
            enable: Host.UserMetrics.Action.ToggleEmulateFocusedPageFromStylesPaneOn,
            disable: Host.UserMetrics.Action.ToggleEmulateFocusedPageFromStylesPaneOff,
          });
      UI.Tooltip.Tooltip.install(label.textElement, i18nString(UIStrings.emulatesAFocusedPage));

      const link = UI.XLink.XLink.create(
          'https://goo.gle/devtools-emulate-focused-page', undefined, undefined, undefined, 'learn-more');
      link.textContent = '';
      link.style.setProperty('display', 'inline-flex');

      const icon = new IconButton.Icon.Icon();
      icon.data = {iconName: 'help', color: 'var(--icon-default)', width: '16px', height: '16px'};
      link.prepend(icon);

      div.appendChild(label);
      div.appendChild(link);
      return div;
    };

    this.contentElement.className = 'styles-element-state-pane';

    // Populate page states
    const keepPageFocusedCheckbox = createEmulateFocusedPageCheckbox();

    this.contentElement.appendChild(keepPageFocusedCheckbox);

    // Populate element states
    this.contentElement.appendChild(createSectionHeader(i18nString(UIStrings.forceElementState)));

    const table = document.createElement('table');
    table.classList.add('source-code');
    UI.ARIAUtils.markAsPresentation(table);

    let tr = table.createChild('tr');
    tr.appendChild(createElementStateCheckbox('active'));
    tr.appendChild(createElementStateCheckbox('hover'));
    tr = table.createChild('tr');
    tr.appendChild(createElementStateCheckbox('focus'));
    tr.appendChild(createElementStateCheckbox('visited'));
    tr = table.createChild('tr');
    tr.appendChild(createElementStateCheckbox('focus-within'));
    tr.appendChild(createElementStateCheckbox('focus-visible'));
    tr = table.createChild('tr');
    tr.appendChild(createElementStateCheckbox('target'));
    this.contentElement.appendChild(table);
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
    ButtonProvider.instance().item().setToggled(this.inputs.some(input => input.checked));
  }
}
let buttonProviderInstance: ButtonProvider;
export class ButtonProvider implements UI.Toolbar.Provider {
  private readonly button: UI.Toolbar.ToolbarToggle;
  private view: ElementStatePaneWidget;
  private constructor() {
    this.button = new UI.Toolbar.ToolbarToggle(i18nString(UIStrings.toggleElementState), '');
    this.button.setText(i18n.i18n.lockedString(':hov'));
    this.button.setToggleWithDot(true);
    this.button.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, this.clicked, this);
    this.button.element.classList.add('monospace');
    this.button.element.setAttribute('jslog', `${VisualLogging.toggleSubpane('element-states').track({click: true})}`);
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
    ElementsPanel.instance().showToolbarPane(!this.view.isShowing() ? this.view : null, null);
  }
  item(): UI.Toolbar.ToolbarToggle {
    return this.button;
  }
}
