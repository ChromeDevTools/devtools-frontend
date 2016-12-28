// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @unrestricted
 */
Components.NetworkConditionsSelector = class {
  /**
   * @param {function(!Array<!Components.NetworkConditionsGroup>):!Array<?SDK.NetworkManager.Conditions>} populateCallback
   * @param {function(number)} selectCallback
   */
  constructor(populateCallback, selectCallback) {
    this._populateCallback = populateCallback;
    this._selectCallback = selectCallback;
    this._customSetting = Common.moduleSetting('customNetworkConditions');
    this._customSetting.addChangeListener(this._populateOptions, this);
    this._manager = SDK.multitargetNetworkManager;
    this._manager.addEventListener(
        SDK.MultitargetNetworkManager.Events.ConditionsChanged, this._conditionsChanged, this);
    this._populateOptions();
  }

  /**
   * @param {number} throughput
   * @param {boolean=} plainText
   * @return {string}
   */
  static _throughputText(throughput, plainText) {
    if (throughput < 0)
      return '';
    var throughputInKbps = throughput / (1024 / 8);
    var delimiter = plainText ? '' : ' ';
    if (throughputInKbps < 1024)
      return Common.UIString('%d%skb/s', throughputInKbps, delimiter);
    if (throughputInKbps < 1024 * 10)
      return Common.UIString('%.1f%sMb/s', throughputInKbps / 1024, delimiter);
    return Common.UIString('%d%sMb/s', (throughputInKbps / 1024) | 0, delimiter);
  }

  /**
   * @param {!SDK.NetworkManager.Conditions} conditions
   * @param {boolean=} plainText
   * @return {!{text: string, title: string}}
   */
  static _conditionsTitle(conditions, plainText) {
    var downloadInKbps = conditions.download / (1024 / 8);
    var uploadInKbps = conditions.upload / (1024 / 8);
    var isThrottling = (downloadInKbps >= 0) || (uploadInKbps >= 0) || (conditions.latency > 0);
    var conditionTitle = Common.UIString(conditions.title);
    if (!isThrottling)
      return {text: conditionTitle, title: conditionTitle};

    var downloadText = Components.NetworkConditionsSelector._throughputText(conditions.download, plainText);
    var uploadText = Components.NetworkConditionsSelector._throughputText(conditions.upload, plainText);
    var pattern = plainText ? '%s (%dms, %s, %s)' : '%s (%dms RTT, %s\u2b07, %s\u2b06)';
    var title = Common.UIString(pattern, conditionTitle, conditions.latency, downloadText, uploadText);
    return {
      text: title,
      title: Common.UIString(
          'Maximum download throughput: %s.\r\nMaximum upload throughput: %s.\r\nMinimum round-trip time: %dms.',
          downloadText, uploadText, conditions.latency)
    };
  }

  /**
   * @param {!HTMLSelectElement} selectElement
   */
  static decorateSelect(selectElement) {
    var options = [];
    var selector = new Components.NetworkConditionsSelector(populate, select);
    selectElement.addEventListener('change', optionSelected, false);

    /**
     * @param {!Array.<!Components.NetworkConditionsGroup>} groups
     * @return {!Array<?SDK.NetworkManager.Conditions>}
     */
    function populate(groups) {
      selectElement.removeChildren();
      options = [];
      for (var i = 0; i < groups.length; ++i) {
        var group = groups[i];
        var groupElement = selectElement.createChild('optgroup');
        groupElement.label = group.title;
        for (var conditions of group.items) {
          var title = Components.NetworkConditionsSelector._conditionsTitle(conditions, true);
          var option = new Option(title.text, title.text);
          option.title = title.title;
          groupElement.appendChild(option);
          options.push(conditions);
        }
        if (i === groups.length - 1) {
          groupElement.appendChild(new Option(Common.UIString('Add\u2026'), Common.UIString('Add\u2026')));
          options.push(null);
        }
      }
      return options;
    }

    function optionSelected() {
      if (selectElement.selectedIndex === selectElement.options.length - 1)
        selector.revealAndUpdate();
      else
        selector.optionSelected(options[selectElement.selectedIndex]);
    }

    /**
     * @param {number} index
     */
    function select(index) {
      if (selectElement.selectedIndex !== index)
        selectElement.selectedIndex = index;
    }
  }

  /**
   * @return {!UI.ToolbarMenuButton}
   */
  static createToolbarMenuButton() {
    var button = new UI.ToolbarMenuButton(appendItems);
    button.setGlyph('');
    button.turnIntoSelect();

    /** @type {!Array<?SDK.NetworkManager.Conditions>} */
    var options = [];
    var selectedIndex = -1;
    var selector = new Components.NetworkConditionsSelector(populate, select);
    return button;

    /**
     * @param {!UI.ContextMenu} contextMenu
     */
    function appendItems(contextMenu) {
      for (var index = 0; index < options.length; ++index) {
        var conditions = options[index];
        if (!conditions) {
          contextMenu.appendSeparator();
        } else {
          contextMenu.appendCheckboxItem(
              Components.NetworkConditionsSelector._conditionsTitle(conditions, true).text,
              selector.optionSelected.bind(selector, conditions), selectedIndex === index);
        }
      }
      contextMenu.appendItem(Common.UIString('Edit\u2026'), selector.revealAndUpdate.bind(selector));
    }

    /**
     * @param {!Array.<!Components.NetworkConditionsGroup>} groups
     * @return {!Array<?SDK.NetworkManager.Conditions>}
     */
    function populate(groups) {
      options = [];
      for (var group of groups) {
        for (var conditions of group.items)
          options.push(conditions);
        options.push(null);
      }
      return options;
    }

    /**
     * @param {number} index
     */
    function select(index) {
      selectedIndex = index;
      button.setText(options[index].title);
    }
  }

  /**
   * @return {!UI.ToolbarCheckbox}
   */
  static createOfflineToolbarCheckbox() {
    var checkbox = new UI.ToolbarCheckbox(
        Common.UIString('Offline'), Common.UIString('Force disconnected from network'), undefined, forceOffline);
    SDK.multitargetNetworkManager.addEventListener(
        SDK.MultitargetNetworkManager.Events.ConditionsChanged, networkConditionsChanged);
    checkbox.setChecked(SDK.multitargetNetworkManager.networkConditions() === SDK.NetworkManager.OfflineConditions);

    var lastNetworkConditions;

    function forceOffline() {
      if (checkbox.checked()) {
        lastNetworkConditions = SDK.multitargetNetworkManager.networkConditions();
        SDK.multitargetNetworkManager.setNetworkConditions(SDK.NetworkManager.OfflineConditions);
      } else {
        SDK.multitargetNetworkManager.setNetworkConditions(lastNetworkConditions);
      }
    }

    function networkConditionsChanged() {
      var conditions = SDK.multitargetNetworkManager.networkConditions();
      if (conditions !== SDK.NetworkManager.OfflineConditions)
        lastNetworkConditions = conditions;
      checkbox.setChecked(conditions === SDK.NetworkManager.OfflineConditions);
    }
    return checkbox;
  }

  _populateOptions() {
    var customGroup = {title: Common.UIString('Custom'), items: this._customSetting.get()};
    var presetsGroup = {title: Common.UIString('Presets'), items: Components.NetworkConditionsSelector._presets};
    var disabledGroup = {title: Common.UIString('Disabled'), items: [SDK.NetworkManager.NoThrottlingConditions]};
    this._options = this._populateCallback([disabledGroup, presetsGroup, customGroup]);
    if (!this._conditionsChanged()) {
      for (var i = this._options.length - 1; i >= 0; i--) {
        if (this._options[i]) {
          this.optionSelected(/** @type {!SDK.NetworkManager.Conditions} */ (this._options[i]));
          break;
        }
      }
    }
  }

  revealAndUpdate() {
    Common.Revealer.reveal(this._customSetting);
    this._conditionsChanged();
  }

  /**
   * @param {!SDK.NetworkManager.Conditions} conditions
   */
  optionSelected(conditions) {
    this._manager.setNetworkConditions(conditions);
  }

  /**
   * @return {boolean}
   */
  _conditionsChanged() {
    var value = this._manager.networkConditions();
    for (var index = 0; index < this._options.length; ++index) {
      var option = this._options[index];
      if (option && option.download === value.download && option.upload === value.upload &&
          option.latency === value.latency && option.title === value.title) {
        this._selectCallback(index);
        return true;
      }
    }
    return false;
  }
};

