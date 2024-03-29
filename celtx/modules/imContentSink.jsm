/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is the Instantbird messenging client, released
 * 2009.
 *
 * The Initial Developer of the Original Code is
 * Florian QUEZE <florian@instantbird.org>.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

var EXPORTED_SYMBOLS = [
  "cleanupImMarkup", // used to clean up incoming IMs.
                     // This will use the global ruleset of acceptable stuff
                     // except if another (custom one) is provided
  "createDerivedRuleset", // used to create a ruleset that inherits from the
                          // default one
                          // useful if you want to allow or forbid
                          // an additionnal thing in a specific
                          // conversation but take into account all
                          // the other global settings.
  "addGlobalAllowedTag",
  "removeGlobalAllowedTag",
  "addGlobalAllowedAttribute",
  "removeGlobalAllowedAttribute",
  "addGlobalAllowedStyleRule",
  "removeGlobalAllowedStyleRule"
];

/*
 * Structure of a ruleset:
 * A ruleset is a JS object containing 3 sub-objects: attrs, tags and styles.
 *  - attrs: an object containing a list of attributes allowed for all tags.
 *      example: attrs: { 'style': true }
 *
 *  - tags: an object with the allowed tags. each tag can allow specific attributes.
 *      example: 'a': {'href': true}
 *
 *    each attribute can have a function returning a boolean indicating if
 *    the attribute is accepted.
 *      example: 'href': function(aValue) aValue == 'about:blank'
 *
 *  - styles: an object with the allowed CSS style rule.
 *      example: 'font-size': true
 *    FIXME: make this accept functions to filter the CSS values too.
 *
 *  See the 3 examples of rulesets below.
 */

const kAllowedURLs = function(aValue) /^(https?|ftp):/.test(aValue);

// in strict mode, remove all formatings. Keep only links and line breaks.
const kStrictMode = {
  attrs: { },

  tags: {
    'a': {
      'title': true,
      'href': kAllowedURLs
    },
    'br': true,
    'p': true
  },

  styles: { }
};

// standard mode allows basic formattings (bold, italic, underlined)
const kStandardMode = {
  attrs: {
    'style': true
  },

  tags: {
    'div': true,
    'a': {
      'title': true,
      'href': kAllowedURLs
    },
    'em': true,
    'strong': true,
    'b': true,
    'i': true,
    'u': true,
    'span': true,
    'br': true,
    'code': true,
    'ul': true,
    'li': true,
    'ol': true,
    'cite': true,
    'blockquote': true,
    'p': true
  },

  styles: {
    'font-style': true,
    'font-weight': true,
    'text-decoration': true
  }
};

// permissive mode allows about anything that isn't going to mess up the chat window
const kPermissiveMode = {
  attrs: {
    'style': true
  },

  tags : {
    'div': true,
    'a': {
      'title': true,
      'href': kAllowedURLs
    },
    'font': {
      'face': true,
      'color': true,
      'size': true
    },
    'em': true,
    'strong': true,
    'b': true,
    'i': true,
    'u': true,
    'span': true,
    'br': true,
    'hr': true,
    'code': true,
    'ul': true,
    'li': true,
    'ol': true,
    'cite': true,
    'blockquote': true,
    'p': true
  },

  // FIXME: should be possible to use functions to filter values
  styles : {
    'color': true,
    'font': true,
    'font-family': true,
    'font-size': true,
    'font-style': true,
    'font-weight': true,
    'text-decoration': true
  }
};

const modePref = "messenger.options.filterMode";
const kModes = [kStrictMode, kStandardMode, kPermissiveMode];

var gGlobalRuleset = null;

function initGlobalRuleset()
{
  gGlobalRuleset = newRuleset();

  Components.classes["@mozilla.org/preferences-service;1"]
            .getService(Components.interfaces.nsIPrefBranch2)
            .addObserver(modePref, styleObserver, false);
}

var styleObserver = {
  observe: function so_observe(aObject, aTopic, aMsg) {
    if (aTopic != "nsPref:changed" || aMsg != modePref)
      throw "bad notification";

    if (!gGlobalRuleset)
      throw "gGlobalRuleset not initialized";

    setBaseRuleset(getModePref(), gGlobalRuleset);
  }
};

function getModePref()
{
  let baseNum =
    Components.classes["@mozilla.org/preferences-service;1"]
              .getService(Components.interfaces.nsIPrefBranch)
              .getIntPref(modePref);
  if (baseNum < 0 || baseNum > 2)
    baseNum = 1;

  return kModes[baseNum];
}

function setBaseRuleset(aBase, aResult)
{
  aResult.tags.__proto__ = aBase.tags;
  aResult.attrs.__proto__ = aBase.attrs;
  aResult.styles.__proto__ = aBase.styles;
}

