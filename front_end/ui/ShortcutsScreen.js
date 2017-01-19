/*
 * Copyright (C) 2010 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * @unrestricted
 */
UI.ShortcutsScreen = class {
  constructor() {
    /** @type {!Object.<string, !UI.ShortcutsSection>} */
    this._sections = {};
  }

  static registerShortcuts() {
    // Elements panel
    var elementsSection = UI.shortcutsScreen.section(Common.UIString('Elements Panel'));

    var navigate = UI.ShortcutsScreen.ElementsPanelShortcuts.NavigateUp.concat(
        UI.ShortcutsScreen.ElementsPanelShortcuts.NavigateDown);
    elementsSection.addRelatedKeys(navigate, Common.UIString('Navigate elements'));

    var expandCollapse =
        UI.ShortcutsScreen.ElementsPanelShortcuts.Expand.concat(UI.ShortcutsScreen.ElementsPanelShortcuts.Collapse);
    elementsSection.addRelatedKeys(expandCollapse, Common.UIString('Expand/collapse'));

    elementsSection.addAlternateKeys(
        UI.ShortcutsScreen.ElementsPanelShortcuts.EditAttribute, Common.UIString('Edit attribute'));
    elementsSection.addAlternateKeys(
        UI.ShortcutsScreen.ElementsPanelShortcuts.HideElement, Common.UIString('Hide element'));
    elementsSection.addAlternateKeys(
        UI.ShortcutsScreen.ElementsPanelShortcuts.ToggleEditAsHTML, Common.UIString('Toggle edit as HTML'));

    var stylesPaneSection = UI.shortcutsScreen.section(Common.UIString('Styles Pane'));

    var nextPreviousProperty = UI.ShortcutsScreen.ElementsPanelShortcuts.NextProperty.concat(
        UI.ShortcutsScreen.ElementsPanelShortcuts.PreviousProperty);
    stylesPaneSection.addRelatedKeys(nextPreviousProperty, Common.UIString('Next/previous property'));

    stylesPaneSection.addRelatedKeys(
        UI.ShortcutsScreen.ElementsPanelShortcuts.IncrementValue, Common.UIString('Increment value'));
    stylesPaneSection.addRelatedKeys(
        UI.ShortcutsScreen.ElementsPanelShortcuts.DecrementValue, Common.UIString('Decrement value'));

    stylesPaneSection.addAlternateKeys(
        UI.ShortcutsScreen.ElementsPanelShortcuts.IncrementBy10, Common.UIString('Increment by %f', 10));
    stylesPaneSection.addAlternateKeys(
        UI.ShortcutsScreen.ElementsPanelShortcuts.DecrementBy10, Common.UIString('Decrement by %f', 10));

    stylesPaneSection.addAlternateKeys(
        UI.ShortcutsScreen.ElementsPanelShortcuts.IncrementBy100, Common.UIString('Increment by %f', 100));
    stylesPaneSection.addAlternateKeys(
        UI.ShortcutsScreen.ElementsPanelShortcuts.DecrementBy100, Common.UIString('Decrement by %f', 100));

    stylesPaneSection.addAlternateKeys(
        UI.ShortcutsScreen.ElementsPanelShortcuts.IncrementBy01, Common.UIString('Increment by %f', 0.1));
    stylesPaneSection.addAlternateKeys(
        UI.ShortcutsScreen.ElementsPanelShortcuts.DecrementBy01, Common.UIString('Decrement by %f', 0.1));

    // Debugger
    var section = UI.shortcutsScreen.section(Common.UIString('Debugger'));

    section.addAlternateKeys(
        UI.shortcutRegistry.shortcutDescriptorsForAction('debugger.toggle-pause'), Common.UIString('Pause/ Continue'));
    section.addAlternateKeys(
        UI.shortcutRegistry.shortcutDescriptorsForAction('debugger.step-over'), Common.UIString('Step over'));
    section.addAlternateKeys(
        UI.shortcutRegistry.shortcutDescriptorsForAction('debugger.step-into'), Common.UIString('Step into'));
    section.addAlternateKeys(
        UI.shortcutRegistry.shortcutDescriptorsForAction('debugger.step-out'), Common.UIString('Step out'));

    var nextAndPrevFrameKeys = UI.ShortcutsScreen.SourcesPanelShortcuts.NextCallFrame.concat(
        UI.ShortcutsScreen.SourcesPanelShortcuts.PrevCallFrame);
    section.addRelatedKeys(nextAndPrevFrameKeys, Common.UIString('Next/previous call frame'));

    section.addAlternateKeys(
        UI.ShortcutsScreen.SourcesPanelShortcuts.EvaluateSelectionInConsole,
        Common.UIString('Evaluate selection in console'));
    section.addAlternateKeys(
        UI.ShortcutsScreen.SourcesPanelShortcuts.AddSelectionToWatch, Common.UIString('Add selection to watch'));
    section.addAlternateKeys(
        UI.ShortcutsScreen.SourcesPanelShortcuts.ToggleBreakpoint, Common.UIString('Toggle breakpoint'));
    section.addAlternateKeys(
        UI.shortcutRegistry.shortcutDescriptorsForAction('debugger.toggle-breakpoints-active'),
        Common.UIString('Toggle all breakpoints'));

    // Editing
    section = UI.shortcutsScreen.section(Common.UIString('Text Editor'));
    section.addAlternateKeys(UI.ShortcutsScreen.SourcesPanelShortcuts.GoToMember, Common.UIString('Go to member'));
    section.addAlternateKeys(
        UI.ShortcutsScreen.SourcesPanelShortcuts.ToggleAutocompletion, Common.UIString('Autocompletion'));
    section.addAlternateKeys(UI.ShortcutsScreen.SourcesPanelShortcuts.GoToLine, Common.UIString('Go to line'));
    section.addAlternateKeys(
        UI.ShortcutsScreen.SourcesPanelShortcuts.JumpToPreviousLocation,
        Common.UIString('Jump to previous editing location'));
    section.addAlternateKeys(
        UI.ShortcutsScreen.SourcesPanelShortcuts.JumpToNextLocation, Common.UIString('Jump to next editing location'));
    section.addAlternateKeys(UI.ShortcutsScreen.SourcesPanelShortcuts.ToggleComment, Common.UIString('Toggle comment'));
    section.addAlternateKeys(
        UI.ShortcutsScreen.SourcesPanelShortcuts.IncreaseCSSUnitByOne, Common.UIString('Increment CSS unit by 1'));
    section.addAlternateKeys(
        UI.ShortcutsScreen.SourcesPanelShortcuts.DecreaseCSSUnitByOne, Common.UIString('Decrement CSS unit by 1'));
    section.addAlternateKeys(
        UI.ShortcutsScreen.SourcesPanelShortcuts.IncreaseCSSUnitByTen, Common.UIString('Increment CSS unit by 10'));
    section.addAlternateKeys(
        UI.ShortcutsScreen.SourcesPanelShortcuts.DecreaseCSSUnitByTen, Common.UIString('Decrement CSS unit by 10'));
    section.addAlternateKeys(
        UI.ShortcutsScreen.SourcesPanelShortcuts.SelectNextOccurrence, Common.UIString('Select next occurrence'));
    section.addAlternateKeys(UI.ShortcutsScreen.SourcesPanelShortcuts.SoftUndo, Common.UIString('Soft undo'));
    section.addAlternateKeys(
        UI.ShortcutsScreen.SourcesPanelShortcuts.GotoMatchingBracket, Common.UIString('Go to matching bracket'));
    section.addAlternateKeys(
        UI.ShortcutsScreen.SourcesPanelShortcuts.CloseEditorTab, Common.UIString('Close editor tab'));
    section.addAlternateKeys(
        UI.shortcutRegistry.shortcutDescriptorsForAction('sources.switch-file'),
        Common.UIString('Switch between files with the same name and different extensions.'));

    // Performance panel
    section = UI.shortcutsScreen.section(Common.UIString('Performance Panel'));
    section.addAlternateKeys(
        UI.shortcutRegistry.shortcutDescriptorsForAction('timeline.toggle-recording'),
        Common.UIString('Start/stop recording'));
    section.addAlternateKeys(
        UI.shortcutRegistry.shortcutDescriptorsForAction('main.reload'), Common.UIString('Record page reload'));
    section.addAlternateKeys(
        UI.shortcutRegistry.shortcutDescriptorsForAction('timeline.save-to-file'), Common.UIString('Save profile'));
    section.addAlternateKeys(
        UI.shortcutRegistry.shortcutDescriptorsForAction('timeline.load-from-file'), Common.UIString('Load profile'));
    section.addRelatedKeys(
        UI.shortcutRegistry.shortcutDescriptorsForAction('timeline.jump-to-previous-frame')
            .concat(UI.shortcutRegistry.shortcutDescriptorsForAction('timeline.jump-to-next-frame')),
        Common.UIString('Jump to previous/next frame'));

    // Memory panel
    section = UI.shortcutsScreen.section(Common.UIString('Memory Panel'));
    section.addAlternateKeys(
        UI.shortcutRegistry.shortcutDescriptorsForAction('profiler.heap-toggle-recording'),
        Common.UIString('Start/stop recording'));

    // Layers panel
    section = UI.shortcutsScreen.section(Common.UIString('Layers Panel'));
    section.addAlternateKeys(UI.ShortcutsScreen.LayersPanelShortcuts.ResetView, Common.UIString('Reset view'));
    section.addAlternateKeys(UI.ShortcutsScreen.LayersPanelShortcuts.PanMode, Common.UIString('Switch to pan mode'));
    section.addAlternateKeys(
        UI.ShortcutsScreen.LayersPanelShortcuts.RotateMode, Common.UIString('Switch to rotate mode'));
    section.addAlternateKeys(
        UI.ShortcutsScreen.LayersPanelShortcuts.TogglePanRotate,
        Common.UIString('Temporarily toggle pan/rotate mode while held'));
    section.addAlternateKeys(UI.ShortcutsScreen.LayersPanelShortcuts.ZoomIn, Common.UIString('Zoom in'));
    section.addAlternateKeys(UI.ShortcutsScreen.LayersPanelShortcuts.ZoomOut, Common.UIString('Zoom out'));
    section.addRelatedKeys(
        UI.ShortcutsScreen.LayersPanelShortcuts.Up.concat(UI.ShortcutsScreen.LayersPanelShortcuts.Down),
        Common.UIString('Pan or rotate up/down'));
    section.addRelatedKeys(
        UI.ShortcutsScreen.LayersPanelShortcuts.Left.concat(UI.ShortcutsScreen.LayersPanelShortcuts.Right),
        Common.UIString('Pan or rotate left/right'));
  }

  /**
   * @param {string} name
   * @return {!UI.ShortcutsSection}
   */
  section(name) {
    var section = this._sections[name];
    if (!section)
      this._sections[name] = section = new UI.ShortcutsSection(name);
    return section;
  }

  /**
   * @return {!UI.Widget}
   */
  createShortcutsTabView() {
    var orderedSections = [];
    for (var section in this._sections)
      orderedSections.push(this._sections[section]);
    function compareSections(a, b) {
      return a.order - b.order;
    }
    orderedSections.sort(compareSections);

    var widget = new UI.Widget();

    widget.element.className = 'settings-tab-container';  // Override
    widget.element.createChild('header').createChild('h3').createTextChild(Common.UIString('Shortcuts'));
    var scrollPane = widget.element.createChild('div', 'help-container-wrapper');
    var container = scrollPane.createChild('div');
    container.className = 'help-content help-container';
    for (var i = 0; i < orderedSections.length; ++i)
      orderedSections[i].renderSection(container);

    var note = scrollPane.createChild('p', 'help-footnote');
    note.appendChild(UI.createDocumentationLink(
        'iterate/inspect-styles/shortcuts', Common.UIString('Full list of DevTools keyboard shortcuts and gestures')));

    return widget;
  }
};

