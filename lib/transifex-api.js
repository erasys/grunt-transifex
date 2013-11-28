
var request = require('request'),
    grunt = require('grunt'),
    credentials = require('./credentials'),
    async = require('async'),
    _ = require('underscore'),
    path = require('path');

var Api = module.exports = function(options) {
  this.options = options;

  _.bindAll(this, "availableResources", "resourceDetails",
                  "prepareRequests", "fetchStrings", "writeLanguageFiles");
};

Api.prototype.request = function(/*...elements*/) {
  return {
    url: [this.options.endpoint].concat(Array.prototype.splice.call(arguments, 0)).join('/'),
    auth: this.options.credentials,
    json: true
  };
};

/* Fetches the project's resource slugs from Transifex
 * Unfortunately, a separate call is needed to get the available
 * language codes of each resource.  See below */
Api.prototype.availableResources = function(callback) {
  var self = this;

  request(this.request("project", this.options.project, "resources"),
  function(err, response, body) {
    /* handle errors */
    if (err) return callback(err);
    if (response.statusCode === 401) {
      return credentials.delete(function() {
        callback(new Error("Invalid Transifex crendentials. Aborting."));
      });
    }
    if (response.statusCode === 404) {
      return callback(new Error("Project slug " + self.options.project + " not found. Aborting."));
    }

    return callback(null, _.pluck(body, "slug"));
  });
};

/* Map each resource slug fetched above to a list
 * of its available language codes */
Api.prototype.resourceDetails = function(resources, callback) {
  var self = this;

  async.map(resources, function(resource, step) {
    request(self.request("project", self.options.project, "resource", resource+"?details"),
      function(err, response, body) { step(err, body); });
  }, function(err, details) {
    var codes = details.map(function(d) {
      return {
        source: d.source_language_code,
        codes: _.pluck(d.available_languages, "code")
      };
    });
    callback(err, _.object(resources, codes));
  });
};

/* Match resource slugs and language codes obtained above
 * with the info in this.options and setup a list
 * of requests for fetching tranlation strings */
Api.prototype.prepareRequests = function(availableResources, callback) {
  var self = this;

  var resources = this.options.resources === "*" ? Object.keys(availableResources) : this.options.resources;
  callback(null, resources.reduce(function(requests, slug) {
    if (typeof availableResources[slug] === "undefined") {
      grunt.log.warn("Resource", slug, "not found. Skipping.");
    } else {
      var codes = self.options.languages === "*" ? availableResources[slug].codes : self.options.languages;
      codes.forEach(function(code) {
        if (!_.contains(availableResources[slug].codes, code)) {
          grunt.log.warn("Language", code, "not found for resource", slug, ". Skipping.");
          return;
        }

        requests.push( {
          uri: ["project", self.options.project, "resource", slug, "translation", code, "strings"].join('/'),
          slug: slug,
          code: code,
          isSource: code === availableResources[slug].source
        } );
      });
    }

    return requests;
  }, []));
};

/* Execute the requests obtained above
 *
 * Filters the language strings according to the
 * 'reviewed' options flag before handing back the
 * results */
Api.prototype.fetchStrings = function(requests, callback) {
  var self = this;

  async.map(requests, function(req, step) {
    request(self.request(req.uri), function(err, response, body) {
      delete req.uri;
      req.strings = (!self.options.reviewed || req.isSource) ? body : body.filter(function(s) {return s.reviewed;});
      step(err, req);
    });
  }, callback);
};

/* Applies 'templateFn' to each of the string bundles obtained
 * in the previous step, then flushes the result into a JSON language
 * file */
Api.prototype.writeLanguageFiles = function(strings, callback) {
  var self = this;

  strings.forEach(function(s) {
    var pathParts = self.options.filename.split('/'),
        filename = pathParts.pop(),
        targetDir = path.join.apply(path, [self.options.targetDir].concat(pathParts)).replace('_lang_', s.code).replace('_resource_', s.slug),
        filepath = path.join(targetDir, filename).replace('_lang_', s.code).replace('_resource_', s.slug);

    // Make sure that the resource target directory exists
    grunt.file.mkdir(targetDir);

    // write file
    // discard keys with empty translations
    var transformed = self.options.templateFn(s.strings.filter(function(s) { return s.translation !== ""; }));
    grunt.file.write(filepath, transformed);
    grunt.log.ok("Successfully downloaded", s.slug, "|", s.code, "strings into", filepath);
  });

  callback();
};
