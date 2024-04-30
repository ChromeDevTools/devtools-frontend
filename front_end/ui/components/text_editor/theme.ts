// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as CM from '../../../third_party/codemirror.next/codemirror.next.js';

export const editorTheme = CM.EditorView.theme({
  '&.cm-editor': {
    color: 'color: var(--sys-color-on-subtle)',
    cursor: 'auto',
    '&.cm-focused': {
      outline: 'none',
    },
  },

  '.cm-scroller': {
    lineHeight: '1.4em',
    fontFamily: 'var(--source-code-font-family)',
    fontSize: 'var(--source-code-font-size)',
  },

  '.cm-content': {
    lineHeight: '1.4em',
  },

  '.cm-panels': {
    backgroundColor: 'var(--sys-color-cdt-base-container)',
  },

  '.cm-panels-bottom': {
    borderTop: '1px solid var(--sys-color-divider)',
  },

  '.cm-selectionMatch': {
    backgroundColor: 'var(--sys-color-yellow-container)',
  },

  '.cm-cursor': {
    borderLeft: '1px solid var(--sys-color-inverse-surface)',
  },

  '&.cm-readonly .cm-cursor': {
    display: 'none',
  },

  '.cm-cursor-secondary': {
    borderLeft: '1px solid var(--sys-color-neutral-outline)',
  },

  '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground': {
    background: 'var(--sys-color-tonal-container)',
  },

  '.cm-selectionBackground': {
    background: 'var(--sys-color-neutral-container)',
  },

  '.cm-gutters': {
    borderRight: 'none',
    whiteSpace: 'nowrap',
    backgroundColor: 'var(--sys-color-cdt-base-container)',
  },

  '.cm-gutters .cm-foldGutterElement': {
    cursor: 'pointer',
    opacity: '0%',
    transition: 'opacity 0.2s',
  },

  '.cm-gutters .cm-foldGutterElement-folded, .cm-gutters:hover .cm-foldGutterElement': {
    opacity: '100%',
  },

  '.cm-lineNumbers': {
    overflow: 'visible',
    minWidth: '40px',
  },
  '.cm-lineNumbers .cm-gutterElement': {
    color: 'var(--sys-color-outline)',
    padding: '0 3px 0 9px',
  },

  '.cm-foldPlaceholder': {
    background: 'transparent',
    border: 'none',
    color: 'var(--sys-color-token-subtle)',
  },

  '.cm-matchingBracket, .cm-nonmatchingBracket': {
    background: 'transparent',
    borderBottom: 'none',
  },

  '&:focus-within .cm-matchingBracket': {
    color: 'inherit',
    backgroundColor: 'var(--sys-color-surface-variant)',
    borderBottom: '1px solid var(--sys-color-outline)',
  },

  '&:focus-within .cm-nonmatchingBracket': {
    backgroundColor: 'var(--sys-color-error-container)',
    borderBottom: '1px solid var(--sys-color-error)',
  },

  '.cm-trailingWhitespace': {
    backgroundColor: 'var(--sys-color-error-container)',
  },

  '.cm-highlightedTab': {
    display: 'inline-block',
    position: 'relative',
    '&:before': {
      content: '""',
      borderBottom: '1px solid var(--sys-color-token-subtle)',
      position: 'absolute',
      left: '5%',
      bottom: '50%',
      width: '90%',
      pointerEvents: 'none',
    },
  },

  '.cm-highlightedSpaces:before': {
    color: 'var(--sys-color-token-subtle)',
    content: 'attr(data-display)',
    position: 'absolute',
    pointerEvents: 'none',
  },

  '.cm-placeholder': {
    color: 'var(--sys-color-token-subtle)',
  },

  '.cm-completionHint': {
    color: 'var(--sys-color-token-subtle)',
  },

  '.cm-tooltip': {
    boxShadow: 'var(--drop-shadow)',
    backgroundColor: 'var(--sys-color-neutral-container)',
  },

  '.cm-argumentHints': {
    pointerEvents: 'none',
    padding: '0 4px',
    whiteSpace: 'nowrap',
    lineHeight: '20px',
    marginBottom: '4px',
    width: 'fit-content',
  },

  '.cm-tooltip.cm-tooltip-autocomplete > ul': {
    backgroundColor: 'var(--sys-color-cdt-base-container)',
    maxHeight: '25em',
    minWidth: '16em',
    '& > li': {
      display: 'flex',
      justifyContent: 'space-between',
      border: '1px solid var(--sys-color-cdt-base-container)',
    },
    '& > li.cm-secondaryCompletion': {
      display: 'flex',
      backgroundColor: 'var(--sys-color-neutral-container)',
      borderColor: 'var(--sys-color-neutral-container)',
      justifyContent: 'space-between',
      '&::before': {
        content: '">"',
        fontWeight: 'bold',
        color: 'var(--sys-color-primary-bright)',
        marginRight: '5px',
      },
    },
    '& > li:hover': {
      backgroundColor: 'var(--sys-color-state-hover-on-subtle)',
    },
    '& > li[aria-selected]': {
      backgroundColor: 'var(--sys-color-tonal-container)',
      borderColor: 'var(--sys-color-tonal-container)',
      '&, &.cm-secondaryCompletion::before': {
        color: 'var(--sys-color-on-tonal-container)',
      },
      '&::after': {
        content: '"tab"',
        color: 'var(--sys-color-primary-bright)',
        border: '1px solid var(--sys-color-primary-bright)',
        borderRadius: '2px',
        marginLeft: '5px',
        padding: '1px 3px',
        fontSize: '10px',
        lineHeight: '10px',
      },
    },
  },

  '.cm-tooltip.cm-tooltip-autocomplete.cm-conservativeCompletion > ul > li[aria-selected]': {
    backgroundColor: 'var(--sys-color-cdt-base-container)',
    border: '1px dotted var(--sys-color-on-surface)',
    '&, &.cm-secondaryCompletion::before': {
      color: 'var(--sys-color-on-surface)',
    },
    '&::after': {
      border: '1px solid var(--sys-color-neutral-outline)',
      color: 'var(--sys-color-token-subtle)',
    },
  },

  '.cm-completionMatchedText': {
    textDecoration: 'none',
    fontWeight: 'bold',
  },

  '.cm-highlightedLine': {
    animation: 'cm-fading-highlight 2s 0s',
  },

  '@keyframes cm-fading-highlight': {
    from: {
      backgroundColor: 'var(--sys-color-yellow-container)',
    },
    to: {
      backgroundColor: 'transparent',
    },
  },
});
