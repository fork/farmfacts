jQuery(function($) {
	var display = $('#display');

	//console.log(Vizard.params);
	//console.log(Vizard.location);

	display.
	bind('onreadystatechange.vizard', function() {
		var V = display.data('vizard');

		if (V.readyState === Vizard.LOADED) {
			// V.source.match(/<!--# include .* -->/);
			// TODO emulate SSI...
		}

		if (V.readyState === Vizard.INTERACTIVE) {
			var timeout;

			var save = $('<a href="">');
			save.text('Save Document');
			var quit = $('<a href="http://github.com/fork/farmfacts">');
			quit.text('Quit Vizard');

			var toolbar = $('#toolbar').
			append(save).
			append(quit);

			toolbar.toolbar([
				function(e) {
					// jQuery.post(this.href, {
					// 	data: V.serialize();
					// });
				},
				function(e) {
					var stay = V.isModified && !confirm('Are you sure?');
					if (stay) { e.preventDefault(); }
				}
			]). // auto-hide
			mouseenter(function() {
				if (timeout) {
					clearTimeout(timeout);
					timeout = undefined;
				}

				toolbar.addClass('active');
			}).
			mouseleave(function() {
				timeout = setTimeout(function() {
					toolbar.removeClass('active');
				}, 500);
			});
		}

		if (V.readyState === Vizard.COMPLETE) {
			V.controls.appendTo('#overlay');
			$('#spinner').hide();
		}
	}).
	vizard(Vizard.location.href, {
		'div:visible': {
			mouseover: function() {
				$(this).css('background-color', 'black');
			},
			mouseout: function() {
				$(this).css('background-color', 'transparent');
			}
		}
	});
});
