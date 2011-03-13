(function($) {
	var exports = this;

	function Resource(response) {
		var resource = this;
		var $$ = $(response);

		resource.href = $$.find('D\\:href, href').text();
		resource.initializeDisplayName(); // FIXME prefer displayname

		var p = $$.find('D\\:prop, prop');
		resource.contentType   = p.find('D\\:getcontenttype, getcontenttype').text();
		resource.contentLength = p.find('D\\:getcontentlength, getcontentlength').text() * 1;
		resource.lastModified  = new Date(p.find('D\\:getlastmodified, getlastmodified').text());

		var collection = p.find('D\\:resourcetype, resourcetype').contents().length > 0;
		resource.isCollection = function isCollection() {
			return collection;
		};
		if (resource.isCollection()) {
			resource.contentType = 'directory/directory';
		} else if (resource.contentType.length === 0) {
			resource.contentType = 'broken/file';
		}

		return resource;
	}
	(function(proto) {
		proto.isCollection = function isCollection() {
			var value = /\/$/.test(this.href);

			this.isCollection = function isCollection() {
				return value;
			};

			return value;
		};
		proto.host = function host() {
			var value = this.href.split('/').slice(0, 3).join('/');

			this.host = function host() { return value; };

			return value;
		};
		proto.path = function path() {
			var value = '/' + this.href.split('/').slice(3).join('/');

			this.path = function path() { return value; };

			return value;
		};
		proto.initializeDisplayName = function() {
			var basenames = this.path().split('/');
			var basename;

			if (this.isCollection()) {
				basename = basenames.slice(-2, -1);
			} else {
				basename = basenames.slice(-1);
			}

			this.displayName = decodeURI(basename);
		};
		proto.ancestors = function ancestors() {
			var value = [];
			var ancestor = this.parent();

			while (ancestor) {
				value.push(ancestor);
				ancestor = ancestor.parent();
			}
			this.ancestors = function ancestors() { return value; };

			return value;
		};
		proto.parent = function parent() {
			if (this.path() === '/') return null;

			var href = this.href.split('/');
			if (this.isCollection()) {
				href = href.slice(0, -2).join('/') + '/';
			} else {
				href = href.slice(0, -1).join('/') + '/';
			}
			var value = $.extend({ href: href }, proto);
			value.initializeDisplayName();

			this.parent = function parent() { return value; };

			return value;
		};
		proto.copy = function copy(destination, callback, depth, overwrite) {
			WebDAV.COPY(this.href, destination, callback, depth, overwrite);
		};
		proto.move = function move(destination, callback, depth, overwrite) {
			WebDAV.MOVE(this.href, destination, callback, depth, overwrite);
		};
		proto.mkcol = function mkcol(callback) {
			WebDAV.MKCOL(this.href, callback);
		};
		proto['delete'] = function(callback) {
			WebDAV.DELETE(this.href, callback);
		};
		proto.del = proto['delete'];
		// ...
	})(Resource.prototype);

	exports.WebDAV = {
		Resource: Resource,
		PROPFIND: function(uri, callback, depth) {
			if (typeof(depth) == 'undefined') depth = 1;

			$.ajax({
				beforeSend: function(r) {
					r.setRequestHeader('DEPTH', depth);
				},
				complete: function(request, status) {
					if (status == 'success') {
						callback.call(this, request.responseXML);
					}
				},
				dataType: 'xml',
				xhrFields: { withCredentials: true },
				type: 'PROPFIND',
				url: uri
			});
		},
		GET: function(url, callback) {
			$.ajax({
				complete: function(request, status) {
					if (status == 'success') {
						callback.call(this, request.responseXML);
					}
				},
				xhrFields: { withCredentials: true },
				url: url
			});
		},
		MKCOL: function(url, callback) {
			$.ajax({
				complete: function(request, status) {
					if (status == 'success') {
						callback.call(this, request.responseXML);
					}
				},
				type: 'MKCOL',
				xhrFields: { withCredentials: true },
				url: url
			});
		},
		DELETE: function(url, callback) {
			$.ajax({
				complete: function(request, status) {
					if (status == 'success') {
						callback.call(this, request.responseXML);
					}
				},
				type: 'DELETE',
				xhrFields: { withCredentials: true },
				url: url
			});
		},
		COPY: function(url, destination, callback, depth, overwrite) {
			if (typeof(overwrite) == 'undefined') overwrite = true;
			overwrite = overwrite.toString().slice(0, 1).toUpperCase();
			if (typeof(depth) == 'undefined') depth = 1 / 0;
			depth = depth.toString().toLowerCase();

			$.ajax({
				beforeSend: function(req) {
					req.setRequestHeader("DESTINATION", destination);
					req.setRequestHeader("OVERWRITE", overwrite);
					req.setRequestHeader("DEPTH", depth);
				},
				complete: function(request, status) {
					if (status == 'success') {
						callback.call(this, request.responseXML);
					}
				},
				type: 'COPY',
				xhrFields: { withCredentials: true },
				url: url
			});
		},
		MOVE: function(url, destination, callback, depth, overwrite) {
			if (typeof(overwrite) == 'undefined') overwrite = true;
			overwrite = overwrite.toString().slice(0, 1).toUpperCase();
			if (typeof(depth) == 'undefined') depth = 1 / 0;
			depth = depth.toString().toLowerCase();

			$.ajax({
				beforeSend: function(req) {
					req.setRequestHeader("DESTINATION", destination);
					req.setRequestHeader("OVERWRITE", overwrite);
					req.setRequestHeader("DEPTH", depth);
				},
				complete: function(request, status) {
					if (status == 'success') {
						callback.call(this, request.responseXML);
					}
				},
				type: 'MOVE',
				xhrFields: { withCredentials: true },
				url: url
			});
		}
	};
})(jQuery);
