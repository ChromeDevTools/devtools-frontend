versions = {"beta": "7390", "stable": "7339", "extended": "7339"}

# Define the last branch that needs to use an old recipe and the cipd version
# of that recipe that the branch will use.
legacy_recipe = struct(branch = "7000", old_cipd_version = "git_revision:ce78c08a2f4ca17af910af0b662677b1e05c2037")
