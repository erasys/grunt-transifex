
module.exports = function(grunt) {

  /* Example configuration */
  grunt.initConfig({
    transifex: {
      "ios-ready": {
        options: {
          project: "rrportal",
          targetDir: "./translations/ios-ready", // download specified resources / langs only
          resources: ["localizable_enstrings"],
          skipResources: ["unusedproperties"],
          languages: ["en", "fr", "en_US"],
          skipLanguages: ["en"],
          useSlug: false                                // instead of using tx slug, try to use the orignal uploaded file for resource
        }
      },
      "new-admintool": {
        options: {
          targetDir: "./translations/admintool-i18n" // download all available resources in all languages
        }
      }
    }
  });

  /* load the actual tasks */
  grunt.loadTasks('tasks');

  /* Example usage on the command-line:
   *
   * grunt transifex:ios-ready
   *   --> Downloads reviewed & non-reviewed strings for resource 'localizable_enstrings' for languages
   *       'en_US' and 'fr'
   * grunt transifex:ios-ready:reviewed
   *   --> Same as above, but downloads reviewed strings only
   *
   * grunt transifex
   *   --> Downloads reviewed & non-reviewed strings for all configured Transifex projects
   * grunt transifex::reviewed
   *   --> Same as above, but downloads reviewed strings only
   */
};
