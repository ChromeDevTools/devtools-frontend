// Copyright 2025 The Chromium Authors.

import '../MessageList.js';
import {raf} from '../../../../../testing/DOMHelpers.js';

describe('MessageList UI', () => {
  function makeMessage(text: string, height = 0): HTMLElement {
    const msg = document.createElement('div');
    msg.textContent = text;
    if (height > 0) {
      msg.setAttribute('style', `display:block; height:${height}px;`);
    }
    return msg;
  }

  it('projects slotted messages into container', async () => {
    const list = document.createElement('ai-message-list');
    // Keep size small; contents will overflow to create scrollbar in later tests
    (list as HTMLElement).style.cssText = 'display:block; height:120px; width:200px;';
    const m1 = makeMessage('Hello');
    const m2 = makeMessage('World');
    list.appendChild(m1);
    list.appendChild(m2);
    document.body.appendChild(list);
    await raf();

    const sroot = list.shadowRoot!;
    const slot = sroot.querySelector('slot') as HTMLSlotElement;
    const assigned = slot.assignedNodes({flatten: true});
    // Both light DOM children are projected via the slot
    assert.strictEqual(assigned.length, 2);
    assert.strictEqual((assigned[0] as HTMLElement).textContent, 'Hello');
    assert.strictEqual((assigned[1] as HTMLElement).textContent, 'World');

    document.body.removeChild(list);
  });

  it('pins to bottom by default and preserves scroll position when user scrolls up', async () => {
    const list = document.createElement('ai-message-list');
    (list as HTMLElement).style.cssText = 'display:block; height:120px; width:200px;';
    // Add enough tall messages to overflow
    for (let i = 0; i < 5; i++) {
      list.appendChild(makeMessage(`Msg ${i}`, 80));
    }
    document.body.appendChild(list);
    await raf();

    const sroot = list.shadowRoot!;
    const container = sroot.querySelector('.container') as HTMLElement;

    // Initially pinned to bottom; after initial render it should end up at bottom
    await raf();
    const atBottomInitial = container.scrollTop + container.clientHeight >= container.scrollHeight - 1;
    assert.isTrue(atBottomInitial, 'should pin to bottom initially');

    // Simulate user scroll up -> pin disabled
    container.scrollTop = 0;
    container.dispatchEvent(new Event('scroll'));

    // Append a new tall message; should NOT auto-scroll now
    list.appendChild(makeMessage('New message', 120));
    await raf();
    assert.isBelow(container.scrollTop, container.scrollHeight - container.clientHeight);

    // Scroll to bottom and append again; should auto-pin
    container.scrollTop = container.scrollHeight;
    container.dispatchEvent(new Event('scroll'));
    list.appendChild(makeMessage('Another new message', 120));
    await raf();
    const atBottomFinal = container.scrollTop + container.clientHeight >= container.scrollHeight - 1;
    assert.isTrue(atBottomFinal, 'should repin to bottom when user scrolled to end');

    document.body.removeChild(list);
  });
});

