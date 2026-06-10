import { Canvas, useFrame } from "@react-three/fiber";
import {
  ContactShadows,
  Environment,
  Lightformer,
  OrbitControls,
  QuadraticBezierLine,
  RoundedBox,
} from "@react-three/drei";
import { useMemo, useRef, useState, type ReactNode } from "react";
import * as THREE from "three";

/**
 * Scene SPBU 3D: motor dengan bodi transparan, tangki kaca yang terisi
 * bensin "hidup" (permukaan bergelombang, gelembung, percikan), nozzle
 * yang mengikuti kursor dan bisa dicolokkan ke tangki untuk mengisi.
 */
export function Motorbike3D({
  fillFrac,
  targetFrac,
  filling,
  departing,
  bikeKey,
  onFillStart,
  onFillStop,
}: {
  fillFrac: number;
  targetFrac: number;
  filling: boolean;
  /** true saat ronde selesai — motor pergi meninggalkan SPBU */
  departing: boolean;
  /** berubah tiap pelanggan baru — memicu animasi motor datang */
  bikeKey: number;
  onFillStart: () => void;
  onFillStop: () => void;
}) {
  const [overTank, setOverTank] = useState(false);

  return (
    <div className="w-full h-[280px] md:h-[340px] rounded-xl overflow-hidden cursor-none bg-gradient-to-b from-[#dce9fb] via-[#e8f0fb] to-[#cfdcf0]">
      <Canvas
        shadows
        gl={{ localClippingEnabled: true }}
        camera={{ position: [3.6, 2.1, 4.6], fov: 38 }}
        dpr={[1, 2]}
      >
        <fog attach="fog" args={["#dfe8f6", 9, 18]} />
        <ambientLight intensity={0.45} />
        <directionalLight
          position={[4, 7, 4]}
          intensity={1.7}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-left={-5}
          shadow-camera-right={5}
          shadow-camera-top={6}
          shadow-camera-bottom={-4}
          shadow-bias={-0.0004}
        />
        <directionalLight position={[-5, 3, -4]} intensity={0.35} color="#cdd9f5" />

        {/* Refleksi lingkungan dibangkitkan dari panel cahaya — tanpa aset eksternal */}
        <Environment resolution={64}>
          <Lightformer
            intensity={3}
            position={[0, 5, 0]}
            scale={[10, 10, 1]}
            rotation-x={Math.PI / 2}
          />
          <Lightformer intensity={1.6} position={[5, 2, 4]} scale={[6, 3, 1]} color="#ffffff" />
          <Lightformer intensity={1.1} position={[-5, 2, -3]} scale={[6, 3, 1]} color="#cfe0ff" />
        </Environment>

        <GasStationGround />
        <PumpMachine />
        <MovingBike departing={departing} bikeKey={bikeKey}>
          <Scooter
            fillFrac={fillFrac}
            targetFrac={targetFrac}
            filling={filling}
            overTank={overTank}
            setOverTank={setOverTank}
            onFillStart={onFillStart}
            onFillStop={onFillStop}
          />
        </MovingBike>
        <NozzleCursor overTank={overTank} filling={filling} />
        <ContactShadows position={[0, 0.03, 0]} opacity={0.3} scale={9} blur={2.6} far={2.2} />

        {/* Kamera diam — hanya berputar saat pengguna menggeser area kosong */}
        <OrbitControls
          target={[0, 1, 0]}
          enablePan={false}
          enableZoom={false}
          enabled={!overTank && !filling}
          minPolarAngle={0.65}
          maxPolarAngle={1.45}
        />
      </Canvas>
    </div>
  );
}

// ───────────────────────── Konstanta tangki ─────────────────────────
const TANK = { x: 0.05, w: 0.95, h: 0.95, d: 0.6, centerY: 1.3 };
const TANK_BOTTOM = TANK.centerY - TANK.h / 2 + 0.05;
const TANK_INNER_H = TANK.h - 0.12;
const FUEL_W = TANK.w - 0.14;
const FUEL_D = TANK.d - 0.14;
// Posisi nozzle saat "dicolokkan" ke lubang tangki (moncong tepat di tutup)
const NOZZLE_DOCK = new THREE.Vector3(TANK.x - 0.25, 2.42, 0);
// Titik jatuh aliran bensin (relatif grup tangki, segaris moncong nozzle)
const STREAM_X = 0.14;

type FillHandlers = {
  overTank: boolean;
  setOverTank: (v: boolean) => void;
  onFillStart: () => void;
  onFillStop: () => void;
};

