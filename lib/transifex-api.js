var request = require('request'),
  grunt = require('grunt'),
  credentials = require('./credentials'),
  async = require('async'),
  _ = require('underscore'),
  path = require('path'),
  readline = require('readline');

var Api = module.exports = function(options) {
  this.options = options;

  _.bindAll(this, "availableResources", "resourceDetails",
    "prepareRequests", "fetchStrings", "writeLanguageFiles", "uploadLanguageFiles");
};

Api.prototype.request = function( /*...elements*/ ) {
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

      return callback(null, body);
    });
};

/* Map each resource slug fetched above to a list
 * of its available language codes */
Api.prototype.resourceDetails = function(resources, callback) {
  var self = this;

  async.map(resources, function(resource, step) {
    request(self.request("project", self.options.project, "resource", resource.slug + "?details"),
      function(err, response, body) {
        step(err, body);
      });
  }, function(err, details) {
    var codes = details.map(function(d) {
      return {
        source: d.source_language_code,
        codes: _.difference(_.pluck(d.available_languages, "code"), self.options.skipLanguages),
        name: d.name
      };
    });
    callback(err, _.object(_.pluck(resources, 'slug'), codes));
  });
};

/* Match resource slugs and language codes obtained above
 * with the info in this.options and setup a list
 * of requests for fetching tranlation strings */
Api.prototype.prepareRequests = function(availableResources, callback) {
  var self = this;

  var resources = this.options.resources === "*" ? Object.keys(availableResources) : this.options.resources;

  if (_.isArray(this.options.skipResources)) {
    resources = _.difference(resources, this.options.skipResources);
  }

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

        var uri = "";

        if (self.options.mode === "file") {
          uri = ["project", self.options.project, "resource", slug, "translation", code].join('/').concat('?file=true');
        } else {
          uri = ["project", self.options.project, "resource", slug, "translation", code, "strings"].join('/');
        }

        requests.push({
          uri: uri,
          slug: slug,
          code: code,
          name: availableResources[slug].name,
          isSource: code === availableResources[slug].source
        });
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
      req.strings = (!self.options.reviewed || req.isSource) ? body : body.filter(function(s) {
        return s.reviewed;
      });
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
      originalResourceName = s.name.replace(/\.[^/.]+$/, "").replace(/\_[^/_]+$/, ""), // remove extension and language code
      targetDir = path.join.apply(path, [self.options.targetDir].concat(pathParts)).replace('_lang_', s.code),
      filepath = path.join(targetDir, filename).replace('_lang_', s.code);

    // Using slug loses case
    if (self.options.useSlug) {
      targetDir = targetDir.replace('_resource_', s.slug);
      filepath = filepath.replace('_resource_', s.slug);
    } else {
      targetDir = targetDir.replace('_resource_', originalResourceName);
      filepath = filepath.replace('_resource_', originalResourceName);
    }


    // Make sure that the resource target directory exists
    grunt.file.mkdir(targetDir);

    // write file
    // discard keys with empty translations
    var transformed = '';
    if (self.options.mode === "file") {
      transformed = s.strings;
    } else {
      transformed = self.options.templateFn(s.strings.filter(function(s) {
        return s.translation !== "";
      }));
    }

    grunt.file.write(filepath, transformed);
    grunt.log.ok("Successfully downloaded", s.slug, "|", s.code, "strings into", filepath);
  });

  callback();
};

/*
 * Upload all files, figure out which are existing and which aren't, divert to the right apis
 *       */
