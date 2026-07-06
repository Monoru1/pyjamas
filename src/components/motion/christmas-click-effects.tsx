'use client';

import { useEffect } from 'react';

const shapes = ['✦', '✧', '❄', '✺', '•'];

export function ChristmasClickEffects() {
  useEffect(() => {
    function handleClick(event: MouseEvent) {
      const root = document.createElement('div');
      root.className = 'christmas-burst';
      root.style.left = `${event.clientX}px`;
      root.style.top = `${event.clientY}px`;

      shapes.forEach((shape, index) => {
        const particle = document.createElement('span');
        particle.textContent = shape;
        const angle = (index / shapes.length) * Math.PI * 2;
        const distance = 42 + index * 11;
        particle.style.setProperty('--x', `${Math.cos(angle) * distance}px`);
        particle.style.setProperty('--y', `${Math.sin(angle) * distance}px`);
        particle.style.animationDelay = `${index * 28}ms`;
        root.appendChild(particle);
      });

      document.body.appendChild(root);
      window.setTimeout(() => root.remove(), 900);
    }

    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  return (
    <style>{`
      .christmas-burst {
        pointer-events: none;
        position: fixed;
        z-index: 120;
        width: 1px;
        height: 1px;
      }
      .christmas-burst span {
        position: absolute;
        left: 0;
        top: 0;
        color: #c99a2e;
        font-size: 18px;
        line-height: 1;
        text-shadow: 0 0 18px rgba(201,154,46,.75);
        animation: burst-out .78s cubic-bezier(.16,.9,.2,1) forwards;
      }
      .christmas-burst span:nth-child(2),
      .christmas-burst span:nth-child(4) {
        color: #fffaf3;
        text-shadow: 0 0 18px rgba(255,250,243,.95);
      }
      .christmas-burst span:nth-child(3) {
        color: #8f1428;
        text-shadow: 0 0 16px rgba(143,20,40,.55);
      }
      @keyframes burst-out {
        0% { opacity: 0; transform: translate(-50%, -50%) scale(.25) rotate(0deg); }
        18% { opacity: 1; }
        100% { opacity: 0; transform: translate(calc(-50% + var(--x)), calc(-50% + var(--y))) scale(1.35) rotate(120deg); }
      }
      @media (prefers-reduced-motion: reduce) {
        .christmas-burst span { animation: none; display: none; }
      }
    `}</style>
  );
}
