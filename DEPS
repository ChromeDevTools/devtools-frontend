# Copyright 2019 The Chromium Authors
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
  'build_revision': '371ecb089d96d60e5208ec2d25c9b4f0860e556c',

  'buildtools_url': 'https://chromium.googlesource.com/chromium/src/buildtools.git',
  'buildtools_revision': '5df641722f2e50623646d702e0046fb68c0f5ce1',

  'depot_tools_url': 'https://chromium.googlesource.com/chromium/tools/depot_tools.git',
  'depot_tools_revision': '565cc4ee354f0c394d0d83301e6658b1fc979c99',

  'inspector_protocol_url': 'https://chromium.googlesource.com/deps/inspector_protocol',
  'inspector_protocol_revision': '679b33a98ae546ff521eee2ea28d8d5bf28872ba',

  # Keeping track of the last time we rolled the browser protocol files.
  'chromium_browser_protocol_revision' : 'ee4cd283ea61d6cd89c8035af63ff05876860e3a',

  'clang_format_url': 'https://chromium.googlesource.com/external/github.com/llvm/llvm-project/clang/tools/clang-format.git',
  'clang_format_revision': 'c2725e0622e1a86d55f14514f2177a39efea4a0e',

  'emscripten_tag': 'ade9d780ff17c88d81aa13860361743e3c1e1396',

  # GN CIPD package version.
  'gn_version': 'git_revision:c5a0003bcc2ac3f8d128aaffd700def6068e9a76',

  'cmake_version': 'version:2@3.21.3',

  'llvm_url': 'https://chromium.googlesource.com/external/github.com/llvm/llvm-project/',
  'llvm_revision': '3c51ea3619e488db19cd26840ed46d58cfc7062f',

  'lldb_eval_url': 'https://chromium.googlesource.com/external/github.com/google/lldb-eval.git',
  'lldb_eval_revision': 'e87123a7e639bf1d86f24c37079570fb7fa00b72',

  # ninja CIPD package version.
  # https://chrome-infra-packages.appspot.com/p/infra/3pp/tools/ninja
  'ninja_version': 'version:3@1.12.1.chromium.4',

  # Chrome version used for tests. It should be regularly updated to
  # match the Canary version listed here:
  # https://googlechromelabs.github.io/chrome-for-testing/last-known-good-versions.json
  'chrome': '144.0.7529.0',

  # 'magic' text to tell depot_tools that git submodules should be accepted but
  # but parity with DEPS file is expected.
  'SUBMODULE_MIGRATION': 'True',

  # condition to allowlist deps for non-git-source processing.
  'non_git_source': 'True',

  # siso CIPD package version
  'siso_version': 'git_revision:03ee208f9c31a303e1ba61f9bc7219158078bd50',
}

# Only these hosts are allowed for dependencies in this DEPS file.
# If you need to add a new host, contact chrome infrastructure team.
allowed_hosts = [
  'chromium.googlesource.com',
  'chrome-infra-packages.appspot.com',

  # TODO(b/337061377): Move into a separate allowed gcs bucket list.
  'chromium-nodejs',
]

