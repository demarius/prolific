var rescue = require('rescue')
var abend = require('abend')
var cadence = require('cadence')
var Chunk = require('prolific.chunk')

function Queue (stream) {
    this._buffers = []
    this._chunks = []
    this._chunkNumber = 1
    this._previousChecksum = 'aaaaaaaa'
    this._stream = stream
    this._terminated = false
    this._closed = false
    this._writing = false
    this._chunks.push(new Chunk(0, new Buffer(''), 1))
}

Queue.prototype.write = function (buffer) {
    this._buffers.push(buffer)
    if (!this._writing) {
        this._writing = true
        this.flush(abend)
    }
}

Queue.prototype._chunkEntries = function () {
    var buffers = this._buffers
    if (buffers.length == 0) {
        return
    }
    this._buffers = []

    var buffer = Buffer.concat(buffers)
    this._chunks.push(new Chunk(this._chunkNumber++, buffer, buffer.length))
}

Queue.prototype._checkTerminated = function () {
    if (this._terminated) {
        throw new Error('bigeasy.prolific.queue#terminated')
    }
}

Queue.prototype._write = cadence(function (async, buffer) {
    this._stream.write(buffer, async())
})

Queue.prototype.flush = cadence(function (async) {
    async([function () {
        var loop = async(function () {
            this._checkTerminated()
            if (this._chunks.length == 0) {
                this._chunkEntries()
                if (this._chunks.length == 0) {
                    this._writing = false
                    return [ loop.break ]
                }
            }
            var chunk = this._chunks[0]
            async(function () {
                this._checkTerminated()
                this._write(chunk.header(this._previousChecksum), async())
            }, function () {
                this._checkTerminated()
    // TODO Wait for a response, let's get for reals here.
                this._write(chunk.buffer, async())
            }, function () {
                this._checkTerminated()
                this._previousChecksum = chunk.checksum
                this._chunks.shift()
            })
        })()
    }, rescue(/^bigeasy.prolific.queue#terminated$/)])
})

Queue.prototype.exit = function (stderr, callback) {
    if (this._terminated) {
        return
    }

    this._terminated = true

    this._chunkEntries()

    if (this._chunks.length == 0) {
        return
    }

    this._chunks.unshift(new Chunk(0, new Buffer(''), this._chunks[0].number))
    this._previousChecksum = 'aaaaaaaa'

    var buffers = []
    while (this._chunks.length) {
        var chunk = this._chunks.shift()
        buffers.push(chunk.header(this._previousChecksum), chunk.buffer)
        this._previousChecksum = chunk.checksum
    }

    stderr.write(Buffer.concat(buffers), callback)
}

module.exports = Queue
