import { DwClassList } from "../config.js";

/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheet}
 */
export class DwItemSheet extends ItemSheet {

  /** @inheritdoc */
  constructor(...args) {
    super(...args);

    this.tagify = null;
    this.needsRender = false;
  }

  /** @override */
  static get defaultOptions() {
    let options = mergeObject(super.defaultOptions, {
      classes: ["dungeonworld", "sheet", "item"],
      width: 520,
      height: 480,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "details" }],
      submitOnChange: true,
    });

    if (CONFIG.DW.nightmode) {
      options.classes.push('nightmode');
    }

    return options;
  }

  /* -------------------------------------------- */

  /** @override */
  get template() {
    const path = "systems/dungeonworld/templates/items";
    return `${path}/${this.item.data.type}-sheet.html`;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async close(options={}) {
    await super.close(options);

    if (this.tagify) {
      // Destroy the tagify instance.
      this.tagify.destroy();
      // Re-render the parent actor.
      if (this.needsRender && this.object?.parent) this.object.parent.render(true);
    }

  }

  /* -------------------------------------------- */

  /** @override */
  async getData() {
    let isOwner = false;
    let isEditable = this.isEditable;
    // const data = super.getData();
    const itemData = this.item.data.toObject(false);
    const data = itemData.data;
    // const data = foundry.utils.deepClone(this.object.data);
    let items = {};
    let effects = {};
    let actor = null;

    this.options.title = this.document.data.name;
    isOwner = this.document.isOwner;
    isEditable = this.isEditable;

    // Copy Active Effects
    effects = this.object.effects.map(e => foundry.utils.deepClone(e.data));
    data.effects = effects;

    // Grab the parent actor, if any.
    actor = this.object?.parent?.data;

    data.dtypes = ["String", "Number", "Boolean"];
    // Add classlist.
    data.classlist = await DwClassList.getClasses();

    // Handle preprocessing for tagify data.
    if (itemData.type == 'equipment') {
      // If there are tags, convert it into a string.
      if (data.tags != undefined && data.tags != '') {
        let tagArray = [];
        try {
          tagArray = JSON.parse(data.tags);
        } catch (e) {
          tagArray = [data.tags];
        }
        data.tagsString = tagArray.map((item) => {
          return item.value;
        }).join(', ');
      }
      // Otherwise, set tags equal to the string.
      else {
        data.tags = data.tagsString;
      }
    }

    // Handle move results.
    if (itemData.type == 'move' || itemData.type == 'npcMove') {
      if (data.moveResults) {
        for (let key of Object.keys(data.moveResults)) {
          data.moveResults[key].key = `data.moveResults.${key}.value`;
        }
      }
    }

    let returnData = {
      item: this.object.data.document,
      cssClass: isEditable ? "editable" : "locked",
      editable: isEditable,
      data: data,
      effects: effects,
      limited: this.object.limited,
      options: this.options,
      owner: isOwner,
      title: data.name
    };

    return returnData;
  }

  /* -------------------------------------------- */

  /** @override */
  async activateListeners(html) {
    super.activateListeners(html);

    // Activate tabs
    let tabs = html.find('.tabs');
    let initial = this._sheetTab;
    new TabsV2(tabs, {
      initial: initial,
      callback: clicked => this._sheetTab = clicked.data("tab")
    });

    this._tagify(html, this.isEditable);

    // Everything below here is only needed if the sheet is editable
    if (!this.isEditable) return;

    this.html = html;

    // Add or Remove Attribute
    html.find(".class-fields").on("click", ".class-control", this._onClickClassControl.bind(this));

    // TODO: Create tags that don't already exist on focus out. This is a
    // nice-to-have, but it's high risk due to how easy it will make it to
    // create extra tags unintentionally.
  }

  /**
   * Add tagging widget.
   */
  async _tagify(html, editable) {
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
    if ($input.length > 0) {
      if (!editable) {
        $input.attr('readonly', true);
      }

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
          'data.tags': newTags,
          'data.tagsString': newTagsString
        }, {render: false});

        this.needsRender = true;
      });
    }
  }

  /* -------------------------------------------- */

  /**
   * Listen for click events on an attribute control to modify the composition of attributes in the sheet
   * @param {MouseEvent} event    The originating left click event
   * @private
   */
  async _onClickClassControl(event) {
    event.preventDefault();
    const a = event.currentTarget;
    const action = a.dataset.action;
    const field_type = a.dataset.type;
    const form = this.form;

    let field_types = {
      'races': 'race',
      'alignments': 'alignment'
    };

    // // Add new attribute
    if (action === "create") {
      if (Object.keys(field_types).includes(field_type)) {
        const field_values = this.object.data.data[field_type];
        const nk = Object.keys(field_values).length + 1;
        let newKey = document.createElement("div");
        newKey.innerHTML = `<li class="item ${field_types[field_type]}" data-index="${nk}">
    <div class="flexrow">
      <input type="text" class="input input--title" name="data.${field_type}.${nk}.label" value="" data-dtype="string"/>
      <a class="class-control" data-action="delete" data-type="${field_type}"><i class="fas fa-trash"></i></a>
    </div>
    <textarea class="${field_types[field_type]}" name="data.${field_type}.${nk}.description" rows="5" title="What's your ${field_types[field_type]}?" data-dtype="String"></textarea>
  </li>`;
        newKey = newKey.children[0];
        form.appendChild(newKey);
        await this._onSubmit(event);
      }
      else if (field_type == 'equipment-groups') {
        const field_values = this.object.data.data.equipment;
        const nk = Object.keys(field_values).length + 1;
        let template = '/systems/dungeonworld/templates/items/_class-sheet--equipment-group.html';
        let templateData = {
          group: nk
        };
        let newKey = document.createElement('div');
        newKey.innerHTML = await renderTemplate(template, templateData);
        newKey = newKey.children[0];

        let update = duplicate(this.object.data);
        update.data.equipment[nk] = {
          label: '',
          mode: 'radio',
          items: [],
          objects: []
        };

        await this.object.update(update);

        form.appendChild(newKey);
        await this._onSubmit(event);
      }
    }

    // Remove existing attribute
    else if (action === "delete") {
      const field_type = a.dataset.type;
      if (field_type == 'equipment-groups') {
        let elem = a.closest('.equipment-group');
        const nk = elem.dataset.index;
        elem.parentElement.removeChild(elem);
        let update = {};
        update[`data.equipment.-=${nk}`] = null;
        await this.object.update(update);
        await this._onSubmit(event);
      }
      else {
        const li = a.closest(".item");
        const nk = li.dataset.index;
        li.parentElement.removeChild(li);
        let update = {};
        update[`data.${field_type}.-=${nk}`] = null;
        await this.object.update(update);
        await this._onSubmit(event);
      }
    }
  }

  /* -------------------------------------------- */

  /** @override */
  _updateObject(event, formData) {

    // Exit early for other item types.
    if (this.object.type != 'class') {
      return this.object.update(formData);
    }

    // Handle the freeform lists on classes.
    const formObj = expandObject(formData);

    // Re-index the equipment.
    let i = 0;
    let deletedKeys = [];
    if (typeof formObj.data.equipment == 'object') {
      for (let [k, v] of Object.entries(formObj.data.equipment)) {
        if (i != k) {
          v.items = duplicate(this.object.data.data.equipment[k].items);
          formObj.data.equipment[i] = v;
          delete formObj.data.equipment[k];
          deletedKeys.push(`equipment.${k}`);
        }
        i++;
      }
    }

    // Re-index the races.
    i = 0;
    if (typeof formObj.data.races == 'object') {
      for (let [k, v] of Object.entries(formObj.data.races)) {
        if (i != k) {
          formObj.data.races[i] = v;
          delete formObj.data.races[k];
          deletedKeys.push(`races.${k}`);
        }
        i++;
      }
    }

    // Re-index the alignments.
    i = 0;
    if (typeof formObj.data.alignments == 'object') {
      for (let [k, v] of Object.entries(formObj.data.alignments)) {
        if (i != k) {
          formObj.data.alignments[i] = v;
          delete formObj.data.alignments[k];
          deletedKeys.push(`alignments.${k}`);
        }
        i++;
      }
    }

    // Remove deleted keys.
    for (let k of deletedKeys) {
      const keys = k.split('.');
      if (formObj.data[keys[0]][keys[1]] == undefined) {
        formObj.data[keys[0]][`-=${keys[1]}`] = null;
      }
    }

    // Re-combine formData
    formData = Object.entries(formData).filter(e => !e[0].match(/data\.(equipment|alignments|races)/g)).reduce((obj, e) => {
      obj[e[0]] = e[1];
      return obj;
    }, {
      _id: this.object._id,
      "data.equipment": formObj.data.equipment,
      "data.races": formObj.data.races,
      "data.alignments": formObj.data.alignments
    });


    // Update the Item
    return this.object.update(formData);
  }
}
