/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class DwActorSheet extends ActorSheet {

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["dungeonworld", "sheet", "actor"],
      width: 840,
      height: 780,
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
    this._prepareNpcItems(data);

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
    const bonds = [];
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
      else if (i.type === 'bond') {
        bonds.push(i);
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
    // Bonds
    actorData.bonds = bonds;
  }

  /**
   * Prepare tagging.
   *
   * @param {Object} actorData The actor to prepare.
   */
  _prepareNpcItems(data) {
    // Handle preprocessing for tagify data.
    if (data.entity.type == 'npc') {
      // If there are tags, convert it into a string.
      if (data.data.tags != undefined && data.data.tags != '') {
        let tagArray = [];
        try {
          tagArray = JSON.parse(data.data.tags);
        } catch (e) {
          tagArray = [data.data.tags];
        }
        data.data.tagsString = tagArray.map((item) => {
          return item.value;
        }).join(', ');
      }
      // Otherwise, set tags equal to the string.
      else {
        data.data.tags = data.data.tagsString;
      }
    }
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

    // Moves
    html.find('.moves .item-details-toggle').click(this._showItemDetails.bind(this));

    // Adjust weight.
    this._adjustWeight(html);

    // Character builder dialog.
    html.find('.clickable-level-up').on('click', this._onLevelUp.bind(this));

    if (this.actor.owner) {
      let handler = ev => this._onDragItemStart(ev);
      html.find('li.item').each((i, li) => {
        if (li.classList.contains("inventory-header")) return;
        li.setAttribute("draggable", true);
        li.addEventListener("dragstart", handler, false);
      });
    }

    if (this.actor.data.type == 'npc') {
      this._activateTagging(html);
    }
  }

  /* -------------------------------------------- */

  _adjustWeight(html) {
    // Adjust weight.
    let $weight = html.find('[name="data.attributes.weight.value"]');
    let $weight_cell = html.find('.cell--weight');
    if ($weight.length > 0) {
      let weight = {
        current: Number($weight.val()),
        max: Number(html.find('[name="data.attributes.weight.max"]').val())
      };
      if (weight.current > weight.max) {
        $weight_cell.addClass('encumbered');

        if (weight.current > weight.max + 2) {
          $weight_cell.addClass('overencumbered');
        }
        else {
          $weight_cell.removeClass('overencumbered');
        }
      }
      else {
        $weight.removeClass('encumbered');
      }
    }
  }

  _showItemDetails(event) {
    event.preventDefault();
    const toggler = $(event.currentTarget);
    const toggleIcon = toggler.find('i');
    const item = toggler.parents('.item');
    const description = item.find('.item-description');

    if (toggleIcon.hasClass('fa-caret-right')) {
      toggleIcon.removeClass('fa-caret-right').addClass('fa-caret-down');
      description.slideDown();
    } else {
      toggleIcon.removeClass('fa-caret-down').addClass('fa-caret-right');
      description.slideUp();
    }
  }

  async _onLevelUp(event) {
    event.preventDefault();

    const actor = this.actor.data;
    const actorData = this.actor.data.data;

    // Initialize dialog options.
    const dlg_options = {
      width: 640,
      height: 480,
      classes: ['dw-level-up', 'dungeonworld', 'sheet'],
      resizable: true
    };

    const char_class = 'the-fighter';
    const char_level = actorData.attributes.level.value;
    let pack = game.packs.get(`dungeonworld.${char_class}-moves`);
    let compendium = await pack.getContent();

    const races = {
      dwarf: {
        label: 'Dwarf',
        description: 'When you share a drink with someone, you may parley with them using CON instead of CHA.'
      },
      elf: {
        label: 'Elf',
        description: 'Choose one weapon—you can always treat weapons of that type as if they had the precise tag. Weapon: ________'
      },
      halfling: {
        label: 'Halfling',
        description: 'When you Defy Danger and use your small size to your advantage, take +1.'
      },
      human: {
        label: 'Human',
        description: 'Once per battle you may reroll a single damage roll (yours or someone else’s).'
      }
    }

    let moves = compendium.filter(m => {
      return m.data.data.requiresLevel <= char_level;
    });

    moves.sort((a, b) => {
      return a.data.data.requiresLevel - b.data.data.requiresLevel;
    });

    let content = '<section class="level-up cell">';

    content += '<h1 class="cell__title">Choose a race</h1>';
    content += '<ul>';
    // Add races.
    for (const [key, race] of Object.entries(races)) {
      // console.log('key: ' + key);
      // console.log(race);
      content += `<li><div class="selection-control"><input type="radio" name="race-selection" data-race="${char_class}.${key}"></div><div class="selection-content"><h2>${race.label}</h2><p>${race.description}</p></div></li>`;
    }
    content += '</ul>';

    // Add moves.
    content += '<h1 class="cell__title">Choose moves</h1>';
    content += '<ul>';
    for (const move of moves) {
      content += `<li><div class="selection-control"><input type="${move.data.data.requiresLevel < 2 ? 'checkbox' : 'radio'}" ${move.data.data.requiresLevel < 2 ? 'checked' : 'name="move-selection"'} data-item-id="${move.data._id}"/></div><div class="selection-content"><h2>${move.data.data.requriesLevel > 0 ? '(Lvl ' + move.data.data.requiresLevel + ') ' : ''}${move.data.name}</h2><div>${move.data.data.description}</div></li>`;
    }
    content += '</ul>';
    content += '</section>';

    // Build the content.

    // Render the dialog.
    let d = new Dialog({
      title: 'Level Up',
      content: content,
      buttons: {
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel",
          callback: () => null
        },
        submit: {
          icon: '<i class="fas fa-check"></i>',
          label: "Submit",
          callback: () => null
          // callback: dlg => _onImportPower(dlg, this.actor)
        }
      }
    }, dlg_options);
    d.render(true);
  }

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
    let titleText = null;
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
    else if ($(a).hasClass('damage-rollable') && data.roll) {
      formula = data.roll;
      titleText = data.label;
      flavorText = data.flavor;
      templateData = {
        title: titleText,
        flavor: flavorText
      };

      this.rollMove(formula, actorData, data, templateData);
    }
    else if (itemId != undefined) {
      item.roll();
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
    const name = type == 'bond' ? game.i18n.localize("DW.BondDefault") : `New ${type.capitalize()}`;
    const itemData = {
      name: name,
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

  async _activateTagging(html) {
    // Build the tags list.
    let tags = game.items.entities.filter(item => item.type == 'tag');
    for (let c of game.packs) {
      if (c.metadata.entity && c.metadata.entity == 'Item' && c.metadata.name == 'tags') {
        let items = await c.getContent();
        tags = tags.concat(items);
      }
    }
    // Reduce duplicates.
    let tagNames = [];
    for (let tag of tags) {
      let tagName = tag.data.name.toLowerCase();
      if (tagNames.includes(tagName) !== false) {
        tags = tags.filter(item => item._id != tag._id);
      }
      else {
        tagNames.push(tagName);
      }
    }

    // Sort the tagnames list.
    tagNames.sort((a, b) => {
      const aSort = a.toLowerCase();
      const bSort = b.toLowerCase();
      if (aSort < bSort) {
        return -1;
      }
      if (aSort > bSort) {
        return 1;
      }
      return 0;
    });

    // Tagify!
    var $input = html.find('input[name="data.tags"]');
    if ($input.length > 0) {
      // init Tagify script on the above inputs
      var tagify = new Tagify($input[0], {
        whitelist: tagNames,
        maxTags: 'Infinity',
        dropdown: {
          maxItems: 20,           // <- mixumum allowed rendered suggestions
          classname: "tags-look", // <- custom classname for this dropdown, so it could be targeted
          enabled: 0,             // <- show suggestions on focus
          closeOnSelect: false    // <- do not hide the suggestions dropdown once an item has been selected
        }
      });
    }
  }
}
