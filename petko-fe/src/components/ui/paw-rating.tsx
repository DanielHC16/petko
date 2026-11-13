import { useId } from 'react'
import { PawPrint } from 'lucide-react'

export function PawRating({ value }: { value: number }) {
  return <span role="img" aria-label={`${value} out of 5 paws`} className="inline-flex items-center gap-1">
    {[1, 2, 3, 4, 5].map(score => <PawPrint key={score} aria-hidden="true" size={19} className={score <= Math.round(value) ? 'fill-orange-400 text-orange-700' : 'text-gray-400'} />)}
  </span>
}

export function PawRatingInput({ value, onChange, disabled }: { value: number; onChange: (rating: number) => void; disabled: boolean }) {
  const name = useId()
  return <fieldset disabled={disabled}>
    <legend className="mb-2 text-sm font-bold text-petko-blue">Your rating <span className="text-red-700">*</span></legend>
    <div className="flex flex-wrap gap-2">
      {[1, 2, 3, 4, 5].map(score => <label key={score} className="relative cursor-pointer">
        <input type="radio" name={name} value={score} checked={value === score} onChange={() => onChange(score)} aria-label={`${score} ${score === 1 ? 'paw' : 'paws'}`} required className="peer sr-only" />
        <span className={`flex h-12 w-12 flex-col items-center justify-center gap-0.5 rounded-xl border transition peer-focus-visible:ring-2 peer-focus-visible:ring-petko-blue peer-focus-visible:ring-offset-2 ${value === score ? 'border-petko-blue bg-blue-50' : 'border-gray-300 bg-white hover:bg-orange-50'} ${disabled ? 'opacity-50' : ''}`}>
          <PawPrint size={21} aria-hidden="true" className={score <= value ? 'fill-orange-400 text-orange-700' : 'text-gray-400'} />
          <span className="text-[10px] font-bold text-gray-700">{score}</span>
        </span>
      </label>)}
    </div>
  </fieldset>
}
