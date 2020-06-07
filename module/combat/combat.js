import { DwUtility } from "../utility.js";

export class CombatSidebarDw {
  startup() {
    // CONFIG.debug.hooks = true;

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
    // to be logged in currently for the socket to work.
    game.socket.on('system.dungeonworld', (data) => {
      if (!game.user.isGM) {
        return;
      }

      if (data.combatantUpdate) {
        game.combat.updateCombatant(data.combatantUpdate);
        ui.combat.render();
      }
    });

    // Pre-roll initiative for new combatants.
    Hooks.on('preCreateCombatant', (combat, combatant, options, id) => {
      if (!combatant.initiative) {
        let highestInit = 0;
        let token = canvas.tokens.get(combatant.tokenId);
        let actorType = token.actor ? token.actor.data.type : 'character';

        let group = combat.combatants.filter(c => c.actor.data.type == actorType).forEach(c => {
          let init = Number(c.initiative);
          if (init >= highestInit) {
            highestInit = init + 10;
          }
        });

        combatant.initiative = highestInit;
      }
    });

    // TODO: Replace this hack that triggers an extra render.
    Hooks.on('renderSidebar', (app, html, options) => {
      ui.combat.render();
    });

    Hooks.on('renderCombatTracker', async (app, html, options) => {
      if (app.tabName != 'combat') {
        return;
      }

      // html.html('Test!');
      let newHtml = html.find('#combat');
      if (newHtml.length < 1) {
        newHtml = html;
      }

      if (game.combat) {
        let combatants = this.getCombatantsData();
        let moveTotal = 0;

        if (combatants.character) {
          combatants.character.forEach(c => {
            moveTotal = c.flags.dungeonworld ? moveTotal + Number(c.flags.dungeonworld.moveCount) : moveTotal;
          });
        }

        let template = 'systems/dungeonworld/templates/combat/combat.html';
        let templateData = {
          combatants: combatants,
          moveTotal: moveTotal
        };

        let content = await renderTemplate(template, templateData)
        newHtml.find('#combat-tracker').remove();
        newHtml.find('#combat-round').after(content);

        // HP update handler.
        newHtml.find('.ct-item input').change(event => {
          console.log('change');
          event.preventDefault();

          const dataset = event.currentTarget.dataset;
          let $input = $(event.currentTarget);
          let $actorRow = $input.parents('.directory-item.actor-elem');

          console.log($actorRow);

          if (!$actorRow.length > 0) {
            return;
          }

          const combatant = game.combat.combatants.find(c => c._id == $actorRow.data('combatant-id'));

          console.log(combatant);
          if (!combatant) {
            return;
          }

          const actor = combatant.actor;

          // Check for bad numbers.
          let value = $input.val();
          if (dataset.dtype == 'Number') {
            value = Number(value);
            if (Number.isNaN(value)) {
              $input.val(actor.data.data.attributes.hp.value);
              return false;
            }
          }

          let updateData = {};
          let operation = $input.val().match(/^\+|\-/g);
          if (operation) {
            updateData[$input.attr('name')] = Number(actor.data.data.attributes.hp.value) + value;
          }
          else {
            updateData[$input.attr('name')] = value;
          }

          console.log(actor);
          console.log(updateData);
          actor.update(updateData);

          return;
        });

        // Drag handler for the combat tracker.
        if (game.user.isGM) {
          newHtml.find('.directory-item.actor-elem')
            .attr('draggable', true).addClass('draggable')
            // Initiate the drag event.
            .on('dragstart', (event) => {
              let dragData = event.currentTarget.dataset;
              event.originalEvent.dataTransfer.setData('text/plain', JSON.stringify(dragData));

              // Store the combatant type for reference.
              let newCombatant = game.combat.combatants.find(c => c._id == dragData.combatantId);
              event.originalEvent.dataTransfer.setData(`newtype--${dragData.actorType}`, '');
            })
            // Add a class on hover, if the actor types match.
            .on('dragover', (event) => {
              let $self = $(event.originalEvent.target);
              let $dropTarget = $self.parents('.directory-item');

              if ($dropTarget.hasClass('drop-hover')) {
                return;
              }

              if (!$dropTarget.data('combatant-id')) {
                return;
              }

              let oldType = $dropTarget.data('actor-type');
              let newType = null;

              if (!oldType) {
                return;
              }

              newType = event.originalEvent.dataTransfer.types.find(t => t.includes('newtype'));
              newType = newType ? newType.split('--')[1] : null;


              if (newType == oldType) {
                $dropTarget.addClass('drop-hover');
              }
              else {
                return false;
              }

              return false;
            })
            // Remove the class on drag leave.
            .on('dragleave', (event) => {
              let $self = $(event.originalEvent.target);
              let $dropTarget = $self.parents('.directory-item');
              $dropTarget.removeClass('drop-hover');
              return false;
            })
            // Update initiative on drop.
            .on('drop', async (event) => {
              // Retrieve a default encounter if none was provided
              const view = game.scenes.viewed;
              const combats = view ? game.combats.entities.filter(c => c.data.scene === view._id) : [];
              let combat = combats.length ? combats.find(c => c.data.active) || combats[0] : null;

              let $self = $(event.originalEvent.target);
              let $dropTarget = $self.parents('.directory-item');
              $dropTarget.removeClass('drop-hover');
              // Get data.
              let data;
              try {
                data = JSON.parse(event.originalEvent.dataTransfer.getData('text/plain'));
                // if (data.type !== "Item") return;
              } catch (err) {
                return false;
              }

              let newCombatant = combat.combatants.find(c => c._id == data.combatantId);

              let combatants = this.getCombatantsData(false);
              let originalCombatant = combatants[newCombatant.actor.data.type].find(c => {
                return c._id == $dropTarget.data('combatant-id');
              });

              let oldInit = originalCombatant ? originalCombatant.initiative : null;

              if (oldInit !== null) {
                let updatedCombatant = combatants[newCombatant.actor.data.type].find(c => c._id == newCombatant._id);
                updatedCombatant.initiative = Number(oldInit) + 1;

                let updatedInit = 0;
                let updates = combatants[newCombatant.actor.data.type].sort((a, b) => a.initiative - b.initiative).map(c => {
                  let result = {
                    _id: c._id,
                    initiative: updatedInit
                  };
                  updatedInit = updatedInit + 10;
                  return result;
                });

                if (updates) {
                  await combat.updateCombatant(updates);
                }
              }
            }); // end of newHtml.find('.directory-item.actor-elem')
        }
      }
    });
  }

