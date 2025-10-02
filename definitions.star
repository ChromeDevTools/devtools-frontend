versions = {"beta": "7444", "stable": "7390", "extended": "7339"}

# Define the last branch that needs to use an old recipe and the cipd version
# of that recipe that the branch will use.
# Select the desired recipe version from https://chrome-infra-packages.appspot.com/p/infra/recipe_bundles/chromium.googlesource.com/chromium/tools/build .
legacy_recipe = struct(branch = "7444", old_cipd_version = "git_revision:7e910d1f8e870191d963d5150710e844131e6ed6")
