/**
 * @file src/components/FirefliesBackground.tsx
 * @description Lightweight, GPU-friendly animated fireflies (jugnu) canvas effect.
 *
 * Dependencies:
 *   - React (useEffect, useRef)
 *
 * Purpose:
 *   Recreates the floating golden glowing embers/fireflies (jugnu) seen in the reference screenshot:
 *   - Gentle floating upward and drifting motion
 *   - Pulsing/glowing golden warmth (#F5B731, #FFD166, #E58E26)
 *   - Low CPU/GPU overhead via HTML5 canvas and requestAnimationFrame
 *   - Responsive resize handling and graceful animation
 */

import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  opacity: number;
  fadeSpeed: number;
  pulsePhase: number;
  pulseSpeed: number;
  color: string;
}

export const FirefliesBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    const colors = [
      '245, 183, 49', // Warm gold
      '255, 209, 102', // Bright ember gold
      '229, 142, 38', // Amber glow
      '255, 230, 153', // Soft starlight yellow
    ];

    // Responsive particle count (disciplined density, no overwhelming clutter)
    const particleCount = Math.floor(Math.min(width, 1600) / 28);
    const particles: Particle[] = [];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 2.2 + 1.2,
        speedX: (Math.random() - 0.5) * 0.45,
        speedY: -(Math.random() * 0.5 + 0.2), // slow upward drift
        opacity: Math.random() * 0.6 + 0.2,
        fadeSpeed: (Math.random() * 0.015 + 0.008) * (Math.random() > 0.5 ? 1 : -1),
        pulsePhase: Math.random() * Math.PI * 2,
        pulseSpeed: Math.random() * 0.03 + 0.015,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Move
        p.x += p.speedX;
        p.y += p.speedY;
        p.pulsePhase += p.pulseSpeed;

        // Wrap around boundaries
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;
        if (p.y < -10) p.y = height + 10;
        if (p.y > height + 10) p.y = -10;

        // Pulsing glow calculation
        const currentOpacity = Math.max(
          0.15,
          Math.min(0.9, p.opacity + Math.sin(p.pulsePhase) * 0.35)
        );

        // Draw radial glowing firefly
        const glowRadius = p.size * 3.8;
        const gradient = ctx.createRadialGradient(
          p.x,
          p.y,
          0,
          p.x,
          p.y,
          glowRadius
        );

        gradient.addColorStop(0, `rgba(${p.color}, ${currentOpacity})`);
        gradient.addColorStop(0.35, `rgba(${p.color}, ${currentOpacity * 0.55})`);
        gradient.addColorStop(1, `rgba(${p.color}, 0)`);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.x, p.y, glowRadius, 0, Math.PI * 2);
        ctx.fill();

        // Hot bright core
        ctx.fillStyle = `rgba(255, 255, 240, ${currentOpacity * 0.95})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.65, 0, Math.PI * 2);
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-10 h-full w-full select-none"
    />
  );
};
