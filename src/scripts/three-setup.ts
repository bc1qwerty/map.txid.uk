/**
 * three-setup.ts
 * Imports Three.js and topojson-client from npm packages (bundled by Astro/Vite).
 * Exposes them on window for use by the inline map scripts.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import * as topojson from 'topojson-client';

// Expose on window for inline scripts
(window as any).__THREE = THREE;
(window as any).__OrbitControls = OrbitControls;
(window as any).__Line2 = Line2;
(window as any).__LineMaterial = LineMaterial;
(window as any).__LineGeometry = LineGeometry;
(window as any).topojson = topojson;
