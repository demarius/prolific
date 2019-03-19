require('proof')(4, require('cadence')(prove))

function prove (async, okay) {
    var abend = require('abend')
    var stream = require('stream')
    var Queue = require('../queue')
    var Chunk = require('prolific.chunk')
    var queue
    var count = 0
    var expected = [
        '[1]\n',
        '[2,3]\n',
        '[4]\n'
    ]
    var writable = {
        write: function (buffer, callback) {
            okay(buffer.toString(), expected.shift(), 'chunk ' + (++count))
            this.wait = callback
        },
        end: function () {
        }
    }
    async(function () {
        // Step through closing before you've set the pipe.
        var pipe = new stream.PassThrough
        queue = new Queue(512, [ 1, 2 ], pipe)
        queue.send(async())
        queue.announce(1)
        queue.exit()
        queue.exit()
        queue.setPipe(writable)
        okay(pipe.read().toString(),
            '% 1/2 aaaaaaaa 224e8640 1 %\n{"method":"announce","body":1}\n' +
            '% 1/2 224e8640 b798da34 1 %\n{"method":"exit"}\n'
        , 'exit early')
    }, function () {
        queue = new Queue(512, [ 1, 2 ], new stream.PassThrough)
        queue.send(async())
        queue.push(1)
        queue.setPipe(writable)
        queue.push(2)
        queue.push(3)
        while (writable.wait != null) {
            var wait = [writable.wait, writable.wait = null][0]
            wait()
        }
        queue.push(4)
        while (writable.wait != null) {
            var wait = [writable.wait, writable.wait = null][0]
            wait()
        }
        queue.close()
        queue.close()
    }, function () {
        return [ async.return ]
        var stderr = new stream.PassThrough
        queue = new Queue(1, stderr)
        queue.setPipe(writable)
        queue.push(1)
        queue.close()
        var chunk = stderr.read().toString()
        okay(chunk, '% 1 0 aaaaaaaa 811c9dc5 1\n% 1 1 811c9dc5 05eb07a2 2\n1\n', 'exit')
        queue.push(3)
        okay(stderr.read().toString(), '% 1 2 05eb07a2 5df00f58 2\n3\n', 'write after close')
        var callback, count = 0
        queue = new Queue(1, stderr)
        queue.setPipe({
            write: function (buffer, _callback) {
                if (count++ == 2) {
                    callback = _callback
                } else {
                    _callback()
                }
            },
            end: function () {
            }
        })
        queue.push(1)
        queue.push(2)
        queue.close()
        okay(stderr.read().toString(),
            '% 1 0 aaaaaaaa 811c9dc5 2\n% 1 2 811c9dc5 87f2900d 2\n2\n', 'exit')
        callback()
    })
}
