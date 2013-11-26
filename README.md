# grunt-transifex

Provides a Grunt task that downloads translation strings from Transifex into your project.

## Usage

`Gruntfile.js` shows some configuration examples.  The plugin is configured by adding a `transifex` section into the Grunt config:

```javascript
    transifex: {
      "ios-ready": {
        options: {
          targetDir: "./translations/ios-ready", // download specified resources / langs only
          resources: ["localizable_enstrings"],
          languages: ["en_US", "fr"]
        }
      },
      "new-admintool": {
        options: {
          targetDir: "./translations/admintool-i18n" // download all available resources in all languages
        }
      }
    }
```

This configuration enables running the `transifex` Grunt task on the command line.  The following shows a sample of possible usage cases:


```bash  
   grunt transifex:ios-ready
     --> Downloads reviewed & non-reviewed strings for resource 'localizable_enstrings' for languages
        'en_US' and 'fr'
   grunt transifex:ios-ready:reviewed
     --> Same as above, but downloads reviewed strings only
  
   grunt transifex
     --> Downloads reviewed & non-reviewed strings for all configured Transifex projects
   grunt transifex::reviewed
     --> Same as above, but downloads reviewed strings only
```


## Transifex credentials

When the plugin is run for the first time, it will prompt the user for a Transifex username and password.
It will store this information in a `.transifexrc` file created in the current directory. 

On subsequent executions, the user won't be prompted again. Transifex credentials will be read from `.transifexrc`


## Usage in the live system

On the live system, a cronjob will be launching this plugin in order to regularly update translation files.
It relies on a `Gruntfile.js` located in `/var/www/files/script/transifex`. 

This `Gruntfile` must hold the description of all project slugs / resource slugs / language codes that might need to be handled on the live system.

The cron script is just doing this:

```bash
pushd /var/www/script/transifex
npm install
node_modules/grunt-cli/bin/grunt transifex::reviewed
popd
```

The cron script installs the `grunt-transifex` plugin from a specific Git tag, so pushing changes to `master` won't jeopardize any fonctionnality on the live system.
