var spaceParsedData

const parseSpace = function (data) {
  return (((/^(\s)*/).test(data)) ? ([' ', data.replace(/^(\s)*/, '')]) : null)
}

const parseNumber = function (data) {
  var match = data.match(/[+-]?\d*\.?\d+(?:[Ee][+-]?\d+)?/)
  if (match != null && match[0] !== -1) {
    if (match.index !== 0) return null
    data = data.slice(match[0].length)
    return [parseFloat(match[0]), data]
  }
  return null
}

const parseString = function (data) {
  var match = data.match(/.[a-zA-Z][0-9][^\s]*/)
  if (match != null && match[0] !== -1) {
    if (match.index !== 0) return null
    data = data.slice(match[0].length)
    console.log('match in parseString :' + match[0])
    return [match[0], data]
  }
}

const parseOperator = function (data) {
  var match = data.match(/.[^\s]*/)
  return [match[0], data.slice(match[0].length)]
}

const parseIf = function (data) {
  let test, conseq, alt, result
  if (!data.slice(1).startsWith('if')) {
    return null
  }
  data = ((spaceParsedData = parseSpace(data.slice(3))) == null) ? data.slice(3) : spaceParsedData[1]
  test = parseSExpression(data)
  data = ((spaceParsedData = parseSpace(test[1])) == null) ? test[1] : spaceParsedData[1]
  conseq = parseSExpression(data)
  data = ((spaceParsedData = parseSpace(conseq[1])) == null) ? conseq[1] : spaceParsedData[1]
  alt = parseSExpression(data)
  result = test ? conseq[0] : alt[0]
  return [result, alt[1]]
}

const parseDefine = function (data) {
  if (!data.slice(1).startsWith('define')) {
    return null
  }
  let variable, value
  let obj = {}
  data = ((spaceParsedData = parseSpace(data.slice(7))) == null) ? data.slice(7) : spaceParsedData[1]
  variable = parseValue(data)
  if (variable == null) {
    return null
  }
  data = ((spaceParsedData = parseSpace(variable[1])) == null) ? variable[1] : spaceParsedData[1]
  value = parseValue(data)
  if (value != null) {
    obj[variable[0]] = value[0]
  } else {
    obj[variable[0]] = ''
  }
  return [obj, value[1]]
}

const parsersFactory = function (...parsers) {
  return function (data) {
    for (let p = 0; p < parsers.length; p++) {
      let ele = parsers[p](data)
      if (ele !== null) {
        return ele
      }
    }
    return null
  }
}

const sExpressionEnvt = {
  '+': (args) => args.reduce((result, value) => parseFloat(result + value)),
  '-': (args) => args.reduce((result, value) => parseFloat(result - value)),
  '*': (args) => args.reduce((result, value) => parseFloat(result * value)),
  '/': (args) => args.reduce((result, value) => parseFloat(result / value)),
  '=': (args) => args[0] === args[1],
  '>': (args) => args[0] > args[1],
  '<': (args) => args[0] < args[1],
  '>=': (args) => args[0] >= args[1],
  '<=': (args) => args[0] <= args[1],
  'max': (args) => args.reduce((result, value) => Math.max(result, value)),
  'min': (args) => args.reduce((result, value) => Math.min(result, value))
}

const parseValue = parsersFactory(parseNumber, parseOperator, parseString)
const parseSplExp = parsersFactory(parseIf, parseDefine)
const evalFunction = function (envt, args) {
  return envt[args[0]](args.slice(1))
}
const parseSExpression = function (data) {
  if (!data.startsWith('(')) {
    return null
  }
  var args = []
  data = ((spaceParsedData = parseSpace(data.slice(1))) == null) ? data.slice(1) : spaceParsedData[1]
  while (!data.startsWith(')')) {
    var element = parseValue(data)
    if (element == null) {
      throw new Error('enough arguments not found')
    } else {
      args.push(element[0])
    }
    data = ((spaceParsedData = parseSpace(element[1])) == null) ? element[1] : spaceParsedData[1]
  }
  let result = evalFunction(sExpressionEnvt, args)
  return [result, data.slice(1)]
}

const interpretLisp = function (input) {
  let result = parseSplExp(input)
  if (result != null) {
    return result
  }
  result = parseSExpression(input)
  if (result != null) {
    return result
  }
}
console.log("(+ 2 3 5) = "+interpretLisp("(+ 2 3 5)"))
console.log("(- 4 3 1) = "+interpretLisp("(- 4 3 1)"))
console.log("(* 2 3 2) = "+interpretLisp("(* 2 3 2)"))
console.log("(/ 4 2 2) = "+interpretLisp("(/ 4 2 2)"))
console.log("(> 4 2) = "+interpretLisp("(> 4 2)"))
console.log("(< 4 2) = "+interpretLisp("(< 4 2)"))
console.log("(>= 4 4) = "+interpretLisp("(>= 4 4)"))
console.log("(<= 3 4) = "+interpretLisp("(<= 3 4)"))
console.log("(max 1 2 3 4 5) = "+interpretLisp("(max 1 2 3 4 5)"))
console.log("(min 1 2 3 4 5) = "+interpretLisp("(min 1 2 3 4 5)"))
console.log("-------------------------");
console.log("(if (> 10 20) (+ 1 1) (+ 3 3)) = "+interpretLisp("(if (> 10 20) (+ 1 1) (+ 3 3))"))
console.log("(define r 3) = "+interpretLisp("(define r 3)"))