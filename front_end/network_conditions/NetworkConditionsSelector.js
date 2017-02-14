// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @unrestricted
 */
NetworkConditions.NetworkConditionsSelector = class {
  /**
   * @param {function(!Array<!NetworkConditions.NetworkConditionsGroup>):!Array<?SDK.NetworkManager.Conditions>} populateCallback
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
  static throughputText(throughput, plainText) {
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

    var downloadText = NetworkConditions.NetworkConditionsSelector.throughputText(conditions.download, plainText);
    var uploadText = NetworkConditions.NetworkConditionsSelector.throughputText(conditions.upload, plainText);
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
    var selector = new NetworkConditions.NetworkConditionsSelector(populate, select);
    selectElement.addEventListener('change', optionSelected, false);

    /**
     * @param {!Array.<!NetworkConditions.NetworkConditionsGroup>} groups
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
          var title = NetworkConditions.NetworkConditionsSelector._conditionsTitle(conditions, true);
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
    var selector = new NetworkConditions.NetworkConditionsSelector(populate, select);
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
              NetworkConditions.NetworkConditionsSelector._conditionsTitle(conditions, true).text,
              selector.optionSelected.bind(selector, conditions), selectedIndex === index);
        }
      }
      contextMenu.appendItem(Common.UIString('Edit\u2026'), selector.revealAndUpdate.bind(selector));
    }

    /**
     * @param {!Array.<!NetworkConditions.NetworkConditionsGroup>} groups
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
        Common.UIString('Offline'), Common.UIString('Force disconnected from network'), forceOffline);
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
    var presetsGroup = {title: Common.UIString('Presets'), items: NetworkConditions.NetworkConditionsSelector.presets};
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
NetworkConditions.NetworkConditionsGroup;


/** @type {!Array.<!SDK.NetworkManager.Conditions>} */
NetworkConditions.NetworkConditionsSelector.presets = [
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
 * @implements {UI.ActionDelegate}
 * @unrestricted
 */
NetworkConditions.NetworkConditionsActionDelegate = class {
  /**
   * @override
   * @param {!UI.Context} context
   * @param {string} actionId
   * @return {boolean}
   */
  handleAction(context, actionId) {
    if (actionId === 'network-conditions.network-online') {
      SDK.multitargetNetworkManager.setNetworkConditions(SDK.NetworkManager.NoThrottlingConditions);
      return true;
    }
    if (actionId === 'network-conditions.network-offline') {
      SDK.multitargetNetworkManager.setNetworkConditions(SDK.NetworkManager.OfflineConditions);
      return true;
    }
    return false;
  }
};
