const code = require('./interpretLisp.js')

let myRepl = require('repl')

myRepl.start({
  prompt: '>> ',
  ignoreUndefined: true,
  'eval': function (cmd, context, filename, callback) {
    callback(null, code.lispy(cmd))
  }
})
