// Copyright 2015 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Sources from '../../panels/sources/sources.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import categorizedBreakpointsSidebarPaneStyles from './categorizedBreakpointsSidebarPane.css.js';

const UIStrings = {
  /**
   * @description Category of breakpoints
   */
  auctionWorklet: 'Ad Auction Worklet',
  /**
   * @description Text that refers to the animation of the web page
   */
  animation: 'Animation',
  /**
   * @description Screen reader description of a hit breakpoint in the Sources panel
   */
  breakpointHit: 'breakpoint hit',
  /**
   * @description Text in DOMDebugger Model
   */
  canvas: 'Canvas',
  /**
   * @description Text in DOMDebugger Model
   */
  clipboard: 'Clipboard',
  /**
   * @description Noun. Describes a group of DOM events (such as 'select' and 'submit') in this context.
   */
  control: 'Control',
  /**
   * @description Text that refers to device such as a phone
   */
  device: 'Device',
  /**
   * @description Text in DOMDebugger Model
   */
  domMutation: 'DOM Mutation',
  /**
   * @description Text in DOMDebugger Model
   */
  dragDrop: 'Drag / drop',
  /**
   * @description Title for a group of cities
   */
  geolocation: 'Geolocation',
  /**
   * @description Text in DOMDebugger Model
   */
  keyboard: 'Keyboard',
  /**
   * @description Text to load something
   */
  load: 'Load',
  /**
   * @description Text that appears on a button for the media resource type filter.
   */
  media: 'Media',
  /**
   * @description Text in DOMDebugger Model
   */
  mouse: 'Mouse',
  /**
   * @description Text in DOMDebugger Model
   */
  notification: 'Notification',
  /**
   * @description Text to parse something
   */
  parse: 'Parse',
  /**
   * @description Text in DOMDebugger Model
   */
  pictureinpicture: 'Picture-in-Picture',
  /**
   * @description Text in DOMDebugger Model
   */
  pointer: 'Pointer',
  /**
   * @description Label for a group of JavaScript files
   */
  script: 'Script',
  /**
   * @description Category of breakpoints
   */
  sharedStorageWorklet: 'Shared Storage Worklet',
  /**
   * @description Text in DOMDebugger Model
   */
  timer: 'Timer',
  /**
   * @description Text for the touch type to simulate on a device
   */
  touch: 'Touch',
  /**
   * @description Title for a category of breakpoints on Trusted Type violations
   */
  trustedTypeViolations: 'Trusted Type Violations',
  /**
   * @description Title of the WebAudio tool
   */
  webaudio: 'WebAudio',
  /**
   * @description Text in DOMDebugger Model
   */
  window: 'Window',
  /**
   * @description Text for the service worker type.
   */
  worker: 'Worker',
  /**
   * @description Text that appears on a button for the xhr resource type filter.
   */
  xhr: 'XHR',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/browser_debugger/CategorizedBreakpointsSidebarPane.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

const {html, render, Directives: {ref}} = Lit;

interface ViewOutput {
  defaultFocus: Element|undefined;
  userExpandedCategories: Set<SDK.CategorizedBreakpoint.Category>;
}
interface ViewInput {
  onFilterChanged: (filterText: string|null) => void;
  onBreakpointChange: (breakpoint: SDK.CategorizedBreakpoint.CategorizedBreakpoint, enabled: boolean) => void;

  filterText: string|null;
  userExpandedCategories: Set<SDK.CategorizedBreakpoint.Category>;
  highlightedItem: SDK.CategorizedBreakpoint.CategorizedBreakpoint|null;
  categories: Map<SDK.CategorizedBreakpoint.Category, SDK.CategorizedBreakpoint.CategorizedBreakpoint[]>;
  sortedCategoryNames: SDK.CategorizedBreakpoint.Category[];
}

export type View = typeof DEFAULT_VIEW;
export const DEFAULT_VIEW = (input: ViewInput, output: ViewOutput, target: HTMLElement): void => {
  const shouldExpandCategory = (breakpoints: SDK.CategorizedBreakpoint.CategorizedBreakpoint[]): boolean =>
      Boolean(input.filterText) || (input.highlightedItem && breakpoints.includes(input.highlightedItem)) ||
      breakpoints.some(breakpoint => breakpoint.enabled());
  const filter = (breakpoint: SDK.CategorizedBreakpoint.CategorizedBreakpoint): boolean => !input.filterText ||
      Boolean(Sources.CategorizedBreakpointL10n.getLocalizedBreakpointName(breakpoint.name).match(input.filterText)) ||
      breakpoint === input.highlightedItem;
  const filteredCategories =
      input.sortedCategoryNames.values()
          .map(category => [category, input.categories.get(category)?.filter(filter)])
          .filter(
              (filteredCategory): filteredCategory is
                  [SDK.CategorizedBreakpoint.Category, SDK.CategorizedBreakpoint.CategorizedBreakpoint[]] =>
                      Boolean(filteredCategory[1]?.length))
          .toArray();

  const onCheckboxClicked =
      (event: Event, target: SDK.CategorizedBreakpoint.Category|SDK.CategorizedBreakpoint.CategorizedBreakpoint):
          void => {
            const eventTarget = event.target;
            if (!(eventTarget instanceof UI.UIUtils.CheckboxLabel)) {
              return;
            }

            const enabled = eventTarget.checked;
            if (target instanceof SDK.CategorizedBreakpoint.CategorizedBreakpoint) {
              input.onBreakpointChange(target, enabled);
            } else {
              input.categories.get(target)?.forEach(breakpoint => input.onBreakpointChange(breakpoint, enabled));
            }
          };

  const classes =
      (breakpoint: SDK.CategorizedBreakpoint.CategorizedBreakpoint): ReturnType<typeof Lit.Directives.classMap> =>
          Lit.Directives.classMap({
            small: true,
            'source-code': true,
            'breakpoint-hit': input.highlightedItem === breakpoint,
          });
  const onExpand =
      (category: SDK.CategorizedBreakpoint.Category, {detail: {expanded}}: UI.TreeOutline.TreeViewElement.ExpandEvent):
          void => {
            const breakpoints = category && input.categories.get(category);
            if (!breakpoints) {
              return;
            }
            if (shouldExpandCategory(breakpoints)) {
              // Basically ignore expand/collapse when the category is expanded by default.
              return;
            }
            if (expanded) {
              output.userExpandedCategories.add(category);
            } else {
              output.userExpandedCategories.delete(category);
            }
          };

  render(
      // clang-format off
      html`
    <devtools-toolbar jslog=${VisualLogging.toolbar()}>
      <devtools-toolbar-input
        type="filter"
        @change=${(e: CustomEvent<string>) => input.onFilterChanged(e.detail)}
        style="flex: 1;"
        ></devtools-toolbar-input>
    </devtools-toolbar>
    <devtools-tree
      ${ref(e => { output.defaultFocus = e; })}
      .template=${html`
        <ul role="tree">
          ${filteredCategories.map(([category, breakpoints]) => html`
            <li @expand=${(e: UI.TreeOutline.TreeViewElement.ExpandEvent) => onExpand(category, e)}
                role="treeitem"
                jslog-context=${category}
                aria-checked=${breakpoints.some(breakpoint => breakpoint.enabled())
                  ? breakpoints.some(breakpoint => !breakpoint.enabled()) ? 'mixed' : true
                  : false}>
              <style>${categorizedBreakpointsSidebarPaneStyles}</style>
              <devtools-checkbox
                class="small"
                tabIndex=-1
                title=${getLocalizedCategory(category)}
                ?indeterminate=${breakpoints.some(breakpoint => !breakpoint.enabled()) &&
                                 breakpoints.some(breakpoint => breakpoint.enabled())}
                ?checked=${!breakpoints.some(breakpoint => !breakpoint.enabled())}
                @change=${(e: Event) => onCheckboxClicked(e, category)}
              >${getLocalizedCategory(category)}</devtools-checkbox>
              <ul
                  role="group"
                  ?hidden=${!shouldExpandCategory(breakpoints) && !input.userExpandedCategories.has(category)}>
                ${breakpoints.map(breakpoint => html`
                <li
                    role="treeitem"
                    aria-checked=${breakpoint.enabled()}
                    jslog-context=${Platform.StringUtilities.toKebabCase(breakpoint.name)}>
                  <div ?hidden=${breakpoint !== input.highlightedItem} class="breakpoint-hit-marker"></div>
                  <devtools-checkbox
                    class=${classes(breakpoint)}
                    tabIndex=-1
                    title=${Sources.CategorizedBreakpointL10n.getLocalizedBreakpointName(breakpoint.name)}
                    ?checked=${breakpoint.enabled()}
                    aria-description=${breakpoint === input.highlightedItem ? i18nString(UIStrings.breakpointHit)
                                                                            : Lit.nothing}
                    @change=${(e: Event) => onCheckboxClicked(e, breakpoint)}
                  >${Sources.CategorizedBreakpointL10n.getLocalizedBreakpointName(breakpoint.name)}</devtools-checkbox>
                </li>`)}
              </ul>
            </li>`)}
        </ul>
      `}>
    </devtools-tree>`,
      // clang-format on
      target);
};

export abstract class CategorizedBreakpointsSidebarPane extends UI.Widget.VBox {
  readonly #viewId: string;
  // A layout test reaches into this
  private readonly categories =
      new Map<SDK.CategorizedBreakpoint.Category, SDK.CategorizedBreakpoint.CategorizedBreakpoint[]>();
  #sortedCategories: SDK.CategorizedBreakpoint.Category[];
  #highlightedItem: SDK.CategorizedBreakpoint.CategorizedBreakpoint|null = null;
  #filterText: string|null = null;
  #view: View;
  #userExpandedCategories = new Set<SDK.CategorizedBreakpoint.Category>();
  constructor(
      breakpoints: SDK.CategorizedBreakpoint.CategorizedBreakpoint[], jslog: string, viewId: string,
      view = DEFAULT_VIEW) {
    super({useShadowDom: true, jslog});
    this.#view = view;
    this.#viewId = viewId;

    for (const breakpoint of breakpoints) {
      let categorizedBreakpoints = this.categories.get(breakpoint.category());
      if (!categorizedBreakpoints) {
        categorizedBreakpoints = [];
        this.categories.set(breakpoint.category(), categorizedBreakpoints);
      }
      categorizedBreakpoints.push(breakpoint);
    }
    this.#sortedCategories = [...this.categories.keys()].sort((a, b) => {
      const categoryA = getLocalizedCategory(a);
      const categoryB = getLocalizedCategory(b);
      return categoryA.localeCompare(categoryB, i18n.DevToolsLocale.DevToolsLocale.instance().locale);
    });

    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.DebuggerModel.DebuggerModel, SDK.DebuggerModel.Events.DebuggerPaused, this.update, this);
    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.DebuggerModel.DebuggerModel, SDK.DebuggerModel.Events.DebuggerResumed, this.update, this);
    UI.Context.Context.instance().addFlavorChangeListener(SDK.Target.Target, this.update, this);

    this.requestUpdate();
  }

  protected getBreakpointFromPausedDetails(_details: SDK.DebuggerModel.DebuggerPausedDetails):
      SDK.CategorizedBreakpoint.CategorizedBreakpoint|null {
    return null;
  }

  update(): void {
    const target = UI.Context.Context.instance().flavor(SDK.Target.Target);
    const debuggerModel = target ? target.model(SDK.DebuggerModel.DebuggerModel) : null;
    const details = debuggerModel ? debuggerModel.debuggerPausedDetails() : null;

    const breakpoint = details && this.getBreakpointFromPausedDetails(details);
    this.#highlightedItem = breakpoint;
    if (!breakpoint) {
      return;
    }

    void UI.ViewManager.ViewManager.instance().showView(this.#viewId);

    this.requestUpdate();
  }

  #onFilterChanged(filterText: string|null): void {
    this.#filterText = filterText;
    this.requestUpdate();
  }

  protected onBreakpointChanged(breakpoint: SDK.CategorizedBreakpoint.CategorizedBreakpoint, enabled: boolean): void {
    breakpoint.setEnabled(enabled);
    this.requestUpdate();
  }

  override performUpdate(): void {
    const input: ViewInput = {
      filterText: this.#filterText,
      onFilterChanged: this.#onFilterChanged.bind(this),
      onBreakpointChange: this.onBreakpointChanged.bind(this),
      sortedCategoryNames: this.#sortedCategories,
      categories: this.categories,
      highlightedItem: this.#highlightedItem,
      userExpandedCategories: this.#userExpandedCategories,
    };
    const that = this;
    const output: ViewOutput = {
      set defaultFocus(e: Element|undefined) {
        that.setDefaultFocusedElement(e ?? null);
      },
      userExpandedCategories: this.#userExpandedCategories,
    };
    this.#view(input, output, this.contentElement);
  }
}

