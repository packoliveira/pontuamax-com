/**
 * Efeitos Visuais (Confetti) e Avisos Sonoros (Web Audio API)
 * para celebração de resgates e validações no PontuaMax.
 */

export function triggerConfetti() {
  if (typeof window === "undefined") return;

  const count = 40;
  const colors = ["#6366f1", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#3b82f6"];

  for (let i = 0; i < count; i++) {
    const el = document.createElement("div");
    el.className = "pm-confetti-particle";
    el.style.position = "fixed";
    el.style.zIndex = "9999";
    el.style.pointerEvents = "none";

    const startX = Math.random() * window.innerWidth;
    const startY = -10;
    const size = Math.floor(Math.random() * 8) + 6;
    const color = colors[Math.floor(Math.random() * colors.length)];

    el.style.left = `${startX}px`;
    el.style.top = `${startY}px`;
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
    el.style.backgroundColor = color;
    el.style.borderRadius = Math.random() > 0.5 ? "50%" : "2px";
    el.style.opacity = "0.9";
    el.style.transform = `rotate(${Math.random() * 360}deg)`;

    document.body.appendChild(el);

    const destX = startX + (Math.random() * 200 - 100);
    const destY = window.innerHeight * (0.6 + Math.random() * 0.4);
    const duration = 1500 + Math.random() * 1000;

    const anim = el.animate(
      [
        { transform: `translate(0, 0) rotate(0deg)`, opacity: 1 },
        { transform: `translate(${destX - startX}px, ${destY}px) rotate(${Math.random() * 720}deg)`, opacity: 0 }
      ],
      {
        duration,
        easing: "cubic-bezier(0.25, 1, 0.5, 1)",
        fill: "forwards"
      }
    );

    anim.onfinish = () => el.remove();
  }
}

export function playSuccessChime() {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    // Nota 1 (C5 - 523Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(523.25, ctx.currentTime);
    gain1.gain.setValueAtTime(0.15, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.25);

    // Nota 2 (E5 - 659Hz com atraso sutil de 100ms)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1);
    gain2.gain.setValueAtTime(0.2, ctx.currentTime + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.1);
    osc2.stop(ctx.currentTime + 0.4);
  } catch (e) {
    // Ignorar se o navegador proibir reprodução sem gesto direto
  }
}
