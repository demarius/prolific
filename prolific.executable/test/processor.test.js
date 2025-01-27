describe('processor', () => {
    const assert = require('assert')
    const path = require('path')
    const fs = require('fs').promises

    const sink = require('prolific.sink')

    const Destructible = require('destructible')

    const Processor = require('../processor')

    sink.Date = { now: () => 1 }
    sink.properties.pid = 2

    const configuration = {
        configuration: path.join(__dirname, 'configuration.initial.js'),
        reconfiguration: path.join(__dirname, 'configuration.subsequent.js'),
        source: path.join(__dirname, 'configuration.js')
    }

    it('can configure', async () => {
        const sink = require('prolific.sink')

        const destructible = new Destructible('configure')
        const gather = require('./gather')

        await fs.copyFile(configuration.configuration, configuration.source)

        const processor = new Processor(configuration.source)
        sink.json(0, 'prolific', 'label', {}, { pid: 1 })
        await processor.process([{
            when: 0,
            qualifier: 'qualifier',
            label: 'label',
            level: 'error',
            body: { url: '/' },
            system: { pid: 0 }
        }, {
            when: 0,
            qualifier: 'qualifier',
            label: 'label',
            level: 'info',
            body: { url: '/info' },
            system: { pid: 0 }
        }])
        const test = []
        destructible.durable('configure', processor.configure(), () => processor.destroy())
        await new Promise(resolve => {
            processor.once('configuration', configuration => {
                test.push(configuration)
                resolve()
            })
        })
        await processor.process([[{ method: 'version', version: 0 }], {
            when: 0,
            qualifier: 'qualifier',
            label: 'label',
            level: 'error',
            body: { url: '/after' },
            system: { pid: 0 }
        }])
        sink.json(0, 'prolific', 'label', {}, { pid: 1 })
        const reconfigured = new Promise(resolve => {
            processor.once('configuration', configuration => {
                test.push(configuration)
                resolve()
            })
        })
        fs.copyFile(configuration.reconfiguration, configuration.source)
        await reconfigured
        assert(!processor.destroyed, 'not destroyed')
        await processor.process([[{ method: 'exit' }]])
        assert(processor.destroyed, 'destroyed')
        assert.deepStrictEqual(test, [{
            version: 0,
            source: await fs.readFile(configuration.configuration, 'utf8'),
            file: configuration.source
        }, {
            version: 1,
            source: await fs.readFile(configuration.reconfiguration, 'utf8'),
            file: configuration.source
        }], 'configuration')
        assert.deepStrictEqual(gather, [{
            when: 0,
            qualifier: 'qualifier',
            qualified: 'qualifier#label',
            label: 'label',
            level: 'error',
            url: '/',
            pid: 0
        }, {
            when: 0,
            qualifier: 'qualifier',
            qualified: 'qualifier#label',
            label: 'label',
            level: 'error',
            url: '/after',
            pid: 0
        }, {
            label: 'label',
            level: 0,
            qualified: 'prolific#label',
            qualifier: 'prolific',
            when: 1,
            pid: 1
        }], 'gather')
    })
})
