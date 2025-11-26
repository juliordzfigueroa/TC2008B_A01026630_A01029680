#version 300 es
precision highp float;

in vec3 v_normal;
in vec3 v_surfaceToLight;
in vec3 v_surfaceToView;
in vec4 v_color;
 
// Scene uniforms
uniform vec4 u_ambientLight;
uniform vec4 u_diffuseLight;
uniform vec4 u_specularLight;

// Model uniforms
uniform vec4 u_ambientColor;
uniform vec4 u_diffuseColor;
uniform vec4 u_specularColor;

uniform float u_shininess;

uniform float u_isBuilding;

out vec4 outColor;

void main() {
    // Normal vectors and normalized vectors
    vec3 N = normalize(v_normal);
    vec3 L = normalize(v_surfaceToLight);
    vec3 V = normalize(v_surfaceToView);
    vec3 H = normalize(L + V);

    // CALCULATIONS FOR THE AMBIENT, DIFFUSE and SPECULAR COMPONENTS
    float lambert = max(dot(N, L), 0.0);
    float spec = 0.0;

    if (lambert > 0.0){
        spec = pow(max(dot(N, H), 0.0), u_shininess);
    }

    // If the object is a building

    vec4 baseColor = mix(u_diffuseColor, v_color, u_isBuilding); // Base color of a vertex

    // Compute the three parts of the Phong lighting model
    vec4 ambient  = u_ambientLight  * baseColor;
    vec4 diffuse  = u_diffuseLight  * baseColor * lambert;
    vec4 specular = u_specularLight * u_specularColor * spec;

    vec4 color = ambient + diffuse + specular;
    color.a = 1.0;

    outColor = color;
}