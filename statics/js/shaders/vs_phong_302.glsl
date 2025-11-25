#version 300 es
in vec4 a_position; // input | atributos unicos a cada vertice
in vec3 a_normal;

// Scene uniforms
uniform vec3 u_lightWorldPosition; // atributos para todos los vertices
uniform vec3 u_viewWorldPosition;

// Model uniforms
uniform mat4 u_world;
uniform mat4 u_worldInverseTransform;
uniform mat4 u_worldViewProjection;

// Transformed normals
out vec3 v_normal; // output
out vec3 v_surfaceToLight;
out vec3 v_surfaceToView;

void main() {
    // Transform the position of the vertices
    gl_Position = u_worldViewProjection * a_position;

    // Transform the normal vector along with the object
    v_normal = mat3(u_worldInverseTransform) * a_normal;

    // Get world position of the surface
    vec3 surfaceWoldPosition = (u_world * a_position).xyz;


    // Direction from the surface to the light
    v_surfaceToLight = u_lightWorldPosition - surfaceWoldPosition;

    // Direction from the surface to the view
    v_surfaceToView = u_viewWorldPosition - surfaceWoldPosition;
}
