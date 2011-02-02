// Simple wrapper around String.
(function(Word) {
	var proto = Word.prototype;

	proto.toString = function() { return this.string; };

	proto.downcase = function() {
		var string = this.string.toLowerCase();
		return new Word(string);
	};
	proto.upcase = function() {
		var string = this.string.toUpperCase();
		return new Word(string);
	};

	proto.isSingular = function() {};
	proto.isPlural = function() {};

	proto.singularize = function() {
		var string = this.string.toLowerCase();
		var match  = false;
		var index;
		var rule, replacement;

		index = 0;
		count = UNCOUNTABLES.length;
		while (index < count) {
			if (string === UNCOUNTABLES[index]) { return this; }
			index++;
		}

		index = 0;
		count = PLURALS.length;
		while (!match && index < count) {
			rule = PLURALS[index][0];
			match = rule.test(string);
			if (match) {
				replacement = PLURALS[index][1];
				string = this.string.replace(rule, replacement);
			} else {
				index++;
			}
		}

		return new Word(string);
	};
	proto.pluralize = function() {
		var string = this.string + 's';
		return new Word(string);
	};

	proto.withNumber = function(count) {
		var word   = (count !== 1) ? this.pluralize() : this;
		var string = count + ' ' + word.downcase().toString();

		return new Word(string);
	};

	this['Word'] = Word;
})(function(string) { this.string = string; });
