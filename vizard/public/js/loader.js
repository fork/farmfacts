// RADAR replace loader with DeferJS when it supports .css loading.
(function($) {
	function Parameters(search) {
		var pairs = search.slice(1).split('&');
		var param, value;

		if (search === '') { return this; }

		for (var i = 0; i < pairs.length; i++) {
			param = pairs[i].split('=', 1);
			param = decodeURIComponent(param);
			value = pairs[i].split('=').slice(1).join('=');

			this[param] = decodeURIComponent(value);
		}

		return this;
	}
	Parameters.prototype['boot-uri'] = '/javascripts/vizard.boot.js';

	var protocol  = location.protocol,
	    host      = location.pathname.split('/', 2)[1],
	    params    = new Parameters(location.search),
	    jsExtname = /\.js$/, cssExtname = /\.css$/;

	var last, undef;

	function require(src, callback) { $.getScript(src, callback); }
	function include(src, callback) {
		if (jsExtname.test(src)) {
			$.getScript(src, callback);
		} else if (cssExtname.test(src)) {
			$('<link rel="stylesheet" type="text/css" charset="utf-8">').
			attr('href', src).appendTo('head');
		}
	}

	// export loader functions
	this.require  = require;
	this.include  = include;

	require('/js/jquery.simple-toolbar.js');
	require('/js/jquery.vizard-0.6.core.js', function() {
		var path = '/' + location.pathname.split('/').slice(2).join('/');

		Vizard.location = {
			host:     host,
			hostname: host.split(':', 1)[0],
			href:     protocol + '//' + host + path,
			pathname: path,
			port:     host.split(':', 2)[1],
			protocol: protocol,

			__proto__: location.__proto__
		};
		Vizard.params = params;

		require(protocol + '//' + host + params['boot-uri']);
	});
	include('/js/xhtml-0.3.min.js');

})(jQuery);
