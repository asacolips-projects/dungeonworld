/**
 * A simple and flexible system for world-building using an arbitrary collection of character and item attributes
 * Author: Atropos
 * Software License: GNU GPLv3
 */

// Import Modules
import { DW } from "./config.js";
import { DwClassList } from "./config.js";
import { ActorDw } from "./actor/actor.js";
import { ItemDw } from "./item/item.js";
import { DwItemSheet } from "./item/item-sheet.js";
import { DwActorSheet } from "./actor/actor-sheet.js";
import { DwActorNpcSheet } from "./actor/actor-npc-sheet.js";
import { DwClassItemSheet } from "./item/class-item-sheet.js";
import { DwRegisterHelpers } from "./handlebars.js";
import { DwUtility } from "./utility.js";

/* -------------------------------------------- */
/*  Foundry VTT Initialization                  */
/* -------------------------------------------- */

Hooks.once("init", async function() {
  console.log(`Initializing Dungeon World!`);

  game.dungeonworld = {
    ActorDw,
    ItemDw,
    rollItemMacro,
    DwUtility,
  };

	/**
	 * Set an initiative formula for the system
	 * @type {String}
	 */
  CONFIG.Combat.initiative = {
    formula: "1d20",
    decimals: 2
  };

  CONFIG.DW = DW;
  CONFIG.Actor.entityClass = ActorDw;
  CONFIG.Item.entityClass = ItemDw;

  // Register sheet application classes
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("dungeonworld", DwActorSheet, {
    types: ['character'],
    makeDefault: true
  });
  Actors.registerSheet("dungeonworld", DwActorNpcSheet, {
    types: ['npc'],
    makeDefault: true
  });
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("dungeonworld", DwItemSheet, { makeDefault: false });
  Items.registerSheet("dungeonworld", DwClassItemSheet, {
    types: ['class'],
    makeDefault: true
  });

  DwRegisterHelpers.init();
});

Hooks.once("ready", async function() {
  // Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
  Hooks.on("hotbarDrop", (bar, data, slot) => createDwMacro(data, slot));

  DW.classlist = await DwClassList.getClasses();
  CONFIG.DW = DW;

  // Add a lang class to the body.
  const lang = game.settings.get('core', 'language');
  $('html').addClass(`lang-${lang}`);
});

/* -------------------------------------------- */
/*  Foundry VTT Setup                           */
/* -------------------------------------------- */

/**
 * This function runs after game data has been requested and loaded from the servers, so entities exist
 */
Hooks.once("setup", function() {

  // Localize CONFIG objects once up-front
  const toLocalize = [
    "abilities", "debilities"
  ];
  for (let o of toLocalize) {
    CONFIG.DW[o] = Object.entries(CONFIG.DW[o]).reduce((obj, e) => {
      obj[e[0]] = game.i18n.localize(e[1]);
      return obj;
    }, {});
  }
});

/* -------------------------------------------- */
/*  Actor Updates                               */
/* -------------------------------------------- */
Hooks.on('createActor', (actor, options, id) => {
  console.log(actor);
  if (actor.data.type == 'character') {
    actor.setFlag('dungeonworld', 'levelup', true);
  }
});

Hooks.on('preUpdateActor', (actor, data, options, id) => {
  if (actor.data.type == 'character') {
    if (data.data && data.data.attributes && data.data.attributes.level) {
      console.log('You\'re ready to level up!');
      actor.setFlag('dungeonworld', 'levelup', true);
    }
  }
});

/* -------------------------------------------- */
/*  Hotbar Macros                               */
/* -------------------------------------------- */

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {Object} data     The dropped data
 * @param {number} slot     The hotbar slot to use
 * @returns {Promise}
 */
async function createDwMacro(data, slot) {
  if (data.type !== "Item") return;
  if (!("data" in data)) return ui.notifications.warn("You can only create macro buttons for owned Items");
  const item = data.data;

  // Create the macro command
  const command = `game.dungeonworld.rollItemMacro("${item.name}");`;
  let macro = game.macros.entities.find(m => (m.name === item.name) && (m.command === command));
  if (!macro) {
    macro = await Macro.create({
      name: item.name,
      type: "script",
      img: item.img,
      command: command,
      flags: { "dungeonworld.itemMacro": true }
    });
  }
  game.user.assignHotbarMacro(macro, slot);
  return false;
}

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {string} itemName
 * @return {Promise}
 */
function rollItemMacro(itemName) {
  const speaker = ChatMessage.getSpeaker();
  let actor;
  if (speaker.token) actor = game.actors.tokens[speaker.token];
  if (!actor) actor = game.actors.get(speaker.actor);
  const item = actor ? actor.items.find(i => i.name === itemName) : null;
  if (!item) return ui.notifications.warn(`Your controlled Actor does not have an item named ${itemName}`);

  // Trigger the item roll
  // if ( item.data.type === "spell" ) return actor.useSpell(item);
  return item.roll();
}