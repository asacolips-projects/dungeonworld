// Example of how to import compendium content.
async function importDwTags(content) {
  // Reference a Compendium pack by it's callection ID
  const pack = game.packs.find(p => p.collection === `dungeonworld.tags`);

  // Create temporary Actor entities which impose structure on the imported data
  Item.createMany(content, { temporary: true }).then(items => {
    // Save each temporary Actor into the Compendium pack
    for (let i of items) {
      pack.importEntity(i);
      console.log(`Imported Item ${i.name} into Compendium pack ${pack.collection}`);
    }
  });
}

// Load an external JSON data file which contains data for import
const content = [
  { "name": "Applied", "type": "tag" },
  { "name": "Awkward", "type": "tag" },
  { "name": "+1 ongoing", "type": "tag" },
  { "name": "-1 ongoing", "type": "tag" },
  { "name": "+1 forward", "type": "tag" },
  { "name": "-1 forward", "type": "tag" },
  { "name": "Dangerous", "type": "tag" },
  { "name": "Ration", "type": "tag" },
  { "name": "Requires", "type": "tag" },
  { "name": "Slow", "type": "tag" },
  { "name": "Touch", "type": "tag" },
  { "name": "Two-handed", "type": "tag" },
  { "name": "Worn", "type": "tag" },
  { "name": "Forceful", "type": "tag" },
  { "name": "Ignores Armor", "type": "tag" },
  { "name": "Messy", "type": "tag" },
  { "name": "Precise", "type": "tag" },
  { "name": "Reload", "type": "tag" },
  { "name": "Stun", "type": "tag" },
  { "name": "Thrown", "type": "tag" },
  { "name": "Hand", "type": "tag" },
  { "name": "Close", "type": "tag" },
  { "name": "Reach", "type": "tag" },
  { "name": "Near", "type": "tag" },
  { "name": "Far", "type": "tag" },
  { "name": "Clumsy", "type": "tag" }
];

importDwTags(content);