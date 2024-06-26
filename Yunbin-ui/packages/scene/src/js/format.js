import { CodeType, ContextEnum } from './enum'
import { recursive } from './utils'
/**
 * 节点map化
 */
export function listFormatMap (list = [], keyword = '') {
  if (!list) return
  const listMap = new Map()
  list.forEach((node) => {
    const key = node[keyword]
    if (key) {
      listMap.set(key, node)
    }
  })
  return listMap
}

/**
 * 链路数据map化
 */
export function linkFormatMap (linkList) {
  const topoLinkMap = new Map()
  linkList.forEach((link) => {
    const typeMap = new Map()
    if (!link.typeList) return false
    link.typeList.forEach((item) => {
      const portList1 = typeMap.get(item.hostOne) || []
      portList1.push({
        host: item.hostOne,
        port: item.portOne,
        linkHost: item.hostTwo,
        linkPort: item.portTwo
      })
      typeMap.set(item.hostOne, portList1)
      const portList2 = typeMap.get(item.hostTwo) || []
      portList2.push({
        host: item.hostTwo,
        port: item.portTwo,
        linkHost: item.hostOne,
        linkPort: item.portOne
      })
      typeMap.set(item.hostTwo, portList2)
    })
    topoLinkMap.set(link.topoTypeName, typeMap)
  })
  return topoLinkMap
}

/**
 * 设备端口数据格式化
 */
export function formatScenePort (tree, linkList) {
  const topoLinkMap = linkFormatMap(linkList)
  if (topoLinkMap.size > 0) {
    // 递归记录设备链路
    recursive(tree, (node) => {
      if (node.codeType === CodeType.MODEL && node.assetNo && node.codeName) {
        // 获取所有key值
        const topoTypes = topoLinkMap.keys()
        topoTypes.forEach((type) => {
          const linkMap = topoLinkMap.get(type) || new Map()
          if (linkMap.size > 0) {
            const link = linkMap.get(node.codeName) || []
            const linkCount = link.length
            let linkIndex = 0
            if (link.length !== 0) {
              node.children.forEach((item) => {
                if (item.code.includes(ContextEnum.PORT)) {
                  item.linkHost = ''
                  item.linkPort = ''
                  if (linkIndex < linkCount) {
                    item.codeName = link[linkIndex].port
                    item.linkHost = link[linkIndex].linkHost
                    item.linkPort = link[linkIndex].linkPort
                    item.linkType = type
                    linkIndex++
                  }
                }
              })
            }
          }
        })
      }
    })
  }
}
