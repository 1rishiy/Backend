const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// @route   GET /api/courses
// @desc    Get all courses
router.get('/', async (req, res) => {
    try {
        const courses = await db.query(`
            SELECT c.*, u.name as instructor_name 
            FROM courses c
            LEFT JOIN users u ON c.instructor_id = u.id
            ORDER BY c.created_at DESC
        `);
        res.json(courses.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   GET /api/courses/:id
// @desc    Get course details with lessons
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const course = await db.query(`
            SELECT c.*, u.name as instructor_name 
            FROM courses c
            LEFT JOIN users u ON c.instructor_id = u.id
            WHERE c.id = $1
        `, [id]);

        if (course.rows.length === 0) {
            return res.status(404).json({ message: 'Course not found' });
        }

        const lessons = await db.query('SELECT * FROM lessons WHERE course_id = $1 ORDER BY order_num ASC', [id]);
        
        res.json({
            ...course.rows[0],
            lessons: lessons.rows
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   POST /api/courses/:id/enroll
// @desc    Enroll in a course
router.post('/:id/enroll', authMiddleware, async (req, res) => {
    try {
        const courseId = req.params.id;
        const userId = req.user.id;
        
        // Check if course exists
        const course = await db.query('SELECT * FROM courses WHERE id = $1', [courseId]);
        if (course.rows.length === 0) {
             return res.status(404).json({ message: 'Course not found' });
        }

        // Check if already enrolled
        const check = await db.query('SELECT * FROM enrollments WHERE user_id = $1 AND course_id = $2', [userId, courseId]);
        if (check.rows.length > 0) {
            return res.status(400).json({ message: 'Already enrolled' });
        }

        await db.query('INSERT INTO enrollments (user_id, course_id) VALUES ($1, $2)', [userId, courseId]);
        res.json({ message: 'Successfully enrolled' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Admin routes for creating/updating courses can be added here
// @route   POST /api/courses (admin only)
router.post('/', [authMiddleware, adminMiddleware], async (req, res) => {
    try {
        const { title, description, price, category, level, image_url } = req.body;
        const newCourse = await db.query(
            'INSERT INTO courses (title, description, price, category, level, image_url, instructor_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [title, description, price, category, level, image_url, req.user.id] // req.user.id is the admin/instructor
        );
        res.json(newCourse.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router;
