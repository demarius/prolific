var fs = require('fs')
var stream = require('stream')

var Staccato = require('staccato')

var coalesce = require('extant')

var abend = require('abend')
var cadence = require('cadence')
var Signal = require('signal')
var delta = require('delta')

var restrictor = require('restrictor')

function Processor (options) {
    this._rotate = coalesce(options.rotate, Infinity)
    this._nullSender = {
        sent: Infinity,
        process: function (entry) { this.lines.push(stringify(entry)) },
        flush: function (callback) { callback() },
        stream: new stream.PassThrough,
        lines: [],
        rotating: true
    }
    this._writable = { end: function (callback) { callback() } }
    this._next = next
    this._filename = parameters.file
    this._rotateSize = parameters.rotate || 1024 * 1024 * 1024
    this._pid = parameters.pid || process.pid
    this._sender = this._nullSender
    this._Date = parameters.Date || Date
    this._rotating = new Signal
}

Processor.prototype.open = function (callback) { callback() }

Processor.prototype._open = cadence(function (async) {
})

Processor.prototype.send = restrictor.push(cadence(function (async, line) {
    async(function () {
        if (this._written >= this._rotate) {
            this._rotate(async())
        }
    }, function () {
        this._writable.wriate(line, async())
    })
}))

Processor.prototype._close = function () {
    this.destroyed = true
}

Processor.prototype._rotate = cadence(function (async) {
    var stream
    async(function () {
        this._writable.end(async())
    }, function () {
        this._written = 0
        var stamp = new Date(this._Date.now())
            .toISOString()
            .replace(/[T.:]/g, '-')
            .replace(/-\d{2}-\d{3}Z$/, '')
        var filename = [ this._filename, stamp, this._pid ].join('-')
        var stream = fs.createWriteStream(filename, { flags: 'a' })
        delta(async()).ee(stream).on('open')
    }, function () {
        this._writable = new Straccato.Writable(stream)
        this._rotating.notify()
    })
})

Processor.prototype._flush = cadence(function (async) {
    async(function () {
        this._sender.flush(async())
    }, function () {
// TODO Expose `stream` instead of `_stream`.
        this._sender.stream.end()
    })
})

Processor.prototype.process = function (entry) {
    this._sender.process(entry)
    if (this._sender.sent >= this._rotateSize) {
        this._rotate(abend)
    }
    this._next.process(entry)
}

Processor.prototype.close = cadence(function (async) {
    async(function () {
        this._rotating.wait(async())
    }, function () {
        this._flush(async())
    })
})

module.exports = cadence(function (async, destructible, options) {
    return new Processor(options)
})
