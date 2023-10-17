// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import classesPaneWidgetStyles from './classesPaneWidget.css.js';
import {ElementsPanel} from './ElementsPanel.js';

const UIStrings = {
  /**
   * @description Prompt text for a text field in the Classes Pane Widget of the Elements panel.
   * Class refers to a CSS class.
   */
  addNewClass: 'Add new class',
  /**
   * @description Screen reader announcement string when adding a CSS class via the Classes Pane Widget.
   * @example {vbox flex-auto} PH1
   */
  classesSAdded: 'Classes {PH1} added',
  /**
   * @description Screen reader announcement string when adding a class via the Classes Pane Widget.
   * @example {title-container} PH1
   */
  classSAdded: 'Class {PH1} added',
  /**
   * @description Accessible title read by screen readers for the Classes Pane Widget of the Elements
   * panel. Element is a HTML DOM Element and classes refers to CSS classes.
   */
  elementClasses: 'Element Classes',
};
const str_ = i18n.i18n.registerUIStrings('panels/elements/ClassesPaneWidget.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class ClassesPaneWidget extends UI.Widget.Widget {
  private input: HTMLElement;
  private readonly classesContainer: HTMLElement;
  private readonly prompt: ClassNamePrompt;
  private readonly mutatingNodes: Set<SDK.DOMModel.DOMNode>;
  private readonly pendingNodeClasses: Map<SDK.DOMModel.DOMNode, string>;
  private readonly updateNodeThrottler: Common.Throttler.Throttler;
  private previousTarget: SDK.DOMModel.DOMNode|null;

  constructor() {
    super(true);
    this.contentElement.className = 'styles-element-classes-pane';
    this.contentElement.setAttribute('jslog', `${VisualLogging.elementClassesPane()}`);
    const container = this.contentElement.createChild('div', 'title-container');
    this.input = container.createChild('div', 'new-class-input monospace');
    this.setDefaultFocusedElement(this.input);
    this.classesContainer = this.contentElement.createChild('div', 'source-code');
    this.classesContainer.classList.add('styles-element-classes-container');
    this.prompt = new ClassNamePrompt(this.nodeClasses.bind(this));
    this.prompt.setAutocompletionTimeout(0);
    this.prompt.renderAsBlock();

    const proxyElement = (this.prompt.attach(this.input) as HTMLElement);
    this.prompt.setPlaceholder(i18nString(UIStrings.addNewClass));
    this.prompt.addEventListener(UI.TextPrompt.Events.TextChanged, this.onTextChanged, this);
    proxyElement.addEventListener('keydown', this.onKeyDown.bind(this), false);
    proxyElement.setAttribute('jslog', `${VisualLogging.addElementClassPrompt().track({keydown: 'Enter'})}`);

    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.DOMModel.DOMModel, SDK.DOMModel.Events.DOMMutated, this.onDOMMutated, this, {scoped: true});
    this.mutatingNodes = new Set();
    this.pendingNodeClasses = new Map();
    this.updateNodeThrottler = new Common.Throttler.Throttler(0);
    this.previousTarget = null;
    UI.Context.Context.instance().addFlavorChangeListener(SDK.DOMModel.DOMNode, this.onSelectedNodeChanged, this);
  }

  private splitTextIntoClasses(text: string): string[] {
    return text.split(/[,\s]/).map(className => className.trim()).filter(className => className.length);
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (!(event.key === 'Enter') && !Platform.KeyboardUtilities.isEscKey(event)) {
      return;
    }

    if (event.key === 'Enter') {
      event.consume();
      if (this.prompt.acceptAutoComplete()) {
        return;
      }
    }

    const eventTarget = (event.target as HTMLElement);
    let text: ''|string = (eventTarget.textContent as string);
    if (Platform.KeyboardUtilities.isEscKey(event)) {
      if (!Platform.StringUtilities.isWhitespace(text)) {
        event.consume(true);
      }
      text = '';
    }

    this.prompt.clearAutocomplete();
    eventTarget.textContent = '';

    const node = UI.Context.Context.instance().flavor(SDK.DOMModel.DOMNode);
    if (!node) {
      return;
    }

    const classNames = this.splitTextIntoClasses(text);
    if (!classNames.length) {
      this.installNodeClasses(node);
      return;
    }

    for (const className of classNames) {
      this.toggleClass(node, className, true);
    }

    // annoucementString is used for screen reader to announce that the class(es) has been added successfully.
    const joinClassString = classNames.join(' ');
    const announcementString = classNames.length > 1 ? i18nString(UIStrings.classesSAdded, {PH1: joinClassString}) :
                                                       i18nString(UIStrings.classSAdded, {PH1: joinClassString});
    UI.ARIAUtils.alert(announcementString);

    this.installNodeClasses(node);
    this.update();
  }

  private onTextChanged(): void {
    const node = UI.Context.Context.instance().flavor(SDK.DOMModel.DOMNode);
    if (!node) {
      return;
    }
    this.installNodeClasses(node);
  }

  private onDOMMutated(event: Common.EventTarget.EventTargetEvent<SDK.DOMModel.DOMNode>): void {
    const node = event.data;
    if (this.mutatingNodes.has(node)) {
      return;
    }
    cachedClassesMap.delete(node);
    this.update();
  }

  private onSelectedNodeChanged(event: Common.EventTarget.EventTargetEvent<SDK.DOMModel.DOMNode|null>): void {
    if (this.previousTarget && this.prompt.text()) {
      this.input.textContent = '';
      this.installNodeClasses(this.previousTarget);
    }
    this.previousTarget = event.data;
    this.update();
  }

  override wasShown(): void {
    super.wasShown();
    this.update();
    this.registerCSSFiles([classesPaneWidgetStyles]);
  }

  private update(): void {
    if (!this.isShowing()) {
      return;
    }

    let node = UI.Context.Context.instance().flavor(SDK.DOMModel.DOMNode);
    if (node) {
      node = node.enclosingElementOrSelf();
    }

    this.classesContainer.removeChildren();
    // @ts-ignore this.input is a div, not an input element. So this line makes no sense at all
    this.input.disabled = !node;

    if (!node) {
      return;
    }

    const classes = this.nodeClasses(node);
    const keys = [...classes.keys()];
    keys.sort(Platform.StringUtilities.caseInsensetiveComparator);
    for (const className of keys) {
      const label = UI.UIUtils.CheckboxLabel.create(className, classes.get(className));
      label.classList.add('monospace');
      label.checkboxElement.addEventListener('click', this.onClick.bind(this, className), false);
      this.classesContainer.appendChild(label);
    }
  }

  private onClick(className: string, event: Event): void {
    const node = UI.Context.Context.instance().flavor(SDK.DOMModel.DOMNode);
    if (!node) {
      return;
    }
    const enabled = (event.target as HTMLInputElement).checked;
    this.toggleClass(node, className, enabled);
    this.installNodeClasses(node);
  }

  private nodeClasses(node: SDK.DOMModel.DOMNode): Map<string, boolean> {
    let result = cachedClassesMap.get(node);
    if (!result) {
      const classAttribute = node.getAttribute('class') || '';
      const classes = classAttribute.split(/\s/);
      result = new Map();
      for (let i = 0; i < classes.length; ++i) {
        const className = classes[i].trim();
        if (!className.length) {
          continue;
        }
        result.set(className, true);
      }
      cachedClassesMap.set(node, result);
    }
    return result;
  }

  private toggleClass(node: SDK.DOMModel.DOMNode, className: string, enabled: boolean): void {
    const classes = this.nodeClasses(node);
    classes.set(className, enabled);
  }

  private installNodeClasses(node: SDK.DOMModel.DOMNode): void {
    const classes = this.nodeClasses(node);
    const activeClasses = new Set<string>();
    for (const className of classes.keys()) {
      if (classes.get(className)) {
        activeClasses.add(className);
      }
    }

    const additionalClasses = this.splitTextIntoClasses(this.prompt.textWithCurrentSuggestion());
    for (const className of additionalClasses) {
      activeClasses.add(className);
    }

    const newClasses = [...activeClasses.values()].sort();

    this.pendingNodeClasses.set(node, newClasses.join(' '));
    void this.updateNodeThrottler.schedule(this.flushPendingClasses.bind(this));
  }

  private async flushPendingClasses(): Promise<void> {
    const promises = [];
    for (const node of this.pendingNodeClasses.keys()) {
      this.mutatingNodes.add(node);
      const promise = node.setAttributeValuePromise('class', (this.pendingNodeClasses.get(node) as string))
                          .then(onClassValueUpdated.bind(this, node));
      promises.push(promise);
    }
    this.pendingNodeClasses.clear();
    await Promise.all(promises);

    function onClassValueUpdated(this: ClassesPaneWidget, node: SDK.DOMModel.DOMNode): void {
      this.mutatingNodes.delete(node);
    }
  }
}

