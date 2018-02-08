var spaceParsedData
var globalScope = {}

const parseBool = function (data) {
  if (data.startsWith('#t')) {
    return [true, data.slice(2)]
  } else if (data.startsWith('#f')) {
    return [false, data.slice(2)]
  }
  return null
}

const parseSpace = function (data) {
  return (((/^(\s)*/).test(data)) ? ([' ', data.replace(/^(\s)*/, '')]) : null)
}

const parseNumber = function (data) {
  data = ((spaceParsedData = parseSpace(data)) == null) ? data : spaceParsedData[1]
  var match = data.match(/[+-]?\d*\.?\d+(?:[Ee][+-]?\d+)?/)
  if (match != null && match[0] !== -1) {
    if (match.index !== 0) return null
    data = data.slice(match[0].length)
    return [parseFloat(match[0]), data]
  }
  return null
}

const parseString = function (data) {
  data = ((spaceParsedData = parseSpace(data)) == null) ? data : spaceParsedData[1]
  var match = data.match(/.[^)\s]*/)
  if (match != null && match[0] !== -1) {
    if (match.index !== 0) return null
    data = data.slice(match[0].length)
    data = ((spaceParsedData = parseSpace(data)) == null) ? data : spaceParsedData[1]
    return [match[0], data]
  }
}

const parseOperator = function (data) {
  var match = data.match(/.[^\s]*/)
  return [match[0], data.slice(match[0].length)]
}

const parseDefine = function (data) {
  if (!data.slice(1).startsWith('define')) {
    return null
  }
  let variable, value
  let obj = {}
  data = ((spaceParsedData = parseSpace(data.slice(7))) == null) ? data.slice(7) : spaceParsedData[1]
  variable = parseExpression(data)
  if (variable == null) {
    return null
  }
  data = ((spaceParsedData = parseSpace(variable[1])) == null) ? variable[1] : spaceParsedData[1]
  value = parseExpression(data)
  if (value != null) {
    obj[variable[0]] = value[0]
  } else {
    obj[variable[0]] = ''
  }
  return [obj, value[1]]
}

