// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import {AccessibilityAnnouncementRecordingListView} from './AccessibilityAnnouncementRecordingListView.js';
import accessibilityAnnouncementRecordingViewStyles from './accessibilityAnnouncementRecordingView.css.js';
import {AccessibilitySubPane} from './AccessibilitySubPane.js';

const {html, render} = Lit;
const {widget} = UI.Widget;

const UIStrings = {
  /**
   * @description Title for the ARIA-Live and JS announcements recording tool
   */
  ariaLiveRecording: 'Announcements recording',
  /**
   * @description Tooltip for the start recording button in the announcements tool.
   */
  startRecording: 'Start recording',
  /**
   * @description Tooltip for the stop recording button in the announcements tool.
   */
  stopRecording: 'Stop recording',
  /**
   * @description Tooltip for the clear announcements button in the announcements tool.
   */
  clearAnnouncements: 'Clear announcements',
  /**
   * @description Tooltip for the export to CSV button in the announcements tool.
   */
  exportCsv: 'Export to CSV',
  /**
   * @description Label/title for the dropdown filter to select which announcement types to record.
   */
  filterByType: 'Filter by type',
  /**
   * @description Option label to record and display both ARIA-live and JavaScript announcements.
   */
  recordBoth: 'Record both',
  /**
   * @description Option label to record and display only ARIA-live announcements.
   */
  ariaLiveOnly: 'ARIA-live only',
  /**
   * @description Option label to record and display only JavaScript-triggered announcements.
   */
  announcementsOnly: 'Announcements only',
  /**
   * @description Placeholder text for the filter input in the announcements tool.
   */
  filter: 'Filter',
  /**
   * @description Screen reader announcement when no events match the filter in the announcements tool.
   */
  noEventsMatch: 'No events match',
  /**
   * @description Screen reader announcement when exactly one event matches the filter in the announcements tool.
   */
  oneEventMatches: '1 event matches',
  /**
   * @description Screen reader announcement when multiple events match the filter in the announcements tool.
   * @example {15} PH1
   */
  nEventsMatch: '{PH1} events match',
  /**
   * @description Warning banner title shown when recording could not be enabled in some frames.
   */
  recordingBlockedWarning: 'Recording was blocked for some frames:',
  /**
   * @description Warning item describing a specific frame and the reason recording was blocked.
   * @example {iframe#main} PH1
   * @example {Script evaluation failed} PH2
   */
  frameBlockedReason: '{PH1}: {PH2}',
  /**
   * @description Fallback reason shown when an unknown error occurs while blocking recording.
   */
  unknownError: 'Unknown error',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/accessibility/AccessibilityAnnouncementRecordingView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export const BINDING_NAME = '__announcementsRecorderBinding';

export enum AnnouncementApi {
  ARIA_LIVE = 'aria-live',
  JS_TRIGGERED = 'js-triggered',
}

export const enum RecordTypeFilter {
  BOTH = 'both',
  ARIA_LIVE = 'aria-live',
  JS_TRIGGERED = 'js-triggered',
}

export interface BlockedTargetInfo {
  targetName: string;
  reason: string;
}

export interface ViewInput {
  isRecording: boolean;
  onToggleRecording: () => void;
  onClear: () => void;
  onExportCsv: () => void;
  canExport: boolean;
  recordTypeFilter: RecordTypeFilter;
  onRecordTypeFilterChange: (type: RecordTypeFilter) => void;
  textFilter: string;
  onTextFilterChange: (text: string) => void;
  blockedTargets: BlockedTargetInfo[];
  announcements: readonly A11yAnnouncement[];
}

export type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;

export const DEFAULT_VIEW: View = (input, _output, target) => {
  // clang-format off
  render(html`
    <style>${accessibilityAnnouncementRecordingViewStyles}</style>
    <div class="accessibility-announcement-recording-view">
      <div class="announcements-toolbar-container">
        <devtools-toolbar class="announcements-toolbar" jslog=${VisualLogging.toolbar()}>
          <devtools-button
            title=${input.isRecording ? i18nString(UIStrings.stopRecording) : i18nString(UIStrings.startRecording)}
            aria-label=${input.isRecording ? i18nString(UIStrings.stopRecording) : i18nString(UIStrings.startRecording)}
            .iconName=${'record-start'}
            .toggledIconName=${'record-stop'}
            .toggleType=${Buttons.Button.ToggleType.PRIMARY}
            .toggled=${input.isRecording}
            @click=${input.onToggleRecording}
            .variant=${Buttons.Button.Variant.TOOLBAR}
            .jslogContext=${'accessibility.toggle-recording'}>
          </devtools-button>
          <devtools-button
            title=${i18nString(UIStrings.clearAnnouncements)}
            aria-label=${i18nString(UIStrings.clearAnnouncements)}
            .iconName=${'clear'}
            @click=${input.onClear}
            .variant=${Buttons.Button.Variant.TOOLBAR}
            .jslogContext=${'accessibility.clear-announcements'}>
          </devtools-button>
          <devtools-button
            title=${i18nString(UIStrings.exportCsv)}
            .iconName=${'download'}
            .disabled=${!input.canExport}
            @click=${input.onExportCsv}
            .variant=${Buttons.Button.Variant.TOOLBAR}
            .jslogContext=${'accessibility.export-csv'}>
          </devtools-button>
          <div class="toolbar-divider" role="separator"></div>
          <select
            title=${i18nString(UIStrings.filterByType)}
            aria-label=${i18nString(UIStrings.filterByType)}
            @change=${(event: Event) => input.onRecordTypeFilterChange((event.target as HTMLSelectElement).value as RecordTypeFilter)}
            .value=${input.recordTypeFilter}
            jslog=${VisualLogging.dropDown('accessibility-announcements.filter-by-type').track({change: true})}>
            <option value=${RecordTypeFilter.BOTH} .selected=${input.recordTypeFilter === RecordTypeFilter.BOTH}>
              ${i18nString(UIStrings.recordBoth)}
            </option>
            <option value=${RecordTypeFilter.ARIA_LIVE} .selected=${input.recordTypeFilter === RecordTypeFilter.ARIA_LIVE}>
              ${i18nString(UIStrings.ariaLiveOnly)}
            </option>
            <option value=${RecordTypeFilter.JS_TRIGGERED} .selected=${input.recordTypeFilter === RecordTypeFilter.JS_TRIGGERED}>
              ${i18nString(UIStrings.announcementsOnly)}
            </option>
          </select>
          <div class="toolbar-divider" role="separator"></div>
          <devtools-toolbar-input
            type="filter"
            placeholder=${i18nString(UIStrings.filter)}
            .value=${input.textFilter}
            @change=${(event: CustomEvent<string>) => input.onTextFilterChange(event.detail)}
            style="flex-grow: 1">
          </devtools-toolbar-input>
        </devtools-toolbar>
      </div>
      ${input.blockedTargets.length > 0 ? html`
        <div class="announcements-blocked-banner" role="alert">
          <div class="blocked-banner-header">
            <devtools-icon name="warning-filled"></devtools-icon>
            <span>${i18nString(UIStrings.recordingBlockedWarning)}</span>
          </div>
          <ul class="blocked-targets-list">
            ${input.blockedTargets.map(targetInfo => html`
              <li>${i18nString(UIStrings.frameBlockedReason, {PH1: targetInfo.targetName, PH2: targetInfo.reason || i18nString(UIStrings.unknownError)})}</li>
            `)}
          </ul>
        </div>
      ` : Lit.nothing}
      <div class="announcements-main-pane">
        ${widget(AccessibilityAnnouncementRecordingListView, {items: input.announcements})}
      </div>
    </div>`,
    target);
  // clang-format on
};

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    __announcementsRecorderBinding?: (payload: string) => void;
    // eslint-disable-next-line @typescript-eslint/naming-convention
    __announcementsRecorderBinding_loaded?: boolean;
    // eslint-disable-next-line @typescript-eslint/naming-convention
    __announcementsRecorderBinding_cleanup?: () => void;
  }
}

