import { GUI } from 'dat.gui';
import { addRenderGraphGuiAddon } from "chorama"
import Stats from "stats.js";
import {
  MeshMaterial3D,
  WebGLRenderer,
  TextureLoader,
  PerspectiveProjection,
  Camera,
  WebGLRenderDevice,
  PlaneMeshBuilder,
  MeshMaterialPlugin,
  Material,
  TextureType,
  Texture,
  basicVertex,
  Sampler,
  CanvasTarget,
  CameraPlugin
} from 'chorama';

// Material to view the texture array
class TextureArrayMaterial extends Material {
  /**
   * @param {Texture} image
   */
  constructor(image){
    super()
    this.image = image
    this.layer  = 0
  }

  /**
   * @override
   */
  vertex(){
    return basicVertex
  }

  /**
   * @override
   */
  fragment(){
    return `
    in vec2 v_uv;

    uniform MaterialBlock {
      uint layer;
    };
    uniform sampler2DArray color_image;

    out vec4 fragment_color;

    void main(){
      vec4 sample_color = texture(color_image, vec3(v_uv, layer));
      fragment_color = vec4(sample_color.rgb, 1.0);
    }
    `
  }

  /**
   * @override
   */
  getData(){
    return new Uint32Array([this.layer]).buffer
  }

  /**
   * @override
   * @returns {[string, number, Texture | undefined, Sampler | undefined][]}
   */
  getTextures(){
    return [
      ['color_image',0,this.image, undefined]
    ]
  }
}

const canvas = document.createElement('canvas')
const renderTarget = new CanvasTarget(canvas)
const renderDevice = new WebGLRenderDevice(canvas,{
  depth:true
})
const renderer = new WebGLRenderer({
  renderDevice,
  plugins:[
    new CameraPlugin(),
    new MeshMaterialPlugin(),
  ]
})
const camera = new Camera(renderTarget)
const textureLoader = new TextureLoader()
const texture = textureLoader.load({
  paths: [
    "/images/skybox/miramar_right.png",
    "/images/skybox/miramar_left.png",
    "/images/skybox/miramar_top.png",
    "/images/skybox/miramar_bottom.png",
    "/images/skybox/miramar_back.png",
    "/images/skybox/miramar_front.png",
  ],
  type:TextureType.Texture2DArray
})

const mesh = new PlaneMeshBuilder().build()
const material = new TextureArrayMaterial(texture)

const object1 = new MeshMaterial3D(mesh, material)

camera.transform.position.z = 2
if (camera.projection instanceof PerspectiveProjection) {
  camera.projection.fov = Math.PI / 180 * 120
}

document.body.append(canvas)
updateView()
addEventListener("resize", updateView)
requestAnimationFrame(update)

function update() {
  stats.begin()
  renderer.render([object1, camera], renderDevice)
  stats.end()

  requestAnimationFrame(update)
}

function updateView() {
  canvas.style.width = innerWidth + "px"
  canvas.style.height = innerHeight + "px"
  canvas.width = innerWidth * devicePixelRatio
  canvas.height = innerHeight * devicePixelRatio

  if (camera.projection instanceof PerspectiveProjection) {
    camera.projection.aspect = innerWidth / innerHeight
  }
}
// demo-only GUI controls
const controls = new GUI()
const optFolder = controls.addFolder('Settings')

optFolder.add(material,'layer',0, 5, 1).name('Layer')
optFolder.open()
addRenderGraphGuiAddon({
  gui: controls,
  renderer
})

// demo-only performance monitor
const stats = new Stats()
stats.showPanel(1)
document.body.append(stats.dom)
stats.dom.removeAttribute('style')
stats.dom.classList.add('performance-monitor')
