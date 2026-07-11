import { Session } from "../models/index.js";

export const sessionRepository = {
  async endAllForUser(user_id, { transaction } = {}) {
    return Session.update(
      { session_status: "N" },
      { where: { user_id, session_status: "Y" }, transaction }
    );
  },
};
