export class DwRegisterHelpers {
  static init() {
    Handlebars.registerHelper('concat', function() {
      var outStr = '';
      for (var arg in arguments) {
        if (typeof arguments[arg] != 'object') {
          outStr += arguments[arg];
        }
      }
      return outStr;
    });

    Handlebars.registerHelper('toLowerCase', function(str) {
      return str.toLowerCase();
    });

    Handlebars.registerHelper('dwTags', function(tagsInput) {
      const tags = JSON.parse(tagsInput);
      let output = '<div class="tags">';
      for (let tag of tags) {
        output += `<div class="tag">${tag.value}</div>`;
      }
      output += '</div>';
      return output;
    });

    Handlebars.registerHelper('includes', function(haystack, needle, options) {
      if (haystack.includes(needle)) {
        return options.fn(this);
      }
    });

    Handlebars.registerHelper('ifor', function(arg1, arg2, options) {
      if (arg1 || arg2) {
        return options.fn(this);
      }
    })
  }
}