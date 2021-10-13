/*
 * @Author: Whzcorcd
 * @Date: 2021-10-12 14:19:42
 * @LastEditors: Whzcorcd
 * @LastEditTime: 2021-10-13 10:33:07
 * @Description: file content
 */
'use strict'

const ConcatSource = require('webpack-sources').ConcatSource
const ModuleFilenameHelpers = require('webpack/lib/ModuleFilenameHelpers')

class ExternalsPlugin {
  constructor(args) {
    if (typeof args !== 'object') {
      throw new TypeError('Argument "args" must be an object.')
    }
    this.test = args.hasOwnProperty('test') ? args.test : ''
    this.resourcePathList = args.hasOwnProperty('resource') ? args.resource : {}
  }

  // 处理全局变量类型
  getVarForGlobalVariableExternal(variableName, type) {
    if (!Array.isArray(variableName)) {
      variableName = [variableName]
    }

    // needed for e.g. window["some"]["thing"]
    const objectLookup = variableName
      .map(r => `[${JSON.stringify(r)}]`)
      .join("")

    return `${type}${objectLookup}`
  }

  // 处理默认普通变量类型
  getVarForDefaultCase(request) {
    if (!Array.isArray(request)) {
      request = [request]
    }

    const variableName = request[0]
    const objectLookup = request
      .slice(1)
      .map(r => `[${JSON.stringify(r)}]`)
      .join('')

    return `window.${variableName} && ${variableName}${objectLookup}`
  }

  getVariableNameListForGlobalVariableExternal(variableName) {
    return variableName
  }

  getVariableNameListForDefaultCase(request) {
    if (!Array.isArray(request)) {
      request = [request]
    }
    return request[0]
  }

  apply(compiler) {
    const tester = {
      test: this.test
    }

    compiler.hooks.compilation.tap('ExternalsPlugin', (compilation) => {
      compilation.hooks.optimizeChunkAssets.tapAsync('ExternalsPlugin', (chunks, done) => {
        wrapChunks(compilation, chunks)
        done()
      })
    })

    const wrapFile = (compilation, fileName, chunk) => {
      const variableNameList = []
      const externalVars = chunk.getModules().filter(item => {
        if (item.external) {
          return true
        }
      }).map(({
        request,
        externalType
      }) => {
        console.log(request)
        switch (externalType) {
          case "this":
          case "window":
          case "self":
            variableNameList.push(this.getVariableNameListForGlobalVariableExternal(request))
            return this.getVarForGlobalVariableExternal(request, externalType)
          case "var":
            variableNameList.push(this.getVariableNameListForDefaultCase(request))
            return this.getVarForDefaultCase(request)
          default:
            console.warn(`\n[externals-webpack-plugin] ignore: ${externalType} ${request}\n`)
            return
        }
      }).filter(item => {
        return !!item
      })
      console.log(externalVars, variableNameList)

      if (externalVars.length === 0) return

      compilation.assets[fileName] = new ConcatSource(
        `(function () {
	var entryInit = function () {`,
        compilation.assets[fileName],
        `\n
	}
  var PENDING = 'pending'
  var NONE = 'none'
  var SUCCESS = 'success'
	if (${externalVars.join(' && ')}) {
    console.log('externals loaded successfully')
		entryInit()
	} else {
		window.hasInit = false
    window.externalIsReady = new Array(${externalVars.length}).fill(NONE)
    var verify = function () {
      for (var j = 0;j < window.externalIsReady.length;j++) {
        if (window.externalIsReady[j] === PENDING || window.externalIsReady[j] === NONE) {
          return false
        }
      }
      return true
    }
		var callback = function () {
      console.log('document resource loaded callback')
			if (window.hasInit) return
			if (${externalVars.join(' && ')}) {
				window.hasInit = true
				document.removeEventListener('load', callback, true)
				entryInit()
        return
			} else {
        if (verify()) {
          window.hasInit = true
          document.removeEventListener('load', callback, true)
          entryInit()
          return
        }
        for (var i = 0;i < ${externalVars.length};i++) {
          if (window.externalIsReady[i] === PENDING || window.externalIsReady[i] === SUCCESS) {
            continue
          }
          if (new Function('return '.concat(${JSON.stringify(externalVars)}[i]))()) {
            window.externalIsReady[i] = SUCCESS
            continue
          }
          var path = ${JSON.stringify(this.resourcePathList)}[${JSON.stringify(variableNameList)}[i]]
          if (!path) {
            window.externalIsReady[i] = NONE
            continue
          }
          var script = document.createElement('script')
          script.type = 'text\/javascript'
          script.src = path
          window.externalIsReady[i] = PENDING
          document.body.appendChild(script)
        }
      }
		}
		document.addEventListener('load', callback, true)
	}
})()`
      )
    }

    function wrapChunks(compilation, chunks) {
      chunks.forEach((chunk) => {
        if (!chunk.hasRuntime()) return

        chunk.files.forEach(fileName => {
          if (ModuleFilenameHelpers.matchObject(tester, fileName)) {
            wrapFile(compilation, fileName, chunk)
          }
        })
      })
    }
  }
}

module.exports = ExternalsPlugin