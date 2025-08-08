const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const verifyToken = require('../middleware/verifyToken');

router.get('/read-all-notifications', verifyToken, async (req, res) => {
  try {
    const { role, department, company, module } = req.user; 
    const userId = req.user.userId;

    const notifications = await Notification.find({ recipient: userId })
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({ success: true, data: notifications});
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
  }
});



router.post('/:id/read', verifyToken, async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Error marking notification as read:', err);
    res.status(500).json({ success: false, message: 'Failed to update notification' });
  }
});


router.delete('/delete-notification/:id', verifyToken, async (req, res) => {
  let id = req.params.id
  try {
    await Notification.findByIdAndDelete({_id:id});
    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Error clearing notifications:', err);
    res.status(500).json({ success: false, message: 'Failed to clear notifications' });
  }
});

module.exports = router;
