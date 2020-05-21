export const DW = {};

DW.abilities = {
  "str": "DW.AbilityStr",
  "dex": "DW.AbilityDex",
  "con": "DW.AbilityCon",
  "int": "DW.AbilityInt",
  "wis": "DW.AbilityWis",
  "cha": "DW.AbilityCha"
};

DW.debilities = {
  "str": "DW.DebilityStr",
  "dex": "DW.DebilityDex",
  "con": "DW.DebilityCon",
  "int": "DW.DebilityInt",
  "wis": "DW.DebilityWis",
  "cha": "DW.DebilityCha"
};

export class DwClassList {
  static async getClasses() {
    // Build the tags list.
    let classes = game.items.entities.filter(item => item.type == 'class');
    for (let c of game.packs) {
      if (c.metadata.entity && c.metadata.entity == 'Item' && c.metadata.name == 'classes') {
        let items = await c.getContent();
        classes = classes.concat(items);
      }
    }
    // Reduce duplicates.
    let charClassNames = [];
    for (let charClass of classes) {
      let charClassName = charClass.data.name;
      if (charClassNames.includes(charClassName) !== false) {
        classes = classes.filter(item => item._id != charClass._id);
      }
      else {
        charClassNames.push(charClassName);
      }
    }

    // Sort the charClassNames list.
    charClassNames.sort((a, b) => {
      const aSort = a.toLowerCase();
      const bSort = b.toLowerCase();
      if (aSort < bSort) {
        return -1;
      }
      if (aSort > bSort) {
        return 1;
      }
      return 0;
    });

    return charClassNames;
  }
}