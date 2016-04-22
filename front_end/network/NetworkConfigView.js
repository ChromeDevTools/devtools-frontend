// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @extends {WebInspector.VBox}
 */
WebInspector.NetworkConfigView = function()
{
    WebInspector.VBox.call(this, true);
    this.registerRequiredCSS("network/networkConfigView.css");
    this.contentElement.classList.add("network-config");

    this._createCacheSection();
    this.contentElement.createChild("div").classList.add("panel-section-separator");
    this._createNetworkThrottlingSection();
    this.contentElement.createChild("div").classList.add("panel-section-separator");
    this._createUserAgentSection();
}

WebInspector.NetworkConfigView.prototype = {
    /**
     * @param {string} title
     * @param {string=} className
     * @return {!Element}
     */
    _createSection: function(title, className)
    {
        var section = this.contentElement.createChild("section", "network-config-group");
        if (className)
            section.classList.add(className);
        section.createChild("div", "network-config-title").textContent = title;
        return section.createChild("div", "network-config-fields");
    },

    _createCacheSection: function()
    {
        var section = this._createSection(WebInspector.UIString("Caching"), "network-config-disable-cache");
        section.appendChild(WebInspector.SettingsUI.createSettingCheckbox(WebInspector.UIString("Disable cache"), WebInspector.moduleSetting("cacheDisabled"), true));
    },

    _createNetworkThrottlingSection: function()
    {
        var section = this._createSection(WebInspector.UIString("Network throttling"), "network-config-throttling");
        WebInspector.NetworkConditionsSelector.decorateSelect(/** @type {!HTMLSelectElement} */(section.createChild("select", "chrome-select")));
    },

    _createUserAgentSection: function()
    {
        var section = this._createSection(WebInspector.UIString("User agent"), "network-config-ua");
        var checkboxLabel = createCheckboxLabel(WebInspector.UIString("Select automatically"), true);
        section.appendChild(checkboxLabel);
        this._autoCheckbox = checkboxLabel.checkboxElement;
        this._autoCheckbox.addEventListener("change", this._userAgentTypeChanged.bind(this));

        this._customUserAgentSetting = WebInspector.settings.createSetting("customUserAgent", "");
        this._customUserAgentSetting.addChangeListener(this._customUserAgentChanged, this);

        this._customUserAgent = section.createChild("div", "network-config-ua-custom");
        this._customSelectAndInput = WebInspector.NetworkConfigView.createUserAgentSelectAndInput();
        this._customSelectAndInput.select.classList.add("chrome-select");
        this._customUserAgent.appendChild(this._customSelectAndInput.select);
        this._customUserAgent.appendChild(this._customSelectAndInput.input);
        this._userAgentTypeChanged();
    },

    _customUserAgentChanged: function()
    {
        if (this._autoCheckbox.checked)
            return;
        WebInspector.multitargetNetworkManager.setCustomUserAgentOverride(this._customUserAgentSetting.get());
    },

    _userAgentTypeChanged: function()
    {
        var useCustomUA = !this._autoCheckbox.checked;
        this._customUserAgent.classList.toggle("checked", useCustomUA);
        this._customSelectAndInput.select.disabled = !useCustomUA;
        this._customSelectAndInput.input.disabled = !useCustomUA;
        var customUA = useCustomUA ? this._customUserAgentSetting.get() : "";
        WebInspector.multitargetNetworkManager.setCustomUserAgentOverride(customUA);
    },

    __proto__ : WebInspector.VBox.prototype
}


/**
 * @return {{select: !Element, input: !Element}}
 */
