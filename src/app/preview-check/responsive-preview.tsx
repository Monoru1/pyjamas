'use client';
import { useState } from 'react';
export function ResponsivePreview(){
 const [width,setWidth]=useState(390);const [path,setPath]=useState('/');const [metrics,setMetrics]=useState('Chargement…');
 return <main className="min-h-screen bg-gray-100 p-3"><div className="mb-3 flex flex-wrap items-center gap-4 text-sm">
 <label>Largeur <select className="border bg-white p-2" value={width} onChange={e=>{setWidth(Number(e.target.value));setMetrics('Chargement…');}}>{[320,360,390,430,768,1024,1440].map(w=><option key={w}>{w}</option>)}</select></label>
 <label>Page <select className="border bg-white p-2" value={path} onChange={e=>{setPath(e.target.value);setMetrics('Chargement…');}}>{['/','/catalogue?collection=noel','/panier','/fete-de-noel','/politique-de-confidentialite','/admin/login'].map(p=><option key={p}>{p}</option>)}</select></label>
 <output aria-live="polite">{metrics}</output></div>
 <iframe key={`${width}:${path}`} title="Prévisualisation responsive" src={path} width={width} height={900} className="border-0 bg-white shadow-lg" onLoad={event=>{const doc=event.currentTarget.contentDocument;if(doc)setMetrics(`Vue ${width} px · largeur de page ${doc.documentElement.scrollWidth} px · ${doc.documentElement.scrollWidth>width?'DÉBORDEMENT':'sans débordement'}`);}}/>
 </main>;
}