/**
 * We cannot initialize it here as localized strings are not loaded yet.
 * @type {!UI.ShortcutsScreen}
 */
UI.shortcutsScreen;

/**
 * @unrestricted
 */
UI.ShortcutsSection = class {
  /**
   * @param {string} name
   */
  constructor(name) {
    this.name = name;
    this._lines = /** @type {!Array.<!{key: !Node, text: string}>} */ ([]);
    this.order = ++UI.ShortcutsSection._sequenceNumber;
  }

  /**
   * @param {!UI.KeyboardShortcut.Descriptor} key
   * @param {string} description
   */
  addKey(key, description) {
    this._addLine(this._renderKey(key), description);
  }

  /**
   * @param {!Array.<!UI.KeyboardShortcut.Descriptor>} keys
   * @param {string} description
   */
  addRelatedKeys(keys, description) {
    this._addLine(this._renderSequence(keys, '/'), description);
  }

  /**
   * @param {!Array.<!UI.KeyboardShortcut.Descriptor>} keys
   * @param {string} description
   */
  addAlternateKeys(keys, description) {
    this._addLine(this._renderSequence(keys, Common.UIString('or')), description);
  }

  /**
   * @param {!Node} keyElement
   * @param {string} description
   */
  _addLine(keyElement, description) {
    this._lines.push({key: keyElement, text: description});
  }

  /**
   * @param {!Element} container
   */
  renderSection(container) {
    var parent = container.createChild('div', 'help-block');

    var headLine = parent.createChild('div', 'help-line');
    headLine.createChild('div', 'help-key-cell');
    headLine.createChild('div', 'help-section-title help-cell').textContent = this.name;

    for (var i = 0; i < this._lines.length; ++i) {
      var line = parent.createChild('div', 'help-line');
      var keyCell = line.createChild('div', 'help-key-cell');
      keyCell.appendChild(this._lines[i].key);
      keyCell.appendChild(this._createSpan('help-key-delimiter', ':'));
      line.createChild('div', 'help-cell').textContent = this._lines[i].text;
    }
  }

  /**
   * @param {!Array.<!UI.KeyboardShortcut.Descriptor>} sequence
   * @param {string} delimiter
   * @return {!Node}
   */
  _renderSequence(sequence, delimiter) {
    var delimiterSpan = this._createSpan('help-key-delimiter', delimiter);
    return this._joinNodes(sequence.map(this._renderKey.bind(this)), delimiterSpan);
  }

  /**
   * @param {!UI.KeyboardShortcut.Descriptor} key
   * @return {!Node}
   */
  _renderKey(key) {
    var keyName = key.name;
    var plus = this._createSpan('help-combine-keys', '+');
    return this._joinNodes(keyName.split(' + ').map(this._createSpan.bind(this, 'help-key')), plus);
  }

  /**
   * @param {string} className
   * @param {string} textContent
   * @return {!Element}
   */
  _createSpan(className, textContent) {
    var node = createElement('span');
    node.className = className;
    node.textContent = textContent;
    return node;
  }

  /**
   * @param {!Array.<!Element>} nodes
   * @param {!Element} delimiter
   * @return {!Node}
   */
  _joinNodes(nodes, delimiter) {
    var result = createDocumentFragment();
    for (var i = 0; i < nodes.length; ++i) {
      if (i > 0)
        result.appendChild(delimiter.cloneNode(true));
      result.appendChild(nodes[i]);
    }
    return result;
  }
};

