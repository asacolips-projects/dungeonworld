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
import { preloadHandlebarsTemplates } from "./templates.js";
import { DwUtility } from "./utility.js";
import { CombatSidebarDw } from "./combat/combat.js";
import { MigrateDw } from "./migrate/migrate.js";

import * as chat from "./chat.js";

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
    MigrateDw,
  };

  // TODO: Extend the combat class.
  // CONFIG.Combat.entityClass = CombatDw;

  CONFIG.DW = DW;
  CONFIG.Actor.documentClass = ActorDw;
  CONFIG.Item.documentClass = ItemDw;

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

  let combatDw = new CombatSidebarDw();
  combatDw.startup();

  /**
   * Track the system version upon which point a migration was last applied
   */
  game.settings.register("dungeonworld", "systemMigrationVersion", {
    name: "System Migration Version",
    scope: "world",
    config: false,
    type: Number,
    default: 0
  });

  // Configurable system settings.
  game.settings.register("dungeonworld", "xpFormula", {
    name: game.i18n.localize("DW.Settings.xpFormula.name"),
    hint: game.i18n.localize("DW.Settings.xpFormula.hint"),
    scope: "world",
    config: true,
    type: String,
    default: "@attributes.level.value + 7"
  });

  game.settings.register("dungeonworld", "advForward", {
    name: game.i18n.localize("DW.Settings.advForward.name"),
    hint: game.i18n.localize("DW.Settings.advForward.hint"),
    scope: 'world',
    config: true,
    type: Boolean,
    default: false
  });

  // TODO: Remove this setting.
  game.settings.register("dungeonworld", "itemIcons", {
    name: game.i18n.localize("DW.Settings.itemIcons.name"),
    hint: game.i18n.localize("DW.Settings.itemIcons.hint"),
    scope: 'client',
    config: false,
    type: Boolean,
    default: true
  });

  game.settings.register("dungeonworld", "enableDamageButtons", {
    name: game.i18n.localize("DW.Settings.enableDamageButtons.name"),
    hint: game.i18n.localize("DW.Settings.enableDamageButtons.hint"),
    scope: 'world',
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register("dungeonworld", "nightmode", {
    name: game.i18n.localize("DW.Settings.nightmode.name"),
    hint: game.i18n.localize("DW.Settings.nightmode.hint"),
    scope: 'client',
    config: true,
    type: Boolean,
    default: false
  });

  game.settings.register("dungeonworld", "alignmentSingle", {
    name: game.i18n.localize("DW.Settings.alignmentSingle.name"),
    hint: game.i18n.localize("DW.Settings.alignmentSingle.hint"),
    scope: 'world',
    config: true,
    type: String,
    default: ''
  });

  game.settings.register("dungeonworld", "alignmentPlural", {
    name: game.i18n.localize("DW.Settings.alignmentPlural.name"),
    hint: game.i18n.localize("DW.Settings.alignmentPlural.hint"),
    scope: 'world',
    config: true,
    type: String,
    default: ''
  });

  game.settings.register("dungeonworld", "raceSingle", {
    name: game.i18n.localize("DW.Settings.raceSingle.name"),
    hint: game.i18n.localize("DW.Settings.raceSingle.hint"),
    scope: 'world',
    config: true,
    type: String,
    default: ''
  });

  game.settings.register("dungeonworld", "racePlural", {
    name: game.i18n.localize("DW.Settings.racePlural.name"),
    hint: game.i18n.localize("DW.Settings.racePlural.hint"),
    scope: 'world',
    config: true,
    type: String,
    default: ''
  });

  game.settings.register("dungeonworld", "bondSingle", {
    name: game.i18n.localize("DW.Settings.bondSingle.name"),
    hint: game.i18n.localize("DW.Settings.bondSingle.hint"),
    scope: 'world',
    config: true,
    type: String,
    default: ''
  });

  game.settings.register("dungeonworld", "bondPlural", {
    name: game.i18n.localize("DW.Settings.bondPlural.name"),
    hint: game.i18n.localize("DW.Settings.bondPlural.hint"),
    scope: 'world',
    config: true,
    type: String,
    default: ''
  });

  game.settings.register("dungeonworld", "noAbilityScores", {
    name: game.i18n.localize("DW.Settings.noAbilityScores.name"),
    hint: game.i18n.localize("DW.Settings.noAbilityScores.hint"),
    scope: 'world',
    config: true,
    type: Boolean,
    default: false
  });

  game.settings.register("dungeonworld", "noAbilityIncrease", {
    name: game.i18n.localize("DW.Settings.noAbilityIncrease.name"),
    hint: game.i18n.localize("DW.Settings.noAbilityIncrease.hint"),
    scope: 'world',
    config: true,
    type: Boolean,
    default: false
  });

  game.settings.register("dungeonworld", "noConstitutionToHP", {
    name: game.i18n.localize("DW.Settings.noConstitutionToHP.name"),
    hint: game.i18n.localize("DW.Settings.noConstitutionToHP.hint"),
    scope: 'world',
    config: true,
    type: Boolean,
    default: false
  });

  game.settings.register("dungeonworld", "flatXPLevelUp", {
    name: game.i18n.localize("DW.Settings.flatXPLevelUp.name"),
    hint: game.i18n.localize("DW.Settings.flatXPLevelUp.hint"),
    scope: 'world',
    config: true,
    type: Number,
    default: 0
  });

  DwUtility.replaceRollData();

  // Preload template partials.
  preloadHandlebarsTemplates();
});

