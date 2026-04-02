const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

// @route   GET /api/users/me/courses
// @desc    Get user's enrolled courses and their progress
router.get('/me/courses', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Get enrolled courses
        const enrolled = await db.query(`
            SELECT c.*, e.enrolled_at 
            FROM courses c 
            JOIN enrollments e ON c.id = e.course_id 
            WHERE e.user_id = $1
            ORDER BY e.enrolled_at DESC
        `, [userId]);

        res.json(enrolled.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   GET /api/users/me/progress
// @desc    Get completed lessons
router.get('/me/progress', authMiddleware, async (req, res) => {
     try {
         const progress = await db.query('SELECT lesson_id FROM lesson_progress WHERE user_id = $1', [req.user.id]);
         const completedLessonIds = progress.rows.map(r => r.lesson_id);
         res.json({ completedLessons: completedLessonIds });
     } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
     }
});

// @route   POST /api/users/me/progress/:lessonId
// @desc    Mark lesson as completed
router.post('/me/progress/:lessonId', authMiddleware, async (req, res) => {
    try {
        const { lessonId } = req.params;
        const userId = req.user.id;

        // check if already completed
        const check = await db.query('SELECT * FROM lesson_progress WHERE user_id = $1 AND lesson_id = $2', [userId, lessonId]);
        
        if (check.rows.length === 0) {
            await db.query('INSERT INTO lesson_progress (user_id, lesson_id) VALUES ($1, $2)', [userId, lessonId]);
        }
        res.json({ message: 'Progress recorded' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router;
