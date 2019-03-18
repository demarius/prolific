var cadence = require('cadence')
var Staccato = require('staccato')
var byline = require('byline')

module.exports = function (completed) {
    return cadence(function (async, stdin, consumer) {
        var readable = new Staccato.Readable(byline(stdin))
        async.loop([], function () {
            readable.read(async())
        }, function (chunk) {
            if (chunk == null) {
                console.log('STDIN CLOSED', process.pid)
                consumer.exit()
                return [ async.break ]
            }
            var json = JSON.parse(chunk.toString())
            console.log('MONITOR STDIN', process.pid, consumer.exited, json)
            consumer.push(json)
        })
    })
}
