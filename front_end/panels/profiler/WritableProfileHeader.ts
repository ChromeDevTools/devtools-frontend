// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import type * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as Workspace from '../../models/workspace/workspace.js';

import {ProfileHeader, type ProfileType} from './ProfileHeader.js';

const UIStrings = {
  /**
   * @description Name of a profile.
   * @example {2} PH1
   */
  profileD: 'Profile {PH1}',
  /**
   * @description Status update showing data loaded size while reading a profile file from disk.
   * @example {4 MB} PH1
   */
  loadingD: 'Loading… {PH1}',
  /**
   * @description Error message shown when reading a profile file from disk fails.
   * @example {example.file} PH1
   * @example {cannot open file} PH2
   */
  fileSReadErrorS: 'File \'\'{PH1}\'\' read error: {PH2}',
  /**
   * @description Text when something is loading.
   */
  loading: 'Loading…',
  /**
   * @description Error message when loading a profile file fails.
   */
  failedToReadFile: 'Failed to read file',
  /**
   * @description Status update message while parsing profile JSON content.
   */
  parsing: 'Parsing…',
  /**
   * @description Status indicator in the JS Profiler to show that a file has been successfully loaded
   * from file, as opposed to a profile that has been captured locally.
   */
  loaded: 'Loaded',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/profiler/WritableProfileHeader.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class WritableProfileHeader extends ProfileHeader implements Common.StringOutputStream.OutputStream {
  readonly debuggerModel: SDK.DebuggerModel.DebuggerModel|null;
  fileName?: Platform.DevToolsPath.RawPathString;
  jsonifiedProfile?: string|null;
  profile?: Protocol.Profiler.Profile;
  protocolProfileInternal?: Protocol.Profiler.Profile;
  #profileReceivedPromise = Promise.withResolvers<void>();

  constructor(debuggerModel: SDK.DebuggerModel.DebuggerModel|null, type: ProfileType, title?: string) {
    super(type, title || i18nString(UIStrings.profileD, {PH1: type.nextProfileUid()}));
    this.debuggerModel = debuggerModel;
  }

  onChunkTransferred(_reader: Bindings.FileUtils.ChunkedReader): void {
    if (this.jsonifiedProfile) {
      this.updateStatus(
          i18nString(UIStrings.loadingD, {PH1: i18n.ByteUtilities.bytesToString(this.jsonifiedProfile.length)}));
    }
  }

  onError(reader: Bindings.FileUtils.ChunkedReader): void {
    const error = (reader.error() as Error);
    if (error) {
      this.updateStatus(i18nString(UIStrings.fileSReadErrorS, {PH1: reader.fileName(), PH2: error.message}));
    }
  }

  async write(text: string): Promise<void> {
    this.jsonifiedProfile += text;
  }

  async close(): Promise<void> {
  }

  override dispose(): void {
    this.removeTempFile();
  }

  override canSaveToFile(): boolean {
    return !this.fromFile();
  }

  override async saveToFile(): Promise<void> {
    await this.#profileReceivedPromise.promise;
    const fileOutputStream = new Bindings.FileUtils.FileOutputStream(Workspace.FileManager.FileManager.instance());
    if (!this.fileName) {
      const now = Platform.DateUtilities.toISO8601Compact(new Date());
      const fileExtension = this.profileType().fileExtension();

      this.fileName = `${this.profileType().typeName()}-${now}${fileExtension}` as Platform.DevToolsPath.RawPathString;
    }

    const accepted = await fileOutputStream.open(this.fileName);
    if (!accepted || !this.tempFile) {
      return;
    }
    const data = await this.tempFile.read();
    if (data) {
      await fileOutputStream.write(data);
    }
    void fileOutputStream.close();
  }

  override async loadFromFile(file: File): Promise<Error|null> {
    this.updateStatus(i18nString(UIStrings.loading), true);
    const fileReader = new Bindings.FileUtils.ChunkedFileReader(file, 10000000, this.onChunkTransferred.bind(this));
    this.jsonifiedProfile = '';

    const success = await fileReader.read(this);
    if (!success) {
      this.onError(fileReader);
      return new Error(i18nString(UIStrings.failedToReadFile));
    }

    this.updateStatus(i18nString(UIStrings.parsing), true);
    let error = null;
    try {
      this.profile = (JSON.parse(this.jsonifiedProfile) as Protocol.Profiler.Profile);
      this.setProfile((this.profile));
      this.updateStatus(i18nString(UIStrings.loaded), false);
    } catch (e) {
      error = e;
      this.profileType().removeProfile(this);
    }
    this.jsonifiedProfile = null;

    if (this.profileType().profileBeingRecorded() === this) {
      this.profileType().setProfileBeingRecorded(null);
    }
    return error;
  }

  setProtocolProfile(profile: Protocol.Profiler.Profile): void {
    this.setProfile(profile);
    this.protocolProfileInternal = profile;
    this.tempFile = new Bindings.TempFile.TempFile(Common.Console.Console.instance());
    this.tempFile.write([JSON.stringify(profile)]);
    this.#profileReceivedPromise.resolve();
  }
}
