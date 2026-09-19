import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import ChangePasswordForm from '@/components/account/ChangePasswordForm';

const VALID_PW = 'Str0ng!Passw0rd';
const VALID_PW_2 = 'An0ther!Passw0rd';

function fillForm({
    current = VALID_PW,
    next = VALID_PW_2,
    confirm = VALID_PW_2,
}: {current?: string; next?: string; confirm?: string} = {}) {
    fireEvent.change(screen.getByLabelText('Aktuelles Passwort'), {
        target: {value: current},
    });
    fireEvent.change(screen.getByLabelText('Neues Passwort'), {target: {value: next}});
    fireEvent.change(screen.getByLabelText('Neues Passwort bestätigen'), {
        target: {value: confirm},
    });
}

function submit() {
    fireEvent.click(screen.getByRole('button', {name: 'Passwort ändern'}));
}

describe('ChangePasswordForm', () => {
    beforeEach(() => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({ok: true, json: async () => ({success: true})})
        );
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('sends the current and the new password to the account endpoint', async () => {
        render(<ChangePasswordForm/>);
        fillForm();
        submit();

        await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));

        const [url, init] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
        expect(url).toBe('/api/account/password');
        expect(init.method).toBe('PATCH');
        expect(JSON.parse(init.body)).toEqual({
            currentPassword: VALID_PW,
            newPassword: VALID_PW_2,
        });
    });

    it('confirms success and clears the fields', async () => {
        render(<ChangePasswordForm/>);
        fillForm();
        submit();

        expect(await screen.findByRole('status')).toHaveTextContent('Passwort geändert');
        expect(screen.getByLabelText('Aktuelles Passwort')).toHaveValue('');
        expect(screen.getByLabelText('Neues Passwort')).toHaveValue('');
    });

    it('shows the server error when the current password is wrong', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({
                ok: false,
                json: async () => ({error: 'Current password is incorrect'}),
            })
        );

        render(<ChangePasswordForm/>);
        fillForm({current: 'wrong'});
        submit();

        expect(await screen.findByRole('alert')).toHaveTextContent(
            'Current password is incorrect'
        );
    });

    it('rejects a confirmation that does not match, without calling the API', async () => {
        render(<ChangePasswordForm/>);
        fillForm({confirm: 'Something!Else9'});
        submit();

        expect(await screen.findByRole('alert')).toHaveTextContent(
            'Die neuen Passwörter stimmen nicht überein'
        );
        expect(fetch).not.toHaveBeenCalled();
    });

    it('rejects a new password that violates the policy, without calling the API', async () => {
        render(<ChangePasswordForm/>);
        fillForm({next: 'weak', confirm: 'weak'});
        submit();

        expect(await screen.findByRole('alert')).toBeInTheDocument();
        expect(fetch).not.toHaveBeenCalled();
    });

    it('shows a network error message when the request fails', async () => {
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

        render(<ChangePasswordForm/>);
        fillForm();
        submit();

        expect(await screen.findByRole('alert')).toHaveTextContent('Netzwerkfehler');
    });
});
