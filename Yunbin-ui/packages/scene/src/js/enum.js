export const LabelTypeEnum = {
  STATIC: 'static',
  PICK: 'pick',
  TOUCH: 'touch',
  SIGNAL: 'signal'
}

export const EventTypeEnum = {
  PICKACTION: 'pickAction',
  PICKLABELACTION: 'pickLabelAction',
  TOUCHACTION: 'touchAction'
}
export const ContextEnum = {
  MCYB_A00: 'MCYB_A00', // 园区
  MCYB_F00_Z: 'MCYB_F00_Z', // 文件夹节点
  'MCYB_A04.03.32_Z': 'MCYB_A04.03.32_Z', // 托盘模型
  'MCYB_A08.01': 'MCYB_A08.01', // 托盘构建
  'MCYB_A04.03.31_M3_Z': 'MCYB_A04.03.31_M3_Z', // 交换机
  PORT: 'MCYB_A04.03.27', // 端口
  PORT_WIRE: 'MCYB_A04.03.02' // 端口接线
}

// 节点类型
export const CodeType = {
  PARK: 'PARK', // 园区节点（场景标题）
  AREA: 'AREA', // 功能区
  SPINE: 'SPINE', // spine 区
  LEAF: 'LEAF', // leaf 区
  NODE: 'NODE', // node 区（主机）
  TRAY: 'TRAY', // 托盘
  CORE: 'CORE', // 核心
  COLLECT: 'COLLECT', // 汇聚
  ACCESS: 'ACCESS', // 接入
  MODEL: 'MODEL' // 设备
}

export const FolderType = [
  CodeType.PARK,
  CodeType.AREA,
  CodeType.SPINE,
  CodeType.LEAF,
  CodeType.CORE,
  CodeType.COLLECT,
  CodeType.ACCESS,
  CodeType.NODE
]

export const Layout = {
  topToBottom: 'topToBottom',
  leftToRight: 'leftToRight',
  rightToLeft: 'rightToLeft',
  bottomToTop: 'bottomToTop'
}

export const DeviceCategoryEnum = {
  PORT: 'Port',
  PORT_WIRE: 'PortWire',
  LINE: 'Line',
  NODE: 'Node',
  LEAF: 'Leaf',
  SPINE: 'Spine',
  LINK_NODE: 'LinkNode-'
}
export const LoadStatusEnum = {
  NONE: 0,
  CPU: 1,
  GPU: 2
}

export const AlertStatusEnum = {
  NORMAL: 0,
  WARN: 1,
  ERROR: 2
}
// 子节点区域：
// spine：leaf、node（主机）
// leaf：node（主机）
// node（主机）：无子集只能添加同级
// 核心：汇聚
// 汇聚：接入
// 接入：只有同级
export const SubNodeType = {
  AREA: [{
    value: CodeType.SPINE,
    name: 'spine'
  }, {
    value: CodeType.LEAF,
    name: 'leaf'
  }, {
    value: CodeType.NODE,
    name: '主机'
  }, {
    value: CodeType.CORE,
    name: '核心'
  }, {
    value: CodeType.COLLECT,
    name: '汇聚'
  }, {
    value: CodeType.ACCESS,
    name: '接入'
  }],
  SPINE: [{
    value: CodeType.LEAF,
    name: 'leaf'
  }, {
    value: CodeType.NODE,
    name: '主机'
  }],
  LEAF: [{
    value: CodeType.NODE,
    name: '主机'
  }], // leaf
  NODE: [], // node主机（无下级区域）
  CORE: [{
    value: CodeType.COLLECT,
    name: '汇聚'
  }, {
    value: CodeType.ACCESS,
    name: '接入'
  }, {
    value: CodeType.NODE,
    name: '主机'
  }], // 核心
  COLLECT: [{
    value: CodeType.ACCESS,
    name: '接入'
  }, {
    value: CodeType.NODE,
    name: '主机'
  }], // 汇聚
  ACCESS: [{
    value: CodeType.NODE,
    name: '主机'
  }] // 接入
}
// 设备模型大小
export const modelSize = {
  size: {
    x: 1.3377475252614786,
    y: 0.3953695758023793,
    z: 0.7539979628171254
  }
}
export const trayTemSize = {
  size: {
    x: 5.710698478010817,
    y: 0.1,
    z: 2.9980755493499127
  }
}
// 托盘模型大小
// 右手坐标系,X轴指向右侧、Y轴指向上方、Z指向屏幕外
// 模型大小

export const actualTraySize = {
  size: {
    x: 5.710698478010817,
    y: 0.1,
    z: 2.9980755493499127
  }
}
