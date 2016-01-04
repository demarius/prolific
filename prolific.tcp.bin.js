/*
    ___ usage ___ en_US ___
    usage: node prolific.tcp.bin.js

        -l, --log       <string>        the udp address and port to send to
            --help                      display this message

    ___ $ ___ en_US ___

        udp is required:
            the `--udp` address and port is a required argument

        port is not an integer:
            the `--udp` port must be an integer

    ___ . ___
*/

var monitor = require('./monitor')
var Sender = require('./sender.tcp')
var children = require('child_process')

require('arguable')(module, require('cadence')(function (async, program) {
    program.helpIf(program.param.help)
    program.required('log')

    var send = program.param.log.split(':')
    var host = program.param.host = send[0]
    var port = program.param.port = +send[1]

    var sender = new Sender(host, port, program.stdout)

    program.env.PROLIFIC_LOGGING_FD = '3'

    var child = children.spawn(program.argv.shift(), program.argv, {
        stdio: [ 'ignore', 'inherit', 'pipe', 'pipe' ],
        detatched: true
    })

    program.on('SIGINT', function () {
        if (child) child.kill('SIGINT')
    })

    async(function () {
        monitor(sender, child, child.stdio[3], child.stderr, async())
    }, function (code, signal) {
        return [ code == null ? 1 : code ]
    })
}))
