import { DwUtility } from "../utility.js";

/**
 * Helper class to handle rendering the custom combat tracker.
 */
export class CombatSidebarDw {
  // This must be called in the `init` hook in order for the other hooks to
  // fire correctly.
  startup() {
    // CONFIG.debug.hooks = true;

    // Add support for damage rolls via event delegation.
    Hooks.on('ready', () => {
      // Damage rolls from the combat tracker.
      $('body').on('click', '.dw-rollable', (event) => {
        let $self = $(event.currentTarget);
        let $actorElem = $self.parents('.actor-elem');
        let combatant_id = $actorElem.length > 0 ? $actorElem.attr('data-combatant-id') : null;
        if (combatant_id) {
          let combatant = game.combat.combatants.find(c => c._id == combatant_id);
          let actor = combatant.actor ? combatant.actor : null;
          if (actor) {
            actor._onRoll(event, actor);
          }
        }
      });
    });

    // Re-render combat when actors are modified.
    Hooks.on('updateActor', (actor, data, options, id) => {
      ui.combat.render();
    });

    Hooks.on('updateToken', (scene, token, data, options, id) => {
      ui.combat.render();
    });

    // Update the move counter if a player made a move. Requires a GM account
    // to be logged in currently for the socket to work. If GM account is the
    // one that made the move, that happens directly in the actor update.
    game.socket.on('system.dungeonworld', (data) => {
      if (!game.user.isGM) {
        return;
      }

      if (data.combatantUpdate) {
        game.combat.updateCombatant(data.combatantUpdate);
        ui.combat.render();
      }
    });

    // Pre-roll initiative for new combatants. Because DW doesn't use
    // initiative, set them in increments of 10. However, the system still has
    // initiative formula using a d20, in case the reroll initiative button
    // is used.
    Hooks.on('preCreateCombatant', (combat, combatant, options, id) => {
      if (!combatant.initiative) {
        let highestInit = 0;
        let token = canvas.tokens.get(combatant.tokenId);
        let actorType = token.actor ? token.actor.data.type : 'character';

        // Iterate over actors of this type and update the initiative of this
        // actor based on that.
        combat.combatants.filter(c => c.actor.data.type == actorType).forEach(c => {
          let init = Number(c.initiative);
          if (init >= highestInit) {
            highestInit = init + 10;
          }
        });

        // Update this combatant.
        combatant.initiative = highestInit;
      }
    });

    // TODO: Replace this hack that triggers an extra render.
    Hooks.on('renderSidebar', (app, html, options) => {
      ui.combat.render();
    });

    // When the combat tracker is rendered, we need to completely replace
    // its HTML with a custom version.
    Hooks.on('renderCombatTracker', async (app, html, options) => {
      // Find the combat element, which is where combatants are stored.
      let newHtml = html.find('#combat');
      if (newHtml.length < 1) {
        newHtml = html;
      }

      // If there's as combat, we can proceed.
      if (game.combat) {
        // Retrieve a list of the combatants grouped by actor type and sorted
        // by their initiative count.
        let combatants = this.getCombatantsData();

        // Add a counter for the total number of moves all characters have made.
        let moveTotal = 0;
        if (combatants.character) {
          combatants.character.forEach(c => {
            moveTotal = c.flags.dungeonworld ? moveTotal + Number(c.flags.dungeonworld.moveCount) : moveTotal;
          });
        }

        // Get the custom template.
        let template = 'systems/dungeonworld/templates/combat/combat.html';
        let templateData = {
          combatants: combatants,
          moveTotal: moveTotal
        };

        // Render the template and update the markup with our new version.
        let content = await renderTemplate(template, templateData)
        newHtml.find('#combat-tracker').remove();
        newHtml.find('#combat-round').after(content);

        // Add an event listener for input fields. This is currently only
        // used for updating HP on actors.
        newHtml.find('.ct-item input').change(event => {
          event.preventDefault();

          // Get the incput and actor element.
          const dataset = event.currentTarget.dataset;
          let $input = $(event.currentTarget);
          let $actorRow = $input.parents('.directory-item.actor-elem');

          // If there isn't an actor element, don't proceed.
          if (!$actorRow.length > 0) {
            return;
          }

          // Retrieve the combatant for this actor, or exit if not valid.
          const combatant = game.combat.combatants.find(c => c._id == $actorRow.data('combatant-id'));
          if (!combatant) {
            return;
          }

          const actor = combatant.actor;

          // Check for bad numbers, otherwise convert into a Number type.
          let value = $input.val();
          if (dataset.dtype == 'Number') {
            value = Number(value);
            if (Number.isNaN(value)) {
              $input.val(actor.data.data.attributes.hp.value);
              return false;
            }
          }

          // Prepare update data for the actor.
          let updateData = {};
          // If this started with a "+" or "-", handle it as a relative change.
          let operation = $input.val().match(/^\+|\-/g);
          if (operation) {
            updateData[$input.attr('name')] = Number(actor.data.data.attributes.hp.value) + value;
          }
          // Otherwise, set it absolutely.
          else {
            updateData[$input.attr('name')] = value;
          }

          // Update the actor.
          actor.update(updateData);
          return;
        });

        // Drag handler for the combat tracker.
        if (game.user.isGM) {
          newHtml.find('.directory-item.actor-elem')
            .attr('draggable', true).addClass('draggable')
            // Initiate the drag event.
            .on('dragstart', (event) => {
              // Set the drag data for later usage.
              let dragData = event.currentTarget.dataset;
              event.originalEvent.dataTransfer.setData('text/plain', JSON.stringify(dragData));

              // Store the combatant type for reference. We have to do this
              // because dragover doesn't have access to the drag data, so we
              // store it as a new type entry that can be split later.
              let newCombatant = game.combat.combatants.find(c => c._id == dragData.combatantId);
              event.originalEvent.dataTransfer.setData(`newtype--${dragData.actorType}`, '');
            })
            // Add a class on hover, if the actor types match.
            .on('dragover', (event) => {
              // Get the drop target.
              let $self = $(event.originalEvent.target);
              let $dropTarget = $self.parents('.directory-item');

              // Exit early if we don't need to make any changes.
              if ($dropTarget.hasClass('drop-hover')) {
                return;
              }

              if (!$dropTarget.data('combatant-id')) {
                return;
              }

              // Retrieve the actor type for the drop target, exit early if
              // it doesn't exist.
              let oldType = $dropTarget.data('actor-type');
              let newType = null;

              if (!oldType) {
                return;
              }

              // Retrieve the actor type for the actor being dragged.
              newType = event.originalEvent.dataTransfer.types.find(t => t.includes('newtype'));
              newType = newType ? newType.split('--')[1] : null;

              // If the type matches, add a css class to let the user know this
              // is a valid drop target.
              if (newType == oldType) {
                $dropTarget.addClass('drop-hover');
              }
              // Otherwise, we should exit.
              else {
                return false;
              }

              return false;
            })
            // Remove the class on drag leave.
            .on('dragleave', (event) => {
              // Get the drop target and remove any hover classes on it when
              // the mouse leaves it.
              let $self = $(event.originalEvent.target);
              let $dropTarget = $self.parents('.directory-item');
              $dropTarget.removeClass('drop-hover');
              return false;
            })
            // Update initiative on drop.
            .on('drop', async (event) => {
              // Retrieve the default encounter.
              let combat = game.combat;

              // TODO: This is how foundry.js retrieves the combat in certain
              // scenarios, so I'm leaving it here as a comment in case this
              // needs to be refactored.
              // ---------------------------------------------------------------
              // const view = game.scenes.viewed;
              // const combats = view ? game.combats.entities.filter(c => c.data.scene === view._id) : [];
              // let combat = combats.length ? combats.find(c => c.data.active) || combats[0] : null;

              // Retreive the drop target, remove any hover classes.
              let $self = $(event.originalEvent.target);
              let $dropTarget = $self.parents('.directory-item');
              $dropTarget.removeClass('drop-hover');

              // Attempt to retrieve and parse the data transfer from the drag.
              let data;
              try {
                data = JSON.parse(event.originalEvent.dataTransfer.getData('text/plain'));
                // if (data.type !== "Item") return;
              } catch (err) {
                return false;
              }

              // Retrieve the combatant being dropped.
              let newCombatant = combat.combatants.find(c => c._id == data.combatantId);

              // Retrieve the combatants grouped by type.
              let combatants = this.getCombatantsData(false);
              // Retrieve the combatant being dropped onto.
              let originalCombatant = combatants[newCombatant.actor.data.type].find(c => {
                return c._id == $dropTarget.data('combatant-id');
              });

              // Set the initiative equal to the drop target's initiative.
              let oldInit = originalCombatant ? originalCombatant.initiative : null;

              // If the initiative was valid, we need to update the initiative
              // for every combatant to reset their numbers.
              if (oldInit !== null) {
                // Set the initiative of the actor being draged to the drop
                // target's +1. This will later be adjusted increments of 10.
                let updatedCombatant = combatants[newCombatant.actor.data.type].find(c => c._id == newCombatant._id);
                updatedCombatant.initiative = Number(oldInit) + 1;

                // Loop through all combatants in initiative order, and assign
                // a new initiative in increments of 10. The "updates" variable
                // will be an array of objects iwth _id and initiative keys.
                let updatedInit = 0;
                let updates = combatants[newCombatant.actor.data.type].sort((a, b) => a.initiative - b.initiative).map(c => {
                  let result = {
                    _id: c._id,
                    initiative: updatedInit
                  };
                  updatedInit = updatedInit + 10;
                  return result;
                });

                // If there are updates, update the combatants at once.
                if (updates) {
                  await combat.updateCombatant(updates);
                }
              }
            }); // end of newHtml.find('.directory-item.actor-elem')
        }
      }
    });
  }

