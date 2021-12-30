import { DwUtility } from "./utility.js";

export class DwRolls {

  constructor() {
    this.actor = null;
    this.actorData = null;
  }

  static getRollFormula(defaultFormula = '2d6') {
    // TODO: Incorporate adv/dis/ongoing/forward.
    return defaultFormula;
  }

  static getModifiers(actor) {
    let forward = Number(actor.data.data.attributes?.forward?.value) ?? 0;
    let ongoing = Number(actor.data.data.attributes?.ongoing?.value) ?? 0;
    let result = '';
    if (forward) result += `+${forward}`;
    if (ongoing) result += `+${ongoing}`;
    return result;
  }

  static async rollMove(options = {}) {
    let dice = this.getRollFormula('2d6');

    // TODO: Create a way to resolve this using the formula only, sans actor.
    // If there's no actor, we need to exit.
    if (!options.actor) {
      return false;
    }

    // If there's no formula or item, we need to exit.
    if (!options.formula && !options.data) {
      return false;
    }

    // Grab the actor data.
    this.actor = options.actor;
    this.actorData = this.actor ? this.actor.data.data : {};
    let actorType = this.actor.data.type;

    // Grab the item data, if any.
    const item = options?.data;
    const itemData = item ? item?.data : null;

    // Grab the formula, if any.
    let formula = options.formula ?? null;
    let label = options?.data?.label ?? '';

    // Prepare template data for the roll.
    let templateData = options.templateData ? duplicate(options.templateData): {};
    let data = {};

    let dlgOptions = {
      classes: ['dungeonworld', 'dw-dialog']
    };

    if (CONFIG.DW.nightmode) dlgOptions.classes.push('nightmode');

    // Handle item rolls (moves).
    if (item) {
      // Handle moves.
      if (item.type == 'move' || item.type == 'npcMove') {
        formula = dice;
        templateData = {
          image: item.img,
          title: item.name,
          trigger: null,
          details: item.data.description,
          moveResults: item.data.moveResults,
          choices: item.data.choices
        };

        if (item.type == 'npcMove' || item.data?.rollType == 'FORMULA') {
          data.roll = item.data.rollFormula;
          data.rollType = item.data.rollType ? item.data.rollType.toLowerCase() : 'npc';
        }
        else {
          data.roll = item.data.rollType.toLowerCase();
          data.rollType = item.data.rollType.toLowerCase();
        }
        data.mod = item.type == 'move' ? item.data.rollMod : 0;
        // If this is an ASK roll, render a bond first to determine which
        // score to use.
        if (data.roll == 'ask') {
          let stats = Object.keys(this.actorData.abilities);
          let statButtons = {};

          for (let stat of stats) {
            statButtons[stat] = {
              label: stat.toUpperCase(),
              callback: () => this.rollMoveExecute(stat, data, templateData)
            };
          }
          new Dialog({
            title: game.i18n.localize('DW.Dialog.askTitle'),
            content: `<p>${game.i18n.format('DW.Dialog.askContent', {name: item.name})}`,
            buttons: statButtons
          }, dlgOptions).render(true);
        }
        // If this is a PROMPT roll, render a different bond to let the user
        // enter their bond value.
        else if (data.roll == 'bond') {
          let template = 'systems/dungeonworld/templates/chat/roll-dialog.html';
          let dialogData = {
            title: game.i18n.format('DW.Dialog.bondContent', {name: item.name}),
            bond: null
          };
          const html = await renderTemplate(template, dialogData);
          return new Promise(resolve => {
            new Dialog({
              title: game.i18n.localize('DW.Dialog.bondTitle'),
              content: html,
              buttons: {
                submit: {
                  label: 'Roll',
                  callback: html => {
                    this.rollMoveExecute('bond', data, templateData, html[0].querySelector("form"))
                  }
                }
              }
            }, dlgOptions).render(true);
          })

        }
        // Otherwise, grab the data from the move and pass it along.
        else {
          this.rollMoveExecute(data.roll, data, templateData);
        }
      }
      // Handle spells.
      else if (item.type == 'spell') {
        templateData = {
          image: item.img,
          title: item.name,
          trigger: null,
          details: item.data.description
        };
        data.roll = item.data.rollFormula;
        this.rollMoveExecute(data.roll, data, templateData);
      }
      // Handle equipment.
      else if (item.type == 'equipment') {
        templateData = {
          image: item.img,
          title: item.name,
          trigger: null,
          details: item.data.description,
          tags: item.data.tags
        }
        data.roll = null;
        this.rollMoveExecute(data.roll, data, templateData);
      }
    }
    // Handle formula-only rolls.
    else {
      this.rollMoveExecute(formula, data, templateData);
    }
  }

