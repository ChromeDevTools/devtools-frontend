// Copyright 2025 The Chromium Authors.

import '../ChatView.js';
import {raf} from '../../../../testing/DOMHelpers.js';

// Minimal enums
const ChatMessageEntity = { USER: 'user' } as const;

function makeUser(text: string): any { return { entity: ChatMessageEntity.USER, text } as any; }

describe('ChatView input clearing (expanded view)', () => {
  function getTextarea(view: HTMLElement): HTMLTextAreaElement {
    const shadow = view.shadowRoot!;
    const bar = shadow.querySelector('ai-input-bar') as HTMLElement;
    // InputBar renders light-DOM; target the nested ai-chat-input textarea
    const chat = bar?.querySelector('ai-chat-input') as HTMLElement;
    return chat?.querySelector('textarea') as HTMLTextAreaElement;
  }

  it('clears text after Enter send', async () => {
    const view = document.createElement('devtools-chat-view') as any;
    document.body.appendChild(view);

    // Expanded view requires at least one user message
    view.data = {
      messages: [makeUser('hello')],
      state: 'idle',
      isTextInputEmpty: true,
      onSendMessage: () => {},
      onPromptSelected: () => {},
    } as any;
    await raf(); await raf();

    const ta = getTextarea(view);
    ta.value = 'New message';
    ta.dispatchEvent(new Event('input', {bubbles: true}));
    await raf(); await raf();

    const ev = new KeyboardEvent('keydown', {key: 'Enter', shiftKey: false, bubbles: true});
    ta.dispatchEvent(ev);
    await raf();

    const taAfter = getTextarea(view);
    assert.strictEqual(taAfter.value, '');

    document.body.removeChild(view);
  });
});
