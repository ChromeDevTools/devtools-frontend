// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../../../core/platform/platform.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as AiAssistanceModel from '../../../models/ai_assistance/ai_assistance.js';
import {assertScreenshot, renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {
  createTarget,
  describeWithEnvironment,
} from '../../../testing/EnvironmentHelpers.js';
import {createViewFunctionStub, type ViewFunctionStub} from '../../../testing/ViewFunctionHelpers.js';
import * as AiAssistance from '../ai_assistance.js';

describeWithEnvironment('ChatInput', () => {
  function createComponent():
      [ViewFunctionStub<typeof AiAssistance.ChatInput.ChatInput>, AiAssistance.ChatInput.ChatInput] {
    const view = createViewFunctionStub(AiAssistance.ChatInput.ChatInput);
    const component = new AiAssistance.ChatInput.ChatInput(undefined, view);
    component.wasShown();
    component.performUpdate();
    return [view, component];
  }

  class MockFileReader {
    result: string|null = null;
    onload: ((this: FileReader, ev: ProgressEvent<FileReader>) => void)|null = null;

    readAsDataURL(_file: Blob): void {
      if (this.onload) {
        this.result = 'data:image/png;base64,dGVzdA==';
        this.onload.call(this as unknown as FileReader, new ProgressEvent('load') as ProgressEvent<FileReader>);
      }
    }
  }

  it('should disable the send button when the input is empty', async () => {
    const [view, component] = createComponent();

    sinon.assert.callCount(view, 1);
    const mockTextArea = document.createElement('textarea');
    assert.isDefined(view.input.textAreaRef);
    (view.input.textAreaRef as {value: HTMLTextAreaElement}).value = mockTextArea;
    assert.isTrue(view.input.isTextInputEmpty);

    component.setInputValue('test');

    sinon.assert.callCount(view, 2);
    assert.isFalse(view.input.isTextInputEmpty);

    component.setInputValue('');

    sinon.assert.callCount(view, 3);
    assert.isTrue(view.input.isTextInputEmpty);

    component.setInputValue('test');

    sinon.assert.callCount(view, 4);
    assert.isFalse(view.input.isTextInputEmpty);
  });

  it('should render read-only state correctly', async () => {
    const [view, component] = createComponent();
    component.isReadOnly = true;
    component.performUpdate();

    sinon.assert.callCount(view, 2);
    assert.isTrue(view.input.isReadOnly);
  });

  describe('multimodal input', () => {
    let target: SDK.Target.Target;
    let model: SDK.ScreenCaptureModel.ScreenCaptureModel;

    async function triggerImageUpload(view: ViewFunctionStub<typeof AiAssistance.ChatInput.ChatInput>, file: File) {
      const mockInput = document.createElement('input');
      const createElementStub = sinon.stub(document, 'createElement');
      createElementStub.callThrough();
      createElementStub.withArgs('input').returns(mockInput);
      view.input.onImageUpload(new Event('click'));
      createElementStub.restore();

      Object.defineProperty(mockInput, 'files', {
        value: [file],
        writable: false,
      });
      mockInput.dispatchEvent(new Event('change'));
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    beforeEach(() => {
      target = createTarget();
      const maybeModel = target.model(SDK.ScreenCaptureModel.ScreenCaptureModel);
      assert.exists(maybeModel);
      model = maybeModel;
      SDK.TargetManager.TargetManager.instance().setScopeTarget(target);
    });

    it('handles screenshot capture', async () => {
      const captureScreenshotStub = sinon.stub(model, 'captureScreenshot').resolves('screenshot-data');
      sinon.stub(SDK.TargetManager.TargetManager.instance(), 'primaryPageTarget').returns(target);
      const [view] = createComponent();

      // Simulate screenshot button click
      view.input.onTakeScreenshot();

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 0));

      sinon.assert.calledOnce(captureScreenshotStub);
      assert.deepEqual(view.input.imageInput, {
        isLoading: false,
        data: 'screenshot-data',
        mimeType: 'image/jpeg',
        inputType: AiAssistanceModel.AiAgent.MultimodalInputType.SCREENSHOT
      });
    });

    it('handles image upload', async () => {
      const [view] = createComponent();
      const file = new File(['test'], 'image.png', {type: 'image/png'});
      const fileReaderStub = sinon.stub(window, 'FileReader');
      fileReaderStub.returns(new MockFileReader() as unknown as FileReader);

      await triggerImageUpload(view, file);

      assert.deepEqual(view.input.imageInput, {
        isLoading: false,
        data: 'dGVzdA==',
        mimeType: 'image/png',
        inputType: AiAssistanceModel.AiAgent.MultimodalInputType.UPLOADED_IMAGE
      });
    });

    it('removes image input', async () => {
      const [view] = createComponent();
      const file = new File(['test'], 'image.png', {type: 'image/png'});
      const fileReaderStub = sinon.stub(window, 'FileReader');
      fileReaderStub.returns(new MockFileReader() as unknown as FileReader);

      await triggerImageUpload(view, file);
      assert.isDefined(view.input.imageInput);

      view.input.onRemoveImageInput();
      assert.isUndefined(view.input.imageInput);
    });

    it('clears image input on submit', async () => {
      const [view, component] = createComponent();
      const file = new File(['test'], 'image.png', {type: 'image/png'});
      const fileReaderStub = sinon.stub(window, 'FileReader');
      fileReaderStub.returns(new MockFileReader() as unknown as FileReader);

      await triggerImageUpload(view, file);
      component.setInputValue('test');

      const submitEvent = new SubmitEvent('submit', {cancelable: true});
      view.input.onSubmit(submitEvent);

      assert.isUndefined(view.input.imageInput);
    });

    it('handles image paste from clipboard', async () => {
      const [view, component] = createComponent();
      component.conversationType = AiAssistanceModel.AiHistoryStorage.ConversationType.STYLING;

      const file = new File(['test'], 'pasted_image.png', {type: 'image/png'});
      const fileReaderStub = sinon.stub(window, 'FileReader');
      fileReaderStub.returns(new MockFileReader() as unknown as FileReader);
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      const clipboardEvent = new ClipboardEvent('paste', {
        clipboardData: dataTransfer,
      });

      view.input.onImagePaste(clipboardEvent);

      await new Promise(resolve => setTimeout(resolve, 0));

      assert.deepEqual(view.input.imageInput, {
        isLoading: false,
        data: btoa('test'),
        mimeType: 'image/png',
        inputType: AiAssistanceModel.AiAgent.MultimodalInputType.UPLOADED_IMAGE
      });
    });

    it('should clear image input on primary page change', async () => {
      const target = createTarget();
      const [view] = createComponent();

      // Set up initial state with an image and non-empty conversation
      const file = new File(['test'], 'image.png', {type: 'image/png'});
      const fileReaderStub = sinon.stub(window, 'FileReader');
      fileReaderStub.returns(new MockFileReader() as unknown as FileReader);

      await triggerImageUpload(view, file);

      // Verify image input is present
      assert.isDefined(view.input.imageInput);

      // Trigger primary page changed
      const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
      assert.exists(resourceTreeModel);
      resourceTreeModel.dispatchEventToListeners(SDK.ResourceTreeModel.Events.PrimaryPageChanged, {
        frame: {url: 'https://example.com/new'} as SDK.ResourceTreeModel.ResourceTreeFrame,
        type: SDK.ResourceTreeModel.PrimaryPageChangeType.NAVIGATION,
      });

      // Verify image input is cleared
      assert.isUndefined(view.input.imageInput);
    });
  });

  describe('view', () => {
    it('renders correctly when multimodal is enabled', async () => {
      const target = document.createElement('div');
      renderElementIntoDOM(target);
      AiAssistance.ChatInput.DEFAULT_VIEW(
          {
            isLoading: false,
            isTextInputEmpty: true,
            blockedByCrossOrigin: false,
            isTextInputDisabled: false,
            inputPlaceholder: 'Type a message...' as Platform.UIString.LocalizedString,
            selectedContext: null,
            inspectElementToggled: false,
            additionalFloatyContext: [],
            disclaimerText: 'Disclaimer text',
            conversationType: AiAssistanceModel.AiHistoryStorage.ConversationType.STYLING,
            multimodalInputEnabled: true,
            uploadImageInputEnabled: true,
            isReadOnly: false,
            textAreaRef: {value: undefined},
            onContextClick: () => {},
            onInspectElementClick: () => {},
            onSubmit: () => {},
            onTextAreaKeyDown: () => {},
            onCancel: () => {},
            onNewConversation: () => {},
            onTextInputChange: () => {},
            onTakeScreenshot: () => {},
            onRemoveImageInput: () => {},
            onImageUpload: () => {},
            onImagePaste: () => {},
          },
          undefined, target);
      await assertScreenshot('ai_assistance/chat_input_multimodal_enabled.png');
    });

    it('renders correctly when multimodal is disabled', async () => {
      const target = document.createElement('div');
      renderElementIntoDOM(target);
      AiAssistance.ChatInput.DEFAULT_VIEW(
          {
            isLoading: false,
            isTextInputEmpty: true,
            blockedByCrossOrigin: false,
            isTextInputDisabled: false,
            inputPlaceholder: 'Type a message...' as Platform.UIString.LocalizedString,
            selectedContext: null,
            inspectElementToggled: false,
            additionalFloatyContext: [],
            disclaimerText: 'Disclaimer text',
            conversationType: AiAssistanceModel.AiHistoryStorage.ConversationType.STYLING,
            multimodalInputEnabled: false,
            uploadImageInputEnabled: false,
            isReadOnly: false,
            textAreaRef: {value: undefined},
            onContextClick: () => {},
            onInspectElementClick: () => {},
            onSubmit: () => {},
            onTextAreaKeyDown: () => {},
            onCancel: () => {},
            onNewConversation: () => {},
            onTextInputChange: () => {},
            onTakeScreenshot: () => {},
            onRemoveImageInput: () => {},
            onImageUpload: () => {},
            onImagePaste: () => {},
          },
          undefined, target);
      await assertScreenshot('ai_assistance/chat_input_multimodal_disabled.png');
    });
  });
});