Hooks.once("ready", async function() {
  // Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
  Hooks.on("hotbarDrop", (bar, data, slot) => createDwMacro(data, slot));

  DW.classlist = await DwClassList.getClasses();
  CONFIG.DW = DW;

  // Add a lang class to the body.
  const lang = game.settings.get('core', 'language');
  $('html').addClass(`lang-${lang}`);

  // Run migrations.
  MigrateDw.runMigration();

  // Update config.
  for (let [k,v] of Object.entries(CONFIG.DW.rollResults)) {
    CONFIG.DW.rollResults[k].label = game.i18n.localize(v.label);
  }

  // Add nightmode class.
  CONFIG.DW.nightmode = game.settings.get('dungeonworld', 'nightmode') ?? false;

  // Handle sockets.
  game.socket.on('system.dungeonworld', (data) => {
    if (!game.user.isGM) {
      return;
    }

    // Update chat cards.
    if (data?.message && data?.content) {
      let message = game.messages.get(data.message);
      message.update({'content': data.content});
    }

    // Update the move counter if a player made a move. Requires a GM account
    // to be logged in currently for the socket to work. If GM account is the
    // one that made the move, that happens directly in the actor update.
    if (data?.combatantUpdate) {
      game.combat.updateEmbeddedDocuments('Combatant', Array.isArray(data.combatantUpdate) ? data.combatantUpdate : [data.combatantUpdate]);
      ui.combat.render();
    }
  });
});

Hooks.on('createChatMessage', async (message, options, id) => {
  if (message?.data?.roll) {
    // Limit this to a single user.
    let firstGM = game.users.find(u => u.active && u.role == CONST.USER_ROLES.GAMEMASTER);
    if (!game.user.isGM || game.user.id !== firstGM.id) return;
    // Exit early if this is a rollable table.
    if (message?.data?.flags?.core?.RollTable) return;
    // Retrieve the roll.
    let r = Roll.fromJSON(message.data.roll);
    // Re-render the roll.
    r.render().then(rTemplate => {
      // Render the damage buttons.
      renderTemplate(`systems/dungeonworld/templates/parts/chat-buttons.html`, {}).then(buttonTemplate => {
        if (message.data?.flags?.dungeonworld?.damageButtons) return;
        // Update the chat message with the appended buttons.
        message.update({
          content: rTemplate + buttonTemplate,
          'flags.dungeonworld.damageButtons': true,
        })
        // Update the chat log scroll position.
          .then(m => {
            let chatLog = document.querySelector('#chat-log');
            chatLog.scrollTop = chatLog.scrollHeight;
          });
      })
    });
  }
});

Hooks.on('renderChatMessage', (app, html, data) => {
  // Determine visibility.
  let chatData = app.data;
  const whisper = chatData.whisper || [];
  const isBlind = whisper.length && chatData.blind;
  const isVisible = (whisper.length) ? game.user.isGM || whisper.includes(game.user.id) || (!isBlind) : true;
  if (!isVisible) {
    html.find('.dice-formula').text('???');
    html.find('.dice-total').text('?');
    html.find('.dice-tooltip').remove();
  }

  chat.displayChatActionButtons(app, html, data);
});

Hooks.on('renderChatLog', (app, html, data) => chat.activateChatListeners(html));
Hooks.on('renderChatPopout', (app, html, data) => chat.activateChatListeners(html));

/* -------------------------------------------- */
/*  Foundry VTT Setup                           */
/* -------------------------------------------- */

