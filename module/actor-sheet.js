/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class DwActorSheet extends ActorSheet {

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["dungeonworld", "sheet", "actor"],
      template: "systems/dungeonworld/templates/actor-sheet.html",
      width: 750,
      height: 850,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "main" }]
    });
  }

  /* -------------------------------------------- */

  /** @override */
  getData() {
    const data = super.getData();
    data.dtypes = ["String", "Number", "Boolean"];
    for (let attr of Object.values(data.data.attributes)) {
      attr.isCheckbox = attr.dtype === "Boolean";
    }
    // Ability Scores
    // for (let [a, abl] of Object.entries(data.actor.data.abilities)) {
    //   abl.mod = Math.floor((abl.value - 10) / 2);
    //   abl.label = CONFIG.DW.abilities[a];
    //   abl.debilityLabel = CONFIG.DW.debilities[a];
    //   // Adjust mod based on debility.
    //   if (abl.debility) {
    //     abl.mod -= 1;
    //   }
    // }
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
    const equipment = [];

    // Iterate through items, allocating to containers
    // let totalWeight = 0;
    for (let i of sheetData.items) {
      let item = i.data;
      i.img = i.img || DEFAULT_TOKEN;
      if (i.type === 'move') {
        moves.push(i);
      }
      else if (i.type === 'equipment') {
        equipment.push(i);
      }
    }

    // Assign and return
    actorData.moves = moves;
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
  }

  /* -------------------------------------------- */

  /**
   * Listen for click events on an attribute control to modify the composition of attributes in the sheet
   * @param {MouseEvent} event    The originating left click event
   * @private
   */
  async _onClickAttributeControl(event) {
    event.preventDefault();
    const a = event.currentTarget;
    const action = a.dataset.action;
    const attrs = this.object.data.data.attributes;
    const form = this.form;

    // Add new attribute
    if (action === "create") {
      const nk = Object.keys(attrs).length + 1;
      let newKey = document.createElement("div");
      newKey.innerHTML = `<input type="text" name="data.attributes.attr${nk}.key" value="attr${nk}"/>`;
      newKey = newKey.children[0];
      form.appendChild(newKey);
      await this._onSubmit(event);
    }

    // Remove existing attribute
    else if (action === "delete") {
      const li = a.closest(".attribute");
      li.parentElement.removeChild(li);
      await this._onSubmit(event);
    }
  }

  /**
   * Listen for click events on rollables.
   * @param {MouseEvent} event
   */
  async _onRollable(event) {
    event.preventDefault();
    const a = event.currentTarget;
    const data = a.dataset;

    if ($(a).hasClass('ability-rollable') && data.mod) {
      let roll = new Roll(`2d6+${data.mod}`);
      let flavorTextt = `<strong>${data.label}</strong>`;
      if (data.debility) {
        flavorTextt += ` (${data.debility})`;
      }
      roll.roll();
      roll.toMessage({ flavor: flavorTextt });
    }
  }

  /**
   * Listen for toggling the look column.
   * @param {MouseEvent} event
   */
  _toggleLook(html, event) {
    console.log(html);
    console.log(event);
    console.log(html.find('.toggle'));

    let $look = html.find('.toggle--look');

    html.find('.sheet-look').toggleClass('closed');
    $look.toggleClass('closed');

    if ($look.hasClass('closed')) {
      $look.text('>>');
    }
    else {
      $look.text('<<');
    }
  }

  /* -------------------------------------------- */

  /** @override */
  _updateObject(event, formData) {

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
