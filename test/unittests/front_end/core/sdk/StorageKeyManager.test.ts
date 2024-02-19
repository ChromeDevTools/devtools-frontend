// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import {createTarget} from '../../helpers/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../helpers/MockConnection.js';
import type * as SDKModule from '../../../../../front_end/core/sdk/sdk.js';
import type * as Platform from '../../../../../front_end/core/platform/platform.js';

describeWithMockConnection('StorageKeyManager', () => {
  let SDK: typeof SDKModule;
  let manager: SDKModule.StorageKeyManager.StorageKeyManager;

  before(async () => {
    SDK = await import('../../../../../front_end/core/sdk/sdk.js');
  });

  beforeEach(() => {
    assert.doesNotThrow(() => {
      const target = createTarget();
      manager = new SDK.StorageKeyManager.StorageKeyManager(target);
    });
  });

  it('updates storage keys and emits events correctly', () => {
    let eventFired: boolean = false;
    const keys = ['storagekey1', 'storagekey2'];

    assert.isEmpty(manager.storageKeys());
    manager.addEventListener(SDK.StorageKeyManager.Events.StorageKeyAdded, () => {
      eventFired = true;
    });
    manager.updateStorageKeys(new Set<string>(keys));
    assert.isTrue(eventFired);
    assert.deepEqual(manager.storageKeys(), keys);

    eventFired = false;
    manager.addEventListener(SDK.StorageKeyManager.Events.StorageKeyRemoved, () => {
      eventFired = true;
    });
    manager.updateStorageKeys(new Set<string>());
    assert.isTrue(eventFired);
    assert.isEmpty(manager.storageKeys());
  });

  it('updates main storage key and emits event correctly', () => {
    const mainKey = 'storagekey1';
    let eventFired = false;

    assert.isEmpty(manager.mainStorageKey());
    manager.addEventListener(SDK.StorageKeyManager.Events.MainStorageKeyChanged, () => {
      eventFired = true;
    });
    manager.setMainStorageKey(mainKey);
    assert.isTrue(eventFired);
    assert.strictEqual(manager.mainStorageKey(), mainKey);
  });
});

describe('parseStorageKey', () => {
  let SDK: typeof SDKModule;

  before(async () => {
    SDK = await import('../../../../../front_end/core/sdk/sdk.js');
  });

  it('parses first-party key', () => {
    const storageKey = SDK.StorageKeyManager.parseStorageKey('https://example.com/');
    assert.deepEqual(storageKey.origin, 'https://example.com' as Platform.DevToolsPath.UrlString);
    assert.deepEqual([...storageKey.components], []);
  });

  it('parses ancestor chain bit', () => {
    const storageKey = SDK.StorageKeyManager.parseStorageKey('https://example.com/^31');
    assert.strictEqual(storageKey.origin, 'https://example.com');
    assert.deepEqual([...storageKey.components], [[SDK.StorageKeyManager.StorageKeyComponent.ANCESTOR_CHAIN_BIT, '1']]);
  });

  it('parses top-level site', () => {
    const storageKey = SDK.StorageKeyManager.parseStorageKey('https://test.example/^0https://example.com');
    assert.strictEqual(storageKey.origin, 'https://test.example');
    assert.deepEqual(
        [...storageKey.components],
        [[SDK.StorageKeyManager.StorageKeyComponent.TOP_LEVEL_SITE, 'https://example.com']]);
  });

  it('parses opaque top-level site', () => {
    const storageKey = SDK.StorageKeyManager.parseStorageKey(
        'https://sub.example.com/^43735928559^5110521^6https://sub.notexample.com');
    assert.strictEqual(storageKey.origin, 'https://sub.example.com');
    assert.deepEqual([...storageKey.components], [
      [SDK.StorageKeyManager.StorageKeyComponent.TOP_LEVEL_SITE_OPAQUE_NONCE_HIGH, '3735928559'],
      [SDK.StorageKeyManager.StorageKeyComponent.TOP_LEVEL_SITE_OPAQUE_NONCE_LOW, '110521'],
      [SDK.StorageKeyManager.StorageKeyComponent.TOP_LEVEL_SITE_OPAQUE_NONCE_PRECURSOR, 'https://sub.notexample.com'],
    ]);
  });

  it('parses nonce', () => {
    const storageKey = SDK.StorageKeyManager.parseStorageKey('https://example.com/^112345^267890');
    assert.strictEqual(storageKey.origin, 'https://example.com');
    assert.deepEqual([...storageKey.components], [
      [SDK.StorageKeyManager.StorageKeyComponent.NONCE_HIGH, '12345'],
      [SDK.StorageKeyManager.StorageKeyComponent.NONCE_LOW, '67890'],
    ]);
  });
});