// ───────────────────────── Lingkungan SPBU ─────────────────────────

function GasStationGround() {
  return (
    <group>
      <mesh position={[0, -0.02, 0]} receiveShadow>
        <cylinderGeometry args={[4.2, 4.2, 0.04, 56]} />
        <meshStandardMaterial color="#e3eaf6" roughness={0.95} />
      </mesh>
      {/* pelataran pengisian */}
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[4.2, 2.1]} />
        <meshStandardMaterial color="#cfdaeb" roughness={0.9} />
      </mesh>
      {/* garis kuning pelataran */}
      {[-2.0, 2.0].map((x) => (
        <mesh key={x} position={[x, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.1, 2.1]} />
          <meshStandardMaterial color="#f5c84b" roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

function PumpMachine() {
  return (
    <group position={[-1.9, 0, -1.45]} rotation={[0, 0.5, 0]}>
      <mesh position={[0, 0.07, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.95, 0.14, 0.65]} />
        <meshStandardMaterial color="#9aa6b8" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.85, 0]} castShadow>
        <boxGeometry args={[0.78, 1.45, 0.5]} />
        <meshStandardMaterial color="#f5f7fa" roughness={0.35} metalness={0.1} />
      </mesh>
      <mesh position={[0, 1.66, 0]} castShadow>
        <boxGeometry args={[0.84, 0.3, 0.56]} />
        <meshStandardMaterial color="#e5484d" roughness={0.4} />
      </mesh>
      {/* layar */}
      <mesh position={[0, 1.18, 0.26]}>
        <boxGeometry args={[0.5, 0.34, 0.02]} />
        <meshStandardMaterial
          color="#10141c"
          emissive="#1f6f63"
          emissiveIntensity={0.55}
          roughness={0.3}
        />
      </mesh>
      {/* strip merah */}
      <mesh position={[0, 0.62, 0.26]}>
        <boxGeometry args={[0.78, 0.16, 0.02]} />
        <meshStandardMaterial color="#e5484d" roughness={0.5} />
      </mesh>
      {/* gantungan nozzle */}
      <mesh position={[0.42, 1.1, 0]}>
        <boxGeometry args={[0.06, 0.5, 0.3]} />
        <meshStandardMaterial color="#2b2e33" roughness={0.6} />
      </mesh>
    </group>
  );
}

// ───────────────────────── Motor ─────────────────────────

/**
 * Menggerakkan motor: melaju pergi saat ronde selesai (departing),
 * lalu motor pelanggan baru masuk dari kiri saat bikeKey berubah.
 * Roda (group bernama "wheelSpin") ikut berputar sesuai kecepatan.
 */
function MovingBike({
  departing,
  bikeKey,
  children,
}: {
  departing: boolean;
  bikeKey: number;
  children: ReactNode;
}) {
  const ref = useRef<THREE.Group>(null);
  const sim = useRef({
    mode: "idle" as "idle" | "leaving" | "arriving" | "gone",
    x: 0,
    v: 0,
    prevDeparting: departing,
    prevKey: bikeKey,
  });

  useFrame((_, delta) => {
    const s = sim.current;
    const dt = Math.min(delta, 0.05);

    if (departing && !s.prevDeparting) s.mode = "leaving";
    s.prevDeparting = departing;
    if (bikeKey !== s.prevKey) {
      s.prevKey = bikeKey;
      s.x = -7.5;
      s.v = 0;
      s.mode = "arriving";
    }

    if (s.mode === "leaving") {
      s.v = Math.min(s.v + 7 * dt, 6);
      s.x += s.v * dt;
      if (s.x > 7.5) {
        s.mode = "gone";
        s.v = 0;
      }
    } else if (s.mode === "arriving") {
      // ngebut dulu, mengerem halus mendekati pompa
      const remaining = Math.max(-s.x, 0);
      const targetV = Math.min(5, Math.max(0.9, remaining * 2.4));
      s.v = THREE.MathUtils.lerp(s.v, targetV, 0.12);
      s.x += s.v * dt;
      if (s.x >= -0.005) {
        s.x = 0;
        s.v = 0;
        s.mode = "idle";
      }
    }

    const g = ref.current;
    if (!g) return;
    g.position.x = s.x;
    g.visible = s.mode !== "gone";
    // sedikit mengangguk saat berakselerasi/mengerem
    const lean = s.mode === "leaving" ? -0.05 : s.mode === "arriving" ? 0.035 : 0;
    g.rotation.z = THREE.MathUtils.lerp(g.rotation.z, lean, 0.08);
    if (s.v > 0.01) {
      g.traverse((o) => {
        if (o.name === "wheelSpin") o.rotation.z -= (s.v * dt) / 0.48;
      });
    }
  });

  return <group ref={ref}>{children}</group>;
}

function useGlassMaterial() {
  return useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#6f9cf0",
        transparent: true,
        opacity: 0.26,
        roughness: 0.06,
        metalness: 0.05,
        clearcoat: 1,
        clearcoatRoughness: 0.08,
        depthWrite: false,
      }),
    [],
  );
}

