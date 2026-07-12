import jwt from "jsonwebtoken";
import { User, Session } from "../models/index.js";
import { sendResponse } from "../views/responseHelper.js";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt.util.js";

const issueTokens = async (user, req) => {
  const payload = {
    user_id: user.user_id,
    role_id: user.role_id,
    user_type: user.user_type,
  };

  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  const { exp } = jwt.decode(refreshToken);
  await Session.create({
    user_id: user.user_id,
    session_token: refreshToken,
    session_ip_address: req.ip,
    session_user_agent: req.headers["user-agent"],
    session_expires_at: new Date(exp * 1000),
  });

  return { accessToken, refreshToken };
};

export const login = async (req, res) => {
  const { user_email, user_password } = req.body;
  if (!user_email || !user_password) {
    return sendResponse(res, 400, false, null, "Email and password are required");
  }

  const user = await User.findOne({ where: { user_email } });
  if (!user || user.user_status !== "Y") {
    return sendResponse(res, 401, false, null, "Invalid credentials");
  }

  const isMatch = await user.comparePassword(user_password);
  if (!isMatch) {
    return sendResponse(res, 401, false, null, "Invalid credentials");
  }

  const { accessToken, refreshToken } = await issueTokens(user, req);

  return sendResponse(res, 200, true, {
    accessToken,
    refreshToken,
    user: {
      user_id: user.user_id,
      user_name: user.user_name,
      user_email: user.user_email,
      user_type: user.user_type,
      role_id: user.role_id,
    },
  });
};

export const refresh = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return sendResponse(res, 400, false, null, "Refresh token is required");
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch (error) {
    return sendResponse(res, 401, false, null, "Invalid or expired refresh token");
  }

  const storedSession = await Session.findOne({
    where: { session_token: refreshToken, user_id: decoded.user_id, session_status: "Y" },
  });
  if (!storedSession || storedSession.session_expires_at < new Date()) {
    return sendResponse(res, 401, false, null, "Refresh token not recognized");
  }

  const user = await User.findByPk(decoded.user_id);
  if (!user || user.user_status !== "Y") {
    return sendResponse(res, 401, false, null, "User no longer active");
  }

  // End this session and start a new one (refresh token rotation)
  await storedSession.update({ session_status: "N" });
  const { accessToken, refreshToken: newRefreshToken } = await issueTokens(user, req);

  return sendResponse(res, 200, true, { accessToken, refreshToken: newRefreshToken });
};

export const logout = async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    await Session.update(
      { session_status: "N" },
      { where: { session_token: refreshToken } }
    );
  }
  return sendResponse(res, 200, true, null, "Logged out");
};
