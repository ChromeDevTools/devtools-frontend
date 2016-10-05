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
};

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
};


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
    for (var userAgentDescriptor of groups) {
        var groupElement = userAgentSelectElement.createChild("optgroup");
        groupElement.label = userAgentDescriptor.title;
        for (var userAgentVersion of userAgentDescriptor.values) {
            var userAgentValue = WebInspector.MultitargetNetworkManager.patchUserAgentWithChromeVersion(userAgentVersion.value);
            groupElement.appendChild(new Option(userAgentVersion.title, userAgentValue));
        }
    }

    userAgentSelectElement.selectedIndex = 0;

    var otherUserAgentElement = createElement("input");
    otherUserAgentElement.type = "text";
    otherUserAgentElement.value = userAgentSetting.get();
    otherUserAgentElement.title = userAgentSetting.get();
    otherUserAgentElement.placeholder = WebInspector.UIString("Enter a custom user agent");
    otherUserAgentElement.required = true;

    settingChanged();
    userAgentSelectElement.addEventListener("change", userAgentSelected, false);
    otherUserAgentElement.addEventListener("input", applyOtherUserAgent, false);

    function userAgentSelected()
    {
        var value = userAgentSelectElement.options[userAgentSelectElement.selectedIndex].value;
        if (value !== customOverride.value) {
            userAgentSetting.set(value);
            otherUserAgentElement.value = value;
            otherUserAgentElement.title = value;
        } else {
            otherUserAgentElement.select();
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

        if (!selectionRestored)
            userAgentSelectElement.selectedIndex = 0;
    }

    function applyOtherUserAgent()
    {
        if (userAgentSetting.get() !== otherUserAgentElement.value) {
            userAgentSetting.set(otherUserAgentElement.value);
            otherUserAgentElement.title = otherUserAgentElement.value;
            settingChanged();
        }
    }

    return { select: userAgentSelectElement, input: otherUserAgentElement };
};

