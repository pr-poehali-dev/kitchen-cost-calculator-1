import Icon from '@/components/ui/icon';

interface SearchInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  size?: 'sm' | 'md';
  autoFocus?: boolean;
}

export default function SearchInput({
  value,
  onChange,
  placeholder = 'Поиск...',
  className = '',
  size = 'sm',
  autoFocus,
}: SearchInputProps) {
  const isMd = size === 'md';

  return (
    <div className={`relative flex items-center ${className}`}>
      <Icon
        name="Search"
        size={13}
        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[hsl(var(--text-muted))] pointer-events-none"
      />
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={`w-full bg-[hsl(220,12%,14%)] border border-border rounded outline-none focus:border-gold transition-colors text-foreground placeholder:text-[hsl(var(--text-muted))] pl-8 ${value ? 'pr-7' : 'pr-3'} ${isMd ? 'py-2 text-sm' : 'py-1.5 text-xs'}`}
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-[hsl(var(--text-muted))] hover:text-foreground transition-colors"
        >
          <Icon name="X" size={12} />
        </button>
      )}
    </div>
  );
}