UI.ShortcutsSection._sequenceNumber = 0;


UI.ShortcutsScreen.ElementsPanelShortcuts = {
  NavigateUp: [UI.KeyboardShortcut.makeDescriptor(UI.KeyboardShortcut.Keys.Up)],

  NavigateDown: [UI.KeyboardShortcut.makeDescriptor(UI.KeyboardShortcut.Keys.Down)],

  Expand: [UI.KeyboardShortcut.makeDescriptor(UI.KeyboardShortcut.Keys.Right)],

  Collapse: [UI.KeyboardShortcut.makeDescriptor(UI.KeyboardShortcut.Keys.Left)],

  EditAttribute: [UI.KeyboardShortcut.makeDescriptor(UI.KeyboardShortcut.Keys.Enter)],

  HideElement: [UI.KeyboardShortcut.makeDescriptor(UI.KeyboardShortcut.Keys.H)],

  ToggleEditAsHTML: [UI.KeyboardShortcut.makeDescriptor(UI.KeyboardShortcut.Keys.F2)],

  NextProperty: [UI.KeyboardShortcut.makeDescriptor(UI.KeyboardShortcut.Keys.Tab)],

  PreviousProperty:
      [UI.KeyboardShortcut.makeDescriptor(UI.KeyboardShortcut.Keys.Tab, UI.KeyboardShortcut.Modifiers.Shift)],

  IncrementValue: [UI.KeyboardShortcut.makeDescriptor(UI.KeyboardShortcut.Keys.Up)],

  DecrementValue: [UI.KeyboardShortcut.makeDescriptor(UI.KeyboardShortcut.Keys.Down)],

  IncrementBy10: [
    UI.KeyboardShortcut.makeDescriptor(UI.KeyboardShortcut.Keys.PageUp),
    UI.KeyboardShortcut.makeDescriptor(UI.KeyboardShortcut.Keys.Up, UI.KeyboardShortcut.Modifiers.Shift)
  ],

  DecrementBy10: [
    UI.KeyboardShortcut.makeDescriptor(UI.KeyboardShortcut.Keys.PageDown),
    UI.KeyboardShortcut.makeDescriptor(UI.KeyboardShortcut.Keys.Down, UI.KeyboardShortcut.Modifiers.Shift)
  ],

  IncrementBy100:
      [UI.KeyboardShortcut.makeDescriptor(UI.KeyboardShortcut.Keys.PageUp, UI.KeyboardShortcut.Modifiers.Shift)],

  DecrementBy100:
      [UI.KeyboardShortcut.makeDescriptor(UI.KeyboardShortcut.Keys.PageDown, UI.KeyboardShortcut.Modifiers.Shift)],

  IncrementBy01: [UI.KeyboardShortcut.makeDescriptor(UI.KeyboardShortcut.Keys.Up, UI.KeyboardShortcut.Modifiers.Alt)],

  DecrementBy01: [UI.KeyboardShortcut.makeDescriptor(UI.KeyboardShortcut.Keys.Down, UI.KeyboardShortcut.Modifiers.Alt)]
};

