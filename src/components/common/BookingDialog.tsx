import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowRight, MapPin, Monitor } from 'lucide-react';
import type { BookingMode } from '../../types/booking';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';

const schema = z.object({ mode: z.enum(['in-person', 'remote'], { error: 'Choisissez un mode de participation.' }) });
type Preparation = z.infer<typeof schema>;

export function BookingDialog({ open, mode, onOpenChange, onReturnFocus }: { open: boolean; mode: BookingMode | null; onOpenChange: (open: boolean) => void; onReturnFocus: () => void }) {
  const navigate = useNavigate();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<Preparation>({ resolver: zodResolver(schema) });
  useEffect(() => { if (open) reset(mode ? { mode } : { mode: undefined }); }, [open, mode, reset]);
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="booking-dialog" onCloseAutoFocus={(event) => { event.preventDefault(); onReturnFocus(); }}>
    <DialogHeader><span className="eyebrow">VOTRE PROCHAINE PRISE DE PAROLE</span><DialogTitle className="dialog-title">À vous de choisir.</DialogTitle><DialogDescription>Au studio ou depuis chez vous : comment souhaitez-vous participer ?</DialogDescription></DialogHeader>
    <form onSubmit={handleSubmit((values) => { onOpenChange(false); navigate(`/reservation?mode=${values.mode}`); })} noValidate>
      <fieldset className="mode-options" aria-describedby={errors.mode ? 'mode-error' : undefined}><legend className="sr-only">Mode de participation</legend>
        <label className="mode-option"><input type="radio" value="in-person" {...register('mode')} /><MapPin size={22} aria-hidden="true" /><span><strong>En présentiel</strong><small>Dans les locaux OCD Live au Togo</small></span></label>
        <label className="mode-option"><input type="radio" value="remote" {...register('mode')} /><Monitor size={22} aria-hidden="true" /><span><strong>À distance</strong><small>Depuis votre commerce ou votre domicile</small></span></label>
      </fieldset>
      {errors.mode && <p id="mode-error" className="form-error" role="alert">{errors.mode.message}</p>}
      <div className="session-guidance"><strong>Votre activité, votre format</strong><p>Choisissez votre mode de participation, puis comparez les formules pour votre session.</p></div>
      <Button variant="accent" className="w-full" type="submit">Découvrir les formules<ArrowRight size={18} aria-hidden="true" /></Button>
    </form>
  </DialogContent></Dialog>;
}
