import { useState } from 'react';
import { ImageOff } from 'lucide-react';
import type { Photo as PhotoData } from '../../types/content';
import { cn } from '../../utils/cn';

export function Photo({ photo, priority = false, className }: { photo: PhotoData; priority?: boolean; className?: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={cn('photo', className)}>
      {failed ? <div className="photo-fallback" role="img" aria-label={photo.alt}><ImageOff size={28} /><span>Photographie indisponible</span></div> : (
        <img src={photo.src} alt={photo.alt} width="1400" height="1050" style={{ objectPosition: photo.position }} loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : 'auto'} decoding="async" onError={() => setFailed(true)} />
      )}
    </div>
  );
}
