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
      // Ability modifiers.
      if (abl.value >= 18) {
        abl.mod = 3;
      }
      else if (abl.value > 15) {
        abl.mod = 2;
      }
      else if (abl.value > 12) {
        abl.mod = 1;
      }
      else if (abl.value > 8) {
        abl.mod = 0;
      }
      else if (abl.value > 5) {
        abl.mod = -1;
      }
      else if (abl.value > 3) {
        abl.mod = -2;
      }
      else {
        abl.mod = -3;
      }
      abl.label = CONFIG.DW.abilities[a];
      abl.debilityLabel = CONFIG.DW.debilities[a];
      // Adjust mod based on debility.
      if (abl.debility) {
        abl.mod -= 1;
      }
    }
  }
}