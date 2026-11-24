import type { Resume } from '@quarry/contracts';
import type { ProfileDocument } from '../../profile/profile.schema';

// The second system message: rebuilt every turn, so a profile edit applies
// on the next turn.
export function profileSystemMessage(
  profile: ProfileDocument,
  resume: Resume,
): string {
  const about = {
    targetRoles: profile.targetRoles,
    yearsOfExperience: profile.yearsOfExperience,
    countryCode: profile.countryCode,
    workSetups: profile.workSetups,
    salaryFloor: profile.salaryFloor,
  };

  return `<profile>\n${JSON.stringify(about)}\n</profile>\n\n<primary-resume>\n${JSON.stringify(resume)}\n</primary-resume>`;
}
