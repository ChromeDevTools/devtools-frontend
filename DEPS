# Copyright 2019 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

use_relative_paths = True
git_dependencies = 'SYNC'
gclient_gn_args_file = 'build/config/gclient_args.gni'
gclient_gn_args = [
]

vars = {
  'build_with_chromium': False,

  'build_url': 'https://chromium.googlesource.com/chromium/src/build.git',
  'build_revision': 'a21fc6065131d0442e8a54c3ca2638e393b69438',

  'buildtools_url': 'https://chromium.googlesource.com/chromium/src/buildtools.git',
  'buildtools_revision': '6f834e2039daedfc68a2749c217922b26d5e8497',

  'depot_tools_url': 'https://chromium.googlesource.com/chromium/tools/depot_tools.git',
  'depot_tools_revision': '9f3b33a275e7a5b19d8ce4aba7960d2a38858681',

  'inspector_protocol_url': 'https://chromium.googlesource.com/deps/inspector_protocol',
  'inspector_protocol_revision': '916f43c554c65ebf4ccd896b0f4e2ac99a67c434',

  'clang_format_url': 'https://chromium.googlesource.com/external/github.com/llvm/llvm-project/clang/tools/clang-format.git',
  'clang_format_revision': 'e5337933f2951cacd3aeacd238ce4578163ca0b9',

  'emscripten_tag': 'ade9d780ff17c88d81aa13860361743e3c1e1396',

  # GN CIPD package version.
  'gn_version': 'git_revision:e4702d7409069c4f12d45ea7b7f0890717ca3f4b',

  'cmake_version': 'version:3.16.1',

  'llvm_url': 'https://chromium.googlesource.com/external/github.com/llvm/llvm-project/',
  'llvm_revision': 'c08d3b08f6d71e974537de226c68d4c94c396a46',

  'lldb_eval_url': 'https://chromium.googlesource.com/external/github.com/google/lldb-eval.git',
  'lldb_eval_revision': 'e87123a7e639bf1d86f24c37079570fb7fa00b72',

  # ninja CIPD package version.
  # https://chrome-infra-packages.appspot.com/p/infra/3pp/tools/ninja
  'ninja_version': 'version:2@1.11.1.chromium.6',

  # Chrome version used for tests. It should be regularly updated to
  # match the Canary version listed here:
  # https://googlechromelabs.github.io/chrome-for-testing/last-known-good-versions.json
  'chrome': '120.0.6087.0',

  # 'magic' text to tell depot_tools that git submodules should be accepted but
  # but parity with DEPS file is expected.
  'SUBMODULE_MIGRATION': 'True'
}

# Only these hosts are allowed for dependencies in this DEPS file.
# If you need to add a new host, contact chrome infrastracture team.
allowed_hosts = [ 'chromium.googlesource.com', 'chrome-infra-packages.appspot.com' ]

deps = {
  'third_party/clang-format/script': {
    'url': Var('clang_format_url') + '@' + Var('clang_format_revision'),
    'condition': 'build_with_chromium == False',
  },
  'third_party/cmake': {
    'packages': [{
      'package': 'infra/cmake/${{platform}}',
      'version': Var('cmake_version')
    }],
    'dep_type':
      'cipd',
    'condition': 'checkout_cxx_debugging_extension_deps == True',
  },
  'extensions/cxx_debugging/third_party/llvm/src': {
    'url': Var('llvm_url') + '@' + Var('llvm_revision'),
    'condition': 'checkout_cxx_debugging_extension_deps == True',
  },
  'extensions/cxx_debugging/third_party/lldb-eval/src': {
    'url': Var('lldb_eval_url') + '@' + Var('lldb_eval_revision'),
    'condition': 'checkout_cxx_debugging_extension_deps == True',
  },

  'buildtools': {
    'url': Var('buildtools_url') + '@' + Var('buildtools_revision'),
    'condition': 'build_with_chromium == False',
  },

  'buildtools/linux64': {
    'packages': [
      {
        'package': 'gn/gn/linux-${{arch}}',
        'version': Var('gn_version'),
      }
    ],
    'dep_type': 'cipd',
    'condition': 'host_os == "linux" and build_with_chromium == False',
  },
  'buildtools/mac': {
    'packages': [
      {
        'package': 'gn/gn/mac-${{arch}}',
        'version': Var('gn_version'),
      }
    ],
    'dep_type': 'cipd',
    'condition': 'host_os == "mac" and build_with_chromium == False',
  },
  'buildtools/win': {
    'packages': [
      {
        'package': 'gn/gn/windows-${{arch}}',
        'version': Var('gn_version'),
      }
    ],
    'dep_type': 'cipd',
    'condition': 'host_os == "win" and build_with_chromium == False',
  },
  'third_party/esbuild': {
    'packages': [
      {
        'package': 'infra/3pp/tools/esbuild/${{platform}}',
        'version': 'version:2@0.14.13.chromium.2',
      }
    ],
    'dep_type': 'cipd',
  },

  'build': {
    'url': Var('build_url') + '@' + Var('build_revision'),
    'condition': 'build_with_chromium == False',
  },
  'third_party/depot_tools': {
    'url': Var('depot_tools_url') + '@' + Var('depot_tools_revision'),
    'condition': 'build_with_chromium == False',
  },
  'third_party/inspector_protocol': {
    'url': Var('inspector_protocol_url') + '@' + Var('inspector_protocol_revision'),
    'condition': 'build_with_chromium == False',
  },
  'third_party/ninja': {
    'packages': [
      {
        'package': 'infra/3pp/tools/ninja/${{platform}}',
        'version': Var('ninja_version'),
      }
    ],
    'dep_type': 'cipd',
    'condition': 'build_with_chromium == False',
  },
}

