// Copyright 2025 The Chromium Authors.

import {StructuredResponseController} from '../StructuredResponseController.js';
import {getMessageStateKey} from '../../../core/structured_response.js';

describe('StructuredResponseController', () => {
  it('sets pending for last structured message and marks failed on new messages', async () => {
    const controller = new StructuredResponseController(() => {});

    // Stub global MarkdownViewerUtil to avoid navigation
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (await import('../../../common/MarkdownViewerUtil.js') as any).MarkdownViewerUtil.openInAIAssistantViewer = async () => {};

    const sr = { reasoning: 'why', markdownReport: '# report' };
    const key = getMessageStateKey(sr);

    const combinedMessages: any[] = [
      { entity: 'model', action: 'final', answer: `<REASONING>${sr.reasoning}</REASONING><MARKDOWN_REPORT>${sr.markdownReport}</MARKDOWN_REPORT>` }
    ];

    const {aiState, isLastMessage} = controller.computeStateAndMaybeOpen(sr, 0, combinedMessages);
    assert.isTrue(isLastMessage);
    assert.strictEqual(aiState, 'pending');

    // Simulate new message arrival; previous pending should become failed
    const prevFinal = { entity: 'model', action: 'final', answer: `<REASONING>${sr.reasoning}</REASONING><MARKDOWN_REPORT>${sr.markdownReport}</MARKDOWN_REPORT>` } as any;
    controller.handleNewMessages([
      prevFinal
    ], [
      prevFinal,
      { entity: 'model', action: 'final', answer: 'new' } as any
    ]);

    assert.strictEqual(controller.getState(key), 'failed');
  });
});
