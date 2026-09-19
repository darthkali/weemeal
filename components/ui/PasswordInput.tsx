'use client';

import {useState} from 'react';
import {Eye, EyeOff} from 'lucide-react';

interface PasswordInputProps {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    autoComplete?: string;
    required?: boolean;
    describedBy?: string;
}

/**
 * Passwortfeld mit Sichtbarkeits-Toggle. Der Toggle ist pro Feld, damit man
 * beim Vergleichen zweier Eingaben nicht beide gleichzeitig aufdecken muss;
 * sein aria-label trägt deshalb den Feldnamen.
 */
export default function PasswordInput({
    id,
    label,
    value,
    onChange,
    autoComplete,
    required,
    describedBy,
}: PasswordInputProps) {
    const [isVisible, setIsVisible] = useState(false);
    const ToggleIcon = isVisible ? EyeOff : Eye;

    return (
        <div className="space-y-1">
            <label htmlFor={id} className="text-sm font-medium text-text-dark">
                {label}
            </label>
            <div className="relative">
                <input
                    id={id}
                    name={id}
                    type={isVisible ? 'text' : 'password'}
                    autoComplete={autoComplete}
                    required={required}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    aria-describedby={describedBy}
                    className="input w-full pr-11"
                />
                <button
                    type="button"
                    onClick={() => setIsVisible((visible) => !visible)}
                    aria-label={`${label} ${isVisible ? 'verbergen' : 'anzeigen'}`}
                    aria-pressed={isVisible}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-text-muted hover:text-text-dark transition-colors"
                >
                    <ToggleIcon className="w-4 h-4"/>
                </button>
            </div>
        </div>
    );
}
