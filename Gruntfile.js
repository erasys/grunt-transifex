
module.exports = function(grunt) {

  /* Example configuration */
  grunt.initConfig({
    transifex: {
      "project-slug": {
        options: {
          targetDir: "./translations",
          resources: ["general"],
          languages: ["en_US", "fr"]
        }
      },
      "other-project-slug": {
        options: {
          targetDir: "./translations",
          resources: ["*"],
          languages: ["en_US", "fr"]
        }
      }
    }
  });

  /* load the actual tasks */
  grunt.loadTasks('tasks');

  /* Example task mappings */
  grunt.registerTask('devel', ['transifex:project-slug']); // Download *all* strings for project-slug only
  grunt.registerTask('live', ['transifex::reviewed']); // Download *reviewed* strings for all projects
};
