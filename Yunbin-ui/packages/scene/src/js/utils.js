import { CodeType, FolderType, actualTraySize, trayTemSize, Layout, ContextEnum } from './enum'

/**
 * @Author: sunhao
 * @Date: 2023/3/16 0016
 */
/**
 * 场景格式处理
 * @param {*} config
 * @returns
 */
export function formatSceneConfig (config) {
  const format = {
    modelTree: [],
    tree: config.tree || [],
    context: config.context || {},
    markList: config.markList || [],
    cameraPosition: config.cameraPosition,
    // 备注
    lightProperty: config.lightProperty,
    hdr: config.hdr,
    skybox: config.skybox,
    publicModels: config.publicModels || [],
    labelGroup: config.labelGroup || [],
    label: config.label || [],
    roamList: [],
    clipConfig: {},
    alarmConfig: config.alarmConfig || []
  }

  format.skybox.radius = Number(config.skybox.radius)

  // 将模型树种的数据全部移入公共模型
  const modelList = []

  if (modelList.length > 0) {
    format.publicModels = [...format.publicModels, ...modelList]
  }

  // 控制公共模型标注展示
  if (format.publicModels) {
    format.publicModels.forEach((model, index) => {
      // 临时添加
      model.touchEnable = true
      if (model?.label && model.label?.style && typeof model.label?.style?.enable === 'boolean') {
        if (!model.label?.style?.enable) {
          model.label.style = null
        }
      }
    })
  }

  if (config?.clipConfig) {
    config.clipConfig.forEach((item) => {
      format.clipConfig[item.modelId] = {}
      if (item?.clipList && item.clipList.length !== 0) {
        item.clipList.forEach((itm) => {
          format.clipConfig[item.modelId][itm.id] = itm
        })
      }
    })
  }
  return format
}

/**
 * 递归算法
 */
export function recursive (treeNodes = [], fn = (info, father) => {}, father = null, skipNonModel = true, reverse = false) {
  if (!treeNodes || !treeNodes.length) return
  for (let i = reverse ? treeNodes.length - 1 : 0; (reverse ? i >= 0 : i < treeNodes.length); (reverse ? i-- : i++)) {
    const children = treeNodes[i].children || []
    // 临时处理，减少递归次数（端口、电线等暂时不做递归）如果结构树递归端口等，性能消耗严重
    const isModel = treeNodes[i].url
    if (fn(treeNodes[i], father) === false) {
      // 停止递归
      return false
    }
    if (children && children.length > 0 && (!isModel || !skipNonModel)) {
      if (recursive(children, fn, treeNodes[i], skipNonModel, reverse) === false) {
        // 停止递归
        return false
      }
    }
  }
}
/**
 * 获取节点父类
 * @param {*} node
 * @param {*} tree
 * @returns
 */
export function getParentNode (parkSceneRef, node, tree) {
  const parentNode = parkSceneRef.getNodeByCode(node.parentCode)
  // recursive(tree, (current) => {
  //   if (current.children && current.children.length > 0) {
  //     const index = current.children.findIndex((item) => item.code === node.code)
  //     if (index !== -1) {
  //       parentNode = current
  //       return false
  //     }
  //   }
  // })

  return parentNode
}

// 判断两个数是否在一定范围内相等
function AlmostEqual (x, y) {
  return Math.abs(x - y) < 0.001
}

function getTraySize (parkSceneRef, node) {
  if (!node || !node.children) return null

  const trayModel = node.children.find((item) => {
    return item.codeType === CodeType.TRAY
  })
  if (!trayModel) return null

  const boxSize = parkSceneRef.getBoxSize({ id: trayModel.rootCode, name: trayModel.code })
  if (!boxSize) return null

  boxSize.startX = boxSize.center.x - boxSize.size.x / 2
  boxSize.startZ = boxSize.center.z - boxSize.size.z / 2
  return boxSize
}

/**
 * 调整节点的尺寸
 * @param {*} parkSceneRef 园区场景实例
 * @param {*} node 根节点
 * @param {*} trayModel 根节点下的托盘节点
 * @param {*} orginSize 原始尺寸
 * @param {*} targetSize 目标尺寸
 * @returns 调整后的尺寸
 */
