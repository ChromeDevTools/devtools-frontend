// Copyright (c) 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as Platform from '../../../core/platform/platform.js';
import {assertNotNullOrUndefined} from '../../../core/platform/platform.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as IconButton from '../../../ui/components/icon_button/icon_button.js';
import * as Input from '../../../ui/components/input/input.js';
import * as Coordinator from '../../../ui/components/render_coordinator/render_coordinator.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';

import breakpointsViewStyles from './breakpointsView.css.js';

import {findNextNodeForKeyboardNavigation, getDifferentiatingPathMap, type TitleInfo} from './BreakpointsViewUtils.js';

const UIStrings = {
  /**
   *@description Label for a checkbox to toggle pausing on uncaught exceptions in the breakpoint sidebar of the Sources panel. When the checkbox is checked, DevTools will pause if an uncaught exception is thrown at runtime.
   */
  pauseOnUncaughtExceptions: 'Pause on uncaught exceptions',
  /**
   *@description Label for a checkbox to toggling pausing on caught exceptions in the breakpoint sidebar of the Sources panel. When the checkbox is checked, DevTools will pause if an exception is thrown, but caught (handled) at runtime.
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
   *@description Tooltip text that shows when hovered over a remove button that appears next to a filename in the breakpoint sidebar of the sources panel. Also used in the context menu for breakpoint groups.
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
const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

const MAX_SNIPPET_LENGTH = 200;

export interface BreakpointsViewData {
  breakpointsActive: boolean;
  pauseOnUncaughtExceptions: boolean;
  pauseOnCaughtExceptions: boolean;
  // TODO(crbug.com/1382762): Remove special casing with dependent toggles as soon as Node LTS caught up on independent pause of exception toggles.
  independentPauseToggles: boolean;
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

export class PauseOnUncaughtExceptionsStateChangedEvent extends Event {
  static readonly eventName = 'pauseonuncaughtexceptionsstatechanged';
  data: {checked: boolean};

  constructor(checked: boolean) {
    super(PauseOnUncaughtExceptionsStateChangedEvent.eventName);
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

  #pauseOnUncaughtExceptions: boolean = false;
  #pauseOnCaughtExceptions: boolean = false;

  // TODO(crbug.com/1382762): Remove special casing with dependent toggles as soon as Node LTS caught up on independent pause of exception toggles.
  #independentPauseToggles: boolean = false;

  #breakpointsActive: boolean = true;
  #breakpointGroups: BreakpointGroup[] = [];
  #urlToDifferentiatingPath: Map<Platform.DevToolsPath.UrlString, string> = new Map();

  #scheduledRender = false;
  #enqueuedRender = false;

  set data(data: BreakpointsViewData) {
    this.#pauseOnUncaughtExceptions = data.pauseOnUncaughtExceptions;
    this.#pauseOnCaughtExceptions = data.pauseOnCaughtExceptions;
    this.#independentPauseToggles = data.independentPauseToggles;
    this.#breakpointsActive = data.breakpointsActive;
    this.#breakpointGroups = data.groups;

    const titleInfos: TitleInfo[] = [];
    for (const group of data.groups) {
      titleInfos.push({name: group.name, url: group.url});
    }
    this.#urlToDifferentiatingPath = getDifferentiatingPathMap(titleInfos);

    void this.#render();
  }

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [Input.checkboxStyles, breakpointsViewStyles];
  }

  async #render(): Promise<void> {
    if (this.#scheduledRender) {
      // If we are already rendering, don't render again immediately, but
      // enqueue it to be run after we're done on our current render.
      this.#enqueuedRender = true;
      return;
    }

    this.#scheduledRender = true;
    await coordinator.write('BreakpointsView render', () => {
      const clickHandler = async(event: Event): Promise<void> => {
        const currentTarget = event.currentTarget as HTMLElement;
        await this.#setSelected(currentTarget);
        event.consume();
      };

      const pauseOnCaughtIsChecked =
          (this.#independentPauseToggles || this.#pauseOnUncaughtExceptions) && this.#pauseOnCaughtExceptions;
      const pauseOnCaughtExceptionIsDisabled = !this.#independentPauseToggles && !this.#pauseOnUncaughtExceptions;
      // clang-format off
      const out = LitHtml.html`
        <div class='pause-on-uncaught-exceptions'
            tabindex='0'
            @click=${clickHandler}
            @keydown=${this.#keyDownHandler}
            data-first-pause>
          <label class='checkbox-label'>
            <input type='checkbox' tabindex=-1 ?checked=${this.#pauseOnUncaughtExceptions} @change=${this.#onPauseOnUncaughtExceptionsStateChanged.bind(this)}>
            <span>${i18nString(UIStrings.pauseOnUncaughtExceptions)}</span>
          </label>
        </div>
        <div class='pause-on-caught-exceptions'
              tabindex='-1'
              @click=${clickHandler}
              @keydown=${this.#keyDownHandler}
              data-last-pause>
            <label class='checkbox-label'>
              <input data-pause-on-caught-checkbox type='checkbox' tabindex=-1 ?checked=${pauseOnCaughtIsChecked} ?disabled=${pauseOnCaughtExceptionIsDisabled} @change=${this.#onPauseOnCaughtExceptionsStateChanged.bind(this)}>
              <span>${i18nString(UIStrings.pauseOnCaughtExceptions)}</span>
            </label>
        </div>
        <div role=tree>
          ${LitHtml.Directives.repeat(
            this.#breakpointGroups,
            group => group.url,
            (group, groupIndex) => LitHtml.html`${this.#renderBreakpointGroup(group, groupIndex)}`)}
        </div>`;
      // clang-format on
      LitHtml.render(out, this.#shadow, {host: this});
    });

    // If no element is tabbable, set the pause-on-exceptions to be tabbable. This can happen
    // if the previously focused element was removed.
    await coordinator.write('make pause-on-exceptions focusable', () => {
      if (this.#shadow.querySelector('[tabindex="0"]') === null) {
        const element = this.#shadow.querySelector<HTMLElement>('[data-first-pause]');
        element?.setAttribute('tabindex', '0');
      }
    });

    this.#scheduledRender = false;

    // If render() was called when we were already mid-render, let's re-render
    // to ensure we're not rendering any stale UI.
    if (this.#enqueuedRender) {
      this.#enqueuedRender = false;
      return this.#render();
    }
  }

  async #keyDownHandler(event: KeyboardEvent): Promise<void> {
    if (!event.target || !(event.target instanceof HTMLElement)) {
      return;
    }

    if (event.key === 'Home' || event.key === 'End') {
      event.consume(true);
      return this.#handleHomeOrEndKey(event.key);
    }
    if (Platform.KeyboardUtilities.keyIsArrowKey(event.key)) {
      event.consume(true);
      return this.#handleArrowKey(event.key, event.target);
    }
    return;
  }

  async #setSelected(element: HTMLElement|null): Promise<void> {
    if (!element) {
      return;
    }
    void coordinator.write('focus on selected element', () => {
      const prevSelected = this.#shadow.querySelector('[tabindex="0"]');
      prevSelected?.setAttribute('tabindex', '-1');
      element.setAttribute('tabindex', '0');
      element.focus();
    });
  }

  async #handleArrowKey(key: Platform.KeyboardUtilities.ArrowKey, target: HTMLElement): Promise<void> {
    const setGroupExpandedState = (detailsElement: HTMLDetailsElement, expanded: boolean): Promise<void> => {
      if (expanded) {
        return coordinator.write('expand', () => {
          detailsElement.setAttribute('open', '');
        });
      }
      return coordinator.write('expand', () => {
        detailsElement.removeAttribute('open');
      });
    };
    const nextNode = await findNextNodeForKeyboardNavigation(target, key, setGroupExpandedState);
    return this.#setSelected(nextNode);
  }

  async #handleHomeOrEndKey(key: 'Home'|'End'): Promise<void> {
    if (key === 'Home') {
      const pauseOnExceptionsNode = this.#shadow.querySelector<HTMLElement>('[data-first-pause]');
      return this.#setSelected(pauseOnExceptionsNode);
    }
    if (key === 'End') {
      const numGroups = this.#breakpointGroups.length;
      if (numGroups === 0) {
        const lastPauseOnExceptionsNode = this.#shadow.querySelector<HTMLElement>('[data-last-pause]');
        return this.#setSelected(lastPauseOnExceptionsNode);
      }
      const lastGroupIndex = numGroups - 1;
      const lastGroup = this.#breakpointGroups[lastGroupIndex];

      if (lastGroup.expanded) {
        const lastBreakpointItem =
            this.#shadow.querySelector<HTMLElement>('[data-last-group] > [data-last-breakpoint]');
        return this.#setSelected(lastBreakpointItem);
      }
      const lastGroupSummaryElement = this.#shadow.querySelector<HTMLElement>('[data-last-group] > summary');
      return this.#setSelected(lastGroupSummaryElement);
    }
    return;
  }

  #renderEditBreakpointButton(breakpointItem: BreakpointItem): LitHtml.TemplateResult {
    const clickHandler = (event: Event): void => {
      Host.userMetrics.breakpointEditDialogRevealedFrom(
          Host.UserMetrics.BreakpointEditDialogRevealedFrom.BreakpointSidebarEditButton);
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
        width: '14px',
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
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.BreakpointRemovedFromRemoveButton);
      this.dispatchEvent(new BreakpointsRemovedEvent(breakpointItems));
      event.consume();
    };
    // clang-format off
    return LitHtml.html`
    <button data-remove-breakpoint @click=${clickHandler} title=${tooltipText} aria-label=${tooltipText}>
    <${IconButton.Icon.Icon.litTagName} .data=${{
        iconName: 'close-icon',
        width: '10px',
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

  #renderBreakpointGroup(group: BreakpointGroup, groupIndex: number): LitHtml.TemplateResult {
    const contextmenuHandler = (event: Event): void => {
      this.#onBreakpointGroupContextMenu(event, group);
      event.consume();
    };
    const toggleHandler = (event: Event): void => {
      const htmlDetails = event.target as HTMLDetailsElement;
      group.expanded = htmlDetails.open;
      this.dispatchEvent(new ExpandedStateChangedEvent(group.url, group.expanded));
    };
    const clickHandler = async(event: Event): Promise<void> => {
      const selected = event.currentTarget as HTMLElement;
      await this.#setSelected(selected);
      // Record the metric for expanding/collapsing in the click handler,
      // as we only then get the number of expand/collapse actions that were
      // initiated by the user.
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.BreakpointGroupExpandedStateChanged);
      event.consume();
    };
    const classMap = {
      active: this.#breakpointsActive,
    };
    // clang-format off
    return LitHtml.html`
      <details class=${LitHtml.Directives.classMap(classMap)}
               ?data-first-group=${groupIndex === 0}
               ?data-last-group=${groupIndex === this.#breakpointGroups.length - 1}
               role=group
               aria-label='${group.name}'
               aria-description='${group.url}'
               ?open=${LitHtml.Directives.live(group.expanded)}
               @toggle=${toggleHandler}>
          <summary @contextmenu=${contextmenuHandler}
                   tabindex='-1'
                   @keydown=${this.#keyDownHandler}
                   @click=${clickHandler}>
            <span class='group-header' aria-hidden=true><span class='group-icon-or-disable'>${this.#renderFileIcon()}${this.#renderGroupCheckbox(group)}</span><span class='group-header-title' title='${group.url}'>${group.name}<span class='group-header-differentiator'>${this.#urlToDifferentiatingPath.get(group.url)}</span></span></span>
            <span class='group-hover-actions'>
              ${this.#renderRemoveBreakpointButton(group.breakpointItems, i18nString(UIStrings.removeAllBreakpointsInFile))}
            </span>
          </summary>
        ${LitHtml.Directives.repeat(
          group.breakpointItems,
          item => item.id,
          (item, breakpointItemIndex) => this.#renderBreakpointEntry(item, group.editable, groupIndex, breakpointItemIndex))}
      </details>
      `;
    // clang-format on
  }

  #renderGroupCheckbox(group: BreakpointGroup): LitHtml.TemplateResult {
    const groupCheckboxToggled = (e: Event): void => {
      const element = e.target as HTMLInputElement;
      const updatedStatus = element.checked ? BreakpointStatus.ENABLED : BreakpointStatus.DISABLED;
      const itemsToUpdate = group.breakpointItems.filter(item => item.status !== updatedStatus);

      itemsToUpdate.forEach(item => {
        this.dispatchEvent(new CheckboxToggledEvent(item, element.checked));
      });
      e.consume();
    };

    const checked = group.breakpointItems.some(item => item.status === BreakpointStatus.ENABLED);
    return LitHtml.html`
      <input class='group-checkbox' type='checkbox'
            aria-label=''
            .checked=${checked}
            @change=${groupCheckboxToggled}
            tabindex=-1>
    `;
  }

  #renderFileIcon(): LitHtml.TemplateResult {
    return LitHtml.html`
      <${IconButton.Icon.Icon.litTagName} class='file-icon' .data=${
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
      Host.userMetrics.breakpointEditDialogRevealedFrom(
          Host.UserMetrics.BreakpointEditDialogRevealedFrom.BreakpointSidebarContextMenu);
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

  #renderBreakpointEntry(
      breakpointItem: BreakpointItem, editable: boolean, groupIndex: number,
      breakpointItemIndex: number): LitHtml.TemplateResult {
    const codeSnippetClickHandler = (event: Event): void => {
      this.dispatchEvent(new BreakpointSelectedEvent(breakpointItem));
      event.consume();
    };
    const breakpointItemClickHandler = async(event: Event): Promise<void> => {
      const target = event.currentTarget as HTMLDivElement;
      await this.#setSelected(target);
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
    const itemsInGroup = this.#breakpointGroups[groupIndex].breakpointItems;

    // clang-format off
    return LitHtml.html`
    <div class=${LitHtml.Directives.classMap(classMap)}
         ?data-first-breakpoint=${breakpointItemIndex === 0}
         ?data-last-breakpoint=${breakpointItemIndex === itemsInGroup.length - 1}
         aria-label=${breakpointItemDescription}
         role=treeitem
         tabindex='-1'
         @contextmenu=${contextmenuHandler}
         @click=${breakpointItemClickHandler}
         @keydown=${this.#keyDownHandler}>
      <label class='checkbox-label'>
        <span class='type-indicator'></span>
        <input type='checkbox'
              aria-label=${breakpointItem.location}
              ?indeterminate=${breakpointItem.status === BreakpointStatus.INDETERMINATE}
              .checked=${breakpointItem.status === BreakpointStatus.ENABLED}
              @change=${(e: Event): void => this.#onCheckboxToggled(e, breakpointItem)}
              tabindex=-1>
      </label>
      <span class='code-snippet' @click=${codeSnippetClickHandler} title=${codeSnippetTooltip}>${codeSnippet}</span>
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

  #onPauseOnUncaughtExceptionsStateChanged(e: Event): void {
    const {checked} = e.target as HTMLInputElement;
    if (!this.#independentPauseToggles) {
      const pauseOnCaughtCheckbox = this.#shadow.querySelector<HTMLInputElement>('[data-pause-on-caught-checkbox]');
      assertNotNullOrUndefined(pauseOnCaughtCheckbox);
      if (!checked && pauseOnCaughtCheckbox.checked) {
        // If we can only pause on caught exceptions if we pause on uncaught exceptions, make sure to
        // uncheck the pause on caught exception checkbox.
        pauseOnCaughtCheckbox.click();
      }

      void coordinator.write('update pause-on-uncaught-exception', () => {
        // Disable/enable the pause on caught exception checkbox depending on whether
        // or not we are pausing on uncaught exceptions.
        if (checked) {
          pauseOnCaughtCheckbox.disabled = false;
        } else {
          pauseOnCaughtCheckbox.disabled = true;
        }
      });
    }
    this.dispatchEvent(new PauseOnUncaughtExceptionsStateChangedEvent(checked));
  }
}

ComponentHelpers.CustomElements.defineComponent('devtools-breakpoint-view', BreakpointsView);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-breakpoint-view': BreakpointsView;
  }
}
