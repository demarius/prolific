require('proof')(1, prove)

function prove (okay, callback) {
    var Destructible = require('destructible')
    var destructible = new Destructible('t/file.t')

    destructible.completed.wait(callback)

    var cadence = require('cadence')

    var path = require('path')

    var File = require('..')

    var file = path.join(__dirname, 'log')

    cadence(function (async) {
        async(function () {
            destructible.durable('file', File, { file: file }, async())
        }, function () {
        })
    })(destructible.durable('test'))
    return

    var path = require('path')
    var fs = require('fs')
    var file = path.join(__dirname, 'log')
    var Processor = require('../file.processor')
    new Processor({ file: file })
    var processor = new Processor({
        file: file, rotate: 8, pid: '0',
        Date: { now: function () { return 0 } }
    }, {
        process: function () {}
    })
    var resolved = path.join(__dirname, 'log-1970-01-01-00-00-0')
    async([function () {
       async.forEach(function (file) {
            async([function () {
                fs.unlink(file, async())
            }, /^ENOENT$/, function () {
            }])
        })([ resolved ])
    }], function () {
        processor.open(async())
    }, function () {
        processor.process({ json: { a: 1 } })
        processor.process({ json: { a: 1 } })
        setTimeout(async(), 250)
    }, function () {
        processor.process({ json: { a: 1 } })
        processor.close(async())
    }, function () {
        okay(fs.readFileSync(file + '-1970-01-01-00-00-0', 'utf8'),
            '{"a":1}\n{"a":1}\n{"a":1}\n', 'file')
    })
}
