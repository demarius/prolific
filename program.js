var prolific = require('./prolific')
var logger = prolific.createLogger('bigeasy.prolific.program')
var Shuttle = require('./shuttle')
var abend = require('abend')

var shuttle = new Shuttle(process, 3, 2500)
process.on('beforeExit', function () { logger.info('goodbye') })
prolific.sink = shuttle.queue
shuttle.run(abend)

var interval = setInterval(function () {
    logger.info('hello', { target: 'world' })
}, 1000)

process.on('SIGINT', function () {
    clearInterval(interval)
})
