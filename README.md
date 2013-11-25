# grunt-transifex

Provides a Grunt task that downloads translation strings from Transifex into your project.

## Usage

`Gruntfile.js` shows some configuration examples.

## Transifex credentials

When the plugin is run for the first time, it will prompt the user for a Transifex username and password.
It will store this information in a `.transifexrc` file created in the current directory. 

On subsequent executions, the user won't be prompted again. Transifex credentials will be read from `.transifexrc`