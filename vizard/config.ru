class Vizard
  ROOT = File.expand_path '../public/index.html', __FILE__
  def call(env)
    index = File.read ROOT
    [200, {}, index]
  end
end

use Rack::CommonLogger
run Vizard.new
