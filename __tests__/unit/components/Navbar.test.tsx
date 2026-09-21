import {describe, expect, it, vi} from 'vitest';
import {fireEvent, render, screen} from '@testing-library/react';

vi.mock('next-auth/react', () => ({signOut: vi.fn()}));

const {default: Navbar} = await import('@/components/navbar/Navbar');

function openMenu() {
    fireEvent.click(screen.getByLabelText('Benutzermenü'));
}

describe('Navbar', () => {
    it('marks an admin with a badge next to the name', () => {
        render(<Navbar username="Kim" isAdmin/>);
        openMenu();

        expect(screen.getByText('Kim')).toBeInTheDocument();
        expect(screen.getByText('Admin')).toBeInTheDocument();
    });

    it('shows no badge for a plain user', () => {
        render(<Navbar username="Uma"/>);
        openMenu();

        expect(screen.getByText('Uma')).toBeInTheDocument();
        expect(screen.queryByText('Admin')).not.toBeInTheDocument();
    });

    it('shows no user menu at all without a session — the none mode', () => {
        render(<Navbar/>);

        expect(screen.queryByLabelText('Benutzermenü')).not.toBeInTheDocument();
        expect(screen.queryByText('Admin')).not.toBeInTheDocument();
    });

    it('keeps the badge independent of the user management link', () => {
        // keycloak mode: admin, but user management lives in Keycloak.
        render(<Navbar username="Kim" isAdmin canManageUsers={false}/>);
        openMenu();

        expect(screen.getByText('Admin')).toBeInTheDocument();
        expect(screen.queryByText('Nutzerverwaltung')).not.toBeInTheDocument();
    });
});
