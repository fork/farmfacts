(function(jQuery) {
	var $ = jQuery.sub();

	// cache the jqueryfied window object
	var w = jQuery( window );

	// script types that are evaluated
	var typesSCRIPTs = /type=["'](?:text|application)\/(?:x-)?(?:j(?:ava)?|ecma)script["']/g
	  , noSCRIPTs    = 'type="text/noscript+javascript"';

	function Vizard( display, href, handler ) {
		var instance = this;

		instance.handler  = handler;
		instance.document = display.contents().get(0);
		instance.display  = display;
		instance.baseHREF = href;
		instance.href     = href;

		function refit() {
			var height;

			// in IE scrollbars appear when reducing height even when the
			// document itself does not require that much...
			display.attr('style', 'display: block;');
			height = $(instance.document).height();
			height = w.height() > height ? w.height() : height;

			display.css('height', height);
		}
		instance.refit = refit;

		display.data('vizard', instance);
		instance.setState( Vizard.INIT );

		display.one('load', function() {
			instance.doctype     = instance.document.doctype;
			instance.styleSheets = instance.document.styleSheets;

			// reset height of display if window resizes
			w.resize(refit);

			display.show();

			instance.setState( Vizard.INTERACTIVE );

			// wait so browser could've finished rendering...
			setTimeout(function() {
				instance.control(instance.document);
				instance.reset();

				instance.setState( Vizard.COMPLETE );

			}, Vizard.wait);
		});

		jQuery.ajax( href, {
			dataType: 'text',
			success: function(source, status, jqXHR) {
				instance.contentType = jqXHR.getResponseHeader('Content-Type');
				instance.source = source;

				instance.setState( Vizard.LOADED );

				// disable SCRIPTs...
				// This only works for SCRIPT tags with type attribute set!
				instance.source = instance.source.replace(typesSCRIPTs, noSCRIPTs);
				// force assets to be loaded correctly...
				instance.source = instance.insertBASE(instance.source);

				instance.document.open();
				instance.document.write(instance.source);
				instance.document.close();
			}
		});

		instance.setState( Vizard.LOADING );

		return this;

	}
	Vizard.controls    = $();
	Vizard.wait        = 100;

	Vizard.INIT        = 'uninitialized';
	Vizard.LOADING     = 'loading';
	Vizard.LOADED      = 'loaded';
	Vizard.INTERACTIVE = 'interactive';
	Vizard.COMPLETE    = 'complete';

	(function(fn) {
		fn.doctype      = null;
		fn.styleSheets  = null;
		fn.handler      = {};

		fn.withContext  = function( selector ) {
			var jQueryWithContext = $( selector, this.document );
			jQueryWithContext.vizard = this;

			return jQueryWithContext;
		};
		fn.update       = function() {
			var snapshot = this.makeSnapshot()
			  , oldLines = difflib.stringAsLines(this.snapshot)
			  , newLines = difflib.stringAsLines(snapshot)
			  , sm       = new difflib.SequenceMatcher(oldLines, newLines)
			  , opcodes  = sm.get_opcodes();

			// not modified only when we have a single opcode ...
			// ... and this opcode says the old and new snapshot are equal
			var modified = (opcodes.length > 1 || opcodes[0][0] != 'equal');

			if (modified) {
				Vizard.controls.garbageCollect().remove();

				this.isModified = true;
				this.snapshot   = snapshot;

				this.display.trigger('change.vizard');
			}
		};
		fn.makeSnapshot = function() {
			return this.document.documentElement.innerHTML;
		};
		fn.reset        = function() {
			this.snapshot   = this.makeSnapshot();
			this.isModified = false;
		};
		fn.setState     = function( state)  {
			this.readyState = state;
			this.display.trigger('onreadystatechange.vizard');
		};
		fn.control      = function( nodes ) {
			var controlled
			  , hasBehaved, willBehave, behaves
			  , elements = $();

			for (var selector in this.handler) {
				controlled = this.withContext( selector ).filter(function() {
					var select = false, element = this;

					jQuery.each(nodes, function() {
						var container = $(this);

						select = container.is(element);
						select || ( select = container.has(element).length > 0 );

						return !select;
					});

					return select;
				});

				hasBehaved = controlled.data('behaviours');
				willBehave = this.handler[selector];
				behaves    = $.extend( {}, hasBehaved, willBehave );
				controlled.data('behaviours', behaves);

				elements = elements.add(controlled);
			}

			elements.control();
			w.resize();
		};
		fn.serialize    = function() {
			var data    = ''
			  , baseTag = $('base[href="' + this.href + '"]', this.document);

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
		fn.insertBASE   = function(html) {
			// FIXME only ' />' if XHTML
			var broken  = html.split('</title>', 2)
			  , tagBASE = '<base href="' + this.href + '" />';

			broken[1] = tagBASE + broken[1];

			return broken.join('</title>');
		};
	})(Vizard.prototype);

	// Tools
	jQuery.entitle = function(title, ownerDocument) {
		ownerDocument = ownerDocument || document;
		ownerDocument.title = title;
		jQuery('title', ownerDocument).html(title);
	};

	(function(fn) {
		fn.overlay = function() {
			var element = this
			  , d       = $(document);

			$(window)
			.resize(function() {
				element.height(d.height());
				element.width(d.width());
			})
			.resize();

			return this;
		};
		fn.vizard = function(href, handler) {
			var instance = this.data('vizard');

			if (instance) {
				if (arguments.length > 0) {
					var funcName = arguments[0]
					  , funcArgs = Array.prototype['slice'].call(arguments, 1);

					return instance[funcName].apply(instance, funcArgs);
				}

				return instance;
			}
			instance = new Vizard(this, href, handler);

			return this;
		};
	})(jQuery.fn);
	(function(fn) {
		fn.sort = function() {
			var arrayLike = Array.prototype.sort.apply( this, arguments )
			  , array     = jQuery.makeArray( array );

			return this.pushStack( array );
		};
		fn.sortBySize = function() {
			this.sort(function(a, b) {
				var aa = $(a), bb = $(b);

				return $(b).width() * $(b).height()
				     - $(a).width() * $(a).height();
			});

			return this;
		};
		fn.control = function() {
			var controls = Vizard.controls;

			this.each(function() {
				var control    = $('<A>')
				  , element    = $(this)
				  , behaviours = element.data('behaviours');

				control.data('target', this);
				element.data('controller', control);

				w.resize(function refit() {
					var position = element.offset()
					  , width    = element.outerWidth()
					  , height   = element.outerHeight();

					control.css(position).height(height).width(width);
				});

				for (var behaviour in behaviours) {
					var args = behaviours[behaviour];

					if (behaviour !== 'title') {
						control.bind(behaviour, args);
					} else {
						control.attr('title', args);
					}
				}

				controls = controls.add(control);
			});
			Vizard.controls = controls;

			return this;
		};
		fn.ancestors = function() {
			var ancestors = $()
			  , control   = this;

			control.each(function() {
				var target = $(this).data('target');

				$(target).parents().each(function() {
					var control = $(this).data('controller');
					if (control) { ancestors = ancestors.add(control); }
				});
			});

			return ancestors;
		};
		fn.descendants = function() {
			var descendants = $()
			  , control     = this;

			this.vizard.controls.each(function() {
				var contained = this.data('target');

				control.each(function() {
					var container = this.data('target')
					  , contains  = $.contains(container, contained);

					if (contains) { descendants = descendants.add(this); }

					return !contains;
				});
			});

			return descendants;
		};
		fn.garbageCollect = function() {
			var garbage = $();

			this.each(function() {
				var trash = $(this).data('target') === null;
				if (trash) { garbage = garbage.add(this); }
			});

			return garbage;
		};
	})($.fn);

	this.Vizard = Vizard;

})(jQuery);