WebInspector.NetworkConfigView.createUserAgentSelectAndInput = function()
{
    var userAgentSetting = WebInspector.settings.createSetting("customUserAgent", "");
    var userAgentSelectElement = createElement("select");

    const customOverride = {title: WebInspector.UIString("Custom..."), value: "custom"};
    userAgentSelectElement.appendChild(new Option(customOverride.title, customOverride.value));

    var groups = WebInspector.NetworkConfigView._userAgentGroups;
    for (var userAgentDescriptor of WebInspector.NetworkConfigView._userAgentGroups) {
        var groupElement = userAgentSelectElement.createChild("optgroup");
        groupElement.label = userAgentDescriptor.title;
        for (var userAgentVersion of userAgentDescriptor.values)
            groupElement.appendChild(new Option(userAgentVersion.title, userAgentVersion.value));
    }

    userAgentSelectElement.selectedIndex = 0;

    var otherUserAgentElement = createElement("input");
    otherUserAgentElement.type = "text";
    otherUserAgentElement.value = userAgentSetting.get();
    otherUserAgentElement.title = userAgentSetting.get();

    settingChanged();
    userAgentSelectElement.addEventListener("change", userAgentSelected, false);

    otherUserAgentElement.addEventListener("dblclick", textDoubleClicked, true);
    otherUserAgentElement.addEventListener("blur", textChanged, false);
    otherUserAgentElement.addEventListener("keydown", textKeyDown, false);

    function userAgentSelected()
    {
        var value = userAgentSelectElement.options[userAgentSelectElement.selectedIndex].value;
        if (value !== customOverride.value) {
            userAgentSetting.set(value);
            otherUserAgentElement.value = value;
            otherUserAgentElement.title = value;
            otherUserAgentElement.readOnly = true;
        } else {
            otherUserAgentElement.readOnly = false;
            otherUserAgentElement.value = "";
            otherUserAgentElement.focus();
        }
    }

    function settingChanged()
    {
        var value = userAgentSetting.get();
        var options = userAgentSelectElement.options;
        var selectionRestored = false;
        for (var i = 0; i < options.length; ++i) {
            if (options[i].value === value) {
                userAgentSelectElement.selectedIndex = i;
                selectionRestored = true;
                break;
            }
        }

        otherUserAgentElement.readOnly = selectionRestored;
        if (!selectionRestored)
            userAgentSelectElement.selectedIndex = 0;

        if (otherUserAgentElement.value !== value) {
            otherUserAgentElement.value = value;
            otherUserAgentElement.title = value;
        }
    }

    function textKeyDown(event)
    {
        if (isEnterKey(event))
            textChanged();
    }

    function textDoubleClicked()
    {
        if (userAgentSelectElement.selectedIndex === 0)
            return;
        userAgentSelectElement.selectedIndex = 0;
        userAgentSelected();
    }

    function textChanged()
    {
        if (userAgentSetting.get() !== otherUserAgentElement.value) {
            userAgentSetting.set(otherUserAgentElement.value);
            settingChanged();
        }
    }

    return { select: userAgentSelectElement, input: otherUserAgentElement };
}


