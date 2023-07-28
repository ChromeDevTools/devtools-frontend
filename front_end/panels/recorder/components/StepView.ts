// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../core/i18n/i18n.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as IconButton from '../../../ui/components/icon_button/icon_button.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';
import * as Menus from '../../../ui/components/menus/menus.js';

import type * as Converters from '../converters/converters.js';
import * as Models from '../models/models.js';

import stepViewStyles from './stepView.css.js';

import {type StepEditedEvent} from './StepEditor.js';

import {
  TimelineSection,
  type TimelineSectionData,
} from './TimelineSection.js';

const UIStrings = {
  /**
   *@description Title for the step type that configures the viewport
   */
  setViewportClickTitle: 'Set viewport',
  /**
   *@description Title for the customStep step type
   */
  customStepTitle: 'Custom step',
  /**
   *@description Title for the click step type
   */
  clickStepTitle: 'Click',
  /**
   *@description Title for the double click step type
   */
  doubleClickStepTitle: 'Double click',
  /**
   *@description Title for the hover step type
   */
  hoverStepTitle: 'Hover',
  /**
   *@description Title for the emulateNetworkConditions step type
   */
  emulateNetworkConditionsStepTitle: 'Emulate network conditions',
  /**
   *@description Title for the change step type
   */
  changeStepTitle: 'Change',
  /**
   *@description Title for the close step type
   */
  closeStepTitle: 'Close',
  /**
   *@description Title for the scroll step type
   */
  scrollStepTitle: 'Scroll',
  /**
   *@description Title for the key up step type. `up` refers to the state of the keyboard key: it's released, i.e., up. It does not refer to the down arrow key specifically.
   */
  keyUpStepTitle: 'Key up',
  /**
   *@description Title for the navigate step type
   */
  navigateStepTitle: 'Navigate',
  /**
   *@description Title for the key down step type. `down` refers to the state of the keyboard key: it's pressed, i.e., down. It does not refer to the down arrow key specifically.
   */
  keyDownStepTitle: 'Key down',
  /**
   *@description Title for the waitForElement step type
   */
  waitForElementStepTitle: 'Wait for element',
  /**
   *@description Title for the waitForExpression step type
   */
  waitForExpressionStepTitle: 'Wait for expression',
  /**
   *@description Title for elements with role button
   */
  elementRoleButton: 'Button',
  /**
   *@description Title for elements with role input
   */
  elementRoleInput: 'Input',
  /**
   *@description Default title for elements without a specific role
   */
  elementRoleFallback: 'Element',
  /**
   *@description The title of the button in the step's context menu that adds a new step before the current one.
   */
  addStepBefore: 'Add step before',
  /**
   *@description The title of the button in the step's context menu that adds a new step after the current one.
   */
  addStepAfter: 'Add step after',
  /**
   *@description The title of the button in the step's context menu that removes the step.
   */
  removeStep: 'Remove step',
  /**
   *@description The title of the button that open the step's context menu.
   */
  openStepActions: 'Open step actions',
  /**
   *@description The title of the button in the step's context menu that adds a breakpoint.
   */
  addBreakpoint: 'Add breakpoint',
  /**
   *@description The title of the button in the step's context menu that removes a breakpoint.
   */
  removeBreakpoint: 'Remove breakpoint',
  /**
   * @description A menu item item in the context menu that expands another menu which list all
   * the formats the user can copy the recording as.
   */
  copyAs: 'Copy as',
  /**
   * @description The title of the menu group that holds actions on recording steps.
   */
  stepManagement: 'Manage steps',
  /**
   * @description The title of the menu group that holds actions related to breakpoints.
   */
  breakpoints: 'Breakpoints',
};
const str_ = i18n.i18n.registerUIStrings(
    'panels/recorder/components/StepView.ts',
    UIStrings,
);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-step-view': StepView;
  }
}

export const enum State {
  Default = 'default',
  Success = 'success',
  Current = 'current',
  Outstanding = 'outstanding',
  Error = 'error',
  Stopped = 'stopped',
}

