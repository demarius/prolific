var logger = require('prolific.logger').createLogger('prolific')
var shuttle = require('prolific.shuttle').shuttle(process, logger)
    logger.info('foo', {})
process.send({})
process.stderr.write(JSON.stringify(process.env) + '\n')
setTimeout(function () {
    logger.warn('foo', {})
    logger.warn('bar', {})
    shuttle.close()
    logger.warn('baz', {})
}, 250)
