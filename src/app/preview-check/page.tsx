import { notFound } from 'next/navigation';
import { ResponsivePreview } from './responsive-preview';
export const metadata={robots:{index:false,follow:false},title:'Contrôle responsive de la prévisualisation'};
export const dynamic='force-dynamic';
export default function PreviewCheck(){
 if(process.env.PREVIEW_QA_BUILD!=='true' && process.env.NODE_ENV!=='development')notFound();
 return <ResponsivePreview/>;
}
