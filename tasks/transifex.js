var async = require('async'),
  _ = require('underscore'),
  credentials = require('../lib/credentials'),
  Transifex = require('../lib/transifex-api');

module.exports = function(grunt) {
  grunt.registerMultiTask("transifex", "Grunt task that downloads string translations from Transifex", function() {
    var self = this;

    /* Extend given options with some defaults */
    this.options = this.options({
      resources: '*',
      skipResources: [],
      languages: '*',
      skipLanguages: [],
      endpoint: 'http://www.transifex.com/api/2',
      project: this.target,
      reviewed: this.flags.reviewed,
      mode: "json",
      useSlug: true,
      filename: "_resource_/_lang_.json",
      templateFn: function(strings) {
        return JSON.stringify(_.object(_.pluck(strings, "key"), _.pluck(strings, "translation")));
      }
    });

    /** Attempt to create target directory
     * and fail if it doesn't work */
    if (!this.options.targetDir) {
      grunt.fatal("Please provide 'targetDir' option");
    }
    grunt.file.mkdir(this.options.targetDir);

    /** Ensure we find some Transifex credentials
     * then do the main work */
    var done = this.async();
    credentials.read(function(err, creds) {
      self.options.credentials = creds;
      var api = new Transifex(self.options);

      async.waterfall([
        api.availableResources,
        api.resourceDetails,
        api.prepareRequests,
        api.fetchStrings,
        api.writeLanguageFiles
      ], done);
    });
  });

  grunt.registerMultiTask("transifex-upload", "Grunt task that uploads new and existing translation files to Transifex", function() {
    var self = this;
    grunt.log.writeln('hits task ok')
      /* Extend given options with some defaults */
    this.options = this.options({
      resources: '*',
      sourceLanguage: '', // assumes no _en extension for source. use "en" to match with a specific extension
      endpoint: 'http://www.transifex.com/api/2',
      project: this.target,
      reviewed: this.flags.reviewed,
      mode: "json",
      type: "UNICODEPROPERTIES",
      extension: 'properties'
    });

    if (!this.options.resourceDir) {
      grunt.fatal("Please provide 'resourceDir' option");
    }

    /** Ensure we find some Transifex credentials
     * then do the main work */
    var done = this.async();
    credentials.read(function(err, creds) {
      self.options.credentials = creds;
      var api = new Transifex(self.options);

      async.waterfall([
        api.availableResources,
        api.uploadLanguageFiles
      ], done);
    });
  });
};