/** @typedef {!{title: string, items: !Array<!SDK.NetworkManager.Conditions>}} */
Components.NetworkConditionsGroup;


/** @type {!Array.<!SDK.NetworkManager.Conditions>} */
Components.NetworkConditionsSelector._presets = [
  SDK.NetworkManager.OfflineConditions, {title: 'GPRS', download: 50 * 1024 / 8, upload: 20 * 1024 / 8, latency: 500},
  {title: 'Regular 2G', download: 250 * 1024 / 8, upload: 50 * 1024 / 8, latency: 300},
  {title: 'Good 2G', download: 450 * 1024 / 8, upload: 150 * 1024 / 8, latency: 150},
  {title: 'Regular 3G', download: 750 * 1024 / 8, upload: 250 * 1024 / 8, latency: 100},
  {title: 'Good 3G', download: 1.5 * 1024 * 1024 / 8, upload: 750 * 1024 / 8, latency: 40},
  {title: 'Regular 4G', download: 4 * 1024 * 1024 / 8, upload: 3 * 1024 * 1024 / 8, latency: 20},
  {title: 'DSL', download: 2 * 1024 * 1024 / 8, upload: 1 * 1024 * 1024 / 8, latency: 5},
  {title: 'WiFi', download: 30 * 1024 * 1024 / 8, upload: 15 * 1024 * 1024 / 8, latency: 2}
];


