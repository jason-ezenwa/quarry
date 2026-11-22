import { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';
import { mockOfType } from '../../test-utils/mock-of-type';
import type { UserDocument } from './user.schema';
import { toUserResponse } from './user.utils';

describe('toUserResponse', () => {
  const _id = new Types.ObjectId();
  const createdAt = new Date('2026-01-01T00:00:00.000Z');
  const user = mockOfType<UserDocument>({
    _id,
    name: 'Ada Obi',
    email: 'ada@example.com',
    emailVerified: false,
    createdAt,
    updatedAt: createdAt,
  });

  it('returns the id as a hex string alongside the profile fields', () => {
    expect(toUserResponse(user)).toEqual({
      id: _id.toHexString(),
      name: 'Ada Obi',
      email: 'ada@example.com',
      emailVerified: false,
      createdAt,
      updatedAt: createdAt,
    });
  });

  it('includes the image only when the user has one', () => {
    const withImage = mockOfType<UserDocument>({
      ...user,
      image: 'https://example.com/ada.png',
    });

    expect(toUserResponse(withImage).image).toBe('https://example.com/ada.png');
    expect(toUserResponse(user)).not.toHaveProperty('image');
  });
});
