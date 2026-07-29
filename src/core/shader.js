export class Shader {

  /**
   * @readonly
   * @type {string}
   */
  source

  /**
   * @type {Map<string,string>}
   */
  includes = new Map()

  /**
   * @type {Map<string,string>}
   */
  defines = new Map()
  /**
   * @param {ShaderModuleDescriptor} descriptor 
   */
  constructor({ source }) {
    this.source = source
    this.defines = new Map()
  }

  /**
   * @returns {string}
   */
  compile() {
    const { source, defines, includes } = this
    return preprocessShader(source, includes, defines)
  }
}

const shaderPrecision = [
  "precision mediump float;",
  "precision mediump int;",
  "precision mediump sampler2D;",
  "precision mediump samplerCube;",
  "precision mediump sampler2DArray;"
].join("\n")

/**
 * @typedef ShaderModuleDescriptor
 * @property {string} source
 * @property {Map<string,string>} [defines]
 */

// TODO: Maybe add error as a return type when something unexpected happens
// e.g when an include in the shader does not exist.
/**
 * @param {string} source
 * @param {ReadonlyMap<string,string>} includes 
 * @param {ReadonlyMap<string,string>} defines
 * @returns {string}
 */
function preprocessShader(source, includes, defines) {
  const version = "#version 300 es"
  const mergedDefines = [...defines.entries()]
    .map(([name, value]) => `#define ${name} ${value}`)
    .join("\n")
  const preprocessed = source.replace(/#include <(.*?)>/g, (_, name) => {
    const include = includes.get(name)
    if (!include) {
      console.error(`Could not find the include "${name}"`)
    }
    return include || ""
  })
  return [version, mergedDefines, shaderPrecision, preprocessed]
    .filter(Boolean)
    .join("\n")
}
