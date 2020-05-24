import { DwUtility } from '../utility.js';

/**
 * Extends the basic Actor class for Dungeon World.
 * @extends {Actor}
 */
export class ActorDw extends Actor {
  /**
   * Augment the basic actor data with additional dynamic data.
   */
  prepareData() {
    super.prepareData();

    const actorData = this.data;
    const data = actorData.data;
    const flags = actorData.flags;

    if (actorData.type === 'character') this._prepareCharacterData(actorData);
  }

  /**
   * Prepare Character type specific data
   */
  _prepareCharacterData(actorData) {
    const data = actorData.data;

    // Ability Scores
    for (let [a, abl] of Object.entries(data.abilities)) {
      // TODO: This is a possible formula, but would require limits on the
      // upper and lower ends.
      // abl.mod = Math.floor(abl.value * 0.4 - (abl.value < 11 ? 3.4 : 4.2));

      // Ability modifiers.
      abl.mod = DwUtility.getAbilityMod(abl.value);
      // Add labels.
      abl.label = CONFIG.DW.abilities[a];
      abl.debilityLabel = CONFIG.DW.debilities[a];
      // Adjust mod based on debility.
      if (abl.debility) {
        abl.mod -= 1;
      }
    }
  }
}