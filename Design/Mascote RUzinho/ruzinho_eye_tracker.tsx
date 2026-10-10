import React, { useState, useEffect, useRef, useId, useMemo } from "react";

/**
 * Constantes geométricas do RUzinho (sistema de coordenadas viewBox 0..100)
 */
const CENTER_X = 50;
const CENTER_Y = 50;

// Espaçamento e limites calibrados para a expressão estética do RUzinho
const BASE_EYE_GAP = 8.5; // Distância de cada olho em relação ao centro (X = 41.5 e X = 58.5)
const DEFAULT_MAX_TRAVEL = 10.5; // Alcance máximo do olhar (restrito à área central mostrada no vídeo)
const DEFAULT_WAKE_RADIUS = 260; // Raio em pixels do cursor para despertar
const BASE_EYE_WIDTH = 10.2; // Largura do olho em repouso
const BASE_EYE_HEIGHT = 18.5; // Altura do olho em repouso
const BASE_EYE_RADIUS = 5.1; // Raio de arredondamento das cápsulas

/**
 * Caminho vetorial exato do corpo do RUzinho:
 * Squircle vermelho com cantos arredondados (r=24) e mordida dentária de 4 arcos no canto superior direito.
 */
const RUZINHO_SHAPE_PATH = `
  M 24 0
  H 72
  A 6.8 6.8 0 0 0 78.6 8.4
  A 6.8 6.8 0 0 0 84.4 17.6
  A 7.2 7.2 0 0 0 91.4 27.0
  A 8.2 8.2 0 0 0 100 37.6
  V 76
  A 24 24 0 0 1 76 100
  H 24
  A 24 24 0 0 1 0 76
  V 24
  A 24 24 0 0 1 24 0
  Z
`.replace(/\s+/g, " ").trim();

const clamp = (val, min, max) => Math.min(max, Math.max(min, val));

/**
 * Trava de segurança adicional para garantir que mesmo com ajustes extremos,
 * o olho direito jamais se aproxime da cratera da mordida (canto superior direito).
 */
function enforceBiteSafety(posX, posY) {
  // A mordida começa em X > 72 e Y < 38
  // Mantemos uma margem de segurança estrita de pelo menos 14 unidades
  const safeMaxX = 66;
  const safeMinY = 36;

  let x = posX;
  let y = posY;

  if (x > safeMaxX && y < safeMinY) {
    const diffX = x - safeMaxX;
    const diffY = safeMinY - y;
    if (diffX > diffY) {
      x = safeMaxX;
    } else {
      y = safeMinY;
    }
  }

  return { x, y };
}

