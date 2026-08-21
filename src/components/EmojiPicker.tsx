import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Smile } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const EMOJI_GROUPS: { label: string; emojis: string[] }[] = [
  { label: 'Dinero', emojis: ['💰', '💵', '💳', '🏦', '📈', '📉', '💎', '🪙', '🧾', '💸'] },
  { label: 'Comida', emojis: ['🍔', '🍕', '🍎', '🥗', '☕', '🍺', '🛒', '🍱', '🍦', '🥐'] },
  { label: 'Transporte', emojis: ['🚗', '⛽', '🚌', '🚕', '✈️', '🚲', '🛵', '🚇', '🅿️', '🛞'] },
  { label: 'Hogar', emojis: ['🏠', '🛋️', '💡', '🚿', '🧹', '🔧', '🪑', '🔑', '🧺', '🌿'] },
  { label: 'Salud', emojis: ['💊', '🏥', '🩺', '🦷', '🧘', '🏋️', '🧠', '👓', '🩹', '🧴'] },
  { label: 'Ocio', emojis: ['🎬', '🎮', '🎧', '🎉', '📚', '🎸', '⚽', '🏖️', '🎨', '🎟️'] },
  { label: 'Otros', emojis: ['📱', '💻', '🎓', '🐶', '🎁', '👕', '✂️', '📦', '🧳', '⭐'] },
];

interface EmojiPickerProps {
  value: string;
  onChange: (emoji: string) => void;
  className?: string;
}

export function EmojiPicker({ value, onChange, className }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0 text-lg"
            aria-label="Elegir emoji"
          >
            {value ? <span aria-hidden="true">{value}</span> : <Smile className="w-4 h-4 text-muted-foreground" />}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 p-0">
          <ScrollArea className="h-64">
            <div className="p-3 space-y-3">
              {EMOJI_GROUPS.map((group) => (
                <div key={group.label} className="space-y-1.5">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{group.label}</p>
                  <div className="grid grid-cols-6 gap-1">
                    {group.emojis.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => {
                          onChange(emoji);
                          setOpen(false);
                        }}
                        className={cn(
                          'h-8 w-8 rounded-md text-lg leading-none hover:bg-muted transition-colors',
                          value === emoji && 'bg-primary/15 ring-1 ring-primary/40'
                        )}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, 4))}
        placeholder="Emoji"
        maxLength={4}
        className="w-20 text-center"
      />
    </div>
  );
}
