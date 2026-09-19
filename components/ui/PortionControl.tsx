'use client';

import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faMinus, faPlus} from '@fortawesome/free-solid-svg-icons';

interface PortionControlProps {
    portions: number;
    onIncrease: () => void;
    onDecrease: () => void;
    minPortions?: number;
    maxPortions?: number;
}

export default function PortionControl({
                                           portions,
                                           onIncrease,
                                           onDecrease,
                                           minPortions = 1,
                                           maxPortions = 100,
                                       }: PortionControlProps) {
    return (
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
            <button
                type="button"
                onClick={onDecrease}
                disabled={portions <= minPortions}
                className="w-9 h-9 flex items-center justify-center rounded-lg bg-white shadow-sm text-text-dark hover:bg-primary hover:text-white disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-text-dark transition-all duration-150"
                aria-label="Portionen verringern"
            >
                <FontAwesomeIcon icon={faMinus} className="w-3 h-3"/>
            </button>

            <span className="text-lg font-bold min-w-[3rem] text-center text-text-dark tabular-nums">
                {portions}
            </span>

            <button
                type="button"
                onClick={onIncrease}
                disabled={portions >= maxPortions}
                className="w-9 h-9 flex items-center justify-center rounded-lg bg-white shadow-sm text-text-dark hover:bg-primary hover:text-white disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-text-dark transition-all duration-150"
                aria-label="Portionen erhöhen"
            >
                <FontAwesomeIcon icon={faPlus} className="w-3 h-3"/>
            </button>
        </div>
    );
}
