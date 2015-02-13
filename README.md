# grunt-transifex

Provides a Grunt task that downloads translation strings from Transifex into your project using the [Transifex API](http://support.transifex.com/customer/portal/topics/440186-api/articles).

This fork adds a couple of config options to the original grunt plugin by erasys
* skipResources: if you want all expect a couple of resources 
* skipLanguages: if the list of languages you don't want is shorter than the list you do want
* useSlug: The original plugin uses the slug for name, which loses capitalization. For example, if the uploaded files was uploadedFile.properties, the japanese download could be uploadedfile_ja.properties. Setting useSlug to false is able to spit out uploadedFile_ja.properties.

## Usage

`Gruntfile.js` shows some configuration examples.  The plugin is configured by adding a `transifex` section into the Grunt config:

```javascript
    transifex: {
      "ios-ready": {
        options: {
          project: "rrportal"                            // your transifect project
          targetDir: "./translations/ios-ready",         // download specified resources / langs only
          resources: ["localizable_enstrings"],
          skipResources: ["unusedproperties"],           // useful for "all resources except these couple". In "slug" format
          languages: ["en_US", "fr"],
          skipLanguages: ["en"],                         // useful for "all languages but english"
          useSlug: false,                                // instead of using tx slug, try to use the orignal uploaded file for resource
          filename : "_resource_-_lang_.json",
          templateFn: function(strings) { return ...; }  // customize the output file format (see below)
        }
      },
      "new-admintool": {
        options: {
          targetDir: "./translations/admintool-i18n"     // download all available resources in all languages
          									              // using the default filename layout: _resource_/_lang_.json
        }
      }
    }
```

You can configure several projects: the `transifex` task will process each one of them in series.

This configuration enables running the `transifex` Grunt task on the command line.  The following shows a sample of possible usage scenarios:


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

Translated strings will saved into plain JSON if you use the default output configuration:

```json
{
	"key_welcome": "Bienvenue",
	"key_register": "Enregistrez-vous!"
}
```

## Transifex credentials

When the plugin runs for the first time, it will prompt the user for a Transifex username and password.
It will store this information in a `.transifexrc` file created in the current directory.

On subsequent executions, the user won't be prompted again. Transifex credentials will be read from `.transifexrc`

## Advanced customization

Using the `templateFn` hook function in Grunt's `transifex` configuration section, you can customize the output file format to anything you want.

This function operates on the [Transifex strings API](http://support.transifex.com/customer/portal/articles/1026117-translation-strings-api) output array.
