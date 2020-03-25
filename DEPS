# Copyright 2019 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

vars = {
  'build_url': 'https://chromium.googlesource.com/chromium/src/build.git',
  'build_revision': 'de373bbc5b9121aff3bcd708c100d96d3b64bae9',

  'buildtools_url': 'https://chromium.googlesource.com/chromium/src/buildtools.git',
  'buildtools_revision': '7977eb176752aeec29d888cfe8e677ac12ed1c41',

  'depot_tools_url': 'https://chromium.googlesource.com/chromium/tools/depot_tools.git',
  'depot_tools_revision': 'e3a49aa40576da2427447f7fedb670d5d59216e5',

  'inspector_protocol_url': 'https://chromium.googlesource.com/deps/inspector_protocol',
  'inspector_protocol_revision': 'b7cda08cd6e522df2159413ba5f29d2a953cc1c4',

  'clang_format_url': 'https://chromium.googlesource.com/chromium/llvm-project/cfe/tools/clang-format.git',
  'clang_format_revision': '96636aa0e9f047f17447f2d45a094d0b59ed7917',

  # GN CIPD package version.
  'gn_version': 'git_revision:5ed3c9cc67b090d5e311e4bd2aba072173e82db9',

  # Chromium build number for unit tests. It should be regularly updated to
  # the content of https://commondatastorage.googleapis.com/chromium-browser-snapshots/Linux_x64/LAST_CHANGE
  'chromium_linux': '752719',
  # the content of https://commondatastorage.googleapis.com/chromium-browser-snapshots/Win_x64/LAST_CHANGE
  'chromium_win': '752710',
  # the content of https://commondatastorage.googleapis.com/chromium-browser-snapshots/Mac/LAST_CHANGE
  'chromium_mac': '752700',
}

# Only these hosts are allowed for dependencies in this DEPS file.
# If you need to add a new host, contact chrome infrastracture team.
allowed_hosts = [ 'chromium.googlesource.com' ]

deps = {
  'devtools-frontend/buildtools/clang_format/script':
    Var('clang_format_url') + '@' + Var('clang_format_revision'),

  'devtools-frontend/buildtools':
    Var('buildtools_url') + '@' + Var('buildtools_revision'),

  'devtools-frontend/buildtools/linux64': {
    'packages': [
      {
        'package': 'gn/gn/linux-amd64',
        'version': Var('gn_version'),
      }
    ],
    'dep_type': 'cipd',
    'condition': 'host_os == "linux"',
  },
  'devtools-frontend/buildtools/mac': {
    'packages': [
      {
        'package': 'gn/gn/mac-amd64',
        'version': Var('gn_version'),
      }
    ],
    'dep_type': 'cipd',
    'condition': 'host_os == "mac"',
  },
  'devtools-frontend/buildtools/win': {
    'packages': [
      {
        'package': 'gn/gn/windows-amd64',
        'version': Var('gn_version'),
      }
    ],
    'dep_type': 'cipd',
    'condition': 'host_os == "win"',
  },
  'devtools-frontend/build':
    Var('build_url') + '@' + Var('build_revision'),
  'devtools-frontend/third_party/depot_tools':
    Var('depot_tools_url') + '@' + Var('depot_tools_revision'),
  'devtools-frontend/third_party/inspector_protocol':
    Var('inspector_protocol_url') + '@' + Var('inspector_protocol_revision'),
}