deps = {
  'third_party/clang-format/script': {
    'url': Var('clang_format_url') + '@' + Var('clang_format_revision'),
    'condition': 'build_with_chromium == False',
  },
  'third_party/cmake': {
    'packages': [{
      'package': 'infra/3pp/tools/cmake/${{platform}}',
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
        'package': 'gn/gn/windows-amd64',
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
        'version': 'version:3@0.25.1.chromium.2',
      }
    ],
    'dep_type': 'cipd',
    'condition': 'non_git_source',
  },

  'build': {
    'url': Var('build_url') + '@' + Var('build_revision'),
    'condition': 'build_with_chromium == False',
  },
  'third_party/siso': {
    'packages': [
      {
        'package': 'build/siso/${{platform}}',
        'version': Var('siso_version'),
      }
    ],
    'dep_type': 'cipd',
    'condition': 'not build_with_chromium and host_cpu != "s390" and host_os != "zos" and host_cpu != "ppc"',
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
  # Pull down Node binaries for WebUI toolchain.
  'third_party/node/linux': {
    'dep_type': 'gcs',
    'condition': 'host_os == "linux" and build_with_chromium == False and non_git_source',
    'bucket': 'chromium-nodejs',
    'objects': [
        {
            'object_name': '13c495c7b8852692422e68653099facad6a3d425',
            'sha256sum': 'f1becee9a78f65a094d17f9116727069aab5b235d4c9977346dbf8251a66a5db',
            'size_bytes': 53542258,
            'generation': 1763149321909425,
            'output_file': 'node-linux-x64.tar.gz',
        },
    ],
  },
  'third_party/node/mac': {
      'dep_type': 'gcs',
      'condition': 'host_os == "mac" and build_with_chromium == False and host_cpu != "arm64" and non_git_source',
      'bucket': 'chromium-nodejs',
      'objects': [
          {
              'object_name': 'aaffe24f139215b5f4246f69ef4eefbf400956be',
              'sha256sum': '3700dbc193716375d8194de89ea95cc188e96f68323211fe121291b7b750cef9',
              'size_bytes': 49538953,
              'generation': 1763149314039529,
              'output_file': 'node-darwin-x64.tar.gz',
          },
      ],
  },
  'third_party/node/mac_arm64': {
      'dep_type': 'gcs',
      'condition': 'host_os == "mac" and build_with_chromium == False and host_cpu == "arm64" and non_git_source',
      'bucket': 'chromium-nodejs',
      'objects': [
          {
              'object_name': '1db2bd673e8633aa5e9450caa0e8f2c4702feb7e',
              'sha256sum': '986782630c04122e0fee18127761e67cec0649ff9dd8c51d9e681773cec421cc',
              'size_bytes': 48345481,
              'generation': 1763149317950559,
              'output_file': 'node-darwin-arm64.tar.gz',
          },
      ],
  },
  "scripts/ai_assistance/suite/outputs": {
    "dep_type": "gcs",
    'condition': 'checkout_ai_evals == True',
    "bucket": "chrome-devtools-ai-evals",
    "objects": [
      {
        "object_name": "8aaaea341cac9e6dad90a0685f4eeae39fabb9f655761eed9c3af16795a40f14",
        "sha256sum": "c2e5b18a77095451dbaae27cea913aace1fc267e8e9e0f0b4f297a6215eb5299",
        "size_bytes": 6801,
        "generation": 1756718606230139
      }
    ]
  },
  'third_party/node/win': {
      'dep_type': 'gcs',
      'condition': 'host_os == "win" and build_with_chromium == False and non_git_source',
      'bucket': 'chromium-nodejs',
      'objects': [
          {
              'object_name': '486cafc97d0ef0947aed77c0d258d1a5606455c4',
              'sha256sum': 'f13ac3ca23248dc389507e8fe38c34489ab7edb3e6d6700eb6da6a0b7e128eaf',
              'size_bytes': 89894400,
              'generation': 1763149326202934,
              'output_file': 'node.exe',
          },
      ],
  },
}

hooks = [
  {
    # Ensure that the DEPS'd "depot_tools" has its self-update capability
    # disabled.
    'name': 'disable_depot_tools_selfupdate',
    'pattern': '.',
    'condition': 'build_with_chromium == False',
    'action': [
        'vpython3',
        'third_party/depot_tools/update_depot_tools_toggle.py',
        '--disable',
    ],
  },

  # Pull Chrome binaries from CfT buckets.
  {
    'name': 'download_chrome_win',
    'pattern': '.',
    'condition': 'host_os == "win" and build_with_chromium == False',
    'action': [ 'vpython3',
                'scripts/deps/download_chrome.py',
                '--url=https://storage.googleapis.com/chrome-for-testing-public/' + Var('chrome') + '/win64/chrome-win64.zip',
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
    'action': [ 'vpython3',
                'scripts/deps/download_chrome.py',
                '--url=https://storage.googleapis.com/chrome-for-testing-public/' + Var('chrome') + '/mac-x64/chrome-mac-x64.zip',
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
    'action': [ 'vpython3',
                'scripts/deps/download_chrome.py',
                '--url=https://storage.googleapis.com/chrome-for-testing-public/' + Var('chrome') + '/mac-arm64/chrome-mac-arm64.zip',
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
    'action': [ 'vpython3',
                'scripts/deps/download_chrome.py',
                '--url=https://storage.googleapis.com/chrome-for-testing-public/' + Var('chrome') + '/linux64/chrome-linux64.zip',
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
    'action': ['vpython3', 'build/util/lastchange.py',
               '-o', 'build/util/LASTCHANGE'],
  },
  {
    'name': 'emscripten',
    'pattern': '.',
    'condition': 'build_with_chromium == False',
    'action': ['vpython3', 'scripts/deps/download_emscripten.py', Var('emscripten_tag'), 'third_party/emscripten-releases'],
  },
  {
    'name': 'VS Code settings',
    'pattern': '.',
    'condition': 'build_with_chromium == False',
    'action': [
      'vpython3',
      'third_party/node/node.py',
      '--output',
      # Silence the "Importing JSON modules" warning
      '--no-warnings=ExperimentalWarning',
      'scripts/deps/sync-vscode-settings.mjs'
    ]
  },
  {
    'name': 'configure_siso',
    'pattern': '.',
    'condition': 'build_with_chromium == False',
    'action': ['python3',
               'build/config/siso/configure_siso.py',
               '--rbe_instance',
               'projects/rbe-chrome-untrusted/instances/default_instance',
               ],
  },
]

recursedeps = [
  'build',
  'buildtools',
]
