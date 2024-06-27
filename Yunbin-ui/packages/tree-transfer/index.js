import YbTreeTransfer from './src/main'

/* istanbul ignore next */
YbTreeTransfer.install = function (Vue) {
  Vue.component(YbTreeTransfer.name, YbTreeTransfer)
}

export default YbTreeTransfer
