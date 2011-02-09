(function($) {

	function Toolbar(callbacks, jQuery) {
		var toolbar = this;
		toolbar.length = 0;

		jQuery.
		click(function(e) { e.stopPropagation(); }).data('toolbar', toolbar).

		find('a').
		each(function() {
			var tool = new Toolbar.Tool(callbacks.shift(), this);
			toolbar.push(tool);
		});

		return toolbar;
	}
	(function(fn) {
		fn.each = function(callback) {
			for (var i = 0; i < this.length; i++) {
				callback.call(this[i], i);
			}
		};
		fn.push = function(tool) {
			this[this.length] = tool;
			this.length++;
		};
	})(Toolbar.prototype);

	Toolbar.Tool = function Tool(callback, element) {
		this.$ = $(element).data('tool', this).click(callback);
		return this;
	};

	$.fn.toolbar = function(callbacks) {
		var toolbar = this.data('toolbar');

		if (toolbar) {
			return toolbar;
		} else {
			toolbar = new Toolbar(callbacks, this);
		}

		return this;
	};

})(jQuery);
