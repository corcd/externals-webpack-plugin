# externals-webpack-plugin

## 思路启发

文章：[《Webpack 打包后代码执行时机分析与优化》](https://github.com/joeyguo/blog/issues/21)

Github：[ joeyguo/wait-external-webpack-plugin ](https://github.com/joeyguo/wait-external-webpack-plugin)

## Description

通过对 entry 文件进行处理，业务逻辑将等待所依赖的 externals 文件加载完成后再开始执行；遇到加载失败时，会自动进行资源兜底

可以避免 externals 文件未加载完成或加载失败时，直接执行业务逻辑导致异常

## Todos

* [ ] 失败重试机制
* [ ] 全局最终错误处理
* [ ] 内置上报机制

## Install

npm i -D @gdyfe/externals-webpack-plugin

## Usage

``` js
const ExternalsPlugin = require('externals-webpack-plugin')

module.exports = {
    entry: {
        pageA: "./src/pageA.js",
        pageB: "./src/pageB.js"
    },
    externals: [
        {
            jquery: 'jQuery',
        }
    ],
    plugins: [
        new ExternalsPlugin({
            test: /\.js$/,  // 正则匹配需要处理的 entry，默认对所有 entry 进行处理
            resource: {
              'jQuery': 'cdn URL',
            }
        }),
    ]
};
```
