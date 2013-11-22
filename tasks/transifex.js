
module.exports = function(grunt) {
  grunt.registerMultiTask("transifex", "Grunt task that downloads string translations for Transifex", function() {
    /* Should log project slug and any options in Gruntfile */
    console.log(this.target);
    console.log(this.flags);
    console.log(this.options());
  });
};
