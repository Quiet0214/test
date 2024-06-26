export const uuid = () => {
  const str = URL.createObjectURL(new Blob())
  const uuid = str.toString()
  URL.revokeObjectURL(str) // 释放这个url
  return uuid.substring(uuid.lastIndexOf('/') + 1)
}
/**
 * @class ModelNode
 */
export class ModelNode {
  id
  rootCode
  code
  codeName
  codeType
  url
  position
  rotation
  scale
  type
  touchEnable
  isContext
  focusView
  children
  assetNo
  brandCode
  modelCode

  constructor (
    rootCode,
    code,
    codeName,
    codeType,
    url = ''
  ) {
    this.id = uuid()
    this.url = url
    this.code = code
    this.rootCode = rootCode
    this.codeName = codeName
    this.codeType = codeType
    this.position = {
      x: 0.0,
      y: 0.0,
      z: 0.0
    }
    this.rotation = {
      x: 0.0,
      y: 0.0,
      z: 0.0
    }
    this.scale = {
      x: 1,
      y: 1,
      z: 1
    }
    this.isContext = 1
    this.touchEnable = false
    this.type = ''
    this.children = []
    this.focusView = 'default'
    this.assetNo = ''
    this.brandCode = ''
    this.modelCode = ''
    this.layout = {}
  }
}
