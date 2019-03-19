var fnv = require('hash.fnv')
var assert = require('assert')

function Collector (stderr) {
    this._channels = {}
    this._stderr = stderr
}

Collector.prototype._chunk = function (matched, buffer) {
    if (matched.header) {
        var json = JSON.parse(buffer.toString())
        switch (json.method) {
        case 'announce':
            assert(this._channels[json.id] == null)
            this._channels[json.id] = {
                chunk: null
            }
            this.outbox.push({
                method: 'announce',
                id: matched.id,
                body: json.body
            })
            break
        case 'chunk':
            assert(this._channels[json.id] != null)
            this._channels[json.id].chunk = {
                checksum: json.checksum,
                series: json.series,
                chunks: json.chunks,
                index: 0,
                buffers: []
            }
            break
        case 'exit':
            assert(this._channels[json.id] != null)
            assert(this._channels[json.id].chunk == null)
            delete this._channels[json.id]
            this.outbox.push({ method: 'exit', id: matched.id })
            break
        }
    } else {
        var chunk = this._chunks[matched.id]
        chunk.buffers.push(buffer)
        chunk.index++
        if (chunk.index == chunk.count) {
            this._chunks[matched.id].chunk = null
            var buffer = Buffer.concat(chunk.buffers)
            var checksum = fnv(0, buffer, 0, buffer.length)
            assert(checksum == matched.checksum)
            this.outbox.push({
                method: 'chunk',
                id: matched.id,
                series: matched.series,
                entries: JSON.parse(buffer.toString())
            })
        }
    }
}

// Because we only write chunks that are `PIPE_BUF` or smaller, we know that
// they will always be complete in the standard output stream. We cannot rely on
// them being on their own line however. They maybe be interpolated into then
// non-chunk standard output spew of another child process so that the headers
// do not start on a new line, rather they start in the middle of someone else's
// line. When this happens, we do know that they will be at the end of the line
// because they will be written entirely and thier newline character will break
// the line they've been dropped into. Thus, we can search for our headers at
// the end of each line in standard output where, for the most part,  the end of
// the line starts at the very beginning of the line.
//
// We write the stuff before the header to standard error. Again, this is going
// be an empty string more often than not.
//
// If we don't match we write the line followed by a newline character. If the
// last line of standard error didn't actually have a newline character it has
// one now, sorry.

//
Collector.prototype.read = cadence(function (async, stream) {
    var readable = new Staccato.Readable(byline(stream, { keepEmptyLines: true }))
    var matched = null
    async.loop([], function () {
        async(function () {
            readable.read(async())
        }, function (line) {
            if (line == null) {
               return [ async.break ]
            }
            if (matched) {
                line = line.toString()
                var $ = /^(.*)% (\d+\/\d+) ([0-9a-f]{8}) ([0-9a-f]{8}) ([10]) %\n$/i.exec(line)
                if ($) {
                    matched = {
                        line: line,
                        preceding: $[1],
                        id: $[2],
                        checksum: $[3],
                        previous: $[4],
                        header: $[5] == '1'
                    }
                    if (matched.checksum == this._checksum) {
                        state = 'gathering'
                        return [ async.continue ]
                    }
                }
                this._stderr.write(line + '\n')
                break
            } else {
                var checksum = fnv(0, line, 0, line.length)
                if (checksum == matched.checksum) {
                    this._stderr.write(matched.preceding)
                    this._chunk(chunk)
                } else {
                    this._stderr.write(matched.line + '\n')
                }
                matched = null
                break
            }
        })
    })
})

module.exports = Collector
