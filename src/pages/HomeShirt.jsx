import tshirtModel from "../assets/models/tshirt.glb";
import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import {
  OrbitControls,
  Environment,
  PresentationControls,
  ContactShadows,
  useGLTF,
  Center,
} from "@react-three/drei";

function Shirt() {
  
const { scene } = useGLTF(tshirtModel);

  return (
    <Center>
      <primitive object={scene} scale={2.2} rotation={[0, 0.5, 0]} />
    </Center>
  );
}

export default function HomeShirt() {
  return (
    <Canvas
      camera={{ position: [0, 0, 6], fov: 32 }}
      style={{ width: "100%", height: "100%" }}
      dpr={[1, 2]}
    >
      <ambientLight intensity={1.5} />

      <directionalLight position={[5, 5, 5]} intensity={2} />

      <Suspense fallback={null}>
  <PresentationControls
  global
  speed={2}
  rotation={[0, 0.3, 0]}
  polar={[-0.2, 0.2]}
  azimuth={[-Math.PI / 4, Math.PI / 4]}
>
  <Shirt />
</PresentationControls>

        <Environment preset="city" />
      </Suspense>

      <ContactShadows
        position={[0, -1.2, 0]}
        opacity={0.35}
        scale={5}
        blur={2}
      />

      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate
        autoRotateSpeed={2}
      />
    </Canvas>
  );
}

useGLTF.preload(tshirtModel);