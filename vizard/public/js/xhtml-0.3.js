// XHTML library
// Adds functions innerXHTML(el) and outerXHTML(el),
// and, where supported (Firefox, Safari), adds
// .innerXHTML() and .outerXHTML() to element prototypes
//
// Version: 0.3
//
// Author: Jon Davis <jon@jondavis.net>
// Please contact the author for feedback.
//
// This script is licensed. To view the license and for
// more information, visit:
// http://codeplex.com/xhtmljs/license

if (!window.xhtmljs) {
	window.xhtmljs = {

		innerXHTML: function (el, strict) {
			if (!el) return "";
			var e;
			var ret = '';
			for (e=0; e<el.childNodes.length; e++) {
				var childNode = el.childNodes.item(e);
				ret += window.xhtmljs.outerXHTML(childNode, strict);
				if (xhtmlFormatting == "formatted" &&
				!childNode.tagName &&
				e < el.childNodes.length - 1 &&
				el.childNodes[e+1].tagName &&
				window.xhtmljs.tagIsLineBreaking(el.childNodes[e+1].tagName)) {
					ret += "\n";
				}
			}
			return ret.replace(/\s*\n\s*\n/g, '\n');
		},

		outerXHTML: function (el, strict, tab) {
			var tagName = el.tagName;
			var attributes = el.attributes;
			var childNodes = el.childNodes;
			var supportsInlineTerminator = false;

			if (tagName) {
				// taken from http://www.w3schools.com/tags/default.asp
				switch(tagName.toLowerCase()) {
					case "area":
					case "base":
					case "basefont":
					case "br":
					case "col":
					case "frame":
					case "hr":
					case "img":
					case "input":
					case "link":
					case "meta":
					case "param":
					supportsInlineTerminator = true;
					break;
					default:
					supportsInlineTerminator = false;
					break;
				}
			}

			var ret = "";
			var t;
			if (!tab) tab = 0;
			for (t=0; t<tab; t++) {
				ret += "\t";
			}
			ret += "<";
			if (tagName) {
				if (!strict || window.xhtmljs.tagInXhtml(tagName.toLowerCase())) {
					var i;
					ret += tagName.toLowerCase();
					//debugger;
					if (attributes) {
						var styleTagUsed = false;
						for (i = 0; i < attributes.length; i++) {
							var attribName = attributes.item(i).nodeName;
							var attribValue = attributes.item(i).value;
							if (attribName == "href") {
								//debugger;
							}
							if (attribValue != null && attribValue != "null" && attribValue.trim() != "" && attribValue != "inherit" && (!strict || window.xhtmljs.attribInXhtml(tagName.toLowerCase(), attribName.toLowerCase(), attribValue))) {
								if (attribName.toLowerCase() == "style") {
									styleTagUsed = true;
								}
								ret += " " + attribName.toLowerCase() +
								"=\"" +
								window.xhtmljs.xmlEncode(attribValue) +
								"\"";
							}
						}
						if (!styleTagUsed && (!strict || window.xhtmljs.attribInXhtml(tagName.toLowerCase(), "style")) && el.style.cssText) {
							var styleText = el.style.cssText;
							var altStyleText = "";
							var styleElements = styleText.split(/\;/);
							for (s = 0; s < styleElements.length; s++) {
								var styleElement = styleElements[s].split(/:/);
								if (styleElement.length == 2) {
									altStyleText += styleElement[0].toLowerCase() +
									":" +
									styleElement[1] +
									";";
								}
							}
							ret += " style=\"" + altStyleText + "\"";
						}
					}
				}
				if (childNodes && childNodes.length > 0) {
					ret += ">";
					ret = ret.replace(/<>/, '').replace(/< \/>/, '');
					var childTags = false;
					var prevWasTag = false;
					for (i=0; i<childNodes.length; i++) {
						var tabv = tab+1;
						var cv = "";
						if (!childNodes.item(i).tagName) {
							tabv = null;
						} else {
							if (xhtmlFormatting == "formatted" && childNodes.item(i).childNodes && childNodes.item(i).childNodes.length > 0) {
								cv = "\n";
								childTags = true;
							} else {
								tabv = null;
							}
						}
						cv += window.xhtmljs.outerXHTML(childNodes.item(i), strict, tabv);
						if (xhtmlFormatting == "formatted" &&
						cv.substr(0, 1) == "<" && prevWasTag) {
							ret += "\n";
						}
						ret += cv;
						if (xhtmlFormatting == "formatted" && (childNodes.item(i).tagName != undefined && childNodes.item(i).tagName.toString() != "") && window.xhtmljs.tagIsLineBreaking(childNodes.item(i).tagName)) {
							ret += "\n";
							for (t=0; t<tab; t++) {
								ret += "\t";
							}
						}
						prevWasTag = (childNodes.item(i).tagName != undefined);
					}
					if (xhtmlFormatting == "formatted" && childTags) {
						ret += "\n";
						for (i=0; i<tab;i++) {
							ret += "\t";
						}
					}
					// don't put end tag if there was no start tag!
					if (!strict || window.xhtmljs.tagInXhtml(tagName.toLowerCase())) {
						ret += "</" + tagName.toLowerCase() + ">";
					}
				} else {
					if (supportsInlineTerminator) {
						ret += " />";
					} else {
						ret += ">";
						if (xhtmlFormatting == "formatted") {
							ret += "\n";
							for (i=0; i<tab;i++) {
								ret += "\t";
							}
						}
						ret += "</" + tagName.toLowerCase() + ">";
					}
				}
				if (xhtmlFormatting == "formatted" && tagName && tagName.toLowerCase() != "br" && window.xhtmljs.tagIsLineBreaking(tagName)) {
					ret += "\n";
					for (i=0; i<tab;i++) {
						ret += "\t";
					}
				}
				ret = ret.replace(/<>/, '').replace(/< \/>/, '');
				return ret.replace(/\s*\n(\t*)\s*\n/g, '\n$1');
			} else {
				// text
				if (el.nodeValue) {
					if (el.nodeType && el.nodeType == 8) {
						//return "<!--" + el.nodeValue.trim() + "-->";
						return "<!--" + el.nodeValue + "-->";
					} else {
						//return el.nodeValue.trim()
						return el.nodeValue
						.replace(/&/g, '&amp;')
						.replace(/</g, '&lt;')
						.replace(/>/g, '&gt;');
					}
				} else {
					//debugger;
					if (el.toString().indexOf("[object") != 0) {
						return el.toString().trim()
						.replace(/&/g, '&amp;')
						.replace(/</g, '&lt;')
						.replace(/>/g, '&gt;');
					} else {
						return "";
					}
				}
			}
		},

		xmlAttributeEncode: function (str) { // todo
			return xmlEncode(str);
		},

		xmlEncode: function (str) { // todo
			return str.replace(/&/g, "&amp;").replace(/\"/g, "&quot;");
		},

		tagIsLineBreaking: function (tagName) {
			if (!tagName) return false;
			switch (tagName.toLowerCase()) {
				case "h1":
				case "h2":
				case "h3":
				case "h4":
				case "h5":
				case "h6":
				case "br":
				case "p":
				case "div":
				case "table":
				case "blockquote":
				case "ul":
				case "ol":
				return true;
				default:
				return false;
			}
		},

		tagInXhtml: function (tag) {
			switch(tag) {
				case "DOCTYPE":
				case "doctype": // DOCTYPE
				case "html":
				case "head":
				case "base":
				case "meta":
				case "title":
				case "script":
				case "style":
				case "link":
				case "body":

				case "iframe":
				case "frameset":
				case "frame":
				case "a":
				case "abbr":
				case "acronym":
				case "area":
				case "b":
				case "bdo":
				case "big":
				case "blockquote":
				case "br":
				case "button":
				case "caption":
				/*
				case "center":
				*/
				case "cite":
				case "code":
				case "col":
				case "colgroup":
				case "dd":
				case "del":
				case "dfn":
				case "div":
				case "dl":
				case "dt":
				case "em":
				case "fieldset":
				/*
				case "font":
				*/
				case "form":
				case "h1":
				case "h2":
				case "h3":
				case "h4":
				case "h5":
				case "h6":
				case "hr":
				case "i":
				case "img":
				case "input":
				case "ins":
				case "kbd":
				case "label":
				case "legend":
				case "li":
				case "map":
				case "noscript":
				case "object":
				case "option":
				case "optgroup":
				case "ol":
				case "p":
				case "param":
				case "pre":
				case "q":
				case "samp":
				case "select":
				case "span":
				case "small":
				case "strong":
				case "sub":
				case "sup":
				case "table":
				case "tbody":
				case "td":
				case "textarea":
				case "tfoot":
				case "th":
				case "thead":
				case "tr":
				case "tt":
				case "u":
				case "ul":
				case "var":
				return true;
				default:
				return false;
			}
		},

		attribInXhtml: function (tag, attrib, value) {
			switch (attrib) {

				// core attributes
				case "id":
				case "class":
				case "style":
				case "title":
				return window.xhtmljs.tagInXhtml(tag);

				// event attributes
				case "onclick":
				case "ondblclick":
				case "onmousedown":
				case "onmouseup":
				case "onmouseover":
				case "onmousemove":
				case "onmouseout":
				case "onkeydown":
				case "onkeypress":
				case "onkeyup":
				return window.xhtmljs.tagInXhtml(tag);

				// language attributes
				case "lang":
				return window.xhtmljs.tagInXhtml(tag);
				case "dir":
				switch (value) {
					case "ltr":
					case "rtl":
					return window.xhtmljs.tagInXhtml(tag);
					default:
					return false;
				}
				break;

				// keyboard attributes
				case "accesskey":
				case "tabindex":
				if (value == "0") return false;
				switch (tag) {
					case "br":
					return false;
					default:
					return window.xhtmljs.tagInXhtml(tag);
				}
			}
			switch(tag) {
				case "abbr":
				case "acronym":
				case "address":
				case "b":
				case "big":
				case "body":
				case "br":
				case "cite":
				case "code":
				case "dd":
				case "dfn":
				case "div":
				case "dl":
				case "DOCTYPE":
				case "doctype":
				case "dt":
				case "em":
				case "fieldset":
				case "h1":
				case "h2":
				case "h3":
				case "h4":
				case "h5":
				case "h6":
				case "i":
				case "kbd":
				case "li":
				case "noscript":
				case "ol":
				case "p":
				case "pre":
				case "samp":
				case "small":
				case "span":
				case "strong":
				case "sub":
				case "sup":
				case "title":
				case "tt":
				case "u":
				case "ul":
				case "var":
				return false;

				case "a":
				switch (attrib) {
					case "accesskey":
					case "charset":
					case "coords":
					case "href":
					case "hreflang":
					case "name":
					case "rel":
					case "rev":
					case "shape":
					case "tabindex":
					case "target":
					case "type":
					return true;
					default:
					return false;
				}
				case "area":
				switch (attrib) {
					case "shape":
					switch (value) {
						case "rect":
						case "circle":
						case "poly":
						case "default":
						return true;
						default:
						return false;
					}
					case "alt":
					case "coords":
					case "href":
					case "nohref":
					case "target":
					case "accesskey":
					case "tabindex":
					return true;
					default:
					return false;
				}
				case "base":
				switch (attrib) {
					case "href":
					return true;
					default:
					return false;
				}
				case "bdo":
				switch (attrib) {
					case "dir":
					switch (value) {
						case "href":
						return true;
						default:
						return false;
					}
					case "xml:lang":
					case "lang":
					return true;
					default:
					return false;
				}
				case "blockquote":
				switch (attrib) {
					case "cite":
					return true;
					default:
					return false;
				}
				case "button":
				switch (attrib) {
					case "disabled":
					return value == "disabled";
					case "type":
					switch (value) {
						case "button":
						case "submit":
						case "reset":
						return true;
						default:
						return false;
					}
					case "accesskey":
					case "tabindex":
					case "name":
					case "value":
					return true;
					default:
					return false;
				}
				case "col":
				case "colgroup":
				switch (attrib) {
					case "align":
					switch (value) {
						case "left":
						case "center":
						case "right":
						case "justify":
						case "char":
						return true;
						default:
						return false;
					}
					case "valign":
					switch (value) {
						case "top":
						case "middle":
						case "bottom":
						case "baseline":
						return true;
						default:
						return false;
					}
					case "char":
					case "charoff":
					case "span":
					case "width":
					return true;
					default:
					return false;
				}
				case "del":
				switch (attrib) {
					case "cite":
					case "datetime":
					return true;
					default:
					return false;
				}
				/*
				case "font":
				switch (attrib) {
				case "color":
				case "face":
				case "size":
				return true;
				default:
				return false;
				}
				*/
				case "form":
				switch (attrib) {
					case "method":
					switch (value) {
						case "get":
						case "post":
						return true;
						default:
						return false;
					}
					case "action":
					case "enctype":
					case "accept":
					case "accept-charset":
					return true;
					default:
					return false;
				}
				case "head":
				switch (attrib) {
					case "profile":
					case "dir":
					case "xml:lang":
					case "lang":
					return true;
					default:
					return false;
				}
				case "html":
				switch (attrib) {
					case "dir":
					case "xml:lang":
					case "lang":
					return true;
					default:
					return false;
				}
				case "hr":
				/*
				switch (attrib) {
				case "align":
				case "noshade":
				case "size":
				case "width":
				return true;
				default:
				*/
				return false;
				/*
				}
				*/
				case "iframe": // todo: remove xhtml-deprecated items
				switch (attrib) {
					case "align":
					case "frameborder":
					case "height":
					case "width":
					case "marginheight":
					case "marginwidth":
					case "name":
					case "scrolling":
					case "src":
					return true;
					default:
					return false;
				}
				case "img":
				switch (attrib) {
					case "alt":
					case "height":
					case "width":
					case "longdesc":
					case "src":
					/*
					case "border":
					case "hspace":
					case "ismap":
					case "align":
					case "usemap":
					case "vspace":
					*/
					return true;
					default:
					return false;
				}
				case "input":
				switch (attrib) {
					case "type":
					switch (value) {
						case "text":
						case "password":
						case "checkbox":
						case "radio":
						case "submit":
						case "reset":
						case "hidden":
						case "image":
						case "file":
						case "button":
						return true;
						default:
						return false;
					}
					case "checked":
					return value == "checked";
					case "disabled":
					return value == "disabled";
					case "readonly":
					return value == "readonly";
					case "name":
					case "value":
					case "maxlength":
					case "src":
					case "alt":
					case "accept":
					case "accesskey":
					case "tabindex":
					return true;
					default:
					return false;
				}
				case "ins":
				switch (attrib) {
					case "cite":
					case "datetime":
					return true;
					default:
					return false;
				}
				case "label":
				switch (attrib) {
					case "for":
					case "accesskey":
					return true;
					default:
					return false;
				}
				case "legend":
				switch (attrib) {
					case "accesskey":
					return true;
					default:
					return false;
				}
				case "link":
				switch (attrib) {
					case "media":
					switch (value) {
						case "screen":
						case "print":
						case "projection":
						case "braille":
						case "speech":
						case "all":
						return true;
						default:
						return false;
					}
					case "href":
					case "charset":
					case "hreflang":
					case "type":
					case "rel":
					case "rev":
					return true;
					default:
					return false;
				}
				case "map":
				/*
				switch (attrib) {
				case "name":
				return true;
				default:
				*/
				return false;
				/*
				}
				*/
				case "meta":
				switch (attrib) {
					case "content":
					case "name":
					case "http-equiv":
					case "scheme":
					return true;
					default:
					return false;
				}
				/*
				case "ol":
				switch (attrib) {
				case "compact":
				case "start":
				case "type":
				return true;
				default:
				return false;
				}
				*/
				case "optgroup":
				switch (attrib) {
					case "disabled":
					return value == "disabled";
					case "label":
					return true;
					default:
					return false;
				}
				case "option":
				switch (attrib) {
					case "selected":
					return value == "selected";
					case "value":
					return true;
					default:
					return false;
				}
				/*
				case "p":
				switch (attrib) {
				case "align":
				return true;
				default:
				return false;
				}
				*/
				case "param":
				switch (attrib) {
					case "name":
					case "value":
					case "type":
					case "valuetype":
					return true;
					default:
					return false;
				}
				/*
				case "pre":
				switch (attrib) {
				case "width":
				return true;
				default:
				return false;
				}
				*/
				case "q":
				switch (attrib) {
					case "cite":
					return true;
					default:
					return false;
				}
				case "script":
				switch (attrib) {
					case "type":
					case "src":
					case "charset":
					case "defer":
					return true;
					default:
					return false;
				}
				case "select":
				switch (attrib) {
					case "multiple":
					return value == "multiple";
					case "disabled":
					return value == "disabled";
					case "name":
					case "size":
					case "tabindex":
					return true;
					default:
					return false;
				}
				case "style":
				switch (attrib) {
					case "type":
					case "media":
					case "title":
					case "dir":
					case "xml:lang":
					case "lang":
					return true;
					default:
					return false;
				}
				case "table":
				switch (attrib) {
					/*
					case "align":
					case "bgcolor":
					*/
					case "border":
					case "cellpadding":
					case "cellspacing":
					case "frame":
					case "rules":
					case "width":
					case "summary":
					return true;
					default:
					return false;
				}
				case "thead":
				case "tbody":
				case "tfoot":
				case "tr":
				switch (attrib) {
					case "align":
					switch (value) {
						case "left":
						case "center":
						case "right":
						case "justify":
						case "char":
						return true;
						default:
						return false;
					}
					case "valign":
					switch (value) {
						case "top":
						case "middle":
						case "bottom":
						case "baseline":
						return true;
						default:
						return false;
					}
					case "char":
					case "charoff":
					return true;
					default:
					return false;
				}
				case "td":
				case "th":
				switch (attrib) {
					case "align":
					switch (value) {
						case "left":
						case "center":
						case "right":
						case "justify":
						case "char":
						return true;
						default:
						return false;
					}
					case "valign":
					switch (value) {
						case "top":
						case "middle":
						case "bottom":
						case "baseline":
						return true;
						default:
						return false;
					}
					case "abbr":
					case "axis":
					case "char":
					case "charoff":
					case "colspan":
					case "headers":
					case "rowspan":
					case "scope":
					/*
					case "nowrap":
					case "width":
					case "height":
					case "bgcolor":
					*/
					return true;
					default:
					return false;
				}
				case "textarea":
				switch (attrib) {
					case "disabled":
					return value == "disabled";
					case "readonly":
					return value == "readonly";
					case "rows":
					case "cols":
					case "name":
					case "accesskey":
					case "tabindex":
					return true;
					default:
					return false;
				}
				/*
				case "ul":
				switch (attrib) {
				case "compact":
				case "type":
				return true;
				default:
				return false;
				}
				*/
				default:
				return false;
			}
		}
	};
}

if (!window.xhtmlFormatting) {
	window.xhtmlFormatting = "formatted";
}

if (String.prototype && !String.prototype.trim) {
	String.prototype.trim = function() {
		return this.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
	};
}

if (!window.outerXHTML) {
	window.outerXHTML = window.xhtmljs.outerXHTML;
}

if (!window.innerXHTML) {
	window.innerXHTML = window.xhtmljs.innerXHTML;
}

// =======================================================================

// add to HTMLElement prototype (not supported in IE)
if (!document.all && HTMLElement && HTMLElement.prototype) {
	HTMLElement.prototype.innerXHTML = function() {
		return window.xhtmljs.innerXHTML(this, true);
	};
	HTMLElement.prototype.outerXHTML = function() {
		return window.xhtmljs.outerXHTML(this, true);
	};
}

// add to jQuery prototype
if (window.jQuery) {
	window.jQuery.fn.xhtml = function(newXhtml) {
		if (newXhtml) {
			return this.html(newXhtml);
		} else {
			var i;
			var ret = '';
			for (i=0; i<this.length; i++) {
				if (i>0) i += "\n";
				ret += window.xhtmljs.innerXHTML(this[i], false);
			}
			return ret;
		}
	};
}
