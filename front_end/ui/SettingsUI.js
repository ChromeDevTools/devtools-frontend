/*
 * Copyright (C) 2014 Google Inc. All rights reserved.
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

WebInspector.SettingsUI = {}

/**
 * @param {string} name
 * @param {!WebInspector.Setting} setting
 * @param {boolean=} omitParagraphElement
 * @param {string=} tooltip
 * @return {!Element}
 */
WebInspector.SettingsUI.createSettingCheckbox = function(name, setting, omitParagraphElement, tooltip)
{
    var label = createCheckboxLabel(name);
    if (tooltip)
        label.title = tooltip;

    var input = label.checkboxElement;
    input.name = name;
    WebInspector.SettingsUI.bindCheckbox(input, setting);

    if (omitParagraphElement)
        return label;

    var p = createElement("p");
    p.appendChild(label);
    return p;
}

/**
 * @param {!Element} input
 * @param {!WebInspector.Setting} setting
 */
WebInspector.SettingsUI.bindCheckbox = function(input, setting)
{
    function settingChanged()
    {
        if (input.checked !== setting.get())
            input.checked = setting.get();
    }
    setting.addChangeListener(settingChanged);
    settingChanged();

    function inputChanged()
    {
        if (setting.get() !== input.checked)
            setting.set(input.checked);
    }
    input.addEventListener("change", inputChanged, false);
}

/**
 * @param {string} name
 * @param {!Element} element
 * @return {!Element}
 */
WebInspector.SettingsUI.createCustomSetting = function(name, element)
{
    var p = createElement("p");
    var fieldsetElement = p.createChild("fieldset");
    fieldsetElement.createChild("label").textContent = name;
    fieldsetElement.appendChild(element);
    return p;
}

/**
 * @param {!WebInspector.Setting} setting
 * @return {!Element}
 */
WebInspector.SettingsUI.createSettingFieldset = function(setting)
{
    var fieldset = createElement("fieldset");
    fieldset.disabled = !setting.get();
    setting.addChangeListener(settingChanged);
    return fieldset;

    function settingChanged()
    {
        fieldset.disabled = !setting.get();
    }
}

/**
 * Creates an input element under the parentElement with the given id and defaultText.
 * @param {!Element} parentElement
 * @param {string} id
 * @param {string} defaultText
 * @param {function(*)} eventListener
 * @param {boolean=} numeric
 * @param {string=} size
 * @return {!Element} element
 */
WebInspector.SettingsUI.createInput = function(parentElement, id, defaultText, eventListener, numeric, size)
{
    var element = parentElement.createChild("input");
    element.id = id;
    element.type = "text";
    element.maxLength = 12;
    element.style.width = size || "80px";
    element.value = defaultText;
    element.align = "right";
    if (numeric)
        element.className = "numeric";
    element.addEventListener("input", eventListener, false);
    element.addEventListener("keydown", keyDownListener, false);
    function keyDownListener(event)
    {
        if (isEnterKey(event))
            eventListener(event);
    }
    return element;
}

/**
 * @interface
 */
WebInspector.SettingUI = function()
{
}

WebInspector.SettingUI.prototype = {
    /**
     * @return {?Element}
     */
    settingElement: function() { }
}
