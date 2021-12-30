import { DwUtility } from "../utility.js";
import { DwRolls } from "../rolls.js";

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
          equipment[group] = items.filter(i => group_items['items'].includes(i.id));
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
    DwRolls.rollMove({actor: this.actor, data: this.data});
  }
}