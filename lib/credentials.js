
var _ = require('underscore'),
    inquirer = require('inquirer'),
    grunt = require('grunt');


/** Wrap a synchronous Grunt method (e.g grunt.file.readJSON)
 * in try...catch block which notifies of error via callback */
var wrapGrunt = function(f, callback) {
  try { callback(null, f()); } catch (e) { callback(e); }
};

var CREDENTIALS_FILE = ".transifexrc";

/* Read credentials from .transifexrc or
 * ask for them on an interactive prompt */
exports.read = function(callback) {

  wrapGrunt(grunt.file.readJSON.bind(grunt.file, CREDENTIALS_FILE), function(err, creds) {
    if (!err && !_.isEmpty(creds)) {
      return callback(null, creds);
    }

    grunt.log.warn('Credentials not found in', CREDENTIALS_FILE, '! Please provide working Transifex credentials:');
    inquirer.prompt([{
      name: 'user',
      type: 'input',
      message: 'Transifex username'
    }, {
      name: 'pass',
      type: 'password',
      message: 'Transifex password'
    }], function(creds) {
      grunt.log.ok('Saving credentials to', CREDENTIALS_FILE);
      grunt.file.write(CREDENTIALS_FILE, JSON.stringify(creds));
      callback(null, creds);
    });
  });
};

/** Delete ~/.transifexrc
 * Happens when stored credentials are not valid */
exports.delete = function(callback) {
  wrapGrunt( grunt.file.delete.bind(grunt.file, CREDENTIALS_FILE), callback );
};