/** @type {!Array.<{title: string, values: !Array.<{title: string, value: string}>}>} */
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
            {title: "Chrome \u2014 Android Mobile", value: "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Mobile Safari/537.36"},
            {title: "Chrome \u2014 Android Tablet", value: "Mozilla/5.0 (Linux; Android 4.3; Nexus 7 Build/JSS15Q) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Safari/537.36"},
            {title: "Chrome \u2014 iPhone", value: "Mozilla/5.0 (iPhone; CPU iPhone OS 9_1 like Mac OS X) AppleWebKit/601.1 (KHTML, like Gecko) CriOS/%s Mobile/13B143 Safari/601.1.46"},
            {title: "Chrome \u2014 iPad", value: "Mozilla/5.0 (iPad; CPU OS 9_1 like Mac OS X) AppleWebKit/601.1 (KHTML, like Gecko) CriOS/%s Mobile/13B143 Safari/601.1.46"},
            {title: "Chrome \u2014 Mac", value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Safari/537.36"},
            {title: "Chrome \u2014 Windows", value: "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Safari/537.36"}
        ]
    },
    {
        title: "Edge",
        values: [
            {title: "Edge \u2014 Windows", value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.135 Safari/537.36 Edge/12.10240"},
            {title: "Edge \u2014 Mobile", value: "Mozilla/5.0 (Windows Phone 10.0; Android 4.2.1; Microsoft; Lumia 640 XL LTE) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.135 Mobile Safari/537.36 Edge/12.10166"},
            {title: "Edge \u2014 XBox", value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; Xbox; Xbox One) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.135 Safari/537.36 Edge/13.10586"}
        ]
    },
    {
        title: "Firefox",
        values: [
            {title: "Firefox \u2014 Android Mobile", value: "Mozilla/5.0 (Android 4.4; Mobile; rv:46.0) Gecko/46.0 Firefox/46.0"},
            {title: "Firefox \u2014 Android Tablet", value: "Mozilla/5.0 (Android 4.4; Tablet; rv:46.0) Gecko/46.0 Firefox/46.0"},
            {title: "Firefox \u2014 iPhone", value: "Mozilla/5.0 (iPhone; CPU iPhone OS 8_3 like Mac OS X) AppleWebKit/600.1.4 (KHTML, like Gecko) FxiOS/1.0 Mobile/12F69 Safari/600.1.4"},
            {title: "Firefox \u2014 iPad", value: "Mozilla/5.0 (iPad; CPU iPhone OS 8_3 like Mac OS X) AppleWebKit/600.1.4 (KHTML, like Gecko) FxiOS/1.0 Mobile/12F69 Safari/600.1.4"},
            {title: "Firefox \u2014 Mac", value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.11; rv:46.0) Gecko/20100101 Firefox/46.0"},
            {title: "Firefox \u2014 Windows", value: "Mozilla/5.0 (Windows NT 10.0; WOW64; rv:46.0) Gecko/20100101 Firefox/46.0"}
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
        title: "Internet Explorer",
        values: [
            {title: "Internet Explorer 11", value: "Mozilla/5.0 (Windows NT 10.0; WOW64; Trident/7.0; rv:11.0) like Gecko"},
            {title: "Internet Explorer 10", value: "Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.1; WOW64; Trident/6.0)"},
            {title: "Internet Explorer 9", value: "Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; Trident/5.0)"},
            {title: "Internet Explorer 8", value: "Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 6.0; Trident/4.0)"},
            {title: "Internet Explorer 7", value: "Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 6.0)"}
        ]
    },
    {
        title: "Opera",
        values: [
            {title: "Opera \u2014 Mac", value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.87 Safari/537.36 OPR/37.0.2178.31"},
            {title: "Opera \u2014 Windows", value: "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.87 Safari/537.36 OPR/37.0.2178.31"},
            {title: "Opera (Presto) \u2014 Mac", value: "Opera/9.80 (Macintosh; Intel Mac OS X 10.9.1) Presto/2.12.388 Version/12.16"},
            {title: "Opera (Presto) \u2014 Windows", value: "Opera/9.80 (Windows NT 6.1) Presto/2.12.388 Version/12.16"},
            {title: "Opera Mobile \u2014 Android Mobile", value: "Opera/12.02 (Android 4.1; Linux; Opera Mobi/ADR-1111101157; U; en-US) Presto/2.9.201 Version/12.02"},
            {title: "Opera Mini \u2014 iOS", value: "Opera/9.80 (iPhone; Opera Mini/8.0.0/34.2336; U; en) Presto/2.8.119 Version/11.10"}
        ]
    },
    {
        title: "Safari",
        values: [
            {title: "Safari \u2014 iPad iOS 9", value: "Mozilla/5.0 (iPad; CPU OS 9_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13B137 Safari/601.1"},
            {title: "Safari \u2014 iPhone iOS 9", value: "Mozilla/5.0 (iPhone; CPU iPhone OS 9_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13B137 Safari/601.1"},
            {title: "Safari \u2014 Mac", value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_3) AppleWebKit/537.75.14 (KHTML, like Gecko) Version/7.0.3 Safari/7046A194A"}
        ]
    },
    {
        title: "UC Browser",
        values: [
            {title: "UC Browser \u2014 Android Mobile", value: "Mozilla/5.0 (Linux; U; Android 4.4.4; en-US; XT1022 Build/KXC21.5-40) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 UCBrowser/10.7.0.636 U3/0.8.0 Mobile Safari/534.30"},
            {title: "UC Browser \u2014 iOS", value: "UCWEB/2.0 (iPad; U; CPU OS 7_1 like Mac OS X; en; iPad3,6) U2/1.0.0 UCBrowser/9.3.1.344"},
            {title: "UC Browser \u2014 Windows Phone", value: "NokiaX2-02/2.0 (11.79) Profile/MIDP-2.1 Configuration/CLDC-1.1 Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 6.1; Trident/4.0; SLCC2;.NET CLR 2.0.50727; .NET CLR 3.5.30729; .NET CLR 3.0.30729; Media Center PC 6.0; InfoPath.2) UCBrowser8.4.0.159/70/352"}
        ]
    }
];
