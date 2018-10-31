// Node.js API.
var fs = require('fs')
var assert = require('assert')

// Control-flow utilities.
var cadence = require('cadence')
var Turnstile = require('turnstile')
Turnstile.Check = require('turnstile/check')

var Interrupt = require('interrupt').createInterrupter('prolific')
var logger = require('prolific.logger').createLogger('prolific.supervisor')

var Reconfigurator = require('reconfigure')
var byBuffer = require('reconfigure/buffer')

var Signal = require('signal')

var LEVEL = require('prolific.level')

var path = require('path')

// Construct a processor that will reload it's configuration from the given
// configuration and call the given function with the new in-process Acceptor
// configuration. The in-process Acceptor configuration will be routed to the
// child process we're monitoring and injected into it so that the first round
// of filtering will happen in-process saving copying time.
//
// The given destructible is used to manage the lifecycle of the pipeline and
// its processors.

//
function Processor (destructible, module, reloaded) {
    this.destroyed = false
    this._destructible = destructible
    this._destructible.markDestroyed(this)

    var turnstile = new Turnstile
    turnstile.listen(destructible.monitor('reopen'))
    destructible.destruct.wait(turnstile, 'close')
    this._check = new Turnstile.Check(this, '_reload', turnstile)

    this._reloaded = reloaded
    this._reloads = 0

    this._path = path.resolve(module)

    this._version = 0
    this._versions = []

    this._reconfigurator = new Reconfigurator(this._path, byBuffer)
    destructible.destruct.wait(this._reconfigurator, 'destroy')
}

Processor.prototype._createProcessor = cadence(function (async, destructible, Processor) {
    async(function () {
        destructible.monitor('processor', Processor, async())
    }, function (processor) {
        return [ { push: function (entry) { processor(entry) } }, destructible ]
    })
})

Processor.prototype._loadModule = function () {
    delete require.cache[this._path]
    return require(this._path)
}

Processor.prototype.watch = cadence(function (async, ready) {
    var source = Buffer.from('?')
    // Note that we actually load twice every time we start, once to get our no
    // triage version to catch messages from the application process before it
    // gets it's triage function, then we generate an update to update the child
    // process with the triage function. We could work to eliminate the reload,
    // but I'm happy to exercise it.
    var block = async(function () {
        async([function () {
            ready.unlatch()
        }], function () {
            this._reconfigurator.monitor(source, async())
        }, function (changed) {
            if (changed == null) {
                return [ block.break ]
            }
            var module = this._loadModule()
            var Processor = module.process()
            async(function () {
                this._destructible.monitor([ 'processor', 'bootstrap' ], true, this, '_createProcessor', Processor, async())
            }, function (processor, destructible) {
                var triage = module.triage()
                this._processor = {
                    push: function (entry) {
                        var header = {
                            when: entry.when,
                            level: entry.level,
                            qualified: entry.qualifier + '#' + entry.label,
                            qualifier: entry.qualifier,
                            label: entry.label
                        }
                        if (triage(LEVEL[entry.level], header, entry.body, entry.system)) {
                            for (var key in entry.system) {
                                header[key] = entry.system[key]
                            }
                            for (var key in entry.body) {
                                header[key] = entry.body[key]
                            }
                            processor.push(header)
                        }
                    }
                }
                this._previousDestructible = destructible
            })
        })
    }, function () {
        var loop = async(function () {
            this._reconfigurator.monitor(source, async())
        }, function (changed) {
            if (changed == null) {
                return [ block.break ]
            }
            source = changed
            async([function () {
                var module = this._loadModule()
                var Processor = module.process()
                var version = this._version++
                async(function () {
                    this._destructible.monitor([ 'processor', version ], true, this, '_createProcessor', Processor, async())
                }, function (processor, destructible) {
                    this._versions.push({
                        destructible: this._previousDestructible,
                        version: version,
                        processor: processor
                    })
                    this._previousDestructible = destructible
                    this._reloaded({ version: version, triage: module.triage.toString() })
                })
            }, function (error) {
                return [ loop.continue ]
            }])
        })()
    })()
})

Processor.prototype.updated = cadence(function (async, version) {
    var configuration = this._versions.shift()
    assert(version == configuration.version)
    this._processor = configuration.processor
    configuration.destructible.completed.wait(async())
    configuration.destructible.destroy()
})

// Async because if we have a version bump we have to wait for the previous
// processor to drain to start the new one, however we are not processing per
// message, we are getting chunks of messages and those are processed
// synchronously.
Processor.prototype.process = cadence(function (async, envelope) {
    var lines = envelope.body.buffer.toString().split('\n')
    if (lines[lines.length - 1].length == 0) {
        lines.pop()
    }
    var entries = lines.map(JSON.parse)
    var loop = async(function () {
        while (entries.length && !Array.isArray(entries[0])) {
            this._processor.push(entries.shift())
        }
        if (entries.length == 0) {
            return [ loop.break ]
        } else {
            this.updated(entries.shift()[0].version, async())
        }
    })()
})

module.exports = cadence(function (async, destructible, configuration, reloaded) {
    var processor = new Processor(destructible, configuration, reloaded)
    async(function () {
        processor.watch(new Signal(async()), destructible.monitor('watch'))
    }, function () {
        return [ processor ]
    })
})
