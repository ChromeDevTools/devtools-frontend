// Copyright 2015 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as UI from '../../ui/legacy/legacy.js';
import {Directives, html, nothing, render, type TemplateResult} from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import xhrBreakpointsSidebarPaneStyles from './xhrBreakpointsSidebarPane.css.js';

const {classMap, ifDefined, repeat} = Directives;

const UIStrings = {
  /**
   * @description Title of the XHR/fetch breakpoints sidebar in the Sources panel.
   */
  xhrfetchBreakpoints: 'XHR/fetch breakpoints',
  /**
   * @description Text to indicate there are no XHR/fetch breakpoints.
   */
  noBreakpoints: 'No breakpoints',
  /**
   * @description Label for a button in the Sources panel that opens the input field to create a new XHR/fetch breakpoint.
   */
  addXhrfetchBreakpoint: 'Add XHR/fetch breakpoint',
  /**
   * @description Context menu item to add an XHR/fetch breakpoint.
   */
  addBreakpoint: 'Add breakpoint',
  /**
   * @description Text preceding the input field to add an XHR/fetch breakpoint in the Sources panel.
   */
  breakWhenUrlContains: 'Break when URL contains:',
  /**
   * @description Accessible label for XHR/fetch breakpoint text input.
   */
  urlBreakpoint: 'URL breakpoint',
  /**
   * @description Label for an XHR/fetch breakpoint targeting a specific URL in the Sources panel.
   * @example {example.com} PH1
   */
  urlContainsS: 'URL contains "{PH1}"',
  /**
   * @description Label for an XHR/fetch breakpoint matching any XHR or fetch request in the Sources panel.
   */
  anyXhrOrFetch: 'Any XHR or fetch',
  /**
   * @description Screen reader description of a hit breakpoint in the Sources panel.
   */
  breakpointHit: 'breakpoint hit',
  /**
   * @description Context menu item to remove all XHR/fetch breakpoints.
   */
  removeAllBreakpoints: 'Remove all breakpoints',
  /**
   * @description Context menu item to remove an XHR/fetch breakpoint.
   */
  removeBreakpoint: 'Remove breakpoint',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/browser_debugger/XHRBreakpointsSidebarPane.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export interface BreakpointItem {
  url: string;
  enabled: boolean;
  title: string;
  isHit: boolean;
  isFocused: boolean;
  isEditing: boolean;
}

export interface ViewInput {
  isAdding: boolean;
  breakpoints: BreakpointItem[];
  onAddCommit: (newUrl: string) => void;
  onAddCancel: () => void;
  onBreakpointClick: (url: string) => void;
  onBreakpointCheckboxChange: (url: string) => void;
  onBreakpointContextMenu: (url: string, event: Event) => void;
  onBreakpointNavigate: (url: string, direction: 'ArrowUp'|'ArrowDown'|'Home'|'End') => void;
  onStartEditing: (url: string) => void;
  onEditCommit: (oldUrl: string, newUrl: string) => void;
  onEditCancel: (url: string) => void;
  onEmptyContextMenu: (event: Event) => void;
}

export type View = (input: ViewInput, output: undefined, target: HTMLElement|DocumentFragment) => void;

// clang-format off
export const DEFAULT_VIEW: View =
    (input: ViewInput, _output: undefined, target: HTMLElement|DocumentFragment): void => {
  const isEmpty = input.breakpoints.length === 0 && !input.isAdding;

  const renderBreakpointItem = (item: BreakpointItem): TemplateResult => {
    const isEditing = item.isEditing;
    const isHit = item.isHit;
    const commit = (e: UI.TextPrompt.TextPromptElement.CommitEvent): void => {
      input.onEditCommit(item.url, e.detail);
    };
    const cancel = (): void => {
      input.onEditCancel(item.url);
    };
    const onKeyDown = (event: KeyboardEvent): void => {
      let handled = false;
      if (event.key === ' ') {
        input.onBreakpointCheckboxChange(item.url);
        handled = true;
      } else if ((event.key === 'Enter' && !event.isComposing) || event.key === 'F2') {
        input.onStartEditing(item.url);
        handled = true;
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown' || event.key === 'Home' || event.key === 'End') {
        input.onBreakpointNavigate(item.url, event.key);
        handled = true;
      }
      if (handled) {
        event.consume(true);
      }
    };

    return html`
      <div role="listitem"
           jslog=${VisualLogging.item().track({
             click: true,
             dblclick: true,
             resize: true,
             keydown: 'ArrowUp|ArrowDown|PageUp|PageDown|Enter|Space',
           })}>
        <div class=${classMap({'breakpoint-entry': true, 'breakpoint-hit': isHit})}
             role="checkbox"
             aria-checked=${item.enabled ? 'true' : 'false'}
             aria-label=${item.title}
             aria-description=${ifDefined(isHit ? i18nString(UIStrings.breakpointHit) : undefined)}
             tabindex=${item.isFocused && !isEditing ? '0' : '-1'}
             ?autofocus=${item.isFocused && !isEditing && !input.isAdding}
             @click=${(event: MouseEvent) => {
               if (event.target === event.currentTarget) {
                 input.onBreakpointClick(item.url);
               }
             }}
             @contextmenu=${(event: Event) => input.onBreakpointContextMenu(item.url, event)}
             @keydown=${onKeyDown}>
          <devtools-checkbox
              class="cursor-auto"
              aria-hidden="true"
              .checked=${item.enabled}
              .small=${true}
              .title=${item.title}
              @click=${(e: Event) => e.stopPropagation()}
              @change=${() => input.onBreakpointCheckboxChange(item.url)}
              @dblclick=${() => input.onStartEditing(item.url)}
              tabindex="-1"
              jslog=${VisualLogging.toggle().track({click: true})}>
            <devtools-prompt
                value=${item.url}
                render-as-block
                ?editing=${isEditing}
                ?autofocus=${isEditing}
                aria-label=${item.url ? i18nString(UIStrings.urlBreakpoint) : i18nString(UIStrings.anyXhrOrFetch)}
                class=${classMap({'breakpoint-condition-input': isEditing})}
                jslog=${VisualLogging.value('condition').track({change: true})}
                @commit=${commit}
                @cancel=${cancel}>
              ${item.title}
            </devtools-prompt>
          </devtools-checkbox>
        </div>
      </div>
    `;
  };

  render(
    html`
      <style>${xhrBreakpointsSidebarPaneStyles}</style>
      <div class="breakpoint-list"
           role="list"
           aria-label=${i18nString(UIStrings.xhrfetchBreakpoints)}
           ?hidden=${isEmpty}>
        ${input.isAdding ? html`
          <p class="breakpoint-condition" jslog=${VisualLogging.value('condition').track({change: true})}>
            ${i18nString(UIStrings.breakWhenUrlContains)}
            <devtools-prompt
                value=""
                render-as-block
                ?editing=${true}
                ?autofocus=${true}
                aria-label=${i18nString(UIStrings.urlBreakpoint)}
                class="breakpoint-condition-input"
                @commit=${(e: UI.TextPrompt.TextPromptElement.CommitEvent) => input.onAddCommit(e.detail)}
                @cancel=${input.onAddCancel}>
            </devtools-prompt>
          </p>
        ` : nothing}
        ${repeat(input.breakpoints, item => item.url, renderBreakpointItem)}
      </div>
      <div class="gray-info-message"
           tabindex="-1"
           ?autofocus=${isEmpty}
           @contextmenu=${input.onEmptyContextMenu}
           ?hidden=${!isEmpty}>
        ${i18nString(UIStrings.noBreakpoints)}
      </div>
    `,
    target,
    {
      container: {
        attributes: {
          jslog: `${VisualLogging.section('source.xhr-breakpoints')}`,
        },
      },
    },
  );
};
// clang-format on

let xhrBreakpointsSidebarPaneInstance: XHRBreakpointsSidebarPane|null = null;

export class XHRBreakpointsSidebarPane extends UI.Widget.VBox<ShadowRoot> implements
    UI.ContextFlavorListener.ContextFlavorListener, UI.Toolbar.ItemsProvider {
  readonly #breakpoints: string[] = [];
  readonly #view: View;
  #hitBreakpoint?: string;
  #editingBreakpoint: string|null = null;
  #focusedBreakpoint: string|null = null;
  #isAddingBreakpoint = false;

  constructor(view: View = DEFAULT_VIEW) {
    super({
      useShadowDom: 'pure',
      delegatesFocus: true,
    });
    this.#view = view;

    this.#restoreBreakpoints();
    this.update();
    this.performUpdate();
  }

  static instance(opts: {forceNew: boolean|null, view?: View} = {forceNew: null}): XHRBreakpointsSidebarPane {
    const {forceNew, view} = opts;
    if (!xhrBreakpointsSidebarPaneInstance || forceNew) {
      xhrBreakpointsSidebarPaneInstance = new XHRBreakpointsSidebarPane(view);
    }
    return xhrBreakpointsSidebarPaneInstance;
  }

  static removeInstance(): void {
    xhrBreakpointsSidebarPaneInstance = null;
  }

  toolbarItems(): TemplateResult {
    // clang-format off
    return html`
      <devtools-button .data=${{
          variant: Buttons.Button.Variant.TOOLBAR,
          iconName: 'plus',
          size: Buttons.Button.Size.SMALL,
          title: i18nString(UIStrings.addXhrfetchBreakpoint),
          jslogContext: 'sources.add-xhr-fetch-breakpoint',
        } as Buttons.Button.ButtonData}
        @click=${() => {
          void this.addButtonClicked();
        }}></devtools-button>
    `;
    // clang-format on
  }

  async addButtonClicked(): Promise<void> {
    this.#isAddingBreakpoint = true;
    this.performUpdate();
    await UI.ViewManager.ViewManager.instance().showView('sources.xhr-breakpoints');
  }

  setBreakpoint(breakKeyword: string, enabled?: boolean): void {
    if (enabled !== undefined) {
      SDK.DOMDebuggerModel.DOMDebuggerManager.instance().addXHRBreakpoint(breakKeyword, enabled);
    }
    if (!this.#breakpoints.includes(breakKeyword)) {
      this.#breakpoints.push(breakKeyword);
      this.#breakpoints.sort(Platform.ArrayUtilities.DEFAULT_COMPARATOR);
    }
    this.#synchronizeFocusedBreakpoint();
    this.performUpdate();
  }

  #restoreBreakpoints(): void {
    const breakpoints = SDK.DOMDebuggerModel.DOMDebuggerManager.instance().xhrBreakpoints();
    for (const url of breakpoints.keys()) {
      if (!this.#breakpoints.includes(url)) {
        this.#breakpoints.push(url);
      }
    }
    this.#breakpoints.sort(Platform.ArrayUtilities.DEFAULT_COMPARATOR);
    this.#synchronizeFocusedBreakpoint();
  }

  get focusedBreakpoint(): string|null {
    return this.#focusedBreakpoint;
  }

  set focusedBreakpoint(url: string|null) {
    if (this.#focusedBreakpoint === url) {
      return;
    }
    this.#focusedBreakpoint = url;
    this.#synchronizeFocusedBreakpoint();
    this.requestUpdate();
  }

  #synchronizeFocusedBreakpoint(): void {
    if (this.#focusedBreakpoint && !this.#breakpoints.includes(this.#focusedBreakpoint)) {
      this.#focusedBreakpoint = null;
    }
    if (!this.#focusedBreakpoint && this.#breakpoints.length > 0) {
      this.#focusedBreakpoint = (this.#hitBreakpoint && this.#breakpoints.includes(this.#hitBreakpoint)) ?
          this.#hitBreakpoint :
          this.#breakpoints[0];
    }
  }

  #addBreakpoint(url: string, enabled = true): void {
    SDK.DOMDebuggerModel.DOMDebuggerManager.instance().addXHRBreakpoint(url, enabled);
    this.setBreakpoint(url);
  }

  #removeBreakpoint(url: string): void {
    SDK.DOMDebuggerModel.DOMDebuggerManager.instance().removeXHRBreakpoint(url);
    const index = this.#breakpoints.indexOf(url);
    if (index >= 0) {
      this.#breakpoints.splice(index, 1);
    }
    this.#synchronizeFocusedBreakpoint();
    this.performUpdate();
  }

  #removeAllBreakpoints(): void {
    for (const url of [...this.#breakpoints]) {
      this.#removeBreakpoint(url);
    }
  }

  #toggleBreakpoint(url: string): void {
    const hadFocus = this.hasFocus();
    const current = SDK.DOMDebuggerModel.DOMDebuggerManager.instance().xhrBreakpoints().get(url) ?? false;
    SDK.DOMDebuggerModel.DOMDebuggerManager.instance().toggleXHRBreakpoint(url, !current);
    this.#focusedBreakpoint = url;
    this.performUpdate();
    if (hadFocus) {
      this.focus();
    }
  }

  #startEditing(url: string): void {
    this.#editingBreakpoint = url;
    this.#focusedBreakpoint = url;
    this.performUpdate();
  }

  #onBreakpointNavigate(url: string, direction: 'ArrowUp'|'ArrowDown'|'Home'|'End'): void {
    const index = this.#breakpoints.indexOf(url);
    let newIndex = index;
    if (direction === 'ArrowUp') {
      newIndex = Math.max(0, index - 1);
    } else if (direction === 'ArrowDown') {
      newIndex = Math.min(this.#breakpoints.length - 1, index + 1);
    } else if (direction === 'Home') {
      newIndex = 0;
    } else if (direction === 'End') {
      newIndex = this.#breakpoints.length - 1;
    }
    if (newIndex >= 0 && newIndex < this.#breakpoints.length) {
      this.focusedBreakpoint = this.#breakpoints[newIndex];
      void this.updateComplete.then(() => {
        const entry = this.contentElement.querySelectorAll<HTMLElement>('.breakpoint-entry')[newIndex];
        entry?.focus();
        entry?.scrollIntoView({block: 'nearest'});
      });
    }
  }

  #onBreakpointContextMenu(url: string, event: Event): void {
    this.#focusedBreakpoint = url;
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    const removeAllTitle = i18nString(UIStrings.removeAllBreakpoints);

    contextMenu.defaultSection().appendItem(i18nString(UIStrings.addBreakpoint), () => {
      void this.addButtonClicked();
    }, {jslogContext: 'sources.add-xhr-fetch-breakpoint'});
    contextMenu.defaultSection().appendItem(i18nString(UIStrings.removeBreakpoint), () => {
      this.#removeBreakpoint(url);
    }, {jslogContext: 'sources.remove-xhr-fetch-breakpoint'});
    contextMenu.defaultSection().appendItem(removeAllTitle, () => {
      this.#removeAllBreakpoints();
    }, {jslogContext: 'sources.remove-all-xhr-fetch-breakpoints'});
    void contextMenu.show();
  }

  #onEmptyContextMenu(event: Event): void {
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    contextMenu.defaultSection().appendItem(i18nString(UIStrings.addBreakpoint), () => {
      void this.addButtonClicked();
    }, {jslogContext: 'sources.add-xhr-fetch-breakpoint'});
    void contextMenu.show();
  }

  flavorChanged(_object: Object|null): void {
    this.update();
  }

  override wasShown(): void {
    super.wasShown();
    this.update();
    this.performUpdate();
  }

  update(): void {
    const details = UI.Context.Context.instance().flavor(SDK.DebuggerModel.DebuggerPausedDetails);
    if (!details || details.reason !== Protocol.Debugger.PausedEventReason.XHR) {
      if (this.#hitBreakpoint) {
        this.#hitBreakpoint = undefined;
        this.performUpdate();
      }
      return;
    }
    const url = details.auxData?.['breakpointURL'];
    this.#hitBreakpoint = url;
    if (this.#breakpoints.includes(url)) {
      void UI.ViewManager.ViewManager.instance().showView('sources.xhr-breakpoints');
    }
    this.performUpdate();
  }

  override performUpdate(): void {
    this.#synchronizeFocusedBreakpoint();
    const xhrBreakpoints = SDK.DOMDebuggerModel.DOMDebuggerManager.instance().xhrBreakpoints();
    const breakpointItems: BreakpointItem[] = this.#breakpoints.map(url => {
      const enabled = xhrBreakpoints.get(url) ?? false;
      const title = url ? i18nString(UIStrings.urlContainsS, {PH1: url}) : i18nString(UIStrings.anyXhrOrFetch);
      return {
        url,
        enabled,
        title,
        isHit: url === this.#hitBreakpoint,
        isFocused: url === this.#focusedBreakpoint,
        isEditing: url === this.#editingBreakpoint,
      };
    });

    const viewInput: ViewInput = {
      isAdding: this.#isAddingBreakpoint,
      breakpoints: breakpointItems,
      onAddCommit: (newUrl: string) => {
        this.#isAddingBreakpoint = false;
        this.#addBreakpoint(newUrl, true);
        this.focusedBreakpoint = newUrl;
        this.performUpdate();
      },
      onAddCancel: () => {
        this.#isAddingBreakpoint = false;
        this.performUpdate();
      },
      onBreakpointClick: (url: string) => {
        this.focusedBreakpoint = url;
        this.#toggleBreakpoint(url);
      },
      onBreakpointCheckboxChange: (url: string) => {
        this.#toggleBreakpoint(url);
      },
      onBreakpointContextMenu: (url: string, event: Event) => {
        this.#onBreakpointContextMenu(url, event);
      },
      onBreakpointNavigate: (url: string, direction: 'ArrowUp'|'ArrowDown'|'Home'|'End') => {
        this.#onBreakpointNavigate(url, direction);
      },
      onStartEditing: (url: string) => {
        this.#startEditing(url);
      },
      onEditCommit: (oldUrl: string, newUrl: string) => {
        this.#editingBreakpoint = null;
        const enabled = SDK.DOMDebuggerModel.DOMDebuggerManager.instance().xhrBreakpoints().get(oldUrl) ?? true;
        this.#removeBreakpoint(oldUrl);
        this.#addBreakpoint(newUrl, enabled);
        this.#focusedBreakpoint = newUrl;
        this.performUpdate();
        this.focus();
      },
      onEditCancel: (_url: string) => {
        this.#editingBreakpoint = null;
        this.performUpdate();
        this.focus();
      },
      onEmptyContextMenu: (event: Event) => {
        this.#onEmptyContextMenu(event);
      },
    };

    this.#view(viewInput, undefined, this.contentElement);
  }
}
