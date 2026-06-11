export const waterFilterVertex = `in vec2 aPosition;
out vec2 vTextureCoord;

uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform vec4 uOutputTexture;

vec4 filterVertexPosition( void )
{
    vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;
    
    position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
    position.y = position.y * (2.0*uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;

    return vec4(position, 0.0, 1.0);
}

vec2 filterTextureCoord( void )
{
    return aPosition * (uOutputFrame.zw * uInputSize.zw);
}

void main(void)
{
    gl_Position = filterVertexPosition();
    vTextureCoord = filterTextureCoord();
}
`;

export const waterFilterFragment = `in vec2 vTextureCoord;

out vec4 finalColor;

uniform sampler2D uTexture;
uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uViewOffset;
uniform float uViewScale;

float hash21(vec2 p)
{
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

float noise(vec2 p)
{
    vec2 i = floor(p);
    vec2 f = fract(p);

    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));

    vec2 u = f * f * (3.0 - 2.0 * f);

    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float fbm(vec2 p)
{
    float v = 0.0;
    float a = 0.5;
    vec2 shift = vec2(100.0, 100.0);
    for (int i = 0; i < 4; i++)
    {
        v += a * noise(p);
        p = p * 2.0 + shift;
        a *= 0.5;
    }
    return v;
}

void addWave(
    vec2 p,
    vec2 dir,
    float amp,
    float wavelength,
    float speed,
    float t,
    inout float height,
    inout vec2 dHeight
)
{
    float k = 6.28318530718 / wavelength;
    float phase = k * dot(dir, p) + speed * t;
    float s = sin(phase);
    float c = cos(phase);

    height += amp * s;
    dHeight += (amp * k * c) * dir;
}

void main()
{
    vec2 uv = vTextureCoord;

    vec2 safeRes = max(uResolution, vec2(1.0));
    float t = uTime;

    vec2 screenPos = uv * safeRes;
    float safeScale = max(uViewScale, 0.0001);
    vec2 localPos = (screenPos - uViewOffset) / safeScale;

    const float TILE_HALF_W = 32.0;
    const float TILE_HALF_H = 16.0;

    vec2 pIso = vec2(
        0.5 * ((localPos.x / TILE_HALF_W) + (localPos.y / TILE_HALF_H)),
        0.5 * ((localPos.y / TILE_HALF_H) - (localPos.x / TILE_HALF_W))
    );

    // Keep the facet topology mostly stable (avoid nausea / shimmer):
    // Irregularity is spatial (noise-based), not time-based.
    float densityNoise = noise(pIso * 0.035);
    float density = mix(0.82, 1.02, densityNoise);

    vec2 warp = vec2(
        noise(pIso * 0.06 + vec2(13.7, 9.2)),
        noise(pIso * 0.06 + vec2(-7.1, 21.3))
    );
    warp = (warp - 0.5) * 2.0;
    float warpAmp = 0.045 * mix(0.70, 1.0, noise(pIso * 0.03 + vec2(4.0, -8.0)));

    vec2 pWarp = (pIso * density) + warp * warpAmp;

    float facetSize = 2.10;
    vec2 g = pWarp / facetSize;
    vec2 cell = floor(g);
    vec2 local = fract(g);

    vec2 centroid = vec2(0.5);
    vec2 p = (cell + centroid) * facetSize;

    float edgeDist = min(min(local.x, 1.0 - local.x), min(local.y, 1.0 - local.y));
    float edge = 1.0 - smoothstep(0.0025, 0.0065, edgeDist);

    p += vec2(t * 0.28, t * 0.12);

    float height = 0.0;
    vec2 dHeight = vec2(0.0);

    addWave(p, normalize(vec2(1.0, 0.0)), 0.22, 10.0, 1.00, t, height, dHeight);
    addWave(p, normalize(vec2(0.0, 1.0)), 0.14, 6.0, 1.35, t, height, dHeight);
    addWave(p, normalize(vec2(1.0, 1.0)), 0.10, 4.0, 1.80, t, height, dHeight);
    addWave(p, normalize(vec2(1.0, -1.0)), 0.06, 2.6, 2.30, t, height, dHeight);

    float detail = fbm(p * 0.55 + vec2(-t * 0.20, t * 0.15));
    height += (detail - 0.5) * 0.12;

    vec3 normal = normalize(vec3(-dHeight.x, 1.0, -dHeight.y));

    vec3 viewDir = normalize(vec3(0.0, 0.90, 0.50));
    vec3 lightDir = normalize(vec3(0.40, 1.00, 0.20));

    float ndotl = clamp(dot(normal, lightDir), 0.0, 1.0);
    float fresnel = pow(1.0 - clamp(dot(normal, viewDir), 0.0, 1.0), 3.0);

    vec3 deep = vec3(0.01, 0.07, 0.18);
    vec3 shallow = vec3(0.02, 0.35, 0.48);
    float depthMix = clamp(height * 0.8 + 0.5, 0.0, 1.0);
    vec3 col = mix(deep, shallow, depthMix);

    vec3 halfVec = normalize(lightDir + viewDir);
    float spec = pow(clamp(dot(normal, halfVec), 0.0, 1.0), 96.0);
    col += vec3(1.0) * spec * (0.60 + 0.40 * fresnel);
    col += vec3(0.08, 0.12, 0.15) * fresnel;
    col += vec3(0.02, 0.06, 0.08) * ndotl * 0.35;

    float slope = 1.0 - normal.y;
    float foam = smoothstep(0.18, 0.45, slope) * smoothstep(0.05, 0.25, height + 0.12);
    float foamBreak = noise(p * 1.20 + vec2(t * 0.25, -t * 0.18));
    foam *= smoothstep(0.25, 0.85, foamBreak);
    col = mix(col, vec3(0.90, 0.96, 1.00), foam * 0.75);

    float caustic = fbm(p * 1.80 + vec2(t * 0.60, t * 0.40));
    col += vec3(0.05, 0.12, 0.14) * caustic * ndotl * 0.35;

    float facetJitter = (hash21(cell) - 0.5) * 0.04;
    col *= (1.0 + facetJitter);

    float edgeStrength = mix(0.015, 0.05, smoothstep(0.06, 0.30, slope));
    col *= 1.0 - edge * edgeStrength;

    float vignette = 1.0 - smoothstep(0.35, 0.95, distance(uv, vec2(0.5)) * 1.2);
    col *= vignette;

    col = pow(col, vec3(1.0 / 1.1));

    finalColor = vec4(col, 1.0);
}
`;
