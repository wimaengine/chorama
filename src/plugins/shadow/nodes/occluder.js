import { assert } from "../../../utils"
import { PrimitiveTopology } from "../../../constants"
import { WebGLRenderDevice, GPUMesh, Shader } from "../../../core"
import { DirectionalLight, PointLight, SpotLight } from "../../../objects"
import { MeshMaterial3D, Object3D } from "../../../objects"
import { RenderItem, ViewBindGroups, Views, MeshInstanceBindGroups, MeshInstanceUniform } from "../../../renderer/index.js"
import { WebGLRenderer } from "../../../renderer/index"
import { basicVertex } from "../../../shader/index.js"
import { ShadowPipelines } from "../resources"
import { BoneTextureResource } from "../../meshmaterial/resources/index.js"

export class ShadowOccluderNode {
    subgraph() {
        return undefined
    }

    /**
     * @param {import("../../../renderer/graph/index.js").RenderGraphContext} context
     */
    execute(context) {
        const { renderer, renderDevice, objects } = context
        const { caches } = renderer
        const views = renderer.getResource(Views)
        const shadowPipelines = renderer.getResource(ShadowPipelines)
        const boneTexture = renderer.getResource(BoneTextureResource)

        assert(views, "Views resource missing")
        assert(shadowPipelines, "ShadowPipelines resource missing")
        assert(boneTexture, "BoneTextureResource missing")

        const collectedSkins = new Set()

        for (let i = 0; i < objects.length; i++) {
            const object = /**@type {Object3D} */ (objects[i])

            object.traverseDFS((child) => {
                if (!(child instanceof MeshMaterial3D) || !child.skin || child.skin.bones.length === 0 || collectedSkins.has(child.skin)) {
                    return true
                }

                boneTexture.collect(child.skin)
                collectedSkins.add(child.skin)
                return true
            })
        }

        for (const view of views.items()) {
            if (
                view.tag !== DirectionalLight.name &&
                view.tag !== PointLight.name &&
                view.tag !== SpotLight.name
            ) {
                continue
            }

            const opaqueStage = view.opaque

            for (let i = 0; i < objects.length; i++) {
                const object = /**@type {Object3D} */ (objects[i])
                object.traverseDFS((child) => {
                    if (!child.renderMask.test(view.renderMask)) {
                        return true
                    }

                    if (!(child instanceof MeshMaterial3D)) {
                        return true
                    }
                    const gpuMesh = caches.getMesh(renderDevice, child.mesh, renderer.attributes)
                    const pipelineId = getRenderPipelineId(renderDevice, renderer, gpuMesh, shadowPipelines, view)
                    const pipeline = caches.getRenderPipeline(pipelineId)

                    if (!pipeline) {
                        return true
                    }

                    const skinTextureState = child.skin ? boneTexture.getOrAllocate(child.skin) : undefined
                    const meshInstance = new MeshInstanceUniform({
                        transform: child.transform.world,
                        skinIndex: skinTextureState ? skinTextureState.index : 0,
                        boneCount: child.skin?.bones.length ?? 0
                    })
                    const item = new RenderItem({
                        pipelineId,
                        meshInstance,
                        transform: child.transform.world,
                        mesh: gpuMesh,
                        tag: ""
                    })

                    opaqueStage.add(item)
                    return true
                })
            }
        }
    }
}

/**
 * @param {WebGLRenderDevice} device
 * @param {WebGLRenderer} renderer
 * @param {GPUMesh} mesh
 * @param {ShadowPipelines} pipelines
 * @param {import("../../../renderer/index.js").View} view
 * @returns {number}
 */
function getRenderPipelineId(device, renderer, mesh, pipelines, view) {
    const { caches, includes, defines: globalDefines } = renderer
    const sceneBindGroups = renderer.getResource(ViewBindGroups)
    const meshInstanceBindGroups = renderer.getResource(MeshInstanceBindGroups)
    const pipelineid = pipelines.get(mesh.layoutHash)

    assert(sceneBindGroups, "SceneBindGroups resource missing")
    assert(meshInstanceBindGroups, "MeshInstanceBindGroups resource missing")

    if (pipelineid !== undefined) {
        const pipeline = caches.getRenderPipeline(pipelineid)

        assert(pipeline, "Shadow pipeline missing")
        if (!pipeline.layout.getBindGroupLayout(1)) {
            pipeline.layout.setBindGroupLayout(1, meshInstanceBindGroups.getBindGroupLayout(device))
        }

        return pipelineid
    }

    const layout = caches.getMeshVertexLayout(mesh.layoutHash)

    assert(layout, "Invalid mesh layout")
    const object = view.object

    assert(object, "View object missing")
    const sceneBindGroup = sceneBindGroups.getOrSet(device, object)
    assert(sceneBindGroup.layout, "Scene bind group layout missing")
    const vertexShader = new Shader({
        source: basicVertex,
        defines: new Map(globalDefines),
        includes: new Map(includes)
    })

    /**
     * @type {import("../../../core/index.js").WebGLRenderPipelineDescriptor}
     */
    const descriptor = {
        //cullFace:CullFace.None,
        depthWrite: true,
        topology: PrimitiveTopology.Triangles,
        vertexLayout: layout,
        vertex: device.createShaderModule({
            code: vertexShader.compile(),
            stage: "vertex"
        })
    }
    const [, newId] = caches.createRenderPipeline(device, descriptor)
    const pipeline = caches.getRenderPipeline(newId)

    assert(pipeline, "Shadow pipeline missing")
    pipeline.layout.setBindGroupLayout(0, sceneBindGroup.layout)
    pipeline.layout.setBindGroupLayout(1, meshInstanceBindGroups.getBindGroupLayout(device))

    pipelines.set(mesh.layoutHash, newId)
    return newId
}
