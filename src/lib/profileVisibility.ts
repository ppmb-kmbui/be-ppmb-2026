export const VISIBLE_PROFILE_WHERE = {
  isProfileHidden: false,
} as const;

export type ProfileVisibilityRecord = {
  isProfileHidden: boolean;
};

export function isProfileVisible(profile: ProfileVisibilityRecord) {
  return !profile.isProfileHidden;
}
