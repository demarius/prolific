const coalesce = require('extant')
const descendent = require('foremost')('descendent')

const Evaluator = require('prolific.evaluator')
const Queue = require('prolific.queue')

const LEVEL = require('prolific.level')

const createUncaughtExceptionHandler = require('./uncaught')

const assert = require('assert')

class Shuttle {
    constructor () {
        this.closed = false
        this._initialized = false
        this._queue = null
    }

    start (options) {
        if (this._initialized) {
            return Promise.resolve()
        }
        this._initialized = true
        options || (options = {})
        if (descendent.process.env.PROLIFIC_SUPERVISOR_PROCESS_ID != null) {
            return this._listen(descendent, options)
        } else {
            this.closed = true
            return Promise.resolve()
        }
    }

    _listen (descendent, options) {
        const now = coalesce(options.Date, Date).now()
        const monitorProcessId = +descendent.process.env.PROLIFIC_SUPERVISOR_PROCESS_ID

        descendent.increment()

        const id = [ descendent.process.pid, now ]
        const path = descendent.path.splice(descendent.path.indexOf(monitorProcessId))

        const queue = new Queue(512, id, descendent.process.stderr, { path: path })
        const send = queue.send()
        this._queue = queue

        // TODO Unhandled rejection.
        if (options.uncaughtException != null) {
            const handler = createUncaughtExceptionHandler(options.uncaughtException)
            descendent.process.on('uncaughtException', (error) => {
                this.close()
                handler(error)
                queue.exit()
                throw error
            })
        }

        if (options.exit == null || options.exit) {
            descendent.process.on('exit', () => {
                this.close()
                queue.exit()
            })
        }

        // All filtering will be performed by the monitor initially. Until
        // we get a configuration we send everything.
        const sink = require('prolific.resolver').sink
        sink.json = function (level, qualifier, label, body, system) {
            queue.push({
                when: this.Date.now(),
                level: level,
                qualifier: qualifier,
                label: label,
                body: body,
                system: system
            })
        }

        this._handlers = { pipe: null, accept: null }

        descendent.once('prolific:pipe', this._handlers.pipe = function (message, handle) {
            queue.setPipe(handle)
        })
        descendent.on('prolific:accept', this._handlers.accept = function (message) {
            assert(message.body.source)
            const processor = Evaluator.create(message.body.source, message.body.file)
            assert(processor.triage)
            const triage = processor.triage(require('prolific.require').require)
            sink.json = function (level, qualifier, label, body, system) {
                if (triage(LEVEL[level], qualifier, label, body, system)) {
                    queue.push(Object.assign({
                        when: body.when || this.Date.now(),
                        level: level,
                        qualifier: qualifier,
                        label: label,
                        qualified: qualifier + '#' + label
                    }, system, body))
                }
            }
            queue.push([{ method: 'version', version: message.body.version }])
        })

        descendent.up(monitorProcessId, 'prolific:shuttle', id.join('/'))

        return send
    }

    close () {
        if (!this.closed) {
            this.closed = true
            descendent.removeListener('prolific:pipe', this._handlers.pipe)
            descendent.removeListener('prolific:accept', this._handlers.accept)
            descendent.decrement()
            this._queue.close()
        }
    }
}

Shuttle.sink = require('prolific.sink')

module.exports = Shuttle
