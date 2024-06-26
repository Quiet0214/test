<template>
    <div id="yb-park-scene" :style="innerStyle"></div>
</template>
<script>
import _ from 'lodash'
import { LabelTypeEnum, EventTypeEnum, ContextEnum } from './js/enum.js'
import { recursive, formatSceneConfig } from './js/utils.js'
export default {
  name: 'YbParkScene',
  components: {
  },
  props: {
    data: {
      type: Object,
      default: function () {
        return {}
      }
    },
    width: {
      type: String || Number,
      default: '100%'
    },
    height: {
      type: String || Number,
      default: '100%'
    },
    customClass: String
  },
  data () {
    return {
      // 标签类型
      labelMap: {
        static: [],
        pick: [],
        touch: [],
        signal: []
      },
      eventMap: {
        pickAction: [],
        pickLabelAction: [],
        touchAction: []
      },
      sceneModelTree: [],
      defaultExpandedKeys: [],
      contextNodeMap: new Map(), // 上下文节点映射表<code, node>
      treeNodeMap: new Map(), // 树节点映射表<code, node>
      contextTree: [],
      contextTreeProps: {
        label: 'codeName',
        children: 'children'
      },
      contextMap: {
        contextCode: ContextEnum.MCYB_A00,
        contextRootCode: ContextEnum.MCYB_A00
      },
      tubeLineList: new Set(),
      cameraChangeHandler: null,
      pickActionListeners: []
    }
  },
  computed: {
    innerStyle () {
      return {
        width: this.width,
        height: this.height,
        position: 'absolute'
      }
    }
  },
  mounted () {
  },
  beforeDestroy () {
    this.emptyScene()
  },
  methods: {
    getContextNode (node) {
      if (node.rootCode && node.code) {
        const model = { id: node.rootCode, name: node.code }
        this.contextMap = { contextCode: node.code, contextRootCode: node.rootCode }
        this.selectContext(node.rootCode, node.code)
        this.performAction([model], 'focus', { focusView: node?.focusView || 'default' })
        if (this.labelMap.static.length > 0) {
          this.addTypeLabel(LabelTypeEnum.STATIC)
        }
      }
    },
    /**
     * selectContext 上下文选择
     */
    selectContext (rootCode, code) {
      if (!this.web3d) return
      this.clearEffect()
      this.web3d.selectContext(rootCode, code)
    },
    /**
     * 设置相机变化时的回调函数
     * @param {Function} fn - The function to be called when the camera changes.
     */
    setCameraChangeHandler (fn) {
      this.cameraChangeHandler = fn
    },
    handleCameraChange (e) {
      if (this.cameraChangeHandler) {
        this.cameraChangeHandler(e)
      }
    },
    /**
    /**
     * @method formatData 工具类的方法（格式化数据）
     */
    formatData (data) {
      if (data?.context) {
        this.contextTree = [data.context]
        recursive(this.contextTree, (node) => {
          if (node?.code && node.code.includes(ContextEnum.MCYB_A00)) {
            this.defaultExpandedKeys.push(node.id)
          }
          this.contextNodeMap.set(node.code, node)
        })
      }
      this.labelMap = {
        static: [],
        pick: [],
        touch: [],
        signal: []
      }
      this.eventMap = {
        pickAction: [],
        pickLabelAction: [],
        touchAction: []
      }
      // 树形结构的数据 (优化)
      this.treeNodeMap.clear()
      recursive(data.tree, (model, parent) => {
        // 标签数据格式化
        if (model.label && (model.label.style || model.label.dom) && model.label.type) {
          // 需要记录标签所属上下文
          if (model.code && model.rootCode) {
            const label = {
              ...model.label,
              modelId: model.rootCode,
              modelName: model.code
            }
            this.labelMap[model.label.type] = [...this.labelMap[model.label.type], label] || []
          }
        }
        if (model.event && model.event.length !== 0) {
          model.event.forEach((e) => {
            if (e.eventType && e.actions && e.actions.length !== 0) {
              const actionList = []
              e.actions.forEach((action) => {
                const obj = {
                  ...action,
                  actionId: e.actionId
                }
                if (action.behaviorTypeId === 'focus') {
                  obj.focusView = model.focusView
                }
                actionList.push(obj)
              })

              this.eventMap[`${e.eventType}`] = [...this.eventMap[`${e.eventType}`], ...actionList]
            }
          })
        }
        if (this.treeNodeMap.has(model.code)) {
          console.warn(`Duplicate model code: ${model.code}`)
        }
        this.treeNodeMap.set(model.code, model)
        model.parentCode = parent?.code
      })
      console.log('treeNodeMap', this.treeNodeMap)
    },
    getNodeByCode (code) {
      return this.treeNodeMap.get(code)
    },
    // 创建场景
    createScene () {
      if (_.isEmpty(this.data)) return
      // 格式化数据获取事件列表和标签列表
      this.formatData(this.data)
      // this.sceneModelTree = Array.from(this.data.modelTree) || []
      const scene = formatSceneConfig(this.data)
      // eslint-disable-next-line no-undef
      this.web3d = new Web3D('yb-park-scene', {
        scene: scene,
        pickAction: this.pickAction,
        pickLabelAction: this.pickLabelAction,
        doubleClickModelAction: this.doubleClickModelAction,
        touchAction: _.debounce(this.touchAction, 1000),
        dragAction: this.dragAction,
        loadingAction: this.loadingAction,
        loadedAction: this.loadedAction,
        enableContextSelect: true
      })
      window.web3d = this.web3d
    },
    /**
     * @method pickLabelAction 单击模型事件
     * @param { object } event 点击标签回调参数
     * @return { void }
     */
    pickAction (e) {
      console.log('e', e)
      // 外部方法
      this.$emit('pickAction', e)
      // 聚焦
      // const { logicTree } = e
      // if (logicTree) {
      //   this.performAction([{
      //     id: logicTree.rootCode,
      //     name: logicTree.code
      //   }], 'focus')
      // }
      // // logicTree (获取当前点击信息)
      // if (e) {
      //   let model = null
      //   if (e.logicTree) {
      //     const { rootCode, code } = e.logicTree
      //     model = { id: rootCode, name: code } || {}
      //   } else {
      //     model = { id: e.modelId, name: e.modelId }
      //   }
      //   // 添加模型鼠标点击的模型标签
      //   if (this.labelMap.pick.length > 0 && model !== null) {
      //     this.addTypeLabel(LabelTypeEnum.PICK, model)
      //   }
      //   if (this.eventMap.pickAction.length !== 0 && model !== null) {
      //     this.addTypeEvent(model, EventTypeEnum.PICKACTION)
      //   }
      // }

      // // 调用pickActionListeners的方法
      // if (this.pickActionListeners.length === 0) return

      // for (let i = this.pickActionListeners.length - 1; i >= 0; i--) {
      //   const pickActionListener = this.pickActionListeners[i]
      //   const result = pickActionListener(e)
      //   if (result) {
      //     break // 有一个方法返回true，则停止执行
      //   }
      // }
    },
    // 添加平面贴图
    /**
     * @param {*} name 名称
     * @param {*} width 宽
     * @param {*} long 长
     * @param {*} rotation 旋转
     * @param {*} scale 缩放
     * @param {*} position 位置
     * @param {*} url 图片
     * @param {*} repeat 平铺
     */
    addPlane (name, width, long, url, position, rotation, scale, repeat, renderOrder = -1) {
      if (!this.web3d) return
      this.web3d.addPlane(name, width, long, url, position, rotation, scale, repeat, renderOrder)
    },
    // 清除平面贴图
    removePlane (name) {
      if (!this.web3d) return
      this.web3d.removePlane(name)
    },
    // 加载模型
    /**
     * @method pickLabelAction 点击模型标签事件
     * @param { object } e 点击标签回调参数
     * @return { void }
     */
    pickLabelAction (e) {
      console.log('pickLabelAction', e, this.eventMap)

      // 外部方法
      this.$emit('pickLabelAction', e)

      // 自带方法
      if (e.id && e.objects && e.objects.length !== 0) {
        if (this.eventMap.pickLabelAction.length !== 0) {
          const model = e.objects[0]
          this.addTypeEvent(model, EventTypeEnum.PICKLABELACTION)
        }
      }
    },
    clearModelLabel () {
      if (!this.web3d) return
      this.web3d.emptyLabel('static')
      this.web3d.emptyLabel('pick')
      this.web3d.emptyLabel('touch')
      this.web3d.emptyLabel('signal')
    },
    /**
     * @methods setRightDoubleClickAction 右键刷级返回上下文回调
     */
    setRightDoubleClickAction () {
      if (!this.web3d) return
      this.web3d.setRightDoubleClickAction((e) => {
        this.$emit('setRightDoubleClickAction', e)
        this.clearEffect()
        const { changeContext, contextCode, contextRootCode } = e
        // 如果是切换上下文，更新标签生成
        if (changeContext) {
          if (contextCode && contextRootCode) {
            this.contextMap = {
              contextCode,
              contextRootCode
            }
          }
          if (this.labelMap.static.length > 0) {
            this.addTypeLabel(LabelTypeEnum.STATIC)
          }
        }
      })
    },
    /**
     * @method pickLabelAction 双击模型事件
     * @param { object } e 双击模型回调参数
     * @return { void }
     */
    doubleClickModelAction (e) {
      this.clearEffect()
      const { changeContext, contextCode, contextRootCode } = e
      // 如果是切换上下文，更新标签生成
      if (changeContext) {
        if (contextCode && contextRootCode) {
          this.contextMap = {
            contextCode,
            contextRootCode
          }
        }
        if (this.labelMap.static.length > 0) {
          this.addTypeLabel(LabelTypeEnum.STATIC)
        }
      }
      this.$emit('doubleClickModelAction', e)
    },
    /**
     * @method touchAction 鼠标悬浮事件
     * @param { object } e 点击标签回调参数
     * @return { void }
     */
    touchAction (e) {
      console.log(e, 'touchAction')
      if (e) {
        let model
        if (e.logicTree) {
          const { rootCode, code } = e.logicTree
          model = { id: rootCode, name: code } || {}
        } else {
          model = { id: e.modelId, name: e.modelId }
        }
        // 添加模型鼠标触摸的模型标签
        if (this.labelMap.touch.length > 0) {
          this.addTypeLabel(LabelTypeEnum.TOUCH, model)
        }
        if (this.eventMap.touchAction.length !== 0) {
          this.addTypeEvent(model, EventTypeEnum.TOUCHACTION)
        }
      } else {
        if (this.web3d) {
          this.web3d.emptyLabel('touch')
        }
      }
      // 外部方法
      this.$emit('touchAction', e)
    },
    /**
     * @method touchAction 模型拖拽事件
     * @param { object } e
     * @return { void }
     */
    dragAction (e) {
      this.$emit('dragAction', e)
    },
    /**
     * @method loadedAction 场景加载完毕事件
     * @param { object } e
     * @return { void }
     */
    loadedAction (e) {
      // this.addSplotLight('spotLight0', { x: 0, y: 60, z: 0 }, { x: 0, y: 18, z: 0 }, 0xffffff, 3, 60, 1, 1, 0, false, false)
      // this.addSplotLight('spotLight1', { x: 0, y: 30, z: 0 }, { x: 0, y: 18, z: 0 }, 0xfff5db, 1.5, 30, 1, 1, 0, false, false)
      // 自身方法
      if (this.data.openGround) {
        const wide = Math.sqrt(Math.pow(Number(this.data.skybox.radius), 2) + Math.pow(Number(this.data.skybox.radius), 2))
        const long = Math.sqrt(Math.pow(Number(this.data.skybox.radius), 2) + Math.pow(Number(this.data.skybox.radius), 2))
        this.createGradientGround(wide, long)
      }
      this.setCameraNearFar(1, 10000)
      // 添加模型静态的模型标签
      if (this.labelMap.static.length > 0) {
        this.addTypeLabel(LabelTypeEnum.STATIC)
      }
      this.openStatusDefaultToggle()
      this.openContextDefaultToggle()
      // 外来方法
      this.$emit('loadedAction', e)
      this.setRightDoubleClickAction()

      this.web3d.setCameraChangeHandler('update', this.handleCameraChange)
    },
    removeDynamicGround () {
      if (!this.web3d) return
      this.web3d.removeGradientGround()
    },
    createGradientGround (wide = 1500, long = 1500) {
      if (!this.web3d) return
      this.removePlane('ground')
      this.addPlane('ground',
        wide,
        long,
        './lib/resource/map/new.png',
        {
          x: 0,
          y: -0.01,
          z: 0
        },
        {
          x: -90 * Math.PI / 180,
          y: 0,
          z: 0
        },
        {
          x: 1,
          y: 1,
          z: 1
        },
        {
          x: 250,
          y: 250
        })
    },
    /**
     * @method loadedAction 场景加载过程事件
     * @param { number } progress // 进度值
     * @return { void }
     */
    loadingAction (progress) {
      this.$emit('loadingAction', progress)
    },
    /**
     * @method loadedAction 场景切换
     * @param { object } scene 场景配置 { function } callback 切换完成回调
     * @return { void }
     */
    changeScene (scene, callback) {
      if (this.web3d) {
        this.formatData(scene)
        // this.sceneModelTree = Array.from(scene.modelTree) || []
        const config = formatSceneConfig(scene)
        this.web3d.initScene(config, callback)
        if (this.labelMap.static.length > 0) {
          this.addTypeLabel(LabelTypeEnum.STATIC)
        }
      } else {
        this.createScene()
      }
    },
    /**
     * @method loadedAction 更新场景
     * @param { object } scene 场景配置 { function } callback 切换完成回调
     * @return { void }
     */
    updateScene (scene, callback) {
      if (this.web3d) {
        this.formatData(scene)
        const config = formatSceneConfig(scene)
        console.log(config, 'config')
        this.web3d.updateScene(config, () => {
          callback()
          if (this.labelMap.static.length > 0) {
            this.addTypeLabel(LabelTypeEnum.STATIC)
          }
        })
      } else {
        this.createScene()
      }
    },
    updateData (scene) {
      this.formatData(scene)
      if (this.labelMap.static.length > 0) {
        this.addTypeLabel(LabelTypeEnum.STATIC)
      }
    },
    /**
     * @description 添加模型标签
     * @public
     * @param {string} id
     * @param {Array<{id:string,name:string=}>} objects 作用对象集合 [{id:'building01',name:'001'}],其中id为模型id,name为模型构件名称(可选字段)
     * @param {import("./3DTypes").AddLabel} label
     * @param {object} userData 自定义传入用户数据
     */
    // 添加标签
    addModelLabel (id, list = [], label = {}, params = {}) {
      if (!this.web3d) return
      this.web3d.addModelLabel(id, list, { ...label }, { ...params })
    },
    // 添加某个类型标签
    addTypeLabel (type = LabelTypeEnum.STATIC, model) {
      if (this.labelMap[type].length > 0) {
        // 获取当前上下文
        // 查询所在上下文
        // 清空标签
        // this.clearModelLabel()
        this.web3d.emptyLabel(type)

        this.getNodesContext(this.labelMap[type])
        if (type === LabelTypeEnum.STATIC) {
          this.labelMap[type].forEach((label) => {
            let flag = true
            if (label?.contentRootCode && label?.contentCode) {
              flag = (this.contextMap.contextCode === 'MCYB_A00')
                ? (label.contentRootCode.includes(this.contextMap.contextRootCode) && label.contentCode.includes(this.contextMap.contextCode))
                : ((label.contentRootCode === this.contextMap.contextRootCode) && (label.contentCode === this.contextMap.contextCode))
            }
            const enable = label.style.enable
            if (flag && enable) {
              const list = [{ id: label.modelId, name: label.modelName }]
              this.addModelLabel(label.modelName, list, { ...label }, {})
            }
          })
        } else {
          this.labelMap[type].forEach((label) => {
            if (label.modelName === model.name) {
              const list = [{ id: label.modelId, name: label.modelName }]
              this.addModelLabel(label.modelName, list, { ...label }, {})
            }
          })
        }
      }
    },
    // 添加某个类型的事件
    addTypeEvent (model, type = EventTypeEnum.PICKACTION) {
      if (this.eventMap[type].length > 0) {
        const actionList = this.eventMap[type].filter((action) => {
          return (action.actionId === model.name && action.targetIds.length !== 0 && action.behaviorTypeId)
        }) || []
        if (actionList.length > 0) {
          // this.clearEffect()
          actionList.forEach((action) => {
            const params = {}
            if (action.behaviorTypeId === 'focus') {
              params.focusView = action.focusView
            }
            this.performAction(action.targetNamesIds, action.behaviorTypeId, params)
          })
        }
      }
    },
    /**
     * @description 设置相机旋转状态
     * @param {number} state 开启相机旋转
     * @param {number} speed 旋转速度 正负=>顺时针,逆时针
     */
    setRotateState (state = false, speed = 0.01) {
      if (!this.web3d) return
      this.web3d.setRotateState(state, speed)
    },
    // 设置光影跟随
    setLightShadowFollowing (state) {
      if (!this.web3d) return
      this.web3d.setLightShadowFollowing(state)
    },
    // 清空标签
    emptyLabel (type) {
      if (!this.web3d) return
      this.web3d.emptyLabel(type)
    },
    // 清空场景
    emptyScene () {
      if (!this.web3d) return
      this.web3d.emptyScene()
      this.web3d = null
    },
    // 配置点击事件,会覆盖原有pickAction
    setPickAction (fn) {
      this.pickActionListeners.clear()
      this.pickActionListeners.push(fn)
    },
    // 添加点击事件
    addPickAction (fn) {
      // 避免重复添加同一事件
      this.removePickAction(fn)
      this.pickActionListeners.push(fn)
    },
    // 移除点击事件
    removePickAction (fn) {
      const index = this.pickActionListeners.indexOf(fn)
      if (index >= 0) {
        this.pickActionListeners.splice(index, 1)
      }
    },
    // 设置物体控制事件
    setDragAction (fn) {
      if (!this.web3d) return
      this.web3d.setDragAction(fn)
    },
    // 触碰事件开关
    enableTouch (bool = true) {
      if (!this.web3d) return
      this.web3d.enableTouch(bool)
    },
    // 设置触碰事件
    setTouchAction (fn) {
      if (!this.web3d) return
      this.web3d.setTouchAction(fn)
    },
    // 清除模型动效
    clearEffect (param) {
      if (!this.web3d) return
      this.web3d.clearEffect(param)
    },
    // 切换上下文
    // 上下文返回上一级
    upOneLevel () {
    },
    // 模型显示隐藏
    // 返回场景主视角
    switchDefaultView () {
      if (!this.web3d) return
      this.clearEffect()
      this.web3d.removeLight('1')
      this.web3d.removeLight('2')
      this.web3d.switchDefaultView()
      this.addTypeLabel(LabelTypeEnum.STATIC)
    },
    // 设置场景默认主视角
    setDefaultView () {
      if (!this.web3d) return
      return this.web3d.setDefaultView()
    },
    // 获取相机视角
    getCameraPosition () {
      if (!this.web3d) return
      return this.web3d.getCameraPosition()
    },
    // 初始化漫游
    initRoam (roamList = [], speed = 5) {
      if (!this.web3d) return
      return this.web3d.initRoam(roamList, speed)
    },
    // 开始漫游
    startRoam () {
      if (!this.web3d) return
      return this.web3d.startRoam()
    },
    // 结束漫游
    endRoam () {
      if (!this.web3d) return
      return this.web3d.endRoam()
    },
    // 清除漫游点位
    clearRoam () {
      if (!this.web3d) return
      return this.web3d.clearRoam()
    },
    // 暂停漫游
    suspendRoam () {
      if (!this.web3d) return
      return this.web3d.suspendRoam()
    },
    // 获取漫游列表
    getRoamList () {
      if (!this.web3d) return
      return this.web3d.getRoamList()
    },
    // 屏幕坐标获取模型的坐标
    getFirstIntersection (clientX, clientY) {
      if (!this.web3d) return
      return this.web3d.getFirstIntersection(clientX, clientY)
    },
    /**
    * @description 设置相机移动
    * @param {number} position 相机位置
    * @param {number} target 目标位置
    * @param {number} enableTransition 是否平滑移动 可选参数 默认为true
    * @param {number} callback 动作回调函数
    */
    lookAt (position, target, time = 1000, enableTransition = true, callback) {
      if (!this.web3d) return
      return this.web3d.lookAt(position, target, time, enableTransition, callback)
    },
    /**
     * @description 添加扩散圈
     * @param {number} r 最大半径 2
     * @param {number} init 起始半径 0.1
     * @param {number} ring 扩散条宽度 0.5
     * @param {number} color 颜色 0xff0000
     * @param {number} speed 扩散速度 0.05
     * @param {Vector3} position 位置 {x:0,y:0,z:0}
     */
    addRingEffect (r, init, ring, color, speed, position) {
      if (!this.web3d) return
      return this.web3d.addRingEffect(r, init, ring, color, speed, position)
    },
    // 清除扩散圈
    removeRingEffect () {
      if (!this.web3d) return
      return this.web3d.removeRingEffect()
    },
    // 开启测量工具 type   1：直线测量 2：水平测量 3：垂直测量
    startMeasurement (type) {
      if (!this.web3d || !type) return
      this.web3d.setMeasurement(type)
    },
    // 关闭测量工具
    stopMeasurement () {
      if (!this.web3d) return
      this.web3d.stopMeasurement()
    },
    // -------------------------------新版本---------------------------------
    /**
     * @method performAction
     * @param { Array<{id: string, name?: string}> } list 模型ID + 构建名称
     * @param { "show" | "hide" | "toggleVisible" | "transparent" | "focus" | "highLight" | "color" | "colorBox"
     * | "modelBox" | "texture" | "rotate" | "explosion" | "modelAnimation"} action
     * 显示(show)、隐藏(hide)、切换显隐(toggleVisible)、透视(transparent)、聚焦(focus)、高亮(highLight)、物体染色(color)、
     * 染色盒子(colorBox)、外框盒子（modelBox）、纹理动画(texture)、自转动画(rotate)、爆炸动画(explosion)、模型动画(modelAnimation)
     * @param { Object= } params
     */
    performAction (list = [], action, params, callback) {
      if (!this.web3d || list.length === 0 || !action) return
      if (action === 'focus') {
        this.web3d.performAction(list, action, params || { focusView: 'default' }, callback)
        return
      }
      if (action === 'texture') {
        this.web3d.performAction(list, action, params || { speed: 0.01 })
        return
      }
      if (action === 'color') {
        this.web3d.performAction(list, action, params || { color: 0xffffff })
        return
      }
      if (action === 'modelBox') {
        this.web3d.performAction(list, action, params || { color: 0xffffff })
        return
      }
      if (action === 'colorBox') {
        this.web3d.performAction(list, action, params || { color: 0xffffff })
        return
      }
      if (action === 'modelAnimation') {
        this.web3d.performAction(list, action, params || { animationName: 'Take 001', state: true })
        return
      }
      if (action === 'rotate') {
        this.web3d.performAction(list, action, params || { state: true })
        return
      }
      this.web3d.performAction(list, action, params, callback)
    },
    /**
     * 获取模型构件
     * @method getModelTree
     * @param {String} id
     */
    getModelTree (id) {
      if (!this.web3d) return []
      return this.web3d.getModelTree(id)
    },
    /**
     * 场景重置窗口
     * @method resize
     */
    screenResize () {
      if (!this.web3d) return
      this.web3d.resize()
    },
    /**
     * 根据鼠标位置添加公共模型
     * @method addPublicModelByMousePosition
     * @param clientX
     * @param clientY
     * @param id
     * @param url
     * @param type
     * @package callback
     */
    addPublicModelByMousePosition (clientX, clientY, id, name, url, type, callback) {
      if (!this.web3d) return
      this.web3d.addPublicModelByMousePosition(clientX, clientY, id, name, url, type, callback)
    },
    /**
     * 剖切模型
     * @method clipModel
     * @param id 模型ID
     * @param height 剖切高度
     * @param index  0: x+, 1: x-, 2: y+, 3: y-, 4: z+, 5: z-
     */
    clipModel (id, height, index = 2) {
      if (!this.web3d) return
      this.web3d.clipModel(id, height, index)
    },
    /**
     * 剖切场景
     * @method clipModel
     * @param index  0: x+, 1: x-, 2: y+, 3: y-, 4: z+, 5: z-
     * @param value 剖切的值
     */
    clipScene (index = 2, value) {
      if (!this.web3d) return
      this.web3d.clipScene(index, value)
    },
    /**
     * 获得模型或尺寸
     * @method getBoxSize
     * @param idAndName 模型ID和名称 模型只需传id
     */
    getBoxSize (idAndName) {
      if (!this.web3d) return
      return this.web3d.getBoxSize(idAndName)
    },
    /**
     * 获得模型剖切范围
     * @method getModelClipRange
     * @param id 模型ID
     */
    getModelClipRange (id) {
      if (!this.web3d) return
      return this.web3d.getModelClipRange(id)
    },
    /**
     * 获得场景剖切范围
     * @method getSceneClipRange
     * @param id 模型ID
     */
    getSceneClipRange () {
      if (!this.web3d) return
      return this.web3d.getSceneClipRange()
    },
    /**
     * @method showClipView
     * @param id 模型ID
     * @param viewId 视图ID
     * @param callback
     */
    showClipView (id, viewId, callback) {
      if (!this.web3d) return
      this.web3d.showClipView(id, viewId, callback)
    },
    /**
     * 恢复剖切
     * @method resetClip
     * @param id 模型ID
     */
    resetClip (id) {
      if (!this.web3d) return
      this.web3d.resetClip(id)
    },
    /**
     * @method getClipHeightRange
     * @param id
     */
    getClipHeightRange (id) {
      if (!this.web3d) return
      return this.web3d.getClipHeightRange(id)
    },
    /**
     * @method startControl
     * @param id
     */
    startControl (id) {
      if (!this.web3d) return
      this.web3d.startControl(id)
    },
    /**
     * 取消模型控制
     * @method cancelControl
     */
    cancelControl () {
      if (!this.web3d) return
      this.web3d.cancelControl()
    },
    /**
     * 截图
     * @method getSnapshot
     */
    getSnapshot () {
      if (!this.web3d) return
      return this.web3d.getSnapshot()
    },
    /**
     * 清除告警动画
     * @method clearAlarmEffect
     */
    clearAlarmEffect (type) {
      switch (type) {
        case '扩散波':
          this.web3d.removeRingEffect()
          break
        case '扩散球':
          this.web3d.removeBallEfffect()
          break
        case '火焰':
          this.web3d.removeAllParticleFire()
          break
        case '电子围栏':
          this.web3d.removeRailEffect()
          break
        case '烟雾':
          this.web3d.removeAllSmoke()
          break
        default:
          this.web3d.removeRingEffect()
          this.web3d.removeBallEfffect()
          this.web3d.removeAllParticleFire()
          this.web3d.removeRailEffect()
          this.web3d.removeAllSmoke()
          break
      }
    },
    /**
     * 清除告警动画
     * @method clearAlarmEffect
     */
    addAlarmEffect (type) {
      switch (type) {
        case '扩散波':
          this.web3d.addRingEffect(2, 0.1, 0.5, 0xff0000, 0.05, { x: 0, y: 0, z: 0 })
          break
        case '扩散球':
          this.web3d.addBallEfffect({ x: 0, y: 0, z: 0 }, 0.5, 0xff0000, 0.1)
          break
        case '火焰':
          this.web3d.addFireSprite({ x: 0, y: 0, z: 0 }, 1)
          break
        case '电子围栏':
          this.web3d.addRail([{ x: -50, y: 0, z: -50 }, { x: 50, y: 0, z: -50 }, { x: 50, y: 0, z: 50 }, {
            x: -50,
            y: 0,
            z: 50
          }, { x: -50, y: 0, z: -50 }], 25, {
            repeatX: 4,
            repeatY: 1,
            speed: 0.005
          })
          break
        case '烟雾':
          this.web3d.addSmoke('烟雾', { x: 0, y: 0, z: 0 }, 1, 3, 1)
          break
        default:
          break
      }
    },
    // 添加电子围栏
    addRail (railPosition, height, params = { repeatX: 4, repeatY: 1, speed: 0.005 }) {
      if (!this.web3d) return
      this.web3d.addRail(railPosition, height, params)
    },
    // 指定添加模型外围电子围栏
    addRailByModelBox (list, PARAMS = {
      height: 1,
      boxSize: 1.1,
      scalar: 0,
      aspect: 4
    }) {
      this.web3d.addRailByModelBox(
        list,
        PARAMS
      )
    },
    restoreColor () {
      if (!this.web3d) return
      this.web3d?.restoreColor()
    },
    // 设置相机近裁切面（解决距离拉远地形闪烁问题）
    setCameraNearFar (near, far) {
      if (this.web3d) {
        this.web3d.setCameraNearFar(near, far)
      }
    },
    getDict () {
      if (!this.web3d) return
      return this.web3d.getDict()
    },
    setPipeLineState (state = false, pointSize = 0.1) {
      if (!this.web3d) return
      this.web3d.setPipeLineState(state, pointSize)
    },
    recordPipeLinePoint () {
      if (!this.web3d) return
      return this.web3d.recordPipeLinePoint()
    },
    /**
     * @method removePipeLinePoint 移除点位
     * @param pointName // 点位标识
     */
    removePipeLinePoint (pointName) {
      if (!this.web3d) return
      return this.web3d.removePipeLinePoint(pointName)
    },
    /**
     * @method setChosenPipeLinePoint // 控制点位
     * @param pointName // 点位标识
     */
    setChosenPipeLinePoint (pointName) {
      if (!this.web3d) return
      this.web3d.setChosenPipeLinePoint(pointName)
    },
    /**
     * setDragPipeLinePointAction // 拖拽后的回调
     */
    setDragPipeLinePointAction (fn) {
      if (!this.web3d) return
      this.web3d.setDragPipeLinePointAction(fn)
    },
    /**
     * @method getCurrentPipeLine 获取当前的管网信息
     */
    getCurrentPipeLine () {
      if (!this.web3d) return
      return this.web3d.getCurrentPipeLine()
    },
    /**
     * @method linkPipeLinePoints 连线
     * @param { string } pointName1
     * @param { string } pointName2
     */
    linkPipeLinePoints (pointName1, pointName2) {
      if (!this.web3d) return
      return this.web3d.linkPipeLinePoints(pointName1, pointName2)
    },
    /**
     * @method setPipeLineColor 设置管网颜色
     * @param { string[] } lineNames
     * @param { number } color
     */
    setPipeLineColor (lineNames, color) {
      if (!this.web3d) return
      this.web3d.setPipeLineColor(lineNames, color)
    },
    /**
     * @method restorePipeLine 重置管网
     */
    restorePipeLine () {
      if (!this.web3d) return
      this.web3d.restorePipeLine()
    },
    // 加载管网
    loadPipeLine (pipeLineData) {
      if (!this.web3d) return
      this.web3d.loadPipeLine(pipeLineData)
    },
    // 恢复管线颜色
    resetPipeLineColor () {
      if (!this.web3d) return
      this.web3d.resetPipeLineColor()
    },
    /**
     * @method addPathTubeLine 添加流动性
     * @param { string } name
     * @param { object[] } pointArr [{x,y,z}]
     * @param { string } url
     * @param { object } params
     */
    addPathTubeLine (name, pointArr, url, params = {
      radius: 0.1, // 半径
      radialSegments: 8, // 截面分房
      progress: 1, // 进度
      cornerRadius: 0.03, // 拐角兴在
      color: 0xffffff, // 颜色
      repeat: 1.1, // 平铺
      autoRepeat: true, // 是否根据距离白动没量
      scrollSpeed: 0.0015, // 流动速度
      reverse: false// 是含反转
    }) {
      if (!this.web3d) return
      this.web3d.addPathTubeLine(name, pointArr, url, params)
      if (this.tubeLineList.has(name)) {
        console.log('重复添加:', name)
      } else {
        this.tubeLineList.add(name)
        // console.log('added:', name)
      }
    },
    /**
     * @method removePathLineByPrefixName 基于前缀移除流动线
     * @param { string } name 流动名称
     */
    removePathLineByPrefixName (prefix) {
      if (!this.web3d) return
      this.tubeLineList.forEach(name => {
        if (name.startsWith(prefix)) {
          this.removePathLineByName(name)
          // console.log('removed:', name)
        }
      })
    },
    /**
     * @method removePathLineByName 移除流动线
     * @param { string } name 流动名称
     */
    removePathLineByName (name) {
      if (!this.web3d) return
      this.web3d.removePathLineByName(name)
      if (name) {
        this.tubeLineList.delete(name)
      } else {
        this.tubeLineList.clear()
      }
    },
    /**
     * 聚光灯
     */
    addModelSplotLight (name, list = []) {
      if (!this.web3d) return
      this.web3d.addModelSplotLight(name, list)
    },
    removeLight (param) {
      if (!this.web3d) return
      this.web3d.removeLight(param)
    },
    openStatusDefaultToggle () {
      if (!this.web3d) return
      this.web3d.openStatusDefaultToggle()
    },
    openContextDefaultToggle () {
      if (!this.web3d) return
      this.web3d.openContextDefaultToggle()
    },
    /**
     * @description 根据节点数据更新获取所属上下文
     * @param {Array} data 节点数据数组 [{modelId,modelName}]
     */
    getNodesContext (list) {
      if (!this.web3d) return
      this.web3d.getNodesContext(list)
    },
    /**
     * @method getCurrentContext 获取当前上下文
     */
    getCurrentContext () {
      if (!this.web3d) return
      return this.web3d.getCurrentContext()
    },
    addSplotLight (name, position, target, color = 0xffffff, intensity, distance, angle, penumbra = 1, decay = 0, castShadow = false, addHelper = false) {
      if (!this.web3d) return
      this.web3d.addSplotLight(name, position, target, color = 0xffffff, intensity, distance, angle, penumbra, decay, castShadow, addHelper)
    },
    changeSkyBox (skybox) {
      if (!this.web3d) return
      this.web3d.changeSkyBox(skybox)
    },
    searchPipeLinePath (startName, endName, pipeLineData, useRoutes) {
      if (!this.web3d) return
      console.log('searchPipeLinePath', startName, endName, pipeLineData, useRoutes)
      return this.web3d.searchPipeLinePath(startName, endName, pipeLineData, useRoutes)
    },
    addLight (list, scale = 1.5) {
      if (!this.web3d) return
      this.web3d.removeLight('1')
      this.web3d.removeLight('2')
      this.web3d.addModelSplotLight('1', list, {
        color: 0xffffff,
        intensity: 1.5,
        scale: scale,
        angle: 1,
        penumbra: 1,
        decay: 0
      })
      this.web3d.addModelSplotLight('2', list, {
        color: 0xfff5db,
        intensity: 3,
        scale: scale / 2,
        angle: 1,
        penumbra: 1,
        decay: 0
      })
    },
    occlusionShow () {
      if (!this.web3d) return
      this.web3d.occlusionShow()
    },
    addModelBlockBars (id, list, params = {
      width: 0.05, // 方块宽
      number: 10, // 方块数量
      categorySpacing: 0.03, // 不同类目间距
      valueSpacing: 0.015, // 同一类目方块间距
      categoryAxis: 'y', // 类目方向轴
      valueAxis: '-z'// 值（方块排列）方向周
    }) {
      if (!this.web3d) return
      this.web3d.addModelBlockBars(id, list, params)
    },
    removeBlockBars (id) {
      if (!this.web3d) return
      this.web3d.removeBlockBars(id)
    }
  }
}
</script>

<style lang="scss" scoped>
#yb-park-context {
  position: absolute;
  z-index: 99999814;
  top: 8%;
  right: 25%;
  width: 450px;
  background: #65B5CA;
  opacity: 0.9;
  border-radius: 8px;
  display: flex;
  justify-content: space-around;
  align-items: center;
  flex-direction: column;
  padding: 0 6px;

}
</style>
