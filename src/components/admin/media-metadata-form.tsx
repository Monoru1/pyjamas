'use client';
import { useActionState } from 'react';
import { updateMediaMetadata } from '@/app/admin/medias/actions';
export function MediaMetadataForm({id,title,alt}:{id:string;title:string|null;alt:string|null}) {
 const [state,action,pending]=useActionState(updateMediaMetadata,{error:null,message:''});
 return <details className="mt-4"><summary className="cursor-pointer font-bold">Modifier le titre et la description</summary><form action={action} className="mt-3 grid gap-3">
 <input type="hidden" name="id" value={id}/>
 <label>Titre<input className="mt-1 w-full rounded-lg border p-2" name="title" defaultValue={title||''} maxLength={120} required/></label>
 <label>Texte alternatif<input className="mt-1 w-full rounded-lg border p-2" name="alt_fr" defaultValue={alt||''} maxLength={200}/></label>
 <button type="submit" disabled={pending} className="min-h-11 rounded-lg bg-brand-primary p-2 font-bold text-white disabled:opacity-50">{pending?'Enregistrement…':'Enregistrer'}</button>
 {state.error && <p role="alert">{state.error}</p>}{state.message && <p role="status">{state.message}</p>}
 </form></details>;
}
