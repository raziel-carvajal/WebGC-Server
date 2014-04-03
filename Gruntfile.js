module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    linter: {
      options: {
        log: './logs/<%= pkg.name %>.log'
      },
      files: ['lib/*.js']
    }
  });

  // Load the plugin that provides the "uglify" task.
  grunt.loadNpmTasks('grunt-linter');

  // Default task(s).
  grunt.registerTask('default', ['linter']);
};
