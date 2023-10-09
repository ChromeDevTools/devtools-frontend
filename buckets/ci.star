load(
    "//lib/builders.star",
    "builder",
    "builder_descriptor",
    "config_section",
    "default_timeout",
    "defaults",
    "dimensions",
    "generate_ci_configs",
)
load("//definitions.star", "versions")

defaults.build_numbers.set(True)

def branch_section(name):
    return config_section(
        name = name,
        branch = "refs/heads/chromium/%s" % versions[name],
        notifiers = ["devtools notifier"],
        priority = 50,
    )

generate_ci_configs(
    configurations = [
        config_section(
            name = "ci",
            branch = "refs/heads/main",
            view = "Main",
            name_suffix = "",
            notifiers = ["devtools tree closer"],
            priority = 30,  # default
        ),
        config_section(
            name = "chromium",
            repo = "https://chromium.googlesource.com/chromium/src",
            branch = "refs/heads/main",
            name_suffix = " (chromium)",
            builder_group = "chromium.devtools-frontend",
            notifiers = ["devtools tree closer"],
            priority = 30,  # default
        ),
        config_section(
            name = "sequential",
            branch = "refs/heads/main",
            view = "Sequential",
            name_suffix = "",
            priority = 60,
        ),
        config_section(
            name = "shuffled",
            branch = "refs/heads/main",
            view = "Shuffled",
            name_suffix = "",
            priority = 60,
        ),
        branch_section("beta"),
        branch_section("stable"),
        branch_section("extended"),
    ],
    builders = [
        builder_descriptor(
            name = "DevTools Linux",
            recipe_name = "chromium_integration",
            consoles = ["ci", "chromium"],
            execution_timeout = 2 * time.hour,
        ),
        builder_descriptor(
            name = "DevTools Linux Fastbuild",
            recipe_name = "chromium_integration",
            consoles = ["ci"],
            execution_timeout = 2 * time.hour,
            description_html = """
This is the same with <a href="https://ci.chromium.org/p/devtools-frontend/builders/ci/DevTools%20Linux">
DevTools Linux</a> but has devtools_skip_typecheck=True.""",
        ),
        builder_descriptor(
            name = "Stand-alone Linux",
            recipe_name = "devtools/devtools-frontend",
            consoles = ["ci"],
            properties = {"parallel": True},
        ),
        builder_descriptor(
            name = "Stand-alone Linux",
            recipe_name = "devtools/devtools-frontend",
            consoles = ["beta", "stable", "extended"],
            execution_timeout = time.hour * 3 / 2,
            properties = {"parallel": False},
        ),
        builder_descriptor(
            name = "Stand-alone Sequential Linux",
            recipe_name = "devtools/devtools-frontend",
            consoles = ["sequential"],
            execution_timeout = time.hour * 3 / 2,
            properties = {"parallel": False},
        ),
        builder_descriptor(
            name = "Stand-alone Shuffled Parallel Linux",
            recipe_name = "devtools/devtools-frontend",
            consoles = ["shuffled"],
            properties = {"parallel": True},
        ),
        builder_descriptor(
            name = "Stand-alone Win",
            recipe_name = "devtools/devtools-frontend",
            consoles = ["ci"],
            dims = dimensions.win10,
            properties = {"parallel": True},
        ),
        builder_descriptor(
            name = "Stand-alone Win",
            recipe_name = "devtools/devtools-frontend",
            consoles = ["beta", "stable", "extended"],
            dims = dimensions.win10,
            execution_timeout = time.hour + 15 * time.minute,
            properties = {"parallel": False},
        ),
        builder_descriptor(
            name = "Stand-alone Sequential Win",
            recipe_name = "devtools/devtools-frontend",
            consoles = ["sequential"],
            dims = dimensions.win10,
            execution_timeout = time.hour + 15 * time.minute,
            properties = {"parallel": False},
        ),
        builder_descriptor(
            name = "Linux Compile Debug",
            recipe_name = "devtools/devtools-frontend",
            consoles = ["ci", "beta", "stable", "extended"],
            properties = {"builder_config": "Debug", "parallel": True},
        ),
        builder_descriptor(
            name = "Linux Compile Debug Fastbuild",
            recipe_name = "devtools/devtools-frontend",
            consoles = ["ci"],
            properties = {
                "builder_config": "Debug",
                "devtools_skip_typecheck": True,
            },
            description_html = """
This is the same with <a href="https://ci.chromium.org/p/devtools-frontend/builders/ci/Linux%20Compile%20Debug">
Linux Compile Debug</a> but has devtools_skip_typecheck=True.""",
        ),
        builder_descriptor(
            name = "Linux Compile Full Release",
            recipe_name = "devtools/devtools-frontend",
            consoles = ["ci"],
            properties = {"clobber": True},
            execution_timeout = time.hour * 3 / 2,
        ),
        builder_descriptor(
            name = "Stand-alone Mac",
            recipe_name = "devtools/devtools-frontend",
            dims = dimensions.mac,
            consoles = ["ci"],
            properties = {"parallel": True},
        ),
        builder_descriptor(
            name = "Stand-alone Sequential Mac",
            recipe_name = "devtools/devtools-frontend",
            dims = dimensions.mac,
            consoles = ["sequential"],
            execution_timeout = time.hour * 3 / 2,
            properties = {"parallel": False},
        ),
        builder_descriptor(
            name = "Linux Official",
            recipe_name = "devtools/devtools-frontend",
            consoles = ["ci", "beta", "stable", "extended"],
            properties = {"is_official_build": True},
            notification_muted = True,
            execution_timeout = time.hour * 3 / 2,
        ),
    ],
)