export interface A11yAnnouncement {
  api: AnnouncementApi;
  message: string;
  politeness: string;
  element: string;
  elementId?: string;
  stack?: string;
  target?: SDK.Target.Target;
  time: number;
}

export function injectedScript(ariaLiveApi: string, jsTriggeredApi: string): void {
  // Prevent duplicate script evaluation if already injected.
  if (window.__announcementsRecorderBinding_loaded) {
    return;
  }

  // Assigns a unique tracking identifier using an in-memory WeakMap (does not mutate DOM elements).
  const elementIdMap = new WeakMap<Element, string>();
  let recordIdCounter = 0;
  function getOrCreateRecordId(element: Element|null|undefined): string {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) {
      return '';
    }
    let id = elementIdMap.get(element);
    if (!id) {
      recordIdCounter++;
      id = String(recordIdCounter);
      elementIdMap.set(element, id);
    }
    return id;
  }

  // Traverses to parent element or across shadow root boundary to host element.
  function getParentOrHost(node: Node|null|undefined): Element|null {
    if (!node) {
      return null;
    }
    if (node.parentElement) {
      return node.parentElement;
    }
    const root = node.getRootNode();
    if (root && root !== node && root instanceof ShadowRoot) {
      return root.host;
    }
    return null;
  }

  // Checks whether an element is visible to accessibility tree (opacity and CSS visibility).
  function checkVisibility(element: Element|null|undefined): boolean {
    if (!element) {
      return false;
    }
    try {
      return element.checkVisibility({
        checkOpacity: true,
        checkVisibilityCSS: true,
      });
    } catch {
      return true;
    }
  }

  // Checks if any ancestor element is hidden via aria-hidden="true" or CSS visibility across shadow boundaries.
  function isAncestorHidden(element: Element|null|undefined): boolean {
    let current = getParentOrHost(element);
    while (current) {
      if (current.getAttribute('aria-hidden') === 'true') {
        return true;
      }
      if (!checkVisibility(current)) {
        return true;
      }
      current = getParentOrHost(current);
    }
    return false;
  }

  // Intercepts programmatic JS announcements by wrapping ariaNotify on the given prototype.
  function patchAriaNotify(proto: object, name: string): ((...args: unknown[]) => unknown)|undefined {
    if (!proto || typeof proto !== 'object') {
      return undefined;
    }
    if (!Object.isExtensible(proto) || Object.isFrozen(proto) || Object.isSealed(proto)) {
      throw new TypeError('Prototype object is non-extensible, frozen, or sealed');
    }
    const desc = Object.getOwnPropertyDescriptor(proto, name);
    if (desc && (!desc.writable && !desc.set)) {
      throw new TypeError('Property ' + name + ' is read-only');
    }
    const protoRecord = proto as Record<string, unknown>;
    const original = protoRecord[name] as ((...args: unknown[]) => unknown) | undefined;
    const wrapped = function(this: Element|Document, message?: string, options?: {politeness?: string}): unknown {
      const bindingFn = window.__announcementsRecorderBinding;
      if (typeof bindingFn === 'function') {
        try {
          const announcement = {
            api: jsTriggeredApi,
            message: String(message || ''),
            politeness: (options && options.politeness) || 'polite',
            elementId: getOrCreateRecordId(this as Element),
            element: (this as Element).outerHTML || (this as Node).nodeName,
            stack: new Error().stack || '',
            time: Date.now(),
          };
          bindingFn(JSON.stringify(announcement));
        } catch {
        }
      }
      if (typeof original === 'function') {
        return original.apply(this, arguments as unknown as unknown[]);
      }
      return undefined;
    };
    Object.defineProperty(proto, name, {
      value: wrapped,
      writable: true,
      configurable: true,
      enumerable: desc ? desc.enumerable : false,
    });
    if (protoRecord[name] !== wrapped) {
      throw new TypeError('Failed to override ' + name + ' on prototype');
    }
    return original;
  }

  // Wrap ariaNotify on prototypes inside isolated try/catch so failure doesn't block MutationObserver.
  let originalElementAriaNotify: ((...args: unknown[]) => unknown)|undefined;
  let originalDocumentAriaNotify: ((...args: unknown[]) => unknown)|undefined;
  let originalAttachShadow: ((init: ShadowRootInit) => ShadowRoot)|undefined;

  try {
    originalElementAriaNotify = patchAriaNotify(Element.prototype, 'ariaNotify');
    originalDocumentAriaNotify = patchAriaNotify(Document.prototype, 'ariaNotify');
  } catch (e: unknown) {
    const bindingFn = window.__announcementsRecorderBinding;
    if (typeof bindingFn === 'function') {
      try {
        const error = e as {message?: string};
        bindingFn(JSON.stringify({
          api: 'blocked',
          reason: error && error.message ? String(error.message) : String(e),
        }));
      } catch {
      }
    }
  }

  // Derives politeness from explicit aria-live attribute or implicit ARIA roles.
  function derivePoliteness(element: Element): string {
    const explicit = element.getAttribute('aria-live');
    if (explicit) {
      return explicit;
    }
    const role = element.getAttribute('role');
    if (role === 'status' || role === 'log') {
      return 'polite';
    }
    if (role === 'alert') {
      return 'assertive';
    }
    return 'off';
  }

  let lastRecordedId: string|null = null;
  let lastRecordedText: string|null = null;
  let lastRecordedPoliteness: string|null = null;
  let lastRecordedTime = 0;

  const pendingLiveNodes = new Set<Element>();
  let scheduledFlushId: number|null = null;

  function scheduleFlush(): void {
    if (scheduledFlushId !== null) {
      return;
    }
    scheduledFlushId = window.requestAnimationFrame(() => {
      scheduledFlushId = null;
      flushPendingNodes();
    });
  }

  function flushPendingNodes(): void {
    const nodes = Array.from(pendingLiveNodes);
    pendingLiveNodes.clear();
    for (let i = 0; i < nodes.length; i++) {
      processLiveNode(nodes[i]);
    }
  }

  // Queues an active live region node for deferred visibility checking and emission.
  function recordLiveNode(node: Node|null|undefined): void {
    if (!node || node.nodeType !== Node.ELEMENT_NODE) {
      return;
    }
    const element = node as Element;
    const politeness = derivePoliteness(element);
    if (politeness === 'off') {
      return;
    }
    if (element.getAttribute('aria-hidden') === 'true') {
      return;
    }
    pendingLiveNodes.add(element);
    scheduleFlush();
  }

  // Emits an announcement payload for an active live region node via the CDP binding after layout.
  function processLiveNode(element: Element): void {
    if ('isConnected' in element && !element.isConnected) {
      return;
    }
    const politeness = derivePoliteness(element);
    if (politeness === 'off') {
      return;
    }
    if (element.getAttribute('aria-hidden') === 'true') {
      return;
    }
    if (!checkVisibility(element)) {
      return;
    }
    if (isAncestorHidden(element)) {
      return;
    }
    const text = (element.textContent || '').trim();
    if (!text) {
      return;
    }
    const elementId = getOrCreateRecordId(element);
    const now = Date.now();
    // Debounce duplicate announcements on the same element within 50ms.
    if (lastRecordedId === elementId && lastRecordedText === text && lastRecordedPoliteness === politeness &&
        (now - lastRecordedTime) < 50) {
      return;
    }
    lastRecordedId = elementId;
    lastRecordedText = text;
    lastRecordedPoliteness = politeness;
    lastRecordedTime = now;

    const bindingFn = window.__announcementsRecorderBinding;
    if (typeof bindingFn === 'function') {
      try {
        const announcement = {
          api: ariaLiveApi,
          message: text,
          politeness,
          elementId,
          element: element.outerHTML || element.nodeName,
          time: now,
        };
        bindingFn(JSON.stringify(announcement));
      } catch {
      }
    }
  }

  // Selector targeting live regions and standard ARIA roles with live semantics.
  const selector = '[aria-live], [role="status"], [role="alert"], [role="log"]';

  function findLiveParent(node: Node|null|undefined): Element|null {
    let current: Node|null|undefined = node;
    while (current) {
      if (current.nodeType === Node.ELEMENT_NODE) {
        const el = current as Element;
        if (el.matches && el.matches(selector)) {
          return el;
        }
        if (el.closest) {
          const match = el.closest(selector);
          if (match) {
            return match;
          }
        }
      }
      current = getParentOrHost(current);
    }
    return null;
  }

  const observer = new MutationObserver((mutations: MutationRecord[]) => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        const target = mutation.target;
        if (target && target.nodeType === Node.ELEMENT_NODE) {
          const liveParent = findLiveParent(target);
          if (liveParent) {
            recordLiveNode(liveParent);
          }
        }
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as Element;
            scanAndObserveShadowRoots(el);

            if (el.matches(selector)) {
              recordLiveNode(el);
            }
            const children = el.querySelectorAll(selector);
            for (let i = 0; i < children.length; i++) {
              recordLiveNode(children[i]);
            }
          }
        }
      } else if (mutation.type === 'characterData') {
        const parent = mutation.target.parentElement || getParentOrHost(mutation.target);
        if (parent) {
          const liveParent = findLiveParent(parent);
          if (liveParent) {
            recordLiveNode(liveParent);
          }
        }
      } else if (mutation.type === 'attributes') {
        // Only record attribute mutations if the mutated element itself is a live region.
        const target = mutation.target;
        if (target && target.nodeType === Node.ELEMENT_NODE) {
          const liveTarget = findLiveParent(target);
          if (liveTarget) {
            recordLiveNode(liveTarget);
          }
        }
      }
    }
  });

  const observedRoots = new WeakSet<Node>();

  function observeSubtree(root: Node|null|undefined): void {
    if (!root || observedRoots.has(root)) {
      return;
    }
    try {
      observer.observe(root, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ['aria-live', 'aria-hidden', 'hidden', 'style', 'class', 'role'],
      });
      observedRoots.add(root);
    } catch {
    }
  }

  function scanAndObserveShadowRoots(root: Element|ShadowRoot|null|undefined): void {
    if (!root) {
      return;
    }
    const queue: Array<Element|ShadowRoot> = [root];
    while (queue.length > 0) {
      const current = queue.pop();
      if (!current) {
        continue;
      }
      const el = current as Element;
      if (el.shadowRoot && !observedRoots.has(el.shadowRoot)) {
        observeSubtree(el.shadowRoot);
        queue.push(el.shadowRoot);
      }
      const descendants = current.querySelectorAll('*');
      for (let i = 0; i < descendants.length; i++) {
        const descendant = descendants[i];
        if (descendant.shadowRoot && !observedRoots.has(descendant.shadowRoot)) {
          observeSubtree(descendant.shadowRoot);
          queue.push(descendant.shadowRoot);
        }
      }
    }
  }

  const rootNode = document.body || document.documentElement;
  if (rootNode) {
    observeSubtree(rootNode);
    scanAndObserveShadowRoots(rootNode);
  }

  // Intercept attachShadow to automatically observe dynamically created open shadow roots.
  try {
    const origAttachShadow = Element.prototype.attachShadow;
    if (typeof origAttachShadow === 'function') {
      originalAttachShadow = origAttachShadow;
      Element.prototype.attachShadow = function(this: Element, init: ShadowRootInit): ShadowRoot {
        const shadow = origAttachShadow.apply(this, [init]);
        if (init && init.mode === 'open') {
          observeSubtree(shadow);
          scanAndObserveShadowRoots(shadow);
        }
        return shadow;
      };
    }
  } catch {
  }

  window.__announcementsRecorderBinding_loaded = true;

  // Registers cleanup function invoked during recording teardown.
  window.__announcementsRecorderBinding_cleanup = function(): void {
    observer.disconnect();
    if (scheduledFlushId !== null) {
      window.cancelAnimationFrame(scheduledFlushId);
      scheduledFlushId = null;
    }
    pendingLiveNodes.clear();
    if (originalElementAriaNotify) {
      try {
        (Element.prototype as unknown as Record<string, unknown>)['ariaNotify'] = originalElementAriaNotify;
      } catch {
      }
    }
    if (originalDocumentAriaNotify) {
      try {
        (Document.prototype as unknown as Record<string, unknown>)['ariaNotify'] = originalDocumentAriaNotify;
      } catch {
      }
    }
    if (originalAttachShadow) {
      try {
        Element.prototype.attachShadow = originalAttachShadow;
      } catch {
      }
    }
    delete window.__announcementsRecorderBinding_loaded;
    delete window.__announcementsRecorderBinding_cleanup;
  };
}

