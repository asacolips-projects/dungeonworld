import { DwItemSheet } from './item-sheet.js';

/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheet}
 */
export class DwClassItemSheet extends DwItemSheet {

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["dungeonworld", "sheet", "item", "class"],
      width: 960,
      height: 640,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "equipment" }],
      submitOnChange: false,
    });
  }

  /* -------------------------------------------- */

  /** @override */
  get template() {
    const path = "systems/dungeonworld/templates/items";
    return `${path}/${this.item.data.type}-sheet.html`;
  }

  async activateListeners(html) {
    super.activateListeners(html);

    // Add drag events.
    html.find('.drop-area')
      .on('dragover', this._onDragOver.bind(this))
      .on('dragleave', this._onDragLeave.bind(this))
      .on('drop', this._onDrop.bind(this));
  }

  /* -------------------------------------------- */

  async _onDragOver(ev) {
    let $self = $(ev.originalEvent.target);
    let $dropTarget = $self;
    $dropTarget.addClass('drop-hover');
    return false;
  }

  async _onDragLeave(ev) {
    let $self = $(ev.originalEvent.target);
    let $dropTarget = $self;
    $dropTarget.removeClass('drop-hover');
    return false;
  }

  async _onDrop(ev) {
    // Get the journal ID and drop target.
    // let journalId = ev.originalEvent.dataTransfer.getData('gm-screen-id');
    let $self = $(ev.originalEvent.target);
    let $dropTarget = $self;
    let updated = false;

    // Get data.
    let data;
    try {
      data = JSON.parse(ev.originalEvent.dataTransfer.getData('text/plain'));
      if (data.type !== "Item") return;
    } catch (err) {
      return false;
    }

    let group = $dropTarget.data('group');

    if (group) {
      // Get the existing items.
      let existing_items = this.item.data.data.equipment[group];
      existing_items = !Array.isArray(existing_items) ? [] : existing_items;
      // Append our item.
      if (!existing_items.includes(data.id)) {
        existing_items.push(data.id);
        updated = true;
      }
      console.log(existing_items);
      // Prepare the update object.
      // updateData[`data.equipment.${group}`] = existing_items;

      // console.log(updateData);
      // updateData[`data.equipment.${group}`] = null;
      // await this.item.update(updateData);
      // updateData[`data.equipment.${group}`] = existing_items;

      if (updated) {
        let itemData = duplicate(this.item.data);
        itemData.data.equipment[group] = existing_items;
        await this.item.update(itemData, { diff: false });
        this.render(true);
      }
    }
    $dropTarget.removeClass('drop-hover');

    return false;
  }

  // /** @override */
  // async _onDrop(event) {

  //   // Try to extract the data
  //   let data;
  //   try {
  //     data = JSON.parse(event.dataTransfer.getData('text/plain'));
  //     if (data.type !== "Item") return;
  //   } catch (err) {
  //     return false;
  //   }

  //   console.log(data);

  //   // // Case 1 - Import from a Compendium pack
  //   // const actor = this.actor;
  //   // if (data.pack) {
  //   //   return actor.importItemFromCollection(data.pack, data.id);
  //   // }

  //   // // Case 2 - Data explicitly provided
  //   // else if (data.data) {
  //   //   let sameActor = data.actorId === actor._id;
  //   //   if (sameActor && actor.isToken) sameActor = data.tokenId === actor.token.id;
  //   //   if (sameActor) return this._onSortItem(event, data.data); // Sort existing items
  //   //   else return actor.createEmbeddedEntity("OwnedItem", duplicate(data.data));  // Create a new Item
  //   // }

  //   // // Case 3 - Import from World entity
  //   // else {
  //   //   let item = game.items.get(data.id);
  //   //   if (!item) return;
  //   //   return actor.createEmbeddedEntity("OwnedItem", duplicate(item.data));
  //   // }
  // }

}