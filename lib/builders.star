defaults=struct(
  cipd_package="infra/recipe_bundles/chromium.googlesource.com/chromium/tools/build",
  cipd_version="refs/heads/master",
  swarming_tags=["vpython:native-python-wrapper"],
  repo="https://chromium.googlesource.com/devtools/devtools-frontend",
  favicon="https://storage.googleapis.com/chrome-infra-public/logo/devtools.png",
)

acls=struct(
  readers=acl.entry(
    roles=acl.BUILDBUCKET_READER,
    groups='all',
  ),
)

dimensions=struct(
  ubuntu={
    "os":"Ubuntu-16.04",
  },
  default_ubuntu={
    'host_class':'default',
    'os':'Ubuntu-16.04',
  },
  baremetal_ubuntu={
    "host_class":"baremetal",
    "os":"Ubuntu-16.04",
  },
  win10={
    "cpu":"x86-64",
    "os":"Windows-10",
  }
)

def recipe(
    name,
    cipd_package=defaults.cipd_package,
    cipd_version=defaults.cipd_version):
  """Create recipe declaration with dtf defaults"""
  return luci.recipe(
    name=name,
    cipd_package=cipd_package,
    cipd_version=cipd_version,
  )

def builder(
    recipe_name,
    swarming_tags=defaults.swarming_tags,
    **kvargs):
  """Create builder with dtf defaults"""
  mastername=kvargs.pop('mastername')
  properties=kvargs.pop('properties', {})
  properties.update(mastername=mastername)
  kvargs['properties']=properties
  kvargs['executable']=recipe(recipe_name)

  luci.builder(
    swarming_tags=swarming_tags,
    **kvargs
  )