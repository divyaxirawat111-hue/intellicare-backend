// Role-Based Access Control middleware.
// Usage: requireRole('clinician', 'admin')
// Call this AFTER authenticateToken so req.user is already populated.
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. This action requires one of the following roles: ${allowedRoles.join(', ')}.`,
      });
    }

    next();
  };
};

module.exports = { requireRole };
