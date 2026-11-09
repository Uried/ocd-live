import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowRight, Check, MapPin, Monitor } from 'lucide-react';
import type { BookingMode } from '../../types/booking';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';

const schema = z.object({ mode: z.enum(['in-person', 'remote'], { error: 'Choisissez un mode de participation.' }) });
type Preparation = z.infer<typeof schema>;

export function BookingDialog({ open, mode, onOpenChange, onReturnFocus }: { open: boolean; mode: BookingMode | null; onOpenChange: (open: boolean) => void; onReturnFocus: () => void }) {
  const [completed, setCompleted] = useState<Preparation | null>(null);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<Preparation>({ resolver: zodResolver(schema) });
  useEffect(() => {
    if (open) { reset(mode ? { mode } : { mode: undefined }); setCompleted(null); }
  }, [open, mode, reset]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="booking-dialog" onCloseAutoFocus={(event) => { event.preventDefault(); onReturnFocus(); }}>
        <DialogHeader>
          <span className="eyebrow">VOTRE PROCHAINE PRISE DE PAROLE</span>
          <DialogTitle className="dialog-title">{completed ? 'Votre choix est prêt.' : 'À vous de choisir.'}</DialogTitle>
          <DialogDescription>{completed ? 'Ceci est un aperçu du futur parcours. Aucune réservation n’a été créée.' : 'Au studio ou depuis chez vous : comment souhaitez-vous participer ?'}</DialogDescription>
        </DialogHeader>
        {completed ? <div className="preparation-result" role="status"><span className="result-check"><Check size={23} /></span><h3>{completed.mode === 'in-person' ? 'Live en présentiel' : 'Live à distance'}</h3><p>{completed.mode === 'in-person' ? 'Une session dans les locaux OCD Live au Togo.' : 'Une session depuis votre commerce ou votre domicile.'}</p><p>Les formules et les créneaux officiels seront proposés dans une prochaine étape.</p><Button className="w-full" onClick={() => onOpenChange(false)}>Revenir à l’accueil <ArrowRight size={17} aria-hidden="true" /></Button></div> : (
          <form onSubmit={handleSubmit(setCompleted)} noValidate>
            <fieldset className="mode-options" aria-describedby={errors.mode ? 'mode-error' : undefined}><legend className="sr-only">Mode de participation</legend>
              <label className="mode-option"><input type="radio" value="in-person" {...register('mode')} /><MapPin size={22} aria-hidden="true" /><span><strong>En présentiel</strong><small>Dans les locaux OCD Live au Togo</small></span></label>
              <label className="mode-option"><input type="radio" value="remote" {...register('mode')} /><Monitor size={22} aria-hidden="true" /><span><strong>À distance</strong><small>Depuis votre commerce ou votre domicile</small></span></label>
            </fieldset>
            {errors.mode && <p id="mode-error" className="form-error" role="alert">{errors.mode.message}</p>}
            <div className="demo-notice"><strong>Aperçu uniquement</strong><p>Aucune donnée personnelle demandée. Votre choix n’est ni enregistré ni transmis. Les réservations et paiements ne sont pas ouverts sur cette version.</p></div>
            <Button className="w-full" type="submit">Préparer ma session <ArrowRight size={18} aria-hidden="true" /></Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
