import type { ThreeElements } from "@react-three/fiber";

/* React 19 ya no publica el namespace JSX global: R3F v9 pide que la app
   extienda React.JSX.IntrinsicElements con los elementos de Three. */
declare module "react" {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
}

declare global {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
}
