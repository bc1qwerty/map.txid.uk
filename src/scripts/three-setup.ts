/**
 * three-setup.ts
 * Imports Three.js and topojson-client from npm packages (bundled by Astro/Vite).
 * Exposes them on window for use by the inline map scripts.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as topojson from 'topojson-client';

// Expose on window for inline scripts
(window as any).__THREE = THREE;
(window as any).__OrbitControls = OrbitControls;
(window as any).topojson = topojson;
