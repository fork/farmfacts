jQuery(function($) {
	var display = $('#display');

	//console.log(Vizard.params);
	//console.log(Vizard.location);

	display.
	bind('onreadystatechange.vizard', function() {
		var V = display.data('vizard');

		if (V.readyState === Vizard.LOADED) {
			var includes = V.source.match(/<!-- ?# ?include .*-->/g);
			var host = Vizard.location.protocol + '//' + Vizard.location.host;

			$.each(includes, function() {
				var inc = this;
				var incUrl = inc.match(/="(.*)"/)[1], url;

				if (incUrl.substr(0, 1) == '/') {
					url = host + incUrl;
				} else {
					url = Vizard.location.href.replace(/[^\/]*$/, incUrl);
				}

				jQuery.ajax(url, {
					async: false,
					dataType: 'text',
					success: function(data) {
						var html = data + '<!-- end-of src="' + incUrl + '"-->';
						V.source = V.source.replace(inc, inc + html);
					}
				});
			});
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
					e.preventDefault();

					jQuery.ajax(this.href, {
						contentType: 'text/html;charset=utf-8',
						type: 'PUT',
						data: V.saveIncludes(V.serialize()),
						processData: false,
						dataType: 'text',
						success: function() {
							alert('Saved!');
						}
					});
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
