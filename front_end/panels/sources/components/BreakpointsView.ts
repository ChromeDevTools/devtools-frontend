// Copyright (c) 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../core/i18n/i18n.js';
import * as Platform from '../../../core/platform/platform.js';
import {assertNotNullOrUndefined} from '../../../core/platform/platform.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as IconButton from '../../../ui/components/icon_button/icon_button.js';
import * as TwoStatesCounter from '../../../ui/components/two_states_counter/two_states_counter.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';

import breakpointsViewStyles from './breakpointsView.css.js';

const UIStrings = {
  /**
  *@description Text in pausing the debugger on exceptions in the Sources panel.
  */
  pauseOnExceptions: 'Pause on exceptions',
  /**
  *@description Text for pausing the debugger on caught exceptions in the Sources panel.
  */
  pauseOnCaughtExceptions: 'Pause on caught exceptions',
  /**
  *@description Text exposed to screen readers on checked items.
  */
  checked: 'checked',
  /**
  *@description Accessible text exposed to screen readers when the screen reader encounters an unchecked checkbox.
  */
  unchecked: 'unchecked',
  /**
  *@description Accessible text for a breakpoint collection with a combination of checked states.
  */
  indeterminate: 'mixed',
  /**
  *@description Accessibility label for hit breakpoints in the Sources panel.
  *@example {checked} PH1
  */
  breakpointHit: '{PH1} breakpoint hit',
  /**
  *@description Tooltip text that shows when hovered over a remove button that appears next to a filename in the breakpoint sidebarof the sources panel. Also used in the context menu for breakpoint groups.
  */
  removeAllBreakpointsInFile: 'Remove all breakpoints in file',
  /**
   *@description Context menu item in the Breakpoints Sidebar Pane of the Sources panel that disables all breakpoints in a file.
   */
  disableAllBreakpointsInFile: 'Disable all breakpoints in file',
  /**
   *@description Context menu item in the Breakpoints Sidebar Pane of the Sources panel that enables all breakpoints in a file.
   */
  enableAllBreakpointsInFile: 'Enable all breakpoints in file',
  /**
  *@description Tooltip text that shows when hovered over an edit button that appears next to a breakpoint or conditional breakpoint in the breakpoint sidebar of the sources panel.
  */
  editCondition: 'Edit condition',
  /**
  *@description Tooltip text that shows when hovered over an edit button that appears next to a logpoint in the breakpoint sidebar of the sources panel.
  */
  editLogpoint: 'Edit logpoint',
  /**
  *@description Tooltip text that shows when hovered over a remove button that appears next to a breakpoint in the breakpoint sidebar of the sources panel. Also used in the context menu for breakpoint items.
  */
  removeBreakpoint: 'Remove breakpoint',
  /**
  *@description Text to remove all breakpoints
  */
  removeAllBreakpoints: 'Remove all breakpoints',
  /**
  *@description Text in Breakpoints Sidebar Pane of the Sources panel
  */
  removeOtherBreakpoints: 'Remove other breakpoints',
  /**
  *@description Context menu item that reveals the source code location of a breakpoint in the Sources panel.
  */
  revealLocation: 'Reveal location',
  /**
  *@description Tooltip text that shows when hovered over a piece of code of a breakpoint in the breakpoint sidebar of the sources panel. It shows the condition, on which the breakpoint will stop.
  *@example {x < 3} PH1
  */
  conditionCode: 'Condition: {PH1}',
  /**
  *@description Tooltip text that shows when hovered over a piece of code of a breakpoint in the breakpoint sidebar of the sources panel. It shows what is going to be printed in the console, if execution hits this breakpoint.
  *@example {'hello'} PH1
  */
  logpointCode: 'Logpoint: {PH1}',
};
const str_ = i18n.i18n.registerUIStrings('panels/sources/components/BreakpointsView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

const MAX_SNIPPET_LENGTH = 200;

export interface BreakpointsViewData {
  breakpointsActive: boolean;
  pauseOnExceptions: boolean;
  pauseOnCaughtExceptions: boolean;
  groups: BreakpointGroup[];
}

export interface BreakpointGroup {
  name: string;
  url: Platform.DevToolsPath.UrlString;
  editable: boolean;
  expanded: boolean;
  breakpointItems: BreakpointItem[];
}

export interface BreakpointItem {
  id: string;
  location: string;
  codeSnippet: string;
  isHit: boolean;
  status: BreakpointStatus;
  type: BreakpointType;
  hoverText?: string;
}

export const enum BreakpointStatus {
  ENABLED = 'ENABLED',
  DISABLED = 'DISABLED',
  INDETERMINATE = 'INDETERMINATE',
}

export const enum BreakpointType {
  LOGPOINT = 'LOGPOINT',
  CONDITIONAL_BREAKPOINT = 'CONDITIONAL_BREAKPOINT',
  REGULAR_BREAKPOINT = 'REGULAR_BREAKPOINT',
}

export class CheckboxToggledEvent extends Event {
  static readonly eventName = 'checkboxtoggled';
  data: {breakpointItem: BreakpointItem, checked: boolean};

  constructor(breakpointItem: BreakpointItem, checked: boolean) {
    super(CheckboxToggledEvent.eventName);
    this.data = {breakpointItem: breakpointItem, checked};
  }
}

export class PauseOnExceptionsStateChangedEvent extends Event {
  static readonly eventName = 'pauseonexceptionsstatechanged';
  data: {checked: boolean};

  constructor(checked: boolean) {
    super(PauseOnExceptionsStateChangedEvent.eventName);
    this.data = {checked};
  }
}

export class PauseOnCaughtExceptionsStateChangedEvent extends Event {
  static readonly eventName = 'pauseoncaughtexceptionsstatechanged';
  data: {checked: boolean};

  constructor(checked: boolean) {
    super(PauseOnCaughtExceptionsStateChangedEvent.eventName);
    this.data = {checked};
  }
}

export class ExpandedStateChangedEvent extends Event {
  static readonly eventName = 'expandedstatechanged';
  data: {url: Platform.DevToolsPath.UrlString, expanded: boolean};

  constructor(url: Platform.DevToolsPath.UrlString, expanded: boolean) {
    super(ExpandedStateChangedEvent.eventName);
    this.data = {url, expanded};
  }
}

export class BreakpointSelectedEvent extends Event {
  static readonly eventName = 'breakpointselected';
  data: {breakpointItem: BreakpointItem};

  constructor(breakpointItem: BreakpointItem) {
    super(BreakpointSelectedEvent.eventName);
    this.data = {breakpointItem: breakpointItem};
  }
}

export class BreakpointEditedEvent extends Event {
  static readonly eventName = 'breakpointedited';
  data: {breakpointItem: BreakpointItem};

  constructor(breakpointItem: BreakpointItem) {
    super(BreakpointEditedEvent.eventName);
    this.data = {breakpointItem};
  }
}

export class BreakpointsRemovedEvent extends Event {
  static readonly eventName = 'breakpointsremoved';
  data: {breakpointItems: BreakpointItem[]};

  constructor(breakpointItems: BreakpointItem[]) {
    super(BreakpointsRemovedEvent.eventName);
    this.data = {breakpointItems};
  }
}

export class BreakpointsView extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-breakpoint-view`;
  readonly #shadow = this.attachShadow({mode: 'open'});
  readonly #boundRender = this.#render.bind(this);

  #pauseOnExceptions: boolean = false;
  #pauseOnCaughtExceptions: boolean = false;
  #breakpointsActive: boolean = true;
  #breakpointGroups: BreakpointGroup[] = [];

  set data(data: BreakpointsViewData) {
    this.#pauseOnExceptions = data.pauseOnExceptions;
    this.#pauseOnCaughtExceptions = data.pauseOnCaughtExceptions;
    this.#breakpointsActive = data.breakpointsActive;
    this.#breakpointGroups = data.groups;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [breakpointsViewStyles];
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }

  #render(): void {
    // clang-format off
    const out = LitHtml.html`
    <div class='pause-on-exceptions'>
      <label class='checkbox-label'>
        <input type='checkbox' ?checked=${this.#pauseOnExceptions} @change=${this.#onPauseOnExceptionsStateChanged.bind(this)}>
        <span>${i18nString(UIStrings.pauseOnExceptions)}</span>
      </label>
    </div>
    ${this.#pauseOnExceptions ? LitHtml.html`
      <div class='pause-on-caught-exceptions'>
        <label class='checkbox-label'>
          <input type='checkbox' ?checked=${this.#pauseOnCaughtExceptions} @change=${this.#onPauseOnCaughtExceptionsStateChanged.bind(this)}>
          <span>${i18nString(UIStrings.pauseOnCaughtExceptions)}</span>
        </label>
      </div>
      ` : LitHtml.nothing}
    <div role=tree>
      ${LitHtml.Directives.repeat(
        this.#breakpointGroups,
        group => group.url,
        group => LitHtml.html`<hr/>${this.#renderBreakpointGroup(group)}`)}
    </div>`;
    // clang-format on
    LitHtml.render(out, this.#shadow, {host: this});
  }

  #renderEditBreakpointButton(breakpointItem: BreakpointItem): LitHtml.TemplateResult {
    const clickHandler = (event: Event): void => {
      this.dispatchEvent(new BreakpointEditedEvent(breakpointItem));
      event.consume();
    };
    const title = breakpointItem.type === BreakpointType.LOGPOINT ? i18nString(UIStrings.editLogpoint) :
                                                                    i18nString(UIStrings.editCondition);
    // clang-format off
    return LitHtml.html`
    <button data-edit-breakpoint @click=${clickHandler} title=${title}>
    <${IconButton.Icon.Icon.litTagName} .data=${{
        iconName: 'edit-icon',
        width: '10px',
        color: 'var(--color-text-secondary)',
      } as IconButton.Icon.IconData}
      }>
      </${IconButton.Icon.Icon.litTagName}>
    </button>
      `;
    // clang-format on
  }

  #renderRemoveBreakpointButton(breakpointItems: BreakpointItem[], tooltipText: string): LitHtml.TemplateResult {
    const clickHandler = (event: Event): void => {
      this.dispatchEvent(new BreakpointsRemovedEvent(breakpointItems));
      event.consume();
    };
    // clang-format off
    return LitHtml.html`
    <button data-remove-breakpoint @click=${clickHandler} title=${tooltipText}>
    <${IconButton.Icon.Icon.litTagName} .data=${{
        iconName: 'close-icon',
        width: '7px',
        color: 'var(--color-text-secondary)',
      } as IconButton.Icon.IconData}
      }>
      </${IconButton.Icon.Icon.litTagName}>
    </button>
      `;
    // clang-format on
  }

  #onBreakpointGroupContextMenu(event: Event, breakpointGroup: BreakpointGroup): void {
    const {breakpointItems} = breakpointGroup;
    const menu = new UI.ContextMenu.ContextMenu(event);

    menu.defaultSection().appendItem(i18nString(UIStrings.removeAllBreakpointsInFile), () => {
      this.dispatchEvent(new BreakpointsRemovedEvent(breakpointItems));
    });
    const notDisabledItems =
        breakpointItems.filter(breakpointItem => breakpointItem.status !== BreakpointStatus.DISABLED);
    menu.defaultSection().appendItem(i18nString(UIStrings.disableAllBreakpointsInFile), () => {
      for (const breakpointItem of notDisabledItems) {
        this.dispatchEvent(new CheckboxToggledEvent(breakpointItem, false));
      }
    }, notDisabledItems.length === 0);
    const notEnabledItems =
        breakpointItems.filter(breakpointItem => breakpointItem.status !== BreakpointStatus.ENABLED);
    menu.defaultSection().appendItem(i18nString(UIStrings.enableAllBreakpointsInFile), () => {
      for (const breakpointItem of notEnabledItems) {
        this.dispatchEvent(new CheckboxToggledEvent(breakpointItem, true));
      }
    }, notEnabledItems.length === 0);
    menu.defaultSection().appendItem(i18nString(UIStrings.removeAllBreakpoints), () => {
      const breakpointItems = this.#breakpointGroups.map(({breakpointItems}) => breakpointItems).flat();
      this.dispatchEvent(new BreakpointsRemovedEvent(breakpointItems));
    });
    const otherGroups = this.#breakpointGroups.filter(group => group !== breakpointGroup);
    menu.defaultSection().appendItem(i18nString(UIStrings.removeOtherBreakpoints), () => {
      const breakpointItems = otherGroups.map(({breakpointItems}) => breakpointItems).flat();
      this.dispatchEvent(new BreakpointsRemovedEvent(breakpointItems));
    }, otherGroups.length === 0);

    void menu.show();
  }

  #renderBreakpointGroup(group: BreakpointGroup): LitHtml.TemplateResult {
    const contextmenuHandler = (event: Event): void => {
      this.#onBreakpointGroupContextMenu(event, group);
      event.consume();
    };
    const toggleHandler = (event: Event): void => {
      const {open} = event.target as HTMLDetailsElement;
      group.expanded = open;
      this.dispatchEvent(new ExpandedStateChangedEvent(group.url, open));
      event.consume();
    };
    const classMap = {
      active: this.#breakpointsActive,
    };
    // clang-format off
    return LitHtml.html`
      <details class=${LitHtml.Directives.classMap(classMap)}
               data-group=true
               role=group
               aria-label='${group.name}'
               aria-description='${group.url}'
               ?open=${group.expanded}
               @toggle=${toggleHandler}>
        <summary @contextmenu=${contextmenuHandler} >
          <span class='group-header' aria-hidden=true>${this.#renderFileIcon()}<span class='group-header-title' title='${group.url}'>${group.name}</span></span>
          <span class='group-hover-actions'>
            ${this.#renderRemoveBreakpointButton(group.breakpointItems, i18nString(UIStrings.removeAllBreakpointsInFile))}
            ${this.#renderBreakpointCounter(group)}
          </span>
        </summary>
        ${LitHtml.Directives.repeat(
          group.breakpointItems,
          item => item.location,
          item => this.#renderBreakpointEntry(item, group.editable))}
      </div>
      `;
    // clang-format on
  }

  #renderBreakpointCounter(group: BreakpointGroup): LitHtml.TemplateResult {
    const numActive = group.breakpointItems.reduce((previousValue: number, currentValue: BreakpointItem) => {
      return currentValue.status === BreakpointStatus.ENABLED ? previousValue + 1 : previousValue;
    }, 0);
    const numInactive = group.breakpointItems.length - numActive;
    // clang-format off
    const inactiveActiveCounter = LitHtml.html`
    <${TwoStatesCounter.TwoStatesCounter.TwoStatesCounter.litTagName} .data=${
        {active: numActive, inactive: numInactive, width: '15px', height: '15px'} as
        TwoStatesCounter.TwoStatesCounter.TwoStatesCounterData}>
    </${TwoStatesCounter.TwoStatesCounter.TwoStatesCounter.litTagName}>
    `;
    // clang-format on
    return inactiveActiveCounter;
  }

  #renderFileIcon(): LitHtml.TemplateResult {
    return LitHtml.html`
      <${IconButton.Icon.Icon.litTagName} .data=${
        {iconName: 'ic_file_script', color: 'var(--color-ic-file-script)', width: '16px', height: '16px'} as
        IconButton.Icon.IconWithName}></${IconButton.Icon.Icon.litTagName}>
    `;
  }

  #onBreakpointEntryContextMenu(event: Event, breakpointItem: BreakpointItem, editable: boolean): void {
    const menu = new UI.ContextMenu.ContextMenu(event);
    const editBreakpointText = breakpointItem.type === BreakpointType.LOGPOINT ? i18nString(UIStrings.editLogpoint) :
                                                                                 i18nString(UIStrings.editCondition);

    menu.defaultSection().appendItem(i18nString(UIStrings.removeBreakpoint), () => {
      this.dispatchEvent(new BreakpointsRemovedEvent([breakpointItem]));
    });
    menu.defaultSection().appendItem(editBreakpointText, () => {
      this.dispatchEvent(new BreakpointEditedEvent(breakpointItem));
    }, !editable);
    menu.defaultSection().appendItem(i18nString(UIStrings.revealLocation), () => {
      this.dispatchEvent(new BreakpointSelectedEvent(breakpointItem));
    });
    menu.defaultSection().appendItem(i18nString(UIStrings.removeAllBreakpoints), () => {
      const breakpointItems = this.#breakpointGroups.map(({breakpointItems}) => breakpointItems).flat();
      this.dispatchEvent(new BreakpointsRemovedEvent(breakpointItems));
    });
    const otherItems = this.#breakpointGroups.map(({breakpointItems}) => breakpointItems)
                           .flat()
                           .filter(item => item !== breakpointItem);
    menu.defaultSection().appendItem(i18nString(UIStrings.removeOtherBreakpoints), () => {
      this.dispatchEvent(new BreakpointsRemovedEvent(otherItems));
    }, otherItems.length === 0);

    void menu.show();
  }

  #renderBreakpointEntry(breakpointItem: BreakpointItem, editable: boolean): LitHtml.TemplateResult {
    const clickHandler = (event: Event): void => {
      this.dispatchEvent(new BreakpointSelectedEvent(breakpointItem));
      event.consume();
    };
    const contextmenuHandler = (event: Event): void => {
      this.#onBreakpointEntryContextMenu(event, breakpointItem, editable);
      event.consume();
    };
    const classMap = {
      'breakpoint-item': true,
      'hit': breakpointItem.isHit,
      'conditional-breakpoint': breakpointItem.type === BreakpointType.CONDITIONAL_BREAKPOINT,
      'logpoint': breakpointItem.type === BreakpointType.LOGPOINT,
    };
    const breakpointItemDescription = this.#getBreakpointItemDescription(breakpointItem);
    const codeSnippet = Platform.StringUtilities.trimEndWithMaxLength(breakpointItem.codeSnippet, MAX_SNIPPET_LENGTH);
    const codeSnippetTooltip = this.#getCodeSnippetTooltip(breakpointItem.type, breakpointItem.hoverText);

    // clang-format off
    return LitHtml.html`
    <div class=${LitHtml.Directives.classMap(classMap)}
         aria-label=${breakpointItemDescription}
         role=treeitem
         tabIndex=${breakpointItem.isHit ? 0 : -1}
         @contextmenu=${contextmenuHandler}>
      <label class='checkbox-label'>
        <span class='type-indicator'></span>
        <input type='checkbox' aria-label=${breakpointItem.location} ?indeterminate=${breakpointItem.status === BreakpointStatus.INDETERMINATE} ?checked=${breakpointItem.status === BreakpointStatus.ENABLED} @change=${(e: Event): void => this.#onCheckboxToggled(e, breakpointItem)}>
      </label>
      <span class='code-snippet' @click=${clickHandler} title=${codeSnippetTooltip}>${codeSnippet}</span>
      <span class='breakpoint-item-location-or-actions'>
        ${editable ? this.#renderEditBreakpointButton(breakpointItem) : LitHtml.nothing}
        ${this.#renderRemoveBreakpointButton([breakpointItem], i18nString(UIStrings.removeBreakpoint))}
        <span class='location'>${breakpointItem.location}</span>
      </span>
    </div>
    `;
    // clang-format on
  }

  #getCodeSnippetTooltip(type: BreakpointType, hoverText?: string): string|undefined {
    switch (type) {
      case BreakpointType.REGULAR_BREAKPOINT:
        return undefined;
      case BreakpointType.CONDITIONAL_BREAKPOINT:
        assertNotNullOrUndefined(hoverText);
        return i18nString(UIStrings.conditionCode, {PH1: hoverText});
      case BreakpointType.LOGPOINT:
        assertNotNullOrUndefined(hoverText);
        return i18nString(UIStrings.logpointCode, {PH1: hoverText});
    }
  }

  #getBreakpointItemDescription(breakpointItem: BreakpointItem): Platform.UIString.LocalizedString {
    let checkboxDescription;
    switch (breakpointItem.status) {
      case BreakpointStatus.ENABLED:
        checkboxDescription = i18nString(UIStrings.checked);
        break;
      case BreakpointStatus.DISABLED:
        checkboxDescription = i18nString(UIStrings.unchecked);
        break;
      case BreakpointStatus.INDETERMINATE:
        checkboxDescription = i18nString(UIStrings.indeterminate);
        break;
    }
    if (!breakpointItem.isHit) {
      return checkboxDescription;
    }
    return i18nString(UIStrings.breakpointHit, {PH1: checkboxDescription});
  }

  #onCheckboxToggled(e: Event, item: BreakpointItem): void {
    const element = e.target as HTMLInputElement;
    this.dispatchEvent(new CheckboxToggledEvent(item, element.checked));
  }

  #onPauseOnCaughtExceptionsStateChanged(e: Event): void {
    const {checked} = e.target as HTMLInputElement;
    this.dispatchEvent(new PauseOnCaughtExceptionsStateChangedEvent(checked));
  }

  #onPauseOnExceptionsStateChanged(e: Event): void {
    const {checked} = e.target as HTMLInputElement;
    this.dispatchEvent(new PauseOnExceptionsStateChangedEvent(checked));
  }
}

ComponentHelpers.CustomElements.defineComponent('devtools-breakpoint-view', BreakpointsView);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-breakpoint-view': BreakpointsView;
  }
}
