import { useMemo, useRef, useCallback, useEffect, useState } from "react";
import { Canvas, useFrame, useThree, useLoader } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import * as THREE from "three";

/*
  Earth.jsx  —  Photo-realistic textured Earth globe
  ====================================================
  A premium 3D Earth with:
    - Day texture (diffuse map)
    - Night city-lights emissive map (blended on dark side)
    - Topographic bump map for terrain relief
    - Specular ocean sheen map
    - Custom GLSL atmospheric cyan rim glow
    - Transparent cloud layer rotating at offset speed
    - Orbiting satellite with glowing trajectory ring + pulsing telemetry dots
    - Mouse-parallax camera rig for subtle interactive depth

  Textures sourced from Solar System Scope (CC BY 4.0).
  Falls back gracefully if textures fail to load.
*/

// ---------------------------------------------------------------------------
// Custom Earth shader material — blends day/night based on light direction
// ---------------------------------------------------------------------------
function EarthMaterial({ dayMap, nightMap, bumpMap, specMap }) {
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uDayMap: { value: dayMap },
        uNightMap: { value: nightMap },
        uBumpMap: { value: bumpMap },
        uSpecMap: { value: specMap },
        uSunDir: { value: new THREE.Vector3(2.0, 0.8, 1.5).normalize() },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uDayMap;
        uniform sampler2D uNightMap;
        uniform sampler2D uSpecMap;
        uniform vec3 uSunDir;
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPos;

        void main() {
          vec3 normal = normalize(vNormal);
          float NdotL = dot(normal, uSunDir);

          vec3 dayColor = texture2D(uDayMap, vUv).rgb;
          vec3 nightColor = texture2D(uNightMap, vUv).rgb;
          float specMask = texture2D(uSpecMap, vUv).r;

          // Tint the oceans to a brighter, more vibrant blue
          vec3 brightBlue = vec3(0.05, 0.4, 0.9);
          // Mix the original day color with the bright blue where specMask is high (oceans)
          vec3 tintedDay = mix(dayColor, mix(dayColor, brightBlue, 0.65), specMask);

          // Smooth day/night transition
          float blend = smoothstep(-0.12, 0.2, NdotL);

          // Day side gets diffuse lighting — boosted ambient so continents are vivid
          vec3 litDay = tintedDay * (0.45 + 0.65 * max(NdotL, 0.0));

          // Night side shows city lights with boosted emission
          vec3 litNight = nightColor * 2.2;

          vec3 color = mix(litNight, litDay, blend);

          // Specular highlight on oceans
          vec3 viewDir = normalize(cameraPosition - vWorldPos);
          vec3 halfDir = normalize(uSunDir + viewDir);
          float spec = pow(max(dot(normal, halfDir), 0.0), 64.0) * specMask * 0.45;
          color += vec3(0.7, 0.85, 1.0) * spec * blend;

          gl_FragColor = vec4(color, 1.0);
        }
      `,
    });
  }, [dayMap, nightMap, bumpMap, specMap]);

  return <primitive object={material} attach="material" />;
}

// ---------------------------------------------------------------------------
// Atmospheric glow — fresnel-based rim shader
// ---------------------------------------------------------------------------
function Atmosphere() {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: new THREE.Color("#38bdf8") },
          uIntensity: { value: 0.85 },
        },
        vertexShader: `
          varying vec3 vNormal;
          varying vec3 vView;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            vView = normalize(-mv.xyz);
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: `
          varying vec3 vNormal;
          varying vec3 vView;
          uniform vec3 uColor;
          uniform float uIntensity;
          void main() {
            float intensity = pow(0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0);
            intensity = clamp(intensity, 0.0, 1.0) * uIntensity;
            gl_FragColor = vec4(uColor, intensity);
          }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        depthWrite: false,
      }),
    []
  );

  return (
    <mesh scale={1.12}>
      <sphereGeometry args={[1, 64, 64]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

// ---------------------------------------------------------------------------
// Cloud layer — slightly larger, semi-transparent, offset rotation
// ---------------------------------------------------------------------------
function Clouds({ cloudMap }) {
  const ref = useRef();

  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.012;
  });

  return (
    <mesh ref={ref} scale={1.008}>
      <sphereGeometry args={[1, 64, 64]} />
      <meshStandardMaterial
        map={cloudMap}
        transparent
        opacity={0.28}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

// ---------------------------------------------------------------------------
// Orbiting satellite with trajectory ring + pulsing telemetry dots
// All elements use depthTest: false so the orbit line wraps visibly
// around the ENTIRE Earth without vanishing behind the sphere.
// ---------------------------------------------------------------------------
function Satellite() {
  const satRef = useRef();
  const orbitRadius = 1.2;
  const inclination = Math.PI / 3.2;

  // Build orbit ring geometry — a true circular ring around the globe
  const orbitGeometry = useMemo(() => {
    const points = [];
    const segments = 256;
    for (let i = 0; i <= segments; i++) {
      const t = (i / segments) * Math.PI * 2;
      points.push(
        new THREE.Vector3(
          Math.cos(t) * orbitRadius,
          Math.sin(t) * orbitRadius * Math.sin(inclination) * 0.3,
          Math.sin(t) * orbitRadius
        )
      );
    }
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    return geometry;
  }, []);

  // Telemetry dots along orbit
  const dotCount = 12;
  const dotPositions = useMemo(() => {
    const positions = [];
    for (let i = 0; i < dotCount; i++) {
      const t = (i / dotCount) * Math.PI * 2;
      positions.push(
        new THREE.Vector3(
          Math.cos(t) * orbitRadius,
          Math.sin(t) * orbitRadius * Math.sin(inclination) * 0.3,
          Math.sin(t) * orbitRadius
        )
      );
    }
    return positions;
  }, []);

  const dotsRef = useRef([]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime() * 0.3;
    if (satRef.current) {
      const zVal = Math.sin(t);
      satRef.current.position.set(
        Math.cos(t) * orbitRadius,
        zVal * orbitRadius * Math.sin(inclination) * 0.3,
        zVal * orbitRadius
      );
      // Forced perspective scaling: larger in the front, smaller in the back
      const depthScale = 1.0 - (zVal * 0.7);
      satRef.current.scale.setScalar(Math.max(0.2, depthScale));
    }
    // Pulse telemetry dots
    dotsRef.current.forEach((dot, i) => {
      if (dot) {
        const phase = state.clock.getElapsedTime() * 2 + i * 0.8;
        const pulse = 0.3 + 0.7 * Math.abs(Math.sin(phase));
        dot.material.opacity = pulse * 0.6;
        const s = 0.8 + 0.4 * Math.abs(Math.sin(phase));
        dot.scale.setScalar(s);
      }
    });
  });

  return (
    <group rotation={[inclination, 0, Math.PI / 7]} renderOrder={10}>
      {/* Orbit ring — always visible, renders on top of Earth */}
      <line geometry={orbitGeometry} renderOrder={10}>
        <lineBasicMaterial
          color="#38bdf8"
          transparent
          opacity={0.25}
          linewidth={1}
          depthTest={false}
          depthWrite={false}
        />
      </line>

      {/* Telemetry dots — always visible */}
      {dotPositions.map((pos, i) => (
        <mesh
          key={`dot-${i}`}
          ref={(el) => (dotsRef.current[i] = el)}
          position={pos}
          renderOrder={11}
        >
          <sphereGeometry args={[0.012, 8, 8]} />
          <meshBasicMaterial
            color="#38bdf8"
            transparent
            opacity={0.5}
            depthTest={false}
            depthWrite={false}
          />
        </mesh>
      ))}

      {/* Satellite body — always visible, never hidden behind Earth */}
      <group ref={satRef} renderOrder={12}>
        {/* Main spacecraft bus (metallic body) */}
        <mesh renderOrder={12}>
          <boxGeometry args={[0.04, 0.033, 0.033]} />
          <meshStandardMaterial
            color="#dddddd"
            metalness={0.85}
            roughness={0.2}
            depthTest={false}
            depthWrite={false}
          />
        </mesh>

        {/* Gold foil payload module underneath */}
        <mesh position={[0, -0.023, 0]} renderOrder={12}>
          <boxGeometry args={[0.026, 0.013, 0.026]} />
          <meshStandardMaterial
            color="#d4af37"
            metalness={0.7}
            roughness={0.3}
            depthTest={false}
            depthWrite={false}
          />
        </mesh>

        {/* Optical Camera / Sensor down-facing */}
        <mesh position={[0, -0.033, 0]} rotation={[Math.PI / 2, 0, 0]} renderOrder={12}>
          <cylinderGeometry args={[0.008, 0.008, 0.013, 16]} />
          <meshStandardMaterial
            color="#111111"
            roughness={0.1}
            metalness={0.9}
            depthTest={false}
            depthWrite={false}
          />
        </mesh>

        {/* Panel Connectors (horizontal along X-axis) */}
        <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]} renderOrder={12}>
          <cylinderGeometry args={[0.003, 0.003, 0.12, 8]} />
          <meshStandardMaterial
            color="#888888"
            metalness={0.9}
            roughness={0.2}
            depthTest={false}
            depthWrite={false}
          />
        </mesh>

        {/* Left Solar Panel */}
        <mesh position={[-0.07, 0, 0]} renderOrder={12}>
          <boxGeometry args={[0.08, 0.0015, 0.04]} />
          <meshStandardMaterial
            color="#0ea5e9"
            metalness={0.6}
            roughness={0.2}
            emissive="#0284c7"
            emissiveIntensity={0.3}
            depthTest={false}
            depthWrite={false}
          />
        </mesh>

        {/* Right Solar Panel */}
        <mesh position={[0.07, 0, 0]} renderOrder={12}>
          <boxGeometry args={[0.08, 0.0015, 0.04]} />
          <meshStandardMaterial
            color="#0ea5e9"
            metalness={0.6}
            roughness={0.2}
            emissive="#0284c7"
            emissiveIntensity={0.3}
            depthTest={false}
            depthWrite={false}
          />
        </mesh>

        {/* Antenna dish */}
        <mesh position={[0, 0.023, 0]} renderOrder={12}>
          <coneGeometry args={[0.01, 0.02, 16]} />
          <meshStandardMaterial
            color="#ffffff"
            metalness={0.3}
            roughness={0.5}
            depthTest={false}
            depthWrite={false}
          />
        </mesh>

        {/* Antenna Mast */}
        <mesh position={[0, 0.04, 0]} renderOrder={12}>
          <cylinderGeometry args={[0.001, 0.001, 0.026, 8]} />
          <meshStandardMaterial
            color="#aaaaaa"
            metalness={0.8}
            depthTest={false}
            depthWrite={false}
          />
        </mesh>

        {/* Subdued Satellite glow point */}
        <pointLight color="#38bdf8" intensity={0.2} distance={0.5} />
      </group>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Mouse-parallax camera rig
// ---------------------------------------------------------------------------
function CameraRig() {
  const { camera } = useThree();
  const mouse = useRef({ x: 0, y: 0 });
  const target = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      mouse.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.current.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useFrame(() => {
    target.current.x += (mouse.current.x * 0.3 - target.current.x) * 0.05;
    target.current.y += (mouse.current.y * 0.2 - target.current.y) * 0.05;
    camera.position.x = target.current.x;
    camera.position.y = -target.current.y * 0.5;
    camera.lookAt(0, 0, 0);
  });

  return null;
}

// ---------------------------------------------------------------------------
// Main globe group
// ---------------------------------------------------------------------------
function Globe({ dayMap, nightMap, bumpMap, specMap, cloudMap }) {
  const groupRef = useRef();

  useFrame((_, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.04;
  });

  return (
    <group ref={groupRef} rotation={[0.25, -1.2, 0.08]}>
      {/* Earth surface */}
      <mesh>
        <sphereGeometry args={[1, 128, 128]} />
        <EarthMaterial
          dayMap={dayMap}
          nightMap={nightMap}
          bumpMap={bumpMap}
          specMap={specMap}
        />
      </mesh>

      {/* Atmosphere rim glow */}
      <Atmosphere />

      {/* Cloud layer */}
      {cloudMap && <Clouds cloudMap={cloudMap} />}
    </group>
  );
}

// ---------------------------------------------------------------------------
// Texture-loading scene wrapper
// ---------------------------------------------------------------------------
function EarthScene() {
  const loader = new THREE.TextureLoader();
  const [textures, setTextures] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [day, night, bump, spec, clouds] = await Promise.all([
          loader.loadAsync("/textures/earth_day.jpg"),
          loader.loadAsync("/textures/earth_night.jpg"),
          loader.loadAsync("/textures/earth_bump.jpg"),
          loader.loadAsync("/textures/earth_specular.jpg"),
          loader.loadAsync("/textures/earth_clouds.jpg"),
        ]);
        // Set proper color space
        day.colorSpace = THREE.SRGBColorSpace;
        night.colorSpace = THREE.SRGBColorSpace;
        setTextures({ day, night, bump, spec, clouds });
      } catch (err) {
        console.warn("Earth textures could not be loaded, using fallback:", err);
        setTextures(null);
      }
    };
    load();
  }, []);

  return (
    <>
      <ambientLight intensity={0.15} />
      <directionalLight
        position={[4, 1.5, 3]}
        intensity={2.0}
        color="#fff8f0"
      />
      <directionalLight
        position={[-3, -1, -2]}
        intensity={0.15}
        color="#4c86f5"
      />

      <Stars
        radius={80}
        depth={50}
        count={2500}
        factor={3.5}
        fade
        speed={0.3}
      />

      {textures ? (
        <Globe
          dayMap={textures.day}
          nightMap={textures.night}
          bumpMap={textures.bump}
          specMap={textures.spec}
          cloudMap={textures.clouds}
        />
      ) : (
        <FallbackGlobe />
      )}

      <Satellite />
      <CameraRig />
    </>
  );
}

// ---------------------------------------------------------------------------
// Fallback globe (wireframe) if textures fail to load
// ---------------------------------------------------------------------------
function FallbackGlobe() {
  const ref = useRef();
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.04;
  });

  return (
    <group ref={ref} rotation={[0.3, -0.6, 0.08]}>
      <mesh>
        <sphereGeometry args={[1, 64, 64]} />
        <meshStandardMaterial
          color="#0c1a33"
          emissive="#050c1a"
          roughness={1}
          metalness={0}
          wireframe
        />
      </mesh>
      <Atmosphere />
    </group>
  );
}

// ---------------------------------------------------------------------------
// Exported component — the Canvas wrapper
// ---------------------------------------------------------------------------
export default function Earth() {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 0, 3.2], fov: 42 }}
      gl={{
        antialias: true,
        alpha: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        outputColorSpace: THREE.SRGBColorSpace,
      }}
      style={{ width: "100%", height: "100%" }}
    >
      <EarthScene />
    </Canvas>
  );
}
