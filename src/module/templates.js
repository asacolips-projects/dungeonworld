/**
 * Define a set of template paths to pre-load
 * Pre-loaded templates are compiled and cached for fast access when rendering
 * @return {Promise}
 */
 export const preloadHandlebarsTemplates = async function() {

  // Define template paths to load
  const templatePaths = [
    "systems/dungeonworld/templates/parts/chat-buttons.html",
    "systems/dungeonworld/templates/parts/sheet-moves.html",
    "systems/dungeonworld/templates/parts/sheet-level-up-move.html"
  ];

  // Load the template parts
  return loadTemplates(templatePaths);
};