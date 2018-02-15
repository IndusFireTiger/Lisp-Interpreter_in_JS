const source = require('./interpretLisp.js')
var file = process.argv[2]
var fs = require('fs')
fs.readFile(file, 'utf-8', function read (error, InputStr) {
  if (error) throw error
  source.lispy(InputStr)
})
