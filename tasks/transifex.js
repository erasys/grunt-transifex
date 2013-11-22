
module.exports = function(grunt) {
  grunt.registerMultiTask("transifex", "Grunt task that downloads string translations from Transifex", function() {
    /* Extend given options with some defaults */
    this.options = this.options({
      resources: '*',
      languages: '*'
    });

    if (!this.options.targetDir) {
      grunt.fatal("Please provide 'targetDir' option");
    }

    /* Should log project slug and any options in Gruntfile */
    console.log("Project slug:", this.target);
    console.log("Flags:", this.flags);
    console.log("Options:", this.options);
  });
};
