import * as THREE from "./vendor/three.module.min.js";

const TAU = Math.PI * 2;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function lerp(start, end, amount) {
  return start + (end - start) * amount;
}

function smoothstep(edge0, edge1, value) {
  const amount = clamp((value - edge0) / (edge1 - edge0 || 1), 0, 1);
  return amount * amount * (3 - 2 * amount);
}

function createLineMaterial(color, opacity) {
  return new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
}

function createBackdropMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 }
    },
    vertexShader: `
      varying vec2 vUv;

      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      varying vec2 vUv;

      void main() {
        vec2 uv = vUv * 2.0 - 1.0;
        float radial = smoothstep(1.08, 0.12, dot(uv, uv));
        float gridX = 1.0 - smoothstep(0.0, 0.016, abs(fract((uv.x + 1.0) * 10.0 + uTime * 0.04) - 0.5));
        float gridY = 1.0 - smoothstep(0.0, 0.016, abs(fract((uv.y + 1.0) * 10.0) - 0.5));
        float sweep = sin((uv.x * 2.1 - uv.y * 3.2) + uTime * 0.22) * 0.5 + 0.5;
        vec3 color = vec3(0.02, 0.05, 0.11) * radial * 0.86;
        color += vec3(0.07, 0.18, 0.32) * radial * 0.16;
        color += vec3(0.18, 0.52, 0.86) * radial * sweep * 0.08;
        color += vec3(0.46, 0.75, 1.0) * radial * (gridX + gridY) * 0.02;
        gl_FragColor = vec4(color, radial * 0.66);
      }
    `
  });
}

function createGlowMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uIntensity: { value: 0 }
    },
    vertexShader: `
      varying vec2 vUv;

      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uIntensity;
      varying vec2 vUv;

      void main() {
        vec2 uv = vUv * 2.0 - 1.0;
        float radius = length(uv);
        float core = smoothstep(0.9, 0.0, radius);
        float halo = smoothstep(1.3, 0.2, radius);
        float ring = smoothstep(0.3, 0.28, abs(radius - (0.42 + sin(uTime * 1.8) * 0.016)));
        vec3 color = vec3(0.03, 0.1, 0.22) * halo * 0.46;
        color += vec3(0.08, 0.32, 0.68) * core * 0.18;
        color += vec3(0.5, 0.84, 1.0) * ring * (0.06 + uIntensity * 0.12);
        float alpha = clamp(core * 0.09 + halo * 0.05 + ring * 0.05, 0.0, 0.16);
        gl_FragColor = vec4(color, alpha);
      }
    `
  });
}

function createRingGeometry(radius, scaleY, segments) {
  const points = [];

  for (let index = 0; index <= segments; index += 1) {
    const angle = (index / segments) * TAU;
    points.push(new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius * scaleY, 0));
  }

  return new THREE.BufferGeometry().setFromPoints(points);
}

function createParticleFieldGeometry(count) {
  const positions = new Float32Array(count * 3);
  const scales = new Float32Array(count);
  const angles = new Float32Array(count);
  const radii = new Float32Array(count);
  const heights = new Float32Array(count);

  for (let index = 0; index < count; index += 1) {
    const radius = 0.34 + Math.random() * 1.16;
    const angle = Math.random() * TAU;
    const height = (Math.random() - 0.5) * 1.58;

    radii[index] = radius;
    angles[index] = angle;
    heights[index] = height;
    scales[index] = 1 + Math.random() * 1.6;

    positions[index * 3] = Math.cos(angle) * radius;
    positions[index * 3 + 1] = height;
    positions[index * 3 + 2] = Math.sin(angle) * radius * 0.42;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aScale", new THREE.BufferAttribute(scales, 1));
  geometry.userData = {
    baseRadii: radii,
    baseAngles: angles,
    baseHeights: heights
  };

  return geometry;
}

function createParticleMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uIntensity: { value: 0 }
    },
    vertexShader: `
      attribute float aScale;
      uniform float uTime;
      uniform float uIntensity;

      varying float vAlpha;

      void main() {
        vec3 transformed = position;
        float ripple = sin(uTime * 1.8 + transformed.y * 3.2 + transformed.x * 5.2) * 0.018;
        transformed.z += ripple;
        vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
        gl_PointSize = (2.6 + aScale * 2.2 + uIntensity * 2.2) * (320.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
        vAlpha = 0.38 + aScale * 0.16 + uIntensity * 0.16;
      }
    `,
    fragmentShader: `
      varying float vAlpha;

      void main() {
        vec2 uv = gl_PointCoord * 2.0 - 1.0;
        float mask = 1.0 - smoothstep(0.2, 1.0, dot(uv, uv));
        vec3 color = mix(vec3(0.48, 0.78, 1.0), vec3(1.0), mask * 0.5);
        gl_FragColor = vec4(color, mask * vAlpha);
      }
    `
  });
}

