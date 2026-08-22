/** @import { RenderGraphContext } from "./rendergraph.js" */
import { assert } from "../../utils/index.js"
import { View } from "../core/index.js"
import { Views } from "../views.js"
import { ViewUniformBuffer } from "../resources/index.js"
import { snapUp } from "../../math/index.js"

export class SortViewsNode {
  subgraph() {
    return undefined
  }

  /**
   * @param {RenderGraphContext} context
   */
  execute(context) {
    const { renderDevice, renderer } = context
    const views = renderer.getResource(Views)
    const viewUniformBuffer = renderer.getResource(ViewUniformBuffer)

    assert(views, "Views resource missing")
    assert(viewUniformBuffer, "ViewUniformBuffer resource missing")

    const alignment = renderDevice.limits.minUniformBufferOffsetAlignment
    const sorted = views.items()
      .map((view, index) => ({ view, index }))
      .sort((a, b) => {
        const order = a.view.order - b.view.order

        if (order !== 0) {
          return order
        }

        return a.index - b.index
      })
      .map((entry) => entry.view)

    views.clear()
    views.push(...sorted)

    const orderedViews = views.items()
    const stride = snapUp(View.BlockSize, alignment)
    const data = new ArrayBuffer(orderedViews.length * stride)

    for (let i = 0; i < orderedViews.length; i++) {
      const view = /**@type {View}*/(orderedViews[i])
      const payload = view.getData()

      new Uint8Array(data, i * stride, stride).set(new Uint8Array(payload))
    }

    viewUniformBuffer.buffer.data = data
  }
}
