const { ReportBase } = require('istanbul-lib-report')

class InMemoryReport extends ReportBase {
  constructor (opt) {
    super(opt)
    this.opt = opt
  }

  onStart () {
    this.data = {}
  }

  onDetail (node) {
    const fc = node.getFileCoverage()
    const key = fc.path
    this.data[key] = fc.toJSON()
  }

  onEnd () {
    if (!this.opt || !this.opt.emitter || !this.opt.emitter.emit) {
      console.error('Could not raise "coverage_complete" event, missing emitter because it was not supplied during initialization of the reporter')
      return
    }
    this.opt.emitter.emit('coverage_complete', this.opt.browser, this.data)
  }
}
InMemoryReport.TYPE = 'in-memory'

module.exports = InMemoryReport
