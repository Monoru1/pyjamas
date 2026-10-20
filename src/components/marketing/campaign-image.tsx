import NextImage from 'next/image';
import manifest from './campaign-images.json';

type Props={src:string;alt:string;fill?:boolean;priority?:boolean;sizes?:string;className?:string;width?:number;height?:number};
const images:Record<string,{width:number;height:number;variants:Array<{width:number;src:string}>}>=manifest;

/** Precompressed campaign assets avoid a cold image-transform function on first visit. */
export function CampaignImage({src,alt,fill,priority,sizes,className,width,height}:Props){
 const image=images[src];
 if(!image)return <NextImage src={src} alt={alt} fill={fill} priority={priority} sizes={sizes} className={className} width={width} height={height}/>;
 const fallback=image.variants[image.variants.length-1].src;
 return (
  // The local srcset is generated from the original shooting, with no image transform at request time.
  // eslint-disable-next-line @next/next/no-img-element
  <img src={fallback} srcSet={image.variants.map(v=>`${v.src} ${v.width}w`).join(', ')} sizes={sizes}
   alt={alt} width={width||image.width} height={height||image.height} className={className}
   loading={priority?'eager':'lazy'} fetchPriority={priority?'high':undefined} decoding="async"
   style={fill?{position:'absolute',inset:0,width:'100%',height:'100%'}:undefined}/>
 );
}
