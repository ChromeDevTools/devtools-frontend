/*
 * Copyright (C) 2008 Apple Inc. All Rights Reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE INC. ``AS IS'' AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL APPLE INC. OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY
 * OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * @unrestricted
 */
Resources.DatabaseQueryView = class extends UI.VBox {
  constructor(database) {
    super();

    this.database = database;

    this.element.classList.add('storage-view', 'query', 'monospace');
    this.element.addEventListener('selectstart', this._selectStart.bind(this), false);

    this._promptIcon = UI.Icon.create('smallicon-text-prompt', 'prompt-icon');
    this._promptElement = createElement('div');
    this._promptElement.appendChild(this._promptIcon);
    this._promptElement.className = 'database-query-prompt';
    this._promptElement.appendChild(createElement('br'));
    this._promptElement.addEventListener('keydown', this._promptKeyDown.bind(this), true);
    this.element.appendChild(this._promptElement);

    this._prompt = new UI.TextPrompt();
    this._prompt.initialize(this.completions.bind(this), ' ');
    this._proxyElement = this._prompt.attach(this._promptElement);

    this.element.addEventListener('click', this._messagesClicked.bind(this), true);
  }

  _messagesClicked() {
    if (!this._prompt.isCaretInsidePrompt() && this.element.isComponentSelectionCollapsed())
      this._prompt.moveCaretToEndOfPrompt();
  }

  /**
   * @param {string} expression
   * @param {string} prefix
   * @param {boolean=} force
   * @return {!Promise<!UI.SuggestBox.Suggestions>}
   */
  completions(expression, prefix, force) {
    if (!prefix)
      return Promise.resolve([]);
    var fulfill;
    var promise = new Promise(x => fulfill = x);
    var results = [];

    prefix = prefix.toLowerCase();

    function accumulateMatches(textArray) {
      for (var i = 0; i < textArray.length; ++i) {
        var text = textArray[i].toLowerCase();
        if (text.length < prefix.length)
          continue;
        if (!text.startsWith(prefix))
          continue;
        results.push(textArray[i]);
      }
    }
    function tableNamesCallback(tableNames) {
      accumulateMatches(tableNames.map(function(name) {
        return name + ' ';
      }));
      accumulateMatches([
        'SELECT ', 'FROM ', 'WHERE ', 'LIMIT ', 'DELETE FROM ', 'CREATE ', 'DROP ', 'TABLE ', 'INDEX ', 'UPDATE ',
        'INSERT INTO ', 'VALUES ('
      ]);

      fulfill(results.map(completion => ({title: completion})));
    }
    this.database.getTableNames(tableNamesCallback);
    return promise;
  }

  _selectStart(event) {
    if (this._selectionTimeout)
      clearTimeout(this._selectionTimeout);

    this._prompt.clearAutocomplete();

    /**
     * @this {Resources.DatabaseQueryView}
     */
    function moveBackIfOutside() {
      delete this._selectionTimeout;
      if (!this._prompt.isCaretInsidePrompt() && this.element.isComponentSelectionCollapsed())
        this._prompt.moveCaretToEndOfPrompt();
      this._prompt.autoCompleteSoon();
    }

    this._selectionTimeout = setTimeout(moveBackIfOutside.bind(this), 100);
  }

  _promptKeyDown(event) {
    if (isEnterKey(event)) {
      this._enterKeyPressed(event);
      return;
    }
  }

  _enterKeyPressed(event) {
    event.consume(true);

    this._prompt.clearAutocomplete();

    var query = this._prompt.text();
    if (!query.length)
      return;

    this._prompt.setText('');
    this._promptElement.insertBefore(this._promptIcon, this._promptElement.firstChild);

    this.database.executeSql(query, this._queryFinished.bind(this, query), this._queryError.bind(this, query));
  }

  _queryFinished(query, columnNames, values) {
    var dataGrid = UI.SortableDataGrid.create(columnNames, values);
    var trimmedQuery = query.trim();

    if (dataGrid) {
      dataGrid.renderInline();
      this._appendViewQueryResult(trimmedQuery, dataGrid.asWidget());
      dataGrid.autoSizeColumns(5);
    }

    if (trimmedQuery.match(/^create /i) || trimmedQuery.match(/^drop table /i))
      this.dispatchEventToListeners(Resources.DatabaseQueryView.Events.SchemaUpdated, this.database);
  }

  _queryError(query, errorMessage) {
    this._appendErrorQueryResult(query, errorMessage);
  }

  /**
   * @param {string} query
   * @param {!UI.Widget} view
   */
  _appendViewQueryResult(query, view) {
    var resultElement = this._appendQueryResult(query);
    view.show(resultElement);
    this._promptElement.scrollIntoView(false);
  }

  /**
   * @param {string} query
   * @param {string} errorText
   */
  _appendErrorQueryResult(query, errorText) {
    var resultElement = this._appendQueryResult(query);
    resultElement.classList.add('error');
    resultElement.appendChild(UI.Icon.create('smallicon-error', 'prompt-icon'));
    resultElement.createTextChild(errorText);

    this._promptElement.scrollIntoView(false);
  }

  /**
   * @param {string} query
   */
  _appendQueryResult(query) {
    var element = createElement('div');
    element.className = 'database-user-query';
    element.appendChild(UI.Icon.create('smallicon-user-command', 'prompt-icon'));
    this.element.insertBefore(element, this._proxyElement);

    var commandTextElement = createElement('span');
    commandTextElement.className = 'database-query-text';
    commandTextElement.textContent = query;
    element.appendChild(commandTextElement);

    var resultElement = createElement('div');
    resultElement.className = 'database-query-result';
    element.appendChild(resultElement);
    return resultElement;
  }
};

/** @enum {symbol} */
Resources.DatabaseQueryView.Events = {
  SchemaUpdated: Symbol('SchemaUpdated')
};
