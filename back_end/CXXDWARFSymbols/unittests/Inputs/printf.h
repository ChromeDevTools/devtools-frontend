// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#ifndef PRINTF_H_
#define PRINTF_H_
void printf(const char*);

void PrintF(const char* c) {
  printf(c);
}
#endif  // PRINTF_H_
