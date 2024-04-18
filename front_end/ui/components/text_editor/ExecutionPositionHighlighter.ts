// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as CodeMirror from '../../../third_party/codemirror.next/codemirror.next.js';

/**
 * The CodeMirror effect used to change the highlighted execution position.
 *
 * Usage:
 * ```js
 * view.dispatch({effects: setHighlightedPosition.of(position)});
 * ```
 */
export const setHighlightedPosition = CodeMirror.StateEffect.define<number>();

/**
 * The CodeMirror effect used to clear the highlighted execution position.
 *
 * Usage:
 * ```js
 * view.dispatch({effects: clearHighlightedPosition.of()});
 * ```
 */
export const clearHighlightedPosition = CodeMirror.StateEffect.define<void>();

/**
 * Constructs a CodeMirror extension that can be used to decorate the current execution
 * line (and token), for example when the debugger is paused, with specific CSS classes.
 *
 * @param executionLineClassName The CSS class name to use for decorating the execution line (e.g. `'cm-executionLine'`).
 * @param executionTokenClassName The CSS class name to use for decorating the execution token (e.g. `'cm-executionToken'`).
 *
 * @returns a CodeMirror extension that highlights the current execution line and token when set.
 */
export function positionHighlighter(
    executionLineClassName: string,
    executionTokenClassName: string,
    ): CodeMirror.Extension {
  const executionLine = CodeMirror.Decoration.line({attributes: {class: executionLineClassName}});
  const executionToken = CodeMirror.Decoration.mark({attributes: {class: executionTokenClassName}});

  const positionHighlightedState = CodeMirror.StateField.define<null|number>({
    create() {
      return null;
    },

    update(pos, tr) {
      if (pos) {
        pos = tr.changes.mapPos(pos, -1, CodeMirror.MapMode.TrackDel);
      }
      for (const effect of tr.effects) {
        if (effect.is(clearHighlightedPosition)) {
          pos = null;
        } else if (effect.is(setHighlightedPosition)) {
          pos = Math.max(0, Math.min(effect.value, tr.newDoc.length - 1));
        }
      }
      return pos;
    },
  });

  function getHighlightedPosition(state: CodeMirror.EditorState): null|number {
    return state.field(positionHighlightedState);
  }

  class PositionHighlighter {
    tree: CodeMirror.Tree;
    decorations: CodeMirror.DecorationSet;

    constructor({state}: CodeMirror.EditorView) {
      this.tree = CodeMirror.syntaxTree(state);
      this.decorations = this.#computeDecorations(state, getHighlightedPosition(state));
    }

    update(update: CodeMirror.ViewUpdate): void {
      const tree = CodeMirror.syntaxTree(update.state);
      const position = getHighlightedPosition(update.state);
      const positionChanged = position !== getHighlightedPosition(update.startState);
      if (tree.length !== this.tree.length || positionChanged) {
        this.tree = tree;
        this.decorations = this.#computeDecorations(update.state, position);
      } else {
        this.decorations = this.decorations.map(update.changes);
      }
    }

    #computeDecorations(state: CodeMirror.EditorState, position: null|number): CodeMirror.DecorationSet {
      const builder = new CodeMirror.RangeSetBuilder<CodeMirror.Decoration>();
      if (position !== null) {
        const {doc} = state;
        const line = doc.lineAt(position);
        builder.add(line.from, line.from, executionLine);
        const syntaxTree = CodeMirror.syntaxTree(state);
        const syntaxNode = syntaxTree.resolveInner(position, 1);
        const tokenEnd = Math.min(line.to, syntaxNode.to);
        if (tokenEnd > position) {
          builder.add(position, tokenEnd, executionToken);
        }
      }
      return builder.finish();
    }
  }

  const positionHighlighterSpec = {
    decorations: ({decorations}: PositionHighlighter) => decorations,
  };

  return [
    positionHighlightedState,
    CodeMirror.ViewPlugin.fromClass(PositionHighlighter, positionHighlighterSpec),
  ];
}
