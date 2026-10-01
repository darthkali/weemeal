'use client';

import {useCallback, useEffect, useRef, useState} from 'react';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faCheck, faPen, faPlus, faSpinner, faTimes} from '@fortawesome/free-solid-svg-icons';

interface RecipeNotesProps {
    recipeId: string;
    initialNotes: string;
}

export default function RecipeNotes({recipeId, initialNotes}: RecipeNotesProps) {
    const [notes, setNotes] = useState(initialNotes || '');
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastSavedNotes = useRef(initialNotes || '');

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current && isEditing) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [notes, isEditing]);

    // Focus textarea when entering edit mode
    useEffect(() => {
        if (isEditing && textareaRef.current) {
            textareaRef.current.focus();
            // Move cursor to end
            textareaRef.current.setSelectionRange(
                textareaRef.current.value.length,
                textareaRef.current.value.length
            );
        }
    }, [isEditing]);

    // Save notes to API
    const saveNotes = useCallback(async (notesToSave: string) => {
        if (notesToSave === lastSavedNotes.current) {
            return; // No changes to save
        }

        setIsSaving(true);
        setSaveStatus('saving');

        try {
            const response = await fetch(`/api/recipes/${recipeId}/notes`, {
                method: 'PATCH',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({notes: notesToSave}),
            });

            if (response.ok) {
                lastSavedNotes.current = notesToSave;
                setSaveStatus('saved');
                // Reset to idle after 2 seconds
                setTimeout(() => setSaveStatus('idle'), 2000);
            } else {
                setSaveStatus('error');
            }
        } catch (error) {
            console.error('Error saving notes:', error);
            setSaveStatus('error');
        } finally {
            setIsSaving(false);
        }
    }, [recipeId]);

    // Auto-save with debounce
    const handleNotesChange = useCallback((value: string) => {
        setNotes(value);

        // Clear existing timeout
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        // Set new timeout for auto-save (1.5 seconds)
        saveTimeoutRef.current = setTimeout(() => {
            saveNotes(value);
        }, 1500);
    }, [saveNotes]);

    // Save on blur
    const handleBlur = useCallback(() => {
        // Clear any pending auto-save
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
        // Save immediately
        saveNotes(notes);
    }, [notes, saveNotes]);

    // Cancel editing
    const handleCancel = useCallback(() => {
        // Clear any pending auto-save
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
        // Revert to last saved notes
        setNotes(lastSavedNotes.current);
        setIsEditing(false);
        setSaveStatus('idle');
    }, []);

    // Close editing (keep changes)
    const handleClose = useCallback(() => {
        // Clear any pending auto-save
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
        // Save and close
        saveNotes(notes);
        setIsEditing(false);
    }, [notes, saveNotes]);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, []);

    const hasNotes = notes.trim().length > 0;

    return (
        <div className="card bg-amber-50/50 border-amber-200/50 p-5">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-amber-800 flex items-center gap-2">
                    <span className="text-base">&#128221;</span>
                    Meine Notizen
                </h3>
                <div className="flex items-center gap-2">
                    {/* Save status indicator */}
                    {saveStatus === 'saving' && (
                        <span className="text-xs text-amber-600 flex items-center gap-1">
                            <FontAwesomeIcon icon={faSpinner} className="w-3 h-3 animate-spin"/>
                            Speichern...
                        </span>
                    )}
                    {saveStatus === 'saved' && (
                        <span className="text-xs text-green-600 flex items-center gap-1">
                            <FontAwesomeIcon icon={faCheck} className="w-3 h-3"/>
                            Gespeichert
                        </span>
                    )}
                    {saveStatus === 'error' && (
                        <span className="text-xs text-red-600">
                            Fehler beim Speichern
                        </span>
                    )}

                    {/* Edit/Close button */}
                    {isEditing ? (
                        <div className="flex items-center gap-1">
                            <button
                                onClick={handleCancel}
                                className="w-7 h-7 rounded-lg bg-amber-100 hover:bg-amber-200 flex items-center justify-center transition-colors"
                                title="Abbrechen"
                            >
                                <FontAwesomeIcon icon={faTimes} className="w-3 h-3 text-amber-700"/>
                            </button>
                            <button
                                onClick={handleClose}
                                disabled={isSaving}
                                className="w-7 h-7 rounded-lg bg-amber-200 hover:bg-amber-300 flex items-center justify-center transition-colors disabled:opacity-50"
                                title="Fertig"
                            >
                                <FontAwesomeIcon icon={faCheck} className="w-3 h-3 text-amber-700"/>
                            </button>
                        </div>
                    ) : hasNotes ? (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="w-7 h-7 rounded-lg bg-amber-100 hover:bg-amber-200 flex items-center justify-center transition-colors"
                            title="Bearbeiten"
                        >
                            <FontAwesomeIcon icon={faPen} className="w-3 h-3 text-amber-700"/>
                        </button>
                    ) : null}
                </div>
            </div>

            {isEditing ? (
                <textarea
                    ref={textareaRef}
                    value={notes}
                    onChange={(e) => handleNotesChange(e.target.value)}
                    onBlur={handleBlur}
                    placeholder="Eigene Notizen hinzufuegen... (z.B. Tipps, Variationen, Anpassungen)"
                    className="w-full min-h-[100px] p-3 bg-white border border-amber-200 rounded-xl text-sm text-gray-700 placeholder-amber-400/70 focus:outline-hidden focus:ring-2 focus:ring-amber-300 focus:border-transparent resize-none"
                    maxLength={5000}
                />
            ) : hasNotes ? (
                <div
                    onClick={() => setIsEditing(true)}
                    className="text-sm text-gray-700 whitespace-pre-wrap cursor-pointer hover:bg-amber-100/50 rounded-lg p-2 -m-2 transition-colors"
                >
                    {notes}
                </div>
            ) : (
                <button
                    onClick={() => setIsEditing(true)}
                    className="w-full py-4 border-2 border-dashed border-amber-200 rounded-xl text-sm text-amber-600 hover:bg-amber-100/50 hover:border-amber-300 transition-colors flex items-center justify-center gap-2"
                >
                    <FontAwesomeIcon icon={faPlus} className="w-3 h-3"/>
                    Notiz hinzufuegen
                </button>
            )}
        </div>
    );
}
