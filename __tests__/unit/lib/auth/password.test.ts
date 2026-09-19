import {describe, expect, it} from 'vitest';
import {
    PASSWORD_POLICY_MESSAGE,
    validatePasswordPolicy,
} from '@/lib/auth/passwordPolicy';

describe('validatePasswordPolicy', () => {
    it('accepts a password meeting all rules', () => {
        expect(validatePasswordPolicy('Str0ng!Passw0rd').valid).toBe(true);
    });

    it('rejects a password shorter than 12 characters', () => {
        const result = validatePasswordPolicy('Sh0rt!Aa');
        expect(result.valid).toBe(false);
        expect(result.message).toBe(PASSWORD_POLICY_MESSAGE);
    });

    it('rejects a password without an uppercase letter', () => {
        expect(validatePasswordPolicy('str0ng!passw0rd').valid).toBe(false);
    });

    it('rejects a password without a lowercase letter', () => {
        expect(validatePasswordPolicy('STR0NG!PASSW0RD').valid).toBe(false);
    });

    it('rejects a password without a digit', () => {
        expect(validatePasswordPolicy('Strong!Password').valid).toBe(false);
    });

    it('rejects a password without a special character', () => {
        expect(validatePasswordPolicy('Str0ngPassw0rd1').valid).toBe(false);
    });

    it('rejects a password longer than 72 characters (bcrypt truncation limit)', () => {
        const tooLong = 'A1a!' + 'x'.repeat(69); // 73 chars, otherwise valid
        expect(tooLong.length).toBe(73);
        expect(validatePasswordPolicy(tooLong).valid).toBe(false);
    });
});
