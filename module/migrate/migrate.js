export class MigrateDw {

  static runMigration() {
    // Retrieve the version.
    let version = game.settings.get('dungeonworld', 'systemMigrationVersion');

    // Update 1: Assign basic/special moves on actors.
    if (version < 1) {
      this.updateSpecialMoves();
      version++;
      game.settings.set('dungeonworld', 'systemMigrationVersion', version);
    }
  }

  static async updateSpecialMoves() {
    const basicMoves = [
      'Aid or Interfere',
      'Parley',
      'Defend',
      'Defy Danger',
      'Discern Realities',
      'Hack & Slash',
      'Spout Lore',
      'Volley'
    ];

    const specialMoves = [
      'Bolster',
      'Carouse',
      'Encumbrance',
      'End of Session',
      'Last Breath',
      'Level Up',
      'Make Camp',
      'Outstanding Warrants',
      'Recover',
      'Recruit',
      'Supply',
      'Take Watch',
      'Undertake A Perilous Journey'
    ];

    // Query actors.
    let actors = game.actors.filter(a => a.data.type == 'character');
    for (let actor of actors) {
      // Query moves on this actor.
      let items = actor.items.filter(i => i.data.type == 'move');
      // Iterate through each move and update them as needed.
      for (let item of items) {
        let moveType = null;

        // Basic moves.
        if (basicMoves.includes(item.data.name)) {
          moveType = 'basic';
        }
        // Special moves.
        else if (specialMoves.includes(item.data.name)) {
          moveType = 'special';
        }

        // If this is a valid move, update it.
        if (moveType) {
          await actor.updateEmbeddedEntity("OwnedItem", {
            _id: item._id,
            name: item.name,
            data: {
              moveType: moveType
            }
          });
        }
      }
    }

  }

}
