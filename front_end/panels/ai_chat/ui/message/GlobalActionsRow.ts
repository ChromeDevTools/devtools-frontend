// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Lit from '../../../../ui/lit/lit.js';

const {html} = Lit;

interface Options {
  textToCopy: string;
  onCopy?: () => void;
  onThumbsUp?: () => void;
  onThumbsDown?: () => void;
  onRetry?: () => void;
}

export function renderGlobalActionsRow({
  textToCopy,
  onCopy,
  onThumbsUp,
  onThumbsDown,
  onRetry,
}: Options): Lit.TemplateResult {
  return html`
    <div class="global-actions-container">
      <div class="message-actions-row">
        <button class="message-action-button" @click=${() => onCopy && onCopy()} title="Copy to clipboard">
          <svg class="action-icon" viewBox="0 0 24 24" width="16" height="16">
            <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" fill="currentColor"></path>
          </svg>
          <span class="action-tooltip">Copy</span>
        </button>
        <button class="message-action-button thumbs-up" title="Helpful" @click=${() => onThumbsUp && onThumbsUp()}>
          <svg class="action-icon" viewBox="0 0 24 24" width="16" height="16">
            <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z" fill="currentColor"></path>
          </svg>
          <span class="action-tooltip">Helpful</span>
        </button>
        <button class="message-action-button thumbs-down" title="Not helpful" @click=${() => onThumbsDown && onThumbsDown()}>
          <svg class="action-icon" viewBox="0 0 24 24" width="16" height="16">
            <path d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z" fill="currentColor"></path>
          </svg>
          <span class="action-tooltip">Not helpful</span>
        </button>
        <button class="message-action-button retry" title="Regenerate response" @click=${() => onRetry && onRetry()}>
          <svg class="action-icon" viewBox="0 0 24 24" width="16" height="16">
            <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" fill="currentColor"></path>
          </svg>
          <span class="action-tooltip">Retry</span>
        </button>
      </div>
    </div>
  `;
}