hooks = [
  # Pull down Node binaries for WebUI toolchain.
  {
    'name': 'node_linux64',
    'pattern': '.',
    'condition': 'host_os == "linux" and build_with_chromium == False',
    'action': [ 'python3',
                'third_party/depot_tools/download_from_google_storage.py',
                '--no_resume',
                '--extract',
                '--no_auth',
                '--bucket', 'chromium-nodejs/16.13.0',
                '-s', 'third_party/node/linux/node-linux-x64.tar.gz.sha1',
    ],
  },
  {
    'name': 'node_mac',
    'pattern': '.',
    'condition': 'host_os == "mac" and build_with_chromium == False and host_cpu != "arm64"',
    'action': [ 'python3',
                'third_party/depot_tools/download_from_google_storage.py',
                '--no_resume',
                '--extract',
                '--no_auth',
                '--bucket', 'chromium-nodejs/16.13.0',
                '-s', 'third_party/node/mac/node-darwin-x64.tar.gz.sha1',
    ],
  },
    {
    'name': 'node_mac',
    'pattern': '.',
    'condition': 'host_os == "mac" and build_with_chromium == False and host_cpu == "arm64"',
    'action': [ 'python3',
                'third_party/depot_tools/download_from_google_storage.py',
                '--no_resume',
                '--extract',
                '--no_auth',
                '--bucket', 'chromium-nodejs/16.13.0',
                '-s', 'third_party/node/mac/node-darwin-arm64.tar.gz.sha1',
    ],
  },
  {
    'name': 'node_win',
    'pattern': '.',
    'condition': 'host_os == "win" and build_with_chromium == False',
    'action': [ 'python3',
                'third_party/depot_tools/download_from_google_storage.py',
                '--no_resume',
                '--no_auth',
                '--bucket', 'chromium-nodejs/16.13.0',
                '-s', 'third_party/node/win/node.exe.sha1',
    ],
  },

  {
    # Ensure that the DEPS'd "depot_tools" has its self-update capability
    # disabled.
    'name': 'disable_depot_tools_selfupdate',
    'pattern': '.',
    'condition': 'build_with_chromium == False',
    'action': [
        'python3',
        'third_party/depot_tools/update_depot_tools_toggle.py',
        '--disable',
    ],
  },

  # Pull clang-format binaries using checked-in hashes.
  {
    'name': 'clang_format_win',
    'pattern': '.',
    'condition': 'host_os == "win" and build_with_chromium == False',
    'action': [ 'python3',
                'third_party/depot_tools/download_from_google_storage.py',
                '--no_resume',
                '--no_auth',
                '--bucket', 'chromium-clang-format',
                '-s', 'buildtools/win/clang-format.exe.sha1',
    ],
  },
  {
    'name': 'clang_format_mac_x64',
    'pattern': '.',
    'condition': 'host_os == "mac" and build_with_chromium == False and host_cpu == "x64"',
    'action': [ 'python3',
                'third_party/depot_tools/download_from_google_storage.py',
                '--no_resume',
                '--no_auth',
                '--bucket', 'chromium-clang-format',
                '-s', 'buildtools/mac/clang-format.x64.sha1',
                '-o', 'buildtools/mac/clang-format',
    ],
  },
  {
    'name': 'clang_format_mac_arm64',
    'pattern': '.',
    'condition': 'host_os == "mac" and build_with_chromium == False and host_cpu == "arm64"',
    'action': [ 'python3',
                'third_party/depot_tools/download_from_google_storage.py',
                '--no_resume',
                '--no_auth',
                '--bucket', 'chromium-clang-format',
                '-s', 'buildtools/mac/clang-format.arm64.sha1',
                '-o', 'buildtools/mac/clang-format',
    ],
  },
  {
    'name': 'clang_format_linux',
    'pattern': '.',
    'condition': 'host_os == "linux" and build_with_chromium == False',
    'action': [ 'python3',
                'third_party/depot_tools/download_from_google_storage.py',
                '--no_resume',
                '--no_auth',
                '--bucket', 'chromium-clang-format',
                '-s', 'buildtools/linux64/clang-format.sha1',
    ],
  },

  # Pull Chrome binaries from CfT buckets.
  {
    'name': 'download_chrome_win',
    'pattern': '.',
    'condition': 'host_os == "win" and build_with_chromium == False',
    'action': [ 'python3',
                'scripts/deps/download_chrome.py',
                '--url=https://edgedl.me.gvt1.com/edgedl/chrome/chrome-for-testing/' + Var('chrome') + '/win64/chrome-win64.zip',
                '--target=third_party/chrome',
                '--rename_from=chrome-win64',
                '--rename_to=chrome-win',
                '--path_to_binary=chrome-win/chrome.exe',
                '--version_number=' + Var('chrome'),
    ],
  },
  {
    'name': 'download_chrome_mac',
    'pattern': '.',
    'condition': 'host_os == "mac" and build_with_chromium == False and host_cpu != "arm64"',
    'action': [ 'python3',
                'scripts/deps/download_chrome.py',
                '--url=https://edgedl.me.gvt1.com/edgedl/chrome/chrome-for-testing/' + Var('chrome') + '/mac-x64/chrome-mac-x64.zip',
                '--target=third_party/chrome',
                '--rename_from=chrome-mac-x64',
                '--rename_to=chrome-mac',
                '--path_to_binary=chrome-mac/Google Chrome for Testing.app/Contents',
                '--version_number=' + Var('chrome'),
    ],
  },
  {
    'name': 'download_chrome_mac',
    'pattern': '.',
    'condition': 'host_os == "mac" and build_with_chromium == False and host_cpu == "arm64"',
    'action': [ 'python3',
                'scripts/deps/download_chrome.py',
                '--url=https://edgedl.me.gvt1.com/edgedl/chrome/chrome-for-testing/' + Var('chrome') + '/mac-arm64/chrome-mac-arm64.zip',
                '--target=third_party/chrome',
                '--rename_from=chrome-mac-arm64',
                '--rename_to=chrome-mac',
                '--path_to_binary=chrome-mac/Google Chrome for Testing.app/Contents',
                '--version_number=' + Var('chrome'),
    ],
  },
  {
    'name': 'download_chrome_linux',
    'pattern': '.',
    'condition': 'host_os == "linux" and build_with_chromium == False',
    'action': [ 'python3',
                'scripts/deps/download_chrome.py',
                '--url=https://edgedl.me.gvt1.com/edgedl/chrome/chrome-for-testing/' + Var('chrome') + '/linux64/chrome-linux64.zip',
                '--target=third_party/chrome',
                '--rename_from=chrome-linux64',
                '--rename_to=chrome-linux',
                '--path_to_binary=chrome-linux/chrome',
                '--version_number=' + Var('chrome'),
    ],
  },

  {
    # Update LASTCHANGE for build script timestamps
    'name': 'lastchange',
    'condition': 'build_with_chromium == False',
    'pattern': '.',
    'action': ['python3', 'build/util/lastchange.py',
               '-o', 'build/util/LASTCHANGE'],
  },
  {
    'name': 'sysroot_x64',
    'pattern': '.',
    'condition': 'checkout_linux and checkout_x64 and build_with_chromium == False',
    'action': ['python3', 'build/linux/sysroot_scripts/install-sysroot.py',
               '--arch=x64'],
  },
  {
    'name': 'emscripten',
    'pattern': '.',
    'condition': 'build_with_chromium == False',
    'action': ['python3', 'scripts/deps/download_emscripten.py', Var('emscripten_tag'), 'third_party/emscripten-releases'],
  },
  {
    'name': 'VS Code settings',
    'pattern': '.',
    'condition': 'build_with_chromium == False',
    'action': ['python3', 'third_party/node/node.py', '--output', 'scripts/deps/sync-vscode-settings.js']
  },
]
