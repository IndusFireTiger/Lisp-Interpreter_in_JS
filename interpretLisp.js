var spaceParsedData
var globalScope = {}

const parseBool = function (data) {
  data = ((spaceParsedData = parseSpace(data)) == null) ? data : spaceParsedData[1]
  if (data.startsWith('(')) {
    if (data.slice(1).startsWith('#')) {
      throw new Error('#t is not a function')
    }
  }
  if (data.startsWith('#t')) {
    return [true, data.slice(3)]
  } else if (data.startsWith('#f')) {
    return [false, data.slice(3)]
  }
  return null
}

const getLispBool = function (val) {
  if (typeof val === typeof true) {
    if (val === true) {
      return '#t'
    } else if (val === false) {
      return '#f'
    }
  }
  return val
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
    return [parseInt(match[0]), data]
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
  var match = data.match(/['=+\-*/<>]+/)
  if (match != null && match[0] !== -1) {
    return [match[0], data.slice(match[0].length)]
  }
  return null
}

const parseDefine = function (data) {
  if (!data.slice(1).startsWith('define')) {
    return null
  }
  let variable, value
  data = ((spaceParsedData = parseSpace(data.slice(7))) == null) ? data.slice(7) : spaceParsedData[1]
  variable = parseString(data)
  if (variable == null) {
    return null
  }
  data = ((spaceParsedData = parseSpace(variable[1])) == null) ? variable[1] : spaceParsedData[1]
  // parse definition of a lambda expression
  value = parseLambda(data)
  if (value !== null) {
    globalScope[variable[0]] = value[0]
    return ['define successfully and added to global scope', value[1].slice(2)]
  }
  // parse a simple variable
  value = parseExpression(data)
  if (value !== null) {
    globalScope[variable[0]] = value[0]
  } else {
    globalScope[variable[0]] = ''
  }
  return [globalScope, value[1].slice(1)]
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
  '+': args => args.reduce((result, value) => result + value),
  '-': (args) => args.reduce((result, value) => result - value),
  '*': (args) => args.reduce((result, value) => result * value),
  '/': (args) => args.reduce((result, value) => result / value),
  '=': (args) => args.reduce((result, value) => result === value),
  '>': args => args.reduce((a, b) => a > b),
  '<': (args) => args.reduce((a, b) => a < b),
  '>=': (args) => args.reduce((result, value) => result >= value),
  '<=': (args) => args.reduce((result, value) => result <= value),
  'max': (args) => args.reduce((result, value) => Math.max(result, value)),
  'min': (args) => args.reduce((result, value) => Math.min(result, value)),
  'print': (args) => {
    let out = ''
    args.forEach(function (elem) {
      if (globalScope.hasOwnProperty(elem)) {
        out += globalScope[elem]
      } else {
        if (!isNaN(elem)) { // is a number then append
          out += elem
        } else {
          // throw error
        }
      }
    })
    return out
  }
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
  result = evaluateFunction(sExpressionEnvt, args)
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
  let body = ''
  let brakets = 0
  let index = 0
  if (data.startsWith('(') || data.startsWith('((')) {
    do {
      if (data[index] === '(') brakets++
      if (data[index] === ')') brakets--
      index++
    } while (brakets !== 0)
    body = data.substring(0, index)
    data = ((spaceParsedData = parseSpace(data.slice(index))) == null) ? data.slice(index) : spaceParsedData[1]
    return [body, data]
  }
  return null
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
  return [args, data]
}

const parseLambda = function (data, parent) {
  if (!data.slice(1).startsWith('lambda') && !data.slice(2).startsWith('lambda')) {
    return null
  }
  let lambdaFunction = {}
  let temp, result
  if (parent !== null) {
    lambdaFunction.parentEnvt = parent
  }
  data = data.slice(8)
  temp = findLamdaArgs(data)
  lambdaFunction.attributes = temp[0]
  data = temp[1]
  temp = findLamdaBody(data)
  lambdaFunction.body = temp[0]
  data = temp[1]
  temp = findLambdaParameters(data)
  lambdaFunction.parameters = temp[0]
  data = temp[1]
  if (lambdaFunction.parameters.length > 0) {
    let lambdaEnvt = {}
    let i = 0
    if (lambdaFunction.attributes.length !== lambdaFunction.parameters.length) {
      throw new Error('insufficient arguments')
    }
    lambdaFunction.attributes.forEach((item) => {
      if (lambdaFunction.parameters[i] !== undefined) {
        lambdaEnvt[item] = lambdaFunction.parameters[i]
      }
      i++
    })
    lambdaFunction.LocalEnvt = lambdaEnvt
  }
  if ((lambdaFunction.body.search(/lambda/) > -1)) {
    let innerLambda = parseLambda(lambdaFunction.body, lambdaFunction)
    return [innerLambda[0], data.slice(1)]
  } else {
    if (lambdaFunction.parameters !== null && lambdaFunction.parameters.length > 0) {
      result = evaluateProcedure(lambdaFunction, lambdaFunction.parameters)
      return [result, data.slice(1)]
    } else if (lambdaFunction.parentEnvt) {
      if (lambdaFunction.parentEnvt.parameters.length > 0) {
        result = evaluateProcedure(lambdaFunction, [])
        return [result, data.slice(1)]
      }
    } else {
      return [lambdaFunction, data]
    }
  }
}

const parseExpression = parsersFactory(parseBool, parseNumber, parseSExpression, parseOperator, parseString)

const parseSplExp = parsersFactory(parseIf, parseDefine, parseLambda)

const evaluateFunction = function (envt, args) {
  if (envt.hasOwnProperty([args[0]])) {
    return envt[args[0]](args.slice(1))
  }
  if (globalScope.hasOwnProperty([args[0]])) {
    return evaluateProcedure(globalScope[args[0]], args.slice(1))
  }
}

const getValue = function (lambdaObj, attri) {
  while (lambdaObj !== undefined) {
    if (lambdaObj.LocalEnvt !== undefined && lambdaObj.LocalEnvt.hasOwnProperty(attri)) {
      return lambdaObj.LocalEnvt[attri]
    }
    lambdaObj = lambdaObj.parentEnvt
  }

  if (globalScope.hasOwnProperty(attri)) {
    if ((typeof globalScope[attri] === 'object') && !globalScope[attri].body.startsWith('(')) {
      return globalScope[attri]
    } else if (!(typeof globalScope[attri] === 'object')) {
      return globalScope[attri]
    } else {
      return null
    }
  } else {
    return null
  }
}
const findVariables = function (body) {
  let reg = /[a-zA-Z]+/
  let vars = []
  let match
  do {
    match = body.match(reg)
    if (match !== null) {
      vars.push(match[0])
      body = body.slice(body.indexOf(match) + match[0].length)
    }
  } while (match !== null)
  return vars
}

const evaluateProcedure = function (lambdaObject, parameters) {
  let VolatileEnvt = {}
  if (lambdaObject.LocalEnvt === undefined && parameters.length > 0) {
    let i = 0
    lambdaObject.attributes.forEach((item) => {
      if (parameters[i] !== undefined) {
        VolatileEnvt[item] = parameters[i]
      }
      i++
    })
  }
  let lambdaBody = lambdaObject.body
  let vars = findVariables(lambdaBody)
  let value
  for (let prop in vars) {
    var reg = new RegExp(vars[prop], 'g')
    if (VolatileEnvt.hasOwnProperty(vars[prop])) {
      value = VolatileEnvt[vars[prop]]
    } else {
      value = getValue(lambdaObject, vars[prop])
    }
    if (value !== null) {
      lambdaBody = lambdaBody.replace(reg, value)
    }
  }
  let result = parseSplExp(lambdaBody)
  if (result == null) {
    result = parseExpression(lambdaBody)
  }
  if (result == null || result[0] == null) {
    return null
  }
  return result[0]
}

const interpretLispExp = function (input) {
  while (input != null && input.startsWith('(')) {
    let result = parseSplExp(input)
    if (result != null) {
      console.log(getLispBool(result[0]) + '\n')
      input = ((spaceParsedData = parseSpace(result[1])) == null) ? result[1] : spaceParsedData[1]
      continue
    }
    result = parseExpression(input)
    if (result != null) {
      console.log(getLispBool(result[0]) + '\n')
      input = ((spaceParsedData = parseSpace(result[1])) == null) ? result[1] : spaceParsedData[1]
      continue
    }
  }
}

exports.lispy = interpretLispExp