/**
 * This function runs after game data has been requested and loaded from the servers, so documents exist
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
Hooks.on('createActor', async (actor, options, id) => {
  // Prepare updates object.
  let updates = {};

  // Allow the character to levelup up when their level changes.
  if (actor.data.type == 'character') {
    await actor.setFlag('dungeonworld', 'levelup', true);


    // Get the item moves as the priority.
    let moves = game.items.filter(i => i.type == 'move' && (i.data.data.moveType == 'basic' || i.data.data.moveType == 'special'));
    let pack = game.packs.get(`dungeonworld.basic-moves`);
    let compendium = [];
    let actorMoves = [];
    compendium = pack ? await pack.getDocuments() : [];
    actorMoves = actor.items.filter(i => i.type == 'move');

    // Get the compendium moves next.
    let moves_compendium = compendium.filter(m => {
      const notTaken = actorMoves.filter(i => i.name == m.data.name);
      return notTaken.length < 1;
    });
    // Append compendium moves to the item moves.
    let moves_list = moves.map(m => {
      return m.data.name;
    })
    for (let move of moves_compendium) {
      if (!moves_list.includes(move.data.name)) {
        moves.push(move);
        moves_list.push(move.data.name);
      }
    }

    // Sort the moves and build our groups.
    moves.sort((a, b) => {
      const aSort = a.data.name.toLowerCase();
      const bSort = b.data.name.toLowerCase();
      if (aSort < bSort) {
        return -1;
      }
      if (aSort > bSort) {
        return 1;
      }
      return 0;
    });

    // Add default look.
    updates['data.details.look'] = game.i18n.localize('DW.DefaultLook');

    // Link the token.
    updates['token.actorLink'] = true;
    updates['token.bar1'] = { attribute: 'attributes.hp' };
    updates['token.bar2'] = { attribute: 'attributes.xp' };
    updates['token.displayBars'] = 20;
    updates['token.disposition'] = 1;

    // Add to the actor.
    const movesToAdd = moves.map(m => duplicate(m));
    await actor.createEmbeddedDocuments('Item', movesToAdd, {});
  }

  if (actor.data.type == 'npc') {
    updates['token.bar1'] = { attribute: 'attributes.hp' };
    updates['token.bar2'] = { attribute: null };
    updates['token.displayBars'] = 20;
    updates['token.disposition'] = -1;
  }

  if (updates && Object.keys(updates).length > 0) {
    await actor.update(updates);
  }
});

// Update the item list on new item creation.
Hooks.on('createItem', async (item, options, id) => {
  if (item.data.type == 'equipment') {
    DwUtility.getEquipment(true);
  }
})

Hooks.on('preUpdateActor', (actor, data, options, id) => {
  if (actor.data.type == 'character') {
    // Allow the character to levelup up when their level changes.
    if (data.data && data.data.attributes && data.data.attributes.level) {
      if (data.data.attributes.level.value > actor.data.data.attributes.level.value) {
        actor.setFlag('dungeonworld', 'levelup', true);
      }
    }
  }
});

/* -------------------------------------------- */
/*  Level Up Listeners                          */
/* -------------------------------------------- */
Hooks.on('renderDialog', (dialog, html, options) => {
  // If this is the levelup dialog, we need to add listeners to it.
  if (dialog.data.id && dialog.data.id == 'level-up') {
    // If an ability score is chosen, we need to update the available options.
    html.find('.cell--ability-scores select').on('change', () => {
      // Build the list of selected score values.
      let scores = [];
      html.find('.cell--ability-scores select').each((index, item) => {
        let $self = $(item);
        const val = parseInt($self.val())
        if (!isNaN(val)) {
          scores.push(val);
        } else {
          const val = parseInt($self.find('option:selected').val())
          if (!isNaN(val)) {
            scores.push(val);
          }
        }
      });
      // Loop over the list again, disabling invalid options.
      html.find('.cell--ability-scores select').each((index, item) => {
        let $self = $(item);
        // Loop over the options in the select to get the possible value counts
        const valueCounts = {}
        $self.find('option').each((opt_index, opt_item) => {
          const $opt = $(opt_item);
          const val = parseInt($opt.attr('value'));
          if (valueCounts[val]) {
            valueCounts[val] ++
          } else {
            valueCounts[val] = 1
          }
        })
        // Loop over the options in the select.
        $self.find('option').each((opt_index, opt_item) => {
          let $opt = $(opt_item);
          let val = parseInt($opt.attr('value'));
          const noAbilityScores = game.settings.get('dungeonworld', 'noAbilityScores');
          if (!isNaN(val)) {
            if (noAbilityScores) {
              const alreadySelected = scores.filter(v => v == val) || [];
              if (alreadySelected.length >= valueCounts[val]) {
                $opt.attr('disabled', true);
              } else {
                $opt.attr('disabled', false);
              }
            } else {
              if (scores.includes(val) && $self.val() != val) {
                $opt.attr('disabled', true);
              } else {
                $opt.attr('disabled', false);
              }
            }
          }
        });
      });
    })
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
  let macro = game.macros.find(m => (m.name === item.name) && (m.command === command));
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
