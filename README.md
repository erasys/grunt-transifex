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