const parseIf = function (data) {
  let test, conseq, alt, result
  if (!data.slice(1).startsWith('if')) {
    return null
  }
  data = ((spaceParsedData = parseSpace(data.slice(3))) == null) ? data.slice(3) : spaceParsedData[1]
  test = parseExpression(data)
  data = ((spaceParsedData = parseSpace(test[1])) == null) ? test[1] : spaceParsedData[1]
  conseq = parseExpression(data)
  data = ((spaceParsedData = parseSpace(conseq[1])) == null) ? conseq[1] : spaceParsedData[1]
  alt = parseExpression(data)
  data = ((spaceParsedData = parseSpace(alt[1])) == null) ? alt[1] : spaceParsedData[1]
  result = test[0] ? conseq[0] : alt[0]
  return [result, data.slice(1)]
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

const parseSExpression = function (data) {
  if (!data.startsWith('(')) {
    return null
  }
  var args = []
  let result = parseSplExp(data)
  if (result !== null) {
    return result
  }
  data = ((spaceParsedData = parseSpace(data.slice(1))) == null) ? data.slice(1) : spaceParsedData[1]
  while (!data.startsWith(')')) {
    var element = parseExpression(data)
    if (element == null) {
      throw new Error('enough arguments not found')
    } else {
      args.push(element[0])
    }
    data = ((spaceParsedData = parseSpace(element[1])) == null) ? element[1] : spaceParsedData[1]
  }
  result = evalFunction(sExpressionEnvt, args)
  return [result, data.slice(1)]
}

const findLamdaArgs = function (data) {
  data = ((spaceParsedData = parseSpace(data)) == null) ? data : spaceParsedData[1]
  let element
  let args = []
  if (data.startsWith('(')) {
    data = data.slice(1)
    while (!data.startsWith(')')) {
      element = parseString(data)
      if (element !== null) {
        args.push(element[0])
        data = element[1]
      }
    }
    data = ((spaceParsedData = parseSpace(data.slice(1))) == null) ? data.slice(1) : spaceParsedData[1]
  } else {
    element = parseString(data)
    args.push(element[0])
    data = ((spaceParsedData = parseSpace(element[1])) == null) ? element[1] : spaceParsedData[1]
  }
  return [args, data]
}

const findLamdaBody = function (data) {
  data = ((spaceParsedData = parseSpace(data)) == null) ? data : spaceParsedData[1]
  let body = '', brakets = 0, index = 0
  if (data.startsWith('(')) {
    do {
      if (data[index] === '(') brakets++
      if (data[index] === ')') brakets--
      index++
    } while (brakets !== 0)
    body = data.substring(0, index)
    data = ((spaceParsedData = parseSpace(data.slice(index))) == null) ? data.slice(index) : spaceParsedData[1]
    return [body, data]
  } else {
    let temp = parseString(data)
    body = temp[0]
    data = temp[1]
    return [body, data]
  }
}

const findLambdaParameters = function (data) {
  data = ((spaceParsedData = parseSpace(data)) == null) ? data : spaceParsedData[1]
  let element
  let args = []
  while (!data.startsWith(')')) {
    element = parseNumber(data)
    if (element !== null) {
      args.push(element[0])
      data = element[1]
    }
  }
  data = ((spaceParsedData = parseSpace(data.slice(1))) == null) ? data.slice(1) : spaceParsedData[1]
  return [args, data]
}

const parseLambda = function (data) {
  if (!data.slice(1).startsWith('lambda')) {
    return null
  }
  let lambdaFunction = {}
  let temp
  data = data.slice(8)
  temp = findLamdaArgs(data)
  lambdaFunction.attributes = temp[0]
  data = temp[1]
  temp = findLamdaBody(data)
  lambdaFunction.body = temp[0]
  data = temp[1]
  if (!data.startsWith(')')) {
    temp = findLambdaParameters(data)
    lambdaFunction.parameters = temp[0]
    data = temp[1]
  }
  console.log('lambdaFunction', lambdaFunction)
  return 0
}

const parseExpression = parsersFactory(parseSExpression, parseNumber, parseBool, parseOperator, parseString)

const parseSplExp = parsersFactory(parseIf, parseDefine, parseLambda)

const evalFunction = function (envt, args) {
  return envt[args[0]](args.slice(1))
}

const interpretLisp = function (input) {
  console.log(input)
  while (input != null && input.startsWith('(')) {
    let result = parseSplExp(input)
    if (result != null) {
      console.log('   Result:', result[0])
      input = result[1]
      continue
    }
    result = parseExpression(input)
    if (result != null) {
      console.log('   Result:', result[0])
      input = result[1]
      continue
    }
  }
}
console.log("===============================================================");
// interpretLisp("(+ 2 3 5)")
// interpretLisp("(- 4 3 1)")
// interpretLisp("(* 2 3 2)")
// interpretLisp("(/ 4 2 2)")
// interpretLisp("(> 4 2)")
// interpretLisp("(< 4 2)")
// interpretLisp("(>= 4 4)")
// interpretLisp("(<= 3 4)")
// interpretLisp("(max 1 2 3 4 5)")
// interpretLisp("(min 1 2 3 4 5)")
// console.log("===============================================================");
// interpretLisp("(if (> 10 20) (+ 1 1) (+ 3 3))")
// interpretLisp("(if (> 10 20) (+ 1 1) (+ 3 3))(if (< 10 20) (+ 1 1) (+ 3 3))")
// interpretLisp("(if (< 1 2) (if (> 2 1) (+ 1 2 3 4) (+ 3 3)) (+ 3 3))")
interpretLisp("(if (< 1 2) (if (< 2 1) (+ 1 1) (+ 3 3)) (+ 4 4))")
// interpretLisp("(if (> 1 2) (if (< 2 1) (+ 1 1) (+ 3 3)) (+ 4 4))")
// interpretLisp("(if (> 1 2) (if (< 2 1) (+ 1 1) (+ 3 3)) (max 9 4))")
// interpretLisp("(if (<= 1 2) (if (>= 2 1) (min 7 0) (+ 3 3)) (max 9 4))")
// console.log("===============================================================");
// interpretLisp("(define r 3)")
// interpretLisp("(if #f 3 4
interpretLisp("(lambda x x)")
interpretLisp("(lambda (x y) (+ x y)1 2)")
