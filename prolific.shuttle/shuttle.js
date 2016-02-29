var Queue = require('prolific.queue')
var prolific = require('prolific')
var logger = prolific.createLogger('prolific.shuttle')
var fs = require('fs')
var abend = require('abend')
var Isochronous = require('isochronous')
var cadence = require('cadence')

function Shuttle (process, log, interval) {
    this._logout = fs.createWriteStream(null, { fd: +log })
    prolific.sink = this.queue = new Queue
    this._sink = this.queue.createSink(this._logout)
    this._stopped = false
    this._isochronous = new Isochronous({
        interval: interval,
        operation: { object: this._sink, method: 'flush' },
        unref: true
    })
    process.on('uncaughtException', function (error) {
        logger.error('uncaught', { stack: error.stack })
        this.stop()
        throw error
    }.bind(this))
    process.on('exit', this.stop.bind(this))
    this._stderr = process.stderr
}

Shuttle.prototype.run = cadence(function (async) {
    async(function () {
        this._sink.open(async())
    }, function () {
        this._isochronous.run(async())
    })
})

Shuttle.prototype.stop = function () {
    if (!this._stopped) {
        this._stopped = true
        this._isochronous.stop()
        this.queue.exit(this._stderr)
    }
}

Shuttle.shuttle = function (program) {
    if (!program.env.PROLIFIC_LOGGING_FD) {
        return
    }
    new Shuttle(program, +program.env.PROLIFIC_LOGGING_FD, 2500).run(abend)
}

module.exports = Shuttle
