jQuery(function($) {
	var win = $(window), doc = $(document), forceChange = true;

	var OPTION = $('<option>');
	function Option(text, value, selected) {
		var option = OPTION.clone();
		option.context = document;
		option.text(text).attr('value', value || text);
		if (selected) { option.attr('selected', 'selected'); }
		return option;
	}
	var OPTGROUP = $('<optgroup>');
	function OptGroup(label) {
		var optGroup = OPTGROUP.clone();
		optGroup.context = document;
		optGroup.attr('label', label);
		return optGroup;
	}
	var COLUMN = $('<td>');
	function Column(html, type) {
		return COLUMN.clone().html(html).addClass(type);
	}
	var ROW = $('<tr>');
	function Row(type) {
		return ROW.clone().addClass(type);
	}

	function optionsForBreadcrumb(resource) {
		var resources = [resource].concat(resource.ancestors());
		return $.map(resources, function(r) {
			return Option(r.basename, r.href);
		});
	}
	var bytesizeFormatter = utils.Formatter.SI('B');
	function timeFormatter(date) {
		return utils.relativeTime.call(date, 100);
	}
	function rowsForListing(resources) {
		var rows = [];

		$.each(resources, function() {
			var abbr = this.basename;
			if (abbr.length > 60) {
				var lastDot = abbr.lastIndexOf('.');
				abbr = abbr.slice(0, 60) + ' ... ' + abbr.slice(lastDot);
			}
			var anchor = $('<A>').text(abbr).
			             attr({href: this.href, title: this.basename});
			var types  = this.contentType.
			             replace(/\./g, '-'). // replace non-selectable
			             replace(/\+/, '/').  // allow application/recipe+xml
			             split('/').join(' ');

			var row    = Row(types).append(
				Column(anchor, 'name'),
				Column(timeFormatter(this.lastModified), 'mtime'),
				Column(bytesizeFormatter(this.contentLength), 'size'),
				Column(this.contentType.split('/')[0], 'type')
			);
			if (this.basename.slice(0, 1) == '.') row.addClass('dotfile');

			rows.push(row);
		});

		return rows;
	}
	function optionsForTypeSelect(resources) {
		var types = {}, groups = [], optGroups = [];

		// make them unique
		$.each(resources, function() {
			var props = this.contentType.replace(/\+/, '/').split('/');
			var group = props[0];
			var both  = props.join(' ');
			if (!types.hasOwnProperty(group)) {
				groups.push(group);
				types[group] = [ props[1] ];
			}
			if (types[group].indexOf(props[1]) < 0) {
				types[group].push(props[1]);
			}
		});

		groups.sort();
		var group = groups.shift();

		// render list items
		while (typeof group === 'string') {
			var optGroup = OptGroup(group).clone();
			types[group].sort();
			var type = types[group].shift();
			while (typeof type === 'string') {
				optGroup.append(Option(type, type.replace(/\./g, '-'), true));
				type = types[group].shift();
			}
			optGroups.push(optGroup);
			group = groups.shift();
		}

		return optGroups;
	}

	function refresh(root, resources) {
		var select, tbody;

		select = this.find('.type-select select').empty();
		$.each(optionsForTypeSelect(resources), function() {
			select.append(this);
		});
		select.change();

		breadcrumb = this.find('.location select').empty();
		$.each(optionsForBreadcrumb(root), function() {
			breadcrumb.append(this);
		});
	}

	$('.location select').change(function() {
		$(this).parents('.column').click();
		var url = $(this).val();
		$.bbq.pushState({ url: url });
	});

	var columns = $('.column').
	each(function() {
		var sorter    = utils.Sorter('basename');
		var resources = [];
		var root;

		var column = $(this).
		bind('redraw', function() {
			tbody = column.find('tbody').empty();
			$.each(rowsForListing(resources), function() {
				tbody.append(this);
			});
		}).
		bind('sort', function() {
			resources.sort(sorter);
			column.trigger('redraw');
		}).
		bind('expire', function(e) {
			root      = column.data('root');
			resources = root.getChildren();

			column.data('resources', resources);
			column.data('href', root.href);
			column.data('root', root);
			column.trigger('sort');

			refresh.call(column, root, resources);
		}).
		bind('focus', function(e) {
			var focused = column.is('.focus');
			if (!focused) {
				columns.removeClass('focus');
				column.addClass('focus');
				if (root) { $.bbq.pushState({ url: root.href }); }
			}
		}).
		click(function() {
			column.trigger('focus');
		});

		// TODO make fuzzy a jquery method
		utils.fuzzy(column.find('.type-select .pattern'), {
			filter: '#' + column.attr('id') + ' tbody tr td.name',
			hit: function(td) { td.parentNode.style.display = 'table-row'; },
			miss: function(td) { td.parentNode.style.display = 'none'; }
			// TODO set Filter label to Some Files...
		});

		var anchors = column.find('th a');
		column.find('th').
		click(function(e) {
			var anchor = (e.target.tagName === 'a') ?
			            $(e.target) : $('a', this);
			var property = anchor.attr('href').slice(1);

			if (sorter.property == property) {
				sorter.reverse();
			} else {
				sorter.ascending();
				sorter.property = property;
				anchor.addClass('descending');
			}
			anchor.toggleClass('ascending descending');
			anchors.not(anchor).removeClass('ascending descending');

			column.trigger('sort');
			e.preventDefault();
		}).
		mousedown(function(e) { e.preventDefault(); });

		var tbody = column.find('tbody').
		click(function(e) {
			e.preventDefault();

			var rows     = tbody.children();
			var row      = rows.has(e.target);
			var index    = rows.index(row);
			var selected = row.hasClass('selected');

			if (e.metaKey) {
				row.toggleClass('selected');
			} else {
				if (e.shiftKey) {
					var prev      = row.prevAll('.selected:first');
					var next      = row.nextAll('.selected:first');
					var nextDistance;
					var prevDistance;
					var $$;

					if (prev.length === 0 && next.length === 0) {
						if (index > rows.length / 2) {
							$$ = row.nextAll();
						} else {
							$$ = row.prevAll();
						}
					} else if (prev.length === 0) {
						nextDistance = rows.index(next) - index;
						$$ = next.prevAll(':lt(' + nextDistance + ')');
					} else if (next.length === 0) {
						prevDistance = index - rows.index(prev);
						$$ = prev.nextAll(':lt(' + prevDistance + ')');
					} else {
						nextDistance = rows.index(next) - index;
						prevDistance = index - rows.index(prev);

						if (nextDistance > prevDistance) {
							$$ = prev.nextAll(':lt(' + prevDistance + ')');
						} else {
							$$ = next.prevAll(':lt(' + nextDistance + ')');
						}
					}

					$$.addClass('selected');
				} else {
					rows.removeClass('selected');
					row.addClass('selected');
				}
			}
		}).
		dblclick(function(e) {
			var isAnchor = e.target.tagName === 'A';
			if (isAnchor) {
				var rows     = tbody.children();
				var row      = rows.has(e.target);
				var index    = rows.index(row);
				var type     = resources[index].contentType;

				Controller(type).apply(column, [e.target.href]);
			}
		}).
		mousedown(function(e) {
			e.preventDefault();
		});

		column.find('.data').
		click(function(e) {
			// support global deselect
			var tableClicked = $('table', this).has(e.target).length > 0;
			if (!tableClicked) { tbody.find('tr').removeClass('selected'); }
			// RADAR maybe we should support global selects for shiftKey...
		}).
		rightClick(function(e) {
			var rows      = tbody.children().removeClass('active');
			var row       = rows.has(e.target);
			var selected  = rows.filter('.selected');
			var context   = [];

			if (selected.has(e.target).length > 0) {
				// selected are clicked
				selected.filter(':visible').each(function() {
					var index = rows.index(this);
					context.push(resources[index]);
				}).addClass('active');
			} else if (row.length > 0) {
				// another resource was clicked
				var index = tbody.children().index(row);
				context.push(resources[index]);
				row.addClass('active');
			} else {
				// empty space was clicked
				context.push(root);
			}

			var position = fixPosition({ top: e.clientY, left: e.clientX });

			menu.data({resources: context, column: column}).
			one('activate', function() { menu.css(position); }).
			one('deactivate', function() { rows.removeClass('active'); }).
			menu().activate();
		});

		var uploader = new plupload.Uploader({
			container: column.attr('id') + '-plupload',
			runtimes: 'html5,html4',
			browse_button: column.attr('id') + '-html4upload',
			drop_element: column.attr('id')
		});
		//uploader.bind('Error', function(up, err) { console.log('error'); });
		//uploader.bind('Init', function(up, res) { console.log('init'); });
		//uploader.bind('StateChanged', function() { console.log('state-changed'); });
		uploader.bind('FileUploaded', function(up, file) {
			var message = file.href + file.name;
			var now = new Date();

			if (file.status === plupload.DONE) {
				log.POST(message + ' => Created', now);

				if (file.href === root.href) {
					var resource, undef,
					    extname = file.name.replace(/^.+\.([^.]+)/, '$1'),
					    type    = plupload.mimeTypes[extname];

					$.each(resources, function() {
						if (this.basename === file.name) { resource = this; }
						return resource === undef;
					});

					if (resource) {
						resource.contentType = type || 'application/octet-stream';
						resource.lastModified = now;
						resource.contentLength = file.size;
					} else {
						var newUri = $.extend({}, root.uri, {
							path: root.uri.path + file.name
						});
						resource = $.extend({}, root, {
							contentLength: file.size,
							contentType: type || 'application/octet-stream',
							basename: file.name,
							href: file.href + file.name,
							lastModified: now,
							isCollection: false,
							uri: newUri,
							decodedURI: newUri.decode(),
							parent: root,
							children: []
						});

						// TODO in two column mode:
						// if resource is visible in alternate column we should do
						// something about it

						resources.push(resource);
					}

					column.trigger('sort');
				}
			} else {
				log.POST(message + ' => Conflict', now);
			}
		});
		uploader.bind('FilesAdded', function(up, files) {
			//console.log('files-added');
			up.settings.url = root.href;
			$.each(files, function() { this.href = root.href; });
		});
		uploader.bind('QueueChanged', function(up) {
			//console.log('queue-changed');
			if (up.state !== plupload.STARTED) { up.start(); }
		});
		uploader.init();

		$('.location .directory-controls').menu({
			'.mkcol': function() {
				var root = this.parents('.column').click().data('root');

				var basename = prompt('Enter directory name:');
				if (basename) {
					function addResource(column, resource) {
						column.data('resources').push(resource);
						column.trigger('sort');
					}
					root.mkCollection(basename, function(st, err) {
						if (st === 'success') {
							columnContains(this, addResource);
						} else {
							alert(err);
						}
					});
				}
			}
		});
	});

	// moves menu to another position if it'd overflow the window limits
	function fixPosition(position) {
		var width = menu.outerWidth();
		var winWidth = win.width();
		if (winWidth < position.left + width) { position.left -= width; }

		var height = menu.outerHeight();
		var winHeight = win.height();
		if (winHeight < position.top + height) { position.top -= height; }

		return position;
	}

	function isExpanded() { return $('#container').hasClass('double'); }

	function transfer(verb, menu) {
		var sourceCol = columns.filter('.focus'),
		    targetCol = columns.not('.focus'),
		    source    = sourceCol.data('root'),
		    target    = targetCol.data('root'),
		    resources = menu.data('resources');

		function transferTo(resource, uri) {
			var href = uri.toString(), overwrite = false;

			function callback(st, href, err) {
				var destination, sort = $();

				if (st === 'success') {
					var resources, index;
					if (verb === 'Move') {
						columnContains(resource, function(column) {
							resources = column.data('resources');
							index     = resources.indexOf(resource);

							if (index > -1) {
								resources.splice(index, 1);
								sort = sort.add(column);
							}
						});
					}
					destination = destination || DAV.Resource.load(href);
					columnContains(destination, function(column) {
						if (overwrite) {
							columnResources = column.data('resources');
							index = $.map(columnResources, toHRef).indexOf(href);
							if (index > -1) { columnResources.splice(index, 1); }
						}
						column.data('resources').push(destination);
						sort = sort.add(column);
					});

					sort.trigger('sort');
				} else if (err === 'Precondition Failed') {
					var confirmed = confirm('Overwrite existing resource?');
					if (confirmed) {
						overwrite = true;
						resource[verb.toLowerCase()](href, overwrite, callback);
					}
				}
			}
			resource[verb.toLowerCase()](href, overwrite, callback);
		}

		var path, uri;
		if (resources.length == 1) {
			var resource = resources[0];

			uri  = new URI(resource.basename).resolve(target.decodedURI);
			path = prompt(verb + ' file to:', uri.path);

			if (path) {
				uri = new URI(path).resolve(target.decodedURI);
				transferTo(resource, uri);
			}
		} else {
			path = prompt(verb + ' files to:', target.decodedURI.path);

			if (path) {
				var base = new URI(path).resolve(target.decodedURI);

				$.each(resources, function() {
					var uri = new URI(this.basename).resolve(base);
					transferTo(this, uri);
				});
			}
		}
	}

	function toHRef(resource) { return resource.href; }
	function columnContains(resource, callback) {
		columns.filter(':visible').each(function() {
			var column   = $(this),
			    hasChild = column.data('root').hasChild(resource.uri);

			if (hasChild) { callback.call(column, column, resource); }
		});
	}

	var menu = $('#context-menu').menu({
		'#get-resource': function() {
			var column = menu.data('column');
			var resource = menu.data('resources')[0];
			// RADAR just GET the resource.href for multiple resources in
			//       seperate windows?
			var resources = $(this).data('resources');
			$.each(resources, function() { window.open(this.href); });
			//Controller(resource.contentType).apply(column, [resource.href]);
		},
		'#delete': function() {
			var target    = menu.data('column'),
			    sibling   = columns.not('.focus'),
			    resources = menu.data('resources');

			var unsure = !confirm('Really delete resource(s)?');
			if (unsure) { return; }

			function removeResource(column, resource) {
				var all   = column.data('resources'),
			        index = $.map(all, toHRef).indexOf(resource.href);

				if (index > -1) {
					all.splice(index, 1);
					column.trigger('redraw');
				}
			}

			$.each(resources, function() {
				this.del(function(st, r, err) {
					if (st === 'success') {
						columnContains(this, removeResource);
					} else {
						alert(err);
					}
				});
			});
		},
		'#duplicate': function() {
			var resources = menu.data('resources'),
			    all       = menu.data('column').data('resources');

			var allNames  = []; // collect names
			for (var i = 0; i < all.length; i++) {
				allNames.push(all[i].basename);
			}

			var shift = Array.prototype.shift;
			function joinBeforeSlash() {
				var slashRemoved = false;
				var basename = shift.call(arguments);

				if (/\/$/.test(basename)) {
					slashRemoved = true;
					basename = basename.slice(0, -1);
				}

				while (arguments.length > 0) {
					basename += shift.call(arguments);
				}
				return slashRemoved ? basename + '/' : basename;
			}

			$.each(resources, function() {
				var resource  = this,
				    base      = resource.decodedURI.parent(),
				    decodedBN = resource.decodedURI.basename(),
				    basename  = joinBeforeSlash(decodedBN, ' Copy'),
				    index     = 0;

				while (allNames.indexOf(basename) !== -1) {
					basename = joinBeforeSlash(decodedBN, ' Copy ', ++index);
				}
				var uri = new URI(basename).resolve(base);

				this.copy(uri.toString(), false, function(st, href, err) {
					if (st === 'success') {
						var copy = DAV.Resource.load(href);
						columnContains(copy, function(column) {
							column.data('resources').push(copy);
							column.trigger('sort');
						});
					} else {
						alert(err);
					}
				});
			});
		},
		'#copy': function() {
			transfer('Copy', menu);
		},
		'#move': function() {
			transfer('Move', menu);
		},
		'#rename': function() {
			var column    = menu.data('column'),
			    source    = menu.data('resources')[0],
			    overwrite = false;

			var basename = prompt('Enter Filename:', source.basename);

			if (basename) {
				var base = source.decodedURI.parent(),
			        uri  = new URI(basename).resolve(base);

				function callback(st, href, err) {
					if (st === 'success') {
						var target = DAV.Resource.load(href),
						    sort = $();

						columnContains(source, function(column, source) {
							var resources = column.data('resources'),
							    index     = $.map(resources, toHRef).indexOf(source.href);

							if (index > -1) {
								resources.splice(index, 1);
								sort = sort.add(column);
							}
						});
						columnContains(target, function(column, target) {
							column.data('resources').push(target);
							sort = sort.add(column);
						});

						sort.trigger('sort');
					} else if (err === 'Precondition Failed') {
						var confirmed = confirm('Overwrite existing resource?');
						if (confirmed) {
							overwrite = true;
							source.move(href, overwrite, callback);
						}
					} else {
						alert(err);
					}
				}

				source.move(uri.toString(), overwrite, callback);
			}
		},
		'#get-info': function() {
			// emit PROPFINDs
		}
	}).bind('activate', function() {
		var half      = menu.data('column').trigger('focus').hasClass('half');
		var resources = menu.data('resources');
		var singular  = resources.length === 1;

		clipboard.css({width: 'auto', height: 'auto'});
		menu.removeClass('resources resource single double');

		menu.addClass(half ? 'double' : 'single');

		if (singular) {
			menu.addClass('resource');
			setTimeout(function() {
				clipboard.zeroclipboard({ text: resources[0].path() });
			}, 100);
		}
		else {
			menu.addClass('resources');
		}
	}).bind('deactivate', function() {
		clipboard.css({width: 1, height: 1});
		$(window).resize();
	});

	doc.click(function(e) {
		if (e.which !== 3) menu.menu().deactivate();
	});

	$.extend(ZeroClipboard, {
		moviepath: '/~/js/zeroclipboard/zeroclipboard.swf'
	});
	var clipboard = $('#clipboard').zeroclipboard({ hand: true }).
	mouseover(function() { clipboard.addClass('hover'); }).
	mouseout(function() { clipboard.removeClass('hover'); });

	$('.type-select').each(function() {
		var $$ = $(this);

		doc.click(function() { $$.removeClass('active'); });

		var label = $$.find('label').
		click(function(e) {
			var active = $$.hasClass('active');
			if (active) return;

			$$.addClass('active');
			// select.focus();

			e.stopPropagation();
		}).
		mousedown(function(e) { e.preventDefault(); });

		var select = $$.find('select').
		change(function() {
			var tbody = $$.parent().find('tbody'), selector;

			tbody.children().addClass('hidden');

			var types = select.val();
			if (types === null) return;

			selector = $.map(types, function(type) {
				return '.' + type;
			}).join(', ');
			tbody.children(selector).removeClass('hidden');

			if (tbody.children('.hidden').length > 0) {
				label.text('Showing: Some Files');
			} else {
				label.text('Showing: All Files');
			}
		}).
		click(function(e) {
			if (e.target.tagName === 'OPTGROUP') {
				var values = [];

				$('option', e.target).each(function() {
					var option = $(this);
					values.push(option.attr('value') || option.text());
				});

				// metaKey on OS X
				// TODO ctrlKey on Windows and Linux
				if (e.metaKey) {
					var selectedValues = select.val();
					var value = selectedValues.pop();
					while (value) {
						var index = values.indexOf(value);

						if (index > -1) { values.splice(index, 1); }
						else { values.push(value); }

						value = selectedValues.pop();
					}
				}

				select.val(values);
				select.change();
			}
			e.stopPropagation();
		});
		$$.find('input').click(function(e) {
			e.stopPropagation();
		});
	});

	$('.expander').click(function(e) {
		var visible = $('#second').toggleClass('hidden').is(':visible');
		$('.column').toggleClass('half').filter(':visible:last').click();

		$('#container').toggleClass('single double');

		if (visible) {
			forceChange = true;
			win.trigger('hashchange');
		}

		e.stopPropagation();
	});

	// Set controller actions
	Controller['directory'] = function(url) {
		$.bbq.pushState({ url: url });
	};
	Controller['application/octet-stream'] = function(url) {
		// we can apply pattern matching here
		if (/(.include|.shtml|.html)$/.test(url)) {
			return Controller['text/html'](url);
		}

		return window.open(url);
	};
	Controller['text/html'] = function(url) {
		var path = url.split('/').slice(2).join('/');
		window.open(location.protocol + '//' + vizard + '/' + path);
	};
	var vizard = 'localhost:3001';

	// Load resources on hashchange
	var disabled = '<option disabled="disabled">Loading...</option>';
	win.bind('hashchange', function(e) {
		var column = $('.focus');
		var url = $.bbq.getState('url') || location.href;

		// FIXME
		if (column.data('href') === url) {
			if (!forceChange) { return; }
			forceChange = false;
		}

		column.find('.breadcrumb').html(disabled);
		DAV.Resource.load(url, function() {
			column.data('root', this).trigger('expire');
		});
	});

	var log = $('#transcript').
	ajaxComplete(function(e, xhr, opts) {
		if (xhr.status == 500) {
			var win = window.open();
			win.document.write(xhr.response);
		}
		log[opts.type](opts.url + ' => ' + xhr.statusText);
	}).
	dblclick(function() {
		log.toggleClass('minimized');
	}).
	mousedown(function(e) { e.preventDefault(); });

	log.push = function(method, message, now) {
		now     = now || new Date();
		message = now.valueOf() + ': ' + method.toUpperCase() + ' ' + message;
		$('<div>').addClass(method).html(message).prependTo(this);
	};
	log.GET = function(msg, now) { this.push('get', msg, now); };
	log.POST = function(msg, now) { this.push('post', msg, now); };
	log.DELETE = function(msg, now) { this.push('delete', msg, now); };
	log.COPY = function(msg, now) { this.push('copy', msg, now); };
	log.MOVE = function(msg, now) { this.push('move', msg, now); };
	log.PROPFIND = function(msg, now) { this.push('propfind', msg, now); };
	log.SEARCH = function(msg, now) { this.push('search', msg, now); };
	log.MKCOL = function(msg, now) { this.push('mkcol', msg, now); };

	win.trigger('hashchange');
});