export function RUzinhoWatcher({
  size = 230,
  wakeRadius = DEFAULT_WAKE_RADIUS,
  maxTravel = DEFAULT_MAX_TRAVEL,
  followStrength = 80,
  bounce = 35,
  eyeScale = 1.0,
  idleSpeed = 1.0,
  showProximityRing = true,
  forceMode = "auto", // "auto" | "awake" | "idle"
  onStatusChange,
}) {
  const containerRef = useRef(null);
  const characterRef = useRef(null);
  const eyeLeftRef = useRef(null);
  const eyeRightRef = useRef(null);
  const clipId = `ruzinho-clip-${useId().replace(/:/g, "")}`;
  const gradId = `ruzinho-grad-${useId().replace(/:/g, "")}`;

  // Estados de feedback visual
  const [isAwake, setIsAwake] = useState(false);
  const [cursorDistance, setCursorDistance] = useState(999);
  const [isBouncing, setIsBouncing] = useState(false);

  // Armazenamento de propriedades para acesso dentro do requestAnimationFrame
  const propsRef = useRef({
    wakeRadius,
    maxTravel,
    followStrength,
    bounce,
    eyeScale,
    idleSpeed,
    forceMode,
  });

  useEffect(() => {
    propsRef.current = {
      wakeRadius,
      maxTravel,
      followStrength,
      bounce,
      eyeScale,
      idleSpeed,
      forceMode,
    };
  }, [wakeRadius, maxTravel, followStrength, bounce, eyeScale, idleSpeed, forceMode]);

  useEffect(() => {
    const charEl = characterRef.current;
    if (!charEl) return;

    // Estado físico da mola do olhar (-1.0 a +1.0)
    const spring = {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      tx: 0,
      ty: 0,
    };

    // Alvo do mouse e alvo do idle autônomo
    const mouseTarget = { tx: 0, ty: 0, active: false };
    const idleTarget = { tx: 0, ty: 0, nextShift: 0, phase: 0 };

    let awakeProgress = 0; // 0 = idle completo, 1 = desperto seguindo o cursor
    let rafId = 0;
    let prevTime = performance.now();
    let blinkStartTime = 0;
    let nextBlinkTime = performance.now() + 1800;
    let isDoubleBlink = false;

    // Loop de renderização com cálculos de escorço 3D restritos ao centro
    const render = (now) => {
      /* Controle orgânico de piscadas */
      let eyelidScale = 1;
      if (now > nextBlinkTime) {
        blinkStartTime = now;
        nextBlinkTime = now + (awakeProgress > 0.5 ? 2600 + Math.random() * 3200 : 2000 + Math.random() * 2400);
        isDoubleBlink = Math.random() < 0.22;
      }

      const sinceBlink = now - blinkStartTime;
      if (sinceBlink < 150) {
        // Squash suave para fechar e abrir
        eyelidScale = 1 - 0.94 * Math.sin((sinceBlink / 150) * Math.PI);
      } else if (isDoubleBlink && sinceBlink > 180 && sinceBlink < 330) {
        eyelidScale = 1 - 0.9 * Math.sin(((sinceBlink - 180) / 150) * Math.PI);
      }

      /* Rotação esférica 3D do rosto (Yaw e Pitch) */
      const as = (v) => Math.asin(clamp(v, -0.9, 0.9));
      const yaw = as(spring.x);
      const pitch = -as(spring.y);
      const cosYaw = Math.cos(yaw), sinYaw = Math.sin(yaw);
      const cosPitch = Math.cos(pitch), sinPitch = Math.sin(pitch);

      // Inclinação suave do olhar em diagonais
      const tiltDegrees = 42 * spring.x * spring.y;

      const { eyeScale, maxTravel } = propsRef.current;
      // Quando desperto, os olhinhos ficam ligeiramente mais expressivos (+8%)
      const awakeBoost = 1 + awakeProgress * 0.08;

      const baseWidth = BASE_EYE_WIDTH * eyeScale;
      const baseHeight = BASE_EYE_HEIGHT * eyeScale * awakeBoost;
      const baseRadius = BASE_EYE_RADIUS * eyeScale;

      const eyes = [eyeLeftRef.current, eyeRightRef.current];

      // Renderiza cada um dos dois olhos na zona central
      [-1, 1].forEach((direction, index) => {
        const eyeGroup = eyes[index];
        if (!eyeGroup) return;

        // Posição de repouso horizontal na face unitária
        const u0 = direction * (BASE_EYE_GAP / 50);
        const z0 = Math.sqrt(Math.max(0, 1 - u0 * u0));

        // Rotação na esfera unitária
        const u1 = u0 * cosYaw + z0 * sinYaw;
        const z1 = -u0 * sinYaw + z0 * cosYaw;
        const v2 = -z1 * sinPitch;
        const z2 = z1 * cosPitch;

        // Escorço (foreshortening): o olho que vira para trás estreita sutilmente
        const near = clamp(z2, 0, 1);
        const depthFactor = 0.65 + 0.35 * near;
        const widthPerspective = depthFactor * (0.8 + 0.2 * near);

        // Dimensões finais da cápsula sem distorcer o rx
        const currentWidth = baseWidth * widthPerspective;
        const currentHeight = Math.max(0.6, baseHeight * depthFactor * eyelidScale);
        const currentRx = Math.min(baseRadius, currentWidth / 2, currentHeight / 2);

        // DESLOCAMENTO RESTRITO AO CENTRO (Conforme indicado no vídeo):
        // Em vez de usar R=50 que jogava os olhos na borda, usamos `maxTravel` (~10 a 12 unidades).
        // Assim, o conjunto dos olhos se desloca com elegância em torno de (50, 50).
        let eyeCenterX = CENTER_X + direction * BASE_EYE_GAP + (spring.x * maxTravel) + (u1 - u0) * 4;
        let eyeCenterY = CENTER_Y + (spring.y * maxTravel) + (v2 * 3.5);

        // Aplicação da trava estrita anti-mordida
        if (direction === 1) {
          const safe = enforceBiteSafety(eyeCenterX, eyeCenterY);
          eyeCenterX = safe.x;
          eyeCenterY = safe.y;
        }

        const rect = eyeGroup.firstElementChild;
        if (rect) {
          rect.setAttribute("x", (-currentWidth / 2).toFixed(2));
          rect.setAttribute("y", (-currentHeight / 2).toFixed(2));
          rect.setAttribute("width", currentWidth.toFixed(2));
          rect.setAttribute("height", currentHeight.toFixed(2));
          rect.setAttribute("rx", currentRx.toFixed(2));
        }

        eyeGroup.setAttribute(
          "transform",
          `translate(${eyeCenterX.toFixed(2)} ${eyeCenterY.toFixed(2)}) rotate(${tiltDegrees.toFixed(2)})`
        );
        eyeGroup.style.opacity = z2 < 0.05 ? "0" : "1";
      });
    };

    const tick = (now) => {
      const dt = Math.min(2.2, (now - prevTime) / 16.67);
      prevTime = now;

      const { forceMode, bounce, idleSpeed } = propsRef.current;

      // Determina estado de despertar
      let targetAwake = mouseTarget.active ? 1 : 0;
      if (forceMode === "awake") targetAwake = 1;
      if (forceMode === "idle") targetAwake = 0;

      // Transição fluida entre modo Idle e modo Desperto
      awakeProgress += (targetAwake - awakeProgress) * 0.1 * dt;

      // Animação IDLE autônoma: observando calmamente para os lados
      if (now > idleTarget.nextShift) {
        idleTarget.phase += 1;
        // Padrão natural: olha esquerda -> pausa -> centro -> direita -> centro
        const cycle = idleTarget.phase % 4;
        let targetX = 0;
        let targetY = 0;

        if (cycle === 1) {
          targetX = -0.65; // Olhada atenta para a esquerda
          targetY = -0.05;
        } else if (cycle === 3) {
          targetX = 0.65; // Olhada para a direita
          targetY = 0.08;
        } else {
          targetX = (Math.random() - 0.5) * 0.15; // Centro com micro-desvio
          targetY = (Math.random() - 0.5) * 0.12;
        }

        idleTarget.tx = targetX;
        idleTarget.ty = targetY;

        // Intervalo aleatório ajustável pela velocidade de idle
        const baseInterval = (1400 + Math.random() * 1800) / idleSpeed;
        idleTarget.nextShift = now + baseInterval;
      }

      // Combinação balanceada entre o olhar Idle e o cursor
      const combinedTx = (1 - awakeProgress) * idleTarget.tx + awakeProgress * mouseTarget.tx;
      const combinedTy = (1 - awakeProgress) * idleTarget.ty + awakeProgress * mouseTarget.ty;

      spring.tx = clamp(combinedTx, -1, 1);
      spring.ty = clamp(combinedTy, -1, 1);

      // Simulação de mola elástica (Spring Dynamics)
      const stiffness = 0.075;
      const dampingFactor = 0.38 - (clamp(bounce, 0, 100) / 100) * 0.22;

      spring.vx += ((spring.tx - spring.x) * stiffness - spring.vx * dampingFactor) * dt;
      spring.vy += ((spring.ty - spring.y) * stiffness - spring.vy * dampingFactor) * dt;
      spring.x += spring.vx * dt;
      spring.y += spring.vy * dt;

      render(now);
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    const handlePointerMove = (e) => {
      if (!charEl) return;
      const rect = charEl.getBoundingClientRect();
      const charCenterX = rect.left + rect.width / 2;
      const charCenterY = rect.top + rect.height / 2;

      const deltaX = e.clientX - charCenterX;
      const deltaY = e.clientY - charCenterY;
      const dist = Math.hypot(deltaX, deltaY);

      setCursorDistance(Math.round(dist));

      const { wakeRadius, followStrength } = propsRef.current;

      // Verifica se o mouse entrou no raio de despertar
      if (dist <= wakeRadius) {
        if (!mouseTarget.active) {
          setIsAwake(true);
          onStatusChange?.("desperto");
          // Reação de alerta instantânea
          nextBlinkTime = performance.now() + 80;
        }
        mouseTarget.active = true;

        // Sensibilidade proporcional à proximidade
        const reach = Math.max(70, wakeRadius * 0.42);
        const strengthMultiplier = (clamp(followStrength, 0, 100) / 100) * 1.35;
        const intensity = Math.min(0.95, Math.tanh(dist / reach) * strengthMultiplier);

        const safeDist = dist || 1;
        mouseTarget.tx = (deltaX / safeDist) * intensity;
        mouseTarget.ty = (deltaY / safeDist) * intensity;
      } else {
        if (mouseTarget.active) {
          setIsAwake(false);
          onStatusChange?.("idle");
        }
        mouseTarget.active = false;
        mouseTarget.tx = 0;
        mouseTarget.ty = 0;
      }
    };

    const handlePointerLeave = () => {
      mouseTarget.active = false;
      mouseTarget.tx = 0;
      mouseTarget.ty = 0;
      setIsAwake(false);
      setCursorDistance(999);
      onStatusChange?.("idle");
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("pointermove", handlePointerMove);
      document.documentElement.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, []);

  /* Ação de clique lúdica no RUzinho */
  const handleCharacterClick = () => {
    setIsBouncing(true);
    setTimeout(() => setIsBouncing(false), 320);
  };

  return (
    <div
      ref={containerRef}
      className="relative flex items-center justify-center select-none"
      style={{ width: `${size * 1.45}px`, height: `${size * 1.45}px` }}
    >
      {/* Indicador visual de proximidade / raio de despertar */}
      {showProximityRing && (
        <div
          className={`absolute rounded-full pointer-events-none transition-all duration-300 border-2 border-dashed ${
            isAwake
              ? "border-red-500/70 bg-red-500/5 shadow-[0_0_35px_rgba(239,68,68,0.22)] scale-100"
              : "border-zinc-700/40 bg-zinc-900/10 scale-95"
          }`}
          style={{
            width: `${wakeRadius * 2}px`,
            height: `${wakeRadius * 2}px`,
          }}
        >
          <div className="absolute top-2 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[10px] font-mono tracking-wider text-zinc-400 bg-zinc-950/85 border border-zinc-800 shadow-sm whitespace-nowrap">
            {isAwake ? "🔴 Desperto!" : "⚪ Zona de Detecção"}: {wakeRadius}px (Mouse: {cursorDistance}px)
          </div>
        </div>
      )}

      {/* Personagem RUzinho com física de clique e sombra de contato */}
      <div
        ref={characterRef}
        onClick={handleCharacterClick}
        className={`relative cursor-pointer transition-transform duration-300 active:scale-95 ${
          isBouncing
            ? "scale-90 rotate-2"
            : isAwake
            ? "scale-[1.03]"
            : "scale-100"
        }`}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          filter: "drop-shadow(0 22px 38px rgba(229, 36, 33, 0.32))",
        }}
        role="img"
        aria-label="RUzinho - Personagem vermelho com canto mordido e olhos focados no centro"
      >
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full overflow-visible"
        >
          <defs>
            {/* Gradiente radial com brilho suave e fidelidade à cor oficial */}
            <radialGradient id={gradId} cx="44%" cy="42%" r="68%">
              <stop offset="0%" stopColor="#f43431" />
              <stop offset="70%" stopColor="#e52421" />
              <stop offset="100%" stopColor="#c31214" />
            </radialGradient>

            {/* Máscara de corte estrita: impede qualquer vazamento de pixels para a mordida */}
            <clipPath id={clipId}>
              <path d={RUZINHO_SHAPE_PATH} />
            </clipPath>
          </defs>

          {/* Corpo principal do RUzinho */}
          <path
            d={RUZINHO_SHAPE_PATH}
            fill={`url(#${gradId})`}
          />

          {/* Área visual delimitada para os olhos (clipada pelo contorno exato) */}
          <g clipPath={`url(#${clipId})`}>
            {/* Olho Esquerdo */}
            <g ref={eyeLeftRef}>
              <rect
                fill="#1c1514"
                className="transition-colors duration-100"
              />
            </g>

            {/* Olho Direito */}
            <g ref={eyeRightRef}>
              <rect
                fill="#1c1514"
                className="transition-colors duration-100"
              />
            </g>
          </g>
        </svg>

        {/* Brilho interior sutil */}
        <div className="absolute inset-0 pointer-events-none rounded-[24%] shadow-[inset_0_-8px_18px_rgba(0,0,0,0.18)]" />
      </div>
    </div>
  );
}

export default function App() {
  const [size, setSize] = useState(240);
  const [wakeRadius, setWakeRadius] = useState(270);
  const [maxTravel, setMaxTravel] = useState(10.5);
  const [followStrength, setFollowStrength] = useState(80);
  const [bounce, setBounce] = useState(38);
  const [eyeScale, setEyeScale] = useState(1.0);
  const [idleSpeed, setIdleSpeed] = useState(1.0);
  const [showProximityRing, setShowProximityRing] = useState(true);
  const [forceMode, setForceMode] = useState("auto");
  const [status, setStatus] = useState("idle");
  const [activeTab, setActiveTab] = useState("controls");
  const [copiedCode, setCopiedCode] = useState(false);

  // Código limpo exportável pronto para uso
  const exportSnippet = useMemo(() => {
    return `import React from "react";
import { RUzinhoWatcher } from "./RUzinhoWatcher";

export default function MyCard() {
  return (
    <div className="flex justify-center items-center p-8 bg-zinc-950">
      <RUzinhoWatcher
        size={240}
        wakeRadius={${wakeRadius}}
        maxTravel={${maxTravel}}
        followStrength={${followStrength}}
        bounce={${bounce}}
        eyeScale={${eyeScale}}
        showProximityRing={false}
      />
    </div>
  );
}`;
  }, [wakeRadius, maxTravel, followStrength, bounce, eyeScale]);

  const handleCopy = () => {
    navigator.clipboard?.writeText(exportSnippet);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleResetDefaults = () => {
    setSize(240);
    setWakeRadius(270);
    setMaxTravel(10.5);
    setFollowStrength(80);
    setBounce(38);
    setEyeScale(1.0);
    setIdleSpeed(1.0);
    setForceMode("auto");
    setShowProximityRing(true);
  };

  return (
    <div className="min-h-screen bg-[#0b0c10] text-zinc-100 flex flex-col font-sans select-none overflow-x-hidden">
      {/* Barra de Topo */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/70 backdrop-blur-md px-6 py-3.5 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center font-black text-white text-base shadow-[0_0_18px_rgba(239,68,68,0.45)]">
            RU
          </div>
          <div>
            <h1 className="text-sm md:text-base font-semibold text-white tracking-tight flex items-center gap-2">
              RUzinho Eye Tracker 3D
              <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-red-500/10 text-red-400 border border-red-500/30">
                Área Central Calibrada
              </span>
            </h1>
            <p className="text-xs text-zinc-400">
              Olhos restritos ao centro • Sem invasão da mordida • Despertar por proximidade
            </p>
          </div>
        </div>

        {/* Indicador de Status Ativo */}
        <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs">
          <span
            className={`w-2.5 h-2.5 rounded-full transition-all ${
              status === "desperto"
                ? "bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.9)]"
                : "bg-emerald-500/80"
            }`}
          />
          <span className="font-medium text-zinc-200">
            {status === "desperto" ? "👀 Desperto (Seguindo o Cursor)" : "💤 Observando em Idle"}
          </span>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 flex flex-col lg:flex-row relative">
        {/* Arena Interativa */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-10 relative min-h-[480px] overflow-hidden">
          {/* Padrão pontilhado sutil de estúdio */}
          <div className="absolute inset-0 bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:24px_24px] opacity-25 pointer-events-none" />

          {/* Dica de usabilidade */}
          <div className="absolute top-5 z-10 px-4 py-1.5 rounded-full bg-zinc-900/85 border border-zinc-800 text-xs text-zinc-400 backdrop-blur-md pointer-events-none text-center shadow-lg">
            Aproxime o mouse para <span className="text-red-400 font-semibold">despertar</span>. No centro, os olhos acompanham com sutileza sem jamais alcançar a mordida.
          </div>

          {/* Componente RUzinho Central */}
          <RUzinhoWatcher
            size={size}
            wakeRadius={wakeRadius}
            maxTravel={maxTravel}
            followStrength={followStrength}
            bounce={bounce}
            eyeScale={eyeScale}
            idleSpeed={idleSpeed}
            showProximityRing={showProximityRing}
            forceMode={forceMode}
            onStatusChange={setStatus}
          />

          {/* Badges de garantia visual */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-xs text-zinc-400 z-10">
            <div className="flex items-center gap-1.5 bg-zinc-900/60 border border-zinc-800/80 px-3 py-1 rounded-md">
              <span className="text-red-400 font-bold">✓</span>
              <span>Área Central: <strong>{maxTravel}u</strong></span>
            </div>
            <div className="flex items-center gap-1.5 bg-zinc-900/60 border border-zinc-800/80 px-3 py-1 rounded-md">
              <span className="text-red-400 font-bold">✓</span>
              <span>Proteção Anti-Mordida Ativa</span>
            </div>
            <div className="flex items-center gap-1.5 bg-zinc-900/60 border border-zinc-800/80 px-3 py-1 rounded-md">
              <span className="text-red-400 font-bold">✓</span>
              <span>Mola Esférica Suave</span>
            </div>
          </div>
        </div>

        {/* Barra Lateral de Controles e Exportação */}
        <aside className="w-full lg:w-[410px] border-t lg:border-t-0 lg:border-l border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md flex flex-col z-10 max-h-[calc(100vh-65px)]">
          {/* Navegação entre Abas */}
          <div className="flex border-b border-zinc-800 p-2 gap-1.5">
            <button
              onClick={() => setActiveTab("controls")}
              className={`flex-1 py-2 px-3 text-xs font-medium rounded-lg transition-all ${
                activeTab === "controls"
                  ? "bg-zinc-800 text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              ⚙️ Ajustes e Calibração
            </button>
            <button
              onClick={() => setActiveTab("code")}
              className={`flex-1 py-2 px-3 text-xs font-medium rounded-lg transition-all ${
                activeTab === "code"
                  ? "bg-zinc-800 text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              💻 Código do Componente
            </button>
          </div>

          {/* Conteúdo da Aba 1: Controles */}
          {activeTab === "controls" && (
            <div className="p-6 flex flex-col gap-5 overflow-y-auto flex-1">
              {/* Modo de Operação */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-zinc-300">
                  Modo de Comportamento
                </label>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-zinc-900 rounded-lg border border-zinc-800">
                  {[
                    { id: "auto", label: "Auto (Proximidade)" },
                    { id: "awake", label: "Sempre Atento" },
                    { id: "idle", label: "Sempre Idle" },
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      onClick={() => setForceMode(mode.id)}
                      className={`py-1.5 px-2 text-xs rounded-md font-medium transition-all ${
                        forceMode === mode.id
                          ? "bg-red-600 text-white shadow-sm"
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* CORREÇÃO DO VÍDEO: Alcance Central dos Olhos */}
              <div className="p-3.5 bg-red-950/20 border border-red-500/30 rounded-xl flex flex-col gap-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-red-300 flex items-center gap-1.5">
                    🎯 Alcance Central (Área do Vídeo)
                  </span>
                  <span className="font-mono text-red-400 font-bold">{maxTravel}u</span>
                </div>
                <input
                  type="range"
                  min="4"
                  max="16"
                  step="0.5"
                  value={maxTravel}
                  onChange={(e) => setMaxTravel(Number(e.target.value))}
                  className="w-full accent-red-500 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-[11px] text-zinc-400 leading-snug">
                  Mantém os olhinhos estritamente na região central do rosto, exatamente como mostrado no exemplo do vídeo.
                </span>
              </div>

              {/* Raio de Despertar */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-medium text-zinc-300">Raio de Despertar do Mouse</span>
                  <span className="font-mono text-zinc-400">{wakeRadius}px</span>
                </div>
                <input
                  type="range"
                  min="120"
                  max="480"
                  step="10"
                  value={wakeRadius}
                  onChange={(e) => setWakeRadius(Number(e.target.value))}
                  className="w-full accent-red-500 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Força do Olhar (Follow Strength) */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-medium text-zinc-300">Sensibilidade ao Cursor</span>
                  <span className="font-mono text-zinc-400">{followStrength}%</span>
                </div>
                <input
                  type="range"
                  min="30"
                  max="100"
                  step="5"
                  value={followStrength}
                  onChange={(e) => setFollowStrength(Number(e.target.value))}
                  className="w-full accent-red-500 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Elasticidade da Mola (Bounce) */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-medium text-zinc-300">Elasticidade da Mola (Bounce)</span>
                  <span className="font-mono text-zinc-400">{bounce}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="80"
                  step="2"
                  value={bounce}
                  onChange={(e) => setBounce(Number(e.target.value))}
                  className="w-full accent-red-500 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Velocidade da Animação Idle */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-medium text-zinc-300">Ritmo da Observação (Idle)</span>
                  <span className="font-mono text-zinc-400">{idleSpeed.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={idleSpeed}
                  onChange={(e) => setIdleSpeed(Number(e.target.value))}
                  className="w-full accent-red-500 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Escala dos Olhos */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-medium text-zinc-300">Escala das Cápsulas Oculares</span>
                  <span className="font-mono text-zinc-400">{eyeScale.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="0.8"
                  max="1.3"
                  step="0.05"
                  value={eyeScale}
                  onChange={(e) => setEyeScale(Number(e.target.value))}
                  className="w-full accent-red-500 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Toggle de Anel Visual */}
              <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-zinc-300">
                    Círculo de Detecção Visual
                  </div>
                  <div className="text-[11px] text-zinc-500">
                    Mostra a área do raio de proximidade
                  </div>
                </div>
                <button
                  onClick={() => setShowProximityRing(!showProximityRing)}
                  className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                    showProximityRing ? "bg-red-600" : "bg-zinc-800"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      showProximityRing ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Botão de Reset */}
              <button
                onClick={handleResetDefaults}
                className="mt-2 py-2 px-3 text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-900 hover:bg-zinc-800 rounded-lg border border-zinc-800 transition-colors text-center"
              >
                Restaurar Padrões Recomendados
              </button>
            </div>
          )}

          {/* Conteúdo da Aba 2: Snippet de Código */}
          {activeTab === "code" && (
            <div className="p-6 flex flex-col gap-4 overflow-y-auto flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-300">
                  Uso no seu Projeto React
                </span>
                <button
                  onClick={handleCopy}
                  className="px-3 py-1.5 text-xs font-medium bg-red-600 hover:bg-red-500 text-white rounded-md transition-colors shadow-sm flex items-center gap-1.5"
                >
                  {copiedCode ? "✓ Copiado!" : "Copiar Snippet"}
                </button>
              </div>
              <pre className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg font-mono text-[11px] text-zinc-300 leading-relaxed overflow-x-auto">
                <code>{exportSnippet}</code>
              </pre>
              <div className="text-xs text-zinc-400 leading-relaxed flex flex-col gap-2">
                <p>
                  <strong>Por que essa versão resolve o problema do vídeo?</strong>
                </p>
                <ul className="list-disc list-inside space-y-1 text-zinc-500">
                  <li>
                    O raio de translação dos olhos foi desacoplado da borda esférica total e restrito à constante <code>maxTravel</code> ({maxTravel}u).
                  </li>
                  <li>
                    A mordida no canto superior direito é duplamente protegida por <code>clipPath</code> do SVG e pela função de clamp <code>enforceBiteSafety</code>.
                  </li>
                  <li>
                    Quando o mouse se afasta do raio de {wakeRadius}px, os olhos retomam suavemente a varredura lateral atenta.
                  </li>
                </ul>
              </div>
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}