export function teardownScript(): void {
  if (typeof window.__announcementsRecorderBinding_cleanup === 'function') {
    window.__announcementsRecorderBinding_cleanup();
  }
}

export const INJECTED_SCRIPT_SOURCE: string = `(${injectedScript.toString()})(${
    JSON.stringify(AnnouncementApi.ARIA_LIVE)}, ${JSON.stringify(AnnouncementApi.JS_TRIGGERED)});`;

export const TEARDOWN_SCRIPT_SOURCE: string = `(${teardownScript.toString()})();`;

export function checkForBlockedPayload(payload: unknown): string|null {
  if (typeof payload !== 'string') {
    return null;
  }
  try {
    const parsed = JSON.parse(payload);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && parsed.api === 'blocked') {
      return typeof parsed.reason === 'string' ? parsed.reason : '';
    }
  } catch {
    return null;
  }
  return null;
}

export function validateAndSanitizeAnnouncement(payload: unknown): A11yAnnouncement|null {
  if (typeof payload !== 'string') {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch {
    return null;
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return null;
  }

  const parsedObj = parsed as {
    api?: unknown,
    message?: unknown,
    politeness?: unknown,
    element?: unknown,
    time?: unknown,
    elementId?: unknown,
    stack?: unknown,
  };

  if (parsedObj.api !== AnnouncementApi.ARIA_LIVE && parsedObj.api !== AnnouncementApi.JS_TRIGGERED) {
    return null;
  }

  if (typeof parsedObj.message !== 'string') {
    return null;
  }

  if (typeof parsedObj.politeness !== 'string') {
    return null;
  }

  if (typeof parsedObj.element !== 'string') {
    return null;
  }

  if (typeof parsedObj.time !== 'number' || !Number.isFinite(parsedObj.time)) {
    return null;
  }

  let elementId: string|undefined = undefined;
  if ('elementId' in parsedObj) {
    if (typeof parsedObj.elementId !== 'string') {
      return null;
    }
    elementId = parsedObj.elementId;
  }

  let stack: string|undefined = undefined;
  if ('stack' in parsedObj) {
    if (typeof parsedObj.stack !== 'string') {
      return null;
    }
    stack = parsedObj.stack;
  }

  return {
    api: parsedObj.api as AnnouncementApi,
    message: parsedObj.message,
    politeness: parsedObj.politeness,
    element: parsedObj.element,
    ...(elementId !== undefined ? {elementId} : {}),
    ...(stack !== undefined ? {stack} : {}),
    time: parsedObj.time,
  };
}

export function escapeCsvValue(val: string): string {
  const escaped = val.replace(/"/g, '""');
  if (escaped.includes(',') || escaped.includes('\n') || escaped.includes('\r') || escaped.includes('"')) {
    return `"${escaped}"`;
  }
  return escaped;
}

export function buildCsvContent(announcements: readonly A11yAnnouncement[]): string {
  const csvRows: string[] = [];
  csvRows.push(['Time', 'API', 'Politeness', 'Message'].join(','));

  for (const item of announcements) {
    const timeString = new Date(item.time).toISOString();
    const row = [
      escapeCsvValue(timeString),
      escapeCsvValue(item.api),
      escapeCsvValue(item.politeness),
      escapeCsvValue(item.message),
    ];
    csvRows.push(row.join(','));
  }

  return csvRows.join('\r\n');
}

export class AccessibilityAnnouncementRecordingView extends AccessibilitySubPane implements SDK.TargetManager.Observer {
  #announcements: A11yAnnouncement[] = [];
  #filteredAnnouncements: readonly A11yAnnouncement[]|null = null;
  #isRecording = false;
  #blockedTargets = new Map<SDK.Target.Target, string>();
  #scriptIdentifiers = new Map<SDK.Target.Target, Protocol.Page.ScriptIdentifier>();
  #targets = new Set<SDK.Target.Target>();
  #enabledTargets = new Set<SDK.Target.Target>();
  #recordTypeFilter: RecordTypeFilter = RecordTypeFilter.BOTH;
  #textFilter = '';
  #regexFilter: RegExp|null = null;
  readonly #view: View;

  constructor(view: View = DEFAULT_VIEW) {
    super({
      title: i18nString(UIStrings.ariaLiveRecording),
      viewId: 'aria-live-recording',
    });
    this.#view = view;
    SDK.TargetManager.TargetManager.instance().observeTargets(this, {scoped: true});
  }

  override wasShown(): void {
    super.wasShown();
    this.requestUpdate();
  }

  async targetAdded(target: SDK.Target.Target): Promise<void> {
    if (target.type() !== SDK.Target.Type.FRAME || this.#targets.has(target)) {
      return;
    }
    this.#targets.add(target);
    if (this.#isRecording) {
      await this.#enableTarget(target);
    }
  }

  async targetRemoved(target: SDK.Target.Target): Promise<void> {
    this.#targets.delete(target);
    const wasBlocked = this.#blockedTargets.delete(target);
    await this.#disableTarget(target);
    if (wasBlocked) {
      this.requestUpdate();
    }
  }

  async #enableTarget(target: SDK.Target.Target): Promise<void> {
    if (this.#enabledTargets.has(target)) {
      return;
    }
    this.#enabledTargets.add(target);
    const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
    if (!runtimeModel) {
      this.#enabledTargets.delete(target);
      return;
    }
    runtimeModel.addEventListener(SDK.RuntimeModel.Events.BindingCalled, this.#onBindingCalled, this);

    try {
      await runtimeModel.addBinding({
        name: BINDING_NAME,
      });

      const pageAgent = target.pageAgent();
      const {identifier} = await pageAgent.invoke_addScriptToEvaluateOnNewDocument({
        source: INJECTED_SCRIPT_SOURCE,
        runImmediately: true,
      });

      if (!this.#enabledTargets.has(target)) {
        try {
          await pageAgent.invoke_removeScriptToEvaluateOnNewDocument({identifier});
        } catch {
        }
        return;
      }
      this.#scriptIdentifiers.set(target, identifier);
    } catch {
      await this.#disableTarget(target);
    }
  }

  #handleRecordingBlocked(target: SDK.Target.Target|null, blockedReason: string): void {
    if (target) {
      this.#blockedTargets.set(target, blockedReason);
    }
    this.requestUpdate();
  }

  async #disableTarget(target: SDK.Target.Target): Promise<void> {
    if (!this.#enabledTargets.has(target)) {
      return;
    }
    this.#enabledTargets.delete(target);
    const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
    if (runtimeModel) {
      runtimeModel.removeEventListener(SDK.RuntimeModel.Events.BindingCalled, this.#onBindingCalled, this);
      try {
        await runtimeModel.removeBinding({
          name: BINDING_NAME,
        });
      } catch {
      }
    }
    const identifier = this.#scriptIdentifiers.get(target);
    if (identifier) {
      try {
        await target.pageAgent().invoke_removeScriptToEvaluateOnNewDocument({
          identifier,
        });
      } catch {
      }
      this.#scriptIdentifiers.delete(target);
    }
    try {
      const runtimeAgent = target.runtimeAgent();
      await runtimeAgent.invoke_evaluate({
        expression: TEARDOWN_SCRIPT_SOURCE,
        userGesture: false,
        awaitPromise: false,
      });
    } catch {
    }
  }

  #onBindingCalled(event: Common.EventTarget
                       .EventTargetEvent<SDK.RuntimeModel.EventTypes[SDK.RuntimeModel.Events.BindingCalled]>): void {
    const {name, payload} = event.data;
    if (!this.#isRecording) {
      return;
    }
    if (name !== BINDING_NAME) {
      return;
    }
    const runtimeModel = event.source instanceof SDK.RuntimeModel.RuntimeModel ? event.source : null;
    const target = runtimeModel?.target() ?? null;
    const blockedReason = checkForBlockedPayload(payload);
    if (blockedReason !== null) {
      this.#handleRecordingBlocked(target, blockedReason);
      return;
    }
    const announcement = validateAndSanitizeAnnouncement(payload);
    if (!announcement) {
      return;
    }
    if (target) {
      announcement.target = target;
    }
    const last = this.#announcements[this.#announcements.length - 1];
    if (last && last.api === announcement.api && last.message === announcement.message &&
        last.politeness === announcement.politeness && last.element === announcement.element &&
        Math.abs(announcement.time - last.time) < 50) {
      return;
    }
    this.#announcements.push(announcement);
    if (this.#filteredAnnouncements !== null) {
      if (this.#matchesFilter(announcement)) {
        this.#filteredAnnouncements = [...this.#filteredAnnouncements, announcement];
      }
    }
    this.requestUpdate();
  }

  async startRecording(): Promise<void> {
    if (this.#isRecording) {
      return;
    }
    this.#isRecording = true;
    this.#blockedTargets.clear();
    for (const target of this.#targets) {
      await this.#enableTarget(target);
    }
    this.requestUpdate();
  }

  async stopRecording(): Promise<void> {
    if (!this.#isRecording) {
      return;
    }
    this.#isRecording = false;
    for (const target of this.#targets) {
      await this.#disableTarget(target);
    }
    this.requestUpdate();
  }

  clearAnnouncements(): void {
    this.#announcements = [];
    this.#filteredAnnouncements = [];
    this.requestUpdate();
  }

  #matchesFilter(announcement: A11yAnnouncement): boolean {
    if (this.#recordTypeFilter === RecordTypeFilter.ARIA_LIVE && announcement.api !== AnnouncementApi.ARIA_LIVE) {
      return false;
    }
    if (this.#recordTypeFilter === RecordTypeFilter.JS_TRIGGERED && announcement.api !== AnnouncementApi.JS_TRIGGERED) {
      return false;
    }
    if (this.#regexFilter && !this.#regexFilter.test(announcement.message)) {
      return false;
    }
    return true;
  }

  get filteredAnnouncements(): readonly A11yAnnouncement[] {
    if (this.#filteredAnnouncements !== null) {
      return this.#filteredAnnouncements;
    }
    this.#filteredAnnouncements = this.#announcements.filter(announcement => this.#matchesFilter(announcement));
    return this.#filteredAnnouncements;
  }

  #announceFilterMatches(): void {
    const count = this.filteredAnnouncements.length;
    let message: string;
    if (count === 0) {
      message = i18nString(UIStrings.noEventsMatch);
    } else if (count === 1) {
      message = i18nString(UIStrings.oneEventMatches);
    } else {
      message = i18nString(UIStrings.nEventsMatch, {PH1: count});
    }
    UI.ARIAUtils.LiveAnnouncer.alert(message);
  }

  setRecordTypeFilter(type: RecordTypeFilter): void {
    if (this.#recordTypeFilter === type) {
      return;
    }
    this.#recordTypeFilter = type;
    this.#filteredAnnouncements = null;
    this.#announceFilterMatches();
    this.requestUpdate();
  }

  setTextFilter(text: string): void {
    if (this.#textFilter === text) {
      return;
    }
    this.#textFilter = text;
    if (!text) {
      this.#regexFilter = null;
    } else {
      try {
        this.#regexFilter = new RegExp(text, 'i');
      } catch {
        this.#regexFilter = new RegExp('(?!)', 'i');
      }
    }
    this.#filteredAnnouncements = null;
    this.#announceFilterMatches();
    this.requestUpdate();
  }

  #exportCsv(): void {
    const csvContent = this.#buildCsvContent();
    const blob = new Blob(['\ufeff', csvContent], {type: 'text/csv;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    /* eslint-disable-next-line @devtools/no-imperative-dom-api */
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `aria-live-announcements-${Platform.DateUtilities.toISO8601Compact(new Date())}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  #buildCsvContent(): string {
    return buildCsvContent(this.filteredAnnouncements);
  }

  exportCsvForTest(): string {
    return this.#buildCsvContent();
  }

  override performUpdate(): void {
    const blockedTargets: BlockedTargetInfo[] = [];
    for (const [target, reason] of this.#blockedTargets) {
      const targetName = target.name() || target.inspectedURL() || target.id();
      blockedTargets.push({targetName, reason});
    }

    const filteredAnnouncements = this.filteredAnnouncements;
    const input: ViewInput = {
      isRecording: this.#isRecording,
      onToggleRecording: () => {
        if (this.#isRecording) {
          void this.stopRecording();
        } else {
          void this.startRecording();
        }
      },
      onClear: () => {
        this.clearAnnouncements();
      },
      onExportCsv: () => {
        this.#exportCsv();
      },
      canExport: filteredAnnouncements.length > 0,
      recordTypeFilter: this.#recordTypeFilter,
      onRecordTypeFilterChange: (type: RecordTypeFilter) => {
        this.setRecordTypeFilter(type);
      },
      textFilter: this.#textFilter,
      onTextFilterChange: (text: string) => {
        this.setTextFilter(text);
      },
      blockedTargets,
      announcements: filteredAnnouncements,
    };
    this.#view(input, undefined, this.contentElement);
  }

  announcementsForTest(): A11yAnnouncement[] {
    return [...this.#announcements];
  }

  blockedReasonForTargetForTest(target: SDK.Target.Target): string|undefined {
    return this.#blockedTargets.get(target);
  }

  blockedTargetsForTest(): Map<SDK.Target.Target, string> {
    return new Map(this.#blockedTargets);
  }

  isRecordingForTest(): boolean {
    return this.#isRecording;
  }
}
