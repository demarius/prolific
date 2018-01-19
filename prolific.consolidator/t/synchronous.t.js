require('proof')(4, prove)

function prove (okay, callback) {
    var stream = require('stream')
    var Synchronous = require('../synchronous')
    var Chunk = require('prolific.chunk')
    var abend = require('abend')

    var chunk, previousChecksum, buffer

    var through = new stream.PassThrough
    var forward = new stream.PassThrough
    var synchronous = new Synchronous

    synchronous.listen(through, forward, function (error) {
        okay(! error, 'listen exit okay')
        callback()
    })

    through.write('hello, world\n')

    chunk = new Chunk(0, 0, new Buffer(''), 1)
    write(through, chunk, 'aaaaaaaa')

    previousChecksum = chunk.checksum
    buffer = new Buffer('a\n')
    chunk = new Chunk(0, 1, buffer, buffer.length)
    write(through, chunk, previousChecksum)

    chunk = new Chunk(1, 0, new Buffer(''), 1)
    write(through, chunk, 'aaaaaaaa')

    previousChecksum = chunk.checksum
    buffer = new Buffer('a\n')
    chunk = new Chunk(1, 1, buffer, buffer.length)
    write(through, chunk, previousChecksum)

    okay(forward.read().toString(), 'hello, world\n', 'through')

    var consumer = {
        chunks: [],
        consume: function (chunk) {
            this.chunks.push(chunk)
        }
    }

    synchronous.addConsumer(1, consumer)

    okay(consumer.chunks.shift().buffer.toString(), 'a\n', 'consumer join')

    previousChecksum = chunk.checksum
    buffer = new Buffer('b\n')
    chunk = new Chunk(1, 2, buffer, buffer.length)
    write(through, chunk, previousChecksum)

    okay(consumer.chunks.shift().buffer.toString(), 'b\n', 'consumer consume')

    previousChecksum = chunk.checksum
    chunk = new Chunk(1, 3, new Buffer(''), 0)
    chunk.checksum = 'aaaaaaaa'
    write(through, chunk, previousChecksum)

    through.end()

    function write (writable, chunk, previousChecksum) {
        writable.write(chunk.header(previousChecksum))
        writable.write(chunk.buffer)
    }
}
