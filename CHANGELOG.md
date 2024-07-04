# 1.8.0

Release notes: https://github.com/asacolips-projects/dungeonworld/releases/tag/1.8.0

- Added Foundry v12 support
- Removed Foundry v11 support

# 1.7.2

Release notes: https://github.com/asacolips-projects/dungeonworld/releases/tag/1.7.2

- Fixed various bugs related to enriched text fields.

# 1.7.1

## Bug Fixes

- #125: Fixed warnings related to obsolete localizations on actor and item types.
- #118: Fixed bug where damage tags on equipped weapons (ex: 1 piercing) would appear on non-weapon items when sent to chat. Also fixed a bug where tags on items weren't appearing on chat messages.
- #121: Fixed bug where tags on NPCs didn't appear on their damage rolls.
- #122: Updated nightmode setting to force refresh the window when saving changes.
- #123: Fixed bug where encumbrance color coding wasn't present on nightmode.

# 1.7.0

## Features

- Added compatibility for Foundry v11.
- Updated DE localization.
- Added Ukrainian localization.
- Added Italian localization.
- Added price to equipment sheet.
- Added equipment toggle feature.
- Added class viewer (next to class name on character sheet) to view class details without having to level up.
- Updated damage calculations to account for +damage tags.
- Updated icons in compendiums.
- Updated dark mode to default its value based on browser's preference.

## Bug Fixes

- Fixed issue with drag and drop behaviors of moves on the character sheet.
- Fixed issue with hotbar drag and drop.
- Clarified localizations for bond and ask moves.
- Fixed typos in GM screen journals.

# 1.6.2

## Bug Fixes

- #101: Fixed an issue where toolbar icons in TinyMCE weren't visible when using the nightmode sheet.
- #106: Fixed an issue where the combat tracker didn't render correctly, which was preventing combatants from being added to it.
- #108: Updated the ASK dialog to use localized ability score names.
- Updated the spanish translation (thanks to @mickypardo)