function ExpandNode (parkSceneRef, node, trayModel, orginSize, targetSize) {
  if (node.userData.layout?.autoSize !== false) {
    // 非自定义布局允许调整大小
    const scaleX = targetSize.size.x / orginSize.size.x
    const scaleZ = targetSize.size.z / orginSize.size.z
    trayModel.scale.x *= scaleX
    trayModel.scale.z *= scaleZ
    trayModel.position.x = targetSize.center.x
    trayModel.position.z = targetSize.center.z
  }

  return targetSize
}

/**
 * 调整子节点的尺寸位置（通过调节rootNode的padding和margin配置）
 *
 * @param {*} parkSceneRef 园区场景实例
 * @param {*} rootNode 根节点
 * @param {*} orginSize 原始尺寸
 * @param {*} targetSize 目标尺寸
 * @returns 调整后整个children区域的尺寸
 */
function ExpandChildren (parkSceneRef, rootNode, orginSize, targetSize) {
  console.log(rootNode, orginSize, targetSize, 'rootNode, orginSize, targetSize')
  return targetSize
}

/**
 * 更新当前层级托盘的合适位置和尺寸，使的其与子节点的位置和尺寸相符
 *
 * 算法流程：
 * 1. 递归更新rootNode下, 每个子节点的位置和尺寸
 * 2. 如果父节点与初始位置不一致，调整父节点位置
 * 3. 根据子节点区域与父节点（rootNode）位置尺寸，进行二次调整
 *  3.1 如果子节点区域尺寸大于父节点尺寸，调整rootNode的尺寸
 *  3.2 如果子节点区域尺寸小于父节点尺寸，通过调整padding和放大子节点尺寸进行位置尺寸调整
 * 4. 如果rootNode下面有设备，则相应调整设备位置
 * 5. 返回当前层级托盘的最终位置和尺寸
 *
 * 重要数据结构说明（node.userData.layout）：
 *   .autoSize: 是否自动调整布局大小(true/false)
 *   .autoPosition: 是否自动调整布局位置(true/false)
 *   .direction: 排列方向（leftToRight, topToBottom, rightToLeft, bottomToTop）
 *   .bilateral: 是否支持两侧分布(true/false)  （暂不支持）
 *   .marginHorizontal, .marginVertical: 子节点的左右/上下间距 (子节点与父节点之间的距离，目前也重用该配置，后续有需要再单独配置)
 *
 * node节点的隐含条件：
 *   每个文件夹节点（功能区、SPINE区、LEAF区等），需要包含托盘子节点（TRAY）才能计算实际大小
 *
 * @param {*} parkSceneRef 园区场景实例
 * @param {*} rootNode 当前根节点(包含文件夹节点和托盘节点)
 * @param {*} startX 根节点的起始x坐标
 * @param {*} startZ 根节点的起始z坐标
 * @param {*} changeReason 变更原因 -- 0: 整体变更, 1: 局部变更(托盘内设备位置变更)
 * @returns 当前节点占据的区域范围boxSize: {center:{x,y,z},size:{x,y,z},
 *  updateMode:int -- 0:未更新, 1:位置及大小不变场景需要更新（设备模型位置更新），2:rootNode位置大小有更新}
 */
