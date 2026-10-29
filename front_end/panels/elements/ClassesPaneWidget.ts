// Copyright 2015 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
import {Directives, html, render} from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import classesPaneWidgetStyles from './classesPaneWidget.css.js';
import {ElementsPanel} from './ElementsPanel.js';

const UIStrings = {
  /**
   * @description Prompt text for a text field to add CSS classes to the selected element in the Styles tab of the Elements panel.
   * Class refers to a CSS class.
   */
  addNewClass: 'Add new class',
  /**
   * @description Screen reader announcement string when adding CSS classes to the selected element in the Styles tab of the Elements panel.
   * @example {vbox flex-auto} PH1
   */
  classesSAdded: 'Classes {PH1} added',
  /**
   * @description Screen reader announcement string when adding a CSS class to the selected element in the Styles tab of the Elements panel.
   * @example {title-container} PH1
   */
  classSAdded: 'Class {PH1} added',
  /**
   * @description Accessible title read by screen readers for the element classes widget in the Styles tab of the Elements
   * panel. Element is an HTML DOM element and classes refers to CSS classes.
   */
  elementClasses: 'Element classes',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/elements/ClassesPaneWidget.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

const {ref, repeat} = Directives;

export interface ClassItem {
  className: string;
  enabled: boolean;
}

export interface ViewInput {
  classes: ClassItem[];
  onCommit: () => void;
  /** Returns whether the prompt had text to discard, in which case the key event is fully consumed. */
  onCancel: () => boolean;
  onClick: (className: string, enabled: boolean) => void;
}

export interface ViewOutput {
  attachPrompt?: (prompt: UI.TextPrompt.TextPrompt) => void;
}

export type View = (input: ViewInput, output: ViewOutput, target: HTMLElement) => void;

export const DEFAULT_VIEW: View = (input, output, target) => {
  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === Platform.KeyboardUtilities.ENTER_KEY && !event.isComposing) {
      event.consume();
      input.onCommit();
    } else if (Platform.KeyboardUtilities.isEscKey(event) && input.onCancel()) {
      // Escape discarded non-empty prompt text, so stop it here instead of letting
      // it reach global DevTools shortcuts (e.g. closing the drawer).
      event.consume(true);
    }
  };
  // clang-format off
  render(html`
    <style>${classesPaneWidgetStyles}</style>
    <div class="styles-element-classes-pane">
      <div class="title-container" @keydown=${onKeyDown}>
        <div class="new-class-input monospace" autofocus ${ref(element => {
          output.attachPrompt = element instanceof HTMLElement ? prompt => prompt.attach(element) : undefined;
        })}></div>
      </div>
      <div class="source-code styles-element-classes-container">
        ${repeat(input.classes, item => item.className, item => html`
          <devtools-checkbox
              class="monospace"
              small
              .checked=${item.enabled}
              title=${item.className}
              jslog=${VisualLogging.toggle('element-class').track({change: true})}
              @click=${(event: Event) => input.onClick(item.className, (event.target as UI.UIUtils.CheckboxLabel).checked)}>${item.className}</devtools-checkbox>`)}
      </div>
    </div>`, target, {container: {attributes: {jslog: `${VisualLogging.pane('elements-classes')}`}}});
  // clang-format on
};

export class ClassesPaneWidget extends UI.Widget.Widget {
  readonly #view: View;
  readonly #prompt: ClassNamePrompt;
  #promptAttached = false;
  readonly #mutatingNodes: Set<SDK.DOMModel.DOMNode>;
  readonly #pendingNodeClasses: Map<SDK.DOMModel.DOMNode, string>;
  readonly #updateNodeThrottler: Common.Throttler.Throttler;
  #previousTarget: SDK.DOMModel.DOMNode|null;