const cachedClassesMap = new WeakMap<SDK.DOMModel.DOMNode, Map<string, boolean>>();

let buttonProviderInstance: ButtonProvider;

export class ButtonProvider implements UI.Toolbar.Provider {
  private readonly button: UI.Toolbar.ToolbarToggle;
  private view: ClassesPaneWidget;
  private constructor() {
    this.button = new UI.Toolbar.ToolbarToggle(i18nString(UIStrings.elementClasses), '');
    this.button.setText('.cls');
    this.button.element.classList.add('monospace');
    this.button.element.setAttribute(
        'jslog', `${VisualLogging.toggleSubpane().track({click: true}).context('elementClassesPane')}`);
    this.button.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, this.clicked, this);
    this.view = new ClassesPaneWidget();
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

  item(): UI.Toolbar.ToolbarItem {
    return this.button;
  }
}

export class ClassNamePrompt extends UI.TextPrompt.TextPrompt {
  private readonly nodeClasses: (arg0: SDK.DOMModel.DOMNode) => Map<string, boolean>;
  private selectedFrameId: string|null;
  private classNamesPromise: Promise<string[]>|null;
  constructor(nodeClasses: (arg0: SDK.DOMModel.DOMNode) => Map<string, boolean>) {
    super();
    this.nodeClasses = nodeClasses;
    this.initialize(this.buildClassNameCompletions.bind(this), ' ');
    this.disableDefaultSuggestionForEmptyInput();
    this.selectedFrameId = '';
    this.classNamesPromise = null;
  }

