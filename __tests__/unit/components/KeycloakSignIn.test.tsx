import {describe, expect, it, vi} from 'vitest';
import {fireEvent, render, screen} from '@testing-library/react';

const {signInMock} = vi.hoisted(() => ({signInMock: vi.fn()}));

vi.mock('next-auth/react', () => ({signIn: signInMock}));

const {default: KeycloakSignIn} = await import('@/components/auth/KeycloakSignIn');

describe('KeycloakSignIn', () => {
    it('starts the OIDC flow against the keycloak provider', () => {
        render(<KeycloakSignIn callbackUrl="/recipe/42"/>);

        fireEvent.click(screen.getByRole('button', {name: 'Mit Keycloak anmelden'}));

        expect(signInMock).toHaveBeenCalledWith('keycloak', {callbackUrl: '/recipe/42'});
    });

    it('defaults to the start page', () => {
        render(<KeycloakSignIn/>);

        fireEvent.click(screen.getByRole('button', {name: 'Mit Keycloak anmelden'}));

        expect(signInMock).toHaveBeenCalledWith('keycloak', {callbackUrl: '/'});
    });
});
