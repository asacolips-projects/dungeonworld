![Foundry v11.315](https://img.shields.io/badge/Foundry-v11.315-green)

## Install

You can find Dungeon World in the Foundry VTT package listing.

To install manually, use this manifest link:

https://asacolips-artifacts.s3.amazonaws.com/dungeonworld/latest/system.json

## Features

- Character sheets for characters and monsters/npcs
- Rollable ability scores, moves, and spells
- Various roll types for moves, including prompts to choose what ability score to use
- Areas to track forward, hold, ongoing, and one custom resource
- Max health and load calculations (can be overridden)
- Weight tracking
- Character builder for easily creating and leveling up characters
- Macrobar support for moves and spells
- Compendiums for the core book's basic moves, class moves, and class spells
- Ability to override included moves or classes, and to create custom moves, classes, and tags

## Languages

- English (default)
- French
- German
- Spanish

## Screenshots

### Character Sheet
![character sheet](https://mattsmithin.nyc3.digitaloceanspaces.com/assets/dw-0.3.0.png)

### Character Builder
![character builder](https://mattsmithin.nyc3.digitaloceanspaces.com/assets/dw-0.3.0-character-builder.png)

### Level Up
![level up](https://mattsmithin.nyc3.digitaloceanspaces.com/assets/dw-0.3.0-level-up.png)

### Combat Tracker
![combat tracker](https://gitlab.com/asacolips-projects/foundry-mods/dungeonworld/uploads/e3ff32b9c9e94c0dd57aeffa7e679e28/image.png)

## Contributing

This project is accepting issue reports and code merge requests! See the [CONTRIBUTING.MD](https://gitlab.com/asacolips-projects/foundry-mods/dungeonworld/-/blob/master/CONTRIBUTING.md) page for details.

### Translations

If you would like to contribute translations directly to the system, they're written using YAML and are under `src/yaml/lang`, and the repo includes build tools to convert them back into JSON. If you prefer writing in JSON, you can convert from JSON to YAML at https://www.json2yaml.com/

### Building the system from source

To build the system from source, you'll need to have node 12 or higher installed so that you can use npm and gulp. Changes made to either the `dist` directory or `system.json` in the root of this repo will be lost when building; you should instead edit the source files within `src`. Of particular note is that the system.json, template.json, and lang files are all originally written in Yaml format for an easier to read and work with syntax. You should make your changes there and build their json equivalents with npm.

### Running builds

To make a new dist build, run the following commands:

```bash
npm install
npm run build
```

Once the build has been completed, you can either copy/paste the dist directory's contents into `<foundryData>/systems/dungeonworld/` or you can symlink the dist directory to that location using your operating system's respective commands for it.

In addition, there are other commands for individual tasks, such as `npm run yaml` for compiling the yaml > json assets only.

### CSS

This project uses SCSS for generating its CSS. This can also be compiled via `npm run build`.

## Hack Modules

- [Homebrew World](https://gitlab.com/mangofeet/homebrew-world-module)

## Licensing

All HTML, CSS, and JS is licensed under the [MIT license](https://gitlab.com/asacolips-projects/foundry-mods/dungeonworld/-/raw/master/LICENSE.txt).

Token artwork created by [Forgotten Adventures](https://www.forgotten-adventures.net/). Support them on [Patreon](https://www.patreon.com/forgottenadventures)!

Compendium content is licensed under the Creative Commons Attribution 3.0 Unported License. To view a copy of this license, visit http://creativecommons.org/licenses/by/3.0/ or send a letter to Creative Commons, 444 Castro Street, Suite 900, Mountain View, California, 94041, USA.

In addition, the compendium content uses the OPEN GAME LICENSE Version 1.0a. See the [LICENSE-COMPENDIUM.txt](https://gitlab.com/asacolips-projects/foundry-mods/dungeonworld/-/raw/master/LICENSE-COMPENDIUM.txt) file for additional details.

