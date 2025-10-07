// Centralized error handling middleware
export const errorHandler = (err, req, res, next) => {
  console.error('Error occurred:', err);

  // Database errors
  if (err.code === '23505') { // Unique constraint violation
    return res.status(409).json({
      message: 'Resource already exists',
      field: err.detail?.match(/Key \((.*)\)=/)?.[1] || 'unknown'
    });
  }
  
  if (err.code === '23503') { // Foreign key violation
    return res.status(400).json({
      message: 'Invalid reference - related resource not found'
    });
  }
  
  if (err.code === '23502') { // Not null violation
    return res.status(400).json({
      message: 'Required field missing'
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ message: 'Invalid token' });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ message: 'Token expired' });
  }

  // Custom application errors
  if (err.statusCode && err.message) {
    return res.status(err.statusCode).json({
      message: err.message,
      ...(err.details && { details: err.details })
    });
  }

  // Unexpected errors
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message;

  res.status(500).json({ message });
};

// 404 handler for undefined routes
export const notFound = (req, res) => {
  res.status(404).json({
    message: `Route ${req.method} ${req.path} not found`
  });
};

// Async error wrapper (optional but useful)
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};