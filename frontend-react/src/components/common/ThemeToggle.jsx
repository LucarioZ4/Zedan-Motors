import { Moon, Sun } from 'lucide-react';

export default function ThemeToggle({ dark, onToggle }) {
  const Icon = dark ? Sun : Moon;
  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label="Modo oscuro"
      aria-pressed={dark}
      title={dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      onClick={onToggle}
    >
      <Icon size={20} aria-hidden="true" />
    </button>
  );
}
