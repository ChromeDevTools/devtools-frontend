// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import type * as Workspace from '../../models/workspace/workspace.js';
import * as CodeMirror from '../../third_party/codemirror.next/codemirror.next.js';
import * as SourceFrame from '../../ui/legacy/components/source_frame/source_frame.js';
import type * as TextEditor from '../../ui/components/text_editor/text_editor.js';

import {Plugin} from './Plugin.js';

// Defines plugins that show profiling information in the editor
// gutter when available.

const UIStrings = {
  /**
   *@description The milisecond unit
   */
  ms: 'ms',
  /**
   *@description Unit for data size in DevTools
   */
  mb: 'MB',
  /**
   *@description A unit
   */
  kb: 'kB',
};
const str_ = i18n.i18n.registerUIStrings('panels/sources/ProfilePlugin.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

class MemoryMarker extends CodeMirror.GutterMarker {
  constructor(readonly value: number) {
    super();
  }

  override eq(other: MemoryMarker): boolean {
    return this.value === other.value;
  }

  override toDOM(): HTMLElement {
    const element = document.createElement('div');
    element.className = 'cm-profileMarker';
    let value = this.value;
    const intensity = Platform.NumberUtilities.clamp(Math.log10(1 + 2e-3 * value) / 5, 0.02, 1);
    element.style.backgroundColor = `hsla(217, 100%, 70%, ${intensity.toFixed(3)})`;
    value /= 1e3;
    let units;
    let fractionDigits;
    if (value >= 1e3) {
      units = i18nString(UIStrings.mb);
      value /= 1e3;
      fractionDigits = value >= 20 ? 0 : 1;
    } else {
      units = i18nString(UIStrings.kb);
      fractionDigits = 0;
    }
    element.textContent = value.toFixed(fractionDigits);
    const unitElement = element.appendChild(document.createElement('span'));
    unitElement.className = 'cm-units';
    unitElement.textContent = units;
    return element;
  }
}

class PerformanceMarker extends CodeMirror.GutterMarker {
  constructor(readonly value: number) {
    super();
  }

  override eq(other: MemoryMarker): boolean {
    return this.value === other.value;
  }

  override toDOM(): HTMLElement {
    const element = document.createElement('div');
    element.className = 'cm-profileMarker';
    const intensity = Platform.NumberUtilities.clamp(Math.log10(1 + 10 * this.value) / 5, 0.02, 1);
    element.textContent = this.value.toFixed(1);
    element.style.backgroundColor = `hsla(44, 100%, 50%, ${intensity.toFixed(3)})`;
    const span = document.createElement('span');
    span.className = 'cm-units';
    span.textContent = i18nString(UIStrings.ms);
    element.appendChild(span);
    return element;
  }
}

function markersFromProfileData(
    map: Map<number, number>, state: CodeMirror.EditorState,
    type: SourceFrame.SourceFrame.DecoratorType): CodeMirror.RangeSet<CodeMirror.GutterMarker> {
  const markerType = type === SourceFrame.SourceFrame.DecoratorType.PERFORMANCE ? PerformanceMarker : MemoryMarker;
  const markers: CodeMirror.Range<CodeMirror.GutterMarker>[] = [];
  for (const [line, value] of map) {
    if (line <= state.doc.lines) {
      const {from} = state.doc.line(line);
      markers.push(new markerType(value).range(from));
    }
  }
  return CodeMirror.RangeSet.of(markers, true);
}

const makeLineLevelProfilePlugin = (type: SourceFrame.SourceFrame.DecoratorType): typeof Plugin =>
    class extends Plugin {
  updateEffect = CodeMirror.StateEffect.define<Map<number, number>>();
  field: CodeMirror.StateField<CodeMirror.RangeSet<CodeMirror.GutterMarker>>;
  gutter: CodeMirror.Extension;
  compartment: CodeMirror.Compartment = new CodeMirror.Compartment();

  constructor(uiSourceCode: Workspace.UISourceCode.UISourceCode) {
    super(uiSourceCode);

    this.field = CodeMirror.StateField.define<CodeMirror.RangeSet<CodeMirror.GutterMarker>>({
      create(): CodeMirror.RangeSet<CodeMirror.GutterMarker> {
        return CodeMirror.RangeSet.empty;
      },
      update: (markers, tr) => {
        return tr.effects.reduce((markers, effect) => {
          return effect.is(this.updateEffect) ? markersFromProfileData(effect.value, tr.state, type) : markers;
        }, markers.map(tr.changes));
      },
    });

    this.gutter = CodeMirror.gutter({
      markers: view => view.state.field(this.field),
      class: `cm-${type}Gutter`,
    });
  }

  static override accepts(uiSourceCode: Workspace.UISourceCode.UISourceCode): boolean {
    return uiSourceCode.contentType().hasScripts();
  }

  private getLineMap(): Map<number, number>|undefined {
    return this.uiSourceCode.getDecorationData(type);
  }

  override editorExtension(): CodeMirror.Extension {
    const map = this.getLineMap();
    return this.compartment.of(
        !map ? [] : [this.field.init(state => markersFromProfileData(map, state, type)), this.gutter, theme]);
  }

  override decorationChanged(type: SourceFrame.SourceFrame.DecoratorType, editor: TextEditor.TextEditor.TextEditor): void {
    const installed = Boolean(editor.state.field(this.field, false));
    const map = this.getLineMap();
    if (!map) {
      if (installed) {
        editor.dispatch({effects: this.compartment.reconfigure([])});
      }
    } else if (!installed) {
      editor.dispatch({
        effects: this.compartment.reconfigure(
            [this.field.init(state => markersFromProfileData(map, state, type)), this.gutter, theme]),
      });
    } else {
      editor.dispatch({effects: this.updateEffect.of(map)});
    }
  }
};

const theme = CodeMirror.EditorView.baseTheme({
  '.cm-performanceGutter': {
    width: '60px',
    backgroundColor: 'var(--sys-color-cdt-base-container)',
    marginLeft: '3px',
  },
  '.cm-memoryGutter': {
    width: '48px',
    backgroundColor: 'var(--sys-color-cdt-base-container)',
    marginLeft: '3px',
  },
  '.cm-profileMarker': {
    textAlign: 'right',
    paddingRight: '3px',
  },
  '.cm-profileMarker .cm-units': {
    color: 'var(--sys-color-token-subtle)',
    fontSize: '75%',
    marginLeft: '3px',
  },
});

export const MemoryProfilePlugin = makeLineLevelProfilePlugin(SourceFrame.SourceFrame.DecoratorType.MEMORY);

export const PerformanceProfilePlugin = makeLineLevelProfilePlugin(SourceFrame.SourceFrame.DecoratorType.PERFORMANCE);