UI.ShortcutsScreen.SourcesPanelShortcuts = {
  SelectNextOccurrence: [UI.KeyboardShortcut.makeDescriptor('d', UI.KeyboardShortcut.Modifiers.CtrlOrMeta)],

  SoftUndo: [UI.KeyboardShortcut.makeDescriptor('u', UI.KeyboardShortcut.Modifiers.CtrlOrMeta)],

  GotoMatchingBracket: [UI.KeyboardShortcut.makeDescriptor('m', UI.KeyboardShortcut.Modifiers.Ctrl)],

  ToggleAutocompletion:
      [UI.KeyboardShortcut.makeDescriptor(UI.KeyboardShortcut.Keys.Space, UI.KeyboardShortcut.Modifiers.Ctrl)],

  IncreaseCSSUnitByOne:
      [UI.KeyboardShortcut.makeDescriptor(UI.KeyboardShortcut.Keys.Up, UI.KeyboardShortcut.Modifiers.Alt)],

  DecreaseCSSUnitByOne:
      [UI.KeyboardShortcut.makeDescriptor(UI.KeyboardShortcut.Keys.Down, UI.KeyboardShortcut.Modifiers.Alt)],

  IncreaseCSSUnitByTen:
      [UI.KeyboardShortcut.makeDescriptor(UI.KeyboardShortcut.Keys.PageUp, UI.KeyboardShortcut.Modifiers.Alt)],

  DecreaseCSSUnitByTen:
      [UI.KeyboardShortcut.makeDescriptor(UI.KeyboardShortcut.Keys.PageDown, UI.KeyboardShortcut.Modifiers.Alt)],
  EvaluateSelectionInConsole: [UI.KeyboardShortcut.makeDescriptor(
      'e', UI.KeyboardShortcut.Modifiers.Shift | UI.KeyboardShortcut.Modifiers.Ctrl)],

  AddSelectionToWatch: [UI.KeyboardShortcut.makeDescriptor(
      'a', UI.KeyboardShortcut.Modifiers.Shift | UI.KeyboardShortcut.Modifiers.Ctrl)],

  GoToMember: [UI.KeyboardShortcut.makeDescriptor(
      'o', UI.KeyboardShortcut.Modifiers.CtrlOrMeta | UI.KeyboardShortcut.Modifiers.Shift)],

  GoToLine: [UI.KeyboardShortcut.makeDescriptor('g', UI.KeyboardShortcut.Modifiers.Ctrl)],

  ToggleBreakpoint: [UI.KeyboardShortcut.makeDescriptor('b', UI.KeyboardShortcut.Modifiers.CtrlOrMeta)],

  NextCallFrame:
      [UI.KeyboardShortcut.makeDescriptor(UI.KeyboardShortcut.Keys.Period, UI.KeyboardShortcut.Modifiers.Ctrl)],

  PrevCallFrame:
      [UI.KeyboardShortcut.makeDescriptor(UI.KeyboardShortcut.Keys.Comma, UI.KeyboardShortcut.Modifiers.Ctrl)],

  ToggleComment:
      [UI.KeyboardShortcut.makeDescriptor(UI.KeyboardShortcut.Keys.Slash, UI.KeyboardShortcut.Modifiers.CtrlOrMeta)],

  JumpToPreviousLocation:
      [UI.KeyboardShortcut.makeDescriptor(UI.KeyboardShortcut.Keys.Minus, UI.KeyboardShortcut.Modifiers.Alt)],

  JumpToNextLocation:
      [UI.KeyboardShortcut.makeDescriptor(UI.KeyboardShortcut.Keys.Plus, UI.KeyboardShortcut.Modifiers.Alt)],

  CloseEditorTab: [UI.KeyboardShortcut.makeDescriptor('w', UI.KeyboardShortcut.Modifiers.Alt)],

  Save: [UI.KeyboardShortcut.makeDescriptor('s', UI.KeyboardShortcut.Modifiers.CtrlOrMeta)],

  SaveAll: [UI.KeyboardShortcut.makeDescriptor(
      's', UI.KeyboardShortcut.Modifiers.CtrlOrMeta | UI.KeyboardShortcut.Modifiers.ShiftOrOption)],
};

