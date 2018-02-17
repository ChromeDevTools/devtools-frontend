// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

UI.Fragment = class {
  /**
   * @param {!Element} element
   */
  constructor(element) {
    this._element = element;

    /** @type {!Map<string, !Array<!UI.Fragment._State>>} */
    this._states = new Map();

    /** @type {!Map<string, !Element>} */
    this._elementsById = new Map();
  }

  /**
   * @return {!Element}
   */
  element() {
    return this._element;
  }

  /**
   * @param {string} elementId
   * @return {!Element}
   */
  $(elementId) {
    return this._elementsById.get(elementId);
  }

  /**
   * @param {string} name
   * @param {boolean} toggled
   */
  setState(name, toggled) {
    const list = this._states.get(name);
    if (list === undefined) {
      console.error('Unknown state ' + name);
      return;
    }
    for (const state of list) {
      if (state.toggled === toggled)
        continue;
      state.toggled = toggled;
      const value = state.attributeValue;
      state.attributeValue = state.element.getAttribute(state.attributeName);
      if (value === null)
        state.element.removeAttribute(state.attributeName);
      else
        state.element.setAttribute(state.attributeName, value);
    }
  }

  /**
   * @param {!Array<string>} strings
   * @param {...*} vararg
   * @return {!UI.Fragment}
   */
  static build(strings, vararg) {
    const values = Array.prototype.slice.call(arguments, 1);
    return UI.Fragment._render(UI.Fragment._template(strings), values);
  }

  /**
   * @param {!Array<string>} strings
   * @param {...*} vararg
   * @return {!UI.Fragment}
   */
  static cached(strings, vararg) {
    const values = Array.prototype.slice.call(arguments, 1);
    let template = UI.Fragment._templateCache.get(strings);
    if (!template) {
      template = UI.Fragment._template(strings);
      UI.Fragment._templateCache.set(strings, template);
    }
    return UI.Fragment._render(template, values);
  }

  /**
   * @param {!Array<string>} strings
   * @return {!UI.Fragment._Template}
   * @suppressGlobalPropertiesCheck
   */
  static _template(strings) {
    let html = '';
    let insideText = false;
    for (let i = 0; i < strings.length - 1; i++) {
      html += strings[i];
      const close = strings[i].lastIndexOf('>');
      if (close !== -1) {
        if (strings[i].indexOf('<', close + 1) === -1)
          insideText = true;
        else
          insideText = false;
      }
      html += insideText ? UI.Fragment._textMarker : UI.Fragment._attributeMarker(i);
    }
    html += strings[strings.length - 1];

    const template = window.document.createElement('template');
    template.innerHTML = html;
    const walker = template.ownerDocument.createTreeWalker(
        template.content, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, null, false);
    let valueIndex = 0;
    const emptyTextNodes = [];
    const binds = [];
    const nodesToMark = [];
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (node.nodeType === Node.ELEMENT_NODE && node.hasAttributes()) {
        if (node.hasAttribute('$')) {
          nodesToMark.push(node);
          binds.push({elementId: node.getAttribute('$')});
          node.removeAttribute('$');
        }

        const attributesToRemove = [];
        for (let i = 0; i < node.attributes.length; i++) {
          let name = node.attributes[i].name;

          if (name.startsWith('s-')) {
            attributesToRemove.push(name);
            name = name.substring(2);
            const state = name.substring(0, name.indexOf('-'));
            const attr = name.substring(state.length + 1);
            nodesToMark.push(node);
            binds.push({state: {name: state, attribute: attr, value: node.attributes[i].value}});
            continue;
          }

          if (!UI.Fragment._attributeMarkerRegex.test(name) &&
              !UI.Fragment._attributeMarkerRegex.test(node.attributes[i].value))
            continue;

          attributesToRemove.push(name);
          nodesToMark.push(node);
          const bind = {attr: {index: valueIndex}};
          bind.attr.names = name.split(UI.Fragment._attributeMarkerRegex);
          valueIndex += bind.attr.names.length - 1;
          bind.attr.values = node.attributes[i].value.split(UI.Fragment._attributeMarkerRegex);
          valueIndex += bind.attr.values.length - 1;
          binds.push(bind);
        }
        for (let i = 0; i < attributesToRemove.length; i++)
          node.removeAttribute(attributesToRemove[i]);
      }

      if (node.nodeType === Node.TEXT_NODE && node.data.indexOf(UI.Fragment._textMarker) !== -1) {
        const texts = node.data.split(UI.Fragment._textMarkerRegex);
        node.data = texts[texts.length - 1];
        for (let i = 0; i < texts.length - 1; i++) {
          if (texts[i])
            node.parentNode.insertBefore(createTextNode(texts[i]), node);
          const nodeToReplace = createElement('span');
          nodesToMark.push(nodeToReplace);
          binds.push({replaceNodeIndex: valueIndex++});
          node.parentNode.insertBefore(nodeToReplace, node);
        }
      }

      if (node.nodeType === Node.TEXT_NODE &&
          (!node.previousSibling || node.previousSibling.nodeType === Node.ELEMENT_NODE) &&
          (!node.nextSibling || node.nextSibling.nodeType === Node.ELEMENT_NODE) && /^\s*$/.test(node.data))
        emptyTextNodes.push(node);
    }

    for (let i = 0; i < nodesToMark.length; i++)
      nodesToMark[i].classList.add(UI.Fragment._class(i));

    for (const emptyTextNode of emptyTextNodes)
      emptyTextNode.remove();
    return {template: template, binds: binds};
  }

  /**
   * @param {!UI.Fragment._Template} template
   * @param {!Array<*>} values
   * @return {!UI.Fragment}
   */
  static _render(template, values) {
    const content = template.template.ownerDocument.importNode(template.template.content, true);
    const resultElement =
        /** @type {!Element} */ (content.firstChild === content.lastChild ? content.firstChild : content);
    const result = new UI.Fragment(resultElement);

    const idByElement = new Map();
    const boundElements = [];
    for (let i = 0; i < template.binds.length; i++) {
      const className = UI.Fragment._class(i);
      const element = /** @type {!Element} */ (content.querySelector('.' + className));
      element.classList.remove(className);
      boundElements.push(element);
    }

    for (let bindIndex = 0; bindIndex < template.binds.length; bindIndex++) {
      const bind = template.binds[bindIndex];
      const element = boundElements[bindIndex];
      if ('elementId' in bind) {
        result._elementsById.set(/** @type {string} */ (bind.elementId), element);
        idByElement.set(element, bind.elementId);
      } else if ('replaceNodeIndex' in bind) {
        const value = values[/** @type {number} */ (bind.replaceNodeIndex)];
        let node = null;
        if (value instanceof Node)
          node = value;
        else if (value instanceof UI.Fragment)
          node = value._element;
        else
          node = createTextNode('' + value);

        element.parentNode.insertBefore(node, element);
        element.remove();
      } else if ('state' in bind) {
        const list = result._states.get(bind.state.name) || [];
        list.push(
            {attributeName: bind.state.attribute, attributeValue: bind.state.value, element: element, toggled: false});
        result._states.set(bind.state.name, list);
      } else if ('attr' in bind) {
        if (bind.attr.names.length === 2 && bind.attr.values.length === 1 &&
            typeof values[bind.attr.index] === 'function') {
          values[bind.attr.index].call(null, element);
        } else {
          let name = bind.attr.names[0];
          for (let i = 1; i < bind.attr.names.length; i++) {
            name += values[bind.attr.index + i - 1];
            name += bind.attr.names[i];
          }
          if (name) {
            let value = bind.attr.values[0];
            for (let i = 1; i < bind.attr.values.length; i++) {
              value += values[bind.attr.index + bind.attr.names.length - 1 + i - 1];
              value += bind.attr.values[i];
            }
            element.setAttribute(name, value);
          }
        }
      } else {
        throw 'Unexpected bind';
      }
    }

    // We do this after binds so that querySelector works.
    const shadows = result._element.querySelectorAll('x-shadow');
    for (const shadow of shadows) {
      if (!shadow.parentElement)
        throw 'There must be a parent element here';
      const shadowRoot = UI.createShadowRootWithCoreStyles(shadow.parentElement);
      if (shadow.parentElement.tagName === 'X-WIDGET')
        shadow.parentElement._shadowRoot = shadowRoot;
      const children = [];
      while (shadow.lastChild) {
        children.push(shadow.lastChild);
        shadow.lastChild.remove();
      }
      for (let i = children.length - 1; i >= 0; i--)
        shadowRoot.appendChild(children[i]);
      const id = idByElement.get(shadow);
      if (id)
        result._elementsById.set(id, /** @type {!Element} */ (/** @type {!Node} */ (shadowRoot)));
      shadow.remove();
    }

    return result;
  }
};

/**
 * @typedef {!{
 *   template: !Element,
 *   binds: !Array<!UI.Fragment._Bind>
 * }}
 */
UI.Fragment._Template;

/**
 * @typedef {!{
 *   attributeName: string,
 *   attributeValue: string,
 *   element: !Element,
 *   toggled: boolean
 * }}
 */
UI.Fragment._State;

/**
 * @typedef {!{
 *   elementId: (string|undefined),
 *
 *   state: (!{
 *     name: string,
 *     attribute: string,
 *     value: string
 *   }|undefined),
 *
 *   attr: (!{
 *     index: number,
 *     names: !Array<string>,
 *     values: !Array<string>
 *   }|undefined),
 *
 *   replaceNodeIndex: (number|undefined)
 * }}
 */
UI.Fragment._Bind;

UI.Fragment._textMarker = '{{template-text}}';
UI.Fragment._textMarkerRegex = /{{template-text}}/;

UI.Fragment._attributeMarker = index => 'template-attribute' + index;
UI.Fragment._attributeMarkerRegex = /template-attribute\d+/;

UI.Fragment._class = index => 'template-class-' + index;

UI.Fragment._templateCache = new Map();
