export class CombatSidebarDw {
  startup() {
    CONFIG.debug.hooks = true;

    // TODO: Replace this hack that triggers an extra render.
    Hooks.on('renderSidebar', () => {
      setTimeout(() => {
        ui.combat.render();
      }, 250);
    });

    Hooks.on('renderCombatTracker', async (app, html, options) => {
      console.log(app.tabName);
      if (app.tabName != 'combat') {
        return;
      }

      // html.html('Test!');
      let newHtml = html.find('#combat');
      if (newHtml.length < 1) {
        newHtml = html;
      }

      if (game.combat) {
        let combatants = game.combat.data ? game.combat.data.combatants : [];

        let template = 'systems/dungeonworld/templates/combat/combat.html';
        let templateData = {
          combatants: this.getCombatantsData()
        };

        let content = await renderTemplate(template, templateData)
        newHtml.find('#combat-tracker').remove();
        newHtml.find('#combat-round').after(content);
      }
    });
  }

  getCombatantsData() {
    if (!game.combat || !game.combat.data) {
      return [];
    }

    let combatants = game.combat.data.combatants.reduce((groups, combatant) => {
      let group = combatant.actor.data.type;
      if (!groups[group]) {
        groups[group] = [];
      }

      groups[group].push(combatant);
      return groups;
    }, {});

    return combatants;
  }
}

// export class PopcornViewer extends Application {
//   super(options) {
//     //console.log("Super called");
//   }

//   activateListeners(html) {
//     super.activateListeners(html);
//     const myButton = html.find("button[name='act']");
//     myButton.on("click", event => this._onClickButton(event, html));
//   }

//   static async _onClickButton(event, html) {
//     //console.log("Event target id "+event.target.id);

//     const tokenId = event.target.id;
//     const token = canvas.tokens.get(tokenId);

//     await token.setFlag("world", "popcornHasActed", true);
//     await ChatMessage.create({
//       content: `${token.name} has taken their action for the exchange.`,
//       speaker:
//       {
//         alias: "Game: "
//       }
//     });
//     game.socket.emit("module.Popcorn", { "HasActed": true });
//     this.render(false);
//   }

//   static prepareButtons(hudButtons) {
//     let hud = hudButtons.find(val => { return val.name == "token"; })

//     if (hud) {
//       hud.tools.push({
//         name: "PopcornInitiative",
//         title: "Pop-out popcorn initiative tracker",
//         icon: "fas fa-bolt",
//         onClick: () => {
//           const delay = 200;

//           let opt = Dialog.defaultOptions;
//           opt.resizable = true;
//           opt.title = "Popcorn Initiative Tracker";
//           opt.width = 400;
//           opt.height = 500;
//           opt.minimizable = true;

//           var viewer;
//           viewer = new PopcornViewer(opt);
//           viewer.render(true);

//           Hooks.on('renderCombatTracker', () => {
//             setTimeout(function() { viewer.render(false); }, delay);
//           })

//           game.socket.on("module.Popcorn", data => viewer.render(false))
//         },
//         button: true
//       });
//     }
//   }

//   getData() {
//     let content = { content: `${this.preparePopcorn()}` }
//     return content;
//   }

//   preparePopcorn() {
//     //console.log("PreparePopcorn called");
//     //Get a list of the active combatants
//     if (game.combat != null) {
//       var combatants = game.combat.combatants;
//       var tokens = canvas.tokens.placeables;
//       var tokenId;
//       var viewer = viewer;

//       let table = `<h1>Exchange ${game.combat.round}</h1><table border="1" cellspacing="0" cellpadding="4">`;

//       //Create a header row
//       let rows;
//       if (game.user.isGM) {
//         rows = [`<tr><td style="background: black; color: white;"></td><td style="background: black; color: white;">Character</td><td style="background: black; color: white;">Act Now?</td>`];
//       } else {
//         rows = [`<tr><td style="background: black; color: white;"></td><td style="background: black; color: white;">Character</td>`];
//       }
//       //Create a row for each combatant with the correct flag
//       for (var i = 0; i < combatants.length; i++) {
//         if (combatants[i].token != undefined) {
//           tokenId = combatants[i].token._id;//This is the representative of a token in the combatants list.
//         }
//         //Now to find the token in the placeables layer that corresponds to this token.

//         let foundToken = undefined;

//         if (tokenId != undefined) {
//           foundToken = tokens.find(val => { return val.id == tokenId; })
//         }

//         let hasActed = true;

//         if (foundToken != undefined) {
//           //There is no token for this actor in the conflict; it probably means the token has been deleted from the scene. We need to ignore this actor. Easiest way to do that is to leave hasActed as true.
//           hasActed = foundToken.getFlag("world", "popcornHasActed");
//         }

//         if (game.user.isGM) {
//           if (hasActed == undefined || hasActed == false) {
//             rows.push(`<tr><td width="70"><img src="${foundToken.actor.img}" width="50" height="50"></img>
//                 </td><td>${foundToken.name}</td>
//                 <td><button type="button" id="${tokenId}" name="act" onclick=''>Act</button></td></tr>`);
//           }
//         } else {
//           if (hasActed == undefined || hasActed == false) {
//             rows.push(`<tr><td width="70"><img src="${foundToken.actor.img}" width="50" height="50"></img></td><td>${foundToken.name}</td>`)
//           }
//         }
//       }
//       let myContents = `${table}`;
//       rows.forEach(element => myContents += element)
//       myContents += "</table>"
//       if (game.user.isGM) {
//         myContents += `<button type ="button" onclick='
//             let actors = canvas.tokens.placeables;
//             actors.forEach(actor =>{actor.setFlag("world","popcornHasActed",false)});
//             game.combat.nextRound();
//             ChatMessage.create({content: "Starting a new exchange.", speaker : { alias : "Game: "}})
//             '>Next Exchange</button><p>`
//         myContents += `<button type ="button" onclick='
//             let actors = canvas.tokens.placeables;
//             actors.forEach(actor =>{actor.setFlag("world","popcornHasActed",false)});
//             game.combat.endCombat();
//             ChatMessage.create({content: "Ending the conflict.", speaker : { alias : "Game: "}})
//             '>End this conflict</button>`
//       }
//       return myContents;
//     } else { return "<h1>No Conflicts Detected!</h1>" }
//   }

//   // This function prepares the contents of the popcorn initiative viewer
//   // Display the current exchange number
//   // Display the actor icon of each combatant for which popcornHasActed is false or undefined.
//   // Display the name of each combatant for which popcornHasActed is false or undefined.
//   // Display a button that says 'act now'
//   // At the end of the display of buttons etc. display a button that says 'next exchange'.

// }