/** @type {!Array.<{title: string, value: !Array.<{title: string, value: string}>}>} */
WebInspector.NetworkConfigView._userAgentGroups = [
    {
        title: "Android",
        values: [
            {title: "Android (4.0.2) Browser \u2014 Galaxy Nexus", value: "Mozilla/5.0 (Linux; U; Android 4.0.2; en-us; Galaxy Nexus Build/ICL53F) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30"},
            {title: "Android (2.3) Browser \u2014 Nexus S", value: "Mozilla/5.0 (Linux; U; Android 2.3.6; en-us; Nexus S Build/GRK39F) AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0 Mobile Safari/533.1"}
        ]
    },
    {
        title: "BlackBerry",
        values: [
            {title: "BlackBerry \u2014 BB10", value: "Mozilla/5.0 (BB10; Touch) AppleWebKit/537.1+ (KHTML, like Gecko) Version/10.0.0.1337 Mobile Safari/537.1+"},
            {title: "BlackBerry \u2014 PlayBook 2.1", value: "Mozilla/5.0 (PlayBook; U; RIM Tablet OS 2.1.0; en-US) AppleWebKit/536.2+ (KHTML, like Gecko) Version/7.2.1.0 Safari/536.2+"},
            {title: "BlackBerry \u2014 9900", value: "Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+"}
        ]
    },
    {
        title: "Chrome",
        values: [
            {title: "Chrome 47 \u2014 Mac", value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.80 Safari/537.36"},
            {title: "Chrome 47 \u2014 Windows", value: "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.73 Safari/537.36"},
            {title: "Chrome 47 \u2014 Android Tablet", value: "Mozilla/5.0 (Linux; Android 4.3; Nexus 7 Build/JSS15Q) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.76 Safari/537.36"},
            {title: "Chrome 47 \u2014 Android Mobile", value: "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.76 Mobile Safari/537.36"},
            {title: "Chrome 47 \u2014 iPad", value: "Mozilla/5.0 (iPad; CPU OS 9_1 like Mac OS X) AppleWebKit/601.1 (KHTML, like Gecko) CriOS/47.0.2526.70 Mobile/13B143 Safari/601.1.46"},
            {title: "Chrome 47 \u2014 iPhone", value: "Mozilla/5.0 (iPhone; CPU iPhone OS 9_1 like Mac OS X) AppleWebKit/601.1 (KHTML, like Gecko) CriOS/47.0.2526.70 Mobile/13B143 Safari/601.1.46"}
        ]
    },
    {
        title: "Firefox",
        values: [
            {title: "Firefox 42 \u2014 Android Mobile", value: "Mozilla/5.0 (Android 4.4; Mobile; rv:42.0) Gecko/42.0 Firefox/42.0"},
            {title: "Firefox 42 \u2014 Android Tablet", value: "Mozilla/5.0 (Android 4.4; Tablet; rv:42.0) Gecko/42.0 Firefox/42.0"},
            {title: "Firefox 42 \u2014 Mac", value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.11; rv:42.0) Gecko/20100101 Firefox/42.0"},
            {title: "Firefox 42 \u2014 Windows", value: "Mozilla/5.0 (Windows NT 10.0; WOW64; rv:42.0) Gecko/20100101 Firefox/42.0"}
        ]
    },
    {
        title: "Googlebot",
        values: [
            {title: "Googlebot", value: "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"},
            {title: "Googlebot Smartphone", value: "Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2272.96 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"}
        ]
    },
    {
        title: "Edge",
        values: [
            {title: "Microsoft Edge", value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.135 Safari/537.36 Edge/12.10240"}
        ]
    },
    {
        title: "Internet Explorer",
        values: [
            {title: "Internet Explorer 11", value: "Mozilla/5.0 (Windows NT 10.0; WOW64; Trident/7.0; rv:11.0) like Gecko"},
            {title: "Internet Explorer 10", value: "Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.1; WOW64; Trident/6.0)"},
            {title: "Internet Explorer 8", value: "Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 6.0; Trident/4.0)"},
            {title: "Internet Explorer 9", value: "Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; Trident/5.0)"},
            {title: "Internet Explorer 7", value: "Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 6.0)"}
        ]
    },
    {
        title: "Safari",
        values: [
            {title: "iPad \u2014 iOS 9", value: "Mozilla/5.0 (iPad; CPU OS 9_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13B137 Safari/601.1"},
            {title: "iPhone \u2014 iOS 9", value: "Mozilla/5.0 (iPhone; CPU iPhone OS 9_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13B137 Safari/601.1"}
        ]
    },
    {
        title: "MeeGo",
        values: [
            {title: "MeeGo \u2014 Nokia N9", value: "Mozilla/5.0 (MeeGo; NokiaN9) AppleWebKit/534.13 (KHTML, like Gecko) NokiaBrowser/8.5.0 Mobile Safari/534.13"}
        ]
    },
    {
        title: "Opera",
        values: [
            {title: "Opera 33 \u2014 Mac", value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.2490.86 Safari/537.36 OPR/33.0.1990.115"},
            {title: "Opera 33 \u2014 Windows", value: "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.2490.71 Safari/537.36 OPR/33.0.1990.43"},
            {title: "Opera 12 \u2014 Mac", value: "Opera/9.80 (Macintosh; Intel Mac OS X 10.9.1) Presto/2.12.388 Version/12.16"},
            {title: "Opera 12 \u2014 Windows", value: "Opera/9.80 (Windows NT 6.1) Presto/2.12.388 Version/12.16"}
        ]
    },
    {
        title: "Silk",
        values: [
            {title: "Silk \u2014 Kindle Fire (Desktop view)", value: "Mozilla/5.0 (Linux; U; en-us; KFTHWI Build/JDQ39) AppleWebKit/535.19 (KHTML, like Gecko) Silk/3.13 Safari/535.19 Silk-Accelerated=true"},
            {title: "Silk \u2014 Kindle Fire (Mobile view)", value: "Mozilla/5.0 (Linux; U; Android 4.2.2; en-us; KFTHWI Build/JDQ39) AppleWebKit/535.19 (KHTML, like Gecko) Silk/3.13 Mobile Safari/535.19 Silk-Accelerated=true"}
        ]
    }
]

/**
 * @constructor
 * @implements {WebInspector.ActionDelegate}
 */
WebInspector.NetworkConfigView.ShowActionDelegate = function()
{
}

WebInspector.NetworkConfigView.ShowActionDelegate.prototype = {
    /**
     * @override
     * @param {!WebInspector.Context} context
     * @param {string} actionId
     * @return {boolean}
     */
    handleAction: function(context, actionId)
    {
        WebInspector.inspectorView.showViewInDrawer("network.config");
        return true;
    }
}
