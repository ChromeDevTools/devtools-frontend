// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as CM from '../../../third_party/codemirror.next/codemirror.next.js';

export const editorTheme = CM.EditorView.theme({
  '&.cm-editor': {
    color: 'color: var(--color-text-primary)',
  },

  '.cm-scroller': {
    lineHeight: '1.2em',
    fontFamily: 'var(--source-code-font-family)',
    fontSize: 'var(--source-code-font-size)',
  },

  '.cm-panels, .cm-tooltip': {
    backgroundColor: 'var(--color-background-elevation-1)',
  },

  '.cm-selectionMatch': {
    backgroundColor: 'var(--color-selection-highlight)',
  },

  '.cm-cursor': {
    borderLeft: '1px solid var(--color-background-inverted)',
  },

  '&.cm-readonly .cm-cursor': {
    display: 'none',
  },

  '.cm-cursor-secondary': {
    borderLeft: '1px solid var(--color-secondary-cursor)',
  },

  '.cm-selectionBackground': {
    background: 'var(--color-editor-selection-selection)',
  },

  '&.cm-focused .cm-selectionBackground': {
    background: 'var(--color-editor-selection)',
  },

  '.cm-gutters': {
    borderRight: '1px solid var(--color-details-hairline)',
    whiteSpace: 'nowrap',
    backgroundColor: 'var(--color-background)',
  },

  '.cm-lineNumbers .cm-gutterElement': {
    color: 'var(--color-line-number)',
    padding: '0 3px 0 9px',
  },

  '&:focus-within .cm-matchingBracket': {
    color: 'inherit',
    backgroundColor: 'var(--color-matching-bracket-background)',
    borderBottom: '1px solid var(--color-matching-bracket-underline)',
  },

  '&:focus-within .cm-nonmatchingBracket': {
    backgroundColor: 'var(--color-nonmatching-bracket-background)',
    borderBottom: '1px solid var(--color-nonmatching-bracket-underline)',
  },

  '.cm-trailingWhitespace': {
    backgroundColor: 'var(--color-error-text)',
  },

  '.cm-highlightedTab': {
    display: 'inline-block',
    position: 'relative',
    '&:before': {
      content: '""',
      borderBottom: '1px solid var(--color-text-secondary)',
      position: 'absolute',
      left: '5%',
      bottom: '50%',
      width: '90%',
      pointerEvents: 'none',
    },
  },

  '.cm-highlightedSpaces:before': {
    color: 'var(--color-text-secondary)',
    content: 'attr(data-display)',
    position: 'absolute',
    pointerEvents: 'none',
  },

  '.cm-placeholder': {
    color: 'var(--color-text-secondary)',
  },

  '.cm-completionHint': {
    color: 'var(--color-text-secondary)',
  },

  '.cm-argumentHints': {
    pointerEvents: 'none',
    padding: '0 4px',
    whiteSpace: 'nowrap',
    lineHeight: '20px',
    marginBottom: '4px',
    boxShadow: 'var(--drop-shadow)',
    backgroundColor: 'var(--color-background)',
    width: 'fit-content',
  },

  '.cm-highlightedLine': {
    animation: 'cm-fading-highlight 2s 0s',
  },

  '@keyframes cm-fading-highlight': {
    from: {
      backgroundColor: 'var(--color-highlighted-line)',
    },
    to: {
      backgroundColor: 'transparent',
    },
  },
});
