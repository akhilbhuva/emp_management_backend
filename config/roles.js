export const ROLE_IDS = {
  TEAM_LEAD: 1,
  PROJECT_MANAGER: 2,
  DELIVERY_MANAGER: 3,
  EMPLOYEE: 4,
};

export const USER_TYPES = {
  TEAM_LEAD: "T",
  PROJECT_MANAGER: "P",
  DELIVERY_MANAGER: "D",
  EMPLOYEE: "E",
};

// role_id -> role_name seeded into tbl_role
export const ROLE_SEED = [
  { role_id: ROLE_IDS.TEAM_LEAD, role_name: "Team Lead" },
  { role_id: ROLE_IDS.PROJECT_MANAGER, role_name: "Project Manager" },
  { role_id: ROLE_IDS.DELIVERY_MANAGER, role_name: "Delivery Manager" },
  { role_id: ROLE_IDS.EMPLOYEE, role_name: "Employee" },
];

// role_id -> user_type, so creating a user only needs role_id
export const ROLE_ID_TO_USER_TYPE = {
  [ROLE_IDS.TEAM_LEAD]: USER_TYPES.TEAM_LEAD,
  [ROLE_IDS.PROJECT_MANAGER]: USER_TYPES.PROJECT_MANAGER,
  [ROLE_IDS.DELIVERY_MANAGER]: USER_TYPES.DELIVERY_MANAGER,
  [ROLE_IDS.EMPLOYEE]: USER_TYPES.EMPLOYEE,
};

// Org hierarchy (top -> bottom): Delivery Manager > (Project Manager, Team
// Lead as peers) > Employee. role_id -> role_ids visible to that role when
// listing users — never peers, never roles above, only strictly below.
export const ROLE_VISIBLE_ROLE_IDS = {
  [ROLE_IDS.DELIVERY_MANAGER]: [ROLE_IDS.PROJECT_MANAGER, ROLE_IDS.TEAM_LEAD, ROLE_IDS.EMPLOYEE],
  [ROLE_IDS.PROJECT_MANAGER]: [ROLE_IDS.TEAM_LEAD, ROLE_IDS.EMPLOYEE],
  [ROLE_IDS.TEAM_LEAD]: [ROLE_IDS.EMPLOYEE],
  [ROLE_IDS.EMPLOYEE]: [],
};
