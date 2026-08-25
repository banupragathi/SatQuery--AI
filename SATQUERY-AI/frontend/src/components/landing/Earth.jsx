import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Stars, Line } from "@react-three/drei";
import * as THREE from "three";

/*
  Earth.jsx
  =========
  The hero's signature element: a scientific-visualization globe rather than a
  photo-textured planet. This is a deliberate choice -- it needs NO external
  image asset (so it always builds and runs offline, with no broken references
  or CORS risk) and it matches the brief's "scientific visualization / orbital
  geometry / subtle cyan" direction.

  What it renders:
    - a dark navy sphere lit by a single directional "sun" (gives a terminator)
    - a cyan fresnel atmosphere glow around the rim (a tiny custom shader)
    - a latitude/longitude graticule
    - a few glowing surface data points (one amber "active" point)
    - an inclined orbital ring with a small satellite tracing it
    - a depth starfield

  This component assumes it is only mounted when motion is allowed and WebGL
  works; Hero.jsx handles that decision and the static fallback.
*/

// ---- helpers to build graticule circles as arrays of points ----------------
function latitudeCircle(latDeg, radius = 1.001, segments = 96) {
  const lat = (latDeg * Math.PI) / 180;
  const r = Math.cos(lat) * radius;
  const y = Math.sin(lat) * radius;
  const pts = [];
  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * Math.PI * 2;
    pts.push([Math.cos(t) * r, y, Math.sin(t) * r]);
  }
  return pts;
}

function longitudeCircle(lonDeg, radius = 1.001, segments = 96) {
  const lon = (lonDeg * Math.PI) / 180;
  const pts = [];
  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * Math.PI * 2;
    const x = Math.cos(t) * radius;
    const y = Math.sin(t) * radius;
    // rotate the base circle around the Y axis to place the meridian
    pts.push([x * Math.cos(lon), y, x * Math.sin(lon)]);
  }
  return pts;
}

// Convert lat/long to a 3D point on the sphere (for surface markers).
function latLonToVec3(latDeg, lonDeg, radius = 1.02) {
  const lat = (latDeg * Math.PI) / 180;
  const lon = (lonDeg * Math.PI) / 180;
  return [
    Math.cos(lat) * Math.cos(lon) * radius,
    Math.sin(lat) * radius,
    Math.cos(lat) * Math.sin(lon) * radius,
  ];
}

// ---- the globe + graticule + markers --------------------------------------
function Globe() {
  const groupRef = useRef();

  // Slow, sophisticated rotation.
  useFrame((_, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.05;
  });

  // Fresnel atmosphere shader (rim glow). Built once.
  const atmosphere = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uColor: { value: new THREE.Color("#4fd8ee") } },
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
          void main() {
            float fres = pow(1.0 - dot(vNormal, vView), 3.0);
            gl_FragColor = vec4(uColor, fres * 0.85);
          }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        depthWrite: false,
      }),
    []
  );

  const latitudes = useMemo(
    () => [-60, -30, 0, 30, 60].map((d) => latitudeCircle(d)),
    []
  );
  const longitudes = useMemo(
    () => [0, 30, 60, 90, 120, 150].map((d) => longitudeCircle(d)),
    []
  );

  // A few "ground station / data" points. The last one is the active (amber) one.
  const markers = useMemo(
    () => [
      { pos: latLonToVec3(28, 77), active: false }, // ~ N India
      { pos: latLonToVec3(1, 103), active: false }, // ~ SE Asia
      { pos: latLonToVec3(-15, -47), active: false }, // ~ S America
      { pos: latLonToVec3(40, -100), active: false }, // ~ N America
      { pos: latLonToVec3(12, 78), active: true }, // active point
    ],
    []
  );

  return (
    <group ref={groupRef} rotation={[0.35, 0, 0.1]}>
      {/* The planet body. Directional light gives a day/night terminator. */}
      <mesh>
        <sphereGeometry args={[1, 64, 64]} />
        <meshStandardMaterial
          color="#0c1a33"
          emissive="#050c1a"
          roughness={1}
          metalness={0}
        />
      </mesh>

      {/* Atmosphere rim glow. */}
      <mesh scale={1.06}>
        <sphereGeometry args={[1, 48, 48]} />
        <primitive object={atmosphere} attach="material" />
      </mesh>

      {/* Graticule. */}
      {latitudes.map((pts, i) => (
        <Line key={`lat-${i}`} points={pts} color="#2aa7be" lineWidth={0.6} transparent opacity={0.35} />
      ))}
      {longitudes.map((pts, i) => (
        <Line key={`lon-${i}`} points={pts} color="#2aa7be" lineWidth={0.6} transparent opacity={0.28} />
      ))}

      {/* Surface data points. */}
      {markers.map((m, i) => (
        <mesh key={`mk-${i}`} position={m.pos}>
          <sphereGeometry args={[m.active ? 0.02 : 0.014, 12, 12]} />
          <meshBasicMaterial color={m.active ? "#e8a64c" : "#4fd8ee"} />
        </mesh>
      ))}
    </group>
  );
}

// ---- inclined orbit + moving satellite ------------------------------------
function Satellite() {
  const satRef = useRef();
  const orbitRadius = 1.55;

  const ringPoints = useMemo(() => {
    const pts = [];
    for (let i = 0; i <= 128; i++) {
      const t = (i / 128) * Math.PI * 2;
      pts.push([Math.cos(t) * orbitRadius, 0, Math.sin(t) * orbitRadius]);
    }
    return pts;
  }, []);

  useFrame((state) => {
    const t = state.clock.getElapsedTime() * 0.35;
    if (satRef.current) {
      satRef.current.position.set(
        Math.cos(t) * orbitRadius,
        0,
        Math.sin(t) * orbitRadius
      );
    }
  });

  return (
    <group rotation={[Math.PI / 2.6, 0, Math.PI / 8]}>
      <Line points={ringPoints} color="#4c86f5" lineWidth={0.7} transparent opacity={0.35} />
      <mesh ref={satRef}>
        {/* tiny satellite body + a hint of solar panels */}
        <boxGeometry args={[0.05, 0.03, 0.03]} />
        <meshStandardMaterial color="#e9f0fb" emissive="#4fd8ee" emissiveIntensity={0.6} />
      </mesh>
    </group>
  );
}

export default function Earth() {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 0, 3.4], fov: 42 }}
      gl={{ antialias: true, alpha: true }}
      style={{ width: "100%", height: "100%" }}
    >
      <ambientLight intensity={0.25} />
      <directionalLight position={[3, 1.5, 2]} intensity={2.2} color="#fff4e6" />
      <directionalLight position={[-3, -1, -2]} intensity={0.3} color="#4c86f5" />

      <Stars radius={80} depth={40} count={1800} factor={3} fade speed={0.4} />

      <Globe />
      <Satellite />
    </Canvas>
  );
}
