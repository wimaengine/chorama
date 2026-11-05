import { GUI } from "dat.gui"
import Stats from "stats.js"
import {
  AnimationPlayer,
  AnimationPlugin,
  AsepriteLoader,
  Camera,
  CameraPlugin,
  CanvasTarget,
  MeshMaterialPlugin,
  OrthographicProjection,
  PanCamera2DController,
  PlaybackRepeat,
  SpritePlugin,
  Vector2,
  WebGLRenderDevice,
  WebGLRenderer
} from "chorama"

// Starter setup.
const canvas = document.createElement("canvas")
const renderTarget = new CanvasTarget(canvas)
const renderDevice = new WebGLRenderDevice(canvas, {
  depth: true
})
const renderer = new WebGLRenderer({
  renderDevice,
  plugins: [
    new CameraPlugin(),
    new AnimationPlugin(),
    new MeshMaterialPlugin(),
    new SpritePlugin()
  ]
})

const camera = new Camera(renderTarget)
const projection = new OrthographicProjection()
camera.projection = projection
camera.transform.position.z = 1
const cameraControls = new PanCamera2DController(camera, canvas)

const spriteSize = 180
const spriteSpacing = 210
const loader = new AsepriteLoader()

// Sprite sheet definitions.
const spriteSheets = [
  {
    label: "Arcane Mage",
    name: "arcane-mage",
    paths: animationPaths("arcane-mage", ["idle", "run", "walk"])
  },
  {
    label: "Dancer",
    name: "dancer",
    paths: ["/sprite_sheets/dancer/dancer.json"]
  },
  {
    label: "Hooded Blade",
    name: "hooded-blade",
    paths: animationPaths("hooded-blade", ["attack", "idle", "jump", "run"])
  },
  {
    label: "Knight",
    name: "knight",
    paths: animationPaths("knight", ["idle", "run", "walk"])
  },
  {
    label: "Witch",
    name: "witch",
    paths: animationPaths("witch", [
      "idle-down",
      "idle-northeast",
      "idle-right",
      "idle-southeast",
      "idle-up",
      "run-down",
      "run-northeast",
      "run-right",
      "run-southeast",
      "run-up",
      "walk-down",
      "walk-northeast",
      "walk-right",
      "walk-side",
      "walk-southeast",
      "walk-up"
    ])
  }
]

const sprites = spriteSheets.map((definition, index) => loader.load({
  paths: definition.paths,
  name: definition.name,
  postprocessor: (sprite) => {
    sprite.size = new Vector2(spriteSize, spriteSize)
    sprite.transform.position.x = (index - (spriteSheets.length - 1) / 2) * spriteSpacing
  }
}))

document.body.append(canvas)
updateView()
addEventListener("resize", updateView)
requestAnimationFrame(update)

function update() {
  stats.begin()
  cameraControls.update()
  renderer.render([...sprites, camera], renderDevice)
  stats.end()
  requestAnimationFrame(update)
}

function updateView() {
  canvas.style.width = `${innerWidth}px`
  canvas.style.height = `${innerHeight}px`
  canvas.width = innerWidth * devicePixelRatio
  canvas.height = innerHeight * devicePixelRatio

  const aspect = Math.max(innerWidth / Math.max(innerHeight, 1), 0.01)
  const contentWidth = spriteSize + spriteSpacing * (spriteSheets.length - 1)
  const viewHeight = Math.max(spriteSize + 80, contentWidth / aspect)
  const viewWidth = viewHeight * aspect

  projection.left = -viewWidth * 0.5
  projection.right = viewWidth * 0.5
  projection.top = viewHeight * 0.5
  projection.bottom = -viewHeight * 0.5
}

/**
 * @param {string} sheetName
 * @param {string[]} animations
 * @returns {string[]}
 */
function animationPaths(sheetName, animations) {
  return animations.map((animation) => `/sprite_sheets/${sheetName}/${animation}.json`)
}

// GUI.
const controls = new GUI()
const animationCheckDelay = 100
const speedSettings = {
  speed: 1
}
setTimeout(configureAnimations, 0)

/**
 * Waits for every sprite to receive its animation player before creating the
 * controls for all sprite sheets.
 */
function configureAnimations() {
  const animationPlayers = sprites.map((sprite) => getAnimationPlayer(sprite))

  if (animationPlayers.some((player) => !player)) {
    setTimeout(configureAnimations, animationCheckDelay)
    return
  }

  configureSpeedControl(animationPlayers)

  animationPlayers.forEach((animationPlayer, index) => {
    const label = spriteSheets[index]?.label

    if (!animationPlayer || label === undefined) {
      return
    }

    configureAnimation(animationPlayer, label)
  })
}

/**
 * @param {(AnimationPlayer | undefined)[]} animationPlayers
 */
function configureSpeedControl(animationPlayers) {
  controls
    .add(speedSettings, "speed", 0, 2, 0.01)
    .name("Speed")
    .onChange((speed) => setAnimationSpeed(animationPlayers, speed))

  setAnimationSpeed(animationPlayers, speedSettings.speed)
}

/**
 * @param {(AnimationPlayer | undefined)[]} animationPlayers
 * @param {number} speed
 */
function setAnimationSpeed(animationPlayers, speed) {
  animationPlayers.forEach((animationPlayer) => {
    if (!animationPlayer) {
      return
    }

    animationPlayer.animations.forEach((playback) => {
      playback.speed = speed
    })
  })
}

/**
 * @param {import("chorama").Sprite2D} sprite
 * @returns {AnimationPlayer | undefined}
 */
function getAnimationPlayer(sprite) {
  const animationPlayer = sprite.children.find((child) => child instanceof AnimationPlayer)
  return animationPlayer instanceof AnimationPlayer ? animationPlayer : undefined
}

/**
 * @param {AnimationPlayer} animationPlayer
 * @param {string} label
 */
function configureAnimation(animationPlayer, label) {
  const animationNames = [...animationPlayer.clipsByName.keys()].sort()
  const firstAnimation = animationNames[0]

  if (firstAnimation === undefined) {
    return
  }

  animationPlayer.animations.forEach((playback) => {
    playback.repeatMode = PlaybackRepeat.Forever
  })

  const settings = {
    animation: firstAnimation
  }
  const folder = controls.addFolder(label)

  folder
    .add(settings, "animation", animationNames)
    .name("Animation")
    .onChange((name) => selectAnimation(animationPlayer, name))
  folder.open()

  selectAnimation(animationPlayer, firstAnimation)
}

/**
 * @param {AnimationPlayer} animationPlayer
 * @param {string} name
 */
function selectAnimation(animationPlayer, name) {
  const clip = animationPlayer.clipsByName.get(name)

  if (!clip) {
    return
  }

  animationPlayer.stopAll()
  animationPlayer.start(clip)
}

// Demo-only performance monitor.
const stats = new Stats()
stats.showPanel(1)
document.body.append(stats.dom)
stats.dom.removeAttribute("style")
stats.dom.classList.add("performance-monitor")
