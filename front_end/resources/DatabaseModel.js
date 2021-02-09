/*
 * Copyright (C) 2007, 2008 Apple Inc.  All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * 1.  Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 * 2.  Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 * 3.  Neither the name of Apple Computer, Inc. ("Apple") nor the names of
 *     its contributors may be used to endorse or promote products derived
 *     from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import * as i18n from '../i18n/i18n.js';
import * as SDK from '../sdk/sdk.js';

export const UIStrings = {
  /**
  *@description Message in Database Model of the Application panel
  */
  databaseNoLongerHasExpected: 'Database no longer has expected version.',
  /**
  *@description Message in Database Model of the Application panel
  *@example {-197} PH1
  */
  anUnexpectedErrorSOccurred: 'An unexpected error {PH1} occurred.',
};
const str_ = i18n.i18n.registerUIStrings('resources/DatabaseModel.js', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class Database {
  /**
   * @param {!DatabaseModel} model
   * @param {string} id
   * @param {string} domain
   * @param {string} name
   * @param {string} version
   */
  constructor(model, id, domain, name, version) {
    this._model = model;
    this._id = id;
    this._domain = domain;
    this._name = name;
    this._version = version;
  }

  /** @return {string} */
  get id() {
    return this._id;
  }

  /** @return {string} */
  get name() {
    return this._name;
  }

  /** @param {string} x */
  set name(x) {
    this._name = x;
  }

  /** @return {string} */
  get version() {
    return this._version;
  }

  /** @param {string} x */
  set version(x) {
    this._version = x;
  }

  /** @return {string} */
  get domain() {
    return this._domain;
  }

  /** @param {string} x */
  set domain(x) {
    this._domain = x;
  }

  /**
   * @return {!Promise<!Array<string>>}
   */
  async tableNames() {
    const {tableNames} = await this._model._agent.invoke_getDatabaseTableNames({databaseId: this._id}) || [];
    return tableNames.sort();
  }

  /**
   * @param {string} query
   * @param {function(!Array.<string>, !Array.<*>):void} onSuccess
   * @param {function(string):void} onError
   */
  async executeSql(query, onSuccess, onError) {
    const response = await this._model._agent.invoke_executeSQL({'databaseId': this._id, 'query': query});
    const error = response.getError() || null;
    if (error) {
      onError(error);
      return;
    }
    const sqlError = response.sqlError;
    if (!sqlError) {
      // We know from the back-end that if there is no error, neither columnNames nor values can be undefined.
      onSuccess(response.columnNames || [], response.values || []);
      return;
    }
    let message;
    if (sqlError.message) {
      message = sqlError.message;
    } else if (sqlError.code === 2) {
      message = i18nString(UIStrings.databaseNoLongerHasExpected);
    } else {
      message = i18nString(UIStrings.anUnexpectedErrorSOccurred, {PH1: sqlError.code});
    }
    onError(message);
  }
}

export class DatabaseModel extends SDK.SDKModel.SDKModel {
  /**
   * @param {!SDK.SDKModel.Target} target
   */
  constructor(target) {
    super(target);

    /** @type {!Array<!Database>} */
    this._databases = [];
    this._agent = target.databaseAgent();
    this.target().registerDatabaseDispatcher(new DatabaseDispatcher(this));
  }

  enable() {
    if (this._enabled) {
      return;
    }
    this._agent.invoke_enable();
    this._enabled = true;
  }

  disable() {
    if (!this._enabled) {
      return;
    }
    this._enabled = false;
    this._databases = [];
    this._agent.invoke_disable();
    this.dispatchEventToListeners(Events.DatabasesRemoved);
  }

  /**
   * @return {!Array.<!Database>}
   */
  databases() {
    const result = [];
    for (const database of this._databases) {
      result.push(database);
    }
    return result;
  }

  /**
   * @param {!Database} database
   */
  _addDatabase(database) {
    this._databases.push(database);
    this.dispatchEventToListeners(Events.DatabaseAdded, database);
  }
}

SDK.SDKModel.SDKModel.register(DatabaseModel, SDK.SDKModel.Capability.DOM, false);

/** @enum {symbol} */
export const Events = {
  DatabaseAdded: Symbol('DatabaseAdded'),
  DatabasesRemoved: Symbol('DatabasesRemoved'),
};

/**
 * @implements {ProtocolProxyApi.DatabaseDispatcher}
 */
export class DatabaseDispatcher {
  /**
   * @param {!DatabaseModel} model
   */
  constructor(model) {
    this._model = model;
  }

  /**
   * @override
   * @param {!Protocol.Database.AddDatabaseEvent} event
   */
  addDatabase({database}) {
    this._model._addDatabase(new Database(this._model, database.id, database.domain, database.name, database.version));
  }
}
