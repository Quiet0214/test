import YbLoading from './src/main.vue'

YbLoading.install = function (Vue) {
  console.log(YbLoading.name, 'YbLoading.name')
  Vue.component(YbLoading.name, YbLoading)
}
export default YbLoading
