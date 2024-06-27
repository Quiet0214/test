import YbParkScene from './src/park.vue'

YbParkScene.install = function (Vue) {
  console.log(YbParkScene.name, 'YbLoading.name')
  Vue.component(YbParkScene.name, YbParkScene)
}
export default YbParkScene
