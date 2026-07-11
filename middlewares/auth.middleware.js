import { verifyAccessToken } from "../utils/jwt.util.js";
import { sendResponse } from "../views/responseHelper.js";

export const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return sendResponse(res, 401, false, null, "No token provided");
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = verifyAccessToken(token);
    req.user = decoded; // { user_id, role_id, user_type }
    next();
  } catch (error) {
    return sendResponse(res, 401, false, null, "Invalid or expired token");
  }
};

// Usage: authorize(ROLE_IDS.DELIVERY_MANAGER, ROLE_IDS.TEAM_LEAD)
export const authorize = (...allowedRoleIds) => (req, res, next) => {
  if (!req.user || !allowedRoleIds.includes(req.user.role_id)) {
    return sendResponse(res, 403, false, null, "You do not have permission to perform this action");
  }
  next();
};
