import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { gsap } from "gsap";
import logoAsset from "../assets/Shiva-Kameswari-logo-1.png";

type Phase = "idle" | "launching" | "revealed";

export default function GrandLaunch() {
  const mountRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const haloRef = useRef<HTMLDivElement>(null);
  const beamRef = useRef<HTMLDivElement>(null);
  const shineRef = useRef<HTMLDivElement>(null);
  const flareRef = useRef<HTMLDivElement>(null);
  const fogRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");

  // three.js scene refs accessible across handlers
  const sceneRefs = useRef<{
    triggerBurst?: (x: number, y: number) => void;
    triggerConfetti?: () => void;
    triggerFountain?: () => void;
  }>({});

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const w = () => mount.clientWidth;
    const h = () => mount.clientHeight;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.0015);

    const camera = new THREE.PerspectiveCamera(60, w() / h(), 0.1, 2000);
    camera.position.set(0, 0, 220);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w(), h());
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    // ----- ambient gold dust -----
    const dustGeo = new THREE.BufferGeometry();
    const DUST_COUNT = 900;
    const dustPos = new Float32Array(DUST_COUNT * 3);
    const dustVel = new Float32Array(DUST_COUNT * 3);
    for (let i = 0; i < DUST_COUNT; i++) {
      dustPos[i * 3] = (Math.random() - 0.5) * 600;
      dustPos[i * 3 + 1] = (Math.random() - 0.5) * 400;
      dustPos[i * 3 + 2] = (Math.random() - 0.5) * 400;
      dustVel[i * 3] = (Math.random() - 0.5) * 0.05;
      dustVel[i * 3 + 1] = Math.random() * 0.15 + 0.05;
      dustVel[i * 3 + 2] = (Math.random() - 0.5) * 0.05;
    }
    dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));

    const dustTex = makeRadialTexture("#ffd87a");
    const dustMat = new THREE.PointsMaterial({
      size: 2.4,
      map: dustTex,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0.85,
      color: 0xffc864,
    });
    const dust = new THREE.Points(dustGeo, dustMat);
    scene.add(dust);

    // ----- spark burst system (reusable) -----
    const SPARK_MAX = 600;
    const sparkGeo = new THREE.BufferGeometry();
    const sparkPos = new Float32Array(SPARK_MAX * 3);
    const sparkVel = new Float32Array(SPARK_MAX * 3);
    const sparkLife = new Float32Array(SPARK_MAX);
    sparkGeo.setAttribute("position", new THREE.BufferAttribute(sparkPos, 3));
    const sparkMat = new THREE.PointsMaterial({
      size: 4.5,
      map: makeRadialTexture("#fff1b8"),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 1,
      color: 0xffd76a,
    });
    const sparks = new THREE.Points(sparkGeo, sparkMat);
    scene.add(sparks);

    function burst(worldX: number, worldY: number, count = 220, power = 3.5) {
      let placed = 0;
      for (let i = 0; i < SPARK_MAX && placed < count; i++) {
        if (sparkLife[i] <= 0) {
          sparkPos[i * 3] = worldX;
          sparkPos[i * 3 + 1] = worldY;
          sparkPos[i * 3 + 2] = 0;
          const a = Math.random() * Math.PI * 2;
          const sp = Math.random() * power + 0.6;
          sparkVel[i * 3] = Math.cos(a) * sp;
          sparkVel[i * 3 + 1] = Math.sin(a) * sp + 0.4;
          sparkVel[i * 3 + 2] = (Math.random() - 0.5) * sp;
          sparkLife[i] = 1;
          placed++;
        }
      }
    }

    // ----- confetti (metallic gold + chrome strips) -----
    const CONFETTI_MAX = 260;
    const confettiGroup = new THREE.Group();
    scene.add(confettiGroup);
    type Conf = { mesh: THREE.Mesh; vel: THREE.Vector3; spin: THREE.Vector3; life: number };
    const confettiPool: Conf[] = [];
    function spawnConfetti() {
      for (let i = 0; i < CONFETTI_MAX; i++) {
        const isGold = Math.random() > 0.35;
        const geo = new THREE.PlaneGeometry(3, 6);
        const mat = new THREE.MeshBasicMaterial({
          color: isGold ? new THREE.Color().setHSL(0.12, 0.9, 0.55) : 0xe8e8ee,
          side: THREE.DoubleSide,
          transparent: true,
        });
        const m = new THREE.Mesh(geo, mat);
        m.position.set((Math.random() - 0.5) * 60, 220 + Math.random() * 80, (Math.random() - 0.5) * 120);
        confettiGroup.add(m);
        confettiPool.push({
          mesh: m,
          vel: new THREE.Vector3((Math.random() - 0.5) * 1.4, -Math.random() * 1.2 - 0.6, (Math.random() - 0.5) * 0.8),
          spin: new THREE.Vector3((Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.2),
          life: 6 + Math.random() * 3,
        });
      }
    }

    function fountain() {
      // gold particle fountain from below
      for (let n = 0; n < 90; n++) {
        for (let i = 0; i < SPARK_MAX; i++) {
          if (sparkLife[i] <= 0) {
            sparkPos[i * 3] = (Math.random() - 0.5) * 40;
            sparkPos[i * 3 + 1] = -140;
            sparkPos[i * 3 + 2] = (Math.random() - 0.5) * 40;
            sparkVel[i * 3] = (Math.random() - 0.5) * 1.8;
            sparkVel[i * 3 + 1] = Math.random() * 4.5 + 2.5;
            sparkVel[i * 3 + 2] = (Math.random() - 0.5) * 1.8;
            sparkLife[i] = 1.2;
            break;
          }
        }
      }
    }

    sceneRefs.current.triggerBurst = (cx, cy) => {
      // convert screen px to world coords roughly at z=0
      const ndcX = (cx / w()) * 2 - 1;
      const ndcY = -(cy / h()) * 2 + 1;
      const vec = new THREE.Vector3(ndcX, ndcY, 0.5).unproject(camera);
      const dir = vec.sub(camera.position).normalize();
      const dist = -camera.position.z / dir.z;
      const pos = camera.position.clone().add(dir.multiplyScalar(dist));
      burst(pos.x, pos.y, 320, 4.2);
    };
    sceneRefs.current.triggerConfetti = spawnConfetti;
    sceneRefs.current.triggerFountain = () => {
      let t = 0;
      const id = setInterval(() => {
        fountain();
        t++;
        if (t > 40) clearInterval(id);
      }, 60);
    };

    // mouse parallax
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    const onMove = (e: MouseEvent) => {
      mouse.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.ty = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("mousemove", onMove);

    const onResize = () => {
      camera.aspect = w() / h();
      camera.updateProjectionMatrix();
      renderer.setSize(w(), h());
    };
    window.addEventListener("resize", onResize);

    const clock = new THREE.Clock();
    let raf = 0;
    const tick = () => {
      const dt = Math.min(clock.getDelta(), 0.05);

      mouse.x += (mouse.tx - mouse.x) * 0.05;
      mouse.y += (mouse.ty - mouse.y) * 0.05;
      camera.position.x = mouse.x * 12;
      camera.position.y = -mouse.y * 8;
      camera.lookAt(0, 0, 0);

      // dust drift
      const dPos = dustGeo.attributes.position.array as Float32Array;
      for (let i = 0; i < DUST_COUNT; i++) {
        dPos[i * 3] += dustVel[i * 3];
        dPos[i * 3 + 1] += dustVel[i * 3 + 1];
        dPos[i * 3 + 2] += dustVel[i * 3 + 2];
        if (dPos[i * 3 + 1] > 220) {
          dPos[i * 3 + 1] = -220;
          dPos[i * 3] = (Math.random() - 0.5) * 600;
        }
      }
      dustGeo.attributes.position.needsUpdate = true;

      // sparks update
      const gravity = -3.6 * dt;
      for (let i = 0; i < SPARK_MAX; i++) {
        if (sparkLife[i] > 0) {
          sparkPos[i * 3] += sparkVel[i * 3] * 60 * dt;
          sparkPos[i * 3 + 1] += sparkVel[i * 3 + 1] * 60 * dt;
          sparkPos[i * 3 + 2] += sparkVel[i * 3 + 2] * 60 * dt;
          sparkVel[i * 3 + 1] += gravity;
          sparkLife[i] -= dt * 0.7;
          if (sparkLife[i] <= 0) {
            sparkPos[i * 3] = 99999;
          }
        }
      }
      sparkGeo.attributes.position.needsUpdate = true;

      // confetti
      for (let i = confettiPool.length - 1; i >= 0; i--) {
        const c = confettiPool[i];
        c.mesh.position.addScaledVector(c.vel, 60 * dt);
        c.vel.y += gravity * 0.3;
        c.mesh.rotation.x += c.spin.x;
        c.mesh.rotation.y += c.spin.y;
        c.mesh.rotation.z += c.spin.z;
        c.life -= dt;
        if (c.life < 1) (c.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, c.life);
        if (c.life <= 0) {
          confettiGroup.remove(c.mesh);
          c.mesh.geometry.dispose();
          (c.mesh.material as THREE.Material).dispose();
          confettiPool.splice(i, 1);
        }
      }

      dust.rotation.y += dt * 0.01;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onMove);
      renderer.dispose();
      dustGeo.dispose();
      dustMat.dispose();
      sparkGeo.dispose();
      sparkMat.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  // mouse parallax for the logo / halo (DOM layer)
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const nx = (e.clientX / window.innerWidth - 0.5) * 2;
      const ny = (e.clientY / window.innerHeight - 0.5) * 2;
      if (logoRef.current) {
gsap.to(logoRef.current, {
  x: 0,
  y: 0,
  rotateY: 0,
  rotateX: 0,
  duration: 0.9,
});
      }
      if (haloRef.current) {
        gsap.to(haloRef.current, { x: nx * -22, y: ny * -16, duration: 1.2, ease: "power2.out" });
      }
      if (shineRef.current) {
        gsap.to(shineRef.current, { x: nx * 30, duration: 0.6, ease: "power2.out" });
      }
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  const handleEnter = () => {
    if (phase !== "idle") return;
    setPhase("launching");
    const btn = buttonRef.current!;
    const rect = btn.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    sceneRefs.current.triggerBurst?.(cx, cy);

    const tl = gsap.timeline();
    tl.to(btn, {
      scale: 1.25,
      opacity: 0,
      filter: "blur(20px)",
      duration: 0.55,
      ease: "power3.in",
      onComplete: () => (btn.style.display = "none"),
    });

    // beam descends
    tl.fromTo(
      beamRef.current,
      { opacity: 0, scaleY: 0, transformOrigin: "top center" },
      { opacity: 1, scaleY: 1, duration: 1, ease: "power4.out" },
      "-=0.2",
    );
    tl.to(beamRef.current, { opacity: 0.55, duration: 1.2, ease: "sine.inOut" });

    // fog rise
    tl.fromTo(
      fogRef.current,
      { opacity: 0 },
      { opacity: 1, duration: 1.4, ease: "sine.out" },
      "-=1.6",
    );

    // halo grow behind
    tl.fromTo(
      haloRef.current,
      { opacity: 0, scale: 0.2 },
      { opacity: 1, scale: 1, duration: 1.6, ease: "expo.out" },
      "-=1.2",
    );

    // logo reveal
    tl.fromTo(
      logoRef.current,
      { opacity: 0, scale: 0.4, filter: "brightness(0) blur(30px)" },
      {
        opacity: 1,
        scale: 1,
        filter: "brightness(1) blur(0px)",
        duration: 1.4,
        ease: "expo.out",
        onStart: () => {
          sceneRefs.current.triggerConfetti?.();
          sceneRefs.current.triggerFountain?.();
        },
      },
      "-=0.8",
    );

    // logo settle bounce + lens flare
    tl.to(logoRef.current, { scale: 1.04, duration: 0.35, ease: "power2.out" });
    tl.to(logoRef.current, { scale: 1, duration: 0.55, ease: "elastic.out(1,0.55)" });
    tl.fromTo(
      flareRef.current,
      { opacity: 0, scale: 0.5 },
      { opacity: 1, scale: 1.3, duration: 0.6, ease: "power2.out" },
      "-=0.9",
    );
    tl.to(flareRef.current, { opacity: 0.35, duration: 1.2, ease: "sine.inOut" });

    // shine sweep loop
    tl.fromTo(
      shineRef.current,
      { xPercent: -120, opacity: 0 },
      { xPercent: 120, opacity: 1, duration: 1.6, ease: "power2.inOut", repeat: -1, repeatDelay: 2.4 },
      "-=0.4",
    );

    tl.call(() => setPhase("revealed"));
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-stage">
      {/* radial vignette base */}
      <div className="vignette pointer-events-none absolute inset-0" />

      {/* atmospheric fog */}
      <div ref={fogRef} className="atmos-fog pointer-events-none absolute inset-0 opacity-0" />

      {/* descending beam */}
      <div
        ref={beamRef}
        className="beam pointer-events-none absolute left-1/2 top-0 h-full w-[40vmin] -translate-x-1/2 opacity-0"
      />

      {/* three.js layer */}
      <div ref={mountRef} className="absolute inset-0" />

      {/* halo behind logo */}
      <div
        ref={haloRef}
        className="halo pointer-events-none absolute left-1/2 top-1/2 h-[90vmin] w-[90vmin] -translate-x-1/2 -translate-y-1/2 opacity-0"
      />

      {/* lens flare */}
      <div
        ref={flareRef}
        className="lens-flare pointer-events-none absolute left-1/2 top-1/2 h-[120vmin] w-[120vmin] -translate-x-1/2 -translate-y-1/2 opacity-0"
      />

      {/* logo */}
<div
  ref={logoRef}
  className="pointer-events-none absolute left-1/2 top-1/2 z-20 h-[48vmin] w-[48vmin] -translate-x-1/2 -translate-y-1/2 opacity-0"
  style={{ perspective: "1200px" }}
>
        <div className="relative h-full w-full">
          <img
  src={logoAsset}
  alt="Siva Kameswari Steels"
  width={1024}
  height={1024}
  className="h-full w-full object-contain -translate-y-8 drop-shadow-[0_0_60px_rgba(255,190,80,0.45)]"
  draggable={false}
/>
          {/* shine sweep mask */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div ref={shineRef} className="shine-sweep absolute -inset-y-10 left-0 w-1/3" />
          </div>
        </div>
      </div>

      {/* enter button */}
{phase === "idle" && (
  <div className="absolute inset-0 z-30 flex items-center justify-center">
    <div className="flex flex-col items-center gap-4 px-6 text-center">

      <p className="max-w-[320px] text-[0.55rem] sm:text-[0.7rem] leading-relaxed tracking-[0.25em] sm:tracking-[0.55em] uppercase text-gold/70">
        Hi BNI Amigos, We Are Proudly Presenting the New Logo of Siva Kameswari Traders
      </p>

      <button
        ref={buttonRef}
        onClick={handleEnter}
        className="glass-btn group relative w-full max-w-[320px] rounded-full px-6 py-4 text-xs sm:text-sm font-semibold uppercase tracking-[0.2em] sm:tracking-[0.35em]"
      >
        <span className="relative z-10 bg-gradient-to-b from-[#fff4cf] via-[#f0c668] to-[#a87412] bg-clip-text text-transparent">
          Enter The Grand Launch
        </span>
        <span className="glass-shine pointer-events-none absolute inset-0 rounded-full" />
      </button>

      <p className="max-w-[320px] text-[0.55rem] sm:text-[0.65rem] text-center tracking-[0.2em] sm:tracking-[0.4em] uppercase text-white/30">
        A Legacy Of Strength · Forged In Trust
      </p>

    </div>
  </div>
)}

      {/* foreground caption after reveal */}
      {phase === "revealed" && (
        <div className="pointer-events-none absolute bottom-10 left-0 right-0 z-20 flex justify-center">
          <p className="animate-fade-in text-[0.7rem] tracking-[0.55em] uppercase text-gold/70">
            Grand Launch · Forging the Future of Steel
          </p>
        </div>
      )}
    </div>
  );
}

function makeRadialTexture(color: string): THREE.Texture {
  const size = 64;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, color);
  g.addColorStop(0.4, color + "aa");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
