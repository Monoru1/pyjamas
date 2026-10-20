'use client';
import Link from 'next/link';
export default function AdminError({reset}:{error:Error;reset:()=>void}) {
 return <section className="admin-page"><h1 className="text-3xl">L’opération n’a pas abouti.</h1><p className="my-5 max-w-xl leading-7">Vérifiez votre connexion et l’état de l’opération avant de réessayer. Si votre session a expiré, reconnectez-vous. Aucune réussite n’est confirmée sur cet écran.</p><div className="flex flex-wrap gap-4"><button className="admin-primary-button" onClick={reset}>Réessayer</button><Link className="inline-flex min-h-12 items-center underline" href="/admin/login">Se reconnecter</Link></div></section>;
}