  getCombatantsData(updateInitiative = false) {
    if (!game.combat || !game.combat.data) {
      return [];
    }

    let currentInitiative = 0;

    let combatants = game.combat.data.combatants.reduce((groups, combatant) => {
      // Append valid actors to the appropriate group.
      if (combatant.actor) {
        let group = combatant.actor.data.type;
        if (!groups[group]) {
          groups[group] = [];
        }

        let displayBarsMode = Object.entries(CONST.TOKEN_DISPLAY_MODES).find(i => i[1] == combatant.token.displayBars)[0];

        let displayHealth = group == 'character' ? true : false;

        if (group != 'character') {
          if (displayBarsMode.includes("OWNER")) {
            if (combatant.owner || game.user.isGM) {
              displayHealth = true;
            }
          }
          else if (displayBarsMode != "NONE") {
            displayHealth = true;
          }
          else {
            displayHealth = game.user.isGM ? true : false;
          }

          if (updateInitiative) {
            combatant.initiative = currentInitiative;
            currentInitiative = currentInitiative + 10;
          }
        }

        combatant.displayHealth = displayHealth;
        combatant.editable = combatant.owner || game.user.isGM;

        combatant.healthSvg = DwUtility.getProgressCircle({
          current: combatant.actor.data.data.attributes.hp.value,
          max: combatant.actor.data.data.attributes.hp.max,
          radius: 16
        });

        if (game.user.isGM || combatant.owner || !combatant.token.hidden) {
          groups[group].push(combatant);
        }
      }
      // Remove deleted actors from the combat.
      else {
        game.combat.deleteCombatant(combatant._id);
      }
      return groups;
    }, {});

    for (let [groupKey, group] of Object.entries(combatants)) {
      combatants[groupKey].sort((a, b) => {
        return Number(a.initiative) - Number(b.initiative)
      });
    }

    return combatants;
  }
}