hooks = [
  # Pull down Node binaries for WebUI toolchain.
  {
    'name': 'node_linux64',
    'pattern': '.',
    'condition': 'host_os == "linux"',
    'action': [ 'python',
                'devtools-frontend/third_party/depot_tools/download_from_google_storage.py',
                '--no_resume',
                '--extract',
                '--no_auth',
                '--bucket', 'chromium-nodejs/10.15.3',
                '-s', 'devtools-frontend/third_party/node/linux/node-linux-x64.tar.gz.sha1',
    ],
  },
  {
    'name': 'node_mac',
    'pattern': '.',
    'condition': 'host_os == "mac"',
    'action': [ 'python',
                'devtools-frontend/third_party/depot_tools/download_from_google_storage.py',
                '--no_resume',
                '--extract',
                '--no_auth',
                '--bucket', 'chromium-nodejs/10.15.3',
                '-s', 'devtools-frontend/third_party/node/mac/node-darwin-x64.tar.gz.sha1',
    ],
  },
  {
    'name': 'node_win',
    'pattern': '.',
    'condition': 'host_os == "win"',
    'action': [ 'python',
                'devtools-frontend/third_party/depot_tools/download_from_google_storage.py',
                '--no_resume',
                '--no_auth',
                '--bucket', 'chromium-nodejs/10.15.3',
                '-s', 'devtools-frontend/third_party/node/win/node.exe.sha1',
    ],
  },

  {
    # Ensure that the DEPS'd "depot_tools" has its self-update capability
    # disabled.
    'name': 'disable_depot_tools_selfupdate',
    'pattern': '.',
    'action': [
        'python',
        'devtools-frontend/third_party/depot_tools/update_depot_tools_toggle.py',
        '--disable',
    ],
  },

  # Pull clang-format binaries using checked-in hashes.
  {
    'name': 'clang_format_win',
    'pattern': '.',
    'condition': 'host_os == "win"',
    'action': [ 'python',
                'devtools-frontend/third_party/depot_tools/download_from_google_storage.py',
                '--no_resume',
                '--no_auth',
                '--bucket', 'chromium-clang-format',
                '-s', 'devtools-frontend/buildtools/win/clang-format.exe.sha1',
    ],
  },
  {
    'name': 'clang_format_mac',
    'pattern': '.',
    'condition': 'host_os == "mac"',
    'action': [ 'python',
                'devtools-frontend/third_party/depot_tools/download_from_google_storage.py',
                '--no_resume',
                '--no_auth',
                '--bucket', 'chromium-clang-format',
                '-s', 'devtools-frontend/buildtools/mac/clang-format.sha1',
    ],
  },
  {
    'name': 'clang_format_linux',
    'pattern': '.',
    'condition': 'host_os == "linux"',
    'action': [ 'python',
                'devtools-frontend/third_party/depot_tools/download_from_google_storage.py',
                '--no_resume',
                '--no_auth',
                '--bucket', 'chromium-clang-format',
                '-s', 'devtools-frontend/buildtools/linux64/clang-format.sha1',
    ],
  },

  # Pull chromium from common storage
  {
    'name': 'download_chromium_win',
    'pattern': '.',
    'condition': 'host_os == "win"',
    'action': [ 'python',
                'devtools-frontend/scripts/deps/download_chromium.py',
                'https://commondatastorage.googleapis.com/chromium-browser-snapshots/Win_x64/' + Var('chromium_win') + '/chrome-win.zip',
                'devtools-frontend/third_party/chrome',
                'chrome-win/chrome.exe',
                Var('chromium_win'),
    ],
  },
  {
    'name': 'download_chromium_mac',
    'pattern': '.',
    'condition': 'host_os == "mac"',
    'action': [ 'python',
                'devtools-frontend/scripts/deps/download_chromium.py',
                'https://commondatastorage.googleapis.com/chromium-browser-snapshots/Mac/' + Var('chromium_mac') + '/chrome-mac.zip',
                'devtools-frontend/third_party/chrome',
                'chrome-mac/Chromium.app/Contents',
                Var('chromium_mac'),
    ],
  },
  {
    'name': 'download_chromium_linux',
    'pattern': '.',
    'condition': 'host_os == "linux"',
    'action': [ 'python',
                'devtools-frontend/scripts/deps/download_chromium.py',
                'https://commondatastorage.googleapis.com/chromium-browser-snapshots/Linux_x64/' + Var('chromium_linux') + '/chrome-linux.zip',
                'devtools-frontend/third_party/chrome',
                'chrome-linux/chrome',
                Var('chromium_linux'),
    ],
  },

]
