#version 300 es
precision highp float;

in vec3 v_normal;
in vec3 v_surfaceToLight;
in vec3 v_surfaceToView;
in vec4 v_color;
in vec3 v_worldPos;
in vec2 v_texCoord;
 
// Scene uniforms
uniform vec4 u_ambientLight;
uniform vec4 u_diffuseLight;
uniform vec4 u_specularLight;

// For textures
uniform sampler2D u_diffuseMap;
uniform int u_useTexture;

// Model uniforms
uniform vec4 u_ambientColor;
uniform vec4 u_diffuseColor;
uniform vec4 u_specularColor;
uniform float u_shininess;

uniform float u_isBuilding;
uniform float u_isTrafficLight;

uniform vec4 u_trafficColor;

const int MAX_TRAFFIC_LIGHTS = 16;
uniform int  u_numTrafficLights;
uniform vec3 u_trafficLightPositions[MAX_TRAFFIC_LIGHTS];
uniform vec3 u_trafficLightColors[MAX_TRAFFIC_LIGHTS];
uniform float u_trafficLightMaxRadius;

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

    vec4 baseDiffuseColor = mix(u_diffuseColor, v_color, u_isBuilding); // Diffuse color for the buildings
    vec4 baseAmbientColor = mix(u_ambientColor, v_color, u_isBuilding); // Ambient color for teh buildings

    // If the object has texture

    if (u_useTexture == 1){
        vec4 tex = texture(u_diffuseMap, v_texCoord);
        baseDiffuseColor *= tex;
        baseAmbientColor *= tex;
    }

    // Compute the three parts of the Phong lighting model
    vec4 ambient  = u_ambientLight  * baseDiffuseColor;
    vec4 diffuse  = u_diffuseLight  * baseAmbientColor * lambert;
    vec4 specular = u_specularLight * u_specularColor * spec;

    vec4 litcolor = ambient + diffuse + specular;

    // For the color that the traffic light emits 
    vec3 pointAccum = vec3(0.0);

    for (int i = 0; i < MAX_TRAFFIC_LIGHTS; i++){
        if (i >= u_numTrafficLights){
            break;
        }

        vec3 lightPos = u_trafficLightPositions[i];
        vec3 lightDir = lightPos - v_worldPos;
        float dist = length(lightDir);
        if (dist > u_trafficLightMaxRadius) {
            continue;
        }

        lightDir = normalize(lightDir);
        float lam = max(dot(N, lightDir), 0.0);

        // For a simple attenuation based on a relative distance
        float x = dist / max(u_trafficLightMaxRadius, 0.001);
        float attenuation = 1.0 - x;
        attenuation *= attenuation; // For smoother atenuation in the object the further they are from the traffic light

        vec3 color = u_trafficLightColors[i];

        float intesity = 0.5; 
        pointAccum += color * lam * attenuation * intesity;
    }

    litcolor.rgb += pointAccum;

    vec4 emissive = u_trafficColor * u_isTrafficLight;
    
    vec4 finalColor = litcolor + emissive ;

    finalColor.a = baseDiffuseColor.a;

    outColor = finalColor;
}