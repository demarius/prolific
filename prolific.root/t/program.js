var logger = require('prolific.logger').createLogger('prolific')
var shuttle = require('prolific.shuttle').shuttle(process, logger)
if (process.send) {
    process.send({})
}
process.stderr.write(JSON.stringify(process.env) + '\n')
logger.info('hello', {})
setTimeout(function () { shuttle.close() }, 250)
