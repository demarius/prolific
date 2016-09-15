/*
    ___ usage ___ en_US ___
    usage: prolific syslog <options>

        -a, --application <string>
            The application name to display in the syslog record. Defaults to
            the value of `process.title` which will always be `node`.

        -h, --hostname <string>
            The hostname to display in the syslog record. Defaults to the value
            of `require('os').hostname()`.

        -f, --facility <string>
            The syslog facility to encode in the syslog record. Defaults to `local0`.

        -p, --pid <string>
            The process id to display in the syslog record. Defaults to
            the value of `process.pid`.

        -s, --serializer <string>
            The type of serializer for the payload. Defaults to "json".

            --help                      display this message

    ___ $ ___ en_US ___

    ___ . ___
*/

require('arguable')(module, require('cadence')(function (async, program) {
    program.helpIf(program.ultimate.help)
    var argv = program.argv.slice(), terminal = program.terminal, labels = []
    if (argv.length) {
        while (argv.length && ~argv[0].indexOf('=')) {
            var $ = /^([^=]+)=(.*)$/.exec(argv.shift())
            labels.push({ name: $[1], value: $[2] })
        }
        if (terminal = argv[0] == '--') {
            argv.shift()
        }
    }
    return  {
        moduleName: 'prolific/label/label.processor',
        parameters: { labels: labels },
        argv: argv,
        terminal: terminal
    }
}))

module.exports.isProlific = true
