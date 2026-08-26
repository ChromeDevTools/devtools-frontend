// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';

import * as Accessibility from './accessibility.js';

describeWithEnvironment('AccessibilityAnnouncementRecordingView', () => {
  const {
    validateAndSanitizeAnnouncement,
    checkForBlockedPayload,
    injectedScript,
    teardownScript,
    INJECTED_SCRIPT_SOURCE,
    TEARDOWN_SCRIPT_SOURCE,
    AnnouncementApi,
  } = Accessibility.AccessibilityAnnouncementRecordingView;

  function setupMockBinding(recorded: Array<Record<string, unknown>>): void {
    window.__announcementsRecorderBinding = (payload: string) => {
      try {
        recorded.push(JSON.parse(payload));
      } catch {
      }
    };
  }

  describe('validateAndSanitizeAnnouncement', () => {
    it('validates and sanitizes a valid aria-live payload', () => {
      const payload = JSON.stringify({
        api: 'aria-live',
        message: 'Status updated',
        politeness: 'polite',
        element: '<div aria-live="polite">Status updated</div>',
        elementId: 'rec-1',
        time: 1234567890,
      });

      const result = validateAndSanitizeAnnouncement(payload);
      assert.isNotNull(result);
      assert.deepEqual(result, {
        api: AnnouncementApi.ARIA_LIVE,
        message: 'Status updated',
        politeness: 'polite',
        element: '<div aria-live="polite">Status updated</div>',
        elementId: 'rec-1',
        time: 1234567890,
      });
    });

    it('validates and preserves stack trace for JS triggered payload', () => {
      const payload = JSON.stringify({
        api: 'js-triggered',
        message: 'Form submitted',
        politeness: 'assertive',
        element: '<form></form>',
        elementId: 'rec-2',
        stack: 'Error\n    at submit (https://example.com/app.js:10:5)',
        time: 1234567890,
      });

      const result = validateAndSanitizeAnnouncement(payload);
      assert.isNotNull(result);
      assert.deepEqual(result, {
        api: AnnouncementApi.JS_TRIGGERED,
        message: 'Form submitted',
        politeness: 'assertive',
        element: '<form></form>',
        elementId: 'rec-2',
        stack: 'Error\n    at submit (https://example.com/app.js:10:5)',
        time: 1234567890,
      });
    });

    it('returns null for non-string payloads', () => {
      assert.isNull(validateAndSanitizeAnnouncement(null));
      assert.isNull(validateAndSanitizeAnnouncement(undefined));
      assert.isNull(validateAndSanitizeAnnouncement(12345));
      assert.isNull(validateAndSanitizeAnnouncement({}));
    });

    it('returns null for invalid JSON', () => {
      assert.isNull(validateAndSanitizeAnnouncement('{ invalid json '));
      assert.isNull(validateAndSanitizeAnnouncement('not json at all'));
    });

    it('returns null for non-object parsed JSON', () => {
      assert.isNull(validateAndSanitizeAnnouncement(JSON.stringify(['array', 'payload'])));
      assert.isNull(validateAndSanitizeAnnouncement(JSON.stringify(12345)));
      assert.isNull(validateAndSanitizeAnnouncement(JSON.stringify(true)));
    });

    it('returns null for unknown API types', () => {
      const payload = JSON.stringify({
        api: 'unknown-api',
        message: 'hello',
        politeness: 'polite',
        element: '<div></div>',
        time: 12345,
      });
      assert.isNull(validateAndSanitizeAnnouncement(payload));
    });

    it('returns null when required fields are missing or have wrong types', () => {
      // Missing message
      assert.isNull(validateAndSanitizeAnnouncement(JSON.stringify({
        api: 'aria-live',
        politeness: 'polite',
        element: '<div></div>',
        time: 12345,
      })));

      // Non-string politeness
      assert.isNull(validateAndSanitizeAnnouncement(JSON.stringify({
        api: 'aria-live',
        message: 'msg',
        politeness: 123,
        element: '<div></div>',
        time: 12345,
      })));

      // Non-string element
      assert.isNull(validateAndSanitizeAnnouncement(JSON.stringify({
        api: 'aria-live',
        message: 'msg',
        politeness: 'polite',
        element: 456,
        time: 12345,
      })));

      // Non-finite time
      assert.isNull(validateAndSanitizeAnnouncement(JSON.stringify({
        api: 'aria-live',
        message: 'msg',
        politeness: 'polite',
        element: '<div></div>',
        time: 'yesterday',
      })));

      // Non-string elementId
      assert.isNull(validateAndSanitizeAnnouncement(JSON.stringify({
        api: 'aria-live',
        message: 'msg',
        politeness: 'polite',
        element: '<div></div>',
        time: 12345,
        elementId: 999,
      })));

      // Non-string stack
      assert.isNull(validateAndSanitizeAnnouncement(JSON.stringify({
        api: 'js-triggered',
        message: 'msg',
        politeness: 'polite',
        element: '<div></div>',
        time: 12345,
        stack: {},
      })));
    });
  });

  describe('checkForBlockedPayload', () => {
    it('detects blocked payload and extracts reason string', () => {
      const payload = JSON.stringify({
        api: 'blocked',
        reason: 'Prototype is frozen or sealed',
      });
      assert.strictEqual(checkForBlockedPayload(payload), 'Prototype is frozen or sealed');
    });

    it('returns empty string if reason is not provided or not a string', () => {
      const payload = JSON.stringify({
        api: 'blocked',
      });
      assert.strictEqual(checkForBlockedPayload(payload), '');
    });

    it('returns null for non-blocked payloads and non-string inputs', () => {
      assert.isNull(checkForBlockedPayload(JSON.stringify({api: 'aria-live', message: 'Hello'})));
      assert.isNull(checkForBlockedPayload(null));
      assert.isNull(checkForBlockedPayload(undefined));
      assert.isNull(checkForBlockedPayload('{invalid json'));
    });
  });

  describe('Injected Interception Script Execution', () => {
    afterEach(() => {
      teardownScript();
      delete window.__announcementsRecorderBinding;
      delete window.__announcementsRecorderBinding_loaded;
      delete window.__announcementsRecorderBinding_cleanup;
    });

    it('intercepts Element.prototype.ariaNotify and Document.prototype.ariaNotify', () => {
      const recorded: Array<Record<string, unknown>> = [];
      setupMockBinding(recorded);

      new Function(INJECTED_SCRIPT_SOURCE)();

      const btn = document.createElement('button');
      renderElementIntoDOM(btn);

      // Call Element ariaNotify
      (btn as unknown as {ariaNotify: (msg: string, opt?: {politeness?: string}) => void}).ariaNotify('Button alert', {
        politeness: 'assertive',
      });

      // Call Document ariaNotify
      (document as unknown as {
        ariaNotify: (msg: string, opt?: {politeness?: string}) => void,
      }).ariaNotify('Document notice', {politeness: 'polite'});

      assert.lengthOf(recorded, 2);
      assert.strictEqual(recorded[0].api, 'js-triggered');
      assert.strictEqual(recorded[0].message, 'Button alert');
      assert.strictEqual(recorded[0].politeness, 'assertive');
      assert.exists(recorded[0].stack);

      assert.strictEqual(recorded[1].api, 'js-triggered');
      assert.strictEqual(recorded[1].message, 'Document notice');
      assert.strictEqual(recorded[1].politeness, 'polite');

      btn.remove();
    });

    it('captures aria-live text mutations without polluting DOM attributes', async () => {
      const recorded: Array<Record<string, unknown>> = [];
      setupMockBinding(recorded);

      new Function(INJECTED_SCRIPT_SOURCE)();

      const container = document.createElement('div');

      const liveRegion = document.createElement('div');
      liveRegion.setAttribute('aria-live', 'polite');
      container.appendChild(liveRegion);

      const nonLiveElement = document.createElement('div');
      nonLiveElement.textContent = 'Static non-live text';
      container.appendChild(nonLiveElement);

      renderElementIntoDOM(container);
      await new Promise(resolve => setTimeout(resolve, 30));
      recorded.length = 0;

      // 1. Attribute change on non-live element (CRITICAL FIX check: must NOT record)
      nonLiveElement.className = 'some-new-class';
      await new Promise(resolve => setTimeout(resolve, 50));
      assert.lengthOf(recorded, 0, 'Attribute change on non-live element should not be recorded');

      // 2. Text mutation on live region (must record)
      liveRegion.textContent = 'Live update!';
      await new Promise(resolve => setTimeout(resolve, 50));
      assert.lengthOf(recorded, 1);
      assert.strictEqual(recorded[0].message, 'Live update!');
      assert.strictEqual(recorded[0].politeness, 'polite');

      // 3. Verify NO DOM attribute pollution occurred on liveRegion
      assert.isFalse(liveRegion.hasAttribute('data-devtools-aria-live-record-id'));
      assert.isNull(liveRegion.getAttribute('data-devtools-aria-live-record-id'));

      container.remove();
    });

    it('assigns unique element IDs across cloned elements', async () => {
      const recorded: Array<Record<string, unknown>> = [];
      setupMockBinding(recorded);

      new Function(INJECTED_SCRIPT_SOURCE)();

      const container = document.createElement('div');
      const liveRegion = document.createElement('div');
      liveRegion.setAttribute('aria-live', 'polite');
      liveRegion.textContent = 'Original text';
      container.appendChild(liveRegion);
      renderElementIntoDOM(container);

      await new Promise(resolve => setTimeout(resolve, 30));
      recorded.length = 0;

      // Mutate original live region
      liveRegion.textContent = 'Original updated';
      await new Promise(resolve => setTimeout(resolve, 50));
      assert.lengthOf(recorded, 1);
      const originalId = recorded[0].elementId;

      // Clone original element and add to container
      const cloned = liveRegion.cloneNode(true) as HTMLElement;
      cloned.textContent = 'Clone initial';
      container.appendChild(cloned);
      await new Promise(resolve => setTimeout(resolve, 50));

      cloned.textContent = 'Clone updated';
      await new Promise(resolve => setTimeout(resolve, 50));

      const cloneRecords = recorded.filter(r => r.message === 'Clone updated');
      assert.lengthOf(cloneRecords, 1);
      assert.notStrictEqual(cloneRecords[0].elementId, originalId);

      container.remove();
    });

    it('captures live region mutations inside open Shadow DOM trees', async () => {
      const recorded: Array<Record<string, unknown>> = [];
      setupMockBinding(recorded);

      new Function(INJECTED_SCRIPT_SOURCE)();

      const host = document.createElement('div');
      const shadowRoot = host.attachShadow({mode: 'open'});
      const shadowLiveRegion = document.createElement('span');
      shadowLiveRegion.setAttribute('role', 'status');
      shadowRoot.appendChild(shadowLiveRegion);

      renderElementIntoDOM(host);
      await new Promise(resolve => setTimeout(resolve, 30));
      recorded.length = 0;

      shadowLiveRegion.textContent = 'Notification in shadow DOM';
      await new Promise(resolve => setTimeout(resolve, 50));

      assert.lengthOf(recorded, 1);
      assert.strictEqual(recorded[0].message, 'Notification in shadow DOM');
      assert.strictEqual(recorded[0].politeness, 'polite');

      host.remove();
    });

    it('isolates ariaNotify failure so MutationObserver still captures live regions', async () => {
      const recorded: Array<Record<string, unknown>> = [];
      setupMockBinding(recorded);

      const frozenElementProto = Object.freeze({
        ariaNotify: function() {},
      });

      const container = document.createElement('div');
      const liveRegion = document.createElement('div');
      liveRegion.setAttribute('aria-live', 'assertive');
      container.appendChild(liveRegion);
      renderElementIntoDOM(container);

      // Run script where Element prototype throws on mutation
      const runScript =
          new Function('Element', 'Document', 'window', 'Node', 'MutationObserver', INJECTED_SCRIPT_SOURCE);
      runScript(
          {prototype: frozenElementProto},
          {prototype: {}},
          window,
          Node,
          MutationObserver,
      );

      // Verify blocked event was emitted for ariaNotify
      assert.isTrue(recorded.some(r => r.api === 'blocked'));
      recorded.length = 0;

      // Verify that MutationObserver still functions for ARIA-live
      liveRegion.textContent = 'Assertive message despite frozen proto';
      await new Promise(resolve => setTimeout(resolve, 50));

      const liveAnnouncements = recorded.filter(r => r.api === 'aria-live');
      assert.lengthOf(liveAnnouncements, 1);
      assert.strictEqual(liveAnnouncements[0].message, 'Assertive message despite frozen proto');
      assert.strictEqual(liveAnnouncements[0].politeness, 'assertive');

      container.remove();
    });

    it('restores original methods and observer on teardown', () => {
      const originalElementAriaNotify = function() {};
      const originalDocumentAriaNotify = function() {};

      const mockElement = {prototype: {ariaNotify: originalElementAriaNotify}};
      const mockDocument = {prototype: {ariaNotify: originalDocumentAriaNotify}};
      const disconnectSpy = sinon.spy();

      const mockWindow: Window = {
        __announcementsRecorderBinding: () => {},
      } as unknown as Window;

      class MockObserver {
        observe() {
        }
        disconnect = disconnectSpy;
      }

      const runScript =
          new Function('Element', 'Document', 'window', 'Node', 'MutationObserver', INJECTED_SCRIPT_SOURCE);
      runScript(mockElement, mockDocument, mockWindow, {ELEMENT_NODE: 1}, MockObserver);

      assert.notStrictEqual(mockElement.prototype.ariaNotify, originalElementAriaNotify);
      assert.isTrue(Boolean(mockWindow.__announcementsRecorderBinding_loaded));

      // Run teardown
      const runTeardown = new Function('window', TEARDOWN_SCRIPT_SOURCE);
      runTeardown(mockWindow);

      sinon.assert.calledOnce(disconnectSpy);
      assert.strictEqual(mockElement.prototype.ariaNotify, originalElementAriaNotify);
      assert.strictEqual(mockDocument.prototype.ariaNotify, originalDocumentAriaNotify);
      assert.isUndefined(mockWindow.__announcementsRecorderBinding_loaded);
      assert.isUndefined(mockWindow.__announcementsRecorderBinding_cleanup);
    });

    it('exports INJECTED_SCRIPT_SOURCE and TEARDOWN_SCRIPT_SOURCE as valid IIFE strings', () => {
      assert.isString(INJECTED_SCRIPT_SOURCE);
      assert.isString(TEARDOWN_SCRIPT_SOURCE);
      assert.match(INJECTED_SCRIPT_SOURCE, /^\(function\b[\s\S]*\)\([\s\S]*\);?$/);
      assert.match(TEARDOWN_SCRIPT_SOURCE, /^\(function\b[\s\S]*\)\([\s\S]*\);?$/);
    });

    it('works when calling injectedScript and teardownScript functions directly', () => {
      const recorded: Array<Record<string, unknown>> = [];
      setupMockBinding(recorded);

      injectedScript(AnnouncementApi.ARIA_LIVE, AnnouncementApi.JS_TRIGGERED);

      const btn = document.createElement('button');
      renderElementIntoDOM(btn);
      (btn as unknown as {ariaNotify: (msg: string) => void}).ariaNotify('Direct function call');

      assert.lengthOf(recorded, 1);
      assert.strictEqual(recorded[0].message, 'Direct function call');
      assert.strictEqual(recorded[0].api, AnnouncementApi.JS_TRIGGERED);

      teardownScript();
      btn.remove();
    });
  });
});
