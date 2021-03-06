(function(jQuery) {
	$.entitle = function(title, ownerDocument) {
		if (typeof(ownerDocument) == 'undefined') ownerDocument = document;
		ownerDocument.title = title;
		$('title', ownerDocument).html(title);
	};

	// script types that are evaluated
	var typesSCRIPTs = /type=["'](?:text|application)\/(?:x-)?(?:j(?:ava)?|ecma)script["']/g;
	var noSCRIPTs    = 'type="text/noscript+javascript"';

	var win = jQuery(window);

	function Vizard(display, href, handler) {
		var vizard = this;

		vizard.document = display.contents().get(0);
		vizard.display  = display.data('vizard', vizard);
		vizard.baseHREF    = href;

		var $ = Vizard.$.sub();
		$.fn.init = function(selector, context) {
			var instance;

			instance = Vizard.$.fn.init(selector, context || vizard.document);
			instance.vizard = vizard;

			return instance;
		};
		vizard.setState(Vizard.INIT);

		function refit() {
			var height;

			// in IE scrollbars appear when reducing height even when the
			// document itself does not require that much...
			display.attr('style', 'display: block;');
			height = $(vizard.document).height();
			height = win.height() > height ? win.height() : height;

			display.css('height', height);
		}
		vizard.refit = refit;

		display.one('load', function() {
			// TODO add STYLE to set overflow: hidden
			// ...

			vizard.doctype = vizard.document.doctype;
			vizard.styleSheets = vizard.document.styleSheets;

			// reset height of display if window resizes
			win.resize(refit);

			display.show();
			vizard.setState(Vizard.INTERACTIVE);

			// wait until browser finished rendering
			setTimeout(function() {
				var controlable;
				var controlables = $();

				var selectors = [];

				for (var selector in handler) {
					selectors.push(selector);

					controlable = $(selector);
					controlable.data('behaviours', $.extend(
						{},
						controlable.data('behaviours'),
						handler[selector]
					));

					controlables = controlables.add(controlable);
				}

				controlables.control(handler);
				win.resize();

				vizard.reset();
				vizard.setState(Vizard.COMPLETE);
			}, Vizard.Wait);
		});

		jQuery.ajax(href, {
			dataType: 'text',
			success: function(source, status, jqXHR) {
				vizard.source = source;
				vizard.setState(Vizard.LOADED);
				// This only works for SCRIPT tags with type attribute set:
				// disable SCRIPTs...
				vizard.source = vizard.source.replace(typesSCRIPTs, noSCRIPTs);
				vizard.source = vizard.insertBASE(vizard.source);

				vizard.contentType = jqXHR.getResponseHeader('Content-Type');

				vizard.document.open();
				vizard.document.write(vizard.source);
				vizard.document.close();
			}
		});
		vizard.setState(Vizard.LOADING);

		return this;
	}
	Vizard.INIT        = 'uninitialized';
	Vizard.LOADING     = 'loading';
	Vizard.LOADED      = 'loaded';
	Vizard.INTERACTIVE = 'interactive';
	Vizard.COMPLETE    = 'complete';
	Vizard.Wait        = 100;

	(function(fn) {
		fn.doctype     = null;
		fn.styleSheets = null;
		fn.controls    = null;

		fn.serialize = function() {
			var data = '', baseTag;
			baseTag = $('base[href="' + this.baseHREF + '"]', this.document);

			if (this.doctype) {
				data += '<!DOCTYPE ' + this.doctype.name +
				         ' PUBLIC "' + this.doctype.publicId + '" ' +
				                 '"' + this.doctype.systemId + '">\n';
			}

			baseTag.remove();
			data += $(this.document).xhtml(); // FIXME only if XHTML
			$('head', this.document).append(baseTag);
			data = data.split(noSCRIPTs).join("type='text/javascript'");

			return data;
		};

		fn.insertBASE = function(html) {
			// FIXME only  /> if XHTML
			var broken = html.split('</title>', 2),
			    tagBASE = '<base href="' + this.baseHREF + '" />';

			broken[1] = tagBASE + broken[1];
			return broken.join('</title>');
		};

		fn.makeSnapshot = function() {
			return this.document.documentElement.innerHTML;
		};

		fn.reset = function() {
			this.snapshot   = this.makeSnapshot();
			this.isModified = false;
		};
		fn.update = function() {
			var snapshot = this.makeSnapshot(),
			    oldLines = difflib.stringAsLines(this.snapshot),
			    newLines = difflib.stringAsLines(snapshot),
			    sm       = new difflib.SequenceMatcher(oldLines, newLines),
			    opcodes  = sm.get_opcodes();

			// not modified only when we have a single opcode ...
			// ... and this opcode says the old and new snapshot are equal
			var modified = (opcodes.length > 1 || opcodes[0][0] != 'equal');

			if (modified) {
				this.controls.garbageCollect().remove();

				this.isModified = true;
				this.snapshot   = snapshot;

				this.display.trigger('change.vizard');
			}
		};

		fn.setState = function(state) {
			this.readyState = state;
			this.display.trigger('onreadystatechange.vizard');
		};
	})(Vizard.prototype);

	Vizard.$ = jQuery.sub();
	Vizard.$.fn.control = function(handler) {
		var $ = this.constructor;
		var controls = $();

		this.each(function() {
			var controller = Vizard.$('<A>').data('target', this),
			    $$         = $(this).data('controller', controller),
			    behaviours = $$.data('behaviours');

			win.resize(function refit() {
				var position = $$.offset(),
				    width    = $$.outerWidth(),
				    height   = $$.outerHeight();

				controller.css(position).height(height).width(width);
			});

			for (var behaviour in behaviours) {
				var args = behaviours[behaviour];
				controller[behaviour](args);
			}

			controls = controls.add(controller);
		});

		this.vizard.controls = controls;

		return this;
	};
	Vizard.$.fn.ancestors = function() {
		var $ = this.constructor;
		var ancestors = $(), $$ = this;

		this.each(function() {
			var target = $(this).data('target');

			$(target).parents().each(function() {
				var controller = $(this).data('controller');
				if (controller) { ancestors = ancestors.add(controller); }
			});
		});

		return ancestors;
	};
	Vizard.$.fn.descendants = function() {
		var $ = this.constructor;
		var descendants = $(), $$ = this;

		this.vizard.controls.each(function() {
			var element = this.data('target');

			$$.each(function() {
				isDescendant = jQuery.contains(this.data('target'), element);
				if (isDescendant) { descendants = descendants.add(this); }

				return !isDescendant;
			});
		});

		return descendants;
	};
	Vizard.$.fn.garbageCollect = function() {
		var $ = this.constructor;
		var garbage = $();
		this.each(function() {
			var isGarbage = $(this).data('target').parentNode === null;
			if (isGarbage) { garbage = garbage.add(this); }
		});
		return garbage;
	};

	jQuery.fn.vizard = function(href, handler) {
		var vizard = this.data('vizard');
		if (vizard) { return vizard; }

		return this.each(function() {
			var $$ = jQuery(this);
			new Vizard($$, href, handler);
		});
	};

	this.Vizard = Vizard;

})(jQuery);
