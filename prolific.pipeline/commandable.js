module.exports = function (terminal, argv) {
    if (terminal || argv[0] == 'node') {
        return null
    }
    var command = argv[0], url = null
    if (~command.indexOf(':')) {
        url = command
        command = command.split(':')[0]
    }
    var packages = command[0] == '@'
                 ? [ command.substring(1) ]
                 : [ 'prolific.' + command, 'prolific/' + command ]
    while (packages.length) {
        var pkg = packages.shift()
        try {
            var required = require(pkg)
            if (!required.isProlific) {
                continue
            }
            argv.shift()
            if (url != null) {
                argv.unshift('--url', url)
            }
            return required
        } catch (e) {
            continue
        }
    }
    return null
}
