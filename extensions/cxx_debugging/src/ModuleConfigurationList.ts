// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/check_component_naming, rulesdir/no_underscored_properties, rulesdir/ban_style_tags_in_lit_html, rulesdir/ban_a_tags_in_lit_html, rulesdir/lit_html_host_this,  @typescript-eslint/naming-convention,  @typescript-eslint/explicit-function-return-type,  @typescript-eslint/no-unused-vars */

import {html, nothing, render} from 'lit-html';

import {
  DEFAULT_MODULE_CONFIGURATIONS,
  type ModuleConfiguration,
  type ModuleConfigurations,
  type PathSubstitution,
} from './ModuleConfiguration.js';

export type ModuleConfigurationListData = {
  moduleConfigurations: ModuleConfigurations,
};

export class ModuleConfigurationsChangedEvent extends CustomEvent<ModuleConfigurationListData> {
  constructor(detail: ModuleConfigurationListData) {
    super('module-configurations-changed', {detail});
  }
}

export class ModuleConfigurationList extends HTMLElement {
  private readonly _shadow = this.attachShadow({mode: 'open'});
  private _moduleConfigurations: ModuleConfigurations = DEFAULT_MODULE_CONFIGURATIONS;

  constructor() {
    super();
    this._render();
  }

  get data(): ModuleConfigurationListData {
    return {moduleConfigurations: this._moduleConfigurations};
  }

  set data({moduleConfigurations}: ModuleConfigurationListData) {
    this._moduleConfigurations = moduleConfigurations;
    this._render();
  }

  private _setModuleConfigurations(moduleConfigurations: ModuleConfigurations) {
    this._moduleConfigurations = moduleConfigurations;
    this._render();
    this.dispatchEvent(new ModuleConfigurationsChangedEvent({moduleConfigurations}));
  }

  private _addModuleConfiguration(event: Event) {
    this._setModuleConfigurations(this._moduleConfigurations.concat([{name: '', pathSubstitutions: []}]));
    const {target} = event;
    if (target instanceof HTMLButtonElement) {
      const moduleInputs = target.parentElement?.querySelectorAll('input');
      const element = moduleInputs ? moduleInputs[moduleInputs.length - 1] : undefined;
      if (element instanceof HTMLInputElement) {
        element.focus();
      }
    }
  }

  private _removeModuleConfiguration(moduleConfiguration: ModuleConfiguration, event: Event) {
    this._setModuleConfigurations(this._moduleConfigurations.filter(m => m !== moduleConfiguration));
  }

  private _updateModuleConfiguration(mc: ModuleConfiguration, fn: (mc: ModuleConfiguration) => ModuleConfiguration) {
    this._setModuleConfigurations(this._moduleConfigurations.map(
        moduleConfiguration => moduleConfiguration === mc ? fn(moduleConfiguration) : moduleConfiguration));
  }

  private _updateModuleConfigurationName(mc: ModuleConfiguration, event: Event) {
    const name = (event.target as HTMLInputElement).value;
    this._updateModuleConfiguration(mc, mc => ({...mc, name}));
  }

  private _addPathSubstitution(mc: ModuleConfiguration, event: Event) {
    this._updateModuleConfiguration(
        mc, mc => ({...mc, pathSubstitutions: mc.pathSubstitutions.concat([{from: '', to: ''}])}));
    const {target} = event;
    if (target instanceof HTMLButtonElement) {
      const prev = target.parentElement?.previousElementSibling?.firstElementChild;
      if (prev instanceof HTMLInputElement) {
        prev.focus();
      }
    }
  }

  private _removePathSubstitution(mc: ModuleConfiguration, sm: PathSubstitution, event: Event) {
    this._updateModuleConfiguration(mc, mc => ({...mc, pathSubstitutions: mc.pathSubstitutions.filter(s => s !== sm)}));
  }

  private _updatePathSubstitutionFrom(mc: ModuleConfiguration, sm: PathSubstitution, event: Event) {
    const from = (event.target as HTMLInputElement).value;
    this._updateModuleConfiguration(
        mc, mc => ({...mc, pathSubstitutions: mc.pathSubstitutions.map(s => s === sm ? {...sm, from} : s)}));
  }

  private _updatePathSubstitutionTo(mc: ModuleConfiguration, sm: PathSubstitution, event: Event) {
    const to = (event.target as HTMLInputElement).value;
    this._updateModuleConfiguration(
        mc, mc => ({...mc, pathSubstitutions: mc.pathSubstitutions.map(s => s === sm ? {...sm, to} : s)}));
  }