export interface StepViewData {
  state: State;
  step?: Models.Schema.Step;
  section?: Models.Section.Section;
  error?: Error;
  hasBreakpoint: boolean;
  isEndOfGroup: boolean;
  isStartOfGroup: boolean;
  isFirstSection: boolean;
  isLastSection: boolean;
  stepIndex: number;
  sectionIndex: number;
  isRecording: boolean;
  isPlaying: boolean;
  removable: boolean;
  builtInConverters: Converters.Converter.Converter[];
  extensionConverters: Converters.Converter.Converter[];
  isSelected: boolean;
  recorderSettings: Models.RecorderSettings.RecorderSettings;
}

export class CaptureSelectorsEvent extends Event {
  static readonly eventName = 'captureselectors';
  data: Models.Schema.StepWithSelectors&Partial<Models.Schema.ClickAttributes>;

  constructor(
      step: Models.Schema.StepWithSelectors&Partial<Models.Schema.ClickAttributes>,
  ) {
    super(CaptureSelectorsEvent.eventName, {bubbles: true, composed: true});
    this.data = step;
  }
}

export class StopSelectorsCaptureEvent extends Event {
  static readonly eventName = 'stopselectorscapture';
  constructor() {
    super(StopSelectorsCaptureEvent.eventName, {
      bubbles: true,
      composed: true,
    });
  }
}

export class CopyStepEvent extends Event {
  static readonly eventName = 'copystep';
  step: Models.Schema.Step;
  constructor(step: Models.Schema.Step) {
    super(CopyStepEvent.eventName, {bubbles: true, composed: true});
    this.step = step;
  }
}

export class StepChanged extends Event {
  static readonly eventName = 'stepchanged';
  currentStep: Models.Schema.Step;
  newStep: Models.Schema.Step;

  constructor(currentStep: Models.Schema.Step, newStep: Models.Schema.Step) {
    super(StepChanged.eventName, {bubbles: true, composed: true});
    this.currentStep = currentStep;
    this.newStep = newStep;
  }
}

export const enum AddStepPosition {
  BEFORE = 'before',
  AFTER = 'after',
}

export class AddStep extends Event {
  static readonly eventName = 'addstep';
  position: AddStepPosition;
  stepOrSection: Models.Schema.Step|Models.Section.Section;

  constructor(
      stepOrSection: Models.Schema.Step|Models.Section.Section,
      position: AddStepPosition,
  ) {
    super(AddStep.eventName, {bubbles: true, composed: true});
    this.stepOrSection = stepOrSection;
    this.position = position;
  }
}

export class RemoveStep extends Event {
  static readonly eventName = 'removestep';
  step: Models.Schema.Step;

  constructor(step: Models.Schema.Step) {
    super(RemoveStep.eventName, {bubbles: true, composed: true});
    this.step = step;
  }
}

export class AddBreakpointEvent extends Event {
  static readonly eventName = 'addbreakpoint';
  index: number;

  constructor(index: number) {
    super(AddBreakpointEvent.eventName, {bubbles: true, composed: true});
    this.index = index;
  }
}

export class RemoveBreakpointEvent extends Event {
  static readonly eventName = 'removebreakpoint';
  index: number;

  constructor(index: number) {
    super(RemoveBreakpointEvent.eventName, {bubbles: true, composed: true});
    this.index = index;
  }
}

const COPY_ACTION_PREFIX = 'copy-step-as-';

type Action = {
  id: string,
  label: string,
  group: string,
  groupTitle: string,
};

