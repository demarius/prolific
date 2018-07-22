var cadence = require('cadence')
var fs = require('fs')
var deepEqual = require('deep-equal')

module.exports = cadence(function (async, filename, previous) {
    async([function () {
        fs.readFile(filename, 'utf8', async())
    }, function (error) {
        console.log(error.stack)
        return [ async.break, true ]
    }], function (current) {
        try {
            return ! deepEqual(JSON.parse(current),  previous)
        } catch (error) {
            return false
        }
    })
})
