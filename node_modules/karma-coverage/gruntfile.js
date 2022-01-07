module.exports = function (grunt) {
  grunt.loadNpmTasks('grunt-npm')
  grunt.loadNpmTasks('grunt-karma')
  grunt.initConfig({
    pkgFile: 'package.json',
    'npm-contributors': {
      options: {
        commitMessage: 'chore: update contributors'
      }
    },
    karma: {
      coffee: {
        configFile: 'examples/coffee/karma.conf.coffee'
      },
      coffeeRequireJS: {
        configFile: 'examples/coffee-requirejs/karma.conf.coffee'
      }
    }
  })
}
