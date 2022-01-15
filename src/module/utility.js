export class DwUtility {
  static cleanClass(string) {
    //Lower case everything
    string = string.toLowerCase();
    //Make alphanumeric (removes all other characters)
    string = string.replace(/[^a-z0-9\s]/g, "");
    //Convert whitespaces and underscore to dash
    string = string.replace(/[\s\_]/g, "-");
    //Clean up multiple dashes or whitespaces
    string = string.replace(/[\s\-]+/g, "-");
    return string;
  };

  static isEmpty(arg) {
    return [null, false, undefined, 0, ''].includes(arg);
  }

  static async getEquipment(update = false) {
    if (typeof game.items == 'undefined') {
      return false;
    }

    // Cache results.
    if (game.dungeonworld.equipment && !update) {
      return game.dungeonworld.equipment;
    }

    // Load new results.
    let items = game.items.filter(i => i.type == 'equipment');
    for (let pack of game.packs) {
      if (pack.metadata.name.includes('equipment')) {
        if (pack) {
          items = items.concat(await pack.getDocuments());
        }
      }
    }

    game.dungeonworld.equipment = items;

    return items;
  }

  static getRollFormula(defaultFormula = '2d6') {
    // TODO: Add support for adv/dis/ongoing/forward.
    return defaultFormula;
  }

  static getAbilityMod(abilityScore, force=false) {
    const noAbilityScores = game.settings.get('dungeonworld', 'noAbilityScores');
    if (noAbilityScores && !force) {
      return abilityScore
    }
    let abilityMod = 0;

    if (abilityScore >= 18) {
      abilityMod = 3;
    }
    else if (abilityScore > 15) {
      abilityMod = 2;
    }
    else if (abilityScore > 12) {
      abilityMod = 1;
    }
    else if (abilityScore > 8) {
      abilityMod = 0;
    }
    else if (abilityScore > 5) {
      abilityMod = -1;
    }
    else if (abilityScore > 3) {
      abilityMod = -2;
    }
    else {
      abilityMod = -3;
    }

    return abilityMod;
  }

  static getAbilityScore(abilityMod, force=false) {
    const noAbilityScores = game.settings.get('dungeonworld', 'noAbilityScores');
    if (noAbilityScores && !force) {
      return abilityScore
    }

    let abilityScore = 0;

    if (abilityMod >= 3) {
      abilityScore = 18;
    }
    else if (abilityMod == 2) {
      abilityScore = 16;
    }
    else if (abilityMod == 1) {
      abilityScore = 13;
    }
    else if (abilityMod == 0) {
      abilityScore = 9;
    }
    else if (abilityMod == -1) {
      abilityScore = 8;
    }
    else if (abilityMod == -2) {
      abilityScore = 5;
    }
    else {
      abilityScore = 3;
    }

    return abilityScore;
  }

  static getProgressCircle({ current = 100, max = 100, radius = 16 }) {
    let circumference = radius * 2 * Math.PI;
    let percent = current < max ? current / max : 1;
    let percentNumber = percent * 100;
    let offset = circumference - (percent * circumference);
    let strokeWidth = 4;
    let diameter = (radius * 2) + strokeWidth;
    let colorClass = Math.round((percent * 100) / 10) * 10;

    return {
      radius: radius,
      diameter: diameter,
      strokeWidth: strokeWidth,
      circumference: circumference,
      offset: offset,
      position: diameter / 2,
      color: 'red',
      class: colorClass,
    };
  }

  static replaceRollData() {
    /**
     * Override the default getRollData() method to add abbreviations for the
     * abilities and attributes properties.
     */
    const original = Actor.prototype.getRollData;
    Actor.prototype.getRollData = function() {
      // Use the actor by default.
      let actor = this;

      // Use the current token if possible.
      // TODO: Confirm this works.
      if (typeof canvas.tokens !== 'undefined') {
        let token = canvas.tokens.controlled.find(t => t.id == this.id);
        if (token) {
          actor = token.actor;
        }
      }

      const data = original.call(actor);

      // Re-map all attributes onto the base roll data
      let newData = mergeObject(data.attributes, data.abilities);
      delete data.init;
      for (let [k, v] of Object.entries(newData)) {
        switch (k) {
          // case 'level':
          //   data.lvl = v.value;
          //   break;

          default:
            if (!(k in data)) {
              v.val = v.value;
              // delete v.value;
              data[k] = v;
            }
            break;
        }
      }

      // Old syntax shorthand.
      data.attr = data.attributes;
      data.abil = data.abilities;
      return data;
    };
  }

  static async loadCompendia(slug) {

    const compendium = []

    const noCompendiumAutoData = game.settings.get('dungeonworld', 'noCompendiumAutoData');
    if (!noCompendiumAutoData) {
      const pack_id = `dungeonworld.${slug}`;
      const pack = game.packs.get(pack_id);
      compendium.push(...(pack ? await pack.getDocuments() : []));
    }

    const compendiumPrefix = game.settings.get('dungeonworld', 'compendiumPrefix');
    if (compendiumPrefix != '') {
      const pack_id = `${compendiumPrefix.toLowerCase()}-${slug}`;
      const pack = game.packs.find(p => {return p.metadata?.name?.indexOf(pack_id) >= 0});
      compendium.push(...(pack ? await pack.getDocuments() : []));
    }

    return compendium

  }
}
