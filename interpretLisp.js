var spaceParsedData
var globalScope = {}
var file = process.argv[2]
var fs = require('fs')
fs.readFile(file, 'utf-8', function read (error, InputStr) {
  if (error) throw error
  interpretLisp(InputStr)
})
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
  var match = data.match(/['=+\-*\/\<\>]+/)
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
  // parse a define of a lambda expression
  value = parseLambda(data)
  if (value !== null) {
    globalScope[variable[0]] = value[0]
    return ['parsed lambda define successfully and added to global scope', value[1].slice(2)]
  }
  // parse a simple a variable
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
  '+': (args) => args.reduce((result, value) => result + value),
  '-': (args) => args.reduce((result, value) => result - value),
  '*': (args) => args.reduce((result, value) => result * value),
  '/': (args) => args.reduce((result, value) => result / value),
  '=': (args) => args[0] === args[1],
  '>': (args) => args[0] > args[1],
  '<': (args) => args[0] < args[1],
  '>=': (args) => args[0] >= args[1],
  '<=': (args) => args[0] <= args[1],
  'max': (args) => args.reduce((result, value) => Math.max(result, value)),
  'min': (args) => args.reduce((result, value) => Math.min(result, value)),
  'print': (args) => console.log(args)
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
  // console.log('   before returning null daat:'+data);
  return null
}

const findLambdaParameters = function (data) {
  data = ((spaceParsedData = parseSpace(data)) == null) ? data : spaceParsedData[1]
  let element, innerLambda
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
  if(parent !== null){
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
    // console.log('   need to evaluate with parameters =' + lambdaFunction.parameters)
    let lambdaEnvt = {}
    let i = 0
    lambdaFunction.attributes.forEach((item) => {
      if (lambdaFunction.parameters[i] !== undefined) {
        lambdaEnvt[item] = lambdaFunction.parameters[i]
      }
      i++
    })
    lambdaFunction.LocalEnvt = lambdaEnvt
    // console.log('   lambdaFunction:', lambdaFunction, '\n')
  }
  // console.log('   has lambda: '+(lambdaFunction.body.search(/lambda/)>-1))
  if ((lambdaFunction.body.search(/lambda/)>-1)) {
    // console.log('   sending parent attributes: '+ lambdaFunction.attributes);
    innerLambda = parseLambda(lambdaFunction.body, lambdaFunction)
    return [innerLambda, data.slice(1)]
  }else {
    // console.log('   lambdaFunction.parameters:'+lambdaFunction.parameters)
    if(lambdaFunction.parameters !== null && lambdaFunction.parameters.length > 0){
      result = evaluateProcedure(lambdaFunction, lambdaFunction.parameters)
      // console.log('   returning/a :'+ [result, data.slice(1)]);
      return [result, data.slice(1)]
    } else if((lambdaFunction.parentEnvt !== null && lambdaFunction.parentEnvt !== undefined) && lambdaFunction.parentEnvt.parameters.length > 0){
      result = evaluateProcedure(lambdaFunction, [])
      return [result, data.slice(1)]
    }else {
      // console.log('   returning/b :'+ [lambdaFunction.body, data.slice(1)]);
      return [lambdaFunction, data]
    }
  }
  if (lambdaFunction.hasOwnProperty('parentEnvt') && lambdaFunction.parentEnvt !== undefined){
    return lambdaFunction
  }
  return [result, data.slice(1)]
}

const parseExpression = parsersFactory(parseSExpression, parseNumber, parseBool, parseOperator, parseString)

const parseSplExp = parsersFactory(parseIf, parseDefine, parseLambda)

const evaluateFunction = function (envt, args) {
  // console.log('   evaluating/ : '+args);

  if (envt.hasOwnProperty([args[0]])) {
    return envt[args[0]](args.slice(1))
  }
  if (globalScope.hasOwnProperty([args[0]])) {
    // console.log('   globalScope[args[0]]/ : ' + globalScope[args[0]]);

    return evaluateProcedure(globalScope[args[0]], args.slice(1))
  }
}

const getValue = function ( lambdaObj, attri) {
  // console.log('   searching attri: '+attri);
  let level = 0
  let found = false
  while (lambdaObj !== undefined) {
    if (lambdaObj.LocalEnvt !== undefined && lambdaObj.LocalEnvt.hasOwnProperty(attri)) {
      // console.log('   found value in the level : ' + level)
      // console.log('   value: ' + lambdaObj.LocalEnvt[attri])
      return lambdaObj.LocalEnvt[attri]
    }
    lambdaObj = lambdaObj.parentEnvt
    level++
  }

  if (globalScope.hasOwnProperty(attri)) {
    // console.log('   found value in globalScope');
    //   console.log('   typeof globalScope[attri]: == object'+(typeof globalScope[attri]==='object'));
    if((typeof globalScope[attri]==='object') && !globalScope[attri].body.startsWith('(')){
      return globalScope[attri]
    } else if (!(typeof globalScope[attri]==='object')) {
      return globalScope[attri]
    }else {
      // console.log('   its a function')
      return null
    }
  } else {
    // console.log('   value NOT FOUND')
    return null
  }
}
const findVariables = function (body){
  let reg = /[a-zA-Z]+/
  let vars = []
  let match
  do{
    match = body.match(reg)
    if(match !== null){
      vars.push(match[0])
      body = body.slice(body.indexOf(match)+match[0].length)
    }
  } while (match !== null)

  // console.log('  all vars : '+vars)
  return vars
}
const evaluateProcedure = function (lambdaObject, parameters) {
  // console.log('   in evaluateProcedure:' + lambdaObject.body)
  // console.log('   in lambdaObject.attributes:' + lambdaObject.attributes)
  // console.log('   in lambdaObject.LocalEnvt:' + lambdaObject.LocalEnvt)
  // console.log('   passed params:'+parameters);
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
  let i = 0
  let substitutions = 0, value
  let vars = findVariables(lambdaBody)
  // console.log(' for vars:'+vars);
  for (let prop in vars) {
    // console.log(' prop: '+vars[prop]);
    var reg = new RegExp(vars[prop], 'g')
    if (VolatileEnvt.hasOwnProperty(vars[prop])) {
      value = VolatileEnvt[vars[prop]]
    } else {
      value = getValue(lambdaObject, vars[prop])
    }
    if(value !== null){
      lambdaBody = lambdaBody.replace(reg, value)
    }
  }
  console.log('   lambdaBody after substitution', lambdaBody);
  let result = parseSplExp(lambdaBody)
  // console.log('   result of parseSplExp', result);
  if (result == null) {
    // console.log('   trying parseExpression with exp:' + lambdaBody);
    result = parseExpression(lambdaBody)
  }
  // console.log('   result of parseExpression', result);
  if (result == null || result[0] == null) {
    return null
  }
  return result
}

const interpretLisp = function (input) {
  console.log('================================================================================\n')
  console.log('INPUT STRING:' + input + '\n')
  let count = 1
  while (input != null && input.startsWith('(')) {
    console.log(count)
    console.log(input);
    count++
    let result = parseSplExp(input)
    if (result != null) {
      console.log('\n RESULT:', result[0])
      input = ((spaceParsedData = parseSpace(result[1])) == null) ? result[1] : spaceParsedData[1]

      console.log(input[0])
      continue
    }
    result = parseExpression(input)
    if (result != null) {
      console.log('\n RESULT:', result[0])
      input = ((spaceParsedData = parseSpace(result[1])) == null) ? result[1] : spaceParsedData[1]

      console.log(input[0])
      continue
    }
    console.log('NOT VALID')
  }
}
