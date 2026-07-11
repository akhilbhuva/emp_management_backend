// Add your custom middleware here
// Example: a simple request logger

export const logger = (req, res, next) => {
  console.log(`${req.method} ${req.url} — ${new Date().toISOString()}`);
  next();
};
