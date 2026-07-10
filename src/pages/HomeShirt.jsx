import { Canvas } from "@react-three/fiber";
import {
  OrbitControls,
  Environment,
  PresentationControls,
  ContactShadows,
  useGLTF
} from "@react-three/drei";

function Shirt() {

  const { scene } = useGLTF("/models/tshirt.glb");

  return (
    <primitive
      object={scene}
      scale={2.5}
      position={[0,-1,0]}
      rotation={[0,0.5,0]}
    />
  );
}

export default function HomeShirt(){

  return(

    <Canvas camera={{position:[0,0,5],fov:35}}>

      <ambientLight intensity={1.5}/>

      <directionalLight
        position={[5,5,5]}
        intensity={2}
      />

      <PresentationControls
        global
        speed={2}
        rotation={[0,0.3,0]}
        polar={[-0.3,0.3]}
      >

        <Shirt/>

      </PresentationControls>

      <Environment preset="city"/>

      <ContactShadows
        position={[0,-1.5,0]}
        opacity={0.35}
        scale={5}
        blur={2}
      />

      <OrbitControls
        enableZoom={false}
        autoRotate
        autoRotateSpeed={2}
      />

    </Canvas>

  )

}