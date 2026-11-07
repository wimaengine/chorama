import { GUI } from "dat.gui"
import Stats from "stats.js"
import {
  AnimationPlayer,
  AnimationPlugin,
  Camera,
  CameraPlugin,
  CanvasTarget,
  MeshMaterialPlugin,
  OrthographicProjection,
  PanCamera2DController,
  PlaybackRepeat,
  Spine2DLoader,
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
    new MeshMaterialPlugin()
  ]
})

const camera = new Camera(renderTarget)
const projection = new OrthographicProjection()
camera.projection = projection
camera.transform.position.x = 64
camera.transform.position.y = 445
// Spine slot order is represented by mesh zIndex values, so keep every slot
// in front of the camera.
camera.transform.position.z = 100

const cameraControls = new PanCamera2DController(camera, canvas)
cameraControls.minZoom = 0.5
cameraControls.maxZoom = 3

const loader = new Spine2DLoader()
const darkKnight = loader.load({
  paths: [
    "/models/spine/dark_knight/main.json",
    "/models/spine/dark_knight/main.atlas"
  ],
  name: "Dark Knight"
})

document.body.append(canvas)
updateView()
addEventListener("resize", updateView)
requestAnimationFrame(update)

function update() {
  stats.begin()
  cameraControls.update()
  renderer.render([darkKnight, camera], renderDevice)
  stats.end()
  requestAnimationFrame(update)
}

function updateView() {
  const aspect = Math.max(innerWidth / Math.max(innerHeight, 1), 0.01)
  const viewHeight = 1050
  const viewWidth = viewHeight * aspect
  projection.left = -viewWidth * 0.5
  projection.right = viewWidth * 0.5
  projection.top = viewHeight * 0.5
  projection.bottom = -viewHeight * 0.5
}

// GUI.
const controls = new GUI()
const animationSettings = {
  animation: "",
  speed: 1,
  repeat: "Loop",
  paused: false,
  restart: () => {
    if (animationPlayer) {
      selectAnimation(animationPlayer, animationSettings.animation)
    }
  }
}

/** @type {AnimationPlayer | undefined} */
let animationPlayer
const animationCheckDelay = 100
setTimeout(configureAnimationControls, 0)

function configureAnimationControls() {
  const player = getAnimationPlayer(darkKnight)

  if (!player) {
    setTimeout(configureAnimationControls, animationCheckDelay)
    return
  }

  registerAnimations(player)
  const animationNames = [...player.clipsByName.keys()].sort()
  const firstAnimation = animationNames.includes("Idle")
    ? "Idle"
    : animationNames[0]

  if (!firstAnimation) {
    setTimeout(configureAnimationControls, animationCheckDelay)
    return
  }

  animationPlayer = player
  animationSettings.animation = firstAnimation

  const folder = controls.addFolder("Animation")
  folder
    .add(animationSettings, "animation", animationNames)
    .name("Animation")
    .onChange((name) => selectAnimation(player, name))
  folder
    .add(animationSettings, "speed", 0, 2, 0.01)
    .name("Speed")
    .onChange((speed) => setAnimationSpeed(player, speed))
  folder
    .add(animationSettings, "repeat", ["Once", "Loop"])
    .name("Repeat")
    .onChange((repeat) => setRepeatMode(player, repeat))
  folder
    .add(animationSettings, "paused")
    .name("Paused")
    .onChange((paused) => setAnimationPaused(player, paused))
  folder.add(animationSettings, "restart").name("Restart")
  folder.open()

  selectAnimation(player, firstAnimation)
}

/**
 * Registers every clip so the GUI can switch between them at runtime.
 *
 * @param {AnimationPlayer} player
 */
function registerAnimations(player) {
  player.clipsByName.forEach((clip) => {
    player.set(clip, {
      repeatMode: PlaybackRepeat.Forever
    })
  })
}

/**
 * @param {import("chorama").Object2D} object
 * @returns {AnimationPlayer | undefined}
 */
function getAnimationPlayer(object) {
  const player = object.children.find((child) => child instanceof AnimationPlayer)
  return player instanceof AnimationPlayer ? player : undefined
}

/**
 * @param {AnimationPlayer} player
 * @param {string} name
 */
function selectAnimation(player, name) {
  const clip = player.clipsByName.get(name)
  if (!clip) {
    return
  }

  player.stopAll()
  const playback = player.get(clip)
  if (!playback) {
    return
  }

  playback.repeatMode = getRepeatMode(animationSettings.repeat)
  playback.speed = animationSettings.speed
  playback.start()

  if (animationSettings.paused) {
    playback.pause()
  }
}

/**
 * @param {AnimationPlayer} player
 * @param {number} speed
 */
function setAnimationSpeed(player, speed) {
  player.animations.forEach((playback) => {
    playback.speed = speed
  })
}

/**
 * @param {AnimationPlayer} player
 * @param {string} repeat
 */
function setRepeatMode(player, repeat) {
  const mode = getRepeatMode(repeat)
  player.animations.forEach((playback) => {
    playback.repeatMode = mode
  })
}

/**
 * @param {AnimationPlayer} player
 * @param {boolean} paused
 */
function setAnimationPaused(player, paused) {
  const clip = player.clipsByName.get(animationSettings.animation)
  const playback = clip ? player.get(clip) : undefined

  if (!playback) {
    return
  }

  if (paused) {
    playback.pause()
  } else {
    playback.play()
  }
}

/**
 * @param {string} repeat
 * @returns {number}
 */
function getRepeatMode(repeat) {
  return repeat === "Once" ? PlaybackRepeat.None : PlaybackRepeat.Forever
}

// Demo-only performance monitor.
const stats = new Stats()
stats.showPanel(1)
document.body.append(stats.dom)
stats.dom.removeAttribute("style")
stats.dom.classList.add("performance-monitor")
