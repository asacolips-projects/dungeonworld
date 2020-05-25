import { DwItemSheet } from './item-sheet.js';
import { DwUtility } from "../utility.js";

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
      submitOnChange: true,
    });
  }

  /* -------------------------------------------- */

  /** @override */
  get template() {
    const path = "systems/dungeonworld/templates/items";
    return `${path}/${this.item.data.type}-sheet.html`;
  }

  async getData() {
    const data = await super.getData();
    let equipmentObjects = await this.item._getEquipmentObjects();
    for (let [group, group_items] of Object.entries(equipmentObjects)) {
      data.data.equipment[group]['objects'] = group_items;
    }
    return data;
  }

  async activateListeners(html) {
    super.activateListeners(html);

    // Add drag events.
    html.find('.drop-area')
      .on('dragover', this._onDragOver.bind(this))
      .on('dragleave', this._onDragLeave.bind(this))
      .on('drop', this._onDrop.bind(this));

    // Delete equipment.
    html.find('.delete-equipment').on('click', this._onItemDelete.bind(this));
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
    this._createEquipment(data.id, group);

    $dropTarget.removeClass('drop-hover');

    return false;
  }

  async _onItemDelete(event) {
    event.preventDefault();
    const item = event.currentTarget.closest('.tag');
    const itemId = item.dataset.itemId;
    const group = event.currentTarget.closest('.item-container');
    const groupId = group.dataset.group;
    this._deleteEquipment(item.dataset.itemId, groupId);
  }

  async _deleteEquipment(equipmentId, groupId) {
    let itemData = duplicate(this.item.data);

    // Filter items.
    let newItems = itemData.data.equipment[groupId]['items'].filter(i => i != equipmentId);
    itemData.data.equipment[groupId]['items'] = newItems;

    // Update the entity.
    await this.item.update(itemData, { diff: false });
    this.render(true);
  }

  async _createEquipment(equipmentId, groupId) {
    let itemData = duplicate(this.item.data);

    // Filter items.
    let existing_items = [];

    if (!DwUtility.isEmpty(itemData.data.equipment[groupId]['items'])) {
      existing_items = itemData.data.equipment[groupId]['items'];
    }
    else {
      existing_items = [];
    }
    // Append our item.
    if (!existing_items.includes(equipmentId)) {
      existing_items.push(equipmentId);
      itemData.data.equipment[groupId]['items'] = existing_items;
      // Update the entity.
      await this.item.update(itemData, { diff: false });
      this.render(true);
    }

  }

}