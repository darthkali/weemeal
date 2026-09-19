import {describe, expect, it, vi} from 'vitest';
import {fireEvent, render, screen} from '@testing-library/react';
import PasswordInput from '@/components/ui/PasswordInput';

describe('PasswordInput', () => {
    it('masks the value until the toggle is pressed', () => {
        render(
            <PasswordInput id="pw" label="Neues Passwort" value="secret" onChange={vi.fn()}/>
        );

        expect(screen.getByLabelText('Neues Passwort')).toHaveAttribute('type', 'password');

        fireEvent.click(screen.getByRole('button', {name: 'Neues Passwort anzeigen'}));

        expect(screen.getByLabelText('Neues Passwort')).toHaveAttribute('type', 'text');
    });

    it('masks the value again on a second press', () => {
        render(
            <PasswordInput id="pw" label="Neues Passwort" value="secret" onChange={vi.fn()}/>
        );

        fireEvent.click(screen.getByRole('button', {name: 'Neues Passwort anzeigen'}));
        fireEvent.click(screen.getByRole('button', {name: 'Neues Passwort verbergen'}));

        expect(screen.getByLabelText('Neues Passwort')).toHaveAttribute('type', 'password');
    });

    it('reports typing to the caller', () => {
        const onChange = vi.fn();
        render(<PasswordInput id="pw" label="Neues Passwort" value="" onChange={onChange}/>);

        fireEvent.change(screen.getByLabelText('Neues Passwort'), {target: {value: 'abc'}});

        expect(onChange).toHaveBeenCalledWith('abc');
    });

    it('never submits the surrounding form when toggling', () => {
        const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
        render(
            <form onSubmit={onSubmit}>
                <PasswordInput id="pw" label="Neues Passwort" value="" onChange={vi.fn()}/>
            </form>
        );

        fireEvent.click(screen.getByRole('button', {name: 'Neues Passwort anzeigen'}));

        expect(onSubmit).not.toHaveBeenCalled();
    });
});