/**
 * @implements {UI.ListWidget.Delegate}
 * @unrestricted
 */
Components.NetworkConditionsSettingsTab = class extends UI.VBox {
  constructor() {
    super(true);
    this.registerRequiredCSS('components/networkConditionsSettingsTab.css');

    this.contentElement.createChild('div', 'header').textContent = Common.UIString('Network Throttling Profiles');

    var addButton = UI.createTextButton(
        Common.UIString('Add custom profile...'), this._addButtonClicked.bind(this), 'add-conditions-button');
    this.contentElement.appendChild(addButton);

    this._list = new UI.ListWidget(this);
    this._list.element.classList.add('conditions-list');
    this._list.registerRequiredCSS('components/networkConditionsSettingsTab.css');
    this._list.show(this.contentElement);

    this._customSetting = Common.moduleSetting('customNetworkConditions');
    this._customSetting.addChangeListener(this._conditionsUpdated, this);

    this.setDefaultFocusedElement(addButton);
    this.contentElement.tabIndex = 0;
  }

  /**
   * @override
   */
  wasShown() {
    super.wasShown();
    this._conditionsUpdated();
  }

  _conditionsUpdated() {
    this._list.clear();

    var conditions = this._customSetting.get();
    for (var i = 0; i < conditions.length; ++i)
      this._list.appendItem(conditions[i], true);

    this._list.appendSeparator();

    conditions = Components.NetworkConditionsSelector._presets;
    for (var i = 0; i < conditions.length; ++i)
      this._list.appendItem(conditions[i], false);
  }

  _addButtonClicked() {
    this._list.addNewItem(this._customSetting.get().length, {title: '', download: -1, upload: -1, latency: 0});
  }

  /**
   * @override
   * @param {*} item
   * @param {boolean} editable
   * @return {!Element}
   */
  renderItem(item, editable) {
    var conditions = /** @type {!SDK.NetworkManager.Conditions} */ (item);
    var element = createElementWithClass('div', 'conditions-list-item');
    var title = element.createChild('div', 'conditions-list-text conditions-list-title');
    var titleText = title.createChild('div', 'conditions-list-title-text');
    titleText.textContent = conditions.title;
    titleText.title = conditions.title;
    element.createChild('div', 'conditions-list-separator');
    element.createChild('div', 'conditions-list-text').textContent =
        Components.NetworkConditionsSelector._throughputText(conditions.download);
    element.createChild('div', 'conditions-list-separator');
    element.createChild('div', 'conditions-list-text').textContent =
        Components.NetworkConditionsSelector._throughputText(conditions.upload);
    element.createChild('div', 'conditions-list-separator');
    element.createChild('div', 'conditions-list-text').textContent = Common.UIString('%dms', conditions.latency);
    return element;
  }

  /**
   * @override
   * @param {*} item
   * @param {number} index
   */
  removeItemRequested(item, index) {
    var list = this._customSetting.get();
    list.splice(index, 1);
    this._customSetting.set(list);
  }

  /**
   * @override
   * @param {*} item
   * @param {!UI.ListWidget.Editor} editor
   * @param {boolean} isNew
   */
  commitEdit(item, editor, isNew) {
    var conditions = /** @type {?SDK.NetworkManager.Conditions} */ (item);
    conditions.title = editor.control('title').value.trim();
    var download = editor.control('download').value.trim();
    conditions.download = download ? parseInt(download, 10) * (1024 / 8) : -1;
    var upload = editor.control('upload').value.trim();
    conditions.upload = upload ? parseInt(upload, 10) * (1024 / 8) : -1;
    var latency = editor.control('latency').value.trim();
    conditions.latency = latency ? parseInt(latency, 10) : 0;

    var list = this._customSetting.get();
    if (isNew)
      list.push(conditions);
    this._customSetting.set(list);
  }

  /**
   * @override
   * @param {*} item
   * @return {!UI.ListWidget.Editor}
   */
  beginEdit(item) {
    var conditions = /** @type {?SDK.NetworkManager.Conditions} */ (item);
    var editor = this._createEditor();
    editor.control('title').value = conditions.title;
    editor.control('download').value = conditions.download <= 0 ? '' : String(conditions.download / (1024 / 8));
    editor.control('upload').value = conditions.upload <= 0 ? '' : String(conditions.upload / (1024 / 8));
    editor.control('latency').value = conditions.latency ? String(conditions.latency) : '';
    return editor;
  }

  /**
   * @return {!UI.ListWidget.Editor}
   */
  _createEditor() {
    if (this._editor)
      return this._editor;

    var editor = new UI.ListWidget.Editor();
    this._editor = editor;
    var content = editor.contentElement();

    var titles = content.createChild('div', 'conditions-edit-row');
    titles.createChild('div', 'conditions-list-text conditions-list-title').textContent =
        Common.UIString('Profile Name');
    titles.createChild('div', 'conditions-list-separator conditions-list-separator-invisible');
    titles.createChild('div', 'conditions-list-text').textContent = Common.UIString('Download');
    titles.createChild('div', 'conditions-list-separator conditions-list-separator-invisible');
    titles.createChild('div', 'conditions-list-text').textContent = Common.UIString('Upload');
    titles.createChild('div', 'conditions-list-separator conditions-list-separator-invisible');
    titles.createChild('div', 'conditions-list-text').textContent = Common.UIString('Latency');

    var fields = content.createChild('div', 'conditions-edit-row');
    fields.createChild('div', 'conditions-list-text conditions-list-title')
        .appendChild(editor.createInput('title', 'text', '', titleValidator));
    fields.createChild('div', 'conditions-list-separator conditions-list-separator-invisible');

    var cell = fields.createChild('div', 'conditions-list-text');
    cell.appendChild(editor.createInput('download', 'text', Common.UIString('kb/s'), throughputValidator));
    cell.createChild('div', 'conditions-edit-optional').textContent = Common.UIString('optional');
    fields.createChild('div', 'conditions-list-separator conditions-list-separator-invisible');

    cell = fields.createChild('div', 'conditions-list-text');
    cell.appendChild(editor.createInput('upload', 'text', Common.UIString('kb/s'), throughputValidator));
    cell.createChild('div', 'conditions-edit-optional').textContent = Common.UIString('optional');
    fields.createChild('div', 'conditions-list-separator conditions-list-separator-invisible');

    cell = fields.createChild('div', 'conditions-list-text');
    cell.appendChild(editor.createInput('latency', 'text', Common.UIString('ms'), latencyValidator));
    cell.createChild('div', 'conditions-edit-optional').textContent = Common.UIString('optional');

    return editor;

    /**
     * @param {*} item
     * @param {number} index
     * @param {!HTMLInputElement|!HTMLSelectElement} input
     * @return {boolean}
     */
    function titleValidator(item, index, input) {
      var value = input.value.trim();
      return value.length > 0 && value.length < 50;
    }

    /**
     * @param {*} item
     * @param {number} index
     * @param {!HTMLInputElement|!HTMLSelectElement} input
     * @return {boolean}
     */
    function throughputValidator(item, index, input) {
      var value = input.value.trim();
      return !value || (/^[\d]+(\.\d+)?|\.\d+$/.test(value) && value >= 0 && value <= 10000000);
    }

    /**
     * @param {*} item
     * @param {number} index
     * @param {!HTMLInputElement|!HTMLSelectElement} input
     * @return {boolean}
     */
    function latencyValidator(item, index, input) {
      var value = input.value.trim();
      return !value || (/^[\d]+$/.test(value) && value >= 0 && value <= 1000000);
    }
  }
};

