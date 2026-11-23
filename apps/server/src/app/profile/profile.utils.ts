import type { ProfileResponse } from '@quarry/contracts';
import type { ProfileDocument } from './profile.schema';

export function toProfileResponse(profile: ProfileDocument): ProfileResponse {
  return {
    id: profile._id.toHexString(),
    targetRoles: profile.targetRoles,
    yearsOfExperience: profile.yearsOfExperience,
    countryCode: profile.countryCode,
    workSetups: profile.workSetups,
    salaryFloor: {
      amount: profile.salaryFloor.amount,
      currency: profile.salaryFloor.currency,
    },
    createdAt: profile.createdAt.toISOString(),
  };
}
