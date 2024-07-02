import { DwActorSheet } from './actor-sheet.js';

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class DwActorNpcSheet extends DwActorSheet {

  /** @override */
  static get defaultOptions() {
    let options = foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dungeonworld", "sheet", "actor", "npc"],
      width: 560,
      height: 640,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "moves" }]
    });

    if (CONFIG.DW.nightmode) {
      options.classes.push('nightmode');
    }

    return options;
  }

}