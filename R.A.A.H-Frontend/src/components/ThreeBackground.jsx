import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { PerspectiveCamera, Stars, Environment, Text } from "@react-three/drei";
import * as THREE from "three";

function MovingGrid() {
  const gridRef = useRef();
  
  useFrame((state) => {
    if (gridRef.current) {
        // Move the grid towards the camera to simulate forward motion
        gridRef.current.position.z = (state.clock.getElapsedTime() * 10) % 20;
    }
  });

  return (
    <group ref={gridRef}>
      {/* Infinite Floor Grid */}
      <gridHelper 
        args={[200, 100, 0x06b6d4, 0x111827]} 
        position={[0, -2, -50]} 
        rotation={[0, 0, 0]}
      />
      {/* Second grid for density */}
      <gridHelper 
        args={[200, 20, 0x06b6d4, 0x000000]} 
        position={[0, -2.01, -50]} 
        rotation={[0, 0, 0]} 
        material-transparent 
        material-opacity={0.2}
      />
    </group>
  );
}

function RoadLines() {
  const linesRef = useRef();

  useFrame((state) => {
    if (linesRef.current) {
      linesRef.current.position.z = (state.clock.getElapsedTime() * 20) % 20;
    }
  });

  const lineGeo = useMemo(() => new THREE.BoxGeometry(0.5, 0.1, 80), []);
  const lineMat = useMemo(() => new THREE.MeshBasicMaterial({ color: 0x06b6d4 }), []);

  return (
     <group ref={linesRef} position={[0, -1.9, -40]}>
         <mesh geometry={lineGeo} material={lineMat} position={[-10, 0, 0]} />
         <mesh geometry={lineGeo} material={lineMat} position={[10, 0, 0]} />
         
         {/* Center dividing lines - broken */}
         {Array.from({ length: 10 }).map((_, i) => (
             <mesh 
                key={i}
                geometry={new THREE.BoxGeometry(0.2, 0.1, 3)}
                material={new THREE.MeshBasicMaterial({ color: 0xffffff })}
                position={[0, 0, i * -8 + 20]} // Spaced out
             />
         ))}
     </group>
  )
}

function FloatingParticles() {
    const count = 300;
    const mesh = useRef();
    
    // Generate random positions
    const particles = useMemo(() => {
        const temp = [];
        for (let i = 0; i < count; i++) {
            const x = (Math.random() - 0.5) * 100;
            const y = (Math.random() - 0.5) * 50;
            const z = (Math.random() - 0.5) * 100 - 50;
            temp.push({ x, y, z, speed: Math.random() * 0.5 + 0.2 });
        }
        return temp;
    }, []);

    const dummy = useMemo(() => new THREE.Object3D(), []);

    useFrame((state) => {
        particles.forEach((particle, i) => {
            // Move particles towards camera
            particle.z += particle.speed;
            if (particle.z > 20) particle.z = -80; // Reset
            
            dummy.position.set(particle.x, particle.y, particle.z);
            dummy.updateMatrix();
            mesh.current.setMatrixAt(i, dummy.matrix);
        });
        mesh.current.instanceMatrix.needsUpdate = true;
    });

    return (
        <instancedMesh ref={mesh} args={[null, null, count]}>
            <dodecahedronGeometry args={[0.2, 0]} />
            <meshBasicMaterial color="#06b6d4" transparent opacity={0.6} />
        </instancedMesh>
    );
}

function CyberTerrain() {
    return (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.5, -50]}>
            <planeGeometry args={[200, 200, 40, 40]} />
            <meshStandardMaterial 
                wireframe
                color="#0e7490"
                emissive="#083344"
                emissiveIntensity={0.5}
                transparent
                opacity={0.3}
            />
        </mesh>
    )
}


export default function ThreeBackground() {
  return (
    <div className="absolute inset-0 -z-10 bg-black">
      <Canvas>
        <PerspectiveCamera makeDefault position={[0, 2, 10]} fov={75} />
        
        {/* Atmosphere */}
        <fog attach="fog" args={['#000000', 10, 60]} /> 
        <ambientLight intensity={0.5} />
        <spotLight position={[10, 10, 10]} angle={0.3} penumbra={1} intensity={1} color="#06b6d4" />
        
        {/* Dynamic Elements */}
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        <MovingGrid />
        <RoadLines />
        <FloatingParticles />
        <CyberTerrain />
        
        {/* Glitchy Text in distance */}
        <Text 
            position={[0, 5, -40]} 
            fontSize={5} 
            color="#06b6d4" 
            anchorX="center" 
            anchorY="middle"
            fillOpacity={0.1}
        >
            SYSTEM ACTIVE
        </Text>

      </Canvas>
      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent pointer-events-none" />
    </div>
  );
}