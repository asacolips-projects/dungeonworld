/**
 * A simple and flexible system for world-building using an arbitrary collection of character and item attributes
 * Author: Atropos
 * Software License: GNU GPLv3
 */

// Import Modules
import { DwItemSheet } from "./item-sheet.js";
import { DwActorSheet } from "./actor-sheet.js";

/* -------------------------------------------- */
/*  Foundry VTT Initialization                  */
/* -------------------------------------------- */

Hooks.once("init", async function () {
  console.log(`Initializing Dungeon World!`);

	/**
	 * Set an initiative formula for the system
	 * @type {String}
	 */
  CONFIG.Combat.initiative = {
    formula: "1d20",
    decimals: 2
  };

  // Register sheet application classes
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("dungeonworld", DwActorSheet, { makeDefault: true });
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("dungeonworld", DwItemSheet, { makeDefault: true });
});