  constructor(element?: HTMLElement, view: View = DEFAULT_VIEW) {
    super(element, {
      useShadowDom: true,
    });
    this.#view = view;
    this.#prompt = new ClassNamePrompt(this.nodeClasses.bind(this));
    this.#prompt.setAutocompletionTimeout(0);
    this.#prompt.renderAsBlock();

    this.#prompt.addEventListener(UI.TextPrompt.Events.TEXT_CHANGED, this.onTextChanged, this);

    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.DOMModel.DOMModel, SDK.DOMModel.Events.DOMMutated, this.onDOMMutated, this, {scoped: true});
    this.#mutatingNodes = new Set();
    this.#pendingNodeClasses = new Map();
    this.#updateNodeThrottler = new Common.Throttler.Throttler(0);
    this.#previousTarget = null;
    UI.Context.Context.instance().addFlavorChangeListener(SDK.DOMModel.DOMNode, this.onSelectedNodeChanged, this);
  }

  private splitTextIntoClasses(text: string): string[] {
    return text.split(/[,\s]/)
        .map(className => className.trim().replace(/^\./, ''))
        .filter(className => className.length);
  }

  private onCommit(): void {
    if (this.#prompt.acceptAutoComplete()) {
      return;
    }
    this.applyPromptText(this.#prompt.text());
  }

  /** Discards the prompt text and returns whether there was any non-whitespace text to discard. */
  private onCancel(): boolean {
    const hadText = !Platform.StringUtilities.isWhitespace(this.#prompt.text());
    this.applyPromptText('');
    return hadText;
  }

  private applyPromptText(text: string): void {
    this.#prompt.setText('');

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
    UI.ARIAUtils.LiveAnnouncer.alert(announcementString);

    this.installNodeClasses(node);
    this.requestUpdate();
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
    if (this.#mutatingNodes.has(node)) {
      return;
    }
    cachedClassesMap.delete(node);
    this.requestUpdate();
  }

  private onSelectedNodeChanged(event: Common.EventTarget.EventTargetEvent<SDK.DOMModel.DOMNode|null>): void {
    if (this.#previousTarget && this.#promptAttached && this.#prompt.text()) {
      this.#prompt.setText('');
      this.installNodeClasses(this.#previousTarget);
    }
    this.#previousTarget = event.data;
    this.requestUpdate();
  }

  override wasShown(): void {
    super.wasShown();
    // Render synchronously rather than via requestUpdate(): callers such as
    // StylesSidebarPane.showToolbarPane() focus the widget right after show(),
    // so the autofocus prompt must already exist. This also re-reads the
    // selected node, which may have changed while the pane was hidden.
    this.performUpdate();
  }

  override performUpdate(): void {
    let node = UI.Context.Context.instance().flavor(SDK.DOMModel.DOMNode);
    if (node) {
      node = node.enclosingElementOrSelf();
    }

    const classes = node ? this.nodeClasses(node) : new Map<string, boolean>();
    const keys = [...classes.keys()];
    keys.sort(Platform.StringUtilities.caseInsensetiveComparator);
    const input: ViewInput = {
      classes: keys.map(className => ({className, enabled: Boolean(classes.get(className))})),
      onCommit: this.onCommit.bind(this),
      onCancel: this.onCancel.bind(this),
      onClick: this.onClick.bind(this),
    };
    const output: ViewOutput = {};
    this.#view(input, output, this.contentElement);
    if (output.attachPrompt && !this.#promptAttached) {
      output.attachPrompt(this.#prompt);
      this.#prompt.setPlaceholder(i18nString(UIStrings.addNewClass));
      this.#promptAttached = true;
    }
    if (this.#promptAttached) {
      // Classes can only be added to a selected node.
      this.#prompt.setEnabled(Boolean(node));
    }
  }

  private onClick(className: string, enabled: boolean): void {
    const node = UI.Context.Context.instance().flavor(SDK.DOMModel.DOMNode);
    if (!node) {
      return;
    }
    this.toggleClass(node, className, enabled);
    this.installNodeClasses(node);
    this.requestUpdate();
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
    ButtonProvider.instance().item().setChecked([...classes.values()].includes(true));
  }

  private installNodeClasses(node: SDK.DOMModel.DOMNode): void {
    const classes = this.nodeClasses(node);
    const activeClasses = new Set<string>();
    for (const className of classes.keys()) {
      if (classes.get(className)) {
        activeClasses.add(className);
      }
    }

    const additionalClasses = this.splitTextIntoClasses(this.#prompt.textWithCurrentSuggestion());
    for (const className of additionalClasses) {
      activeClasses.add(className);
    }

    const newClasses = [...activeClasses.values()].sort();

    this.#pendingNodeClasses.set(node, newClasses.join(' '));
    void this.#updateNodeThrottler.schedule(this.flushPendingClasses.bind(this));
  }

  private async flushPendingClasses(): Promise<void> {
    const promises = [];
    for (const node of this.#pendingNodeClasses.keys()) {
      this.#mutatingNodes.add(node);
      const promise = node.setAttributeValuePromise('class', (this.#pendingNodeClasses.get(node) as string))
                          .then(onClassValueUpdated.bind(this, node));
      promises.push(promise);
    }
    this.#pendingNodeClasses.clear();
    await Promise.all(promises);

    function onClassValueUpdated(this: ClassesPaneWidget, node: SDK.DOMModel.DOMNode): void {
      this.#mutatingNodes.delete(node);
    }
  }
}

const cachedClassesMap = new WeakMap<SDK.DOMModel.DOMNode, Map<string, boolean>>();

let buttonProviderInstance: ButtonProvider;

export class ButtonProvider implements UI.Toolbar.Provider {
  private readonly button: UI.Toolbar.ToolbarToggle;
  private view: ClassesPaneWidget;
  private constructor() {
    this.button = new UI.Toolbar.ToolbarToggle(i18nString(UIStrings.elementClasses), 'class');
    this.button.element.style.setProperty('--dot-toggle-top', '12px');
    this.button.element.style.setProperty('--dot-toggle-left', '18px');
    this.button.element.setAttribute(
        'jslog', `${VisualLogging.toggleSubpane('elements-classes').track({click: true})}`);
    this.button.addEventListener(UI.Toolbar.ToolbarButton.Events.CLICK, this.clicked, this);
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

  item(): UI.Toolbar.ToolbarToggle {
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

  private async buildClassNameCompletions(expression: string, prefix: string,
                                          force?: boolean): Promise<UI.SuggestBox.Suggestions> {
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
    const classesMap = this.nodeClasses((selectedNode));
    // Classes may be typed with a leading dot (e.g. `.btn`), while completions
    // are raw class names, so normalize before de-duplicating.
    const existingClasses =
        new Set(expression.split(/[,\s]/).map(className => className.trim().replace(/^\./, '')).filter(Boolean));
    completions = completions.filter(value => !classesMap.get(value) && !existingClasses.has(value));

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
