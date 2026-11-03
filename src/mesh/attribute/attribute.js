import { VertexFormat } from '../../constants/index.js'

export class Attribute {

  /**
   * @readonly
   * @type {string}
   */
  name = ''

  /**
   * @readonly
   * @type {number}
   */
  id = 0

  /**
   * @readonly
   * @type {VertexFormat}
   */
  format

  /**
   * @param {string} name
   * @param {number} location
   * @param {VertexFormat} format
   */
  constructor(name, location, format) {
    this.name = name
    this.id = location
    this.format = format
  }

  static Position3D = new Attribute(
    'position3d',
    0,
    VertexFormat.Float32x3
  )

  static Position2D = new Attribute(
    'position2d',
    8,
    VertexFormat.Float32x2
  )

  static UV = new Attribute(
    'uv',
    1,
    VertexFormat.Float32x2
  )

  static UVB = new Attribute(
    'uvb',
    2,
    VertexFormat.Float32x2
  )

  static Normal = new Attribute(
    'normal',
    3,
    VertexFormat.Float32x3
  )

  static Tangent = new Attribute(
    'tangent',
    4,
    VertexFormat.Float32x4
  )

  static Color = new Attribute(
    'color',
    5,
    VertexFormat.Float32x4
  )
  static JointWeight = new Attribute(
    'joint_weight',
    6,
    VertexFormat.Float32x4
  )
  static JointIndex = new Attribute(
    'joint_index',
    7,
    VertexFormat.Uint16x4
  )
}