const LOCALIZED_CATEGORIES: Record<SDK.CategorizedBreakpoint.Category, () => Platform.UIString.LocalizedString> = {
  [SDK.CategorizedBreakpoint.Category.ANIMATION]: i18nLazyString(UIStrings.animation),
  [SDK.CategorizedBreakpoint.Category.AUCTION_WORKLET]: i18nLazyString(UIStrings.auctionWorklet),
  [SDK.CategorizedBreakpoint.Category.CANVAS]: i18nLazyString(UIStrings.canvas),
  [SDK.CategorizedBreakpoint.Category.CLIPBOARD]: i18nLazyString(UIStrings.clipboard),
  [SDK.CategorizedBreakpoint.Category.CONTROL]: i18nLazyString(UIStrings.control),
  [SDK.CategorizedBreakpoint.Category.DEVICE]: i18nLazyString(UIStrings.device),
  [SDK.CategorizedBreakpoint.Category.DOM_MUTATION]: i18nLazyString(UIStrings.domMutation),
  [SDK.CategorizedBreakpoint.Category.DRAG_DROP]: i18nLazyString(UIStrings.dragDrop),
  [SDK.CategorizedBreakpoint.Category.GEOLOCATION]: i18nLazyString(UIStrings.geolocation),
  [SDK.CategorizedBreakpoint.Category.KEYBOARD]: i18nLazyString(UIStrings.keyboard),
  [SDK.CategorizedBreakpoint.Category.LOAD]: i18nLazyString(UIStrings.load),
  [SDK.CategorizedBreakpoint.Category.MEDIA]: i18nLazyString(UIStrings.media),
  [SDK.CategorizedBreakpoint.Category.MOUSE]: i18nLazyString(UIStrings.mouse),
  [SDK.CategorizedBreakpoint.Category.NOTIFICATION]: i18nLazyString(UIStrings.notification),
  [SDK.CategorizedBreakpoint.Category.PARSE]: i18nLazyString(UIStrings.parse),
  [SDK.CategorizedBreakpoint.Category.PICTURE_IN_PICTURE]: i18nLazyString(UIStrings.pictureinpicture),
  [SDK.CategorizedBreakpoint.Category.POINTER]: i18nLazyString(UIStrings.pointer),
  [SDK.CategorizedBreakpoint.Category.SCRIPT]: i18nLazyString(UIStrings.script),
  [SDK.CategorizedBreakpoint.Category.SHARED_STORAGE_WORKLET]: i18nLazyString(UIStrings.sharedStorageWorklet),
  [SDK.CategorizedBreakpoint.Category.TIMER]: i18nLazyString(UIStrings.timer),
  [SDK.CategorizedBreakpoint.Category.TOUCH]: i18nLazyString(UIStrings.touch),
  [SDK.CategorizedBreakpoint.Category.TRUSTED_TYPE_VIOLATION]: i18nLazyString(UIStrings.trustedTypeViolations),
  [SDK.CategorizedBreakpoint.Category.WEB_AUDIO]: i18nLazyString(UIStrings.webaudio),
  [SDK.CategorizedBreakpoint.Category.WINDOW]: i18nLazyString(UIStrings.window),
  [SDK.CategorizedBreakpoint.Category.WORKER]: i18nLazyString(UIStrings.worker),
  [SDK.CategorizedBreakpoint.Category.XHR]: i18nLazyString(UIStrings.xhr),
};

function getLocalizedCategory(category: SDK.CategorizedBreakpoint.Category): Platform.UIString.LocalizedString {
  return LOCALIZED_CATEGORIES[category]();
}
