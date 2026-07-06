export function FestiveMotionLayer() {
  return (
    <>
      <div className="motion-aurora" aria-hidden="true" />
      <div className="motion-snow" aria-hidden="true" />
      <div className="motion-trees" aria-hidden="true">
        <span>🎄</span>
        <span>🌲</span>
        <span>🎄</span>
        <span>🌲</span>
        <span>🎄</span>
        <span>🌲</span>
      </div>
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

        .motion-trees {
          pointer-events: none;
          position: fixed;
          inset: 0;
          z-index: 62;
          overflow: hidden;
        }

        .motion-trees span {
          position: absolute;
          top: -4rem;
          font-size: clamp(1rem, 1.7vw, 1.75rem);
          opacity: .72;
          filter: drop-shadow(0 10px 22px rgba(15,59,46,.18));
          animation: tree-fall 18s linear infinite;
          will-change: transform, opacity;
        }
        .motion-trees span:nth-child(1) { left: 8%; animation-delay: 0s; animation-duration: 19s; }
        .motion-trees span:nth-child(2) { left: 22%; animation-delay: 5s; animation-duration: 23s; }
        .motion-trees span:nth-child(3) { left: 41%; animation-delay: 2s; animation-duration: 20s; }
        .motion-trees span:nth-child(4) { left: 61%; animation-delay: 8s; animation-duration: 24s; }
        .motion-trees span:nth-child(5) { left: 78%; animation-delay: 3s; animation-duration: 21s; }
        .motion-trees span:nth-child(6) { left: 91%; animation-delay: 10s; animation-duration: 25s; }

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

        .page-reveal { animation: page-reveal .85s cubic-bezier(.16,.9,.2,1) both; }
        .stagger-a { animation: item-rise .85s cubic-bezier(.16,.9,.2,1) both; animation-delay: .08s; }
        .stagger-b { animation: item-rise .85s cubic-bezier(.16,.9,.2,1) both; animation-delay: .18s; }
        .stagger-c { animation: item-rise .85s cubic-bezier(.16,.9,.2,1) both; animation-delay: .28s; }

        @keyframes aurora-drift {
          from { transform: translate3d(-2%, -1%, 0) scale(1); }
          to { transform: translate3d(3%, 2%, 0) scale(1.08); }
        }
        @keyframes snow-fall {
          from { background-position: 0 -100px, 0 -160px, 0 -260px; }
          to { background-position: 70px 320px, -90px 360px, 120px 520px; }
        }
        @keyframes tree-fall {
          0% { opacity: 0; transform: translate3d(0, -12vh, 0) rotate(0deg); }
          10% { opacity: .72; }
          90% { opacity: .72; }
          100% { opacity: 0; transform: translate3d(34px, 112vh, 0) rotate(48deg); }
        }
        @keyframes glint {
          0%, 72%, 100% { opacity: 0; transform: scale(.55) rotate(0deg); }
          80% { opacity: .95; transform: scale(1.55) rotate(25deg); }
          88% { opacity: .2; transform: scale(.9) rotate(45deg); }
        }
        @keyframes page-reveal {
          from { opacity: 0; transform: translateY(18px); filter: blur(8px); }
          to { opacity: 1; transform: translateY(0); filter: blur(0); }
        }
        @keyframes item-rise {
          from { opacity: 0; transform: translateY(24px) scale(.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        @media (prefers-reduced-motion: reduce) {
          .motion-aurora,
          .motion-snow,
          .motion-trees span,
          .motion-glints span,
          .page-reveal,
          .stagger-a,
          .stagger-b,
          .stagger-c { animation: none; }
        }
      `}</style>
    </>
  );
}
