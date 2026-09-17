// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import {assertScreenshot, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {createTarget, describeWithEnvironment, stubNoopSettings} from '../../testing/EnvironmentHelpers.js';
import {MockCDPConnection} from '../../testing/MockCDPConnection.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';

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
    RecordTypeFilter,
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

  function setupMockBinding(recorded: Array<Record<string, unknown>>): {
    waitForAnnouncement: (predicate?: (item: Record<string, unknown>) => boolean) => Promise<Record<string, unknown>>,
    clear: () => void,
  } {
    const unconsumed: Array<Record<string, unknown>> = [];
    const waiters: Array<{
      predicate: (item: Record<string, unknown>) => boolean,
      resolve: (item: Record<string, unknown>) => void,
    }> = [];
    window.__announcementsRecorderBinding = (payload: string) => {
      try {
        const parsed = JSON.parse(payload);
        recorded.push(parsed);

        const waiterIndex = waiters.findIndex(w => w.predicate(parsed));
        if (waiterIndex !== -1) {
          const {resolve} = waiters.splice(waiterIndex, 1)[0];
          resolve(parsed);
        } else {
          unconsumed.push(parsed);
        }
      } catch {
      }
    };

    return {
      waitForAnnouncement: (predicate = () => true) => {
        const unconsumedIndex = unconsumed.findIndex(predicate);
        if (unconsumedIndex !== -1) {
          const [item] = unconsumed.splice(unconsumedIndex, 1);
          return Promise.resolve(item);
        }
        return new Promise<Record<string, unknown>>(resolve => {
          waiters.push({predicate, resolve});
        });
      },
      clear: () => {
        recorded.length = 0;
        unconsumed.length = 0;
      },
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

  describe('Toolbar Controls and State Integration', () => {
    function emitBindingPayload(payload: Record<string, unknown>): void {
      const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
      assert.exists(runtimeModel);
      runtimeModel.dispatchEventToListeners(SDK.RuntimeModel.Events.BindingCalled, {
        name: BINDING_NAME,
        payload: JSON.stringify(payload),
        executionContextId: 1 as Protocol.Runtime.ExecutionContextId,
      });
    }

    it('initializes with default toolbar state and propagates to view input', async () => {
      const viewStub = createViewFunctionStub(
          Accessibility.AccessibilityAnnouncementRecordingView.AccessibilityAnnouncementRecordingView);
      view = new Accessibility.AccessibilityAnnouncementRecordingView.AccessibilityAnnouncementRecordingView(viewStub);
      renderElementIntoDOM(view);

      const input = await viewStub.nextInput;
      assert.isFalse(input.isRecording);
      assert.strictEqual(input.recordTypeFilter, RecordTypeFilter.BOTH);
      assert.strictEqual(input.textFilter, '');
      assert.isEmpty(input.blockedTargets);
      assert.isEmpty(input.announcements);
    });

    it('toggles recording on and off via onToggleRecording', async () => {
      const viewStub = createViewFunctionStub(
          Accessibility.AccessibilityAnnouncementRecordingView.AccessibilityAnnouncementRecordingView);
      view = new Accessibility.AccessibilityAnnouncementRecordingView.AccessibilityAnnouncementRecordingView(viewStub);
      renderElementIntoDOM(view);

      let input = await viewStub.nextInput;
      assert.isFalse(input.isRecording);

      input.onToggleRecording();
      input = await viewStub.nextInput;
      assert.isTrue(input.isRecording);
      assert.isTrue(view.isRecordingForTest());

      input.onToggleRecording();
      input = await viewStub.nextInput;
      assert.isFalse(input.isRecording);
      assert.isFalse(view.isRecordingForTest());
    });

    it('clears announcements list on onClear', async () => {
      const viewStub = createViewFunctionStub(
          Accessibility.AccessibilityAnnouncementRecordingView.AccessibilityAnnouncementRecordingView);
      view = new Accessibility.AccessibilityAnnouncementRecordingView.AccessibilityAnnouncementRecordingView(viewStub);
      renderElementIntoDOM(view);

      let input = await viewStub.nextInput;
      await view.startRecording();
      input = await viewStub.nextInput;

      emitBindingPayload({
        api: 'aria-live',
        message: 'First update',
        politeness: 'polite',
        element: '<div>First update</div>',
        time: 1000,
      });
      input = await viewStub.nextInput;
      assert.lengthOf(input.announcements, 1);

      input.onClear();
      input = await viewStub.nextInput;
      assert.isEmpty(input.announcements);
      assert.isEmpty(view.announcementsForTest());
    });

    it('filters announcements by record type (Record both, Aria-Live Only, Announcements Only)', async () => {
      const viewStub = createViewFunctionStub(
          Accessibility.AccessibilityAnnouncementRecordingView.AccessibilityAnnouncementRecordingView);
      view = new Accessibility.AccessibilityAnnouncementRecordingView.AccessibilityAnnouncementRecordingView(viewStub);
      renderElementIntoDOM(view);

      let input = await viewStub.nextInput;
      await view.startRecording();
      input = await viewStub.nextInput;

      emitBindingPayload({
        api: 'aria-live',
        message: 'Live status',
        politeness: 'polite',
        element: '<div>Live status</div>',
        time: 1000,
      });
      await viewStub.nextInput;

      emitBindingPayload({
        api: 'js-triggered',
        message: 'JS notice',
        politeness: 'assertive',
        element: '<form></form>',
        time: 2000,
      });
      input = await viewStub.nextInput;
      assert.lengthOf(input.announcements, 2);

      // Filter: Aria-Live Only
      input.onRecordTypeFilterChange(RecordTypeFilter.ARIA_LIVE);
      input = await viewStub.nextInput;
      assert.strictEqual(input.recordTypeFilter, RecordTypeFilter.ARIA_LIVE);
      assert.lengthOf(input.announcements, 1);
      assert.strictEqual(input.announcements[0].api, AnnouncementApi.ARIA_LIVE);
      assert.strictEqual(input.announcements[0].message, 'Live status');

      // Filter: JS-triggered Only
      input.onRecordTypeFilterChange(RecordTypeFilter.JS_TRIGGERED);
      input = await viewStub.nextInput;
      assert.strictEqual(input.recordTypeFilter, RecordTypeFilter.JS_TRIGGERED);
      assert.lengthOf(input.announcements, 1);
      assert.strictEqual(input.announcements[0].api, AnnouncementApi.JS_TRIGGERED);
      assert.strictEqual(input.announcements[0].message, 'JS notice');

      // Filter: Record both
      input.onRecordTypeFilterChange(RecordTypeFilter.BOTH);
      input = await viewStub.nextInput;
      assert.strictEqual(input.recordTypeFilter, RecordTypeFilter.BOTH);
      assert.lengthOf(input.announcements, 2);
    });

    it('strictly isolates regex text filter to message and ignores element HTML', async () => {
      const viewStub = createViewFunctionStub(
          Accessibility.AccessibilityAnnouncementRecordingView.AccessibilityAnnouncementRecordingView);
      view = new Accessibility.AccessibilityAnnouncementRecordingView.AccessibilityAnnouncementRecordingView(viewStub);
      renderElementIntoDOM(view);

      let input = await viewStub.nextInput;
      await view.startRecording();
      input = await viewStub.nextInput;

      emitBindingPayload({
        api: 'aria-live',
        message: 'Order placed successfully',
        politeness: 'polite',
        element: '<section class="checkout-summary"><div id="order-msg">Order placed successfully</div></section>',
        time: 1000,
      });
      await viewStub.nextInput;

      emitBindingPayload({
        api: 'js-triggered',
        message: 'Payment received',
        politeness: 'assertive',
        element: '<div id="payment-widget" class="order-panel">Payment received</div>',
        time: 2000,
      });
      input = await viewStub.nextInput;
      assert.lengthOf(input.announcements, 2);

      // Filtering for "checkout-summary" (present only in element HTML, NOT in message) must yield 0 results
      input.onTextFilterChange('checkout-summary');
      input = await viewStub.nextInput;
      assert.strictEqual(input.textFilter, 'checkout-summary');
      assert.lengthOf(input.announcements, 0, 'Filter must not match against element HTML');

      // Filtering for "order-panel" (present only in element HTML of second announcement) must yield 0 results
      input.onTextFilterChange('order-panel');
      input = await viewStub.nextInput;
      assert.lengthOf(input.announcements, 0, 'Filter must not match against element HTML');

      // Filtering for "Order" (present in message of first announcement) must match only the first
      input.onTextFilterChange('Order');
      input = await viewStub.nextInput;
      assert.lengthOf(input.announcements, 1);
      assert.strictEqual(input.announcements[0].message, 'Order placed successfully');

      // Regex matching case-insensitively with pattern
      input.onTextFilterChange('payment.*received');
      input = await viewStub.nextInput;
      assert.lengthOf(input.announcements, 1);
      assert.strictEqual(input.announcements[0].message, 'Payment received');
    });

    it('safely handles invalid regex syntax without throwing and produces zero matches', async () => {
      const viewStub = createViewFunctionStub(
          Accessibility.AccessibilityAnnouncementRecordingView.AccessibilityAnnouncementRecordingView);
      view = new Accessibility.AccessibilityAnnouncementRecordingView.AccessibilityAnnouncementRecordingView(viewStub);
      renderElementIntoDOM(view);

      let input = await viewStub.nextInput;
      await view.startRecording();
      input = await viewStub.nextInput;

      emitBindingPayload({
        api: 'aria-live',
        message: 'Hello world',
        politeness: 'polite',
        element: '<div>Hello world</div>',
        time: 1000,
      });
      input = await viewStub.nextInput;
      assert.lengthOf(input.announcements, 1);

      // Pass malformed regex syntax (unclosed group)
      assert.doesNotThrow(() => {
        input.onTextFilterChange('(?unclosed');
      });
      input = await viewStub.nextInput;
      assert.strictEqual(input.textFilter, '(?unclosed');
      assert.lengthOf(input.announcements, 0, 'Invalid regex must not throw and should match 0 items');

      // Resetting text filter restores matches
      input.onTextFilterChange('');
      input = await viewStub.nextInput;
      assert.lengthOf(input.announcements, 1);
    });

    it('shows blocked banner articulating target name and failure reason and updates on target removal', async () => {
      const viewStub = createViewFunctionStub(
          Accessibility.AccessibilityAnnouncementRecordingView.AccessibilityAnnouncementRecordingView);
      view = new Accessibility.AccessibilityAnnouncementRecordingView.AccessibilityAnnouncementRecordingView(viewStub);
      renderElementIntoDOM(view);

      let input = await viewStub.nextInput;
      assert.isEmpty(input.blockedTargets);

      await view.startRecording();
      input = await viewStub.nextInput;

      emitBindingPayload({
        api: 'blocked',
        reason: 'Prototype property ariaNotify is non-configurable',
      });
      input = await viewStub.nextInput;
      assert.lengthOf(input.blockedTargets, 1);
      const expectedName = target.name() || target.inspectedURL() || target.id();
      assert.strictEqual(input.blockedTargets[0].targetName, expectedName);
      assert.strictEqual(input.blockedTargets[0].reason, 'Prototype property ariaNotify is non-configurable');

      // Target removed clears blocked targets
      await view.targetRemoved(target);
      input = await viewStub.nextInput;
      assert.isEmpty(input.blockedTargets);
    });

    it('resyncs accumulated announcements after view detachment when wasShown is called', async () => {
      view = new Accessibility.AccessibilityAnnouncementRecordingView.AccessibilityAnnouncementRecordingView();
      renderElementIntoDOM(view);
      await view.updateComplete;

      await view.startRecording();
      await view.updateComplete;

      // Detach view
      view.detach();
      assert.isFalse(view.isShowing());

      // Emit announcements in the background while view is detached
      emitBindingPayload({
        api: 'aria-live',
        message: 'Background message 1',
        politeness: 'polite',
        element: '<div>Msg 1</div>',
        time: 1000,
      });
      emitBindingPayload({
        api: 'js-triggered',
        message: 'Background message 2',
        politeness: 'assertive',
        element: '<button>Msg 2</button>',
        time: 2000,
      });

      assert.lengthOf(view.announcementsForTest(), 2);

      // Re-attach view (calls wasShown)
      renderElementIntoDOM(view);
      assert.isTrue(view.isShowing());
      await view.updateComplete;

      assert.lengthOf(view.filteredAnnouncements, 2);
    });

    it('announces match counts via UI.ARIAUtils.LiveAnnouncer.alert when filters change', async () => {
      const alertSpy = sinon.spy(UI.ARIAUtils.LiveAnnouncer, 'alert');
      view = new Accessibility.AccessibilityAnnouncementRecordingView.AccessibilityAnnouncementRecordingView();
      renderElementIntoDOM(view);
      await view.updateComplete;

      await view.startRecording();
      await view.updateComplete;

      // Add two announcements
      emitBindingPayload({
        api: 'aria-live',
        message: 'Alpha alert',
        politeness: 'polite',
        element: '<div>Alpha alert</div>',
        time: 1000,
      });
      emitBindingPayload({
        api: 'js-triggered',
        message: 'Beta notice',
        politeness: 'assertive',
        element: '<span>Beta notice</span>',
        time: 2000,
      });

      alertSpy.resetHistory();

      // Filter by text with 1 match: "1 event matches"
      view.setTextFilter('Alpha');
      assert.isTrue(alertSpy.calledOnceWith('1 event matches'));

      alertSpy.resetHistory();

      // Filter with 0 matches: "No events match"
      view.setTextFilter('Gamma');
      assert.isTrue(alertSpy.calledOnceWith('No events match'));

      alertSpy.resetHistory();

      // Clear text filter -> 2 matches: "2 events match"
      view.setTextFilter('');
      assert.isTrue(alertSpy.calledOnceWith('2 events match'));

      alertSpy.resetHistory();

      // Filter by record type: ARIA_LIVE (1 match) -> "1 event matches"
      view.setRecordTypeFilter(RecordTypeFilter.ARIA_LIVE);
      assert.isTrue(alertSpy.calledOnceWith('1 event matches'));

      alertSpy.restore();
    });

    it('memoizes filteredAnnouncements and reuses the cached reference', async () => {
      view = new Accessibility.AccessibilityAnnouncementRecordingView.AccessibilityAnnouncementRecordingView();
      renderElementIntoDOM(view);
      await view.updateComplete;

      await view.startRecording();
      await view.updateComplete;

      emitBindingPayload({
        api: 'aria-live',
        message: 'Item 1',
        politeness: 'polite',
        element: '<div>Item 1</div>',
        time: 1000,
      });

      const firstRef = view.filteredAnnouncements;
      const secondRef = view.filteredAnnouncements;
      assert.strictEqual(firstRef, secondRef);

      // Trigger render tick without changing filters
      view.requestUpdate();
      await view.updateComplete;

      const thirdRef = view.filteredAnnouncements;
      assert.strictEqual(firstRef, thirdRef);

      // Change filter -> reference should update
      view.setTextFilter('Non-matching');
      const fourthRef = view.filteredAnnouncements;
      assert.notStrictEqual(firstRef, fourthRef);
      assert.lengthOf(fourthRef, 0);
    });
  });

  describe('DEFAULT_VIEW screenshots', () => {
    let targetEl: HTMLElement;

    beforeEach(() => {
      targetEl = document.createElement('div');
      renderElementIntoDOM(targetEl, {includeCommonStyles: true});
      targetEl.style.display = 'flex';
      targetEl.style.width = '640px';
      targetEl.style.height = '300px';
    });

    it('renders empty state', async () => {
      Accessibility.AccessibilityAnnouncementRecordingView.DEFAULT_VIEW(
          {
            isRecording: false,
            onToggleRecording: () => {},
            onClear: () => {},
            recordTypeFilter: RecordTypeFilter.BOTH,
            onRecordTypeFilterChange: () => {},
            textFilter: '',
            onTextFilterChange: () => {},
            blockedTargets: [],
            announcements: [],
          },
          undefined,
          targetEl,
      );
      const widgetEl =
          targetEl.querySelector('devtools-widget') as UI.Widget.WidgetElement<
              Accessibility.AccessibilityAnnouncementRecordingListView.AccessibilityAnnouncementRecordingListView>;
      await widgetEl?.getWidget()?.updateComplete;
      await assertScreenshot('accessibility/accessibility_announcement_recording_view_empty.png');
    });

    it('renders recording state with announcements', async () => {
      const mockAnnouncement1: Accessibility.AccessibilityAnnouncementRecordingView.A11yAnnouncement = {
        api: AnnouncementApi.ARIA_LIVE,
        message: 'Live status updated',
        politeness: 'polite',
        element: '<div aria-live="polite">Live status updated</div>',
        time: 1700000000000,
      };
      const mockAnnouncement2: Accessibility.AccessibilityAnnouncementRecordingView.A11yAnnouncement = {
        api: AnnouncementApi.JS_TRIGGERED,
        message: 'Notification sent',
        politeness: 'assertive',
        element: '<button>Save</button>',
        time: 1700000005000,
      };

      Accessibility.AccessibilityAnnouncementRecordingView.DEFAULT_VIEW(
          {
            isRecording: true,
            onToggleRecording: () => {},
            onClear: () => {},
            recordTypeFilter: RecordTypeFilter.BOTH,
            onRecordTypeFilterChange: () => {},
            textFilter: '',
            onTextFilterChange: () => {},
            blockedTargets: [],
            announcements: [mockAnnouncement1, mockAnnouncement2],
          },
          undefined,
          targetEl,
      );
      const widgetEl =
          targetEl.querySelector('devtools-widget') as UI.Widget.WidgetElement<
              Accessibility.AccessibilityAnnouncementRecordingListView.AccessibilityAnnouncementRecordingListView>;
      await widgetEl?.getWidget()?.updateComplete;
      await assertScreenshot('accessibility/accessibility_announcement_recording_view_recording.png');
    });

    it('renders blocked targets warning banner', async () => {
      const mockAnnouncement: Accessibility.AccessibilityAnnouncementRecordingView.A11yAnnouncement = {
        api: AnnouncementApi.ARIA_LIVE,
        message: 'Live status updated',
        politeness: 'polite',
        element: '<div aria-live="polite">Live status updated</div>',
        time: 1700000000000,
      };

      Accessibility.AccessibilityAnnouncementRecordingView.DEFAULT_VIEW(
          {
            isRecording: true,
            onToggleRecording: () => {},
            onClear: () => {},
            recordTypeFilter: RecordTypeFilter.BOTH,
            onRecordTypeFilterChange: () => {},
            textFilter: '',
            onTextFilterChange: () => {},
            blockedTargets: [{
              targetName: 'iframe#subframe',
              reason: 'Prototype property ariaNotify is non-configurable',
            }],
            announcements: [mockAnnouncement],
          },
          undefined,
          targetEl,
      );
      const widgetEl =
          targetEl.querySelector('devtools-widget') as UI.Widget.WidgetElement<
              Accessibility.AccessibilityAnnouncementRecordingListView.AccessibilityAnnouncementRecordingListView>;
      await widgetEl?.getWidget()?.updateComplete;
      await assertScreenshot('accessibility/accessibility_announcement_recording_view_blocked.png');
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
      const {waitForAnnouncement, clear} = setupMockBinding(recorded);

      new Function(INJECTED_SCRIPT_SOURCE)();

      const container = document.createElement('div');

      const liveRegion = document.createElement('div');
      liveRegion.setAttribute('aria-live', 'polite');
      container.appendChild(liveRegion);

      const nonLiveElement = document.createElement('div');
      nonLiveElement.textContent = 'Static non-live text';
      container.appendChild(nonLiveElement);

      renderElementIntoDOM(container);
      clear();

      // 1. Attribute change on non-live element (CRITICAL FIX check: must NOT record)
      nonLiveElement.className = 'some-new-class';

      // 2. Text mutation on live region (must record)
      liveRegion.textContent = 'Live update!';
      const announcement = await waitForAnnouncement(r => r.message === 'Live update!');

      assert.lengthOf(recorded, 1);
      assert.strictEqual(announcement.message, 'Live update!');
      assert.strictEqual(announcement.politeness, 'polite');

      // 3. Verify NO DOM attribute pollution occurred on liveRegion
      assert.isFalse(liveRegion.hasAttribute('data-devtools-aria-live-record-id'));
      assert.isNull(liveRegion.getAttribute('data-devtools-aria-live-record-id'));

      container.remove();
    });

    it('assigns unique element IDs across cloned elements', async () => {
      const recorded: Array<Record<string, unknown>> = [];
      const {waitForAnnouncement, clear} = setupMockBinding(recorded);

      new Function(INJECTED_SCRIPT_SOURCE)();

      const container = document.createElement('div');
      const liveRegion = document.createElement('div');
      liveRegion.setAttribute('aria-live', 'polite');
      liveRegion.textContent = 'Original text';
      container.appendChild(liveRegion);
      renderElementIntoDOM(container);

      await waitForAnnouncement(r => r.message === 'Original text');
      clear();

      // Mutate original live region
      liveRegion.textContent = 'Original updated';
      const originalRecord = await waitForAnnouncement(r => r.message === 'Original updated');
      const originalId = originalRecord.elementId;

      // Clone original element and add to container
      const cloned = liveRegion.cloneNode(true) as HTMLElement;
      cloned.textContent = 'Clone initial';
      container.appendChild(cloned);
      await waitForAnnouncement(r => r.message === 'Clone initial');

      cloned.textContent = 'Clone updated';
      const cloneRecord = await waitForAnnouncement(r => r.message === 'Clone updated');

      assert.notStrictEqual(cloneRecord.elementId, originalId);

      container.remove();
    });

    it('captures live region mutations inside open Shadow DOM trees', async () => {
      const recorded: Array<Record<string, unknown>> = [];
      const {waitForAnnouncement} = setupMockBinding(recorded);

      new Function(INJECTED_SCRIPT_SOURCE)();

      const host = document.createElement('div');
      const shadowRoot = host.attachShadow({mode: 'open'});
      const shadowLiveRegion = document.createElement('span');
      shadowLiveRegion.setAttribute('role', 'status');
      shadowRoot.appendChild(shadowLiveRegion);

      renderElementIntoDOM(host);

      shadowLiveRegion.textContent = 'Notification in shadow DOM';
      const announcement = await waitForAnnouncement(r => r.message === 'Notification in shadow DOM');

      assert.lengthOf(recorded, 1);
      assert.strictEqual(announcement.message, 'Notification in shadow DOM');
      assert.strictEqual(announcement.politeness, 'polite');

      host.remove();
    });

    it('isolates ariaNotify failure so MutationObserver still captures live regions', async () => {
      const recorded: Array<Record<string, unknown>> = [];
      const {waitForAnnouncement, clear} = setupMockBinding(recorded);

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
      clear();

      // Verify that MutationObserver still functions for ARIA-live
      liveRegion.textContent = 'Assertive message despite frozen proto';
      const announcement = await waitForAnnouncement(r => r.api === 'aria-live');

      assert.strictEqual(announcement.message, 'Assertive message despite frozen proto');
      assert.strictEqual(announcement.politeness, 'assertive');

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

    it('handles deeply nested DOM trees without stack overflow during scanAndObserveShadowRoots', async () => {
      const recorded: Array<Record<string, unknown>> = [];
      const {waitForAnnouncement} = setupMockBinding(recorded);

      new Function(INJECTED_SCRIPT_SOURCE)();

      const depth = 600;
      const root = document.createElement('div');
      let current = root;
      for (let i = 0; i < depth; i++) {
        const next = document.createElement('div');
        current.appendChild(next);
        current = next;
      }

      const liveRegion = document.createElement('div');
      liveRegion.setAttribute('aria-live', 'polite');
      current.appendChild(liveRegion);

      renderElementIntoDOM(root);

      liveRegion.textContent = 'Deep announcement';
      const announcement = await waitForAnnouncement(r => r.message === 'Deep announcement');

      assert.strictEqual(announcement.message, 'Deep announcement');
      assert.strictEqual(announcement.politeness, 'polite');

      root.remove();
    });
  });
});
