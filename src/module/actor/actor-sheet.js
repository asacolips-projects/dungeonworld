import { DwClassList } from "../config.js";
import { DwUtility } from "../utility.js";
import { DwRolls } from "../rolls.js";

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class DwActorSheet extends ActorSheet {

  /** @inheritdoc */
  constructor(...args) {
    super(...args);

    this.tagify = null;
  }

  /** @override */
  static get defaultOptions() {
    let options = mergeObject(super.defaultOptions, {
      classes: ["dungeonworld", "sheet", "actor"],
      width: 840,
      height: 780,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "moves" }]
    });

    if (CONFIG.DW.nightmode) {
      options.classes.push('nightmode');
    }

    return options;
  }

  /* -------------------------------------------- */

  /** @override */
  get template() {
    const path = "systems/dungeonworld/templates/sheet";
    return `${path}/${this.actor.type}-sheet.html`;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async close(options={}) {
    await super.close(options);

    if (this.tagify) this.tagify.destroy();
  }

  /* -------------------------------------------- */

  /** @override */
  async getData(options) {
    let isOwner = false;
    let isEditable = this.isEditable;
    let context = super.getData(options);
    let items = {};
    let effects = {};
    let actorData = {};

    isOwner = this.document.isOwner;
    isEditable = this.isEditable;

    // The Actor's data
    actorData = this.actor.toObject(false);
    context.actor = actorData;
    context.system = actorData.system;

    // Owned Items
    context.items = actorData.items;
    for ( let i of context.items ) {
      const item = this.actor.items.get(i._id);
      i.labels = item.labels;
    }
    context.items.sort((a, b) => (a.sort || 0) - (b.sort || 0));

    // Flags
    context.rollModes = {
      def: 'DW.Normal',
      adv: 'DW.Advantage',
      dis: 'DW.Disadvantage'
    };

    // Copy Active Effects
    // TODO: Test and refactor this.
    effects = this.object.effects.map(e => foundry.utils.deepClone(e));
    context.effects = effects;

    context.dtypes = ["String", "Number", "Boolean"];
    for (let attr of Object.values(context.system.attributes)) {
      attr.isCheckbox = attr.dtype === "Boolean";
    }

    // Prepare items.
    this._prepareCharacterItems(context);
    this._prepareNpcItems(context);

    // Add classlist.
    if (this.actor.type == 'character') {
      context.system.classlist = await DwClassList.getClasses();

      let xpSvg = {
        radius: 16,
        circumference: 100,
        offset: 100,
      };

      // Set a warning for tokens.
      context.system.isToken = this.actor.token != null;
      if (!context.system.isToken) {
        // Add levelup choice.
        let level = context.system.attributes.level.value ?? 1;
        let xpRequired = context.system.attributes.xp.max ?? Number(level) + 7;
        context.xpRequired = xpRequired;
        let levelup = Number(context.system.attributes.xp.value) >= xpRequired && Number(level) < 10;

        // Handle the first level (special case).
        if (Number(level) === 1) {
          let hasStarting = context.startingMoves.length > 0;
          if (!hasStarting) {
            levelup = true;
          }
        }

        // Set the template variable.
        context.system.levelup = levelup && context.system.classlist.includes(context.system.details.class);

        // Calculate xp bar length.
        let currentXp = Number(context.system.attributes.xp.value);
        let nextLevel = Number(context.system.attributes.xp.max);
        xpSvg = DwUtility.getProgressCircle({ current: currentXp, max: nextLevel, radius: 16 });
      }
      else {
        context.system.levelup = false;
      }

      context.system.xpSvg = xpSvg;
    }

    // Stats.
    context.system.statSettings = {
      'str': 'DW.STR',
      'dex': 'DW.DEX',
      'con': 'DW.CON',
      'int': 'DW.INT',
      'wis': 'DW.WIS',
      'cha': 'DW.CHA'
    };

    // Add item icon setting.
    context.system.itemIcons = game.settings.get('dungeonworld', 'itemIcons');

    // Check if ability scores are disabled
    context.system.noAbilityScores = game.settings.get('dungeonworld', 'noAbilityScores');

    // Return data to the sheet
    let returnData = {
      actor: this.object,
      cssClass: isEditable ? "editable" : "locked",
      editable: isEditable,
      system: context.system,
      moves: context.moves,
      rollModes: context.rollModes,
      basicMoves: context.basicMoves,
      advancedMoves: context.advancedMoves,
      startingMoves: context.startingMoves,
      specialMoves: context.specialMoves,
      equipment: context.equipment,
      spells: context.spells,
      bonds: context.bonds,
      effects: effects,
      items: items,
      flags: this.object?.flags,
      limited: this.object.limited,
      options: this.options,
      owner: isOwner,
      title: this.title,
      xpRequired: context.xpRequired,
      rollData: this.actor.getRollData()
    };

    // Return template data
    return returnData;
  }

  /**
   * Organize and classify Items for Character sheets.
   *
   * @param {Object} actorData The actor to prepare.
   *
   * @return {undefined}
   */
  _prepareCharacterItems(sheetData) {
    // Exit early if this isn't a character.
    if (sheetData.actor.type !== 'character') return;

    const actorData = sheetData.actor;

    // Initialize containers.
    const moves = [];
    const basicMoves = [];
    const startingMoves = [];
    const advancedMoves = [];
    const specialMoves = [];
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
      i.img = i.img || DEFAULT_TOKEN;
      // If this is a move, sort into various arrays.
      if (i.type === 'move') {
        switch (i.system.moveType) {
        case 'basic':
          basicMoves.push(i);
          break;

        case 'starting':
          startingMoves.push(i);
          break;

        case 'advanced':
          advancedMoves.push(i);
          break;

        case 'special':
          specialMoves.push(i);
          break;

        default:
          moves.push(i);
          break;
        }
      }
      else if (i.type === 'spell') {
        if (i.system.spellLevel != undefined) {
          spells[i.system.spellLevel].push(i);
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
    sheetData.moves = moves;
    sheetData.basicMoves = basicMoves;
    sheetData.startingMoves = startingMoves;
    sheetData.advancedMoves = advancedMoves;
    sheetData.specialMoves = specialMoves;
    // Spells
    sheetData.spells = spells;
    // Equipment
    sheetData.equipment = equipment;
    // Bonds
    sheetData.bonds = bonds;
  }

  /**
   * Prepare tagging.
   *
   * @param {Object} actorData The actor to prepare.
   */
  _prepareNpcItems(sheetData) {
    // Exit early if this isn't an npc.
    if (sheetData.actor.type != 'npc') return;

    // If there are tags, convert it into a string.
    if (sheetData.system.tags != undefined && sheetData.system.tags != '') {
      let tagArray = [];
      try {
        tagArray = JSON.parse(sheetData.system.tags);
      } catch (e) {
        tagArray = [sheetData.system.tags];
      }
      sheetData.system.tagsString = tagArray.map((item) => {
        return item.value;
      }).join(', ');
    }
    // Otherwise, set tags equal to the string.
    else {
      sheetData.system.tags = sheetData.system.tagsString;
    }

    const actorData = sheetData.actor;

    // Initialize containers.
    const moves = [];
    const basicMoves = [];
    const specialMoves = [];

    // Iterate through items, allocating to containers
    // let totalWeight = 0;
    for (let i of sheetData.items) {
      i.img = i.img || DEFAULT_TOKEN;
      // If this is a move, sort into various arrays.
      if (i.type === 'npcMove') {
        switch (i.system.moveType) {
        case 'basic':
          basicMoves.push(i);
          break;

        case 'special':
          specialMoves.push(i);
          break;

        default:
          moves.push(i);
          break;
        }
      }
    }

    // Assign and return
    sheetData.moves = moves;
    sheetData.basicMoves = basicMoves;
    sheetData.specialMoves = specialMoves;
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    if (this.actor.type == 'npc') {
      this._activateTagging(html);
    }

    if (!this.options.editable) return;

    // Rollables.
    html.find('.rollable').on('click', this._onRollable.bind(this));

    // Toggle look.
    html.find('.toggle--look').on('click', this._toggleLook.bind(this, html));

    // Owned Item management
    html.find('.item-create').click(this._onItemCreate.bind(this));
    html.find('.item-edit').click(this._onItemEdit.bind(this));
    html.find('.item-delete').click(this._onItemDelete.bind(this));

    // Moves
    html.find('.item-label').click(this._showItemDetails.bind(this));

    // Spells.
    html.find('.prepared').click(this._onPrepareSpell.bind(this));

	// Equipment.
    html.find('.equipped').click(this._onEquipEquipment.bind(this));

    // Adjust quantity/uses.
    html.find('.counter').on('click', event => this._onCounterClick(event, 'increase'));
    html.find('.counter').on('contextmenu', event => this._onCounterClick(event, 'decrease'));

    // Resources.
    html.find('.resource-control').click(this._onResouceControl.bind(this));

    // Adjust weight.
    this._adjustWeight(html);

    // Character builder dialog.
    html.find('.clickable-level-up').on('click', this._onLevelUp.bind(this));

    let isOwner = this.document.isOwner;
    if (isOwner) {
      /* Item Dragging */
      // Core handlers from foundry.js
      var handler;
      handler = ev => this._onDragStart(ev);
      html.find('li.item').each((i, li) => {
        if (li.classList.contains("inventory-header")) return;
        li.setAttribute("draggable", true);
        li.addEventListener("dragstart", handler, false);
      });
    }
  }

  /* -------------------------------------------- */

  _adjustWeight(html) {
    // Adjust weight.
    let $weight = html.find('[name="system.attributes.weight.value"]');
    let $weight_cell = html.find('.cell--weight');
    if ($weight.length > 0) {
      let weight = {
        current: Number($weight.val()),
        max: Number(html.find('[name="system.attributes.weight.max"]').val())
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

  _onResouceControl(event) {
    event.preventDefault();
    const control = $(event.currentTarget);
    const action = control.data('action');
    const attr = control.data('attr');
    // If there's an action and target attribute, update it.
    if (action && attr) {
      // Initialize data structure.
      let system = {};
      let changed = false;
      // Retrieve the existin value.
      system[attr] = Number(getProperty(this.actor.system, attr));
      // Decrease the value.
      if (action == 'decrease') {
        system[attr] -= 1;
        changed = true;
      }
      // Increase the value.
      else if (action == 'increase') {
        system[attr] += 1;
        changed = true;
      }
      // If there are changes, apply to the actor.
      if (changed) {
        this.actor.update({ system: system });
      }
    }
  }

  _showItemDetails(event) {
    event.preventDefault();
    const toggler = $(event.currentTarget);
    const toggleIcon = toggler.find('i');
    const item = toggler.parents('.item');
    const description = item.find('.item-description');

    toggler.toggleClass('open');
    description.slideToggle();
  }

  async _onLevelUp(event) {
    event.preventDefault();

    if ($(event.currentTarget).hasClass('disabled-level-up')) {
      return;
    }

    const actor = this.actor;
    const actorData = this.actor.system;
    let orig_class_name = actorData.details.class;
    let char_class_name = orig_class_name.trim();
    let class_list = await DwClassList.getClasses();
    let class_list_items = await DwClassList.getClasses(false);

    let char_class = DwUtility.cleanClass(char_class_name);
    let char_level = Number(actorData.attributes.level.value);

    // Handle level 1 > 2.
    if (actorData.attributes.xp.value != 0) {
      char_level = char_level + 1;
    }

    // Get the original class name if this was a translation.
    if (game.babele) {
      let babele_classes = game.babele.translations.find(p => p.collection == 'dungeonworld.classes');
      if (babele_classes) {
        let babele_pack = babele_classes.entries.find(p => p.name == char_class_name);
        if (babele_pack) {
          char_class_name = babele_pack.id;
          char_class = DwUtility.cleanClass(babele_pack.id);
        }
      }
    }

    if (!class_list.includes(orig_class_name) && !class_list.includes(char_class_name)) {
      ui.notifications.warn(game.i18n.localize('DW.Notifications.noClassWarning'));
      return;
    }


    const compendium = await DwUtility.loadCompendia(`${char_class}-moves`)

    let class_item = class_list_items.find(i => i.name == orig_class_name);
    if (!class_item?.system) {
      ui.notifications.warn(game.i18n.localize('DW.Notifications.noClassWarning'));
      return;
    }
    let blurb = class_item ? class_item.system.description : null;

    // Get races.
    let races = [];
    if (!this.actor.system.details.race.value || !this.actor.system.details.race.description) {
      races = class_item.system.races;
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
    if (!this.actor.system.details.alignment.value || !this.actor.system.details.alignment.description) {
      alignments = class_item.system.alignments;
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

    // Get equipment.
    let equipment = null;
    let equipment_list = [];
    if (actorData.attributes.xp.value == 0) {
      if (typeof class_item.system.equipment == 'object') {
        let equipmentObjects = await class_item._getEquipmentObjects();
        for (let [group, group_items] of Object.entries(equipmentObjects)) {
          class_item.system.equipment[group]['objects'] = group_items;
          equipment_list = equipment_list.concat(group_items);
        }
        equipment = duplicate(class_item.system.equipment);
      }
    }

    // Get ability scores.
    const noAbilityScores = game.settings.get('dungeonworld', 'noAbilityScores');
    let ability_scores = [16, 15, 13, 12, 9, 8];
    if (noAbilityScores) {
      ability_scores = [2, 1, 1, 0, 0, -1];
    }
    let ability_labels = Object.entries(CONFIG.DW.abilities).map(a => {
      return {
        short: a[0],
        long: a[1],
        disabled: Number(this.actor.system.abilities[a[0]].value) > 17
      }
    });

    // Retrieve the actor's current moves so that we can hide them.
    const actorMoves = this.actor.items.filter(i => i.type == 'move');

    // Get the item moves as the priority.
    let moves = game.items.filter(m => {
      if (m.type == 'move' && m.system.class == char_class_name) {
        const available_level = m.system.requiresLevel <= char_level;
        const not_taken = actorMoves.filter(i => i.name == m.name);
        const has_requirements = m.system.requiresMove ? actorMoves.filter(i => i.name == m.system.requiresMove).length > 0 : true;
        return available_level && not_taken.length < 1 && has_requirements;
      }
      return false;
    });
    // Get the compendium moves next.
    let moves_compendium = compendium.filter(m => {
      const available_level = m.system.requiresLevel <= char_level;
      // TODO: Babele: `const not_taken = actorMoves.filter(i => i.name == m.name || i.name === m.originalName);`
      const not_taken = actorMoves.filter(i => i.name == m.name);
      const has_requirements = m.system.requiresMove ? actorMoves.filter(i => i.name == m.system.requiresMove).length > 0 : true;
      return available_level && not_taken.length < 1 && has_requirements;
    });

    // Append compendium moves to the item moves.
    let moves_list = moves.map(m => {
      return m.name;
    })
    for (let move of moves_compendium) {
      if (!moves_list.includes(move.name)) {
        moves.push(move);
      }
    }

    // Sort the moves and build our groups.
    moves.sort((a, b) => {
      return a.system.requiresLevel - b.system.requiresLevel;
    });

    let starting_moves = [];
    let starting_move_groups = [];
    if (char_level < 2) {
      starting_moves = moves.filter(m => {
        return m.system.requiresLevel < 2;
      });

      starting_move_groups = starting_moves.reduce((groups, move) => {
        // Assign the undefined group to all Z's so that it's last.
        let group = move.system.moveGroup ? move.system.moveGroup : 'ZZZZZZZ';
        if (!groups[group]) {
          groups[group] = [];
        }

        groups[group].push(move);
        return groups;
      }, {});
    }

    let advanced_moves_2 = moves.filter(m => {
      return m.system.requiresLevel >= 2 && m.system.requiresLevel < 6;
    });

    let advanced_moves_6 = moves.filter(m => {
      return m.system.requiresLevel >= 6;
    });

    // Determine if spells can be cast.
    let cast_spells = [];
    let spells = null;
    if (char_class == 'the-wizard') {
      cast_spells.push('wizard');
    }
    else if (char_class == 'the-cleric') {
      cast_spells.push('cleric');
    }
    else {
      cast_spells.push(char_class);
    }

    if (cast_spells.length > 0) {
      // Retrieve the actor's current moves so that we can hide them.
      const actorSpells = this.actor.items.filter(i => i.type == 'spell');
      let caster_level = char_level;
      let spell_preparation_type = null;
      spells = [];
      for (let caster_class of cast_spells) {
        // Get the item spells as the priority.
        let spells_items = game.items.filter(i => {
          // Return true for custom spell items that have a class.
          return i.type == 'spell'
            && i.system.class
          // Check if this spell has either `classname` or `the classname` as its class.
            && [caster_class, `the ${caster_class}`].includes(DwUtility.cleanClass(i.system.class));
        });
        const spells_compendium = await DwUtility.loadCompendia(`${char_class}-spells`);

        // Get the compendium spells next.
        let spells_compendium_items = spells_compendium.filter(s => {
          const available_level = s.system.spellLevel <= caster_level;
          const not_taken = actorSpells.filter(i => i.name == s.name);
          return available_level && not_taken.length < 1;
        });

        // Append compendium spells to the item spells.
        let spells_list = spells.map(s => {
          return s.name;
        })
        // Add to the array, and also add to a sorted by level array.
        for (let spell of spells_compendium_items) {
          if (!spells_list.includes(spell.name)) {
            spells_items.push(spell);
          }
        }

        // Skip this class if there were no spells in it.
        if (spells_items.length < 1) {
          continue;
        }

        // Sort the spells and build our groups.
        spells_items.sort((a, b) => {
          return a.system.spellLevel - b.system.spellLevel;
        });

        let spell_groups = spells_items.reduce((groups, spell) => {
          // Default to rotes.
          let group = spell.system.spellLevel ? spell.system.spellLevel : 0;
          if (!groups[group]) {
            groups[group] = [];
          }

          groups[group].push(spell);
          return groups;
        }, {});

        // Get the description for how to prepare spells for this class.
        if (caster_class == 'wizard') {
          let move = moves.filter(m => m.name == 'Spellbook');
          if (move && move.length > 0) {
            spell_preparation_type = move[0].system.description;
          }
          else {
            move = actorMoves.filter(m => m.name == 'Spellbook');
            if (move && move.length > 0) {
              // @todo: v10 test this.
              spell_preparation_type = move[0].system.description;
            }
          }
        }
        else if (caster_class == 'cleric') {
          let move = moves.filter(m => m.name == 'Commune');
          if (move && move.length > 0) {
            spell_preparation_type = move[0].system.description;
          }
          else {
            move = actorMoves.filter(m => m.name == 'Commune');
            if (move && move.length > 0) {
              // @todo: v10 test this.
              spell_preparation_type = move[0].system.description;
            }
          }
        }

        spells.push({
          description: spell_preparation_type,
          spells: spell_groups
        });
      }
    }

    // Build the content.
    const template = 'systems/dungeonworld/templates/dialog/level-up.html';
    const templateData = {
      char_class: char_class,
      char_class_name: orig_class_name,
      blurb: blurb.length > 0 ? blurb : null,
      races: races.length > 0 ? races : null,
      alignments: alignments.length > 0 ? alignments : null,
      equipment: equipment ? equipment : null,
      ability_scores: actorData.attributes.xp.value == 0 ? ability_scores : null,
      ability_mods_only: noAbilityScores,
      ability_labels: ability_labels ? ability_labels : null,
      starting_moves: starting_moves.length > 0 ? starting_moves : null,
      starting_move_groups: starting_move_groups,
      advanced_moves_2: advanced_moves_2.length > 0 ? advanced_moves_2 : null,
      advanced_moves_6: advanced_moves_6.length > 0 ? advanced_moves_6 : null,
      cast_spells: cast_spells.length > 0 && spells.length > 0 ? true : false,
      spells: spells.length > 0 ? spells : null,
      no_ability_increase: game.settings.get('dungeonworld', 'noAbilityIncrease'),
    };
    const html = await renderTemplate(template, templateData);

    const itemData = {
      moves: moves,
      races: races,
      alignments: alignments,
      equipment: equipment_list,
      class_item: class_item,
      spells: spells,
    };

    // Initialize dialog options.
    const dlg_options = {
      width: 920,
      height: 640,
      classes: ['dw-level-up', 'dungeonworld', 'sheet'],
      resizable: true
    };

    if (CONFIG.DW.nightmode) {
      dlg_options.classes.push('nightmode');
    }

    // Render the dialog.
    let d = new Dialog({
      title: 'Level Up',
      content: html,
      id: 'level-up',
      buttons: {
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: game.i18n.localize("DW.Cancel"),
          callback: () => null
        },
        submit: {
          icon: '<i class="fas fa-check"></i>',
          label: game.i18n.localize("DW.Confirm"),
          callback: dlg => this._onLevelUpSave(dlg, this.actor, itemData, this)
          // callback: dlg => _onImportPower(dlg, this.actor)
        }
      },
      render: () => {
        $('.dw-level-up').find('.item-label').click(this._showItemDetails.bind(this));
      }
    }, dlg_options);
    d.render(true);


  }

  /**
   * Import moves.
   */
  async _onLevelUpSave(dlg, actor, itemData) {
    let $selected = $(dlg[0]).find('input:checked,select');

    if ($selected.length <= 0) {
      return;
    }

    let context = await this.getData();

    let move_ids = [];
    let equipment_ids = [];
    let spell_ids = [];
    let abilities = [];
    let race = null;
    let alignment = null;
    for (let input of $selected) {
      if (input.dataset.itemId) {
        if (input.dataset.type == 'move') {
          move_ids.push(input.dataset.itemId);
        }
        else if (input.dataset.type == 'equipment') {
          equipment_ids.push(input.dataset.itemId);
        }
        else if (input.dataset.type == 'spell') {
          spell_ids.push(input.dataset.itemId);
        }
      }
      else if (input.dataset.race) {
        race = itemData.races[input.dataset.race];
      }
      else if (input.dataset.alignment) {
        alignment = itemData.alignments[input.dataset.alignment];
      }
      else if (input.dataset.ability) {
        let val = $(input).find('option:selected').val();
        let abl = input.dataset.ability;
        if (val != null) {
          abilities[`abilities.${abl}.value`] = val;
        }
      }
      else if (input.dataset.type == 'ability-increase') {
        let abl = $(input).val();
        abilities[`abilities.${abl}.value`] = Number(actor.system.abilities[abl].value) + 1;
      }
    }

    // Add selected moves.
    let new_moves = null;
    if (move_ids.length > 0) {
      let moves = itemData.moves.filter(m => move_ids.includes(m.id));

      // Prepare moves for saving.
      new_moves = moves.map(m => {
        return duplicate(m);
      });
    }

    // Add selected equipment.
    let new_equipment = null;
    if (equipment_ids.length > 0) {
      let equipment = itemData.equipment.filter(e => equipment_ids.includes(e.id));
      new_equipment = equipment.map(e => {
        return duplicate(e);
      });
    }

    // Add selected spell.
    let new_spells = null;
    if (spell_ids.length > 0) {
      let spells = [];
      if (typeof itemData.spells == 'object') {
        // Loop over casting classes.
        for (let [key, obj] of Object.entries(itemData.spells)) {
          // Loop over spells by level.
          for (let [spellLevel, spellsByLevel] of Object.entries(obj.spells)) {
            spells = spells.concat(spellsByLevel.filter(s => spell_ids.includes(s.id)));
          }
        }
        // Append to the update array.
        new_spells = spells.map(s => {
          return duplicate(s);
        });
      }
    }

    const system = {};
    if (race) {
      system['details.race'] = {
        value: race.label,
        description: race.description
      };
    }
    if (alignment) {
      system['details.alignment'] = {
        value: alignment.label,
        description: alignment.description
      }
    }
    if (abilities != []) {
      for (let [key, update] of Object.entries(abilities)) {
        system[key] = update;
      }
    }

    // Adjust level.
    if (Number(actor.system.attributes.xp.value) > 0) {
      let xp = Number(actor.system.attributes.xp.value) - context.xpRequired;
      system['attributes.xp.value'] = xp > -1 ? xp : 0;
      system['attributes.level.value'] = Number(actor.system.attributes.level.value) + 1;
    }

    //Set Level 1 bonds
    if (Number(actor.system.attributes.xp.value) == 0) {
      let theclass = DwUtility.cleanClass(actor.system.details.class);
      let newbonds = [];

      for (let i = 1; i < 7; i++) {
        if (game.i18n.localize("DW." + theclass + ".Bond" + i ) != "DW." + theclass + ".Bond" + i ) {
          newbonds.push({name: game.i18n.localize("DW." + theclass + ".Bond" + i), type: 'bond', system: ''});
        }
      }

      if (newbonds.length > 0) {
        await actor.createEmbeddedDocuments('Item', newbonds);
      }
    }

    // Adjust hp.
    if (itemData.class_item.system.hp) {
      const noConstitutionToHP = game.settings.get('dungeonworld', 'noConstitutionToHP');
      let constitution = 0;
      if (!noConstitutionToHP) {
        constitution = actor.system.abilities.con.value;
        if (system['abilities.con.value']) {
          constitution = system['abilities.con.value'];
        }
      }
      system['attributes.hp.max'] = Number(itemData.class_item.system.hp) + Number(constitution);
      const hpDelta = Math.max(system['attributes.hp.max'] - actor.system.attributes.hp.max, 0);
      system['attributes.hp.value'] = hpDelta > 0 ? actor.system.attributes.hp.value + hpDelta : actor.system.attributes.hp.value;
    }

    // Adjust load.
    if (itemData.class_item.system.load) {
      const noSTRToMaxLoad = game.settings.get('dungeonworld', 'noSTRToMaxLoad');
      if (noSTRToMaxLoad) {
        system['attributes.weight.max'] = Number(itemData.class_item.system.load)
      } else {
        let strength = actor.system.abilities.str.value;
        if (system['abilities.str.value']) {
          strength = system['abilities.str.value'];
        }
        system['attributes.weight.max'] = Number(itemData.class_item.system.load) + Number(DwUtility.getAbilityMod(strength));
      }
    }

    // Adjust damage die.
    if (itemData.class_item.system.damage) {
      system['attributes.damage.value'] = itemData.class_item.system.damage;
    }

    if (new_moves) {
      await actor.createEmbeddedDocuments('Item', new_moves);
    }
    if (new_equipment) {
      await actor.createEmbeddedDocuments('Item', new_equipment);
    }
    if (new_spells) {
      await actor.createEmbeddedDocuments('Item', new_spells);
    }

    await actor.update({ system: system });
    await actor.setFlag('dungeonworld', 'levelup', false);
    // actor.render(true);
  }

  /**
   * Listen for click events on spells.
   * @param {MouseEvent} event
   */
  async _onPrepareSpell(event) {
    event.preventDefault();
    const a = event.currentTarget;
    const data = a.dataset;
    const actorData = this.actor.system;
    const itemId = $(a).parents('.item').attr('data-item-id');
    const item = this.actor.items.get(itemId);

    if (item) {
      let $self = $(a);
      $self.toggleClass('unprepared');

      let update = { "system.prepared": !item.system.prepared };
      await item.update(update, {});

      this.render();
    }
  }

  /**
   * Listen for click events on equipment.
   * @param {MouseEvent} event
   */
  async _onEquipEquipment(event) {
    event.preventDefault();
    const a = event.currentTarget;
    const data = a.dataset;
    const actorData = this.actor.system;
    const itemId = $(a).parents('.item').attr('data-item-id');
    const item = this.actor.items.get(itemId);

    if (item) {
      let $self = $(a);
      $self.toggleClass('unequipped');

      let update = 
      { "system.equipped": !item.system.equipped };
      await item.update(update, {});

      this.render();
    }
  }

  /**
   * Listen for click events on quantity/uses.
   * @param {MouseEvent} event
   */
  async _onCounterClick(event, changeType = 'increase') {
    event.preventDefault();
    const a = event.currentTarget;
    const dataset = a.dataset;
    const actorData = this.actor.system;
    const itemId = $(a).parents('.item').attr('data-item-id');
    const item = this.actor.items.get(itemId);

    if (!dataset.action || !item) return;

    let offset = changeType == 'increase' ? 1 : -1;
    let update = {};

    switch (dataset.action) {
    case 'uses':
      let uses = item.system?.uses ?? 0;
      update['system.uses'] = Number(uses) + offset;
      break;

    case 'quantity':
      let quantity = item.system?.quantity ?? 0;
      update['system.quantity'] = Number(quantity) + offset;
      break;

    default:
        break;
    }

    await item.update(update, {});

    this.render();
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
    const actorData = this.actor.system;
    const itemId = $(a).parents('.item').attr('data-item-id');
    const item = this.actor.items.get(itemId);
    let formula = null;
    let titleText = null;
    let flavorText = null;
    let templateData = {};

    let dice = DwUtility.getRollFormula('2d6');

    // Handle rolls coming directly from the ability score.
    if ($(a).hasClass('ability-rollable') && data.roll) {
      formula = data.roll;
      flavorText = data.label;
      if (data.debility) {
        flavorText += ` (${data.debility})`;
      }

      templateData = {
        title: flavorText
      };

      // this.rollMove(formula, actorData, data, templateData);
      DwRolls.rollMove({actor: this.actor, data: null, formula: formula, templateData: templateData});
    }
    else if ($(a).hasClass('damage-rollable') && data.roll) {
      formula = data.roll;
      titleText = data.label;
      flavorText = data.flavor;
      templateData = {
        title: titleText,
        flavor: flavorText
      };

      DwRolls.rollMove({actor: this.actor, data: null, formula: formula, templateData: templateData});
    }
    else if (itemId != undefined) {
      await item.roll();
    }
  }

  /**
   * Listen for toggling the look column.
   * @param {MouseEvent} event
   */
  async _toggleLook(html, event) {
    // Add a class to the sidebar.
    html.find('.sheet-look').toggleClass('closed');

    // Add a class to the toggle button.
    let $look = html.find('.toggle--look');
    $look.toggleClass('closed');

    // Update flags.
    let closed = $look.hasClass('closed');
    await this.actor.update({'flags.dungeonworld.sheetDisplay.sidebarClosed': closed});
  }

  /* -------------------------------------------- */
  /**
   * Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset
   * @param {Event} event   The originating click event
   * @private
   */
  async _onItemCreate(event) {
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
      system: data
    };
    delete itemData.system["type"];
    await this.actor.createEmbeddedDocuments('Item', [itemData], {});
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
    const item = this.actor.items.get(li.dataset.itemId);
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
    let item = this.actor.items.get(li.dataset.itemId);
    item.delete();
  }

  /* -------------------------------------------- */

  async _activateTagging(html) {
    // Build the tags list.
    let tags = game.items.filter(item => item.type == 'tag').map(item => item.name);
    for (let c of game.packs) {
      if (c.metadata.type && c.metadata.type == 'Item' && c.metadata.name == 'tags') {
        let items = c?.index ? c.index.map(indexedItem => {
          return indexedItem.name;
        }) : [];
        tags = tags.concat(items);
      }
    }
    // Reduce duplicates.
    let tagNames = [];
    for (let tag of tags) {
      let tagName = tag.toLowerCase();
      if (tagNames.includes(tagName) === false) {
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
    var $input = html.find('.tags-input-source');
    if (!this.isEditable) $input.prop('readonly', true);
    if ($input.length > 0) {
      // init Tagify script on the above inputs
      this.tagify = new Tagify($input[0], {
        whitelist: tagNames,
        maxTags: 'Infinity',
        dropdown: {
          maxItems: 20,           // <- mixumum allowed rendered suggestions
          classname: "tags-look", // <- custom classname for this dropdown, so it could be targeted
          enabled: 0,             // <- show suggestions on focus
          closeOnSelect: false    // <- do not hide the suggestions dropdown once an item has been selected
        }
      });

      // Update document with the changes.
      this.tagify.on('change', e => {
        // Grab the raw tags.
        let newTags = e.detail.value;
        // Parse it into a string.
        let tagArray = [];
        try {
          tagArray = JSON.parse(newTags);
        } catch (e) {
          tagArray = [newTags];
        }
        let newTagsString = tagArray.map((item) => {
          return item.value;
        }).join(', ');

        // Apply the update.
        this.document.update({
          'system.tags': newTags,
          'system.tagsString': newTagsString
        }, {render: false});
      });
    }
  }
}