function Scooter({
  fillFrac,
  targetFrac,
  filling,
  ...handlers
}: {
  fillFrac: number;
  targetFrac: number;
  filling: boolean;
} & FillHandlers) {
  const glass = useGlassMaterial();
  const chrome = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#cdd5de", metalness: 0.9, roughness: 0.18 }),
    [],
  );
  const dark = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#23262b", roughness: 0.6, metalness: 0.3 }),
    [],
  );

  return (
    <group>
      <Wheel x={-1.25} disc={false} />
      <Wheel x={1.25} disc />

      {/* Spakbor */}
      <mesh position={[1.25, 0.52, 0]} rotation={[0, 0, Math.PI * 0.12]} castShadow>
        <torusGeometry args={[0.43, 0.05, 10, 28, Math.PI * 0.75]} />
        <meshStandardMaterial color="#2e6de9" metalness={0.5} roughness={0.25} />
      </mesh>
      <mesh position={[-1.25, 0.55, 0]} rotation={[0, 0, Math.PI * 0.2]} castShadow>
        <torusGeometry args={[0.43, 0.05, 10, 28, Math.PI * 0.6]} />
        <meshStandardMaterial color="#2e6de9" metalness={0.5} roughness={0.25} />
      </mesh>

      {/* Dek tengah + rangka bawah */}
      <RoundedBox args={[1.1, 0.1, 0.52]} radius={0.04} position={[0.12, 0.58, 0]} castShadow>
        <meshStandardMaterial color="#2b2e33" roughness={0.55} metalness={0.4} />
      </RoundedBox>
      <mesh position={[0.1, 0.46, 0]} rotation={[0, 0, Math.PI / 2]} material={dark}>
        <capsuleGeometry args={[0.05, 1.7, 6, 12]} />
      </mesh>

      {/* Bodi belakang transparan (mesin terlihat di dalam) */}
      <mesh position={[-0.78, 1.04, 0]} scale={[1.45, 0.62, 0.62]} material={glass}>
        <sphereGeometry args={[0.5, 32, 24]} />
      </mesh>
      <mesh position={[-0.7, 0.82, 0]} castShadow material={dark}>
        <boxGeometry args={[0.42, 0.3, 0.3]} />
      </mesh>
      <mesh position={[-0.95, 0.78, 0]} rotation={[0, 0, 0.4]} material={chrome}>
        <cylinderGeometry args={[0.07, 0.07, 0.3, 14]} />
      </mesh>

      {/* Swingarm + knalpot */}
      <mesh position={[-0.95, 0.6, 0.12]} rotation={[0, 0, 0.35]} material={dark}>
        <capsuleGeometry args={[0.035, 0.6, 6, 10]} />
      </mesh>
      <mesh position={[-0.85, 0.42, 0.24]} rotation={[0, 0, 1.62]} castShadow material={chrome}>
        <capsuleGeometry args={[0.065, 0.5, 6, 14]} />
      </mesh>
      <mesh position={[-1.13, 0.39, 0.24]} rotation={[0, 0, Math.PI / 2]} material={dark}>
        <cylinderGeometry args={[0.045, 0.045, 0.06, 12]} />
      </mesh>

      {/* Jok */}
      <RoundedBox
        args={[0.92, 0.17, 0.46]}
        radius={0.07}
        position={[-0.78, 1.42, 0]}
        rotation={[0, 0, 0.07]}
        castShadow
      >
        <meshStandardMaterial color="#1c1e22" roughness={0.85} />
      </RoundedBox>

      {/* Bodi depan transparan + kolom setir */}
      <mesh
        position={[1.02, 1.1, 0]}
        scale={[0.36, 1.12, 0.6]}
        rotation={[0, 0, -0.28]}
        material={glass}
      >
        <sphereGeometry args={[0.5, 32, 24]} />
      </mesh>
      <mesh position={[1.08, 1.16, 0]} rotation={[0, 0, -0.34]} material={dark}>
        <cylinderGeometry args={[0.055, 0.055, 1.05, 14]} />
      </mesh>

      {/* Garpu depan */}
      {[-0.09, 0.09].map((z) => (
        <mesh key={z} position={[1.34, 0.83, z]} rotation={[0, 0, -0.3]} material={chrome}>
          <cylinderGeometry args={[0.032, 0.032, 0.78, 10]} />
        </mesh>
      ))}

      {/* Setang, grip, spion */}
      <mesh position={[1.26, 1.72, 0]} rotation={[Math.PI / 2, 0, 0]} material={dark}>
        <cylinderGeometry args={[0.04, 0.04, 0.8, 14]} />
      </mesh>
      {[-0.37, 0.37].map((z) => (
        <mesh key={z} position={[1.26, 1.72, z]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.055, 0.055, 0.16, 12]} />
          <meshStandardMaterial color="#101214" roughness={0.95} />
        </mesh>
      ))}
      {[-0.2, 0.2].map((z) => (
        <group key={z}>
          <mesh
            position={[1.22, 1.86, z]}
            rotation={[z > 0 ? -0.35 : 0.35, 0, 0.15]}
            material={chrome}
          >
            <cylinderGeometry args={[0.013, 0.013, 0.26, 8]} />
          </mesh>
          <mesh position={[1.2, 1.98, z * 1.45]} scale={[0.5, 1, 1.3]} material={dark}>
            <sphereGeometry args={[0.055, 14, 12]} />
          </mesh>
        </group>
      ))}

      {/* Lampu depan + ring, lampu belakang, plat */}
      <mesh position={[1.44, 1.38, 0]}>
        <sphereGeometry args={[0.1, 24, 20]} />
        <meshStandardMaterial
          color="#ffe7a3"
          emissive="#f5b93d"
          emissiveIntensity={0.9}
          roughness={0.2}
        />
      </mesh>
      <mesh position={[1.47, 1.38, 0]} rotation={[0, Math.PI / 2, 0]} material={chrome}>
        <torusGeometry args={[0.1, 0.018, 10, 24]} />
      </mesh>
      <mesh position={[-1.36, 1.22, 0]}>
        <boxGeometry args={[0.06, 0.09, 0.2]} />
        <meshStandardMaterial
          color="#e5484d"
          emissive="#c43b40"
          emissiveIntensity={0.8}
          roughness={0.3}
        />
      </mesh>
      <mesh position={[-1.38, 1.05, 0]}>
        <boxGeometry args={[0.02, 0.12, 0.22]} />
        <meshStandardMaterial color="#f2f4f7" roughness={0.5} />
      </mesh>

      {/* Tangki kaca + bensin */}
      <FuelTank fillFrac={fillFrac} targetFrac={targetFrac} filling={filling} {...handlers} />
    </group>
  );
}

