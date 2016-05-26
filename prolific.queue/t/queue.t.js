require('proof')(2, require('cadence')(prove))

function prove (async, assert) {
    var stream = require('stream')
    var Queue = require('../queue')
    var Chunk = require('prolific.chunk')
    var queue
    async(function () {
        queue = new Queue(new stream.PassThrough)
        queue.write(new Buffer(1 + '\n'))
        queue.write(new Buffer(2 + '\n'))
        queue.write(new Buffer(3 + '\n'))
        queue.flush(async())
    }, function () {
        var chunk = queue._stream.read().toString()
        assert(chunk, '% 0 aaaaaaaa 811c9dc5 1\n% 1 811c9dc5 fdaf7437 6\n1\n2\n3\n', 'initialize')
        queue.exit(null)
        queue.exit(null)
        queue.flush(async())
    }, function () {
        queue = new Queue(new stream.PassThrough)
        var stderr = new stream.PassThrough
        queue.exit(stderr)
        var chunk = stderr.read().toString()
        assert(chunk, '% 0 aaaaaaaa 811c9dc5 0\n% 0 811c9dc5 811c9dc5 1\n', 'exit')
    })
}
