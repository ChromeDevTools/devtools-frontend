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

    it('handles drag-and-drop image upload', async () => {
      const [view] = createComponent();

      const file = new File(['test'], 'dropped_image.png', {type: 'image/png'});
      const fileReaderStub = sinon.stub(window, 'FileReader');
      fileReaderStub.returns(new MockFileReader() as unknown as FileReader);
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      const dragOverEvent = new DragEvent('dragover', {
        dataTransfer,
      });
      const dropEvent = new DragEvent('drop', {
        dataTransfer,
      });

      view.input.onImageDragOver(dragOverEvent);
      dragOverEvent.preventDefault();
      view.input.onImageDrop(dropEvent);
      dropEvent.preventDefault();

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

  describe('history navigation', () => {
    it('should navigate through prompts using ArrowUp and ArrowDown', async () => {
      const storage = AiAssistanceModel.AiHistoryStorage.AiHistoryStorage.instance();
      sinon.stub(storage, 'getRecentPrompts').returns(['prompt 2', 'prompt 1']);
      const [view] = createComponent();

      const mockTextArea = document.createElement('textarea');
      (view.input.textAreaRef as {value: HTMLTextAreaElement}).value = mockTextArea;

      // Type something uncommitted
      mockTextArea.value = 'uncommitted';
      mockTextArea.setSelectionRange(mockTextArea.value.length, mockTextArea.value.length);

      // Press ArrowUp
      const upEvent = new KeyboardEvent('keydown', {key: 'ArrowUp'});
      Object.defineProperty(upEvent, 'target', {value: mockTextArea});
      view.input.onTextAreaKeyDown(upEvent);
      assert.strictEqual(mockTextArea.value, 'prompt 2');

      // Press ArrowUp again (cursor is at the end of 'prompt 2', but it's a single line)
      view.input.onTextAreaKeyDown(upEvent);
      assert.strictEqual(mockTextArea.value, 'prompt 1');

      // Press ArrowDown
      const downEvent = new KeyboardEvent('keydown', {key: 'ArrowDown'});
      Object.defineProperty(downEvent, 'target', {value: mockTextArea});
      mockTextArea.setSelectionRange(mockTextArea.value.length, mockTextArea.value.length);
      view.input.onTextAreaKeyDown(downEvent);
      assert.strictEqual(mockTextArea.value, 'prompt 2');

      // Press ArrowDown again
      mockTextArea.setSelectionRange(mockTextArea.value.length, mockTextArea.value.length);
      view.input.onTextAreaKeyDown(downEvent);
      assert.strictEqual(mockTextArea.value, 'uncommitted');
    });

    it('should not navigate history if text is selected', async () => {
      const storage = AiAssistanceModel.AiHistoryStorage.AiHistoryStorage.instance();
      sinon.stub(storage, 'getRecentPrompts').returns(['prompt 2', 'prompt 1']);
      const [view] = createComponent();

      const mockTextArea = document.createElement('textarea');
      (view.input.textAreaRef as {value: HTMLTextAreaElement}).value = mockTextArea;

      mockTextArea.value = 'some text';
      mockTextArea.setSelectionRange(0, 4);  // 'some' is selected

      // Press ArrowUp
      const upEvent = new KeyboardEvent('keydown', {key: 'ArrowUp'});
      Object.defineProperty(upEvent, 'target', {value: mockTextArea});
      view.input.onTextAreaKeyDown(upEvent);
      assert.strictEqual(mockTextArea.value, 'some text');  // Should NOT have navigated
    });

    it('should not navigate history if cursor is not on the first/last line', async () => {
      const storage = AiAssistanceModel.AiHistoryStorage.AiHistoryStorage.instance();
      sinon.stub(storage, 'getRecentPrompts').returns(['prompt 2', 'prompt 1']);
      const [view] = createComponent();

      const mockTextArea = document.createElement('textarea');
      (view.input.textAreaRef as {value: HTMLTextAreaElement}).value = mockTextArea;

      mockTextArea.value = 'line 1\nline 2';
      mockTextArea.setSelectionRange(10, 10);  // Cursor at the end of line 2

      // Press ArrowUp
      const upEvent = new KeyboardEvent('keydown', {key: 'ArrowUp'});
      Object.defineProperty(upEvent, 'target', {value: mockTextArea});
      view.input.onTextAreaKeyDown(upEvent);
      assert.strictEqual(mockTextArea.value, 'line 1\nline 2');  // Should not have changed, just moves cursor up

      // Move cursor to line 1
      mockTextArea.setSelectionRange(2, 2);
      view.input.onTextAreaKeyDown(upEvent);
      assert.strictEqual(mockTextArea.value, 'prompt 2');

      // Now it's a single line 'prompt 2'. Cursor is at the end.
      // Press ArrowDown when cursor is at the end of line 1 (only line)
      const downEvent = new KeyboardEvent('keydown', {key: 'ArrowDown'});
      Object.defineProperty(downEvent, 'target', {value: mockTextArea});
      mockTextArea.setSelectionRange(mockTextArea.value.length, mockTextArea.value.length);
      view.input.onTextAreaKeyDown(downEvent);
      assert.strictEqual(mockTextArea.value, 'line 1\nline 2');  // Restored uncommitted
    });
  });

  describe('view', () => {
    class MockContext extends AiAssistanceModel.AiAgent.ConversationContext<string> {
      getIcon() {
        return document.createElement('span');
      }
      getTitle() {
        return 'test';
      }
      getItem() {
        return 'test';
      }
      getOrigin() {
        return '';
      }
    }

    function createDefaultViewInput(): AiAssistance.ChatInput.ViewInput {
      return {
        isLoading: false,
        isTextInputEmpty: true,
        blockedByCrossOrigin: false,
        isTextInputDisabled: false,
        inputPlaceholder: 'Type a message...' as Platform.UIString.LocalizedString,
        context: null,
        isContextSelected: false,
        inspectElementToggled: false,
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
        onImageDragOver: () => {},
        onImageDrop: () => {},
        onContextRemoved: null,
        onContextAdd: null,
      };
    }

    it('renders correctly when multimodal is enabled', async () => {
      const target = document.createElement('div');
      renderElementIntoDOM(target);
      AiAssistance.ChatInput.DEFAULT_VIEW(
          {
            ...createDefaultViewInput(),
            multimodalInputEnabled: true,
            uploadImageInputEnabled: true,
          },
          undefined, target);
      await assertScreenshot('ai_assistance/chat_input_multimodal_enabled.png');
    });

    it('renders correctly when multimodal is disabled', async () => {
      const target = document.createElement('div');
      renderElementIntoDOM(target);
      AiAssistance.ChatInput.DEFAULT_VIEW(
          {
            ...createDefaultViewInput(),
          },
          undefined, target);
      await assertScreenshot('ai_assistance/chat_input_multimodal_disabled.png');
    });

    it('shows the context pill and calls onContextClick', async () => {
      const target = document.createElement('div');
      renderElementIntoDOM(target);
      const onContextClick = sinon.stub();
      const context = new MockContext();
      AiAssistance.ChatInput.DEFAULT_VIEW(
          {
            ...createDefaultViewInput(),
            context,
            isContextSelected: true,
            onContextClick,
          },
          undefined, target);

      const pill = target.querySelector('.title') as HTMLElement;
      assert.isNotNull(pill);
      pill.click();
      sinon.assert.calledOnce(onContextClick);
    });

    it('calls onContextRemoved when the remove button is clicked', async () => {
      const target = document.createElement('div');
      renderElementIntoDOM(target);
      const onContextRemoved = sinon.stub();
      const context = new MockContext();
      AiAssistance.ChatInput.DEFAULT_VIEW(
          {
            ...createDefaultViewInput(),
            context,
            isContextSelected: true,
            onContextRemoved,
          },
          undefined, target);

      const removeButton = target.querySelector('.remove-context') as HTMLElement;
      assert.isNotNull(removeButton);
      removeButton.click();
      sinon.assert.calledOnce(onContextRemoved);
    });

    it('calls onContextAdd when the add button is clicked', async () => {
      const target = document.createElement('div');
      renderElementIntoDOM(target);
      const onContextAdd = sinon.stub();
      const context = new MockContext();
      AiAssistance.ChatInput.DEFAULT_VIEW(
          {
            ...createDefaultViewInput(),
            context,
            isContextSelected: false,
            onContextAdd,
          },
          undefined, target);

      const addButton = target.querySelector('.add-context') as HTMLElement;
      assert.isNotNull(addButton);
      addButton.click();
      sinon.assert.calledOnce(onContextAdd);
    });
  });
});
