import YbParkScene from '../packages/scene'
import YbTreeTransfer from '../packages/tree-transfer'
import YbLoading from '../packages/loading'

const components = [
  YbParkScene,
  YbTreeTransfer,
  YbLoading
]

const install = function (Vue, opts = {}) {
  components.forEach(component => {
    Vue.component(component.name, component)
  })
}

/* istanbul ignore if */
if (typeof window !== 'undefined' && window.Vue) {
  install(window.Vue)
}

export default {
  version: '1.0.0',
  install,
  YbLoading,
  YbParkScene,
  YbTreeTransfer
}
