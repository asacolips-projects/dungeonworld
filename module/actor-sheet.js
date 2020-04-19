/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class DwActorSheet extends ActorSheet {

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["dungeonworld", "sheet", "actor"],
      width: 750,
      height: 900,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "moves" }]
    });
  }

  /* -------------------------------------------- */

  /** @override */
  get template() {
    const path = "systems/dungeonworld/templates/sheet";
    return `${path}/${this.actor.data.type}-sheet.html`;
  }

  /* -------------------------------------------- */

  /** @override */
  getData() {
    const data = super.getData();
    data.dtypes = ["String", "Number", "Boolean"];
    for (let attr of Object.values(data.data.attributes)) {
      attr.isCheckbox = attr.dtype === "Boolean";
    }
    // Prepare items.
    this._prepareCharacterItems(data);

    // Return data to the sheet
    return data;
  }

  /**
   * Organize and classify Items for Character sheets.
   *
   * @param {Object} actorData The actor to prepare.
   *
   * @return {undefined}
   */
  _prepareCharacterItems(sheetData) {
    const actorData = sheetData.actor;

    // Initialize containers.
    const moves = [];
    const basicMoves = [];
    const startingMoves = [];
    const advancedMoves = [];
    const equipment = [];
    const spells = {
      0: [],
      1: [],
      3: [],
      5: [],
      7: [],
      9: []
    };

    // Iterate through items, allocating to containers
    // let totalWeight = 0;
    for (let i of sheetData.items) {
      let item = i.data;
      i.img = i.img || DEFAULT_TOKEN;
      // If this is a move, sort into various arrays.
      if (i.type === 'move') {
        switch (i.data.moveType) {
          // TODO: Basic moves.
          // case 'basic':
          //   basicMoves.push(i);
          //   break;

          case 'starting':
            startingMoves.push(i);
            break;

          case 'advanced':
            advancedMoves.push(i);
            break;

          default:
            moves.push(i);
            break;
        }
      }
      else if (i.type === 'spell') {
        if (i.data.spellLevel != undefined) {
          spells[i.data.spellLevel].push(i);
        }
      }
      // If this is equipment, we currently lump it together.
      else if (i.type === 'equipment') {
        equipment.push(i);
      }
    }

    // Assign and return
    actorData.moves = moves;
    actorData.basicMoves = basicMoves;
    actorData.startingMoves = startingMoves;
    actorData.advancedMoves = advancedMoves;
    // Spells
    actorData.spells = spells;
    // Equipment
    actorData.equipment = equipment;
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Rollables.
    html.find('.rollable').on('click', this._onRollable.bind(this));

    // Toggle look.
    html.find('.toggle--look').on('click', this._toggleLook.bind(this, html));

    // Owned Item management
    html.find('.item-create').click(this._onItemCreate.bind(this));
    html.find('.item-edit').click(this._onItemEdit.bind(this));
    html.find('.item-delete').click(this._onItemDelete.bind(this));
  }

  /* -------------------------------------------- */

  /**
   * Listen for click events on rollables.
   * @param {MouseEvent} event
   */
  async _onRollable(event) {
    // Initialize variables.
    event.preventDefault();
    const a = event.currentTarget;
    const data = a.dataset;
    const actorData = this.actor.data.data;
    const itemId = $(a).parents('.item').attr('data-item-id');
    const item = this.actor.getOwnedItem(itemId);
    let formula = null;
    let flavorText = null;
    let templateData = {};

    // Handle rolls coming directly from the ability score.
    if ($(a).hasClass('ability-rollable') && data.mod) {
      formula = `2d6+${data.mod}`;
      flavorText = data.label;
      if (data.debility) {
        flavorText += ` (${data.debility})`;
      }

      templateData = {
        title: flavorText
      };

      this.rollMove(formula, actorData, data, templateData);
    }

    // Handle rolls combing from moves.
    if ($(a).hasClass('move-rollable')) {
      formula = '2d6';
      templateData = {
        title: item.data.name,
        trigger: null,
        details: item.data.data.description
      };
      // If this is an ASK roll, render a prompt first to determine which
      // score to use.
      if (data.roll == 'ASK') {
        new Dialog({
          title: `Choose an ability`,
          content: `<p>Choose an ability for this <strong>${item.data.name}</strong> move.</p>`,
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
          title: item.data.name,
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
    else if ($(a).hasClass('spell-rollable')) {
      templateData = {
        title: item.data.name,
        trigger: null,
        details: item.data.data.description
      }
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
          roll.toMessage({ flavor: content });
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

  /**
   * Listen for toggling the look column.
   * @param {MouseEvent} event
   */
  _toggleLook(html, event) {
    // Add a class to the sidebar.
    html.find('.sheet-look').toggleClass('closed');

    // Add a class to the toggle button.
    let $look = html.find('.toggle--look');
    $look.toggleClass('closed');

    if ($look.hasClass('closed')) {
      $look.text('>');
    }
    else {
      $look.text('<');
    }
  }

  /* -------------------------------------------- */
  /**
   * Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset
   * @param {Event} event   The originating click event
   * @private
   */
  _onItemCreate(event) {
    event.preventDefault();
    const header = event.currentTarget;
    const type = header.dataset.type;
    const data = duplicate(header.dataset);
    data.moveType = data.movetype;
    data.spellLevel = data.level;
    const itemData = {
      name: `New ${type.capitalize()}`,
      type: type,
      data: data
    };
    delete itemData.data["type"];
    return this.actor.createOwnedItem(itemData);
  }

  /* -------------------------------------------- */

  /**
   * Handle editing an existing Owned Item for the Actor
   * @param {Event} event   The originating click event
   * @private
   */
  _onItemEdit(event) {
    event.preventDefault();
    const li = event.currentTarget.closest(".item");
    const item = this.actor.getOwnedItem(li.dataset.itemId);
    item.sheet.render(true);
  }

  /* -------------------------------------------- */

  /**
   * Handle deleting an existing Owned Item for the Actor
   * @param {Event} event   The originating click event
   * @private
   */
  _onItemDelete(event) {
    event.preventDefault();
    const li = event.currentTarget.closest(".item");
    this.actor.deleteOwnedItem(li.dataset.itemId);
  }

  /* -------------------------------------------- */

  /** @override */
  _updateObject(event, formData) {

    // TODO: Determine if we still need this leftover code from the
    // Simple Worldbuilding System.

    // Handle the free-form attributes list
    // const formAttrs = expandObject(formData).data.attributes || {};
    // const attributes = Object.values(formAttrs).reduce((obj, v) => {
    //   let k = v["key"].trim();
    //   if (/[\s\.]/.test(k)) return ui.notifications.error("Attribute keys may not contain spaces or periods");
    //   delete v["key"];
    //   obj[k] = v;
    //   return obj;
    // }, {});

    // Remove attributes which are no longer used
    // for (let k of Object.keys(this.object.data.data.attributes)) {
    //   if (!attributes.hasOwnProperty(k)) attributes[`-=${k}`] = null;
    // }

    // Re-combine formData
    // formData = Object.entries(formData).filter(e => !e[0].startsWith("data.attributes")).reduce((obj, e) => {
    //   obj[e[0]] = e[1];
    //   return obj;
    // }, { _id: this.object._id, "data.attributes": attributes });

    // Update the Actor
    return this.object.update(formData);
  }
}