export class StepView extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-step-view`;

  readonly #shadow = this.attachShadow({mode: 'open'});

  #step?: Models.Schema.Step;
  #section?: Models.Section.Section;
  #state = State.Default;
  #error?: Error;
  #showDetails: boolean = false;
  #isEndOfGroup: boolean = false;
  #isStartOfGroup: boolean = false;
  #stepIndex = 0;
  #sectionIndex = 0;
  #isFirstSection: boolean = false;
  #isLastSection: boolean = false;
  #isRecording = false;
  #isPlaying = false;
  #actionsMenuButton?: Buttons.Button.Button;
  #actionsMenuExpanded = false;
  #isVisible = false;
  #observer: IntersectionObserver = new IntersectionObserver(result => {
    this.#isVisible = result[0].isIntersecting;
  });
  #hasBreakpoint = false;
  #removable = true;
  #builtInConverters?: Converters.Converter.Converter[];
  #extensionConverters?: Converters.Converter.Converter[];
  #isSelected = false;
  #recorderSettings?: Models.RecorderSettings.RecorderSettings;

  set data(data: StepViewData) {
    const prevState = this.#state;
    this.#step = data.step;
    this.#section = data.section;
    this.#state = data.state;
    this.#error = data.error;
    this.#isEndOfGroup = data.isEndOfGroup;
    this.#isStartOfGroup = data.isStartOfGroup;
    this.#stepIndex = data.stepIndex;
    this.#sectionIndex = data.sectionIndex;
    this.#isFirstSection = data.isFirstSection;
    this.#isLastSection = data.isLastSection;
    this.#isRecording = data.isRecording;
    this.#isPlaying = data.isPlaying;
    this.#hasBreakpoint = data.hasBreakpoint;
    this.#removable = data.removable;
    this.#builtInConverters = data.builtInConverters;
    this.#extensionConverters = data.extensionConverters;
    this.#isSelected = data.isSelected;
    this.#recorderSettings = data.recorderSettings;

    this.#render();

    if (this.#state !== prevState && this.#state === 'current' && !this.#isVisible) {
      this.scrollIntoView();
    }
  }

  get step(): Models.Schema.Step|undefined {
    return this.#step;
  }

  get section(): Models.Section.Section|undefined {
    return this.#section;
  }

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [stepViewStyles];
    this.#observer.observe(this);
    this.#render();
  }

  disconnectedCallback(): void {
    this.#observer.unobserve(this);
  }

  #toggleShowDetails(): void {
    this.#showDetails = !this.#showDetails;
    this.#render();
  }

  #onToggleShowDetailsKeydown(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ') {
      this.#toggleShowDetails();
      event.stopPropagation();
      event.preventDefault();
    }
  }

  #getStepTypeTitle(): string|LitHtml.TemplateResult {
    if (this.#section) {
      return this.#section.title ? this.#section.title : LitHtml.html`<span class="fallback">(No Title)</span>`;
    }
    if (!this.#step) {
      throw new Error('Missing both step and section');
    }
    switch (this.#step.type) {
      case Models.Schema.StepType.CustomStep:
        return i18nString(UIStrings.customStepTitle);
      case Models.Schema.StepType.SetViewport:
        return i18nString(UIStrings.setViewportClickTitle);
      case Models.Schema.StepType.Click:
        return i18nString(UIStrings.clickStepTitle);
      case Models.Schema.StepType.DoubleClick:
        return i18nString(UIStrings.doubleClickStepTitle);
      case Models.Schema.StepType.Hover:
        return i18nString(UIStrings.hoverStepTitle);
      case Models.Schema.StepType.EmulateNetworkConditions:
        return i18nString(UIStrings.emulateNetworkConditionsStepTitle);
      case Models.Schema.StepType.Change:
        return i18nString(UIStrings.changeStepTitle);
      case Models.Schema.StepType.Close:
        return i18nString(UIStrings.closeStepTitle);
      case Models.Schema.StepType.Scroll:
        return i18nString(UIStrings.scrollStepTitle);
      case Models.Schema.StepType.KeyUp:
        return i18nString(UIStrings.keyUpStepTitle);
      case Models.Schema.StepType.KeyDown:
        return i18nString(UIStrings.keyDownStepTitle);
      case Models.Schema.StepType.WaitForElement:
        return i18nString(UIStrings.waitForElementStepTitle);
      case Models.Schema.StepType.WaitForExpression:
        return i18nString(UIStrings.waitForExpressionStepTitle);
      case Models.Schema.StepType.Navigate:
        return i18nString(UIStrings.navigateStepTitle);
    }
  }

  #getElementRoleTitle(role: string): string {
    switch (role) {
      case 'button':
        return i18nString(UIStrings.elementRoleButton);
      case 'input':
        return i18nString(UIStrings.elementRoleInput);
      default:
        return i18nString(UIStrings.elementRoleFallback);
    }
  }

  #getSelectorPreview(): string {
    if (!this.#step || !('selectors' in this.#step)) {
      return '';
    }

    const ariaSelector = this.#step.selectors.flat().find(selector => selector.startsWith('aria/'));

    if (!ariaSelector) {
      return '';
    }

    const m = ariaSelector.match(/^aria\/(.+?)(\[role="(.+)"\])?$/);
    if (!m) {
      return '';
    }

    return `${this.#getElementRoleTitle(m[3])} "${m[1]}"`;
  }

  #getSectionPreview(): string {
    if (!this.#section) {
      return '';
    }
    return this.#section.url;
  }

  #stepEdited(event: StepEditedEvent): void {
    const step = this.#step || this.#section?.causingStep;
    if (!step) {
      throw new Error('Expected step.');
    }
    this.dispatchEvent(new StepChanged(step, event.data));
  }

  #handleStepAction(event: Menus.Menu.MenuItemSelectedEvent): void {
    switch (event.itemValue) {
      case 'add-step-before': {
        const stepOrSection = this.#step || this.#section;
        if (!stepOrSection) {
          throw new Error('Expected step or section.');
        }
        this.dispatchEvent(new AddStep(stepOrSection, AddStepPosition.BEFORE));
        break;
      }
      case 'add-step-after': {
        const stepOrSection = this.#step || this.#section;
        if (!stepOrSection) {
          throw new Error('Expected step or section.');
        }
        this.dispatchEvent(new AddStep(stepOrSection, AddStepPosition.AFTER));
        break;
      }
      case 'remove-step': {
        const causingStep = this.#section?.causingStep;
        if (!this.#step && !causingStep) {
          throw new Error('Expected step.');
        }
        this.dispatchEvent(
            new RemoveStep(this.#step || (causingStep as Models.Schema.Step)),
        );
        break;
      }
      case 'add-breakpoint': {
        if (!this.#step) {
          throw new Error('Expected step');
        }
        this.dispatchEvent(new AddBreakpointEvent(this.#stepIndex));
        break;
      }
      case 'remove-breakpoint': {
        if (!this.#step) {
          throw new Error('Expected step');
        }
        this.dispatchEvent(new RemoveBreakpointEvent(this.#stepIndex));
        break;
      }
      default: {
        const actionId = event.itemValue as string;
        if (!actionId.startsWith(COPY_ACTION_PREFIX)) {
          throw new Error('Unknown step action.');
        }

        const copyStep = this.#step || this.#section?.causingStep;
        if (!copyStep) {
          throw new Error('Step not found.');
        }

        const converterId = actionId.substring(COPY_ACTION_PREFIX.length);
        if (this.#recorderSettings) {
          this.#recorderSettings.preferredCopyFormat = converterId;
        }

        this.dispatchEvent(new CopyStepEvent(structuredClone(copyStep)));
      }
    }
  }

  #onToggleActionsMenu(event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this.#actionsMenuExpanded = !this.#actionsMenuExpanded;
    this.#render();
  }

  #onCloseActionsMenu(): void {
    this.#actionsMenuExpanded = false;
    this.#render();
  }

  #onBreakpointClick(): void {
    if (this.#hasBreakpoint) {
      this.dispatchEvent(new RemoveBreakpointEvent(this.#stepIndex));
    } else {
      this.dispatchEvent(new AddBreakpointEvent(this.#stepIndex));
    }
    this.#render();
  }

  #getActionsMenuButton(): Buttons.Button.Button {
    if (!this.#actionsMenuButton) {
      throw new Error('Missing actionsMenuButton');
    }
    return this.#actionsMenuButton;
  }

  #getActions = (): Array<Action> => {
    const actions = [];

    if (!this.#isPlaying) {
      if (this.#step) {
        actions.push({
          id: 'add-step-before',
          label: i18nString(UIStrings.addStepBefore),
          group: 'stepManagement',
          groupTitle: i18nString(UIStrings.stepManagement),
        });
      }

      actions.push({
        id: 'add-step-after',
        label: i18nString(UIStrings.addStepAfter),
        group: 'stepManagement',
        groupTitle: i18nString(UIStrings.stepManagement),
      });

      if (this.#removable) {
        actions.push({
          id: 'remove-step',
          group: 'stepManagement',
          groupTitle: i18nString(UIStrings.stepManagement),
          label: i18nString(UIStrings.removeStep),
        });
      }
    }

    if (this.#step && !this.#isRecording) {
      if (this.#hasBreakpoint) {
        actions.push({
          id: 'remove-breakpoint',
          label: i18nString(UIStrings.removeBreakpoint),
          group: 'breakPointManagement',
          groupTitle: i18nString(UIStrings.breakpoints),
        });
      } else {
        actions.push({
          id: 'add-breakpoint',
          label: i18nString(UIStrings.addBreakpoint),
          group: 'breakPointManagement',
          groupTitle: i18nString(UIStrings.breakpoints),
        });
      }
    }

    if (this.#step) {
      for (const converter of this.#builtInConverters || []) {
        actions.push({
          id: COPY_ACTION_PREFIX + converter.getId(),
          label: converter.getFormatName(),
          group: 'copy',
          groupTitle: i18nString(UIStrings.copyAs),
        });
      }
      for (const converter of this.#extensionConverters || []) {
        actions.push({
          id: COPY_ACTION_PREFIX + converter.getId(),
          label: converter.getFormatName(),
          group: 'copy',
          groupTitle: i18nString(UIStrings.copyAs),
        });
      }
    }

    return actions;
  };

  #renderStepActions(): LitHtml.TemplateResult|null {
    const actions = this.#getActions();
    const groupsById = new Map<string, Action[]>();
    for (const action of actions) {
      const group = groupsById.get(action.group);
      if (!group) {
        groupsById.set(action.group, [action]);
      } else {
        group.push(action);
      }
    }
    const groups = [];
    for (const [group, actions] of groupsById) {
      groups.push({
        group,
        groupTitle: actions[0].groupTitle,
        actions,
      });
    }
    // clang-format off
    return LitHtml.html`
      <${Buttons.Button.Button.litTagName}
        class="step-actions"
        title=${i18nString(UIStrings.openStepActions)}
        aria-label=${i18nString(UIStrings.openStepActions)}
        @click=${this.#onToggleActionsMenu}
        @keydown=${(event: Event): void => {
          event.stopPropagation();
        }}
        on-render=${ComponentHelpers.Directives.nodeRenderedCallback(node => {
          this.#actionsMenuButton = node as Buttons.Button.Button;
        })}
        .data=${
          {
            variant: Buttons.Button.Variant.TOOLBAR,
            iconName: 'dots-vertical',
            title: i18nString(UIStrings.openStepActions),
          } as Buttons.Button.ButtonData
        }
      ></${Buttons.Button.Button.litTagName}>
      <${Menus.Menu.Menu.litTagName}
        @menucloserequest=${this.#onCloseActionsMenu}
        @menuitemselected=${this.#handleStepAction}
        .origin=${this.#getActionsMenuButton.bind(this)}
        .showSelectedItem=${false}
        .showConnector=${false}
        .open=${this.#actionsMenuExpanded}
      >
        ${LitHtml.Directives.repeat(
          groups,
          item => item.group,
          item => {
            return LitHtml.html`
            <${Menus.Menu.MenuGroup.litTagName}
              .name=${item.groupTitle}
            >
              ${LitHtml.Directives.repeat(
                item.actions,
                item => item.id,
                item => {
                  return LitHtml.html`<${Menus.Menu.MenuItem.litTagName}
                      .value=${item.id}
                    >
                      ${item.label}
                    </${Menus.Menu.MenuItem.litTagName}>
                  `;
                },
              )}
            </${Menus.Menu.MenuGroup.litTagName}>
          `;
          },
        )}
      </${Menus.Menu.Menu.litTagName}>
    `;
    // clang-format on
  }

  #onStepContextMenu = (event: MouseEvent): void => {
    if (event.button !== 2) {
      // 2 = secondary button = right click. We only show context menus if the
      // user has right clicked.
      return;
    }

    const menu = new UI.ContextMenu.ContextMenu(event);

    const actions = this.#getActions();
    const copyActions = actions.filter(
        item => item.id.startsWith(COPY_ACTION_PREFIX),
    );
    const otherActions = actions.filter(
        item => !item.id.startsWith(COPY_ACTION_PREFIX),
    );
    for (const item of otherActions) {
      const section = menu.section(item.group);
      section.appendItem(item.label, () => {
        this.#handleStepAction(
            new Menus.Menu.MenuItemSelectedEvent(item.id),
        );
      });
    }

    const preferredCopyAction = copyActions.find(
        item => item.id === COPY_ACTION_PREFIX + this.#recorderSettings?.preferredCopyFormat,
    );

    if (preferredCopyAction) {
      menu.section('copy').appendItem(preferredCopyAction.label, () => {
        this.#handleStepAction(
            new Menus.Menu.MenuItemSelectedEvent(preferredCopyAction.id),
        );
      });
    }

    if (copyActions.length) {
      const copyAs = menu.section('copy').appendSubMenuItem(i18nString(UIStrings.copyAs));
      for (const item of copyActions) {
        if (item === preferredCopyAction) {
          continue;
        }
        copyAs.section(item.group).appendItem(item.label, () => {
          this.#handleStepAction(
              new Menus.Menu.MenuItemSelectedEvent(item.id),
          );
        });
      }
    }

    void menu.show();
  };

  #render(): void {
    if (!this.#step && !this.#section) {
      return;
    }

    const stepClasses = {
      step: true,
      expanded: this.#showDetails,
      'is-success': this.#state === State.Success,
      'is-current': this.#state === State.Current,
      'is-outstanding': this.#state === State.Outstanding,
      'is-error': this.#state === State.Error,
      'is-stopped': this.#state === State.Stopped,
      'is-start-of-group': this.#isStartOfGroup,
      'is-first-section': this.#isFirstSection,
      'has-breakpoint': this.#hasBreakpoint,
    };
    const isExpandable = Boolean(this.#step);
    const mainTitle = this.#getStepTypeTitle();
    const subtitle = this.#step ? this.#getSelectorPreview() : this.#getSectionPreview();

    // clang-format off
    LitHtml.render(
      LitHtml.html`
      <${TimelineSection.litTagName} .data=${
        {
          isFirstSection: this.#isFirstSection,
          isLastSection: this.#isLastSection,
          isStartOfGroup: this.#isStartOfGroup,
          isEndOfGroup: this.#isEndOfGroup,
          isSelected: this.#isSelected,
        } as TimelineSectionData
      } @contextmenu=${this.#onStepContextMenu} data-step-index=${
        this.#stepIndex
      } data-section-index=${
        this.#sectionIndex
      } class=${LitHtml.Directives.classMap(stepClasses)}>
        <svg slot="icon" width="24" height="24" height="100%" class="icon">
          <circle class="circle-icon"/>
          <g class="error-icon">
            <path d="M1.5 1.5L6.5 6.5" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M1.5 6.5L6.5 1.5" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </g>
          <path @click=${this.#onBreakpointClick.bind(
            this,
          )} class="breakpoint-icon" d="M2.5 5.5H17.7098L21.4241 12L17.7098 18.5H2.5V5.5Z"/>
        </svg>
        <div class="summary">
          <div class="title-container ${isExpandable ? 'action' : ''}"
            @click=${isExpandable && this.#toggleShowDetails.bind(this)}
            @keydown=${
              isExpandable && this.#onToggleShowDetailsKeydown.bind(this)
            }
            tabindex="0"
            aria-role=${isExpandable ? 'button' : ''}
            aria-label=${isExpandable ? 'Show details for step' : ''}
          >
            ${
              isExpandable
                ? LitHtml.html`<${IconButton.Icon.Icon.litTagName}
                    class="chevron"
                    .data=${
                      {
                        iconName: 'triangle-down',
                        color: 'var(--sys-color-on-surface)',
                      } as IconButton.Icon.IconData
                    }>
                  </${IconButton.Icon.Icon.litTagName}>`
                : ''
            }
            <div class="title">
              <div class="main-title" title=${mainTitle}>${mainTitle}</div>
              <div class="subtitle" title=${subtitle}>${subtitle}</div>
            </div>
          </div>
          <div class="filler"></div>
          ${this.#renderStepActions()}
        </div>
        <div class="details">
          ${
            this.#step &&
            LitHtml.html`<devtools-recorder-step-editor
            class=${this.#isSelected ? 'is-selected' : ''}
            .step=${this.#step}
            .disabled=${this.#isPlaying}
            @stepedited=${this.#stepEdited}>
          </devtools-recorder-step-editor>`
          }
          ${
            this.#section?.causingStep &&
            LitHtml.html`<devtools-recorder-step-editor
            .step=${this.#section.causingStep}
            .isTypeEditable=${false}
            .disabled=${this.#isPlaying}
            @stepedited=${this.#stepEdited}>
          </devtools-recorder-step-editor>`
          }
        </div>
        ${
          this.#error &&
          LitHtml.html`
          <div class="error" role="alert">
            ${this.#error.message}
          </div>
        `
        }
      </${TimelineSection.litTagName}>
    `,
      this.#shadow,
      { host: this },
    );
    // clang-format on
  }
}

ComponentHelpers.CustomElements.defineComponent('devtools-step-view', StepView);
