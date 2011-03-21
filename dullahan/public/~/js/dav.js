(function($) {
	(function(def) {
		def.basename = function() {
			var basenames = this.path.split('/'), fragment = basenames.pop();

			if (fragment !== '') {
				return fragment;
			} else if (basenames.length > 0) {
				return [basenames.pop(), fragment].join('/');
			} else {
				return '/';
			}
		};
		def.dirname = function() {
			var basenames = this.path.split('/'), fragment = basenames.pop();
			if (fragment === '' && basenames.length > 0) { basenames.pop(); }

			return basenames.join('/') + '/';
		};
		def.decode = function() {
			return new URI(decodeURI(this.toString()));
		};
		def.parent = function() {
			return new URI(this.dirname()).resolve(this);
		};
	})(URI.prototype);

	var infinity = (1 / 0).toString().toLowerCase(),
	    undef, trailingSlash = /\/$/;

	function D(selector) { return 'D\\:' + selector + ', ' + selector; }
	function trailing(href, slash) {
		slash = slash || '/';
		rx    = new RegExp(slash + '$');

		if (rx.test(href)) {
			return href;
		} else {
			return href + slash;
		}
	}


	var DAV = {
		Collection: {
			contentType: 'directory/directory'
		},
		Resource: function(uri, context) {
			function NS(selector) {
				selector = D(selector);
				return $(selector, context);
			}
			this.uri         = uri;
			this.decodedURI  = uri.decode();
			this.href        = this.decodedURI.toString();
			this.basename    = this.decodedURI.basename();

			this['contentType']   = NS('getcontenttype').text();
			this['contentLength'] = NS('getcontentlength').text() * 1;
			this['lastModified']  = new Date(NS('getlastmodified').text());
			this['isCollection']  = NS('resourcetype').contents().length > 0;

			if (this.isCollection) {
				this['contentType'] = DAV.Collection.contentType;
			} else if (this.contentType.length === 0) {
				this['contentType'] = DAV.Resource.contentType;
			}

			return this;
		}
	};

	DAV.Resource.contentType = 'application/octet-stream';
	DAV.Resource.load = function(href, callback) {
		var resource, async = callback !== undef,
		    decodedHRef = decodeURI(href);

		$.ajax(encodeURI(decodedHRef), {
			async: async,
			beforeSend: function(jqXHR) {
				jqXHR.setRequestHeader('DEPTH', 0);
			},
			dataType: 'xml',
			success: function(multi) {
				var response = $(multi).find(D('response')).get(0),
				    uri      = new URI(href);

			    resource = new DAV.Resource(uri, response);
				if (callback) { callback.call(resource); }
			},
			type: 'PROPFIND'
		});

		return resource;
	};

	(function(def) {
		def.host = function() {
			return this.uri.authority;
		};
		def.path = function() {
			return this.uri.path;
		};

		def.hasChild = function(uri) {
			return uri.dirname() === this.uri.path;
		};

		def.mkCollection = function(href, callback) {
			var result, async = callback !== undef;
			href = new URI(href).resolve(this.decodedURI).toString();

			if (this.isCollection) { href = trailing(href); }

			$.ajax(encodeURI(href), {
				async: async,
				context: this,
				error: function(jqXHR, status, error) {
					if (callback) { callback.call(this, status, error); }
					else { result = false; }
				},
				success: function(data, status, jqXHR) {
					this.children = undef; // force reload
					parent = this;

					DAV.Resource.load(href, function() {
						this.parent = parent;

						if (callback) { callback.call(this, status, this); }
						else { result = this; }
					});
				},
				type: 'MKCOL'
			});

			return result;
		};
		// TODO squeeze move and copy DRY
		def.move = function(href, overwrite, callback) {
			var result, async = callback !== undef;
			href = new URI(href).resolve(this.decodedURI).toString();
			overwrite = overwrite.toString().slice(0, 1).toUpperCase();

			if (this.isCollection) { href = trailing(href); }

			$.ajax(encodeURI(this.href), {
				async: async,
				beforeSend: function(jqXHR) {
					jqXHR.setRequestHeader('DEPTH', infinity);
					jqXHR.setRequestHeader('DESTINATION', href);
					jqXHR.setRequestHeader('OVERWRITE', overwrite);
				},
				context: this,
				error: function(jqXHR, status, error) {
					if (callback) { callback.call(this, status, href, error); }
					else { result = false; }
				},
				success: function(data, status, jqXHR) {
					if (callback) { callback.call(this, status, href); }
					else { result = true; }
				},
				type: 'MOVE'
			});

			return result;
		};
		def.copy = function(href, overwrite, callback) {
			var result, async = callback !== undef;
			href = new URI(href).resolve(this.decodedURI).toString();
			overwrite = overwrite.toString().slice(0, 1).toUpperCase();

			if (this.isCollection) { href = trailing(href); }

			$.ajax(encodeURI(this.href), {
				async: async,
				beforeSend: function(jqXHR) {
					jqXHR.setRequestHeader('DEPTH', infinity);
					jqXHR.setRequestHeader('DESTINATION', href);
					jqXHR.setRequestHeader('OVERWRITE', overwrite);
				},
				context: this,
				error: function(jqXHR, status, error) {
					if (callback) { callback.call(this, status, href, error); }
					else { result = false; }
				},
				success: function(data, status, jqXHR) {
					if (callback) { callback.call(this, status, href); }
					else { result = true; }
				},
				type: 'COPY'
			});

			return result;
		};
		def.del = function(callback) {
			var result, async = callback !== undef;

			$.ajax(encodeURI(this.href), {
				async: async,
				context: this,
				error: function(jqXHR, status, error) {
					if (callback) { callback.call(this, status, this, error); }
					else { result = false; }
				},
				success: function(data, status, jqXHR) {
					if (this.parent) { this.parent.children = undef; }

					if (callback) { callback.call(this, status, this); }
					else { result = true; }
				},
				type: 'DELETE'
			});

			return result;
		};

		def.loadParent = function() {
			if (this.uri.dirname() === this.uri.path) {
				this.parent = this;
			} else {
				var uri  = new URI(this.uri.dirname()).resolve(this.uri),
				    href = uri.toString();

				$.ajax(encodeURI(href), {
					async: false,
					beforeSend: function(jqXHR) {
						jqXHR.setRequestHeader('DEPTH', 0);
					},
					context: this,
					dataType: 'xml',
					success: function(multi) {
						var response = $(D('response'), multi).get(0),
						    resource = new DAV.Resource(uri, response);

						this.parent = resource;
					},
					type: 'PROPFIND'
				});
			}
		};
		def.getParent = function() {
			if (this.parent === undef) { this.loadParent(); }
			return this.parent;
		};
		def.ancestors = function() {
			var graph = [];
			var last = this, ancestor = last.getParent();

			while (ancestor.href !== last.href) {
				graph.push(ancestor);

				last     = ancestor;
				ancestor = last.getParent();
			}

			return graph;
		};

		def.loadChildren = function() {
			this.children = [];
			if (!this.isCollection) { return; }

			$.ajax(encodeURI(this.href), {
				async: false,
				beforeSend: function(jqXHR) {
					jqXHR.setRequestHeader('DEPTH', 1);
				},
				context: this,
				dataType: 'xml',
				success: function(multi) {
					var parent = this, collection = this.children;

					$(D('response'), multi).filter(':gt(0)').
					each(function() {
						var href = $(D('href'), this).text(),
						    uri = new URI(href),
						    resource = new DAV.Resource(uri, this);

						resource.parent = parent;

						collection.push(resource);
					});
				},
				type: 'PROPFIND'
			});
		};
		def.getChildren = function() {
			if (this.children === undef) { this.loadChildren(); }
			return this.children;
		};

	})(DAV.Resource.prototype);

	this.DAV = DAV;
})(jQuery);
