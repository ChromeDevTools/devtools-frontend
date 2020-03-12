// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as EventListenersModule from './event_listeners.js';

self.EventListeners = self.EventListeners || {};
EventListeners = EventListeners || {};

EventListeners.frameworkEventListeners = EventListenersModule.EventListenersUtils.frameworkEventListeners;

/** @constructor */
EventListeners.EventListenersView = EventListenersModule.EventListenersView.EventListenersView;

/** @constructor */
EventListeners.EventListenersTreeElement = EventListenersModule.EventListenersView.EventListenersTreeElement;

/** @constructor */
EventListeners.ObjectEventListenerBar = EventListenersModule.EventListenersView.ObjectEventListenerBar;
