// Add shared views/response helpers here
// Example: a utility to send standardized API responses

export const sendResponse = (res, statusCode, success, data = null, message = null, meta = null) => {
  const response = { success };
  if (data) response.data = data;
  if (message) response.message = message;
  if (meta) response.meta = meta;
  res.status(statusCode).json(response);
};
