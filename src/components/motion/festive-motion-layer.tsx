export function FestiveMotionLayer() {
  return (
    <>
      <div className="motion-aurora" aria-hidden="true" />
      <div className="motion-snow" aria-hidden="true" />
      <div className="motion-glints" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>
      <style>{`
        .motion-aurora {
          pointer-events: none;
          position: fixed;
          inset: -20%;
          z-index: 0;
          opacity: .55;
          background:
            radial-gradient(circle at 18% 18%, rgba(201,154,46,.24), transparent 20rem),
            radial-gradient(circle at 78% 8%, rgba(143,20,40,.18), transparent 24rem),
            radial-gradient(circle at 65% 80%, rgba(15,59,46,.16), transparent 26rem);
          filter: blur(8px);
          animation: aurora-drift 18s ease-in-out infinite alternate;
        }

        .motion-snow {
          pointer-events: none;
          position: fixed;
          inset: 0;
          z-index: 60;
          opacity: .52;
          background-image:
            radial-gradient(circle, rgba(255,255,255,.95) 0 1px, transparent 2px),
            radial-gradient(circle, rgba(255,255,255,.65) 0 1.5px, transparent 2.5px),
            radial-gradient(circle, rgba(255,255,255,.38) 0 2px, transparent 3px);
          background-size: 90px 90px, 150px 150px, 240px 240px;
          animation: snow-fall 28s linear infinite;
        }

        .motion-glints {
          pointer-events: none;
          position: fixed;
          inset: 0;
          z-index: 61;
          overflow: hidden;
        }

        .motion-glints span {
          position: absolute;
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: #c99a2e;
          box-shadow: 0 0 24px rgba(201,154,46,.95);
          opacity: 0;
          animation: glint 5.8s ease-in-out infinite;
        }
        .motion-glints span:nth-child(1) { left: 14%; top: 22%; animation-delay: .2s; }
        .motion-glints span:nth-child(2) { left: 82%; top: 18%; animation-delay: 1.4s; }
        .motion-glints span:nth-child(3) { left: 72%; top: 66%; animation-delay: 2.1s; }
        .motion-glints span:nth-child(4) { left: 24%; top: 78%; animation-delay: 3.2s; }

        .cinematic-card {
          transform: translateZ(0);
          transition: transform .45s cubic-bezier(.2,.8,.2,1), box-shadow .45s ease, border-color .45s ease;
        }
        .cinematic-card:hover {
          transform: translateY(-7px) scale(1.01);
          box-shadow: 0 34px 110px rgba(80,34,28,.18);
          border-color: rgba(201,154,46,.32);
        }

        .magnetic-cta {
          position: relative;
          overflow: hidden;
        }
        .magnetic-cta::before {
          content: "";
          position: absolute;
          inset: 0;
          transform: translateX(-120%);
          background: linear-gradient(110deg, transparent, rgba(255,255,255,.35), transparent);
          transition: transform .75s ease;
        }
        .magnetic-cta:hover::before { transform: translateX(120%); }

        @keyframes aurora-drift {
          from { transform: translate3d(-2%, -1%, 0) scale(1); }
          to { transform: translate3d(3%, 2%, 0) scale(1.08); }
        }
        @keyframes snow-fall {
          from { background-position: 0 -100px, 0 -160px, 0 -260px; }
          to { background-position: 70px 320px, -90px 360px, 120px 520px; }
        }
        @keyframes glint {
          0%, 72%, 100% { opacity: 0; transform: scale(.55) rotate(0deg); }
          80% { opacity: .95; transform: scale(1.55) rotate(25deg); }
          88% { opacity: .2; transform: scale(.9) rotate(45deg); }
        }

        @media (prefers-reduced-motion: reduce) {
          .motion-aurora,
          .motion-snow,
          .motion-glints span { animation: none; }
        }
      `}</style>
    </>
  );
}