Api.prototype.uploadLanguageFiles = function(existingResources, callback) {
  var i, l, j, m,
    self = this,
    files = [],
    existingFiles = [],
    newFiles = [],
    rl = readline.createInterface(process.stdin, process.stdout),
    colorOptions;

  grunt.verbose.writeln('Hitting uploadLanguageFiles with existingResources: ', existingResources);
  // Gather up files to be uploaded/updated
  if (this.options.resources === "*") {
    // grab all form resourceDir
    files = [];
    grunt.file.recurse(self.options.resourceDir, function(abspath, rootdir, subdir, filename) {
        if (filename.indexOf(self.options.extension) > -1) {
            files.push(filename);
        } else {
            grunt.verbose.writeln('Rejecting this file for not having the right extension: ', filename);
        }
    });
  } else {
    // use the ones passed in
    files = this.options.resources;
  }
  grunt.verbose.writeln('Files were considering', files);

  // we only want to upload source language files
  files = _.reject(files, function(name) {
    var match = name.match(/_[a-z]{2}/);
    return _.isArray(match) ? (match[0] !== '_' + self.options.sourceLanguage) : false;
  });
  grunt.verbose.writeln('Files after kicking out translations', files);

  // split in existingFiles & newFiles
  for (i = 0, l = files.length; i < l; i++) {
    var file = files[i];
    var found = false;
    for (j = 0, m = existingResources.length; j < m; j++) {
      var existingResource = existingResources[j];

      if (file === existingResource.name) {
        existingFiles.push(existingResource);
        found = true;
        break;
      }
    }

    if (!found) {
      newFiles.push(file);
    }
  }

  colorOptions = {
    // The separator string (can be colored).
    separator: ', ',
    // The array item color (specify false to not colorize).
    color: 'red'
  };

  // confirm this is what we want as uploading can be destructive
  grunt.log.writeln('');
  grunt.log.writeln('---------------------------------------------');
  grunt.log.writeln('Source files to be overwritten on transifex: ', grunt.log.wordlist(_.pluck(existingFiles, 'name'), colorOptions));
  grunt.log.writeln('New source files to be uploaded to transifex: ', grunt.log.wordlist(newFiles, colorOptions));
  grunt.log.writeln('---------------------------------------------');
  grunt.log.writeln('');


  rl.question("Please confirm the above is what you want to do. yes/[no]: ", function(answer) {
    if (answer === 'yes') {
      grunt.log.writeln('Uploading...');
      rl.close();
      self.uploadExistingLanguageFiles(existingFiles);
      self.uploadNewLanguageFiles(newFiles);
    } else {
      grunt.log.writeln('Canceled!');
      rl.close();
    }
  });
};

/*
 * Upload new files to transifex
 *       */
Api.prototype.uploadNewLanguageFiles = function(files) {
  var i, l, self = this,
    resource,
    contents,
    options,
    fileName;

  for (i = 0, l = files.length; i < l; i++) {
    fileName = files[i];
    resource = self.options.resourceDir + '/' + fileName;
    grunt.verbose.writeln('setting up uploading of new file ', resource);

    contents = grunt.file.read(resource);

    options = {
      url: self.options.endpoint + '/project/' + self.options.project + '/resources/',
      auth: self.options.credentials,
      header: {
        "Content-Type": "application/json"
      },
      json: {
        name: fileName,
        slug: fileName.substring(0, fileName.lastIndexOf('.')), // use filename as new slug
        content: contents,
        i18n_type: self.options.type
      }
    };
    grunt.log.writeln('Uploading new file ', fileName);

    request.post(options, function(error, response, body) {
      grunt.verbose.writeln('upload error: ', error);
//      grunt.verbose.writeln('upload response: ', response);
      grunt.verbose.writeln('upload statusCode: ', response.statusCode);
      grunt.verbose.writeln('upload body: ', body);

      if (!error && response.statusCode === 201) {
        grunt.log.writeln('Successfully uploaded to ' + response.req.path, 'Status: ' + response.statusMessage);
      } else {
        grunt.log.writeln('Failed to upload ', 'Status: ' + response.statusMessage, 'Error: ', error);
      }
    });

  }
};


/*
 * Upload updated existing files
 *       */
Api.prototype.uploadExistingLanguageFiles = function(files) {
  var i, l, self = this,
    resource,
    fileName,
    slug,
    contents,
    options,
    url;

  for (i = 0, l = files.length; i < l; i++) {
    fileName = files[i].name;
    slug = files[i].slug;
    resource = self.options.resourceDir + '/' + fileName;
    url = self.options.endpoint + '/project/' + self.options.project + '/resource/' + slug + '/content';
    grunt.verbose.writeln('setting up uploading of existing file ', resource, ' using slug name ' + slug);

    contents = grunt.file.read(resource);

    options = {
      url: url,
      auth: self.options.credentials,
      header: {
        "Content-Type": "application/json"
      },
      json: {
        content: contents,
        i18n_type: self.options.type
      }
    };
    grunt.log.writeln('Uploading existing file ', fileName);


    request.put(options, function(error, response, body) {
      grunt.verbose.writeln('upload error: ', error);
//      grunt.verbose.writeln('upload response: ', response);
      grunt.verbose.writeln('upload body: ', body);
      grunt.verbose.writeln('upload response statusCode: ', response.statusCode);

      if (!error && response.statusCode === 200) {
        grunt.log.writeln('Successfully uploaded to ' + response.req.path, 'Status: ' + response.statusMessage);
      } else {
        grunt.log.writeln('Failed to upload ', 'Status: ' + response.statusMessage, 'Error: ', error);
      }
    });

  }
};