function UpdateTrayPosition (parkSceneRef, rootNode, startX, startZ, changeReason = 0) {
  if (!FolderType.includes(rootNode.codeType)) {
    console.error('非合法节点：', rootNode)
    return
  }

  console.log('UpdateTrayPosition', rootNode, rootNode.codeName, startX, startZ, changeReason)

  let updateMode = 0 // 位置大小是否有更新
  let containsTray = false // 是否包含托盘
  let traySize = null
  let traySizeInner = null
  let trayModel = null
  let containsModel = false // 是否包含设备模型

  // 判断及获取子节点中的托盘节点和设备模型节点
  rootNode.children.some((node) => {
    if (!containsTray && node.codeType === CodeType.TRAY) {
      containsTray = true
      trayModel = node
      traySize = parkSceneRef.getBoxSize({ id: node.rootCode, name: node.code })
      traySizeInner = parkSceneRef.getBoxSize({ id: node.rootCode, name: ContextEnum['MCYB_A08.01'] })

      return false
    }
    if (!containsModel && node.codeType === CodeType.MODEL) {
      // 判断是否包含设备模型
      containsModel = true
      return true // 跳出循环，前提假定设备模型在托盘之后
    }
    return false
  })

  // 1. 递归更新rootNode下, 每个子节点的位置和尺寸
  let childrenSizeX = 0
  let childrenSizeZ = 0 // 统计整体子节点区域的尺寸
  let nextX = startX
  let nextZ = startZ
  if (containsTray) {
    nextZ += traySize.size.z + rootNode.userData.layout.marginVertical // TODO: 子节点与父节点的间距，后续要考虑两侧分布的情况
  }

  if (changeReason === 0) {
    const nodes = rootNode.children || []
    nodes.forEach((node, index) => {
      if (!FolderType.includes(node.codeType)) return // 跳过非关注节点
      const boxSize = UpdateTrayPosition(parkSceneRef, node, nextX, nextZ)
      if (rootNode.userData.layout.direction === Layout.leftToRight) {
        nextX += boxSize.size.x + rootNode.userData.layout.marginHorizontal
        childrenSizeZ = Math.max(childrenSizeZ, boxSize.size.z)
      } else if (rootNode.userData.layout.direction === Layout.topToBottom) {
        nextZ += boxSize.size.z + rootNode.userData.layout.marginVertical
        childrenSizeX = Math.max(childrenSizeX, boxSize.size.x)
      } else {
        // TODO: 处理其他排列的情况
      }
      updateMode = Math.max(updateMode, boxSize.updateMode)
    })

    if (rootNode.userData.layout.direction === Layout.leftToRight) {
      childrenSizeX = nextX - startX
      if (childrenSizeX > 0) childrenSizeX -= rootNode.userData?.layout?.marginHorizontal // 减去最后一个子节点的间距
    } else if (rootNode.userData.layout.direction === Layout.topToBottom) {
      childrenSizeZ = nextZ - startZ
      if (childrenSizeZ > 0) childrenSizeZ -= rootNode.userData?.layout?.marginVertical // 减去最后一个子节点的间距
    } else {
      // TODO: 处理其他排列的情况
    }
  }
  // 当前占据区域大小
  let childrenBoxSize = {
    center: { x: startX + childrenSizeX / 2, y: 0, z: startZ + childrenSizeZ / 2 },
    size: { x: childrenSizeX, y: 0, z: childrenSizeZ },
    updateMode: updateMode // 标记是否有更新
  }

  if (!containsTray) {
    // rootNode下没有托盘，无需调整
    return childrenBoxSize
  }

  updateMode = Math.min(updateMode, 1) // rootNode自身有托盘时，是否需要向上级追溯更新，由自身托盘更新状态决定

  if (changeReason === 0) {
    // 2. 如果父节点与初始位置不一致，调整父节点位置
    // 判断托盘起始位置
    const trayX = traySize.center.x - traySize.size.x / 2
    const trayZ = traySize.center.z - traySize.size.z / 2
    if (!AlmostEqual(startX, trayX) || !AlmostEqual(startZ, trayZ)) {
      // 托盘位置不正确，需要调整
      trayModel.position.x += startX - trayX
      trayModel.position.z += startZ - trayZ
      updateMode = 2 // 位置有更新
    }

    // 3. 根据子节点区域与父节点（rootNode）位置尺寸，进行二次调整

    // if (rootNode.userData.layout.direction === Layout.leftToRight)
    // 目前除了两侧分布，其他排布方式，子节点都在父节点下方
    if (!AlmostEqual(0, childrenBoxSize.size.x)) {
      // 有子节点才需要调整
      const targetTraySize = {
        center: { x: startX + childrenBoxSize.size.x / 2, y: 0, z: startZ + traySize.size.z / 2 },
        size: { x: childrenBoxSize.size.x, y: 0, z: traySize.size.z }
      }
      if (AlmostEqual(traySize.size.x, childrenBoxSize.size.x)) {
        // 无需调整尺寸位置
      } else if (traySize.size.x < childrenBoxSize.size.x) {
        // 3.1 如果子节点区域尺寸大于父节点尺寸，调整rootNode的尺寸+.
        traySizeInner.size.x *= targetTraySize.size.x / traySize.size.x
        traySizeInner.size.z *= targetTraySize.size.z / traySize.size.z
        traySize = ExpandNode(parkSceneRef, rootNode, trayModel, traySize, targetTraySize)
        updateMode = 2
      } else {
        // 3.2 如果子节点区域尺寸小于父节点尺寸，通过调整padding和放大子节点尺寸进行位置尺寸调整
        // 先判断能否缩小父节点，不行的话再扩展子节点
        const minimalTraySizeX = trayTemSize.size.x * (rootNode.layout.layout?.colCount || 1)
        console.log('minimalTraySizeX=', minimalTraySizeX, childrenBoxSize.size.x, traySize.size.x)

        if (minimalTraySizeX <= childrenBoxSize.size.x) {
          // 父节点尺寸可以缩小
          traySizeInner.size.x *= targetTraySize.size.x / traySize.size.x
          traySizeInner.size.z *= targetTraySize.size.z / traySize.size.z
          traySize = ExpandNode(parkSceneRef, rootNode, trayModel, traySize, targetTraySize)
          updateMode = 2
        } else if (AlmostEqual(traySize.size.x, minimalTraySizeX)) {
          // 父节点尺寸已经不能缩小，无需调整
          // console.log('父节点尺寸已经不能缩小，无需调整')
        } else {
          // 否则，先缩小父节点尺寸，再扩展子节点
          targetTraySize.center.x = startX + minimalTraySizeX / 2
          targetTraySize.size.x = minimalTraySizeX

          console.log('minimalTraySizeX=', minimalTraySizeX, traySize.size.x, targetTraySize.size.x / traySize.size.x)

          traySizeInner.size.x *= targetTraySize.size.x / traySize.size.x
          traySizeInner.size.z *= targetTraySize.size.z / traySize.size.z
          traySize = ExpandNode(parkSceneRef, rootNode, trayModel, traySize, targetTraySize)

          const targetChildrenSize = {
            center: { x: startX + minimalTraySizeX / 2, y: 0, z: startZ + childrenBoxSize.size.z / 2 },
            size: { x: minimalTraySizeX, y: 0, z: childrenBoxSize.size.z }
          }
          childrenBoxSize = ExpandChildren(parkSceneRef, rootNode, childrenBoxSize, targetChildrenSize)
          updateMode = 2
        }
      }
    }
  }
  // 4. 如果rootNode下面有设备模型，则相应调整设备位置
  if (containsModel) {
    if (devicePositionCalculation(parkSceneRef, rootNode, trayModel, traySizeInner)) {
      updateMode = Math.max(updateMode, 1) // 设备位置有更新
    }
  }

  // 5. 返回当前层级托盘的最终位置和尺寸
  const currentBoxSize = {
    center: { x: (traySize.center.x + childrenBoxSize.center.x) / 2, y: 0, z: (traySize.center.z + childrenBoxSize.center.z) / 2 },
    size: { x: traySize.size.x, y: traySize.size.y, z: traySize.size.z + childrenBoxSize.size.z + rootNode.userData.layout.marginVertical },
    updateMode: updateMode
  }

  // console.log('UpdateTrayPosition return', rootNode.codeName, updateMode)
  return currentBoxSize
}