export function createCoreStageRenderer(stage, canvas, options = {}) {
  const media = stage.querySelector("[data-core-stage-flow]");
  const shell = stage.querySelector(".core-orbital-shell");
  const pointer = {
    currentX: 0,
    currentY: 0,
    currentIntensity: 0,
    targetX: 0,
    targetY: 0,
    targetIntensity: 0
  };

  const state = {
    width: 0,
    height: 0,
    dpr: 1,
    frameId: 0,
    resizeObserver: null,
    disposed: false,
    interactive: Boolean(options.interactive),
    reducedMotion: Boolean(options.reducedMotion),
    coarsePointer: Boolean(options.coarsePointer),
    renderer: null,
    scene: null,
    camera: null,
    materials: [],
    geometries: [],
    root: null,
    backdrop: null,
    glow: null,
    rings: [],
    particles: null
  };

  function trackMaterial(material) {
    state.materials.push(material);
    return material;
  }

  function trackGeometry(geometry) {
    state.geometries.push(geometry);
    return geometry;
  }

  function setStageGlow({
    stageX = 52,
    stageY = 48,
    shellX = 50,
    shellY = 48,
    intensity = 0,
    pullX = 0,
    pullY = 0
  } = {}) {
    const shiftX = pullX * 0.84;
    const shiftY = pullY * 0.68;
    const tiltX = pullX * 1.0;
    const tiltY = pullY * -0.9;
    const rearDriftX = pullX * (8 + intensity * 14);
    const rearDriftY = pullY * (6 + intensity * 10);
    const ringPull = pullX * 10.5 - pullY * 3.2;

    stage.style.setProperty("--stage-glow-x", `${stageX.toFixed(2)}%`);
    stage.style.setProperty("--stage-glow-y", `${stageY.toFixed(2)}%`);
    stage.style.setProperty("--cursor-x", `${stageX.toFixed(2)}%`);
    stage.style.setProperty("--cursor-y", `${stageY.toFixed(2)}%`);
    stage.style.setProperty("--cursor-opacity", intensity > 0.06 ? (0.03 + intensity * 0.08).toFixed(2) : "0");
    stage.style.setProperty("--cursor-scale", `${(1 + intensity * 0.12).toFixed(3)}`);
    stage.style.setProperty("--flow-glow-opacity", `${(0.05 + intensity * 0.12).toFixed(2)}`);
    stage.style.setProperty("--stage-shift-x", `${shiftX.toFixed(2)}px`);
    stage.style.setProperty("--stage-shift-y", `${shiftY.toFixed(2)}px`);
    stage.style.setProperty("--stage-tilt-x", `${tiltX.toFixed(2)}deg`);
    stage.style.setProperty("--stage-tilt-y", `${tiltY.toFixed(2)}deg`);
    stage.style.setProperty("--core-shift-x", `${(shiftX * 0.32).toFixed(2)}px`);
    stage.style.setProperty("--core-shift-y", `${(shiftY * 0.28).toFixed(2)}px`);
    stage.style.setProperty("--core-halo-scale", `${(1 + intensity * 0.035).toFixed(3)}`);
    stage.style.setProperty("--core-shell-highlight-x", `${(24 + shellX * 0.52).toFixed(2)}%`);
    stage.style.setProperty("--core-shell-highlight-y", `${(18 + shellY * 0.4).toFixed(2)}%`);
    stage.style.setProperty("--detail-highlight-x", `${(24 + shellX * 0.52).toFixed(2)}%`);
    stage.style.setProperty("--detail-highlight-y", `${(18 + shellY * 0.4).toFixed(2)}%`);
    stage.style.setProperty("--rear-drift-x", `${rearDriftX.toFixed(2)}px`);
    stage.style.setProperty("--rear-drift-y", `${rearDriftY.toFixed(2)}px`);
    stage.style.setProperty("--rear-reveal", `${intensity.toFixed(3)}`);
    stage.style.setProperty("--ring-pull", `${ringPull.toFixed(2)}deg`);
    stage.style.setProperty("--detail-energy", `${(0.16 + intensity * 0.88).toFixed(3)}`);
    stage.style.setProperty("--core-energy", `${(0.2 + intensity * 0.3).toFixed(3)}`);
    stage.style.setProperty("--panel-glow", `${(0.08 + intensity * 0.08).toFixed(3)}`);
    stage.classList.toggle("is-core-engaged", intensity > 0.18);
  }

  function resetStageGlow() {
    setStageGlow();
  }

  function setRendererSize() {
    const rect = (media || canvas).getBoundingClientRect();
    const width = Math.max(Math.round(rect.width), 320);
    const height = Math.max(Math.round(rect.height), 260);
    const dpr = Math.min(window.devicePixelRatio || 1, state.coarsePointer ? 1.2 : 1.7);

    state.width = width;
    state.height = height;
    state.dpr = dpr;

    state.renderer.setPixelRatio(dpr);
    state.renderer.setSize(width, height, false);
    state.camera.aspect = width / height;
    state.camera.updateProjectionMatrix();
  }

  function createScene() {
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance"
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.94;
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 30);
    camera.position.set(0, 0, 7.2);
    camera.lookAt(0, 0, 0);

    const root = new THREE.Group();
    root.scale.setScalar(state.coarsePointer ? 0.92 : 1);
    scene.add(root);

    const backdrop = new THREE.Mesh(trackGeometry(new THREE.PlaneGeometry(6.2, 6.2, 1, 1)), trackMaterial(createBackdropMaterial()));
    backdrop.position.z = -2.8;
    root.add(backdrop);

    const glow = new THREE.Mesh(trackGeometry(new THREE.PlaneGeometry(3.8, 3.8, 1, 1)), trackMaterial(createGlowMaterial()));
    glow.position.z = -0.2;
    root.add(glow);

    const ringConfigs = [
      { radius: 2.04, scaleY: 0.6, rotationZ: 0.32, rotationY: 0.92, opacity: 0.12, color: 0x8fd6ff },
      { radius: 1.78, scaleY: 0.84, rotationZ: -0.62, rotationX: 1.08, opacity: 0.1, color: 0xd7f1ff },
      { radius: 1.46, scaleY: 1.04, rotationZ: 0.84, rotationY: -0.98, opacity: 0.12, color: 0x9cdeff },
      { radius: 1.12, scaleY: 0.78, rotationZ: -1.08, rotationX: 0.52, opacity: 0.12, color: 0xbde8ff },
      { radius: 0.9, scaleY: 0.98, rotationZ: 0.22, rotationY: 0.32, opacity: 0.1, color: 0xe8f8ff }
    ];

    const rings = ringConfigs.map((config) => {
      const ring = new THREE.LineLoop(
        trackGeometry(createRingGeometry(config.radius, config.scaleY, state.coarsePointer ? 68 : 110)),
        trackMaterial(createLineMaterial(config.color, config.opacity))
      );
      ring.rotation.z = config.rotationZ || 0;
      ring.rotation.x = config.rotationX || 0;
      ring.rotation.y = config.rotationY || 0;
      ring.userData = {
        baseOpacity: config.opacity
      };
      root.add(ring);
      return ring;
    });

    const particleGeometry = trackGeometry(createParticleFieldGeometry(state.coarsePointer ? 90 : 140));
    const particles = new THREE.Points(particleGeometry, trackMaterial(createParticleMaterial()));
    root.add(particles);

    state.renderer = renderer;
    state.scene = scene;
    state.camera = camera;
    state.root = root;
    state.backdrop = backdrop;
    state.glow = glow;
    state.rings = rings;
    state.particles = particles;
    canvas.dataset.engine = "three.js r177";
  }

  function updateParticles(time) {
    if (!state.particles) {
      return;
    }

    const geometry = state.particles.geometry;
    const position = geometry.attributes.position;
    const { baseRadii, baseAngles, baseHeights } = geometry.userData;

    for (let index = 0; index < baseRadii.length; index += 1) {
      const angle = baseAngles[index] + time * (0.08 + (index % 7) * 0.01);
      const radius = baseRadii[index] + Math.sin(time * 1.2 + index * 0.7) * 0.04;
      const x = Math.cos(angle) * radius + pointer.currentX * 0.04 * smoothstep(1.7, 0.2, radius);
      const y = baseHeights[index] + Math.sin(time * 1.4 + index * 0.35) * 0.06 - pointer.currentY * 0.03;
      const z = Math.sin(angle * 1.2 + time * 0.7) * radius * 0.34;
      position.setXYZ(index, x, y, z);
    }

    position.needsUpdate = true;
    state.particles.material.uniforms.uTime.value = time;
    state.particles.material.uniforms.uIntensity.value = pointer.currentIntensity;
  }

  function updatePointer(event) {
    if (!state.interactive || event.pointerType === "touch") {
      return;
    }

    const stageRect = stage.getBoundingClientRect();
    const shellRect = (shell || media || stage).getBoundingClientRect();
    const shellCenterX = shellRect.left + shellRect.width * 0.5;
    const shellCenterY = shellRect.top + shellRect.height * 0.5;
    const shellRadius = Math.max(shellRect.width, shellRect.height) * 0.5;
    const engageStartRadius = shellRadius * 0.42;
    const engageFullRadius = shellRadius * 0.7;
    const distance = Math.hypot(event.clientX - shellCenterX, event.clientY - shellCenterY);

    if (distance > engageFullRadius) {
      handlePointerLeave();
      return;
    }

    const stagePercentX = clamp((event.clientX - stageRect.left) / stageRect.width, 0, 1);
    const stagePercentY = clamp((event.clientY - stageRect.top) / stageRect.height, 0, 1);
    const shellPercentX = clamp((event.clientX - shellRect.left) / shellRect.width, 0, 1);
    const shellPercentY = clamp((event.clientY - shellRect.top) / shellRect.height, 0, 1);
    const deltaX = clamp((event.clientX - shellCenterX) / engageFullRadius, -1, 1);
    const deltaY = clamp((event.clientY - shellCenterY) / engageFullRadius, -1, 1);
    const intensity = 1 - smoothstep(engageStartRadius, engageFullRadius, distance);

    pointer.targetX = deltaX * intensity;
    pointer.targetY = deltaY * intensity;
    pointer.targetIntensity = intensity;
    setStageGlow({
      stageX: stagePercentX * 100,
      stageY: stagePercentY * 100,
      shellX: shellPercentX * 100,
      shellY: shellPercentY * 100,
      intensity,
      pullX: deltaX,
      pullY: deltaY
    });
  }

  function handlePointerLeave() {
    pointer.targetX = 0;
    pointer.targetY = 0;
    pointer.targetIntensity = 0;
    resetStageGlow();
  }

  function animate(now) {
    if (state.disposed) {
      return;
    }

    const time = now * (state.reducedMotion ? 0.00022 : 0.0005);
    const pointerLerp = state.reducedMotion ? 0.05 : 0.09;

    pointer.currentX = lerp(pointer.currentX, pointer.targetX, pointerLerp);
    pointer.currentY = lerp(pointer.currentY, pointer.targetY, pointerLerp);
    pointer.currentIntensity = lerp(pointer.currentIntensity, pointer.targetIntensity, pointerLerp);

    if (state.backdrop && state.backdrop.material.uniforms) {
      state.backdrop.material.uniforms.uTime.value = time;
    }

    if (state.glow && state.glow.material.uniforms) {
      state.glow.material.uniforms.uTime.value = time;
      state.glow.material.uniforms.uIntensity.value = pointer.currentIntensity;
    }

    updateParticles(time);

    state.rings.forEach((ring, index) => {
      ring.rotation.z += 0.0012 + index * 0.00035;
      ring.rotation.y += (index === 1 ? -1 : 1) * 0.0009;
      ring.position.x = pointer.currentX * (0.07 + index * 0.026);
      ring.position.y = -pointer.currentY * (0.056 + index * 0.022);
      ring.scale.setScalar(1 + pointer.currentIntensity * (0.024 + index * 0.008));
      ring.material.opacity = ring.userData.baseOpacity + pointer.currentIntensity * (0.08 + index * 0.012);
    });

    state.root.rotation.y = Math.sin(time * 0.72) * 0.034 + pointer.currentX * 0.026;
    state.root.rotation.x = Math.cos(time * 0.54) * 0.022 - pointer.currentY * 0.018;
    state.camera.position.x = Math.sin(time * 0.35) * 0.034 + pointer.currentX * 0.038;
    state.camera.position.y = Math.cos(time * 0.28) * 0.026 - pointer.currentY * 0.03;
    state.camera.lookAt(0, 0, 0);

    state.renderer.render(state.scene, state.camera);
    state.frameId = window.requestAnimationFrame(animate);
  }

  function resize() {
    if (state.disposed || !state.renderer) {
      return;
    }

    setRendererSize();
  }

  function start() {
    createScene();
    setRendererSize();
    resetStageGlow();

    if (state.interactive) {
      window.addEventListener("pointermove", updatePointer);
      document.addEventListener("mouseleave", handlePointerLeave);
    }

    window.addEventListener("resize", resize);

    if (typeof ResizeObserver === "function") {
      state.resizeObserver = new ResizeObserver(resize);
      state.resizeObserver.observe(media || stage);
    }

    state.frameId = window.requestAnimationFrame(animate);
  }

  function destroy() {
    state.disposed = true;
    window.cancelAnimationFrame(state.frameId);
    window.removeEventListener("resize", resize);
    window.removeEventListener("pointermove", updatePointer);
    document.removeEventListener("mouseleave", handlePointerLeave);

    if (state.resizeObserver) {
      state.resizeObserver.disconnect();
      state.resizeObserver = null;
    }

    if (state.renderer) {
      state.renderer.dispose();
      state.renderer = null;
    }

    state.materials.forEach((material) => material.dispose());
    state.geometries.forEach((geometry) => geometry.dispose());
    stage.classList.remove("is-core-engaged");
    resetStageGlow();
  }

  return {
    start,
    destroy
  };
}
