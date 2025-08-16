// middleware/desktopOnly.js
module.exports = function desktopOnly(req, res, next) {
  const userAgent = req.headers['user-agent'] || '';

  // Basic check for mobile devices (Android, iPhone, iPad, iPod)
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);

  if (isMobile) {
    return res.status(403).json({
      success: false,
      message: "Access denied: Desktop-only access allowed."
    });
  }

  // If not mobile, continue request
  next();
};
