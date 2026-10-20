export async function readLimitedBody(request: Request, maximum: number) {
  const declared = Number(request.headers.get('content-length'));
  if (declared > maximum) throw new Error('Requête trop volumineuse.');
  const reader = request.body?.getReader();
  if (!reader) return '';
  const parts: Uint8Array[] = [];let size=0;
  try {
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      size += result.value.byteLength;
      if (size > maximum) { await reader.cancel(); throw new Error('Requête trop volumineuse.'); }
      parts.push(result.value);
    }
  } finally { reader.releaseLock(); }
  const all=new Uint8Array(size);let offset=0;
  for(const part of parts){all.set(part,offset);offset+=part.byteLength;}
  return new TextDecoder('utf-8',{fatal:true}).decode(all);
}
