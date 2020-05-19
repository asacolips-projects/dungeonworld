/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheet}
 */
export class DwItemSheet extends ItemSheet {

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["dungeonworld", "sheet", "item"],
      width: 520,
      height: 480,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "details" }],
      submitOnChange: false,
    });
  }

  /* -------------------------------------------- */

  /** @override */
  get template() {
    const path = "systems/dungeonworld/templates/items";
    return `${path}/${this.item.data.type}-sheet.html`;
  }

  /* -------------------------------------------- */

  /** @override */
  async getData() {
    const data = super.getData();
    data.dtypes = ["String", "Number", "Boolean"];

    // Handle preprocessing for tagify data.
    if (data.entity.type == 'equipment') {
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


    return data;
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

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    // Add or Remove Attribute
    html.find(".class-fields").on("click", ".class-control", this._onClickClassControl.bind(this));

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

    // TODO: Create tags that don't already exist on focus out. This is a
    // nice-to-have, but it's high risk due to how easy it will make it to
    // create extra tags unintentionally.
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
    const field_values = this.object.data.data[field_type];
    const form = this.form;

    let field_types = {
      'races': 'race',
      'alignments': 'alignment'
    };

    console.log(field_types);

    // // Add new attribute
    if (action === "create") {
      const nk = Object.keys(field_values).length + 1;
      let newKey = document.createElement("div");
      newKey.innerHTML = `<li class="item ${field_types[field_type]}" data-index="${nk}">
  <div class="flexrow">
    <input type="text" class="input input--title" name="data.${field_type}.${nk}.label" value="" data-dtype="string"/>
    <a class="class-control" data-action="delete" data-type="${field_type}"><i class="fas fa-trash"></i></a>
  </div>
  <textarea class="${field_types[field_type]}" name="data.${field_type}.${nk}.description" rows="5" title="What's your ${field_types[field_type]}?" data-dtype="String"></textarea>
</li>`;
      console.log(newKey.children[0]);
      newKey = newKey.children[0];
      form.appendChild(newKey);
      await this._onSubmit(event);
    }

    // Remove existing attribute
    else if (action === "delete") {
      const li = a.closest(".item");
      const nk = li.dataset.index;
      li.parentElement.removeChild(li);
      let update = {};
      update[`data.${field_type}.-=${nk}`] = null;
      console.log(update);
      await this.object.update(update);
      await this._onSubmit(event);
    }
  }

  /* -------------------------------------------- */

  /** @override */
  _updateObject(event, formData) {

    // TODO: Determine if we still need this leftover code from the
    // Simple Worldbuilding System.

    // // Handle the free-form attributes list
    // const formAttrs = expandObject(formData).data.attributes || {};
    // const attributes = Object.values(formAttrs).reduce((obj, v) => {
    //   let k = v["key"].trim();
    //   if (/[\s\.]/.test(k)) return ui.notifications.error("Attribute keys may not contain spaces or periods");
    //   delete v["key"];
    //   obj[k] = v;
    //   return obj;
    // }, {});

    // // Remove attributes which are no longer used
    // for (let k of Object.keys(this.object.data.data.attributes)) {
    //   if (!attributes.hasOwnProperty(k)) attributes[`-=${k}`] = null;
    // }

    // // Re-combine formData
    // formData = Object.entries(formData).filter(e => !e[0].startsWith("data.attributes")).reduce((obj, e) => {
    //   obj[e[0]] = e[1];
    //   return obj;
    // }, { _id: this.object._id, "data.attributes": attributes });

    // Update the Item
    return this.object.update(formData);
  }
}
