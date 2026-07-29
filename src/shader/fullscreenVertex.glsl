out vec2 v_uv;

  // Fullscreen triangle generated from gl_VertexID.
  //
  // The three vertices form one oversized triangle in UV / position space:
  //
  //        (0, 2)
  //          |\
  //          | \
  //          |  \
  //          |   \
  //   (0, 1)+----+(1, 1)
  //          |    |\
  //          |    | \
  //          |    |  \
  //   (0, 0)+----+---\(2, 0)
  //              (1, 0)
void main() {
  vec2 position = vec2(
    float((gl_VertexID << 1) & 2),
    float(gl_VertexID & 2)
  );

  v_uv = position;
  gl_Position = vec4(position * 2.0 - 1.0, 0.0, 1.0);
}