function newRuleset(aBase)
{
  if (!aBase)
    aBase = getModePref();

  var result = {};
  result.tags = {};
  result.attrs = {};
  result.styles = {};
  setBaseRuleset(aBase, result);
  return result;
}

function createDerivedRuleset()
{
  if (!gGlobalRuleset)
    initGlobalRuleset();
  return newRuleset(gGlobalRuleset);
}

function addGlobalAllowedTag(aTag, aAttrs)
{
  gGlobalRuleset.tags[aTag] = aAttrs || true;
}
function removeGlobalAllowedTag(aTag)
{
  delete gGlobalRuleset.tags[aTag];
}

function addGlobalAllowedAttribute(aAttr, aRule)
{
  gGlobalRuleset.attrs[aAttr] = aRule || true;
}
function removeGlobalAllowedAttribute(aAttr)
{
  delete gGlobalRuleset.attrs[aAttr];
}

function addGlobalAllowedStyleRule(aStyle, aRule)
{
  gGlobalRuleset.styles[aStyle] = aRule || true;
}
function removeGlobalAllowedStyleRule(aStyle)
{
  delete gGlobalRuleset.styles[aStyle];
}

function cleanupNode(aNode, aRules, aTextModifiers)
{
  for (var i = 0; i < aNode.childNodes.length; ++i) {
    let node = aNode.childNodes[i];
    if (node instanceof Components.interfaces.nsIDOMHTMLElement) {
      // check if node allowed
      let nodeName = node.localName.toLowerCase();
      if (!(nodeName in aRules.tags)) {
        // this node is not allowed, replace it with its children
        while (node.hasChildNodes())
          aNode.insertBefore(node.removeChild(node.firstChild), node);
        aNode.removeChild(node);
        // We want to process again the node at the index i which is
        // now the first child of the node we removed
        --i;
        continue;
      }

      // we are going to keep this child node, clean up its children
      cleanupNode(node, aRules, aTextModifiers);

      // cleanup attributes
      var attrs = node.attributes;
      let acceptFunction = function(aAttrRules, aAttr) {
        // an attribute is always accepted if its rule is true, or conditionnaly
        // accepted if its rule is a function that evaluates to true
        // if its rule does not exist, it is refused
          let localName = aAttr.localName;
          let rule = localName in aAttrRules && aAttrRules[localName];
          return (rule === true ||
                  (rule instanceof Function && rule(aAttr.value)));
      };
      for (var j = 0; j < attrs.length; ++j) {
        let attr = attrs[j];
        // we check both the list of accepted attributes for all tags
        // and the list of accepted attributes for this specific tag.
        if (!(acceptFunction(aRules.attrs, attr) ||
              (aRules.tags[nodeName] instanceof Object) &&
              acceptFunction(aRules.tags[nodeName], attr))) {
          node.removeAttribute(attr.name);
          --j;
        }
      }

      // cleanup style
      var style = node.style;
      for (var j = 0; j < style.length; ++j) {
        if (!(style[j] in aRules.styles)) {
          style.removeProperty(style[j]);
          --j;
        }
      }
    }
    else {
      // We are on a text node, we need to apply the functions
      // provided in the aTextModifiers array.

      // Each of these function should return the number of nodes added:
      //  * -1 if the current textnode was deleted
      //  * 0 if the node count is unchanged
      //  * positive value if nodes were added.
      //     For instance, adding an <img> tag for a smiley adds 2 nodes:
      //      - the img tag
      //      - the new text node after the img tag.

      // This is the number of nodes we need to process. If new nodes
      // are created, the next text modifier functions have more nodes
      // to process.
      var textNodeCount = 1;
      for each (var modifier in aTextModifiers)
        for (var n = 0; n < textNodeCount; ++n) {
          let textNode = aNode.childNodes[i + n];

          // If we are processing nodes created by one of the previous
          // text modifier function, some of the nodes are likely not
          // text node, skip them.
          if (!(textNode instanceof Components.interfaces.nsIDOMText))
            continue;

          let result = modifier(textNode);
          textNodeCount += result;
          n += result;
        }

      // newly created nodes should not be filtered, be sure we skip them!
      i += textNodeCount - 1;
    }
  }
}

function cleanupImMarkup(aDocument, aText, aRuleset, aTextModifiers)
{
  if (!aDocument)
    throw "providing an HTML document is required";

  if (!gGlobalRuleset)
    initGlobalRuleset();

  var div = aDocument.createElement("div");
  div.innerHTML = aText;
  cleanupNode(div, aRuleset || gGlobalRuleset, aTextModifiers || []);
  return div.innerHTML;
}
