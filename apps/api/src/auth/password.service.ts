import { Injectable, type OnModuleInit } from '@nestjs/common';
import { hash, type Options, verify } from '@node-rs/argon2';

/**
 * argon2id with the OWASP-recommended baseline
 * (19 MiB memory, 2 iterations, 1 lane). Parameters are encoded in each hash,
 * so they can be raised later without invalidating existing passwords.
 */
const ARGON2_OPTIONS: Options = {
  // Algorithm.Argon2id — the enum is an ambient const enum, which
  // isolatedModules can't inline, so the value is spelled out.
  algorithm: 2,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
};

@Injectable()
export class PasswordService implements OnModuleInit {
  /** Verified against when the email is unknown, to equalize response time. */
  private dummyHash = '';

  async onModuleInit(): Promise<void> {
    this.dummyHash = await hash(
      'nexus-timing-equalizer-not-a-password',
      ARGON2_OPTIONS,
    );
  }

  hash(password: string): Promise<string> {
    return hash(password, ARGON2_OPTIONS);
  }

  /** Constant-time comparison is done inside argon2's verify. */
  async verify(passwordHash: string, password: string): Promise<boolean> {
    try {
      return await verify(passwordHash, password);
    } catch {
      // Malformed hash: treat as a mismatch, never as a server error leak.
      return false;
    }
  }

  /** Burns the same CPU/memory as a real verification. Always false. */
  async verifyDummy(password: string): Promise<false> {
    await this.verify(this.dummyHash, password);
    return false;
  }
}