function Wheel({ x, disc }: { x: number; disc: boolean }) {
  const spokes = useMemo(() => [0, 1, 2, 3, 4].map((i) => (i * Math.PI * 2) / 5), []);
  return (
    <group position={[x, 0.48, 0]}>
      {/* bagian yang ikut berputar saat motor berjalan */}
      <group name="wheelSpin">
        <mesh castShadow>
          <torusGeometry args={[0.34, 0.14, 14, 36]} />
          <meshStandardMaterial color="#17191c" roughness={0.92} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.2, 0.2, 0.1, 24]} />
          <meshStandardMaterial color="#aeb7c2" metalness={0.85} roughness={0.22} />
        </mesh>
        {spokes.map((rot) => (
          <group key={rot} rotation={[0, 0, rot]}>
            <mesh position={[0.15, 0, 0]}>
              <boxGeometry args={[0.3, 0.045, 0.035]} />
              <meshStandardMaterial color="#aeb7c2" metalness={0.8} roughness={0.25} />
            </mesh>
          </group>
        ))}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.07, 0.07, 0.14, 16]} />
          <meshStandardMaterial color="#5c6570" metalness={0.7} roughness={0.3} />
        </mesh>
        {disc && (
          <mesh position={[0, 0, 0.08]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.17, 0.17, 0.015, 24]} />
            <meshStandardMaterial color="#d7dde4" metalness={0.9} roughness={0.35} />
          </mesh>
        )}
      </group>
    </group>
  );
}

// ───────────────────────── Tangki & cairan ─────────────────────────

