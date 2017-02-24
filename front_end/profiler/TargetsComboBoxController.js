// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @implements {SDK.TargetManager.Observer}
 * @unrestricted
 */
Profiler.TargetsComboBoxController = class {
  /**
   * @param {!Element} selectElement
   * @param {!Element} elementToHide
   */
  constructor(selectElement, elementToHide) {
    elementToHide.classList.add('hidden');
    selectElement.addEventListener('change', this._onComboBoxSelectionChange.bind(this), false);
    this._selectElement = selectElement;
    this._elementToHide = elementToHide;
    /** @type {!Map.<!SDK.Target, !Element>} */
    this._targetToOption = new Map();

    UI.context.addFlavorChangeListener(SDK.Target, this._targetChangedExternally, this);
    SDK.targetManager.addEventListener(SDK.TargetManager.Events.NameChanged, this._targetNameChanged, this);
    SDK.targetManager.observeTargets(this, SDK.Target.Capability.JS);
  }

  /**
   * @override
   * @param {!SDK.Target} target
   */
  targetAdded(target) {
    var option = this._selectElement.createChild('option');
    option.text = target.name();
    option.__target = target;
    this._targetToOption.set(target, option);
    if (UI.context.flavor(SDK.Target) === target) {
      this._selectElement.selectedIndex = Array.prototype.indexOf.call(/** @type {?} */ (this._selectElement), option);
      UI.context.setFlavor(SDK.HeapProfilerModel, target.model(SDK.HeapProfilerModel));
      UI.context.setFlavor(SDK.CPUProfilerModel, target.model(SDK.CPUProfilerModel));
    }

    this._updateVisibility();
  }

  /**
   * @override
   * @param {!SDK.Target} target
   */
  targetRemoved(target) {
    var option = this._targetToOption.remove(target);
    this._selectElement.removeChild(option);
    this._updateVisibility();
  }

  /**
   * @param {!Common.Event} event
   */
  _targetNameChanged(event) {
    var target = /** @type {!SDK.Target} */ (event.data);
    var option = this._targetToOption.get(target);
    option.text = target.name();
  }

  _onComboBoxSelectionChange() {
    var selectedOption = this._selectElement[this._selectElement.selectedIndex];
    if (!selectedOption)
      return;

    UI.context.setFlavor(SDK.Target, selectedOption.__target);
    UI.context.setFlavor(SDK.HeapProfilerModel, selectedOption.__target.model(SDK.HeapProfilerModel));
    UI.context.setFlavor(SDK.CPUProfilerModel, selectedOption.__target.model(SDK.CPUProfilerModel));
  }

  _updateVisibility() {
    var hidden = this._selectElement.childElementCount === 1;
    this._elementToHide.classList.toggle('hidden', hidden);
  }

  /**
   * @param {!Common.Event} event
   */
  _targetChangedExternally(event) {
    var target = /** @type {?SDK.Target} */ (event.data);
    if (!target)
      return;
    var option = this._targetToOption.get(target);
    if (!option)
      return;
    this._select(option);
    UI.context.setFlavor(SDK.HeapProfilerModel, target.model(SDK.HeapProfilerModel));
    UI.context.setFlavor(SDK.CPUProfilerModel, target.model(SDK.CPUProfilerModel));
  }

  /**
   * @param {!Element} option
   */
  _select(option) {
    this._selectElement.selectedIndex = Array.prototype.indexOf.call(/** @type {?} */ (this._selectElement), option);
  }
};
