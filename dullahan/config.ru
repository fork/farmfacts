require 'rubygems'
require 'bundler/setup'
Bundler.require

use Rack::CommonLogger
use Rack::ShowExceptions
use Rack::Runtime

require "#{ File.expand_path '..', __FILE__ }/application.rb"
run Application
