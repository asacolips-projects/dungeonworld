import { DwClassList } from "../config.js";
import { DwUtility } from "../utility.js";

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
  async getData() {
    const data = super.getData();
    data.dtypes = ["String", "Number", "Boolean"];
    for (let attr of Object.values(data.data.attributes)) {
      attr.isCheckbox = attr.dtype === "Boolean";
    }
    // Prepare items.
    this._prepareCharacterItems(data);
    this._prepareNpcItems(data);
    // Add classlist.
    data.data.classlist = await DwClassList.getClasses();
    data.data.levelup = this.actor.getFlag('dungeonworld', 'levelup') == true && data.data.classlist.includes(data.data.details.class);

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
    html.find('.item-details-toggle').click(this._showItemDetails.bind(this));

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
    } else {
      toggleIcon.removeClass('fa-caret-down').addClass('fa-caret-right');
    }
    description.slideToggle();
  }

  async _onLevelUp(event) {
    event.preventDefault();

    const actor = this.actor.data;
    const actorData = this.actor.data.data;

    // Initialize dialog options.
    const dlg_options = {
      width: 920,
      height: 640,
      classes: ['dw-level-up', 'dungeonworld', 'sheet'],
      resizable: true
    };

    const char_class_name = actorData.details.class;
    const class_list = await DwClassList.getClasses();
    const class_list_items = await DwClassList.getClasses(false);

    if (!class_list.includes(char_class_name)) {
      return;
    }

    const char_class = DwUtility.cleanClass(char_class_name);
    const char_level = actorData.attributes.level.value;
    let pack = game.packs.get(`dungeonworld.${char_class}-moves`);
    let compendium = await pack.getContent();

    let class_item = class_list_items.filter(i => i.data.name == char_class_name)[0];
    let blurb = class_item.data.data.description;

    // Get races.
    let races = [];
    if (!this.actor.data.data.details.race.value || !this.actor.data.data.details.race.description) {
      races = class_item.data.data.races;
      if (typeof races == 'object') {
        races = Object.entries(races).map(r => {
          return {
            key: r[0],
            label: r[1]['label'],
            description: r[1]['description']
          };
        });
      }
    }

    // Get alignments.
    let alignments = [];
    if (!this.actor.data.data.details.alignment.value || !this.actor.data.data.details.alignment.description) {
      alignments = class_item.data.data.alignments;
      if (typeof alignments == 'object') {
        alignments = Object.entries(alignments).map(a => {
          return {
            key: a[0],
            label: a[1]['label'],
            description: a[1]['description']
          };
        });
      }
    }

    // Retrieve the actor's current moves so that we can hide them.
    const actorMoves = this.actor.data.items.filter(i => i.type == 'move');

    // Get the item moves as the priority.
    let moves = game.items.entities.filter(i => i.type == 'move' && i.data.data.class == char_class_name);
    // Get the compendium moves next.
    let moves_compendium = compendium.filter(m => {
      const available_level = m.data.data.requiresLevel <= char_level;
      const not_taken = actorMoves.filter(i => i.name == m.data.name);
      return available_level && not_taken.length < 1;
    });

    // Append compendium moves to the item moves.
    let moves_list = moves.map(m => {
      return m.data.name;
    })
    for (let move of moves_compendium) {
      if (!moves_list.includes(move.data.name)) {
        moves.push(move);
      }
    }

    // Sort the moves and build our groups.
    moves.sort((a, b) => {
      return a.data.data.requiresLevel - b.data.data.requiresLevel;
    });

    let starting_moves = [];
    let starting_move_groups = [];
    if (this.actor.data.data.attributes.level.value < 2) {
      starting_moves = moves.filter(m => {
        return m.data.data.requiresLevel < 2;
      });

      starting_move_groups = starting_moves.reduce((groups, move) => {
        // Assign the undefined group to all Z's so that it's last.
        let group = move.data.data.moveGroup ? move.data.data.moveGroup : 'ZZZZZZZ';
        if (!groups[group]) {
          groups[group] = [];
        }

        groups[group].push(move);
        return groups;
      }, {});
    }

    let advanced_moves_2 = moves.filter(m => {
      return m.data.data.requiresLevel >= 2 && m.data.data.requiresLevel < 6;
    });

    let advanced_moves_6 = moves.filter(m => {
      return m.data.data.requiresLevel >= 6;
    });

    // Build the content.
    const template = 'systems/dungeonworld/templates/dialog/level-up.html';
    const templateData = {
      char_class: char_class,
      char_class_name: char_class_name,
      blurb: blurb.length > 0 ? blurb : null,
      races: races.length > 0 ? races : null,
      alignments: alignments.length > 0 ? alignments : null,
      starting_moves: starting_moves.length > 0 ? starting_moves : null,
      starting_move_groups: starting_move_groups,
      advanced_moves_2: advanced_moves_2.length > 0 ? advanced_moves_2 : null,
      advanced_moves_6: advanced_moves_6.length > 0 ? advanced_moves_6 : null
    };
    const html = await renderTemplate(template, templateData);

    const itemData = {
      moves: moves,
      races: races,
      alignments: alignments
    };

    // Render the dialog.
    let d = new Dialog({
      title: 'Level Up',
      content: html,
      buttons: {
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel",
          callback: () => null
        },
        submit: {
          icon: '<i class="fas fa-check"></i>',
          label: "Submit",
          callback: dlg => this._onLevelUpSave(dlg, this.actor, itemData, this)
          // callback: dlg => _onImportPower(dlg, this.actor)
        }
      }
    }, dlg_options);
    d.render(true);
  }

  /**
   * Import moves.
   */
  async _onLevelUpSave(dlg, actor, itemData) {
    let $selected = $(dlg[0]).find('input:checked');

    if ($selected.length <= 0) {
      return;
    }

    let move_ids = [];
    let race = null;
    let alignment = null;
    for (let input of $selected) {
      console.log(input.dataset);
      if (input.dataset.itemId) {
        move_ids.push(input.dataset.itemId);
      }
      else if (input.dataset.race) {
        race = itemData.races[input.dataset.race];
      }
      else if (input.dataset.alignment) {
        alignment = itemData.alignments[input.dataset.alignment];
      }
    }

    let moves = itemData.moves.filter(m => move_ids.includes(m.data._id));
    let new_moves = moves.map(m => {
      return {
        name: m.data.name,
        type: m.data.type,
        data: m.data.data
      }
    });

    console.log(new_moves);

    const data = {};
    if (race) {
      data['details.race'] = {
        value: race.label,
        description: race.description
      };
    }
    if (alignment) {
      data['details.alignment'] = {
        value: alignment.label,
        description: alignment.description
      }
    }

    actor.update({ data: data });
    actor.createOwnedItem(new_moves);
    actor.setFlag('dungeonworld', 'levelup', false);
    // this._render(true);
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