/**
 * 更新完currentNode后，反向更新其父节点parentNode所在区域的位置和尺寸
 *
 * 算法流程：
 * 1. 基于currentNode的位置和尺寸，继续更新父节点的其他子节点的位置和尺寸
 * 2. 更新父节点的位置和尺寸
 * 3. 递归调用父节点的父节点，直到根节点
 *
 * @param {*} parkSceneRef 园区场景实例
 * @param {*} parentNode 父节点
 * @param {*} currentNode 当前节点
 * @param {*} currentTraySize 当前节点的托盘尺寸(用到startX和startZ)
 * @param {*} boxSize 当前节点的占据区域尺寸（用到size.x和size.z）
 */
function ReverseUpdateTrayPosition (parkSceneRef, parentNode, currentNode, currentTraySize, boxSize) {
  console.log('ReverseUpdateTrayPosition', parentNode, currentNode, currentTraySize, boxSize)
  if (!parentNode || !currentNode) return false

  // 1. 基于currentNode的位置和尺寸，继续更新父节点的其他子节点的位置和尺寸
  let nextX = currentTraySize.startX
  let nextZ = currentTraySize.startZ

  if (parentNode.userData.layout.direction === Layout.leftToRight) {
    nextX += boxSize.size.x + parentNode.userData.layout.marginHorizontal
  } else if (parentNode.userData.layout.direction === Layout.topToBottom) {
    nextZ += boxSize.size.z + parentNode.userData.layout.marginVertical
  } else {
    // TODO: 处理其他排列的情况
  }

  const nodes = parentNode.children || []
  let found = false
  nodes.forEach((node, index) => {
    if (node === currentNode) {
      found = true
      return // 跳过当前节点
    }
    if (!found || !FolderType.includes(node.codeType)) return // 跳过非关注节点
    boxSize = UpdateTrayPosition(parkSceneRef, node, nextX, nextZ)
    if (parentNode.userData.layout.direction === Layout.leftToRight) {
      nextX += boxSize.size.x + parentNode.userData.layout.marginHorizontal
    } else if (parentNode.userData.layout.direction === Layout.topToBottom) {
      nextZ += boxSize.size.z + parentNode.userData.layout.marginVertical
    } else {
      // TODO: 处理其他排列的情况
    }
  })

  if (parentNode.userData.layout.direction === Layout.leftToRight) {
    nextX -= parentNode.userData.layout.marginHorizontal
  } else if (parentNode.userData.layout.direction === Layout.topToBottom) {
    nextZ -= parentNode.userData.layout.marginVertical
  } else {
    // TODO: 处理其他排列的情况
  }

  // 2. 更新父节点的位置和尺寸
  let containsTray = false // 是否包含托盘
  let traySize = null
  let traySizeInner = null
  let trayModel = null
  let containsModel = false // 是否包含设备模型

  // 判断及获取子节点中的托盘节点和设备模型节点
  parentNode.children.some((node) => {
    if (!containsTray && node.codeType === CodeType.TRAY) {
      containsTray = true
      trayModel = node
      traySize = parkSceneRef.getBoxSize({ id: node.rootCode, name: node.code })
      traySizeInner = parkSceneRef.getBoxSize({ id: node.rootCode, name: ContextEnum['MCYB_A08.01'] })
      return false
    }
    if (!containsModel && node.codeType === CodeType.MODEL) {
      // 判断是否包含设备模型
      containsModel = true
      return true // 跳出循环，前提假定设备模型在托盘之后
    }
    return false
  })

  let startX = 0
  let startZ = 0
  let targetTraySize = null
  let updateMode = 0 // 位置大小是否有更新

  if (!containsTray) {
    // parentNode下没有托盘, 计算整体区域大小
    targetTraySize = parkSceneRef.getBoxSize({ id: parentNode.rootCode, name: parentNode.code })
    startX = targetTraySize.center.x - targetTraySize.size.x / 2
    startZ = targetTraySize.center.z - targetTraySize.size.z / 2
  } else {
    startX = traySize.center.x - traySize.size.x / 2
    startZ = traySize.center.z - traySize.size.z / 2
    const trayXEend = traySize.center.x + traySize.size.x / 2
    targetTraySize = {
      center: { x: traySize.center.x + (nextX - trayXEend) / 2, y: traySize.center.y, z: traySize.center.z },
      size: { x: traySize.size.x + nextX - trayXEend, y: traySize.size.y, z: traySize.size.z }
    }

    if (AlmostEqual(trayXEend, nextX)) {
      // 无需调整尺寸位置
      console.log('无需调整尺寸位置', parentNode, trayXEend, nextX)
    } else if (trayXEend < nextX) {
      // 子节点大于父节点，需要扩展父节点
      traySizeInner.size.x *= targetTraySize.size.x / traySize.size.x
      traySizeInner.size.z *= targetTraySize.size.z / traySize.size.z
      traySize = ExpandNode(parkSceneRef, parentNode, trayModel, traySize, targetTraySize)
      updateMode = 2
    } else {
      // 子节点小于父节点，先判断能否缩小父节点，不行的话再扩展子节点
      const minimalTraySizeX = trayTemSize.size.x * (parentNode.layout.layout?.colCount || 1)
      console.log('minimalTraySizeX=', minimalTraySizeX)

      if (startX + minimalTraySizeX <= nextX) {
        // 父节点尺寸可以缩小
        traySizeInner.size.x *= targetTraySize.size.x / traySize.size.x
        traySizeInner.size.z *= targetTraySize.size.z / traySize.size.z
        traySize = ExpandNode(parkSceneRef, parentNode, trayModel, traySize, targetTraySize)
        updateMode = 2
      } else if (AlmostEqual(traySize.size.x, minimalTraySizeX)) {
        // 父节点尺寸已经不能缩小，无需调整
        console.log('父节点尺寸已经不能缩小，无需调整')
      } else {
        // 否则，先缩小父节点尺寸，再扩展子节点
        targetTraySize.center.x = startX + minimalTraySizeX / 2
        targetTraySize.size.x = minimalTraySizeX

        traySizeInner.size.x *= targetTraySize.size.x / traySize.size.x
        traySizeInner.size.z *= targetTraySize.size.z / traySize.size.z
        traySize = ExpandNode(parkSceneRef, parentNode, trayModel, traySize, targetTraySize)

        updateMode = 2
        // TODO: 调整子节点位置尺寸
      }
    }

    // 如果parentNode下面有设备模型，则相应调整设备位置
    if (containsModel) {
      if (devicePositionCalculation(parkSceneRef, parentNode, trayModel, traySizeInner)) {
        updateMode = Math.max(updateMode, 1) // 设备位置有更新
      }
    }
  }

  // 3. 递归调用父节点的父节点，直到根节点
  if (updateMode === 2 && parentNode?.parentCode) {
    const newParentNode = parkSceneRef.getNodeByCode(parentNode.parentCode)
    ReverseUpdateTrayPosition(parkSceneRef, newParentNode, parentNode, { startX, startZ }, targetTraySize)
    // TODO: targetTraySize的size.z不准确，无法用于Layout.topToBottom模式，待修复
  }
}

