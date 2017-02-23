// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @implements {SDK.TargetManager.Observer}
 * @unrestricted
 */
Sources.EventListenerBreakpointsSidebarPane = class extends UI.VBox {
  constructor() {
    super();
    this.registerRequiredCSS('components/breakpointsList.css');

    this._eventListenerBreakpointsSetting = Common.settings.createLocalSetting('eventListenerBreakpoints', []);

    this._categoriesTreeOutline = new UI.TreeOutlineInShadow();
    this._categoriesTreeOutline.element.tabIndex = 0;
    this._categoriesTreeOutline.element.classList.add('event-listener-breakpoints');
    this._categoriesTreeOutline.registerRequiredCSS('sources/eventListenerBreakpoints.css');
    this.element.appendChild(this._categoriesTreeOutline.element);

    this._categoryItems = [];
    // FIXME: uncomment following once inspector stops being drop targer in major ports.
    // Otherwise, inspector page reacts on drop event and tries to load the event data.
    // this._createCategory(Common.UIString("Drag"), ["drag", "drop", "dragstart", "dragend", "dragenter", "dragleave", "dragover"]);
    this._createCategory(
        Common.UIString('Animation'), ['requestAnimationFrame', 'cancelAnimationFrame', 'animationFrameFired'], true);
    this._createCategory(
        Common.UIString('Canvas'), ['canvasContextCreated', 'webglErrorFired', 'webglWarningFired'], true);
    this._createCategory(
        Common.UIString('Clipboard'), ['copy', 'cut', 'paste', 'beforecopy', 'beforecut', 'beforepaste']);
    this._createCategory(
        Common.UIString('Control'),
        ['resize', 'scroll', 'zoom', 'focus', 'blur', 'select', 'change', 'submit', 'reset']);
    this._createCategory(Common.UIString('Device'), ['deviceorientation', 'devicemotion']);
    this._createCategory(Common.UIString('DOM Mutation'), [
      'DOMActivate', 'DOMFocusIn', 'DOMFocusOut', 'DOMAttrModified', 'DOMCharacterDataModified', 'DOMNodeInserted',
      'DOMNodeInsertedIntoDocument', 'DOMNodeRemoved', 'DOMNodeRemovedFromDocument', 'DOMSubtreeModified',
      'DOMContentLoaded'
    ]);
    this._createCategory(
        Common.UIString('Geolocation'), ['Geolocation.getCurrentPosition', 'Geolocation.watchPosition'], true);
    this._createCategory(Common.UIString('Drag / drop'), ['dragenter', 'dragover', 'dragleave', 'drop']);
    this._createCategory(Common.UIString('Keyboard'), ['keydown', 'keyup', 'keypress', 'input']);
    this._createCategory(
        Common.UIString('Load'), ['load', 'beforeunload', 'unload', 'abort', 'error', 'hashchange', 'popstate']);
    this._createCategory(
        Common.UIString('Media'),
        [
          'play',      'pause',          'playing',    'canplay',    'canplaythrough', 'seeking',
          'seeked',    'timeupdate',     'ended',      'ratechange', 'durationchange', 'volumechange',
          'loadstart', 'progress',       'suspend',    'abort',      'error',          'emptied',
          'stalled',   'loadedmetadata', 'loadeddata', 'waiting'
        ],
        false, ['audio', 'video']);
    this._createCategory(Common.UIString('Mouse'), [
      'auxclick', 'click', 'dblclick', 'mousedown', 'mouseup', 'mouseover', 'mousemove', 'mouseout', 'mouseenter',
      'mouseleave', 'mousewheel', 'wheel', 'contextmenu'
    ]);
    this._createCategory(Common.UIString('Notification'), ['Notification.requestPermission'], true);
    this._createCategory(Common.UIString('Parse'), ['setInnerHTML', 'Document.write'], true);
    this._createCategory(Common.UIString('Pointer'), [
      'pointerover', 'pointerout', 'pointerenter', 'pointerleave', 'pointerdown', 'pointerup', 'pointermove',
      'pointercancel', 'gotpointercapture', 'lostpointercapture'
    ]);
    this._createCategory(Common.UIString('Script'), ['scriptFirstStatement', 'scriptBlockedByCSP'], true);
    this._createCategory(
        Common.UIString('Timer'), ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'timerFired'], true);
    this._createCategory(Common.UIString('Touch'), ['touchstart', 'touchmove', 'touchend', 'touchcancel']);
    this._createCategory(Common.UIString('Window'), ['DOMWindow.close'], true);
    this._createCategory(
        Common.UIString('XHR'),
        ['readystatechange', 'load', 'loadstart', 'loadend', 'abort', 'error', 'progress', 'timeout'], false,
        ['XMLHttpRequest', 'XMLHttpRequestUpload']);

    SDK.targetManager.observeTargets(this, SDK.Target.Capability.DOM);
    SDK.targetManager.addModelListener(SDK.DebuggerModel, SDK.DebuggerModel.Events.DebuggerPaused, this._update, this);
    SDK.targetManager.addModelListener(SDK.DebuggerModel, SDK.DebuggerModel.Events.DebuggerResumed, this._update, this);
    UI.context.addFlavorChangeListener(SDK.Target, this._update, this);
  }

  /**
   * @param {string} eventName
   * @param {!Object=} auxData
   * @return {string}
   */
  static eventNameForUI(eventName, auxData) {
    if (!Sources.EventListenerBreakpointsSidebarPane._eventNamesForUI) {
      Sources.EventListenerBreakpointsSidebarPane._eventNamesForUI = {
        'instrumentation:timerFired': Common.UIString('Timer Fired'),
        'instrumentation:scriptFirstStatement': Common.UIString('Script First Statement'),
        'instrumentation:scriptBlockedByCSP': Common.UIString('Script Blocked by Content Security Policy'),
        'instrumentation:requestAnimationFrame': Common.UIString('Request Animation Frame'),
        'instrumentation:cancelAnimationFrame': Common.UIString('Cancel Animation Frame'),
        'instrumentation:requestAnimationFrame.callback': Common.UIString('Animation Frame Fired'),
        'instrumentation:webglErrorFired': Common.UIString('WebGL Error Fired'),
        'instrumentation:webglWarningFired': Common.UIString('WebGL Warning Fired'),
        'instrumentation:Element.setInnerHTML': Common.UIString('Set innerHTML'),
        'instrumentation:canvasContextCreated': Common.UIString('Create canvas context'),
        'instrumentation:Geolocation.getCurrentPosition': 'getCurrentPosition',
        'instrumentation:Geolocation.watchPosition': 'watchPosition',
        'instrumentation:Notification.requestPermission': 'requestPermission',
        'instrumentation:DOMWindow.close': 'window.close',
        'instrumentation:Document.write': 'document.write',
      };
    }
    if (auxData) {
      if (eventName === 'instrumentation:webglErrorFired' && auxData['webglErrorName']) {
        var errorName = auxData['webglErrorName'];
        // If there is a hex code of the error, display only this.
        errorName = errorName.replace(/^.*(0x[0-9a-f]+).*$/i, '$1');
        return Common.UIString('WebGL Error Fired (%s)', errorName);
      }
      if (eventName === 'instrumentation:scriptBlockedByCSP' && auxData['directiveText'])
        return Common.UIString('Script blocked due to Content Security Policy directive: %s', auxData['directiveText']);
    }
    return Sources.EventListenerBreakpointsSidebarPane._eventNamesForUI[eventName] ||
        eventName.substring(eventName.indexOf(':') + 1);
  }

  /**
   * @override
   * @param {!SDK.Target} target
   */
  targetAdded(target) {
    this._restoreBreakpoints(target);
  }

  /**
   * @override
   * @param {!SDK.Target} target
   */
  targetRemoved(target) {
  }

  /**
   * @param {string} name
   * @param {!Array.<string>} eventNames
   * @param {boolean=} isInstrumentationEvent
   * @param {!Array.<string>=} targetNames
   */
  _createCategory(name, eventNames, isInstrumentationEvent, targetNames) {
    var labelNode = UI.createCheckboxLabel(name);

    var categoryItem = {};
    categoryItem.element = new UI.TreeElement(labelNode);
    this._categoriesTreeOutline.appendChild(categoryItem.element);
    categoryItem.element.selectable = false;

    categoryItem.checkbox = labelNode.checkboxElement;
    categoryItem.checkbox.addEventListener('click', this._categoryCheckboxClicked.bind(this, categoryItem), true);

    categoryItem.targetNames =
        this._stringArrayToLowerCase(targetNames || [Sources.EventListenerBreakpointsSidebarPane.eventTargetAny]);
    categoryItem.children = {};
    var category =
        (isInstrumentationEvent ? Sources.EventListenerBreakpointsSidebarPane.categoryInstrumentation :
                                  Sources.EventListenerBreakpointsSidebarPane.categoryListener);
    for (var i = 0; i < eventNames.length; ++i) {
      var eventName = category + eventNames[i];

      var breakpointItem = {};
      var title = Sources.EventListenerBreakpointsSidebarPane.eventNameForUI(eventName);

      labelNode = UI.createCheckboxLabel(title);
      labelNode.classList.add('source-code');

      breakpointItem.element = new UI.TreeElement(labelNode);
      categoryItem.element.appendChild(breakpointItem.element);

      breakpointItem.element.listItemElement.createChild('div', 'breakpoint-hit-marker');
      breakpointItem.element.selectable = false;

      breakpointItem.checkbox = labelNode.checkboxElement;
      breakpointItem.checkbox.addEventListener(
          'click', this._breakpointCheckboxClicked.bind(this, eventName, categoryItem.targetNames), true);
      breakpointItem.parent = categoryItem;

      categoryItem.children[eventName] = breakpointItem;
    }
    this._categoryItems.push(categoryItem);
  }

  _update() {
    var target = UI.context.flavor(SDK.Target);
    var debuggerModel = SDK.DebuggerModel.fromTarget(target);
    var details = debuggerModel ? debuggerModel.debuggerPausedDetails() : null;

    if (!details || details.reason !== SDK.DebuggerModel.BreakReason.EventListener) {
      if (this._highlightedElement) {
        this._highlightedElement.classList.remove('breakpoint-hit');
        delete this._highlightedElement;
      }
      return;
    }
    var eventName = details.auxData['eventName'];
    var targetName = details.auxData['targetName'];
    var breakpointItem = this._findBreakpointItem(eventName, targetName);
    if (!breakpointItem || !breakpointItem.checkbox.checked)
      breakpointItem = this._findBreakpointItem(eventName, Sources.EventListenerBreakpointsSidebarPane.eventTargetAny);
    if (!breakpointItem)
      return;
    UI.viewManager.showView('sources.eventListenerBreakpoints');
    breakpointItem.parent.element.expand();
    breakpointItem.element.listItemElement.classList.add('breakpoint-hit');
    this._highlightedElement = breakpointItem.element.listItemElement;
  }

  /**
   * @param {!Array.<string>} array
   * @return {!Array.<string>}
   */
  _stringArrayToLowerCase(array) {
    return array.map(function(value) {
      return value.toLowerCase();
    });
  }

  _categoryCheckboxClicked(categoryItem) {
    var checked = categoryItem.checkbox.checked;
    for (var eventName in categoryItem.children) {
      var breakpointItem = categoryItem.children[eventName];
      if (breakpointItem.checkbox.checked === checked)
        continue;
      if (checked)
        this._setBreakpoint(eventName, categoryItem.targetNames);
      else
        this._removeBreakpoint(eventName, categoryItem.targetNames);
    }
    this._saveBreakpoints();
  }

  /**
   * @param {string} eventName
   * @param {!Array.<string>} targetNames
   * @param {!Event} event
   */
  _breakpointCheckboxClicked(eventName, targetNames, event) {
    if (event.target.checked)
      this._setBreakpoint(eventName, targetNames);
    else
      this._removeBreakpoint(eventName, targetNames);
    this._saveBreakpoints();
  }

  /**
   * @param {string} eventName
   * @param {?Array.<string>=} eventTargetNames
   * @param {!SDK.Target=} target
   */
  _setBreakpoint(eventName, eventTargetNames, target) {
    eventTargetNames = eventTargetNames || [Sources.EventListenerBreakpointsSidebarPane.eventTargetAny];
    for (var i = 0; i < eventTargetNames.length; ++i) {
      var eventTargetName = eventTargetNames[i];
      var breakpointItem = this._findBreakpointItem(eventName, eventTargetName);
      if (!breakpointItem)
        continue;
      breakpointItem.checkbox.checked = true;
      breakpointItem.parent.dirtyCheckbox = true;
      this._updateBreakpointOnTarget(eventName, eventTargetName, true, target);
    }
    this._updateCategoryCheckboxes();
  }

  /**
   * @param {string} eventName
   * @param {?Array.<string>=} eventTargetNames
   * @param {!SDK.Target=} target
   */
  _removeBreakpoint(eventName, eventTargetNames, target) {
    eventTargetNames = eventTargetNames || [Sources.EventListenerBreakpointsSidebarPane.eventTargetAny];
    for (var i = 0; i < eventTargetNames.length; ++i) {
      var eventTargetName = eventTargetNames[i];
      var breakpointItem = this._findBreakpointItem(eventName, eventTargetName);
      if (!breakpointItem)
        continue;
      breakpointItem.checkbox.checked = false;
      breakpointItem.parent.dirtyCheckbox = true;
      this._updateBreakpointOnTarget(eventName, eventTargetName, false, target);
    }
    this._updateCategoryCheckboxes();
  }

  /**
   * @param {string} eventName
   * @param {string} eventTargetName
   * @param {boolean} enable
   * @param {!SDK.Target=} target
   */
  _updateBreakpointOnTarget(eventName, eventTargetName, enable, target) {
    var targets = target ? [target] : SDK.targetManager.targets(SDK.Target.Capability.DOM);
    for (target of targets) {
      if (eventName.startsWith(Sources.EventListenerBreakpointsSidebarPane.categoryListener)) {
        var protocolEventName =
            eventName.substring(Sources.EventListenerBreakpointsSidebarPane.categoryListener.length);
        if (enable)
          target.domdebuggerAgent().setEventListenerBreakpoint(protocolEventName, eventTargetName);
        else
          target.domdebuggerAgent().removeEventListenerBreakpoint(protocolEventName, eventTargetName);
      } else if (eventName.startsWith(Sources.EventListenerBreakpointsSidebarPane.categoryInstrumentation)) {
        var protocolEventName =
            eventName.substring(Sources.EventListenerBreakpointsSidebarPane.categoryInstrumentation.length);
        if (enable)
          target.domdebuggerAgent().setInstrumentationBreakpoint(protocolEventName);
        else
          target.domdebuggerAgent().removeInstrumentationBreakpoint(protocolEventName);
      }
    }
  }

  _updateCategoryCheckboxes() {
    for (var i = 0; i < this._categoryItems.length; ++i) {
      var categoryItem = this._categoryItems[i];
      if (!categoryItem.dirtyCheckbox)
        continue;
      categoryItem.dirtyCheckbox = false;
      var hasEnabled = false;
      var hasDisabled = false;
      for (var eventName in categoryItem.children) {
        var breakpointItem = categoryItem.children[eventName];
        if (breakpointItem.checkbox.checked)
          hasEnabled = true;
        else
          hasDisabled = true;
      }
      categoryItem.checkbox.checked = hasEnabled;
      categoryItem.checkbox.indeterminate = hasEnabled && hasDisabled;
    }
  }

  /**
   * @param {string} eventName
   * @param {string=} targetName
   * @return {?Object}
   */
  _findBreakpointItem(eventName, targetName) {
    targetName = (targetName || Sources.EventListenerBreakpointsSidebarPane.eventTargetAny).toLowerCase();
    for (var i = 0; i < this._categoryItems.length; ++i) {
      var categoryItem = this._categoryItems[i];
      if (categoryItem.targetNames.indexOf(targetName) === -1)
        continue;
      var breakpointItem = categoryItem.children[eventName];
      if (breakpointItem)
        return breakpointItem;
    }
    return null;
  }

  _saveBreakpoints() {
    var breakpoints = [];
    for (var i = 0; i < this._categoryItems.length; ++i) {
      var categoryItem = this._categoryItems[i];
      for (var eventName in categoryItem.children) {
        var breakpointItem = categoryItem.children[eventName];
        if (breakpointItem.checkbox.checked)
          breakpoints.push({eventName: eventName, targetNames: categoryItem.targetNames});
      }
    }
    this._eventListenerBreakpointsSetting.set(breakpoints);
  }

  /**
   * @param {!SDK.Target} target
   */
  _restoreBreakpoints(target) {
    var breakpoints = this._eventListenerBreakpointsSetting.get();
    for (var i = 0; i < breakpoints.length; ++i) {
      var breakpoint = breakpoints[i];
      if (breakpoint && typeof breakpoint.eventName === 'string')
        this._setBreakpoint(breakpoint.eventName, breakpoint.targetNames, target);
    }
  }
};

Sources.EventListenerBreakpointsSidebarPane.categoryListener = 'listener:';
Sources.EventListenerBreakpointsSidebarPane.categoryInstrumentation = 'instrumentation:';
Sources.EventListenerBreakpointsSidebarPane.eventTargetAny = '*';
