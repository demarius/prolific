var assert = require('assert')
var cadence = require('cadence')

function Pipeline (pipeline) {
    var nextProcessor = {
        process: function () {}
    }
    this.processors = pipeline.slice().reverse().map(function (processor) {
        var Processor = require(processor.module)
        assert(Processor.isProlificProcessor, 'not a processor')
        return nextProcessor = new Processor(processor, nextProcessor)
    }).reverse()
    this._opened = []
}

Pipeline.prototype.open = cadence(function (async) {
    async.forEach(function (processor) {
        async(function () {
            processor.open(async())
        }, function () {
            this._opened.push(processor)
        })
    })(this.processors)
})

Pipeline.prototype.close = cadence(function (async) {
    async.forEach(function (processor) {
        processor.close(async())
    })(this._opened)
})

module.exports = Pipeline