  private async getClassNames(selectedNode: SDK.DOMModel.DOMNode): Promise<string[]> {
    const promises = [];
    const completions = new Set<string>();
    this.selectedFrameId = selectedNode.frameId();

    const cssModel = selectedNode.domModel().cssModel();
    const allStyleSheets = cssModel.allStyleSheets();
    for (const stylesheet of allStyleSheets) {
      if (stylesheet.frameId !== this.selectedFrameId) {
        continue;
      }
      const cssPromise = cssModel.getClassNames(stylesheet.id).then(classes => {
        for (const className of classes) {
          completions.add(className);
        }
      });
      promises.push(cssPromise);
    }

    const ownerDocumentId = ((selectedNode.ownerDocument as SDK.DOMModel.DOMDocument).id);

    const domPromise = selectedNode.domModel().classNamesPromise(ownerDocumentId).then(classes => {
      for (const className of classes) {
        completions.add(className);
      }
    });
    promises.push(domPromise);
    await Promise.all(promises);
    return [...completions];
  }

  private async buildClassNameCompletions(expression: string, prefix: string, force?: boolean):
      Promise<UI.SuggestBox.Suggestions> {
    if (!prefix || force) {
      this.classNamesPromise = null;
    }

    const selectedNode = UI.Context.Context.instance().flavor(SDK.DOMModel.DOMNode);
    if (!selectedNode || (!prefix && !force && !expression.trim())) {
      return [];
    }

    if (!this.classNamesPromise || this.selectedFrameId !== selectedNode.frameId()) {
      this.classNamesPromise = this.getClassNames(selectedNode);
    }

    let completions: string[] = await this.classNamesPromise;
    const classesMap = this.nodeClasses((selectedNode as SDK.DOMModel.DOMNode));
    completions = completions.filter(value => !classesMap.get(value));

    if (prefix[0] === '.') {
      completions = completions.map(value => '.' + value);
    }
    return completions.filter(value => value.startsWith(prefix)).sort().map(completion => {
      return {
        text: completion,
        title: undefined,
        subtitle: undefined,
        priority: undefined,
        isSecondary: undefined,
        subtitleRenderer: undefined,
        selectionRange: undefined,
        hideGhostText: undefined,
        iconElement: undefined,
      };
    });
  }
}