function FuelTank({
  fillFrac,
  targetFrac,
  filling,
  overTank,
  setOverTank,
  onFillStart,
  onFillStop,
}: {
  fillFrac: number;
  targetFrac: number;
  filling: boolean;
} & FillHandlers) {
  const fuelRef = useRef<THREE.Mesh>(null);
  // Tinggi permukaan (relatif grup tangki) dibagikan ke permukaan/gelembung/percikan
  const surfaceYRef = useRef(TANK_BOTTOM);
  const shownFrac = useRef(0);
  // Cairan = balok membulat penuh yang dipotong bidang kliping tepat di permukaan,
  // jadi sisinya mengikuti lengkung tangki — bukan kotak yang diskala
  const clipPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, -1, 0), TANK_BOTTOM), []);

  useFrame(() => {
    // turun lebih cepat saat dikuras (ganti pelanggan) daripada saat mengisi
    const k = fillFrac < shownFrac.current ? 0.45 : 0.25;
    shownFrac.current = THREE.MathUtils.lerp(shownFrac.current, fillFrac, k);
    const h = TANK_INNER_H * Math.max(shownFrac.current, 0.001);
    surfaceYRef.current = TANK_BOTTOM + h;
    clipPlane.constant = surfaceYRef.current - 0.002;
    if (fuelRef.current) fuelRef.current.visible = shownFrac.current > 0.004;
  });

  const targetY = TANK_BOTTOM + TANK_INNER_H * targetFrac;

  return (
    <group position={[TANK.x, 0, 0]}>
      {/* Badan cairan */}
      <RoundedBox
        ref={fuelRef}
        args={[FUEL_W, TANK_INNER_H + 0.04, FUEL_D]}
        radius={0.09}
        position={[0, TANK_BOTTOM + TANK_INNER_H / 2, 0]}
      >
        <meshPhysicalMaterial
          color="#1d5fe0"
          transparent
          opacity={0.9}
          roughness={0.06}
          clearcoat={0.8}
          clearcoatRoughness={0.15}
          clippingPlanes={[clipPlane]}
          side={THREE.DoubleSide}
        />
      </RoundedBox>

      {/* Permukaan bergelombang */}
      <FuelSurface surfaceYRef={surfaceYRef} shownFrac={shownFrac} filling={filling} />
      <Bubbles surfaceYRef={surfaceYRef} shownFrac={shownFrac} filling={filling} />
      <Splash surfaceYRef={surfaceYRef} filling={filling} />

      {/* Dinding tangki kaca — menyala saat nozzle diarahkan ke sini */}
      <RoundedBox args={[TANK.w, TANK.h, TANK.d]} radius={0.1} position={[0, TANK.centerY, 0]}>
        <meshPhysicalMaterial
          color={overTank ? "#aecbff" : "#dbe7ff"}
          transparent
          opacity={overTank ? 0.3 : 0.16}
          roughness={0.04}
          metalness={0}
          clearcoat={1}
          clearcoatRoughness={0.06}
          depthWrite={false}
        />
      </RoundedBox>

      {/* Area sentuh nozzle (sedikit lebih besar dari tangki) */}
      <mesh
        position={[0, TANK.centerY + 0.08, 0]}
        onPointerOver={() => setOverTank(true)}
        onPointerOut={() => {
          setOverTank(false);
          onFillStop();
        }}
        onPointerDown={(e) => {
          e.stopPropagation();
          onFillStart();
        }}
        onPointerUp={() => onFillStop()}
      >
        <boxGeometry args={[TANK.w + 0.3, TANK.h + 0.45, TANK.d + 0.3]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* Garis target pesanan (cincin merah menyala) */}
      <mesh position={[0, targetY, 0]}>
        <boxGeometry args={[TANK.w + 0.06, 0.022, TANK.d + 0.06]} />
        <meshStandardMaterial
          color="#ff5a5f"
          emissive="#e5484d"
          emissiveIntensity={0.7}
          transparent
          opacity={0.95}
        />
      </mesh>

      {/* Tutup tangki */}
      <mesh position={[0, TANK.centerY + TANK.h / 2 + 0.02, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.06, 20]} />
        <meshStandardMaterial color="#2b2e33" roughness={0.35} metalness={0.7} />
      </mesh>

      {/* Aliran bensin dari nozzle saat mengisi */}
      {filling && <FuelStream surfaceYRef={surfaceYRef} />}
    </group>
  );
}

