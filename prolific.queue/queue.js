var cadence = require('cadence')
var Chunk = require('prolific.chunk')

function Queue (stream) {
    this._buffers = []
    this._chunks = []
    this._chunkNumber = 1
    this._previousChecksum = 'aaaaaaaa'
    this._stream = stream
    this._chunks.push(new Chunk(0, new Buffer(''), 1))
}

Queue.prototype.write = function (buffer) {
    this._buffers.push(buffer)
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

Queue.prototype.flush = cadence(function (async) {
    if (this._termianted) {
        return
    }

    this._chunkEntries()

    var loop = async(function () {
        if (this._chunks.length == 0) {
            return [ loop.break ]
        }
        var chunk = this._chunks[0]
        async(function () {
            this._stream.write(chunk.header(this._previousChecksum), async())
        }, function () {
// TODO Wait for a response, let's get for reals here.
            this._stream.write(chunk.buffer, async())
        }, function () {
            this._previousChecksum = chunk.checksum
            this._chunks.shift()
        })
    })()
})

Queue.prototype.exit = function (stderr) {
    if (this._termianted) {
        return
    }

    this._termianted = true

    this._chunkEntries()

    if (this._chunks.length == 0) {
        return
    }

    this._chunks.unshift(new Chunk(0, new Buffer(''), this._chunks[0].number))

    var buffers = []
    while (this._chunks.length) {
        var chunk = this._chunks.shift()
        buffers.push(chunk.header(this._previousChecksum), chunk.buffer)
        this._previousChecksum = chunk.checksum
    }

    stderr.write(Buffer.concat(buffers))
}

module.exports = Queue
