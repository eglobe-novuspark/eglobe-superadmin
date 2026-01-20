// const bcrypt = require('bcryptjs');
// const jwt = require('jsonwebtoken');
// const SuperUser = require('../../models/superuser');  // Your SuperUser model

// const superadminLogin = async (req, res) => {
//   const { username, email, password } = req.body;

//   try {
//     if ((!username && !email) || !password) {
//       return res.status(400).json({ message: 'Username/Email and password are required' });
//     }

//     const query = {
//       $or: [
//         { username: username || '' },
//         { email: email || '' }
//       ]
//     };
//     const superUser = await SuperUser.findOne(query);
//     if (!superUser) {
//       return res.status(401).json({ message: 'Invalid username/email or password' });
//     }

//     // Bcrypt only for superadmin
//     const isPasswordValid = await superUser.comparePassword(password);
//     if (!isPasswordValid) {
//       return res.status(401).json({ message: 'Invalid username/email or password' });
//     }

//     // No school/teacher/student logic—just basics
//     const token = jwt.sign(
//       { 
//         userId: superUser._id, 
//         role: superUser.role,  // 'superadmin'
//         schoolId: null,
//         isSuperAdmin: true  // Flag for guards
//       },
//       process.env.JWT_SECRET_SUPER,  // Separate secret
//       { expiresIn: '1h' }
//     );

//     res.json({
//       token,
//       role: superUser.role,
//       userId: superUser._id.toString(),
//       schoolId: null,
//       email: superUser.email
//       // No academicYear, teacherId, etc.
//     });
//   } catch (err) {
//     console.error('Superadmin login error:', err.stack);
//     res.status(500).json({ message: 'Error logging in', error: err.message });
//   }
// };

// module.exports = superadminLogin;



// const bcrypt = require('bcryptjs');
// const jwt = require('jsonwebtoken');
// const { PrismaClient } = require('@prisma/client');

// // Create a single Prisma instance (best practice — reuse it)
// const prisma = new PrismaClient();

// // Super Admin Login Controller
// const superadminLogin = async (req, res) => {
//   const { username, email, password } = req.body;

//   try {
//     // Validation: Make sure at least one identifier (username or email) and password are provided
//     if ((!username && !email) || !password) {
//       return res.status(400).json({ 
//         message: 'Username or email and password are required' 
//       });
//     }

//     // Find superadmin by username OR email
//     // Prisma uses findFirst because we have multiple conditions in OR
//     const superUser = await prisma.superUser.findFirst({
//       where: {
//         OR: [
//           username ? { username } : null,  // If username provided, search by it
//           email ? { email } : null         // If email provided, search by it
//         ].filter(Boolean) // Remove null entries from array
//       }
//     });

//     // If no superadmin found → invalid credentials
//     if (!superUser) {
//       return res.status(401).json({ 
//         message: 'Invalid username/email or password' 
//       });
//     }

//     // Compare provided password with stored hashed password
//     const isPasswordValid = await bcrypt.compare(password, superUser.password);

//     // If password doesn't match → invalid
//     if (!isPasswordValid) {
//       return res.status(401).json({ 
//         message: 'Invalid username/email or password' 
//       });
//     }

//     // Generate JWT token for authenticated superadmin
//     const token = jwt.sign(
//       { 
//         userId: superUser.id,           // Prisma uses string UUID as id
//         role: superUser.role,           // 'superadmin'
//         isSuperAdmin: true              // Custom flag for middleware guards
//       },
//       process.env.JWT_SECRET_SUPER,     // Use separate secret for superadmin
//       { expiresIn: '7d' }               // Longer session (you can change to '1h')
//     );

//     // Send success response with token and basic user info
//     res.json({
//       message: 'Super Admin login successful',
//       token,
//       role: superUser.role,
//       userId: superUser.id,
//       name: superUser.name,
//       email: superUser.email
//     });

//   } catch (err) {
//     // Log error for debugging
//     console.error('Superadmin login error:', err);
    
//     // Send generic error to client (don't expose details)
//     res.status(500).json({ 
//       message: 'Server error during login' 
//     });
//   }
// };

// module.exports = superadminLogin;