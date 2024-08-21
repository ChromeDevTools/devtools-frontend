// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export type Change = {
  selector: string,
  styles: string,
};

export const AI_ASSISTANT_CSS_CLASS_NAME = 'ai-assistant-change';

/**
 * Keeps track of changes done by Freestyler. Currently, it is primarily
 * for stylesheet generation based on all changes.
 */
export class ChangeManager {
  #changes: Array<Change> = [];

  addChange(change: Change): void {
    this.#changes.push(change);
  }

  buildStyleSheet(): string {
    return `.${AI_ASSISTANT_CSS_CLASS_NAME} {
${
        this.#changes
            .map(change => {
              return `  ${change.selector}& {
    ${change.styles}
  }`;
            })
            .join('\n')}
}`;
  }
}
