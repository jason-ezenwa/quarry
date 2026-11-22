import type { UserDocument } from './user.schema';
import type { UserResponse } from './user.types';

export function toUserResponse(user: UserDocument): UserResponse {
  return {
    id: user._id.toHexString(),
    name: user.name,
    email: user.email,
    emailVerified: user.emailVerified,
    ...(user.image && { image: user.image }),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
