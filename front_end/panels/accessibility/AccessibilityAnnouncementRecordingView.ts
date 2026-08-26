// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';

import {AccessibilitySubPane} from './AccessibilitySubPane.js';

const UIStrings = {
  /**
   * @description Title for the ARIA-Live and JS announcements recording tool
   */
  ariaLiveRecording: 'Announcements recording',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/accessibility/AccessibilityAnnouncementRecordingView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export const BINDING_NAME = '__announcementsRecorderBinding';

export const enum AnnouncementApi {
  ARIA_LIVE = 'aria-live',
  JS_TRIGGERED = 'js-triggered',
}

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
  let lastRecordedTime = 0;

  // Emits an announcement payload for an active live region node via the CDP binding.
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
    if (lastRecordedId === elementId && lastRecordedText === text && (now - lastRecordedTime) < 50) {
      return;
    }
    lastRecordedId = elementId;
    lastRecordedText = text;
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
            if (el.shadowRoot) {
              observeSubtree(el.shadowRoot);
              scanAndObserveShadowRoots(el.shadowRoot);
            }
            scanAndObserveShadowRoots(el);

            if (el.matches && el.matches(selector)) {
              recordLiveNode(el);
            }
            const children = el.querySelectorAll ? el.querySelectorAll(selector) : [];
            for (const child of children) {
              recordLiveNode(child);
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

  function scanAndObserveShadowRoots(node: Node|null|undefined): void {
    if (!node) {
      return;
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element;
      if (el.shadowRoot) {
        observeSubtree(el.shadowRoot);
        scanAndObserveShadowRoots(el.shadowRoot);
      }
    }
    const children = (node as Element).children || [];
    for (let i = 0; i < children.length; i++) {
      scanAndObserveShadowRoots(children[i]);
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

export const INJECTED_SCRIPT_SOURCE = `(${injectedScript.toString()})(${JSON.stringify(AnnouncementApi.ARIA_LIVE)}, ${
    JSON.stringify(AnnouncementApi.JS_TRIGGERED)});`;

export const TEARDOWN_SCRIPT_SOURCE = `(${teardownScript.toString()})();`;

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

export class AccessibilityAnnouncementRecordingView extends AccessibilitySubPane {
  constructor() {
    super({
      title: i18nString(UIStrings.ariaLiveRecording),
      viewId: 'aria-live-recording',
    });
  }
}
