export const displayChatActionButtons = function(message, html, data) {
  const chatCard = html.find(".dw.chat-card");
  if ( chatCard.length > 0 ) {
    // If the user is the message author or the actor owner, proceed.
    let actor = game.actors.get(data.message.speaker.actor);
    if ( game.user.isGM ) return;
    // Conceal damage buttons for non-GM users.
    chatCard.find('.button.damage, .button.heal').each((i, btn) => {
      btn.style.display = "none";
    });

    if ((data.author.id === game.user.id) || ( actor && actor.owner )) return;
    // Otherwise conceal action buttons.
    chatCard.find("button[data-action], .button-disabled").each((i, btn) => {
      btn.style.display = "none"
    });
  }
}

export const activateChatListeners = function(html) {
  html.on('click', 'button[data-action]', (event) => _onChatCardAction(event));
}

function _onChatCardAction(event) {
  event.preventDefault();

  // Extract card data
  const button = event.currentTarget;
  const card = button.closest(".chat-card");
  const messageId = button.closest(".message").dataset.messageId;
  const message =  game.messages.get(messageId);
  const action = button.dataset.action;

  // Validate permission to proceed with the roll
  const isTargetted = action === "save";
  if ( !( isTargetted || game.user.isGM || message.isAuthor ) ) return;

  // Chat damage.
  if (action.includes('damage') || action == 'heal') _chatActionDamage(message, action);

  // Recover the actor for the chat card
  const actor = card ? _getChatCardActor(card) : null;
  if ( !actor ) return;

  // Perform the action.
  if (action == 'xp') {
    button.disabled = true;
    _chatActionMarkXp(actor, message);
  }
}

/**
 * Get the Actor which is the author of a chat card
 * @param {HTMLElement} card    The chat card being used
 * @return {Actor|null}         The Actor entity or null
 * @private
 */
function _getChatCardActor(card) {

  // Case 1 - a synthetic actor from a Token
  const tokenKey = card.dataset.tokenId;
  if (tokenKey) {
    const [sceneId, tokenId] = tokenKey.split(".");
    const scene = game.scenes.get(sceneId);
    if (!scene) return null;
    const tokenData = scene.getEmbeddedEntity("Token", tokenId);
    if (!tokenData) return null;
    const token = new Token(tokenData);
    return token.actor;
  }

  // Case 2 - use Actor ID directory
  const actorId = card.dataset.actorId;
  return game.actors.get(actorId) || null;
}

async function _chatActionMarkXp(actor, message) {
  if (!actor.data || !actor.data.data.attributes.xp) return;

  let xp = actor.data.data.attributes.xp.value ?? 0;
  let updates = {
    'data.attributes.xp.value': Number(xp) + 1
  };

  // Update the actor.
  await actor.update(updates);

  // Update the chat message.
  let $content = $(message.data.content);
  let $button = $content.find('.xp-button');

  // Replace the button.
  let newButton = `<span class="xp-button button button-disabled">${game.i18n.localize("DW.XpMarked")} <i class="fas fa-check"></i></span>`;
  $button.replaceWith($(newButton));

  await message.update({'content': $content[0].outerHTML});
}

async function _chatActionDamage(message, action) {
  let actors = canvas.tokens.controlled.map(t => t.data.document.actor);
  if (!actors || actors.length < 1) return;

  let $content = $(message.data.content).text();
  // TODO: Localize this.
  let piercing = $content.match(/(\d+)\s*piercing|piercing\s*(\d+)/) ?? [];
  let options = {
    ignoreArmor: $content.toLowerCase().includes('ignores armor'),
    piercing: (piercing[1] ?? piercing[2]) ?? 0,
  };

  for (let actor of actors) {
    if (!actor.data || !actor.data.data.attributes.hp) return;

    let rollTotal = $(message.data.content).find('.dice-total')?.text() ?? 0;

    switch (action) {
      case 'damage':
        options.op = 'full';
        await actor.applyDamage(rollTotal, options);
        break;

      case 'half-damage':
        options.op = 'half';
        await actor.applyDamage(rollTotal, options);
        break;

      case 'double-damage':
        options.op = 'double';
        await actor.applyDamage(rollTotal, options);
        break;

      case 'heal':
        options.op = 'heal';
        await actor.applyDamage(rollTotal, options);
        break;

      default:
        break;
    }
  }

  // let $content = $(message.data.content);
  // let $button = $content.find('.chat-damage-buttons .button');

  // $button.prop('disabled', true).addClass('button-disabled');

  // await message.update({'content': $content[0].outerHTML});
}