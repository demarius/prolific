require('proof')(7, require('cadence')(prove))

function prove (async, okay) {
    var stream = require('stream')
    var Queue = require('../queue')
    var Chunk = require('prolific.chunk')
    var queue
    var count = 0
    var expected = [
        '% 1 0 aaaaaaaa 811c9dc5 1\n',
        '% 1 1 811c9dc5 fdaf7437 6\n1\n2\n3\n',
        '% 1 2 fdaf7437 9fe3ab4b 2\n4\n',
        '% 1 0 aaaaaaaa 811c9dc5 1\n'
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
        queue = new Queue(1, new stream.PassThrough)
        queue.close()
        queue.setPipe(writable)
    }, function () {
        queue = new Queue(1, new stream.PassThrough)
        queue.setPipe(writable)
        queue.push(1)
        queue.push(2)
        queue.push(3)
    }, function () {
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
