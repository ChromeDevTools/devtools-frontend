// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Console from '../../console/console.js';

export class ConsoleMessageSource {
  #consoleMessage: Console.ConsoleViewMessage.ConsoleViewMessage;
  constructor(consoleMessage: Console.ConsoleViewMessage.ConsoleViewMessage) {
    this.#consoleMessage = consoleMessage;
  }

  getAnchor(): AnchorBox {
    const rect = this.#consoleMessage.contentElement().getBoundingClientRect();
    return new AnchorBox(rect.left, rect.top, rect.width, rect.height);
  }

  getPrompt(): string {
    return `You are an expert software engineer looking at a console message in DevTools.
Given some console message, give an explanation of what the console message means.
Start with the explanation immediately without repeating the given console message.
Respond only with the explanation, no console message.

### Console message:
Failed to load resource: net::ERR_TOO_MANY_REDIRECTS.

### Explanation:
This messaage means that one of the requests had too many HTTP redirects.

---

### Console message:
${this.#consoleMessage.consoleMessage().messageText}

### Explanation:`;
  }
}
