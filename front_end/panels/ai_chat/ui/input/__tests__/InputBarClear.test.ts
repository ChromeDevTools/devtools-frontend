// Copyright 2025 The Chromium Authors.

import '../InputBar.js';
import '../../input/ChatInput.js';
import {raf} from '../../../../../testing/DOMHelpers.js';

describe('InputBar clearing behavior', () => {
  function getTextarea(el: HTMLElement): HTMLTextAreaElement {
    const chat = el.querySelector('ai-chat-input') as HTMLElement;
    return chat?.querySelector('textarea') as HTMLTextAreaElement;
  }

  it('clears input after Enter send from ai-chat-input', async () => {
    const bar = document.createElement('ai-input-bar') as any;
    document.body.appendChild(bar);

    // Ensure enabled
    bar.disabled = false;
    bar.sendDisabled = false;
    await raf();

    const ta = getTextarea(bar);
    ta.value = 'Hello world';
    ta.dispatchEvent(new Event('input', {bubbles: true}));
    await raf();

    // Simulate Enter key (without Shift)
    const ev = new KeyboardEvent('keydown', {key: 'Enter', shiftKey: false, bubbles: true});
    ta.dispatchEvent(ev);
    await raf();

    const taAfter = getTextarea(bar);
    assert.strictEqual(taAfter.value, '');

    document.body.removeChild(bar);
  });

  it('clears input after clicking send button', async () => {
    const bar = document.createElement('ai-input-bar') as any;
    document.body.appendChild(bar);

    // Ensure send button is enabled
    bar.disabled = false;
    bar.sendDisabled = false;
    await raf();

    const ta = getTextarea(bar);
    ta.value = 'Second message';
    ta.dispatchEvent(new Event('input', {bubbles: true}));
    await raf();

    const btn = bar.querySelector('.send-button') as HTMLButtonElement;
    btn.click();
    await raf();

    const taAfter = getTextarea(bar);
    assert.strictEqual(taAfter.value, '');

    document.body.removeChild(bar);
  });
});