  private _render() {
    const output = html`
    <style>
      .mc-list {
        display: grid;
        grid-template-columns: 2fr 6fr auto;
        gap: 10px;
        padding: 10px;
        border-radius: 4px;
        border: 1px solid lightgrey;
      }
      .mc-list label {
        font-weight: 600;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .mc-separator {
        margin: 0px;
        grid-column-end: span 3;
        border-bottom: 1px solid lightgrey;
      }
      .sm {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .sm-item {
        display: flex;
        flex-direction: row;
        gap: 10px;
      }
      .icon-button {
        border: none;
        border-radius: 0;
        cursor: pointer;
        display: inline-block;
        mask-size: contain;
        width: 20px;
        height: 20px;
        background-color: rgb(110 110 110);
        color: #5a5a5a;
      }
      .icon-button:hover {
        background-color: #333;
      }
      .icon-button:focus {
        background-color: #333;
      }
      .mc-delete {
        mask-image: url("data:image/svg+xml,%0A%3Csvg xmlns='http://www.w3.org/2000/svg' height='24px' viewBox='0 0 24 24' width='24px' fill='%23000000'%3E%3Cpath d='M0 0h24v24H0V0z' fill='none'/%3E%3Cpath d='M15 4V3H9v1H4v2h1v13c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V6h1V4h-5zm2 15H7V6h10v13zM9 8h2v9H9zm4 0h2v9h-2z'/%3E%3C/svg%3E");
        width: 32px;
        height: 32px;
      }
      .sm-delete {
        mask-image: url('data:image/svg+xml,%0A%3Csvg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="%23000000"%3E%3Cpath d="M0 0h24v24H0V0z" fill="none"/%3E%3Cpath d="M7 11v2h10v-2H7zm5-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/%3E%3C/svg%3E');
      }
    </style>
    <p>
      The debug information encoded in the <code>.wasm</code> binaries references source files via
      paths that usually only make sense on the build machine, but you might need to debug them on
      different machine (i.e. build was created by CI bot). If that's the case, you can specify
      path substitutions below that replace certain parts of the paths and tell Chrome DevTools to
      look somewhere else for the source file in question. This is the equivalent to GDB's
      <a href="https://sourceware.org/gdb/current/onlinedocs/gdb/Source-Path.html#set-substitute_002dpath"><code>set substitute-path</code></a>
      and LLDB's <code>set target.source-map <i>old</i> <i>new</i></code> feature, which you might
      already be familiar with.
    </p>
    <p>
      Below you can specify path substitutions on a per <code>.wasm</code> module level (or just
      specify default settings that will be used when no module matches the name). The following
      wildcard patterns are supported for the module name:
      <ul>
        <li>A <code>*</code> in the pattern matches any sequence of characters, except for slashes (<code>/</code>).</li>
        <li>A <code>**/</code> in the pattern matches any sequence of characters, including slashes (<code>/</code>).</li>
      </ul>
      If the pattern contains a slash (<code>/</code>) the full URL will be tested against the pattern,
      while if the pattern doesn't contain any slashes, only the basename of the URL's path will be tested.
      For example, say you specify <code>foo*.wasm</code> as pattern, then it will successfully match
      <code>http://localhost/foo1.wasm</code>, but not <code>http://foo.wasm/file.wasm</code>.
    </p>
    <div class=mc-list>
      ${
        this._moduleConfigurations.map(
            mc => html`
        <label>
          ${
                mc.name !== undefined ? html`Module
                 <input
                   placeholder="filename.wasm"
                   .value=${mc.name}
                   @input=${this._updateModuleConfigurationName.bind(this, mc)}>
                 ` :
                                        html`Default settings`}
        </label>
        <div class=sm>
          <label>Path substitutions</label>
          ${
                mc.pathSubstitutions.map(
                    sm => html`
          <div class=sm-item>
            <input
              placeholder="/old/path"
              value=${sm.from}
              @input=${this._updatePathSubstitutionFrom.bind(this, mc, sm)}>
            <input
              placeholder="/new/path"
              value=${sm.to}
              @input=${this._updatePathSubstitutionTo.bind(this, mc, sm)}>
            <button class="icon-button sm-delete" @click=${
                        this._removePathSubstitution.bind(this, mc, sm)} title="Remove path substitution"></button>
          </div>
          `)}
          <div><button @click=${this._addPathSubstitution.bind(this, mc)}>Add path substitution</button></div>
        </div>
        <div>${
                mc.name === undefined ?
                    nothing :
                    html`<button class="icon-button mc-delete" @click=${
                        this._removeModuleConfiguration.bind(this, mc)} title="Remove module"></button>`}</div>
        <div class=mc-separator></div>
        `)}
      <button style="margin: 10px" @click=${this._addModuleConfiguration}>Add module settings</button>
    </div>
    `;
    render(output, this._shadow, {eventContext: this});
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'devtools-cxx-debugging-module-configuration-list': ModuleConfigurationList;
  }
}

customElements.define('devtools-cxx-debugging-module-configuration-list', ModuleConfigurationList);
