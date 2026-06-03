import { Injectable } from '@nestjs/common';

import type { PasswordHasherPort } from '../../domain/ports/password-hasher.port';

type BcryptLike = {
  hash(
    value: string,
    rounds: number,
    callback: (error: Error | null, hash: string) => void,
  ): void;
  compare(
    value: string,
    hashedValue: string,
    callback: (error: Error | null, same: boolean) => void,
  ): void;
};

let bcryptLib: BcryptLike;
try {
  // prefer native bcrypt when available
  bcryptLib = require('bcrypt') as BcryptLike;
} catch {
  // fall back to bcryptjs (pure JS) when native binding missing
  bcryptLib = require('bcryptjs') as BcryptLike;
}

@Injectable()
export class BcryptPasswordHasherAdapter implements PasswordHasherPort {
  hash(value: string): Promise<string> {
    return new Promise((resolve, reject) => {
      bcryptLib.hash(value, 10, (err: Error | null, hash: string) => {
        if (err) return reject(err);
        resolve(hash);
      });
    });
  }

  compare(value: string, hashedValue: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      bcryptLib.compare(value, hashedValue, (err: Error | null, same: boolean) => {
        if (err) return reject(err);
        resolve(same);
      });
    });
  }
}
