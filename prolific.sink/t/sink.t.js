require('proof/redux')(6, prove)

function prove (assert) {
    var prolific = require('..')
    prolific.Date = { now: function () { return 0 } }
    prolific.sink.write()
    prolific.sink = {
        write: function (line) {
            assert(JSON.parse(line.toString()), {
                when: 0,
                sequence: 0,
                level: 'error',
                name: 'greeting',
                qualifier: 'hello',
                qualified: 'hello#greeting',
                z: 26,
                a: 1
            }, 'json')
        }
    }
    prolific.properties = { z: 26, when: 0 }
    prolific.json([ '', 'hello' ], 'error', 'hello', 'greeting', { a: 1, when: 0 })
    prolific.sink = {
        write: function () { throw new Error }
    }
    prolific.json([ '', 'hello' ], 'trace', 'hello', 'greeting', { a: 1 })
    prolific.setLevel('hello.world', 'trace')
    assert(prolific.getLevel('hello'), 'info', 'get default')
    assert(prolific.getLevel('hello.world'), 'trace', 'get')
    prolific.setLevel('debug')
    assert(prolific.getLevel('hello'), 'debug', 'set default')
    prolific.clearLevel('hello.world')
    assert(prolific.getLevel('hello.world'), 'debug', 'clear')
    prolific.clearLevel()
    assert(prolific.getLevel('hello.world'), 'info', 'clear default')

    console.log(prolific.filename)
}