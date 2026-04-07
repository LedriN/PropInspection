const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User').model;
const { getUserDatabase } = require('../middleware/databaseRouter');
const router = express.Router();

// GET /api/stats/user - Get user statistics
router.get('/user', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user's database
    const userDatabase = await getUserDatabase(user.databaseName);
    
    // Get models for user's database
    const Property = userDatabase.model('Property', require('../models/Property').schema);
    const Inspection = userDatabase.model('Inspection', require('../models/Inspection').schema);
    const Report = userDatabase.model('Report', require('../models/Report').schema);

    // Count documents in parallel
    const [propertiesCount, inspectionsCount, reportsCount] = await Promise.all([
      Property.countDocuments(),
      Inspection.countDocuments({ 
        $or: [
          { inspectorId: user._id },
          { inspector_name: `${user.firstName} ${user.lastName}` },
          { inspector_name: user.email },
          { inspector_name: user.databaseName }
        ],
        $and: [
          { isCompleted: { $ne: true } },
          { status: { $ne: 'completed' } }
        ]
      }),
      Report.countDocuments({
        $or: [
          { 'agent_id._id': user._id },
          { 'agent_id': user._id },
          { 'agent_name': `${user.firstName} ${user.lastName}` },
          { 'agent_name': user.email },
          { 'agent_name': user.databaseName },
          { 'generated_by': user.databaseName },
          { 'generated_by': user.email }
        ]
      })
    ]);

    res.json({
      success: true,
      data: {
        inspections: inspectionsCount,
        properties: propertiesCount,
        reports: reportsCount
      }
    });

  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user statistics',
      error: error.message
    });
  }
});

module.exports = router;