/**
 * 计算及更新托盘位置
 *
 * @param {*} parkSceneRef 园区场景实例
 * @param {*} scene 场景配置
 * @param {*} startNode 起始节点(可能引发变动的节点)
 * @param {*} changeReason 变更原因 -- 0: 整体变更, 1: 局部变更(托盘内设备位置变更)
 * @returns 场景是否需要更新
 */
export function positionCalculation (parkSceneRef, scene, startNode = null, changeReason = 0) {
  console.log('positionCalculation start', startNode, changeReason)
  if (changeReason === null || changeReason === undefined) changeReason = 0

  const areaList = scene.tree[0].children || []
  if (areaList.length === 0) return false

  let updateMode = 0 // 位置大小是否有更新
  let startX = 0
  let startZ = 0
  let traySize = null

  if (startNode) {
    traySize = getTraySize(parkSceneRef, startNode)
    if (traySize) {
      startX = traySize.startX
      startZ = traySize.startZ
    } else {
      console.log('起始节点没有托盘模型', startNode)
      startNode = null // 从根节点开始更新
    }
  }

  const rootNode = startNode || scene.tree[0]

  const boxSize = UpdateTrayPosition(parkSceneRef, rootNode, startX, startZ, changeReason)
  updateMode = boxSize.updateMode
  console.log('positionCalculation, updateMode=', updateMode, rootNode)

  if (updateMode === 2) {
    if (startNode) {
      // 反向更新父节点
      ReverseUpdateTrayPosition(parkSceneRef, getParentNode(parkSceneRef, startNode), startNode, traySize, boxSize)
    }
  }

  // 调整电子围栏
  addRailByModelBox(parkSceneRef, scene)

  console.log('positionCalculation finish')
  return updateMode > 0
}

