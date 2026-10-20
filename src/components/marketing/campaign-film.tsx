'use client';

import { useState } from 'react';

export function CampaignFilm({ src, poster, cover }: { src: string; poster: string; cover: React.ReactNode }) {
  const [started, setStarted] = useState(false);
  const [failed, setFailed] = useState(false);
  return started ? <>
    <video className="christmas-film-video" src={src} controls autoPlay playsInline
      preload="none" poster={poster} onError={() => setFailed(true)}
      aria-label="Le film complet de Noël de La Maison des Pyjamas" />
    {failed && <p role="alert" className="relative bg-white p-5 text-sm text-red-800">Le film est momentanément indisponible. Merci de réessayer plus tard.</p>}
  </> : <>
    {cover}
    <button className="christmas-film-launch" type="button" onClick={() => setStarted(true)} aria-label="Lire le film complet de Noël">
      <span>Lire le film complet de Noël</span>
    </button>
  </>;
}
