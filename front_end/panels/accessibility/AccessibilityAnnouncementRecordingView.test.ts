// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {createTarget, describeWithEnvironment, stubNoopSettings} from '../../testing/EnvironmentHelpers.js';
import {MockCDPConnection} from '../../testing/MockCDPConnection.js';

import * as Accessibility from './accessibility.js';

describeWithEnvironment('AccessibilityAnnouncementRecordingView', () => {
  const {
    BINDING_NAME,
    validateAndSanitizeAnnouncement,
    checkForBlockedPayload,
    injectedScript,
    teardownScript,
    INJECTED_SCRIPT_SOURCE,
    TEARDOWN_SCRIPT_SOURCE,
    AnnouncementApi,
  } = Accessibility.AccessibilityAnnouncementRecordingView;

  let target: SDK.Target.Target;
  let view: Accessibility.AccessibilityAnnouncementRecordingView.AccessibilityAnnouncementRecordingView|undefined;

  beforeEach(() => {
    stubNoopSettings();
    const connection = new MockCDPConnection();
    connection.setSuccessHandler('Page.addScriptToEvaluateOnNewDocument',
                                 () => ({
                                   identifier: 'mock-script-id-123' as Protocol.Page.ScriptIdentifier,
                                 }));
    connection.setSuccessHandler('Page.removeScriptToEvaluateOnNewDocument', () => ({}));
    connection.setSuccessHandler('Runtime.addBinding', () => ({}));
    connection.setSuccessHandler('Runtime.removeBinding', () => ({}));
    connection.setSuccessHandler('Runtime.evaluate', () => ({
                                                       result: {type: 'undefined'} as Protocol.Runtime.RemoteObject,
                                                     }));
    target = createTarget({connection});
    SDK.TargetManager.TargetManager.instance().setScopeTarget(target);
  });

  afterEach(async () => {
    if (view) {
      if (view.isRecordingForTest()) {
        await view.stopRecording();
      }
      if (view.isShowing()) {
        view.detach();
      }
    }
    view = undefined;
    SDK.TargetManager.TargetManager.instance().setScopeTarget(null);
  });

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

  describe('Target Lifecycle and CDP Binding Manager', () => {
    it('enables target with binding and script on new document with runImmediately: true', async () => {
      view = new Accessibility.AccessibilityAnnouncementRecordingView.AccessibilityAnnouncementRecordingView();
      renderElementIntoDOM(view);

      assert.isFalse(view.isRecordingForTest());

      const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
      assert.exists(runtimeModel);
      const addBindingSpy = sinon.spy(runtimeModel, 'addBinding');

      const pageAgent = target.pageAgent();
      const runtimeAgent = target.runtimeAgent();
      const addScriptSpy = sinon.spy(pageAgent, 'invoke_addScriptToEvaluateOnNewDocument');
      const evaluateSpy = sinon.spy(runtimeAgent, 'invoke_evaluate');

      await view.startRecording();

      assert.isTrue(view.isRecordingForTest());
      assert.isTrue(addBindingSpy.calledOnceWith({name: BINDING_NAME}));
      sinon.assert.calledOnce(addScriptSpy);
      const addScriptArgs = addScriptSpy.firstCall.args[0];
      assert.isTrue(addScriptArgs.runImmediately);
      assert.strictEqual(addScriptArgs.source, INJECTED_SCRIPT_SOURCE);
      sinon.assert.notCalled(evaluateSpy);
    });

    it('disables target with removeBinding, removeScriptToEvaluateOnNewDocument, and evaluates teardown script',
       async () => {
         view = new Accessibility.AccessibilityAnnouncementRecordingView.AccessibilityAnnouncementRecordingView();
         renderElementIntoDOM(view);

         const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
         assert.exists(runtimeModel);
         const removeBindingSpy = sinon.spy(runtimeModel, 'removeBinding');

         const pageAgent = target.pageAgent();
         const runtimeAgent = target.runtimeAgent();
         const removeScriptSpy = sinon.spy(pageAgent, 'invoke_removeScriptToEvaluateOnNewDocument');
         const evaluateSpy = sinon.spy(runtimeAgent, 'invoke_evaluate');

         await view.startRecording();
         await view.stopRecording();

         assert.isFalse(view.isRecordingForTest());
         assert.isTrue(removeBindingSpy.calledOnceWith({name: BINDING_NAME}));
         assert.isTrue(
             removeScriptSpy.calledOnceWith({identifier: 'mock-script-id-123' as Protocol.Page.ScriptIdentifier}));
         sinon.assert.calledOnce(evaluateSpy);
         assert.strictEqual(evaluateSpy.firstCall.args[0].expression, TEARDOWN_SCRIPT_SOURCE);
       });

    it('cleans up script if target is disabled while addScriptToEvaluateOnNewDocument is in flight', async () => {
      view = new Accessibility.AccessibilityAnnouncementRecordingView.AccessibilityAnnouncementRecordingView();
      renderElementIntoDOM(view);

      const pageAgent = target.pageAgent();
      const removeScriptSpy = sinon.spy(pageAgent, 'invoke_removeScriptToEvaluateOnNewDocument');

      const startPromise = view.startRecording();
      await view.stopRecording();
      await startPromise;

      assert.isFalse(view.isRecordingForTest());
      sinon.assert.called(removeScriptSpy);
    });

    it('receives binding events, associates target, and clears announcements', async () => {
      view = new Accessibility.AccessibilityAnnouncementRecordingView.AccessibilityAnnouncementRecordingView();
      renderElementIntoDOM(view);

      await view.startRecording();

      const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
      assert.exists(runtimeModel);

      const announcementPayload = {
        api: 'aria-live',
        message: 'Notification arrived',
        politeness: 'polite',
        element: '<div aria-live="polite">Notification arrived</div>',
        time: Date.now(),
      };

      runtimeModel.dispatchEventToListeners(SDK.RuntimeModel.Events.BindingCalled, {
        name: BINDING_NAME,
        payload: JSON.stringify(announcementPayload),
        executionContextId: 1 as Protocol.Runtime.ExecutionContextId,
      });

      const announcements = view.announcementsForTest();
      assert.lengthOf(announcements, 1);
      assert.strictEqual(announcements[0].message, 'Notification arrived');
      assert.strictEqual(announcements[0].politeness, 'polite');
      assert.strictEqual(announcements[0].target, target);

      view.clearAnnouncements();
      assert.lengthOf(view.announcementsForTest(), 0);
    });

    it('deduplicates rapid duplicate announcements received within 50ms', async () => {
      view = new Accessibility.AccessibilityAnnouncementRecordingView.AccessibilityAnnouncementRecordingView();
      renderElementIntoDOM(view);

      await view.startRecording();

      const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
      assert.exists(runtimeModel);

      const now = Date.now();
      const announcementPayload = {
        api: 'aria-live',
        message: 'Duplicate text',
        politeness: 'polite',
        element: '<div aria-live="polite">Duplicate text</div>',
        time: now,
      };

      runtimeModel.dispatchEventToListeners(SDK.RuntimeModel.Events.BindingCalled, {
        name: BINDING_NAME,
        payload: JSON.stringify(announcementPayload),
        executionContextId: 1 as Protocol.Runtime.ExecutionContextId,
      });

      runtimeModel.dispatchEventToListeners(SDK.RuntimeModel.Events.BindingCalled, {
        name: BINDING_NAME,
        payload: JSON.stringify({...announcementPayload, time: now + 10}),
        executionContextId: 1 as Protocol.Runtime.ExecutionContextId,
      });

      const announcements = view.announcementsForTest();
      assert.lengthOf(announcements, 1);
    });

    it('preserves rapid announcements with differing politeness received within 50ms', async () => {
      view = new Accessibility.AccessibilityAnnouncementRecordingView.AccessibilityAnnouncementRecordingView();
      renderElementIntoDOM(view);

      await view.startRecording();

      const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
      assert.exists(runtimeModel);

      const now = Date.now();
      const announcementPayload = {
        api: 'aria-live',
        message: 'Politeness changed',
        politeness: 'polite',
        element: '<div>Politeness changed</div>',
        time: now,
      };

      // 1. First announcement with politeness: polite
      runtimeModel.dispatchEventToListeners(SDK.RuntimeModel.Events.BindingCalled, {
        name: BINDING_NAME,
        payload: JSON.stringify(announcementPayload),
        executionContextId: 1 as Protocol.Runtime.ExecutionContextId,
      });

      // 2. Second announcement within 10ms with politeness: assertive (must NOT be deduplicated)
      runtimeModel.dispatchEventToListeners(SDK.RuntimeModel.Events.BindingCalled, {
        name: BINDING_NAME,
        payload: JSON.stringify({...announcementPayload, politeness: 'assertive', time: now + 10}),
        executionContextId: 1 as Protocol.Runtime.ExecutionContextId,
      });

      // 3. Third announcement within 20ms with politeness: assertive (must be deduplicated)
      runtimeModel.dispatchEventToListeners(SDK.RuntimeModel.Events.BindingCalled, {
        name: BINDING_NAME,
        payload: JSON.stringify({...announcementPayload, politeness: 'assertive', time: now + 20}),
        executionContextId: 1 as Protocol.Runtime.ExecutionContextId,
      });

      const announcements = view.announcementsForTest();
      assert.lengthOf(announcements, 2);
      assert.strictEqual(announcements[0].politeness, 'polite');
      assert.strictEqual(announcements[1].politeness, 'assertive');
    });

    it('handles blocked payload by recording per-target blocked reason while keeping recording active', async () => {
      view = new Accessibility.AccessibilityAnnouncementRecordingView.AccessibilityAnnouncementRecordingView();
      renderElementIntoDOM(view);

      await view.startRecording();

      const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
      assert.exists(runtimeModel);

      const blockedPayload = {
        api: 'blocked',
        reason: 'Prototype mutation blocked by security policy',
      };

      runtimeModel.dispatchEventToListeners(SDK.RuntimeModel.Events.BindingCalled, {
        name: BINDING_NAME,
        payload: JSON.stringify(blockedPayload),
        executionContextId: 1 as Protocol.Runtime.ExecutionContextId,
      });

      // Recording should remain active globally
      assert.isTrue(view.isRecordingForTest());
      assert.strictEqual(view.blockedReasonForTargetForTest(target), 'Prototype mutation blocked by security policy');
      assert.strictEqual(view.blockedTargetsForTest().get(target), 'Prototype mutation blocked by security policy');

      // Live regions still record
      const livePayload = {
        api: 'aria-live',
        message: 'Live region still works',
        politeness: 'polite',
        element: '<div>Live region still works</div>',
        time: Date.now(),
      };
      runtimeModel.dispatchEventToListeners(SDK.RuntimeModel.Events.BindingCalled, {
        name: BINDING_NAME,
        payload: JSON.stringify(livePayload),
        executionContextId: 1 as Protocol.Runtime.ExecutionContextId,
      });

      assert.lengthOf(view.announcementsForTest(), 1);
      assert.strictEqual(view.announcementsForTest()[0].message, 'Live region still works');
    });

    it('continues recording across view detach and re-attach (background recording)', async () => {
      view = new Accessibility.AccessibilityAnnouncementRecordingView.AccessibilityAnnouncementRecordingView();
      renderElementIntoDOM(view);

      await view.startRecording();
      assert.isTrue(view.isRecordingForTest());

      // Detach view (simulating tab hide when user selects Sources or Styles)
      view.detach();
      assert.isFalse(view.isShowing());

      const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
      assert.exists(runtimeModel);

      const backgroundPayload = {
        api: 'aria-live',
        message: 'Captured while hidden',
        politeness: 'polite',
        element: '<div>Captured while hidden</div>',
        time: Date.now(),
      };

      runtimeModel.dispatchEventToListeners(SDK.RuntimeModel.Events.BindingCalled, {
        name: BINDING_NAME,
        payload: JSON.stringify(backgroundPayload),
        executionContextId: 1 as Protocol.Runtime.ExecutionContextId,
      });

      // Verify announcement is captured in background
      assert.lengthOf(view.announcementsForTest(), 1);
      assert.strictEqual(view.announcementsForTest()[0].message, 'Captured while hidden');

      // Re-attach view (simulating wasShown)
      renderElementIntoDOM(view);
      assert.isTrue(view.isShowing());
      assert.isTrue(view.isRecordingForTest());
    });

    it('ignores binding calls when recording is not active', async () => {
      view = new Accessibility.AccessibilityAnnouncementRecordingView.AccessibilityAnnouncementRecordingView();
      renderElementIntoDOM(view);

      const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
      assert.exists(runtimeModel);

      runtimeModel.dispatchEventToListeners(SDK.RuntimeModel.Events.BindingCalled, {
        name: BINDING_NAME,
        payload: JSON.stringify({
          api: 'aria-live',
          message: 'Ignored',
          politeness: 'polite',
          element: '<div></div>',
          time: Date.now(),
        }),
        executionContextId: 1 as Protocol.Runtime.ExecutionContextId,
      });

      assert.lengthOf(view.announcementsForTest(), 0);
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