/**
 * 添加电子围栏及灯光（前提是三维场景已加载好，否则计算大小会有偏差）
 */
export function addRailByModelBox (parkSceneRef, scene) {
  setTimeout(() => {
    const areaList = scene.tree[0].children || []
    parkSceneRef.clearAlarmEffect('电子围栏')
    if (areaList.length > 0) {
      areaList.forEach((area) => {
        parkSceneRef.addRailByModelBox([{
          id: area.rootCode,
          name: area.code
        }])
      })
    }

    // 添加聚光灯
    const traySize = parkSceneRef.getBoxSize({
      id: scene.tree[0].rootCode,
      name: scene.tree[0].code
    })

    if (traySize) {
      const spotLight0 = {
        cameraPosition: { x: traySize.center.x, y: 60, z: traySize.center.z },
        targetPosition: { x: traySize.center.x, y: 18, z: traySize.center.z },
        color: 0xffffff
      }
      const spotLight1 = {
        cameraPosition: { x: traySize.center.x, y: 30, z: traySize.center.z },
        targetPosition: { x: traySize.center.x, y: 18, z: traySize.center.z },
        color: 0xfff5db
      }
      parkSceneRef.removeLight()

      parkSceneRef.addSplotLight('spotLight0', spotLight0.cameraPosition, spotLight0.targetPosition, spotLight0.color, 3, 60, 1, 1, 0, false, false)
      parkSceneRef.addSplotLight('spotLight1', spotLight1.cameraPosition, spotLight1.targetPosition, spotLight1.color, 1.5, 30, 1, 1, 0, false, false)
    }
  }, 200)
}
/**
 * 计算设备和托盘的位置信息
 */