/**
 * @implements {UI.ActionDelegate}
 * @unrestricted
 */
Components.NetworkConditionsActionDelegate = class {
  /**
   * @override
   * @param {!UI.Context} context
   * @param {string} actionId
   * @return {boolean}
   */
  handleAction(context, actionId) {
    if (actionId === 'components.network-online') {
      SDK.multitargetNetworkManager.setNetworkConditions(SDK.NetworkManager.NoThrottlingConditions);
      return true;
    }
    if (actionId === 'components.network-offline') {
      SDK.multitargetNetworkManager.setNetworkConditions(SDK.NetworkManager.OfflineConditions);
      return true;
    }
    return false;
  }
};

/**
 * @param {!Protocol.Network.ResourcePriority} priority
 * @return {string}
 */
Components.uiLabelForPriority = function(priority) {
  var map = Components.priorityUiLabelMap();
  return map.get(priority) || '';
};

/**
 * @param {string} priorityLabel
 * @return {string}
 */
Components.uiLabelToPriority = function(priorityLabel) {
  /** @type {!Map<string, !Protocol.Network.ResourcePriority>} */
  var labelToPriorityMap = Components.uiLabelToPriority._uiLabelToPriorityMap;

  if (labelToPriorityMap)
    return labelToPriorityMap.get(priorityLabel);

  labelToPriorityMap = new Map();
  Components.priorityUiLabelMap().forEach((value, key) => labelToPriorityMap.set(value, key));
  Components.uiLabelToPriority._uiLabelToPriorityMap = labelToPriorityMap;
  return labelToPriorityMap.get(priorityLabel) || '';
};

