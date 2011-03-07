(function() {
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

	var protocol = location.protocol;
	var host     = location.pathname.split('/', 2)[1];
	var params   = new Parameters(location.search);

	var src = protocol + '//ajax.googleapis.com';
	    src += '/ajax/libs/jquery/1.5.1/jquery.min.js';

	var script  = document.createElement('script');
	script.type = 'text/javascript';
	script.src  = src;

	document.body.appendChild(script);

	function require(src) {
		var script = $('<script type="text/javascript">').attr('src', src);
		$('body').append(script);

		return script;
	}

	function boot() {
		if (!window.jQuery) { return; }
		clearInterval(interval);

		require('/js/jquery.simple-toolbar.js');
		require('/js/jquery.vizard-0.4.core.js').ready(function() {
			var path = '/' + location.pathname.split('/').slice(2).join('/');

			Vizard.location = {
				host: host,
				hostname: host.split(':', 1)[0],
				href: protocol + '//' + host + path,
				pathname: path,
				port: host.split(':', 2)[1],
				protocol: protocol,
				__proto__: location.__proto__
			};
			Vizard.params = params;

			require(protocol + '//' + host + params['boot-uri']);
		});
	};

	// set an interval because IEs readystatechange gets overwritten by jQuery
	var interval = setInterval(boot, 25);

	// export load function
	this.require = require;

})();