export function devicePositionCalculation (parkSceneRef, node, trayModel, traySizeInner) {
  // 计算当前节点下托盘模型的大小
  if (!node) return false

  let updated = false // 位置是否有更新
  const rowCount = node.layout.layout.rowCount
  const colCount = node.layout.layout.colCount
  if (node.children && node.children.length > 0) {
    const deviceList = node.children.filter((item) => {
      return item.codeType === CodeType.MODEL
    }) || []
    const trayX = traySizeInner.size.x
    const trayZ = traySizeInner.size.z
    deviceList.forEach((it, index) => {
      const trayLeft = -trayX / 2 + trayModel.position.x
      const trayTop = -trayZ / 2 + trayModel.position.z

      const idx = (2 * (index % colCount) + 1)
      //  向上取整
      const idz = (2 * Math.ceil((index + 1) / colCount) - 1)
      const x = trayLeft + (trayX / (2 * colCount)) * idx
      const z = trayTop + (trayZ / (2 * rowCount)) * idz

      // console.log('计算设备位置', it, it.codeName, x, z)
      if (!AlmostEqual(it.position.x, x) || !AlmostEqual(it.position.z, z) || !AlmostEqual(it.position.y, actualTraySize.size.y)) {
        // 位置不正确
        it.position.x = x
        it.position.z = z
        it.position.y = actualTraySize.size.y
        updated = true
      }
    })
  }
  return updated
}
/**
 * 计算托盘缩放比
 * @param {*} parkSceneRef
 * @param {*} arr
 */

export function trayScaleCalculation (layout) {
  if (!layout) return
  const scale = {
    x: 1,
    y: 1,
    z: 1
  }
  scale.x = trayTemSize.size.x * layout.colCount / actualTraySize.size.x
  scale.z = trayTemSize.size.z * layout.rowCount / actualTraySize.size.z
  return scale
}
