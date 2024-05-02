#!/bin/bash
# Copyright (c) Meta Platforms, Inc. and affiliates.
# Copyright 2019 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

PROJECT_NAME=rn-chrome-devtools-frontend
WORKSPACE_DIR="${PROJECT_NAME}__workspace"

sync_workspace() {
  echo "[setup] Syncing gclient workspace"
  gclient config --unmanaged $PROJECT_NAME --name $PROJECT_NAME
  gclient sync --no-history
}

setup() {
  STARTING_DIR=$PWD

  echo "[setup] Creating workspace directory at $(dirname "$PWD")/$WORKSPACE_DIR/"
  cd ..
  mkdir $WORKSPACE_DIR

  echo "[setup] Moving repo folder into workspace"
  mv $STARTING_DIR "$WORKSPACE_DIR/$PROJECT_NAME"

  cd $WORKSPACE_DIR
  sync_workspace

  echo "[setup] Moving to project folder"
  cd $PROJECT_NAME

  echo "[setup] Success: Repo ready at $PWD/"
}

if [ "$(basename "$(dirname "$PWD")")" = "$WORKSPACE_DIR" ]; then
  echo "[setup] Setup was already run. Performing workspace sync."
  cd ..
  sync_workspace
  cd $PROJECT_NAME
else
  setup
fi

