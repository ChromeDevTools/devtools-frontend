# Copyright 2019 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

vars = {
  'build_url': 'https://chromium.googlesource.com/chromium/src/build.git',
  'build_revision': '95597907c99929273f8a371bdeb5867035fd82cc',

  'buildtools_url': 'https://chromium.googlesource.com/chromium/src/buildtools.git',
  'buildtools_revision': '1ed99573d57d4b6041261b531cdf876e631cf0bc',

  'depot_tools_url': 'https://chromium.googlesource.com/chromium/tools/depot_tools.git',
  'depot_tools_revision': '6e6c67d0eac4eaca84e81c1d6c10ba615c99872b',

  'inspector_protocol_url': 'https://chromium.googlesource.com/deps/inspector_protocol',
  'inspector_protocol_revision': '8c11f011735fedf71002e0f2f29a4a3a9546136e',

  'llvm_url': 'https://chromium.googlesource.com/external/github.com/llvm/llvm-project/',
  'llvm_revision': '7edc7f6edbcb5be439886c271a71df43b3f0a8e3',
  'build_symbol_server': False,

  'clang_format_url': 'https://chromium.googlesource.com/chromium/llvm-project/cfe/tools/clang-format.git',
  'clang_format_revision': '96636aa0e9f047f17447f2d45a094d0b59ed7917',

  'clang_url': 'https://chromium.googlesource.com/chromium/src/tools/clang.git',
  'clang_revision': '116e3ee70d1877ee7d92e0d8bfdf9420b773cd43',

  'cmake_version': 'version:3.16.1',
  'protoc_version': 'protobuf_version:v3.11.4',

  # GN CIPD package version.
  'gn_version': 'git_revision:7d7e8deea36d126397bda2cf924682504271f0e1',

  # Chromium build number for unit tests. It should be regularly updated to
  # the content of https://commondatastorage.googleapis.com/chromium-browser-snapshots/Linux_x64/LAST_CHANGE
  'chromium_linux': '783299',
  # the content of https://commondatastorage.googleapis.com/chromium-browser-snapshots/Win_x64/LAST_CHANGE
  'chromium_win': '783297',
  # the content of https://commondatastorage.googleapis.com/chromium-browser-snapshots/Mac/LAST_CHANGE
  'chromium_mac': '783293',
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

  'devtools-frontend/back_end/CXXDWARFSymbols/third_party/llvm': {
    'url': Var('llvm_url') + '@' + Var('llvm_revision'),
    'condition': 'build_symbol_server'
  },
  'devtools-frontend/third_party/clang': {
    'url': Var('clang_url') + '@' + Var('clang_revision'),
    'condition': 'build_symbol_server'
  },
  'devtools-frontend/third_party/cmake': {
    'packages': [
      {
        'package': 'infra/cmake/${{platform}}',
        'version': Var('cmake_version')
      }
    ],
    'dep_type': 'cipd',
    'condition': 'build_symbol_server'
  },
  'devtools-frontend/third_party/protoc': {
    'packages': [
      {
        'package': 'infra/tools/protoc/${{platform}}',
        'version':  Var('protoc_version')
      }
    ],
    'dep_type': 'cipd',
    'condition': 'build_symbol_server'
  }
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
                '--bucket', 'chromium-nodejs/12.14.1',
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
                '--bucket', 'chromium-nodejs/12.14.1',
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
                '--bucket', 'chromium-nodejs/12.14.1',
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
  {
    # Note: On Win, this should run after win_toolchain, as it may use it.
    'name': 'clang',
    'pattern': '.',
    # clang not supported on aix
    'condition': 'host_os != "aix" and build_symbol_server',
    'action': ['python', 'devtools-frontend/third_party/clang/scripts/update.py'],
  },
  {
    'name': 'sysroot_x64',
    'pattern': '.',
    'condition': 'checkout_linux and checkout_x64',
    'action': ['python', 'devtools-frontend/build/linux/sysroot_scripts/install-sysroot.py',
               '--arch=x64'],
  },

]
