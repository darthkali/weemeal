import {describe, expect, it, vi} from 'vitest';
import {render, screen} from '@testing-library/react';

vi.mock('next-auth/react', () => ({signOut: vi.fn()}));
vi.mock('next/navigation', () => ({usePathname: () => '/share/abc'}));

const {default: Navbar} = await import('@/components/navbar/Navbar');

describe('Navbar on the share page', () => {
    it('shows the logo without linking into the app', () => {
        render(<Navbar/>);

        expect(screen.getByAltText('WeeMeal Logo')).toBeInTheDocument();
        expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });

    it('shows no user menu, even for a signed-in visitor', () => {
        render(<Navbar username="Kim" isAdmin canManageUsers canChangePassword/>);

        expect(screen.queryByLabelText('Benutzermenü')).not.toBeInTheDocument();
    });
});