UI.ShortcutsScreen.LayersPanelShortcuts = {
  ResetView: [UI.KeyboardShortcut.makeDescriptor('0')],

  PanMode: [UI.KeyboardShortcut.makeDescriptor('x')],

  RotateMode: [UI.KeyboardShortcut.makeDescriptor('v')],

  TogglePanRotate: [UI.KeyboardShortcut.makeDescriptor(UI.KeyboardShortcut.Keys.Shift)],

  ZoomIn: [
    UI.KeyboardShortcut.makeDescriptor(UI.KeyboardShortcut.Keys.Plus, UI.KeyboardShortcut.Modifiers.Shift),
    UI.KeyboardShortcut.makeDescriptor(UI.KeyboardShortcut.Keys.NumpadPlus)
  ],

  ZoomOut: [
    UI.KeyboardShortcut.makeDescriptor(UI.KeyboardShortcut.Keys.Minus, UI.KeyboardShortcut.Modifiers.Shift),
    UI.KeyboardShortcut.makeDescriptor(UI.KeyboardShortcut.Keys.NumpadMinus)
  ],

  Up: [UI.KeyboardShortcut.makeDescriptor(UI.KeyboardShortcut.Keys.Up), UI.KeyboardShortcut.makeDescriptor('w')],

  Down: [UI.KeyboardShortcut.makeDescriptor(UI.KeyboardShortcut.Keys.Down), UI.KeyboardShortcut.makeDescriptor('s')],

  Left: [UI.KeyboardShortcut.makeDescriptor(UI.KeyboardShortcut.Keys.Left), UI.KeyboardShortcut.makeDescriptor('a')],

  Right: [UI.KeyboardShortcut.makeDescriptor(UI.KeyboardShortcut.Keys.Right), UI.KeyboardShortcut.makeDescriptor('d')]
};
