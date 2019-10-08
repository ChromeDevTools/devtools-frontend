// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @unrestricted
 */
Media.MediaPlayerPropertiesRenderer = class extends Media.EventDisplayTable {
  constructor() {
    super(
        [
          {
            id: 'name',
            title: 'Property Name',
            sortable: true,
            weight: 2,
            sortingFunction: DataGrid.SortableDataGrid.StringComparator.bind(null, 'name')
          },
          {id: 'value', title: 'Value', sortable: false, weight: 7}
        ],
        'name');
  }

  /**
   * @param {string} playerID
   * @param {!Array.<!Media.Event>} changes
   * @param {!Media.MediaModel.MediaChangeTypeKeys} change_type
   */
  renderChanges(playerID, changes, change_type) {
    this.addEvents(changes);
  }
};

/**
 * @unrestricted
 */
Media.MediaPlayerEventTableRenderer = class extends Media.EventDisplayTable {
  constructor() {
    super([
      {
        id: 'timestamp',
        title: 'Timestamp',
        weight: 1,
        sortable: true,
        sortingFunction: DataGrid.SortableDataGrid.NumericComparator.bind(null, 'timestamp')
      },
      {id: 'name', title: 'Event Name', weight: 2, sortable: false},
      {id: 'value', title: 'Value', weight: 7, sortable: false}
    ]);

    this._firstEventTime = 0;
  }

  /**
   * @param {string} playerID
   * @param {!Array.<!Media.Event>} changes
   * @param {!Media.MediaModel.MediaChangeTypeKeys} change_type
   */
  renderChanges(playerID, changes, change_type) {
    if (this._firstEventTime === 0 && changes.length > 0) {
      this._firstEventTime = changes[0].timestamp;
    }

    this.addEvents(changes.map(this._subtractFirstEventTime.bind(this, this._firstEventTime)));
  }

  /**
   * @param {number|string|undefined} first_event_time
   * @param {!Media.Event} event
   */
  _subtractFirstEventTime(first_event_time, event) {
    event.timestamp = (event.timestamp - first_event_time).toFixed(3);
    return event;
  }
};