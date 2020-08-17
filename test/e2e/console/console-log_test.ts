// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {getBrowserAndPages, waitForFunction} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {getStructuredConsoleMessages, navigateToConsoleTab, showVerboseMessages} from '../helpers/console-helpers.js';

/* eslint-disable no-console */

describe('The Console Tab', async () => {
  const tests = [
    {
      description: 'produces console messages when a page logs using console.log',
      evaluate: () => console.log('log'),
      expectedMessages: [{
        message: 'log',
        messageClasses: 'console-message',
        repeatCount: null,
        source: '__puppeteer_evaluation_script__:1',
        stackPreview: null,
        wrapperClasses: 'console-message-wrapper console-from-api console-info-level',
      }],
    },
    {
      description: 'produces console messages when a page logs using console.debug',
      evaluate: () => console.debug('debug'),
      expectedMessages: [{
        message: 'debug',
        messageClasses: 'console-message',
        repeatCount: null,
        source: '__puppeteer_evaluation_script__:1',
        stackPreview: null,
        wrapperClasses: 'console-message-wrapper console-from-api console-verbose-level',
      }],
    },
    {
      description: 'produces console messages when a page logs using console.warn',
      evaluate: () => console.warn('warn'),
      expectedMessages: [{
        message: 'warn',
        messageClasses: 'console-message',
        repeatCount: null,
        source: '__puppeteer_evaluation_script__:1',
        stackPreview: '\n(anonymous) @ __puppeteer_evaluation_script__:1',
        wrapperClasses: 'console-message-wrapper console-from-api console-warning-level',
      }],
    },
    {
      description: 'produces console messages when a page logs using console.error',
      evaluate: () => console.error('error'),
      expectedMessages: [{
        message: 'error',
        messageClasses: 'console-message',
        repeatCount: null,
        source: '__puppeteer_evaluation_script__:1',
        stackPreview: '\n(anonymous) @ __puppeteer_evaluation_script__:1',
        wrapperClasses: 'console-message-wrapper console-from-api console-error-level',
      }],
    },
    {
      description: 'produces a single console message when messages are repeated',
      evaluate: () => {
        for (let i = 0; i < 5; ++i) {
          console.log('repeated');
        }
      },
      expectedMessages: [{
        message: 'repeated',
        messageClasses: 'console-message repeated-message',
        repeatCount: '5',
        source: '__puppeteer_evaluation_script__:3',
        stackPreview: null,
        wrapperClasses: 'console-message-wrapper console-from-api console-info-level',
      }],
    },
    {
      description: 'counts how many time console.count has been called with the same message',
      evaluate: () => {
        for (let i = 0; i < 2; ++i) {
          console.count('count');
        }
      },
      expectedMessages: [
        {
          message: 'count: 1',
          messageClasses: 'console-message',
          repeatCount: null,
          source: '__puppeteer_evaluation_script__:3',
          stackPreview: null,
          wrapperClasses: 'console-message-wrapper console-from-api console-info-level',
        },
        {
          message: 'count: 2',
          messageClasses: 'console-message',
          repeatCount: null,
          source: '__puppeteer_evaluation_script__:3',
          stackPreview: null,
          wrapperClasses: 'console-message-wrapper console-from-api console-info-level',
        },
      ],
    },
    {
      description: 'creates an empty group message using console.group/console.groupEnd',
      evaluate: () => {
        console.group('group');
        console.groupEnd();
      },
      expectedMessages: [
        {
          message: 'group',
          messageClasses: 'console-message',
          repeatCount: null,
          source: '__puppeteer_evaluation_script__:2',
          stackPreview: null,
          wrapperClasses: 'console-message-wrapper console-group-title console-from-api console-info-level',
        },
      ],
    },
    {
      description: 'logs multiple arguments using console.log',
      evaluate: () => {
        console.log('1', '2', '3');
      },
      expectedMessages: [
        {
          message: '1 2 3',
          messageClasses: 'console-message',
          repeatCount: null,
          source: '__puppeteer_evaluation_script__:2',
          stackPreview: null,
          wrapperClasses: 'console-message-wrapper console-from-api console-info-level',
        },
      ],
    },
    {
      description: 'creates a collapsed group using console.groupCollapsed with all messages in between hidden',
      evaluate: () => {
        console.groupCollapsed('groupCollapsed');
        console.log({property: 'value'});
        console.log(42);
        console.log(true);
        console.log(null);
        console.log(undefined);
        console.log(document);
        console.log(function() {});
        console.log(function f() {});
        console.log([1, 2, 3]);
        console.log(/regexp.*/);
        console.groupEnd();
      },
      expectedMessages: [
        {
          message: 'groupCollapsed',
          messageClasses: 'console-message',
          repeatCount: null,
          source: '__puppeteer_evaluation_script__:2',
          stackPreview: null,
          wrapperClasses: 'console-message-wrapper console-group-title console-from-api console-info-level',
        },
      ],
    },
    {
      description: 'logs console.count messages with and without arguments',
      evaluate: () => {
        console.count();
        console.count();
        console.count();
        console.count('title');
        console.count('title');
        console.count('title');
      },
      expectedMessages: [
        {
          message: 'default: 1',
          messageClasses: 'console-message',
          repeatCount: null,
          source: '__puppeteer_evaluation_script__:2',
          stackPreview: null,
          wrapperClasses: 'console-message-wrapper console-from-api console-info-level',
        },
        {
          message: 'default: 2',
          messageClasses: 'console-message',
          repeatCount: null,
          source: '__puppeteer_evaluation_script__:3',
          stackPreview: null,
          wrapperClasses: 'console-message-wrapper console-from-api console-info-level',
        },
        {
          message: 'default: 3',
          messageClasses: 'console-message',
          repeatCount: null,
          source: '__puppeteer_evaluation_script__:4',
          stackPreview: null,
          wrapperClasses: 'console-message-wrapper console-from-api console-info-level',
        },
        {
          message: 'title: 1',
          messageClasses: 'console-message',
          repeatCount: null,
          source: '__puppeteer_evaluation_script__:5',
          stackPreview: null,
          wrapperClasses: 'console-message-wrapper console-from-api console-info-level',
        },
        {
          message: 'title: 2',
          messageClasses: 'console-message',
          repeatCount: null,
          source: '__puppeteer_evaluation_script__:6',
          stackPreview: null,
          wrapperClasses: 'console-message-wrapper console-from-api console-info-level',
        },
        {
          message: 'title: 3',
          messageClasses: 'console-message',
          repeatCount: null,
          source: '__puppeteer_evaluation_script__:7',
          stackPreview: null,
          wrapperClasses: 'console-message-wrapper console-from-api console-info-level',
        },
      ],
    },
  ];

  for (const test of tests) {
    it(test.description, async () => {
      const {target} = getBrowserAndPages();
      await navigateToConsoleTab();
      await showVerboseMessages();
      await target.evaluate(test.evaluate);
      const actualMessages = await waitForFunction(async () => {
        const messages = await getStructuredConsoleMessages();
        return messages.length === test.expectedMessages.length ? messages : undefined;
      });
      assert.deepEqual(actualMessages, test.expectedMessages, 'Console message does not match the expected message');
    });
  }
});