  /**
   * Retrieve a list of combatants for the current combat.
   *
   * Combatants will be sorted into groups by actor type. Set the
   * updateInitiative argument to true to reassign init numbers.
   * @param {Boolean} updateInitiative
   */
  getCombatantsData(updateInitiative = false) {
    // If there isn't a combat, exit and return an empty array.
    if (!game.combat || !game.combat.data) {
      return [];
    }

    let currentInitiative = 0;
    // Reduce the combatants array into a new object with keys based on
    // the actor types.
    let combatants = game.combat.data.combatants.reduce((groups, combatant) => {
      // If this is for a combatant that has had its token/actor deleted,
      // remove it from the combat.
      if (!combatant.actor) {
        game.combat.deleteCombatant(combatant._id);
      }
      // Append valid actors to the appropriate group.
      else {
        // Initialize the group if it doesn't exist.
        let group = combatant.actor.data.type;
        if (!groups[group]) {
          groups[group] = [];
        }

        // Retrieve the health bars mode from the token's resource settings.
        let displayBarsMode = Object.entries(CONST.TOKEN_DISPLAY_MODES).find(i => i[1] == combatant.token.displayBars)[0];
        // Assume player characters should always show their health bar.
        let displayHealth = group == 'character' ? true : false;

        // If this is a group other than character (such as NPC), we need to
        // evaluate whether or not this player can see its health bar.
        if (group != 'character') {
          // If the mode is one of the owner options, only the token owner or
          // the GM should be able to see it.
          if (displayBarsMode.includes("OWNER")) {
            if (combatant.owner || game.user.isGM) {
              displayHealth = true;
            }
          }
          // For other modes, always show it.
          else if (displayBarsMode != "NONE") {
            displayHealth = true;
          }
          // If it's set to the none mode, hide it from players, but allow
          // the GM to see it.
          else {
            displayHealth = game.user.isGM ? true : false;
          }

          // If the updateInitiative flag was set to true, recalculate the
          // initiative for each actor while we're looping through them.
          if (updateInitiative) {
            combatant.initiative = currentInitiative;
            currentInitiative = currentInitiative + 10;
          }
        }

        // Set a property based on the health mode earlier.
        combatant.displayHealth = displayHealth;
        // Set a property for whether or not this is editable. This controls
        // whether editabel fields like HP will be shown as an input or a div
        // in the combat tracker HTML template.
        combatant.editable = combatant.owner || game.user.isGM;

        // Build the radial progress circle settings for the template.
        combatant.healthSvg = DwUtility.getProgressCircle({
          current: combatant.actor.data.data.attributes.hp.value,
          max: combatant.actor.data.data.attributes.hp.max,
          radius: 16
        });

        // If this is the GM or the owner, push to the combatants list.
        // Otherwise, only push if the token isn't hidden in the scene.
        if (game.user.isGM || combatant.owner || !combatant.token.hidden) {
          groups[group].push(combatant);
        }
      }

      // Return the updated group.
      return groups;
    }, {});

    // Sort the combatants in each group by initiative.
    for (let [groupKey, group] of Object.entries(combatants)) {
      combatants[groupKey].sort((a, b) => {
        return Number(a.initiative) - Number(b.initiative)
      });
    }

    // Return the list of combatants.
    return combatants;
  }
}
