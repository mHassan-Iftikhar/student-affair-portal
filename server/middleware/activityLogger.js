import ActivityLog from '../models/ActivityLog.js';

export const activityLogger = async (req, res, next) => {
  // Store original methods
  const originalSend = res.send;
  const originalJson = res.json;

  // Override response methods to log successful actions
  res.send = function(body) {
    logActivity(req, res, body);
    return originalSend.call(this, body);
  };

  res.json = function(body) {
    logActivity(req, res, body);
    return originalJson.call(this, body);
  };

  next();
};

const logActivity = async (req, res, responseBody) => {
  try {
    // Only log successful modifications (POST, PUT, DELETE)
    if (!['POST', 'PUT', 'DELETE'].includes(req.method)) return;
    
    // Skip logging routes
    if (req.path.startsWith('/api/logs')) return;
    
    // Only log successful responses (2xx)
    if (res.statusCode < 200 || res.statusCode >= 300) return;

    const user = req.user;
    if (!user) return;

    const action = getActionFromRequest(req);
    const resource = getResourceFromPath(req.path);
    
    if (!action || !resource) return;

    const activityLog = new ActivityLog({
      adminId: user._id,
      adminEmail: user.email,
      action,
      resource,
      resourceId: extractResourceId(req, responseBody),
      details: extractDetails(req, responseBody),
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent')
    });

    await activityLog.save();
  } catch (error) {
    console.error('Activity logging error:', error);
  }
};

const getActionFromRequest = (req) => {
  const method = req.method;
  switch (method) {
    case 'POST': return 'CREATE';
    case 'PUT': return 'UPDATE';
    case 'DELETE': return 'DELETE';
    default: return null;
  }
};

const getResourceFromPath = (path) => {
  const segments = path.split('/').filter(Boolean);
  if (segments.length >= 2) {
    return segments[1].toUpperCase(); // e.g., /api/items -> ITEMS
  }
  return null;
};

const extractResourceId = (req, responseBody) => {
  // Try to get ID from URL params
  if (req.params && req.params.id) {
    return req.params.id;
  }
  
  // Try to get ID from response body
  if (typeof responseBody === 'string') {
    try {
      const parsed = JSON.parse(responseBody);
      if (parsed._id) return parsed._id;
    } catch (e) {
      // Ignore parsing errors
    }
  } else if (responseBody && responseBody._id) {
    return responseBody._id;
  }
  
  return null;
};

const extractDetails = (req, responseBody) => {
  const details = {};
  
  // Add request body details (sanitized)
  if (req.body) {
    const sanitizedBody = { ...req.body };
    delete sanitizedBody.password;
    delete sanitizedBody.token;
    details.requestData = sanitizedBody;
  }
  
  // Add query parameters
  if (Object.keys(req.query).length > 0) {
    details.queryParams = req.query;
  }
  
  return details;
};