  static async rollMoveExecute(roll, dataset, templateData, form = null) {
    // Render the roll.
    let template = 'systems/dungeonworld/templates/chat/chat-move.html';
    let dice = DwUtility.getRollFormula('2d6');
    let forwardUsed = false;
    let rollModeUsed = false;
    let resultRangeNeeded = false;
    let rollData = this.actor.getRollData();
    // GM rolls.
    let chatData = {
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor })
    };
    let rollMode = game.settings.get("core", "rollMode");
    if (["gmroll", "blindroll"].includes(rollMode)) chatData["whisper"] = ChatMessage.getWhisperRecipients("GM");
    if (rollMode === "selfroll") chatData["whisper"] = [game.user.id];
    if (rollMode === "blindroll") chatData["blind"] = true;
    // Add piercing and armor tags.
    let tags = [];
    let piercing = this.actor.data.data.attributes.damage?.piercing ?? 0;
    let ignoreArmor = this.actor.data.data.attributes.damage?.ignoreArmor ?? false;
    if (piercing > 0) tags.push({value: `${piercing} piercing`});
    if (ignoreArmor) tags.push({value: `ignores armor`});
    templateData.tags = JSON.stringify(tags);
    // Handle dice rolls.
    if (!DwUtility.isEmpty(roll)) {
      // Test if the roll is a formula.
      let validRoll = false;
      try {
        validRoll = await(new Roll(roll.trim(), rollData).evaluate({async: true}));
      } catch (error) {
        validRoll = false;
      }
      // Roll can be either a formula like `2d6+3` or a raw stat like `str`.
      let formula = validRoll ? roll.trim() : '';
      // Handle bond (user input).
      if (!validRoll || dataset?.rollType == 'formula') {
        if (roll.toLowerCase() == 'bond') {
          formula = form.bond?.value ? `${dice}+${form.bond.value}` : dice;
          if (dataset.value && dataset.value != 0) {
            formula += `+${dataset.value}`;
          }
        }
        else if (dataset?.rollType == 'formula') {
          formula = roll;
        }
        // Handle ability scores (no input).
        else if (roll.match(/(\d*)d\d+/g)) {
          formula = roll;
        }
        // Handle moves.
        else {
          // Determine if the stat toggle is in effect.
          let toggleModifier = 0;
          formula = `${dice}+${this.actorData.abilities[roll].mod}${toggleModifier ? '+' + toggleModifier : ''}`;
          if (dataset.value && dataset.value != 0) {
            formula += `+${dataset.value}`;
          }
        }

        // Handle formula overrides.
        let formulaOverride = this.actor.data.data.attributes?.rollFormula?.value;
        if (formulaOverride && formula.includes('2d6')) {
          let overrideIsValid = false;
          try {
            overrideIsValid = await (new Roll(formulaOverride.trim(), rollData).evaluate({async: true}));
          }
          catch (error) {
            overrideIsValid = false;
          }

          if (overrideIsValid) formula = formula.replace('2d6', formulaOverride);
        }

        if (formula.includes('2d6') || formulaOverride && formula.includes(formulaOverride)) {
          resultRangeNeeded = true;
        }

        // Handle adv/dis.
        let rollMode = this.actor.data.flags?.dungeonworld?.rollMode ?? 'def';
        switch (rollMode) {
          case 'adv':
            rollModeUsed = true;
            if (formula.includes('2d6')) {
              formula = formula.replace('2d6', '3d6kh2');
            }
            else if (formula.includes('d6')) {
              // Match the first d6 as (n)d6.
              formula = formula.replace(/(\d*)(d6)/, (match, p1, p2, offset, string) => {
                let keep = p1 ? Number(p1) : 1;
                let count = keep + 1;
                return `${count}d6kh${keep}`; // Ex: 2d6 -> 3d6kh2
              });
            }
            break;

          case 'dis':
            rollModeUsed = true;
            if (formula.includes('2d6')) {
              formula = formula.replace('2d6', '3d6kl2');
            }
            else if (formula.includes('d6')) {
              formula = formula.replace(/(\d*)(d6)/, (match, p1, p2, offset, string) => {
                let keep = p1 ? Number(p1) : 1;
                let count = keep + 1;
                return `${count}d6kl${keep}`;
              });
            }
            break;
        }

        // Append the modifiers.
        let modifiers = DwRolls.getModifiers(this.actor);
        formula = `${formula}${modifiers}`;
        forwardUsed = Number(this.actor.data.data.attributes?.forward?.value) != 0;
      }
      if (formula != null) {
        // Do the roll.
        let roll = new Roll(`${formula}`, rollData);
        await (roll.evaluate({async: true}));
        let rollType = templateData.rollType ?? 'none';
        // Add success notification.
        if (resultRangeNeeded || rollType == 'move') {
          // Retrieve the result ranges.
          let resultRanges = CONFIG.DW.rollResults;
          let resultType = null;
          // Iterate through each result range until we find a match.
          for (let [resultKey, resultRange] of Object.entries(resultRanges)) {
            // Grab the start and end.
            let start = resultRange.start;
            let end = resultRange.end;
            // If both are present, roll must be between them.
            if (start && end) {
              if (roll.total >= start && roll.total <= end) {
                resultType = resultKey;
                break;
              }
            }
            // If start only, treat it as greater than or equal to.
            else if (start) {
              if (roll.total >= start) {
                resultType = resultKey;
                break;
              }
            }
            // If end only, treat it as less than or equal to.
            else if (end) {
              if (roll.total <= end) {
                resultType = resultKey;
                break;
              }
            }
          }

          // Handle XP.
          const token = canvas.tokens.controlled.find(t => t.data.actorId == this.actor.id);
          // @todo determine if this should be the canvas ID or the actor ID.
          templateData.tokenId = token ? `${canvas.scene.id}.${token.id}` : null;
          templateData.xp = resultType == 'failure' ? true : false;

          // Update the templateData.
          templateData.resultLabel = resultRanges[resultType]?.label ?? resultType;
          templateData.result = resultType;
          templateData.resultDetails = null;
          if (templateData?.moveResults && templateData.moveResults[resultType]?.value) {
            templateData.resultDetails = templateData.moveResults[resultType].value;
          }
        }
        // Render it.
        templateData.actor = this.actor.data;
        roll.render().then(r => {
          templateData.rollDw = r;
          templateData.roll = roll;
          renderTemplate(template, templateData).then(content => {
            chatData.content = content;
            if (game.dice3d) {
              game.dice3d.showForRoll(roll, game.user, true, chatData.whisper, chatData.blind).then(displayed => ChatMessage.create(chatData));
            }
            else {
              chatData.sound = CONFIG.sounds.dice;
              ChatMessage.create(chatData);
            }
          });
        });
      }
    }
    else {
      renderTemplate(template, templateData).then(content => {
        chatData.content = content;
        ChatMessage.create(chatData);
      });
    }

    // Update the combat flags.
    if (game.combat && game.combat.combatants) {
      let combatant = game.combat.combatants.find(c => c.actor.id == this.actor.id);
      if (combatant) {
        let moveCount = combatant.data.flags.dungeonworld ? combatant.data.flags.dungeonworld.moveCount : 0;
        moveCount = moveCount ? Number(moveCount) + 1 : 1;
        // Emit a socket for the GM client.
        if (!game.user.isGM) {
          game.socket.emit('system.dungeonworld', {
            combatantUpdate: { _id: combatant.id, 'flags.dungeonworld.moveCount': moveCount }
          });
        }
        else {
          await game.combat.updateEmbeddedDocuments('Combatant', [{ _id: combatant.id, 'flags.dungeonworld.moveCount': moveCount }]);
          ui.combat.render();
        }
      }
    }

    // Update forward.
    if (forwardUsed || rollModeUsed) {
      let updates = {};
      if (forwardUsed) updates['data.attributes.forward.value'] = 0;
      if (rollModeUsed && game.settings.get('dungeonworld', 'advForward')) {
        updates['flags.dungeonworld.rollMode'] = 'def';
      }
      await this.actor.update(updates);
    }
  }
}
