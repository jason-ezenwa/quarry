import type { ProfileDocument } from '../../profile/profile.schema';
import type { PrimaryContent } from '../../resume/resume.types';
import { UNREVIEWED_RESUME_NOTE } from './agent.constants';

// The second system message: rebuilt every turn, so a profile edit or a
// review applies on the next turn.
export function profileSystemMessage(
  profile: ProfileDocument,
  { content, reviewed }: PrimaryContent,
): string {
  const about = {
    targetRoles: profile.targetRoles,
    yearsOfExperience: profile.yearsOfExperience,
    countryCode: profile.countryCode,
    workSetups: profile.workSetups,
    salaryFloor: profile.salaryFloor,
  };

  const message = `<profile>\n${JSON.stringify(about)}\n</profile>\n\n<primary-resume>\n${JSON.stringify(content)}\n</primary-resume>`;

  return reviewed ? message : `${message}\n\n${UNREVIEWED_RESUME_NOTE}`;
}
