import { DwUtility } from "../utility.js";

export class ItemDw extends Item {
  /**
   * Augment the basic Item data model with additional dynamic data.
   */
  prepareData() {
    super.prepareData();

    // Get the Item's data
    const itemData = this.data;
    const actorData = this.actor ? this.actor.data : {};
    const data = itemData.data;

    // Clean up broken groups.
    if (itemData.type == 'class') {
      if (itemData.data.equipment) {
        for (let [group_key, group] of Object.entries(itemData.data.equipment)) {
          if (group) {
            if (DwUtility.isEmpty(group['items'])) {
              group['items'] = [];
              group['objects'] = [];
            }
          }
        }
      }
    }
  }

  async _getEquipmentObjects(force_reload = false) {
    let obj = null;
    let itemData = this.data;

    let items = await DwUtility.getEquipment(force_reload);
    let equipment = [];

    if (itemData.data.equipment) {
      for (let [group, group_items] of Object.entries(itemData.data.equipment)) {
        if (group_items) {
          equipment[group] = items.filter(i => group_items['items'].includes(i.data._id));
        }
      }
    }

    return equipment;
  }

  /**
   * Roll the item to Chat, creating a chat card which contains follow up attack or damage roll options
   * @return {Promise}
   */
  async roll({ configureDialog = true } = {}) {

    // Basic template rendering data
    const token = this.actor.token;
    const item = this.data;
    const actorData = this.actor ? this.actor.data.data : {};
    const itemData = item.data;
    let templateData = {};
    let data = {};
    let formula = null;

    if (item.type == 'move') {
      formula = '2d6';
      templateData = {
        title: item.name,
        trigger: null,
        details: item.data.description
      };
      data.roll = item.data.rollType;
      data.mod = item.data.rollMod;
      // If this is an ASK roll, render a prompt first to determine which
      // score to use.
      if (data.roll == 'ASK') {
        new Dialog({
          title: `Choose an ability`,
          content: `<p>Choose an ability for this <strong>${item.name}</strong> move.</p>`,
          buttons: {
            str: {
              label: 'STR',
              callback: () => this.rollMove('str', actorData, data, templateData)
            },
            dex: {
              label: 'DEX',
              callback: () => this.rollMove('dex', actorData, data, templateData)
            },
            con: {
              label: 'CON',
              callback: () => this.rollMove('con', actorData, data, templateData)
            },
            int: {
              label: 'INT',
              callback: () => this.rollMove('int', actorData, data, templateData)
            },
            wis: {
              label: 'WIS',
              callback: () => this.rollMove('wis', actorData, data, templateData)
            },
            cha: {
              label: 'CHA',
              callback: () => this.rollMove('cha', actorData, data, templateData)
            }
          }
        }).render(true);
      }
      // If this is a BOND roll, render a different prompt to let the user
      // enter their bond value.
      else if (data.roll == 'BOND') {
        let template = 'systems/dungeonworld/templates/chat/roll-dialog.html';
        let dialogData = {
          title: item.name,
          bond: null
        };
        const html = await renderTemplate(template, dialogData);
        return new Promise(resolve => {
          new Dialog({
            title: `Enter your bond`,
            content: html,
            buttons: {
              submit: {
                label: 'Roll',
                callback: html => this.rollMove('BOND', actorData, data, templateData, html[0].children[0])
              }
            }
          }).render(true);
        })

      }
      // Otherwise, grab the data from the move and pass it along.
      else {
        this.rollMove(data.roll.toLowerCase(), actorData, data, templateData);
      }
    }
    else if (item.type == 'spell') {
      templateData = {
        title: item.name,
        trigger: null,
        details: item.data.description
      }
      data.roll = item.data.rollFormula;
      this.rollMove(data.roll, actorData, data, templateData);
    }
  }

  /**
   * Roll a move and use the chat card template.
   * @param {Object} templateData
   */
  rollMove(roll, actorData, dataset, templateData, form = null) {
    // Render the roll.
    let template = 'systems/dungeonworld/templates/chat/chat-move.html';
    renderTemplate(template, templateData).then(content => {
      if (roll) {
        // Roll can be either a formula like `2d6+3` or a raw stat like `str`.
        let formula = '';
        // Handle bond (user input).
        if (roll == 'BOND') {
          formula = form.bond.value ? `2d6+${form.bond.value}` : '2d6';
          if (dataset.mod && dataset.mod != 0) {
            formula += `+${dataset.mod}`;
          }
        }
        // Handle ability scores (no input).
        else if (roll.includes('d') && !roll.includes('dex')) {
          formula = roll;
        }
        // Handle moves.
        else {
          formula = `2d6+${actorData.abilities[roll].mod}`;
          if (dataset.mod && dataset.mod != 0) {
            formula += `+${dataset.mod}`;
          }
        }
        if (formula != null) {
          let roll = new Roll(formula);
          roll.roll();
          roll.toMessage({
            user: game.user._id,
            speaker: ChatMessage.getSpeaker({ actor: this.actor }),
            flavor: content
          });
        }
      }
      else {
        ChatMessage.create({
          user: game.user._id,
          speaker: ChatMessage.getSpeaker({ actor: this.actor }),
          content: content
        });
      }
    });
  }
}