/** Permukaan cairan: plane bersegmen yang simpul-simpulnya digerakkan gelombang sinus. */
function FuelSurface({
  surfaceYRef,
  shownFrac,
  filling,
}: {
  surfaceYRef: React.MutableRefObject<number>;
  shownFrac: React.MutableRefObject<number>;
  filling: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const geoRef = useRef<THREE.PlaneGeometry>(null);
  const ampRef = useRef(0);

  useFrame(({ clock }) => {
    const mesh = meshRef.current;
    const geo = geoRef.current;
    if (!mesh || !geo) return;
    mesh.visible = shownFrac.current > 0.004;
    mesh.position.y = surfaceYRef.current;

    // Gelombang membesar saat mengisi, mereda perlahan saat berhenti
    ampRef.current = THREE.MathUtils.lerp(ampRef.current, filling ? 0.02 : 0, filling ? 0.2 : 0.04);
    const t = clock.elapsedTime;
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      // riak terkuat di sekitar titik jatuh aliran
      const dx = x - STREAM_X;
      const dist = Math.sqrt(dx * dx + y * y);
      const ripple = Math.sin(dist * 26 - t * 11) * Math.exp(-dist * 4.5);
      const swell = Math.sin(x * 9 + t * 5.2) * 0.35 + Math.sin(y * 11 - t * 6.4) * 0.3;
      pos.setZ(i, ampRef.current * (ripple + swell));
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
  });

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
      <planeGeometry ref={geoRef} args={[FUEL_W, FUEL_D, 22, 14]} />
      <meshPhysicalMaterial
        color="#4f8cf0"
        roughness={0.05}
        clearcoat={1}
        clearcoatRoughness={0.08}
        emissive="#2e6de9"
        emissiveIntensity={0.18}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

/** Gelembung kecil yang naik dari dasar tangki selama pengisian. */
const BUBBLE_COUNT = 18;

function Bubbles({
  surfaceYRef,
  shownFrac,
  filling,
}: {
  surfaceYRef: React.MutableRefObject<number>;
  shownFrac: React.MutableRefObject<number>;
  filling: boolean;
}) {
  const instRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const seeds = useMemo(
    () =>
      Array.from({ length: BUBBLE_COUNT }, () => ({
        x: (Math.random() - 0.5) * (FUEL_W - 0.1),
        z: (Math.random() - 0.5) * (FUEL_D - 0.1),
        speed: 0.25 + Math.random() * 0.45,
        phase: Math.random() * 10,
      })),
    [],
  );
  const strength = useRef(0);

  useFrame(({ clock }) => {
    const inst = instRef.current;
    if (!inst) return;
    strength.current = THREE.MathUtils.lerp(
      strength.current,
      filling ? 1 : 0,
      filling ? 0.18 : 0.06,
    );
    const depth = surfaceYRef.current - TANK_BOTTOM;
    const show = strength.current > 0.02 && shownFrac.current > 0.05;
    inst.visible = show;
    if (!show) return;
    const t = clock.elapsedTime;
    seeds.forEach((s, i) => {
      const travel = ((t * s.speed + s.phase) % 1) * depth;
      const nearTop = travel / depth;
      dummy.position.set(s.x + Math.sin(t * 3 + s.phase) * 0.015, TANK_BOTTOM + travel, s.z);
      const sc = strength.current * (0.5 + 0.5 * (1 - nearTop));
      dummy.scale.setScalar(Math.max(sc, 0.001));
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);
    });
    inst.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={instRef} args={[undefined, undefined, BUBBLE_COUNT]} visible={false}>
      <sphereGeometry args={[0.018, 8, 8]} />
      <meshStandardMaterial color="#bcd6ff" transparent opacity={0.7} roughness={0.1} />
    </instancedMesh>
  );
}

/** Percikan droplet di titik jatuh aliran bensin. */
const SPLASH_COUNT = 26;

type Droplet = { pos: THREE.Vector3; vel: THREE.Vector3; life: number };

function Splash({
  surfaceYRef,
  filling,
}: {
  surfaceYRef: React.MutableRefObject<number>;
  filling: boolean;
}) {
  const instRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const drops = useMemo<Droplet[]>(
    () =>
      Array.from({ length: SPLASH_COUNT }, () => ({
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        life: 0,
      })),
    [],
  );

  useFrame((_, delta) => {
    const inst = instRef.current;
    if (!inst) return;
    const dt = Math.min(delta, 0.05);
    let any = false;
    drops.forEach((d, i) => {
      if (d.life <= 0 && filling) {
        d.pos.set(STREAM_X, surfaceYRef.current + 0.01, 0);
        const a = Math.random() * Math.PI * 2;
        const r = 0.25 + Math.random() * 0.5;
        d.vel.set(Math.cos(a) * r * 0.5, 0.55 + Math.random() * 0.5, Math.sin(a) * r * 0.5);
        d.life = 0.32 + Math.random() * 0.22;
      }
      if (d.life > 0) {
        d.life -= dt;
        d.vel.y -= 4.5 * dt;
        d.pos.addScaledVector(d.vel, dt);
        dummy.position.copy(d.pos);
        dummy.scale.setScalar(Math.max(d.life * 2.4, 0.001) * 0.55);
        any = true;
      } else {
        dummy.scale.setScalar(0.001);
      }
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);
    });
    inst.visible = any;
    inst.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={instRef} args={[undefined, undefined, SPLASH_COUNT]} visible={false}>
      <sphereGeometry args={[0.016, 8, 8]} />
      <meshStandardMaterial color="#8fb8ff" transparent opacity={0.85} roughness={0.1} />
    </instancedMesh>
  );
}

/** Aliran bensin dari moncong nozzle ke permukaan cairan (memendek saat tangki terisi). */
function FuelStream({ surfaceYRef }: { surfaceYRef: React.MutableRefObject<number> }) {
  const outerRef = useRef<THREE.Mesh>(null);
  const innerRef = useRef<THREE.Mesh>(null);
  const TOP = 1.78;

  useFrame(({ clock }) => {
    const len = Math.max(TOP - surfaceYRef.current, 0.05);
    const midY = TOP - len / 2;
    const t = clock.elapsedTime;
    const wobble = Math.sin(t * 30) * 0.004;
    for (const ref of [outerRef, innerRef]) {
      const m = ref.current;
      if (!m) continue;
      m.scale.y = len;
      m.position.set(STREAM_X + wobble, midY, 0);
    }
    if (outerRef.current) {
      const mat = outerRef.current.material as THREE.MeshStandardMaterial;
      mat.opacity = 0.5 + Math.sin(t * 26) * 0.12;
    }
  });

  return (
    <group>
      <mesh ref={outerRef}>
        <cylinderGeometry args={[0.034, 0.05, 1, 10]} />
        <meshStandardMaterial color="#4f8cf0" transparent opacity={0.55} roughness={0.05} />
      </mesh>
      <mesh ref={innerRef}>
        <cylinderGeometry args={[0.015, 0.022, 1, 8]} />
        <meshStandardMaterial color="#bcd6ff" transparent opacity={0.85} roughness={0.05} />
      </mesh>
    </group>
  );
}

// ───────────────────────── Nozzle kursor ─────────────────────────

/**
 * Nozzle SPBU yang mengikuti kursor, tersambung selang ke mesin pompa.
 * Saat diarahkan ke tangki (atau saat mengisi lewat tombol) nozzle
 * "dicolokkan" ke lubang tangki.
 */
function NozzleCursor({ overTank, filling }: { overTank: boolean; filling: boolean }) {
  const ref = useRef<THREE.Group>(null);
  const hoseRef = useRef<{
    setPoints: (s: THREE.Vector3, e: THREE.Vector3, m: THREE.Vector3) => void;
  } | null>(null);
  const seenRef = useRef(false);
  // Bidang di depan tangki tempat nozzle bergerak mengikuti kursor
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), -0.45), []);
  const target = useMemo(() => new THREE.Vector3(), []);
  const hoseStart = useMemo(() => new THREE.Vector3(-1.62, 1.25, -1.25), []);
  const hoseEnd = useMemo(() => new THREE.Vector3(), []);
  const hoseMid = useMemo(() => new THREE.Vector3(), []);

  useFrame((state) => {
    if (!ref.current) return;
    const docked = filling || overTank;
    if (docked) {
      target.copy(NOZZLE_DOCK);
    } else {
      state.raycaster.setFromCamera(state.pointer, state.camera);
      if (!state.raycaster.ray.intersectPlane(plane, target)) return;
      target.x = THREE.MathUtils.clamp(target.x, -2.4, 2.4);
      target.y = THREE.MathUtils.clamp(target.y, 0.35, 2.7);
      target.z = 0.45;
    }
    if (!seenRef.current && (state.pointer.x !== 0 || state.pointer.y !== 0)) {
      seenRef.current = true;
    }
    ref.current.visible = seenRef.current;
    ref.current.position.lerp(target, docked ? 0.22 : 0.55);

    // Selang melengkung dari pompa ke pangkal nozzle
    if (hoseRef.current && seenRef.current) {
      hoseEnd.copy(ref.current.position).add(HOSE_OFFSET);
      hoseMid.lerpVectors(hoseStart, hoseEnd, 0.5);
      hoseMid.y = Math.min(hoseStart.y, hoseEnd.y) - 0.55;
      hoseRef.current.setPoints(hoseStart, hoseEnd, hoseMid);
    }
  });

  return (
    <>
      <group ref={ref} visible={false}>
        {/* pangkal selang di atas gagang */}
        <mesh position={[-0.16, 0.44, 0]}>
          <cylinderGeometry args={[0.042, 0.042, 0.14, 12]} />
          <meshStandardMaterial color="#15171a" roughness={0.8} />
        </mesh>
        {/* gagang hitam (kolom belakang) */}
        <RoundedBox args={[0.09, 0.4, 0.12]} radius={0.02} position={[-0.16, 0.2, 0]} castShadow>
          <meshStandardMaterial color="#1b1d20" roughness={0.75} />
        </RoundedBox>
        {/* penutup biru bersudut khas nozzle otomatis */}
        <RoundedBox args={[0.28, 0.28, 0.18]} radius={0.04} position={[0, 0.06, 0]} castShadow>
          <meshStandardMaterial color="#2050d8" roughness={0.3} metalness={0.15} />
        </RoundedBox>
        <mesh position={[0.12, -0.05, 0]} rotation={[0, 0, 0.6]}>
          <boxGeometry args={[0.2, 0.17, 0.165]} />
          <meshStandardMaterial color="#2050d8" roughness={0.3} metalness={0.15} />
        </mesh>
        <mesh position={[-0.1, 0.21, 0]} rotation={[0, 0, -0.45]}>
          <boxGeometry args={[0.18, 0.12, 0.165]} />
          <meshStandardMaterial color="#2050d8" roughness={0.3} metalness={0.15} />
        </mesh>
        {/* pelindung tuas kotak (rangka U hitam) */}
        <mesh position={[0.03, -0.31, 0]}>
          <boxGeometry args={[0.04, 0.32, 0.09]} />
          <meshStandardMaterial color="#1b1d20" roughness={0.7} />
        </mesh>
        <mesh position={[-0.08, -0.45, 0]}>
          <boxGeometry args={[0.3, 0.04, 0.09]} />
          <meshStandardMaterial color="#1b1d20" roughness={0.7} />
        </mesh>
        <mesh position={[-0.21, -0.24, 0]}>
          <boxGeometry args={[0.04, 0.44, 0.09]} />
          <meshStandardMaterial color="#1b1d20" roughness={0.7} />
        </mesh>
        {/* tuas di dalam pelindung */}
        <mesh position={[-0.05, -0.21, 0]} rotation={[0, 0, 0.45]}>
          <boxGeometry args={[0.22, 0.035, 0.07]} />
          <meshStandardMaterial color="#33363c" roughness={0.5} metalness={0.4} />
        </mesh>
        {/* leher per spiral + moncong krom */}
        <group position={[0.16, -0.14, 0]} rotation={[0, 0, 0.45]}>
          {[0, 1, 2, 3, 4].map((i) => (
            <mesh key={i} position={[0, -0.03 * i, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.05, 0.016, 8, 20]} />
              <meshStandardMaterial color="#c8d0d9" metalness={0.9} roughness={0.25} />
            </mesh>
          ))}
          <mesh position={[0, -0.33, 0]}>
            <cylinderGeometry args={[0.03, 0.036, 0.36, 14]} />
            <meshStandardMaterial color="#d4dbe2" metalness={0.9} roughness={0.15} />
          </mesh>
          <mesh position={[0, -0.51, 0]}>
            <cylinderGeometry args={[0.042, 0.042, 0.06, 14]} />
            <meshStandardMaterial color="#aeb7c2" metalness={0.85} roughness={0.3} />
          </mesh>
        </group>
      </group>
      <QuadraticBezierLine
        // @ts-expect-error drei menambahkan setPoints pada instance Line2
        ref={hoseRef}
        start={[-1.62, 1.25, -1.25]}
        end={[-1.62, 1.25, -1.25]}
        lineWidth={3.5}
        color="#2b2e33"
      />
    </>
  );
}

const HOSE_OFFSET = new THREE.Vector3(-0.16, 0.5, 0);
