// Text constants for consistent labeling across the app
export const TEXT_CONSTANTS = {
  // Team/Organization labels
  TEAM: {
    SINGULAR: 'Team',
    PLURAL: 'Teams',
    CREATE: 'Create Team',
    EDIT: 'Edit Team',
    SETTINGS: 'Team Settings',
    MEMBERS: 'Team Members',
    INVITE: 'Invite to Team',
    LEAVE: 'Leave Team',
    DELETE: 'Delete Team',
    NEW: 'New Team',
    YOUR: 'Your Teams',
    NO_TEAMS: 'No Teams Yet',
    FIRST_TEAM: 'Create Your First Team',
    DESCRIPTION: 'Team Description',
    NAME: 'Team Name',
    LOGO: 'Team Logo',
  },
  
  // Member roles
  ROLES: {
    OWNER: 'Owner',
    ADMIN: 'Admin', 
    MEMBER: 'Member',
    GUEST: 'Guest',
  },
  
  // Invitations
  INVITATION: {
    SINGULAR: 'Invitation',
    PLURAL: 'Invitations',
    SENT: 'Invitation Sent',
    ACCEPTED: 'Invitation Accepted',
    DECLINED: 'Invitation Declined',
    EXPIRED: 'Invitation Expired',
  }
};

// Helper function to get team-related text
export const getTeamText = (key: keyof typeof TEXT_CONSTANTS['TEAM']) => {
  return TEXT_CONSTANTS.TEAM[key];
};