/**
 * @return {!Map<!Protocol.Network.ResourcePriority, string>}
 */
Components.priorityUiLabelMap = function() {
  /** @type {!Map<!Protocol.Network.ResourcePriority, string>} */
  var map = Components.priorityUiLabelMap._priorityUiLabelMap;

  if (map)
    return map;

  map = new Map();
  map.set(Protocol.Network.ResourcePriority.VeryLow, Common.UIString('Lowest'));
  map.set(Protocol.Network.ResourcePriority.Low, Common.UIString('Low'));
  map.set(Protocol.Network.ResourcePriority.Medium, Common.UIString('Medium'));
  map.set(Protocol.Network.ResourcePriority.High, Common.UIString('High'));
  map.set(Protocol.Network.ResourcePriority.VeryHigh, Common.UIString('Highest'));
  Components.priorityUiLabelMap._priorityUiLabelMap = map;

  return map;
};

/**
 * @return {!Map<!Protocol.Network.ResourcePriority, number>}
 */
Components.prioritySymbolToNumericMap = function() {
  /** @type {!Map<!Protocol.Network.ResourcePriority, number>} */
  var priorityMap = Components.prioritySymbolToNumericMap._symbolicToNumericPriorityMap;

  if (priorityMap)
    return priorityMap;

  priorityMap = new Map();
  priorityMap.set(Protocol.Network.ResourcePriority.VeryLow, 1);
  priorityMap.set(Protocol.Network.ResourcePriority.Low, 2);
  priorityMap.set(Protocol.Network.ResourcePriority.Medium, 3);
  priorityMap.set(Protocol.Network.ResourcePriority.High, 4);
  priorityMap.set(Protocol.Network.ResourcePriority.VeryHigh, 5);
  Components.prioritySymbolToNumericMap._symbolicToNumericPriorityMap = priorityMap;

  return priorityMap;
};
